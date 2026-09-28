"use strict";

const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const { randomUUID, createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const {
  OUTPUT_DIR,
  CHAIN_DEPENDENCY,
  profiles,
  totals,
} = require("./config");

const {
  validateDataset,
} = require("./generateDataset");

const {
  createFixture,
} = require("./lib/evaluatorFixtures");

const {
  statistics,
  summarizeResults,
} = require("./summarizeResults");

const LABEL = "HARNESS_FORMAL";

const DATASET_FILE = path.join(
  OUTPUT_DIR,
  "dataset.json"
);

const INTERPRETATION =
  "Controlled in-process formal evaluation. Full versus No-Anchor differences " +
  "measure the verification pipeline under the deterministic evaluation stub; " +
  "they do not estimate public-chain, Sepolia, Internet, or production RPC latency.";

const sha256 = (value) =>
  createHash("sha256")
    .update(value)
    .digest("hex");

async function runBatch(
  count,
  concurrency,
  operation
) {
  let next = 0;

  const rows =
    new Array(count);

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          concurrency,
          count
        ),
      },
      async () => {
        while (next < count) {
          const sequence =
            next++;

          rows[sequence] =
            await operation(
              sequence
            );
        }
      }
    )
  );

  return rows;
}

function readFrozenDataset() {
  if (
    !fs.existsSync(
      DATASET_FILE
    )
  ) {
    throw new Error(
      "Frozen dataset.json is missing. Run: node scripts/evaluation/generateDataset.js"
    );
  }

  const raw =
    fs.readFileSync(
      DATASET_FILE,
      "utf8"
    );

  const dataset =
    JSON.parse(raw);

  validateDataset(
    dataset
  );

  assert.equal(
    dataset.metadata.seed,
    20260905,
    "Unexpected methodology seed"
  );

  assert.equal(
    dataset.summary.baseCount,
    1000,
    "Expected 1,000 base credentials"
  );

  assert.equal(
    dataset.summary.derivedCount,
    200,
    "Expected 200 derived cases"
  );

  assert.equal(
    dataset.summary
      .correctionPairCount,
    50,
    "Expected 50 correction pairs"
  );

  return {
    dataset,

    datasetFileSha256:
      sha256(raw),
  };
}

function snapshotCalls(
  fixtures
) {
  return fixtures.reduce(
    (
      output,
      fixture
    ) => {
      output.chain +=
        fixture.calls.chain;

      output.status +=
        fixture.calls.status;

      output.accreditation +=
        fixture.calls
          .accreditation;

      output.ipfs +=
        fixture.calls.ipfs;

      return output;
    },

    {
      chain: 0,
      status: 0,
      accreditation: 0,
      ipfs: 0,
    }
  );
}

function subtractCalls(
  after,
  before
) {
  return {
    chain:
      after.chain -
      before.chain,

    status:
      after.status -
      before.status,

    accreditation:
      after.accreditation -
      before.accreditation,

    ipfs:
      after.ipfs -
      before.ipfs,
  };
}

async function measureFormal(
  fixture,
  identity
) {
  const startedAt =
    new Date()
      .toISOString();

  const started =
    performance.now();

  let result = null;

  let chainRpcMs =
    identity.mode ===
    "no-anchor"
      ? 0
      : null;

  let error = null;

  try {
    const observed =
      await fixture
        .evaluators[
          identity.mode
        ]
        .verifyCredentialState(
          fixture.input
        );

    result =
      observed.result;

    chainRpcMs =
      observed.evaluation
        .chainRpcMs;
  } catch (_error) {
    error = {
      code:
        "EVALUATION_ERROR",

      message:
        "Controlled formal evaluation request failed",
    };
  }

  return {
    ...identity,

    label:
      LABEL,

    chainDependency:
      CHAIN_DEPENDENCY,

    startedAt,

    finishedAt:
      new Date()
        .toISOString(),

    totalMs:
      performance.now() -
      started,

    chainRpcMs,

    result,

    expectedResult:
      "VERIFIED",

    correct:
      error === null &&
      result ===
        "VERIFIED",

    error,
  };
}

