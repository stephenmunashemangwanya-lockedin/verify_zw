import json
import hashlib
import csv
import sys
from pathlib import Path

import numpy as np
from scipy.stats import wilcoxon

ROOT = Path.cwd()
RESULTS = ROOT / "test-results" / "research"

OBS_FILE = RESULTS / "formal-observations.json"
PAIR_FILE = RESULTS / "formal-paired-deltas.json"
OUT_DIR = RESULTS / "statistical-revalidation"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SEED = 20260905
N_BOOT = 10000
CONCURRENCIES = [1, 5, 10, 20, 50]
RUNS = [1, 2, 3]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_list_with_fields(obj, required):
    candidates = []

    def walk(x):
        if isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            if x and all(isinstance(i, dict) for i in x):
                if all(field in x[0] for field in required):
                    candidates.append(x)
            for v in x:
                walk(v)

    walk(obj)
    if not candidates:
        raise RuntimeError(f"Could not find list containing fields: {required}")

    return max(candidates, key=len)


def nearest_rank_p95(values):
    x = np.sort(np.asarray(values, dtype=float))
    idx = int(np.ceil(0.95 * len(x))) - 1
    return float(x[idx])


def bootstrap_median_ci(values, seed, n_resamples=10000):
    x = np.asarray(values, dtype=float)
    rng = np.random.default_rng(seed)

    medians = np.empty(n_resamples, dtype=float)

    # Chunked so memory use stays reasonable.
    chunk = 250
    written = 0

    while written < n_resamples:
        n = min(chunk, n_resamples - written)
        idx = rng.integers(0, len(x), size=(n, len(x)))
        medians[written:written+n] = np.median(x[idx], axis=1)
        written += n

    lo, hi = np.percentile(medians, [2.5, 97.5])
    return float(lo), float(hi)


def holm_adjust(pvalues):
    pvalues = np.asarray(pvalues, dtype=float)
    m = len(pvalues)
    order = np.argsort(pvalues)
    adjusted = np.empty(m, dtype=float)

    previous = 0.0
    for rank, idx in enumerate(order):
        candidate = (m - rank) * pvalues[idx]
        candidate = max(candidate, previous)
        candidate = min(candidate, 1.0)
        adjusted[idx] = candidate
        previous = candidate

    return adjusted


print("=" * 72)
print("VERIFYZW FORMAL PAIRED-STATISTICS REVALIDATION")
print("=" * 72)

if not OBS_FILE.exists():
    raise FileNotFoundError(OBS_FILE)

if not PAIR_FILE.exists():
    raise FileNotFoundError(PAIR_FILE)

obs_doc = load_json(OBS_FILE)
pair_doc = load_json(PAIR_FILE)

observations = find_list_with_fields(
    obs_doc,
    ["pairId", "mode", "concurrency", "run", "totalMs"]
)

measured = [
    r for r in observations
    if r.get("warmup") is False
]

warmups = [
    r for r in observations
    if r.get("warmup") is True
]

print(f"Raw observations found : {len(observations)}")
print(f"Measured observations  : {len(measured)}")
print(f"Warm-up observations   : {len(warmups)}")

assert len(measured) == 30000, (
    f"Expected 30000 measured observations, got {len(measured)}"
)

assert len(warmups) == 3000, (
    f"Expected 3000 warm-ups, got {len(warmups)}"
)

# ------------------------------------------------------------------
# Reconstruct pairs DIRECTLY FROM RAW OBSERVATIONS
# ------------------------------------------------------------------

pair_map = {}

for row in measured:
    mode = row["mode"]
    if mode not in ("full", "no-anchor"):
        raise AssertionError(f"Unexpected mode: {mode}")

    pid = row["pairId"]

    pair_map.setdefault(pid, {})

    if mode in pair_map[pid]:
        raise AssertionError(f"Duplicate mode in pair {pid}: {mode}")

    pair_map[pid][mode] = row

assert len(pair_map) == 15000, (
    f"Expected 15000 raw pairs, got {len(pair_map)}"
)

identity_fields = [
    "experimentId",
    "scenarioId",
    "baseCredentialId",
    "concurrency",
    "run",
    "sequence",
]

reconstructed = []

