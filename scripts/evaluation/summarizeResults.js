"use strict";
const { CHAIN_DEPENDENCY } = require("./config");
function statistics(values) {
  if (!values.length) return { count: 0, mean: null, median: null, p50: null, p95: null };
  if (!values.every(Number.isFinite)) throw new Error("Non-finite timing value");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return { count: sorted.length, mean: sorted.reduce((sum, x) => sum + x, 0) / sorted.length,
    median, p50: median, p95: sorted[Math.ceil(sorted.length * 0.95) - 1] };
}
function summarizeResults(rows, batches) {
  const measured = rows.filter(row => !row.warmup);
  const groups = batches.filter(batch => !batch.warmup).map(batch => {
    const sample = measured.filter(row => row.batchId === batch.batchId);
    if (sample.length !== batch.count || !(batch.elapsedMs > 0)) throw new Error("Incomplete or invalid measurement batch");
    const successCount = sample.filter(row => row.correct && !row.error).length;
    const chainTimes = sample.map(row => row.chainRpcMs).filter(Number.isFinite);
    return { mode: batch.mode, concurrency: batch.concurrency, run: batch.run,
      measuredRequests: sample.length, successCount, failureCount: sample.length - successCount,
      errorRate: (sample.length - successCount) / sample.length,
      ...statistics(sample.map(row => row.totalMs)), elapsedMs: batch.elapsedMs,
      throughput: sample.length / (batch.elapsedMs / 1000),
      meanChainRpcMs: statistics(chainTimes).mean, chainTimingCount: chainTimes.length };
  });
  if (groups.reduce((sum, group) => sum + group.measuredRequests, 0) !== measured.length) throw new Error("Unmatched measurement batch");
  const pairs = new Map();
  for (const row of measured) {
    if (!["full", "no-anchor"].includes(row.mode)) throw new Error("Invalid observation mode");
    const pair = pairs.get(row.pairId) || {};
    if (pair[row.mode]) throw new Error("Duplicate paired observation");
    pair[row.mode] = row;
    pairs.set(row.pairId, pair);
  }
  const pairedDeltas = [...pairs].map(([pairId, pair]) => {
    const full = pair.full;
    const noAnchor = pair["no-anchor"];
    if (!full || !noAnchor) throw new Error("Unmatched full/no-anchor observation");
    for (const key of ["experimentId", "scenarioId", "baseCredentialId", "concurrency", "run", "sequence"]) {
      if (full[key] !== noAnchor[key]) throw new Error(`Pair identity mismatch: ${key}`);
    }
    return { pairId, scenarioId: full.scenarioId, baseCredentialId: full.baseCredentialId,
      concurrency: full.concurrency, run: full.run, fullMs: full.totalMs,
      noAnchorMs: noAnchor.totalMs, deltaMs: full.totalMs - noAnchor.totalMs,
      bothCorrect: full.correct && noAnchor.correct && !full.error && !noAnchor.error };
  });
  return { label: "HARNESS_SMOKE", chainDependency: CHAIN_DEPENDENCY,
    interpretation: "In-process harness timings only; paired differences do not estimate external blockchain overhead.",
    measuredCount: measured.length, warmupCount: rows.length - measured.length,
    allRequestsCompleted: rows.every(row => row.error === null),
    allRequestsCorrect: rows.every(row => row.correct), groups, pairedDeltas,
    pairedDeltaStatistics: statistics(pairedDeltas.map(pair => pair.deltaMs)),
    pairedDeltaGroups: [...new Set(pairedDeltas.map(pair => `${pair.concurrency}:${pair.run}`))].map(key => {
      const subset = pairedDeltas.filter(pair => `${pair.concurrency}:${pair.run}` === key);
      return { concurrency: subset[0].concurrency, run: subset[0].run,
        ...statistics(subset.map(pair => pair.deltaMs)) };
    }) };
}
module.exports = { statistics, summarizeResults };