function aggregateGroups(
  observations,
  batches,
  profile
) {
  const measured =
    observations.filter(
      (row) =>
        !row.warmup
    );

  const result = [];

  for (
    const mode
    of profile.modes
  ) {
    for (
      const concurrency
      of profile.concurrency
    ) {
      const sample =
        measured.filter(
          (row) =>
            row.mode ===
              mode &&
            row.concurrency ===
              concurrency
        );

      const groupBatches =
        batches.filter(
          (batch) =>
            !batch.warmup &&
            batch.mode ===
              mode &&
            batch.concurrency ===
              concurrency
        );

      const expected =
        profile.runs *
        profile
          .measuredPerModePerConcurrency;

      assert.equal(
        sample.length,
        expected,
        `Aggregate count mismatch for ${mode}/${concurrency}`
      );

      const successCount =
        sample.filter(
          (row) =>
            row.correct &&
            !row.error
        ).length;

      const elapsedMs =
        groupBatches.reduce(
          (
            sum,
            batch
          ) =>
            sum +
            batch.elapsedMs,

          0
        );

      const chainTimes =
        sample
          .map(
            (row) =>
              row.chainRpcMs
          )
          .filter(
            Number.isFinite
          );

      result.push({
        mode,

        concurrency,

        measuredRequests:
          sample.length,

        successCount,

        failureCount:
          sample.length -
          successCount,

        errorRate:
          (
            sample.length -
            successCount
          ) /
          sample.length,

        ...statistics(
          sample.map(
            (row) =>
              row.totalMs
          )
        ),

        elapsedMs,

        throughput:
          sample.length /
          (
            elapsedMs /
            1000
          ),

        meanChainRpcMs:
          statistics(
            chainTimes
          ).mean,

        chainTimingCount:
          chainTimes.length,
      });
    }
  }

  return result;
}

function aggregatePairedDeltas(
  pairedDeltas,
  profile
) {
  return profile
    .concurrency
    .map(
      (concurrency) => {
        const sample =
          pairedDeltas.filter(
            (row) =>
              row.concurrency ===
              concurrency
          );

        const expected =
          profile.runs *
          profile
            .measuredPerModePerConcurrency;

        assert.equal(
          sample.length,
          expected,
          `Paired count mismatch for concurrency ${concurrency}`
        );

        return {
          concurrency,

          pairCount:
            sample.length,

          bothCorrectCount:
            sample.filter(
              (row) =>
                row.bothCorrect
            ).length,

          ...statistics(
            sample.map(
              (row) =>
                row.deltaMs
            )
          ),
        };
      }
    );
}

function dependencyTotals(
  batches,
  profile
) {
  const result = {};

  for (
    const mode
    of profile.modes
  ) {
    result[mode] =
      batches
        .filter(
          (batch) =>
            batch.mode ===
            mode
        )
        .reduce(
          (
            output,
            batch
          ) => {
            output.chain +=
              batch
                .dependencyCalls
                .chain;

            output.status +=
              batch
                .dependencyCalls
                .status;

            output.accreditation +=
              batch
                .dependencyCalls
                .accreditation;

            output.ipfs +=
              batch
                .dependencyCalls
                .ipfs;

            return output;
          },

          {
            chain: 0,
            status: 0,
            accreditation: 0,
            ipfs: 0,
          }
        );
  }

  return result;
}

