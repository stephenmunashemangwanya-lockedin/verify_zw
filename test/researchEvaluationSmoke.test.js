"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { profiles, totals, requireSmokeProfile, CHAIN_DEPENDENCY } = require("../scripts/evaluation/config");
const { generateDataset } = require("../scripts/evaluation/generateDataset");
const { createFixture } = require("../scripts/evaluation/lib/evaluatorFixtures");
const { statistics, summarizeResults } = require("../scripts/evaluation/summarizeResults");
const { runSmoke, runBatch, measure, main } = require("../scripts/evaluation/runVerificationSmoke");
const dataset = generateDataset();
let report;
test.before(async () => { report = await runSmoke({ dataset }); });

test("formal configuration is exact and cannot execute", async () => {
  assert.deepEqual(profiles.formal, { modes: ["full", "no-anchor"], concurrency: [1, 5, 10, 20, 50],
    runs: 3, warmupPerModePerConcurrency: 100, measuredPerModePerConcurrency: 1000 });
  assert.deepEqual(totals(profiles.formal), { measured: 30000, warmups: 3000 });
  assert.throws(() => requireSmokeProfile("formal"), /configuration-only/);
  await assert.rejects(runSmoke({ profile: "formal", dataset }), /configuration-only/);
  await assert.rejects(main(["--profile", "formal"]), /disabled/);
  await assert.rejects(main(["--profile", "formal", "--allow-formal"]), /disabled/);
});
test("real signatures and shared non-anchor dependencies; no-anchor retains transaction metadata", async () => {
  const fixture = await createFixture(dataset.credentials[0], dataset.metadata.referenceTime);
  const full = await fixture.evaluators.full.verifyCredentialState(fixture.input);
  assert.equal(full.result, "VERIFIED");
  assert.equal(full.evaluation.mode, "full");
  assert.deepEqual(fixture.calls, { chain: 1, status: 1, accreditation: 1, ipfs: 1 });
  const noAnchor = await fixture.evaluators["no-anchor"].verifyCredentialState(fixture.input);
  assert.equal(noAnchor.result, "VERIFIED");
  assert.equal(noAnchor.evaluation.chainRpcMs, 0);
  assert.deepEqual(fixture.calls, { chain: 1, status: 2, accreditation: 2, ipfs: 2 });
  assert.equal(noAnchor.proof.signatureValid, true);
  assert.equal(noAnchor.proof.commitmentMatchesStored, true);
  assert.deepEqual(noAnchor.lifecycle, full.lifecycle);
  assert.deepEqual(noAnchor.accreditation, full.accreditation);
  assert.deepEqual(noAnchor.ipfs, full.ipfs);
  for (const value of [null, undefined, ""]) {
    const observed = await fixture.evaluators["no-anchor"].verifyCredentialState({
      ...fixture.input, credential: { ...fixture.input.credential, blockchain_tx: value },
    });
    assert.equal(observed.result, "SYSTEM_INCONSISTENCY");
  }
  assert.equal(fixture.calls.chain, 1);
});
test("missing external anchor preserves local evidence and isolates the chain comparison", async () => {
  const scenario = dataset.derivedCases.find(row => row.scenarioType === "missing_anchor");
  const base = dataset.credentials.find(row => row.id === scenario.baseCredentialId);
  const fixture = await createFixture(base, dataset.metadata.referenceTime, scenario.evidence);
  assert.equal(fixture.input.credential.blockchain_tx, base.blockchainTx);
  const full = await fixture.evaluators.full.verifyCredentialState(fixture.input);
  assert.equal(full.result, "ANCHOR_MISMATCH");
  assert.equal(fixture.calls.chain, 1);
  const noAnchor = await fixture.evaluators["no-anchor"].verifyCredentialState(fixture.input);
  assert.equal(noAnchor.result, "VERIFIED");
  assert.equal(noAnchor.evaluation.chainRpcMs, 0);
  assert.equal(fixture.calls.chain, 1);
  assert.equal(full.proof.signatureValid, noAnchor.proof.signatureValid);
  assert.equal(full.proof.commitmentMatchesStored, noAnchor.proof.commitmentMatchesStored);
  assert.deepEqual(full.lifecycle, noAnchor.lifecycle);
  assert.deepEqual(full.accreditation, noAnchor.accreditation);
  assert.deepEqual(full.ipfs, noAnchor.ipfs);
});

