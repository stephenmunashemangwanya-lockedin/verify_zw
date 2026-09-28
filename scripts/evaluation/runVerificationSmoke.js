"use strict";
const { performance } = require("node:perf_hooks");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { generateDataset, validateDataset } = require("./generateDataset");
const { OUTPUT_DIR, CHAIN_DEPENDENCY, requireSmokeProfile, totals } = require("./config");
const { summarizeResults } = require("./summarizeResults");

async function measure(fixture, identity) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  let result = null;
  let chainRpcMs = identity.mode === "no-anchor" ? 0 : null;
  let error = null;
  try {
    const observed = await fixture.evaluators[identity.mode].verifyCredentialState(fixture.input);
    result = observed.result;
    chainRpcMs = observed.evaluation.chainRpcMs;
  } catch (_error) {
    // Never serialize dependency messages, stacks, credentials or environment.
    error = { code: "EVALUATION_ERROR", message: "Controlled evaluation request failed" };
  }
  const totalMs = performance.now() - start;
  return { ...identity, chainDependency: CHAIN_DEPENDENCY, label: "HARNESS_SMOKE",
    startedAt, finishedAt: new Date().toISOString(), totalMs, chainRpcMs,
    result, expectedResult: "VERIFIED", correct: error === null && result === "VERIFIED", error };
}
async function runBatch(count, concurrency, operation) {
  let next = 0;
  const rows = new Array(count);
  await Promise.all(Array.from({ length: Math.min(concurrency, count) }, async () => {
    while (next < count) {
      const sequence = next++;
      rows[sequence] = await operation(sequence);
    }
  }));
  return rows;
}
async function correctnessSmoke(dataset) {
  const { createFixture } = require("./lib/evaluatorFixtures");
  const base = new Map(dataset.credentials.map(row => [row.id, row]));
  const cases = [
    { scenarioType: "valid_active", expectedOutcome: "VERIFIED", baseCredentialId: dataset.credentials.find(row => row.kind === "ordinary").id },
    { scenarioType: "revoked", expectedOutcome: "REVOKED", baseCredentialId: dataset.credentials.find(row => row.status === "revoked").id },
    { scenarioType: "superseded", expectedOutcome: "SUPERSEDED", baseCredentialId: dataset.credentials.find(row => row.status === "superseded").id },
    ...[...new Set(dataset.derivedCases.map(row => row.scenarioType))].sort().map(type => dataset.derivedCases.find(row => row.scenarioType === type)),
  ];
  const results = [];
  for (const scenario of cases) {
    const row = { scenarioId: scenario.scenarioId || `CONTROL-${scenario.scenarioType}`,
      scenarioType: scenario.scenarioType, baseCredentialId: scenario.baseCredentialId,
      expectedResult: scenario.expectedOutcome, requiresRouteHarness: Boolean(scenario.requiresRouteHarness) };
    if (scenario.requiresRouteHarness) {
      results.push({ ...row, executed: false, result: null, correct: null,
        reason: "Requires later route/database/authorization harness" });
      continue;
    }
    const fixture = await createFixture(base.get(scenario.baseCredentialId), dataset.metadata.referenceTime, scenario.evidence);
    try {
      const observed = await fixture.evaluators.full.verifyCredentialState(fixture.input);
      results.push({ ...row, executed: true, result: observed.result,
        correct: observed.result === scenario.expectedOutcome, error: null });
    } catch (_error) {
      results.push({ ...row, executed: true, result: null, correct: false, error: "EVALUATION_ERROR" });
    }
  }
  return { label: "HARNESS_SMOKE", chainDependency: CHAIN_DEPENDENCY, results,
    executedCount: results.filter(row => row.executed).length,
    deferredCount: results.filter(row => !row.executed).length,
    passedCount: results.filter(row => row.correct === true).length,
    failedCount: results.filter(row => row.correct === false).length };
}
async function runSmoke({ profile = "smoke", dataset = generateDataset() } = {}) {
  const config = requireSmokeProfile(profile); // Guard before loading evaluator/creating fixtures.
  validateDataset(dataset);
  const { createFixture } = require("./lib/evaluatorFixtures");
  const selected = dataset.credentials.filter(row => row.kind === "ordinary" && row.status === "active")
    .slice(0, config.measuredPerModePerConcurrency);
  if (selected.length !== config.measuredPerModePerConcurrency) throw new Error("Insufficient ordinary active credentials");
  // Sign fixtures before timing, then reuse the same object and dependencies in both modes.
  const fixtures = [];
  for (const credential of selected) fixtures.push(await createFixture(credential, dataset.metadata.referenceTime));
  const experimentId = `HARNESS_SMOKE-${randomUUID()}`;
  const observations = [];
  const batches = [];
  for (let run = 1; run <= config.runs; run += 1) {
    for (const concurrency of config.concurrency) {
      // Alternate first mode across concurrency cells to expose/reduce ordering bias.
      const modes = config.concurrency.indexOf(concurrency) % 2 ? [...config.modes].reverse() : config.modes;
      for (const warmup of [true, false]) {
        const count = warmup ? config.warmupPerModePerConcurrency : config.measuredPerModePerConcurrency;
        for (const mode of modes) {
          const batchId = `${experimentId}:${concurrency}:${run}:${warmup ? "warmup" : "measured"}:${mode}`;
          const start = performance.now();
          const rows = await runBatch(count, concurrency, sequence => {
            const fixture = fixtures[sequence % fixtures.length];
            const baseCredentialId = fixture.input.credential.id;
            const pairId = `${experimentId}:${concurrency}:${run}:${warmup ? "warmup" : "measured"}:${sequence}`;
            return measure(fixture, { experimentId, batchId, pairId, requestId: `${pairId}:${mode}`,
              scenarioId: `VALID-${baseCredentialId}`, baseCredentialId, mode, concurrency, run, sequence, warmup });
          });
          batches.push({ batchId, mode, concurrency, run, warmup, count, elapsedMs: performance.now() - start });
          observations.push(...rows);
        }
      }
    }
  }
  const summary = summarizeResults(observations, batches);
  const expected = totals(config);
  if (summary.measuredCount !== expected.measured || summary.warmupCount !== expected.warmups) throw new Error("Smoke count mismatch");
  return { label: "HARNESS_SMOKE", chainDependency: CHAIN_DEPENDENCY, experimentId,
    datasetDigest: dataset.summary.deterministicDigest, config, observations, batches,
    summary, correctness: await correctnessSmoke(dataset) };
}
function writeSmoke(report) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const common = { label: report.label, chainDependency: report.chainDependency,
    experimentId: report.experimentId, datasetDigest: report.datasetDigest };
  const files = {
    "smoke-observations.json": { ...common, config: report.config, observations: report.observations, batches: report.batches },
    "smoke-summary.json": { ...common, ...report.summary },
    "smoke-correctness.json": { ...common, ...report.correctness },
  };
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(OUTPUT_DIR, name), `${JSON.stringify(content, null, 2)}\n`);
  return Object.keys(files);
}
async function main(args) {
  if (!(args.length === 0 || (args.length === 2 && args[0] === "--profile" && args[1] === "smoke"))) {
    throw new Error("Usage: node scripts/evaluation/runVerificationSmoke.js --profile smoke. Formal execution is disabled.");
  }
  const report = await runSmoke();
  const output = writeSmoke(report);
  console.log(JSON.stringify({ label: report.label, chainDependency: report.chainDependency, config: report.config,
    measured: report.summary.measuredCount, warmups: report.summary.warmupCount,
    allRequestsCompleted: report.summary.allRequestsCompleted, allRequestsCorrect: report.summary.allRequestsCorrect,
    pairs: report.summary.pairedDeltas.length, correctness: {
      executed: report.correctness.executedCount, passed: report.correctness.passedCount,
      failed: report.correctness.failedCount, deferred: report.correctness.deferredCount }, output }, null, 2));
  if (!report.summary.allRequestsCorrect || report.correctness.failedCount) process.exitCode = 1;
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
  console.error("Smoke runner failed. Only --profile smoke is supported; formal execution is disabled.");
  process.exitCode = 1;
});
module.exports = { measure, runBatch, runSmoke, correctnessSmoke, writeSmoke, main };
