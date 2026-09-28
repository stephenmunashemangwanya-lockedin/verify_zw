# Chapter 4 research harness

This tooling is separate from `scripts/performance`, the Phase 11 engineering
release harness. It does not load environment secrets, start applications,
connect to databases, upload documents or contact blockchain/IPFS services.

Run from the repository root:

```powershell
node --test --test-concurrency=1 test/structuredCredentialVerification.test.js
node --test --test-concurrency=1 test/researchDatasetGenerator.test.js test/researchEvaluationDataset.test.js test/researchEvaluationSmoke.test.js
node scripts/evaluation/generateDataset.js
node scripts/evaluation/runVerificationSmoke.js --profile smoke
```

## Dataset

Seed 20260905; fixed reference time 2026-09-05T12:00:00.000Z. Reuses the
Step 8B.2 generator and validator without changing its original API/output.
`generateResearchDataset.js` now uses the Step 8B1 lowercase categories including
`unknown_id`, exports all materialisation placeholder fields, correction reasons
and fixed supersession times, and fingerprints canonical JSON including fixed
timestamps (excluding only the fingerprint field itself). Its output is
`research-dataset.json`. Missing-anchor scenarios carry separate full=false and
experimental noAnchor=true validity expectations: the external blockchain-anchor
read is omitted while local blockchain transaction metadata and all non-chain
verification predicates are retained. Each missing-anchor case keeps its source
credential's valid blockchainTx. These are design expectations, not executed results.

`generateDataset.js` retains its earlier schema 2 smoke export and explicitly maps
`unknown_id` to that export's `unknown_identifier`. A seeded Mulberry32 PRNG
orders the scenarios; deterministic SHA-256 creates the synthetic evidence IDs.

There are 1,000 base descriptors: 800 ordinary active, 100 revoked, 50 superseded
originals and 50 active replacements. The 50 correction pairs share student,
institution and programme. There are five institutions and ten programmes.
The 200 scenarios are references, not additional database credentials:
tampered 40, invalid_signature 30, non_accredited 30, temporal_accreditation 30,
stale_status 20, missing_anchor 20, duplicate 10, rbac_cross_institution 10,
unknown_identifier 10. These names are not production switches.

`dataset.json` and `dataset-summary.json` are written under `test-results/research`.
The digest uses recursively sorted object keys and preserves array order. It
excludes the summary and timestamp fields (referenceTime, statusIssuedAt,
statusValidUntil, generatedAt, startedAt, finishedAt). Award/issue/accreditation
dates remain semantic content. Freshness times are checked independently by
validation; the digest alone does not establish freshness correctness.

## Smoke interpretation and isolation

The exported descriptors are not signed proofs. The fixture adapter uses the
production payload builders and EIP-191 signing function to materialize selected
rows with genuine local signatures and freshly computed commitments. Descriptor
commitments are placeholders; the adapter's signed payload determines the actual
evaluator commitment. Signing happens before timing. The synthetic signing material
is publicly reproducible, has no provider, and must never be funded or deployed.

Both modes use the same signed credential object, verification time and injected
dependencies. The real evaluator is loaded with fail-closed default dependency
guards, using the repository test cache-isolation pattern. All cache entries are
restored synchronously. Actual evaluator logic and cryptography are unchanged.
`no-anchor` is an internal experimental comparator, never a production mode.
It retains stored transaction metadata requirements.

Smoke: modes full/no-anchor, concurrency [1,5], one run, five warmups and 20
measured requests per mode/concurrency. Total: 20 warmups and 80 measured rows.
Only ordinary valid active credentials are in latency samples. Both modes use
the same sequence-to-credential mapping; pairId identifies corresponding rows.
First-mode order alternates between concurrency cells. Concurrency means bounded
in-process outstanding promises, not HTTP clients or parallel CPU execution.

Every smoke output is labeled `HARNESS_SMOKE` and
`chainDependency: "in-process deterministic evaluation stub"`. There are no
fabricated sleeps or network timings. `performance.now()` measures actual elapsed
request and batch durations; wall-clock timestamps are descriptive only.
`chainRpcMs` retains the evaluator field name but measures an in-process stub.
These values are not Sepolia, external RPC or production performance evidence.
Paired differences cannot establish causal external blockchain overhead.

Outputs in `test-results/research`:

- `smoke-observations.json`: safe timing rows, pairing IDs and batch durations.
- `smoke-summary.json`: per-mode/concurrency/run counts, failures, error rate,
  median/p50, nearest-rank p95, requests/sec over measured batch elapsed time,
  mean chainRpcMs, paired differences and their mean/median/p95.
- `smoke-correctness.json`: eight representative full-mode evaluator checks.
  Four route/database cases are deferred with requiresRouteHarness=true,
  executed=false and correct=null. No PASS is asserted for deferred work.

Warmups are excluded from statistics. Failures (exceptions or unexpected results)
remain in timing/pair statistics and count toward error rate; paired rows expose
bothCorrect. Exception messages and proofs are never exported. If an exception
prevents the evaluator returning its chain timing, full-mode chainRpcMs is null.

## Formal configuration only

`config.js` defines full/no-anchor, concurrency [1,5,10,20,50], three runs,
100 warmups and 1,000 measured requests per mode/concurrency/run: exactly 3,000
warmups and 30,000 measured observations. Calculated totals are asserted.
There is no formal executor in this stage. Any formal CLI request, including
`--allow-formal`, is refused. A later reviewed executor and explicit approval
after research freeze are required before conducting formal evaluation.
No availability/reliability experiments or recovery actions run here.