function validateFormalReport(
  report
) {
  const expected =
    totals(
      report.config
    );

  assert.deepEqual(
    expected,
    {
      measured: 30000,
      warmups: 3000,
    }
  );

  assert.equal(
    report.summary
      .measuredCount,
    30000
  );

  assert.equal(
    report.summary
      .warmupCount,
    3000
  );

  assert.equal(
    report.observations
      .length,
    33000
  );

  assert.equal(
    report.summary
      .pairedDeltas
      .length,
    15000
  );

  assert.equal(
    report.summary
      .allRequestsCompleted,
    true
  );

  assert.equal(
    report.summary
      .allRequestsCorrect,
    true
  );

  assert.equal(
    report.summary
      .groups.length,
    30
  );

  assert.equal(
    report.aggregateGroups
      .length,
    10
  );

  assert.equal(
    report
      .aggregatePairedDeltas
      .length,
    5
  );

  for (
    const group
    of report.summary.groups
  ) {
    assert.equal(
      group.measuredRequests,
      1000
    );

    assert.equal(
      group.successCount,
      1000
    );

    assert.equal(
      group.failureCount,
      0
    );

    assert.equal(
      group.errorRate,
      0
    );
  }

  for (
    const group
    of report.aggregateGroups
  ) {
    assert.equal(
      group.measuredRequests,
      3000
    );

    assert.equal(
      group.successCount,
      3000
    );

    assert.equal(
      group.failureCount,
      0
    );

    assert.equal(
      group.errorRate,
      0
    );
  }

  for (
    const group
    of report
      .aggregatePairedDeltas
  ) {
    assert.equal(
      group.pairCount,
      3000
    );

    assert.equal(
      group.bothCorrectCount,
      3000
    );
  }

  const noAnchorMeasured =
    report.observations
      .filter(
        (row) =>
          !row.warmup &&
          row.mode ===
            "no-anchor"
      );

  for (
    const row
    of noAnchorMeasured
  ) {
    assert.equal(
      row.chainRpcMs,
      0
    );
  }

  const requestsPerMode =
    report.config
      .concurrency.length *
    report.config.runs *
    (
      report.config
        .warmupPerModePerConcurrency +
      report.config
        .measuredPerModePerConcurrency
    );

  assert.equal(
    requestsPerMode,
    16500
  );

  assert.equal(
    report
      .dependencyTotals
      .full
      .chain,
    requestsPerMode
  );

  assert.equal(
    report
      .dependencyTotals[
        "no-anchor"
      ]
      .chain,
    0
  );

  for (
    const mode
    of report.config.modes
  ) {
    assert.equal(
      report
        .dependencyTotals[
          mode
        ]
        .status,
      requestsPerMode
    );

    assert.equal(
      report
        .dependencyTotals[
          mode
        ]
        .accreditation,
      requestsPerMode
    );

    assert.equal(
      report
        .dependencyTotals[
          mode
        ]
        .ipfs,
      requestsPerMode
    );
  }

  return true;
}

async function buildFixtures(
  dataset,
  profile
) {
  const ordinaryActive =
    dataset.credentials.filter(
      (row) =>
        row.kind ===
          "ordinary" &&
        row.status ===
          "active"
    );

  assert.equal(
    ordinaryActive.length,
    800,
    "Expected exactly 800 ordinary active credentials"
  );

  const fixtures = [];

  for (
    let i = 0;
    i <
    profile
      .measuredPerModePerConcurrency;
    i += 1
  ) {
    fixtures.push(
      await createFixture(
        ordinaryActive[
          i %
          ordinaryActive.length
        ],

        dataset.metadata
          .referenceTime
      )
    );
  }

  return fixtures;
}