test("smoke records 80 measured and 20 warmups, only ordinary valid credentials, with paired identities", () => {
  assert.equal(report.label, "HARNESS_SMOKE");
  assert.equal(report.chainDependency, CHAIN_DEPENDENCY);
  assert.equal(report.summary.measuredCount, 80);
  assert.equal(report.summary.warmupCount, 20);
  assert.equal(report.summary.allRequestsCompleted, true);
  assert.equal(report.summary.allRequestsCorrect, true);
  assert.equal(report.summary.pairedDeltas.length, 40);
  assert.equal(new Set(report.observations.map(row => row.requestId)).size, 100);
  for (const row of report.observations) {
    for (const key of ["experimentId", "requestId", "scenarioId", "baseCredentialId", "mode", "concurrency", "run",
      "sequence", "startedAt", "finishedAt", "totalMs", "chainRpcMs", "result", "expectedResult", "correct", "error"]) {
      assert.ok(Object.hasOwn(row, key), key);
    }
    assert.equal(dataset.credentials.find(base => base.id === row.baseCredentialId).kind, "ordinary");
    assert.ok(Number.isFinite(row.totalMs) && row.totalMs >= 0);
    assert.ok(Number.isFinite(row.chainRpcMs) && row.chainRpcMs >= 0);
    assert.ok(Date.parse(row.finishedAt) >= Date.parse(row.startedAt));
    if (row.mode === "no-anchor") assert.equal(row.chainRpcMs, 0);
    assert.equal(row.result, "VERIFIED");
    assert.equal(row.chainDependency, CHAIN_DEPENDENCY);
  }
  for (const pair of report.summary.pairedDeltas) assert.equal(pair.deltaMs, pair.fullMs - pair.noAnchorMs);
  assert.equal(report.summary.groups.length, 4);
  for (const group of report.summary.groups) {
    assert.equal(group.measuredRequests, 20); assert.equal(group.successCount, 20);
    assert.equal(group.failureCount, 0); assert.equal(group.errorRate, 0);
    assert.ok(group.throughput > 0); assert.ok(group.p95 >= group.p50);
  }
});
test("statistics use median and nearest-rank p95, including negative paired differences", () => {
  assert.deepEqual(statistics([10, 2, 4, 8]), { count: 4, mean: 6, median: 6, p50: 6, p95: 10 });
  assert.equal(statistics([-5, -1, 2]).median, -1);
  assert.equal(statistics([]).p95, null);
  assert.throws(() => statistics([NaN]));
});
test("summary rejects missing and mismatched pairs; failures contribute to error rate", () => {
  const rows = structuredClone(report.observations);
  rows.find(row => !row.warmup).correct = false;
  const summary = summarizeResults(rows, report.batches);
  assert.equal(summary.groups[0].failureCount, 1);
  assert.equal(summary.groups[0].errorRate, 1 / 20);
  rows.find(row => !row.warmup).pairId = "unpaired";
  assert.throws(() => summarizeResults(rows, report.batches), /Unmatched/);
  const mismatch = structuredClone(report.observations);
  mismatch.find(row => !row.warmup).baseCredentialId = "different";
  assert.throws(() => summarizeResults(mismatch, report.batches), /identity mismatch/);
});
test("bounded concurrency runs all requests and preserves sequence", async () => {
  let active = 0, maximum = 0;
  const result = await runBatch(10, 3, async i => {
    active += 1; maximum = Math.max(maximum, active);
    await new Promise(resolve => setImmediate(resolve));
    active -= 1; return i;
  });
  assert.equal(maximum, 3);
  assert.deepEqual(result, Array.from({ length: 10 }, (_, i) => i));
});
test("errors are safe and unknown full-mode chain timing is not fabricated", async () => {
  const row = await measure({ input: {}, evaluators: { full: {
    verifyCredentialState: async () => { throw new Error("SENSITIVE_INTERNAL_VALUE"); },
  } } }, { mode: "full" });
  assert.equal(row.correct, false);
  assert.equal(row.chainRpcMs, null);
  assert.equal(row.error.code, "EVALUATION_ERROR");
  assert.equal(JSON.stringify(row).includes("SENSITIVE_INTERNAL_VALUE"), false);
});
test("correctness smoke reports actual evaluator results and explicitly defers route cases", () => {
  assert.equal(report.correctness.executedCount, 8);
  assert.equal(report.correctness.passedCount, 8);
  assert.equal(report.correctness.failedCount, 0);
  assert.equal(report.correctness.deferredCount, 4);
  for (const row of report.correctness.results) {
    if (row.requiresRouteHarness) { assert.equal(row.executed, false); assert.equal(row.correct, null); }
    else { assert.equal(row.correct, true); assert.equal(row.result, row.expectedResult); }
  }
  assert.equal(report.correctness.results.find(row => row.scenarioType === "stale_status").result, "STATUS_INDETERMINATE");
});