for pid, pair in pair_map.items():
    if "full" not in pair or "no-anchor" not in pair:
        raise AssertionError(f"Incomplete pair: {pid}")

    full = pair["full"]
    no_anchor = pair["no-anchor"]

    for field in identity_fields:
        if full.get(field) != no_anchor.get(field):
            raise AssertionError(
                f"Pair identity mismatch {pid}, field={field}: "
                f"{full.get(field)} != {no_anchor.get(field)}"
            )

    delta = float(full["totalMs"]) - float(no_anchor["totalMs"])

    reconstructed.append({
        "pairId": pid,
        "concurrency": int(full["concurrency"]),
        "run": int(full["run"]),
        "sequence": int(full["sequence"]),
        "scenarioId": full.get("scenarioId"),
        "baseCredentialId": full.get("baseCredentialId"),
        "fullMs": float(full["totalMs"]),
        "noAnchorMs": float(no_anchor["totalMs"]),
        "deltaMs": delta,
        "bothCorrect": (
            full.get("correct") is True
            and no_anchor.get("correct") is True
            and full.get("error") is None
            and no_anchor.get("error") is None
        ),
    })

assert len(reconstructed) == 15000
assert all(r["bothCorrect"] for r in reconstructed)

print(f"Reconstructed pairs     : {len(reconstructed)}")
print("All reconstructed pairs : CORRECT")

# ------------------------------------------------------------------
# COMPARE AGAINST formal-paired-deltas.json
# ------------------------------------------------------------------

saved_pairs = find_list_with_fields(
    pair_doc,
    ["pairId", "concurrency", "run", "deltaMs"]
)

assert len(saved_pairs) == 15000, (
    f"Expected 15000 saved paired deltas, got {len(saved_pairs)}"
)

raw_by_id = {r["pairId"]: r for r in reconstructed}
saved_by_id = {r["pairId"]: r for r in saved_pairs}

if set(raw_by_id) != set(saved_by_id):
    raise AssertionError("Pair IDs differ between raw observations and paired-delta file")

max_delta_error = 0.0

for pid in raw_by_id:
    a = raw_by_id[pid]
    b = saved_by_id[pid]

    err = abs(float(a["deltaMs"]) - float(b["deltaMs"]))
    max_delta_error = max(max_delta_error, err)

assert max_delta_error < 1e-9, (
    f"Paired delta mismatch detected. Maximum error = {max_delta_error}"
)

print(f"Paired-delta validation : PASS")
print(f"Maximum delta mismatch  : {max_delta_error:.12g} ms")

# ------------------------------------------------------------------
# CHECK DESIGN COUNTS
# ------------------------------------------------------------------

for c in CONCURRENCIES:
    for run in RUNS:
        rows = [
            r for r in reconstructed
            if r["concurrency"] == c and r["run"] == run
        ]

        assert len(rows) == 1000, (
            f"Concurrency {c}, run {run}: expected 1000 pairs, got {len(rows)}"
        )

print("Design count validation : PASS")
print("5 concurrency levels x 3 runs x 1000 pairs = 15000 pairs")

# ------------------------------------------------------------------
# STATISTICS
# ------------------------------------------------------------------

results = []
raw_pvalues = []

for c in CONCURRENCIES:
    rows = [r for r in reconstructed if r["concurrency"] == c]
    deltas = np.asarray([r["deltaMs"] for r in rows], dtype=float)

    assert len(deltas) == 3000

    run_medians = {}

    for run in RUNS:
        rd = np.asarray(
            [
                r["deltaMs"]
                for r in rows
                if r["run"] == run
            ],
            dtype=float,
        )

        assert len(rd) == 1000
        run_medians[run] = float(np.median(rd))

    run_values = list(run_medians.values())
    run_range = max(run_values) - min(run_values)

    pooled_mean = float(np.mean(deltas))
    pooled_median = float(np.median(deltas))
    pooled_p95 = nearest_rank_p95(deltas)

    # 95% percentile bootstrap CI for pooled median.
    # Exploratory only because request-level observations are clustered.
    ci_low, ci_high = bootstrap_median_ci(
        deltas,
        seed=SEED + c,
        n_resamples=N_BOOT,
    )

    # Observation-level Wilcoxon diagnostic.
    w = wilcoxon(
        deltas,
        zero_method="wilcox",
        correction=False,
        alternative="two-sided",
        method="approx",
    )

    p_raw = float(w.pvalue)
    raw_pvalues.append(p_raw)

    results.append({
        "concurrency": c,
        "pairs": len(deltas),
        "run1_median": run_medians[1],
        "run2_median": run_medians[2],
        "run3_median": run_medians[3],
        "run_range": run_range,
        "pooled_mean": pooled_mean,
        "pooled_median": pooled_median,
        "pooled_p95": pooled_p95,
        "bootstrap_ci_low": ci_low,
        "bootstrap_ci_high": ci_high,
        "wilcoxon_statistic": float(w.statistic),
        "wilcoxon_p_raw": p_raw,
    })