async function runFormal(
  dataset
) {
  validateDataset(
    dataset
  );

  const profile =
    profiles.formal;

  assert.deepEqual(
    totals(profile),
    {
      measured: 30000,
      warmups: 3000,
    }
  );

  const fixtures =
    await buildFixtures(
      dataset,
      profile
    );

  const experimentId =
    `HARNESS_FORMAL-${randomUUID()}`;

  const observations = [];

  const batches = [];

  for (
    let run = 1;
    run <=
    profile.runs;
    run += 1
  ) {
    for (
      let cellIndex = 0;
      cellIndex <
      profile
        .concurrency.length;
      cellIndex += 1
    ) {
      const concurrency =
        profile.concurrency[
          cellIndex
        ];

      const modes =
        (
          run +
          cellIndex
        ) %
          2 ===
        0
          ? [
              ...profile.modes,
            ]
          : [
              ...profile.modes,
            ].reverse();

      for (
        const warmup
        of [
          true,
          false,
        ]
      ) {
        const count =
          warmup
            ? profile
                .warmupPerModePerConcurrency
            : profile
                .measuredPerModePerConcurrency;

        for (
          const mode
          of modes
        ) {
          const phase =
            warmup
              ? "warmup"
              : "measured";

          const batchId =
            `${experimentId}:${concurrency}:${run}:${phase}:${mode}`;

          const before =
            snapshotCalls(
              fixtures
            );

          const batchStarted =
            performance.now();

          const rows =
            await runBatch(
              count,

              concurrency,

              (
                sequence
              ) => {
                const fixture =
                  fixtures[
                    sequence %
                    fixtures.length
                  ];

                const baseCredentialId =
                  fixture.input
                    .credential.id;

                const pairId =
                  `${experimentId}:${concurrency}:${run}:${phase}:${sequence}`;

                return measureFormal(
                  fixture,

                  {
                    experimentId,

                    batchId,

                    pairId,

                    requestId:
                      `${pairId}:${mode}`,

                    scenarioId:
                      `VALID-${baseCredentialId}`,

                    baseCredentialId,

                    mode,

                    concurrency,

                    run,

                    sequence,

                    warmup,
                  }
                );
              }
            );

          const elapsedMs =
            performance.now() -
            batchStarted;

          const after =
            snapshotCalls(
              fixtures
            );

          const calls =
            subtractCalls(
              after,
              before
            );

          if (
            mode ===
            "full"
          ) {
            assert.equal(
              calls.chain,
              count,
              "Full mode must invoke one chain check per request"
            );
          } else {
            assert.equal(
              calls.chain,
              0,
              "No-Anchor mode must not invoke the chain dependency"
            );
          }

          assert.equal(
            calls.status,
            count
          );

          assert.equal(
            calls.accreditation,
            count
          );

          assert.equal(
            calls.ipfs,
            count
          );

          batches.push({
            batchId,

            mode,

            concurrency,

            run,

            warmup,

            count,

            elapsedMs,

            dependencyCalls:
              calls,
          });

          observations.push(
            ...rows
          );

          console.log(
            `[${LABEL}] run=${run}/${profile.runs} concurrency=${concurrency} ` +
            `phase=${phase} mode=${mode} count=${count} ` +
            `elapsedMs=${elapsedMs.toFixed(2)}`
          );
        }
      }
    }
  }

  const smokeStyleSummary =
    summarizeResults(
      observations,
      batches
    );

  const summary = {
    ...smokeStyleSummary,

    label:
      LABEL,

    interpretation:
      INTERPRETATION,
  };

  const report = {
    label:
      LABEL,

    chainDependency:
      CHAIN_DEPENDENCY,

    interpretation:
      INTERPRETATION,

    experimentId,

    datasetDigest:
      dataset.summary
        .deterministicDigest,

    config:
      profile,

    observations,

    batches,

    summary,

    aggregateGroups:
      aggregateGroups(
        observations,
        batches,
        profile
      ),

    aggregatePairedDeltas:
      aggregatePairedDeltas(
        summary.pairedDeltas,
        profile
      ),

    dependencyTotals:
      dependencyTotals(
        batches,
        profile
      ),
  };

  validateFormalReport(
    report
  );

  return report;
}

function environmentMetadata() {
  const cpus =
    os.cpus();

  return {
    nodeVersion:
      process.version,

    platform:
      process.platform,

    architecture:
      process.arch,

    cpuModel:
      cpus[0]
        ?.model ||
      null,

    logicalCpuCount:
      cpus.length,

    totalMemoryBytes:
      os.totalmem(),
  };
}

function atomicJsonWrite(
  filename,
  value
) {
  const target =
    path.join(
      OUTPUT_DIR,
      filename
    );

  const temp =
    `${target}.tmp`;

  fs.writeFileSync(
    temp,

    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,

    "utf8"
  );

  fs.renameSync(
    temp,
    target
  );
}

function writeFormal(
  report,
  datasetFileSha256
) {
  fs.mkdirSync(
    OUTPUT_DIR,
    {
      recursive: true,
    }
  );

  const common = {
    label:
      report.label,

    chainDependency:
      report.chainDependency,

    interpretation:
      report.interpretation,

    experimentId:
      report.experimentId,

    datasetDigest:
      report.datasetDigest,

    datasetFileSha256,
  };

  const {
    pairedDeltas,
    ...summaryWithoutRawPairs
  } = report.summary;

  atomicJsonWrite(
    "formal-metadata.json",

    {
      ...common,

      generatedAt:
        new Date()
          .toISOString(),

      config:
        report.config,

      totals:
        totals(
          report.config
        ),

      environment:
        environmentMetadata(),

      methodology: {
        datasetSeed:
          20260905,

        baseCredentials:
          1000,

        derivedCases:
          200,

        correctionPairs:
          50,

        ordinaryActiveCredentialPool:
          800,

        comparator:
          "internal full versus no-anchor",

        externalNetworkUsed:
          false,

        databaseUsed:
          false,

        dockerUsed:
          false,

        blockchainProviderUsed:
          false,
      },
    }
  );

  atomicJsonWrite(
    "formal-observations.json",

    {
      ...common,

      config:
        report.config,

      observations:
        report.observations,

      batches:
        report.batches,
    }
  );

  atomicJsonWrite(
    "formal-paired-deltas.json",

    {
      ...common,

      pairedDeltas,
    }
  );

  atomicJsonWrite(
    "formal-summary.json",

    {
      ...common,

      config:
        report.config,

      ...summaryWithoutRawPairs,

      aggregateGroups:
        report.aggregateGroups,

      aggregatePairedDeltas:
        report.aggregatePairedDeltas,

      dependencyTotals:
        report.dependencyTotals,
    }
  );

  return [
    "formal-metadata.json",
    "formal-observations.json",
    "formal-paired-deltas.json",
    "formal-summary.json",
  ];
}

function preflight() {
  const {
    dataset,
    datasetFileSha256,
  } =
    readFrozenDataset();

  const ordinaryActiveCredentials =
    dataset.credentials.filter(
      (row) =>
        row.kind ===
          "ordinary" &&
        row.status ===
          "active"
    ).length;

  return {
    label:
      LABEL,

    chainDependency:
      CHAIN_DEPENDENCY,

    interpretation:
      INTERPRETATION,

    datasetFile:
      DATASET_FILE,

    datasetFileSha256,

    datasetDigest:
      dataset.summary
        .deterministicDigest,

    seed:
      dataset.metadata.seed,

    baseCredentials:
      dataset.summary
        .baseCount,

    derivedCases:
      dataset.summary
        .derivedCount,

    correctionPairs:
      dataset.summary
        .correctionPairCount,

    ordinaryActiveCredentials,

    config:
      profiles.formal,

    totals:
      totals(
        profiles.formal
      ),

    safety: {
      database:
        false,

      docker:
        false,

      ipfsProvider:
        false,

      externalBlockchain:
        false,

      http:
        false,

      productionMutation:
        false,
    },
  };
}

async function main(
  args
) {
  if (
    args.length === 1 &&
    args[0] ===
      "--preflight"
  ) {
    console.log(
      JSON.stringify(
        preflight(),
        null,
        2
      )
    );

    return;
  }

  if (
    !(
      args.length ===
        1 &&
      args[0] ===
        "--execute-formal"
    )
  ) {
    throw new Error(
      "Usage: node scripts/evaluation/runVerificationFormal.js --preflight OR --execute-formal"
    );
  }

  const {
    dataset,
    datasetFileSha256,
  } =
    readFrozenDataset();

  console.log(
    JSON.stringify(
      {
        status:
          "FORMAL_EVALUATION_STARTING",

        label:
          LABEL,

        measured:
          totals(
            profiles.formal
          ).measured,

        warmups:
          totals(
            profiles.formal
          ).warmups,

        datasetDigest:
          dataset.summary
            .deterministicDigest,

        interpretation:
          INTERPRETATION,
      },

      null,

      2
    )
  );

  const report =
    await runFormal(
      dataset
    );

  const output =
    writeFormal(
      report,
      datasetFileSha256
    );

  console.log(
    JSON.stringify(
      {
        status:
          "FORMAL_EVALUATION_COMPLETE",

        measured:
          report.summary
            .measuredCount,

        warmups:
          report.summary
            .warmupCount,

        correct:
          report.summary
            .allRequestsCorrect,

        completed:
          report.summary
            .allRequestsCompleted,

        matchedPairs:
          report.summary
            .pairedDeltas
            .length,

        dependencyTotals:
          report
            .dependencyTotals,

        output,
      },

      null,

      2
    )
  );
}

if (
  require.main ===
  module
) {
  main(
    process.argv.slice(2)
  )
    .catch(
      (error) => {
        console.error(
          `Formal evaluation failed: ${error.message}`
        );

        process.exitCode =
          1;
      }
    );
}

module.exports = {
  runBatch,
  readFrozenDataset,
  measureFormal,
  aggregateGroups,
  aggregatePairedDeltas,
  dependencyTotals,
  validateFormalReport,
  runFormal,
  writeFormal,
  preflight,
  main,
};