adjusted = holm_adjust(raw_pvalues)

for row, p_adj in zip(results, adjusted):
    row["wilcoxon_p_holm"] = float(p_adj)

# ------------------------------------------------------------------
# OVERALL 15000-PAIR DESCRIPTIVE SUMMARY
# ------------------------------------------------------------------

all_deltas = np.asarray(
    [r["deltaMs"] for r in reconstructed],
    dtype=float,
)

overall = {
    "pairs": len(all_deltas),
    "mean": float(np.mean(all_deltas)),
    "median": float(np.median(all_deltas)),
    "p95": nearest_rank_p95(all_deltas),
}

# ------------------------------------------------------------------
# WRITE REVALIDATION EVIDENCE
# ------------------------------------------------------------------

csv_file = OUT_DIR / "paired-statistics-revalidated.csv"

with open(csv_file, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(results[0].keys()))
    writer.writeheader()
    writer.writerows(results)

manifest_file = OUT_DIR / "revalidation-manifest.txt"

with open(manifest_file, "w", encoding="utf-8") as f:
    f.write("VERIFYZW STATISTICAL REVALIDATION\n")
    f.write("=" * 60 + "\n")
    f.write(f"formal-observations SHA256: {sha256_file(OBS_FILE)}\n")
    f.write(f"formal-paired-deltas SHA256: {sha256_file(PAIR_FILE)}\n")
    f.write(f"Measured observations: {len(measured)}\n")
    f.write(f"Warmups excluded: {len(warmups)}\n")
    f.write(f"Matched pairs: {len(reconstructed)}\n")
    f.write(f"Maximum raw-vs-saved delta error: {max_delta_error}\n")
    f.write(f"Bootstrap resamples: {N_BOOT}\n")
    f.write(f"Bootstrap base seed: {SEED}\n")
    f.write("Wilcoxon: two-sided, zero_method=wilcox, method=approx\n")
    f.write("Multiple-test correction: Holm, family size=5\n\n")

    f.write("OVERALL DESCRIPTIVE PAIRED DIFFERENCE\n")
    f.write(json.dumps(overall, indent=2))
    f.write("\n\nPER-CONCURRENCY RESULTS\n")
    f.write(json.dumps(results, indent=2))

print()
print("=" * 110)
print("REVALIDATED RESULTS")
print("=" * 110)

header = (
    f"{'C':>3} {'R1 med':>10} {'R2 med':>10} {'R3 med':>10} "
    f"{'Range':>10} {'Mean':>10} {'Median':>10} {'p95':>10} "
    f"{'95% CI':>24} {'p raw':>14} {'p Holm':>14}"
)
print(header)
print("-" * len(header))

for r in results:
    ci = f"[{r['bootstrap_ci_low']:.3f}, {r['bootstrap_ci_high']:.3f}]"
    print(
        f"{r['concurrency']:>3} "
        f"{r['run1_median']:>10.3f} "
        f"{r['run2_median']:>10.3f} "
        f"{r['run3_median']:>10.3f} "
        f"{r['run_range']:>10.3f} "
        f"{r['pooled_mean']:>10.3f} "
        f"{r['pooled_median']:>10.3f} "
        f"{r['pooled_p95']:>10.3f} "
        f"{ci:>24} "
        f"{r['wilcoxon_p_raw']:>14.6g} "
        f"{r['wilcoxon_p_holm']:>14.6g}"
    )

print()
print("OVERALL 15,000-PAIR SUMMARY")
print(f"Mean   : {overall['mean']:.3f} ms")
print(f"Median : {overall['median']:.3f} ms")
print(f"p95    : {overall['p95']:.3f} ms")

print()
print("SOURCE FILE HASHES")
print(f"formal-observations.json    {sha256_file(OBS_FILE)}")
print(f"formal-paired-deltas.json   {sha256_file(PAIR_FILE)}")

print()
print("OUTPUT FILES")
print(csv_file)
print(manifest_file)

print()
print("REVALIDATION COMPLETE")
