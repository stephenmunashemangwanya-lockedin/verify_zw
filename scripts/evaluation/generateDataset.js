"use strict";
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const legacy = require("./generateResearchDataset");
const { seededRandom } = require("./lib/seededRandom");
const { OUTPUT_DIR } = require("./config");

// Preserve the existing smoke export name unknown_identifier while the dataset API uses unknown_id.
const SCENARIOS = Object.freeze({
  tampered: ["tampered", "TAMPERED", "Altered document hash presented against a known credential", true],
  invalid_signature: ["invalid_signature", "SIGNATURE_INVALID", "Malformed issuer signature", false],
  non_accredited: ["non_accredited", "ACCREDITATION_INVALID", "No effective accreditation", false],
  temporal_accreditation: ["temporal_accreditation", "ACCREDITATION_INVALID", "Accreditation excludes award date", false],
  stale_status: ["stale_status", "STATUS_INDETERMINATE", "Signed status older than 24 hours", false],
  missing_anchor: ["missing_anchor", "ANCHOR_MISMATCH", "Absent external anchor; source blockchain transaction metadata retained", false],
  duplicate: ["duplicate", null, "Repeated evidence submission; later database/route harness must determine outcome", true],
  rbac_cross_institution: ["rbac_cross_institution", null, "Issuer from another institution; requires authorization-denial harness", true],
  unknown_id: ["unknown_identifier", "UNKNOWN", "Identifier absent from base dataset; requires public lookup harness", true],
});
const timestampKeys = new Set(["referenceTime", "statusIssuedAt", "statusValidUntil", "generatedAt", "startedAt", "finishedAt"]);
function canonical(value, omitTimes = false) {
  if (Array.isArray(value)) return value.map(item => canonical(item, omitTimes));
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort()
    .filter(key => !omitTimes || !timestampKeys.has(key)).map(key => [key, canonical(value[key], omitTimes)]));
  return value;
}
function deterministicDigest(dataset) {
  const { summary: _summary, fingerprint: _fingerprint, ...content } = dataset;
  return createHash("sha256").update(JSON.stringify(canonical(content, true))).digest("hex");
}
function summarizeDataset(dataset) {
  const base = legacy.summarizeResearchDataset(dataset);
  return { seed: base.seed, baseCount: base.baseCredentialCount, derivedCount: base.derivedCaseCount,
    finalActiveCount: base.statusDistribution.active, correctionPairCount: base.correctionPairCount,
    baseStatusDistribution: base.statusDistribution, derivedScenarioDistribution: base.derivedDistribution,
    institutionCount: base.institutionCount, programmeCount: base.programmeCount,
    deterministicDigest: deterministicDigest(dataset) };
}
function generateDataset(seed = 20260905) {
  const dataset = legacy.generateResearchDataset(seed);
  delete dataset.fingerprint; // This export retains its separate timestamp-free digest.
  dataset.metadata.schemaVersion = "2.0.0";
  dataset.metadata.scenarioNaming = "Step 8B lowercase names (explicit migration from Step 8B.2)";
  dataset.derivedCases = dataset.derivedCases.map(row => {
    const [scenarioType, expectedOutcome, description, requiresRouteHarness] = SCENARIOS[row.scenarioType];
    return { ...row, scenarioType, baseCredentialId: row.sourceCredentialId,
      expectedOutcome, description, requiresRouteHarness };
  });
  const random = seededRandom(seed);
  for (let i = dataset.derivedCases.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [dataset.derivedCases[i], dataset.derivedCases[j]] = [dataset.derivedCases[j], dataset.derivedCases[i]];
  }
  dataset.summary = summarizeDataset(dataset);
  validateDataset(dataset);
  return dataset;
}
function validateDataset(dataset) {
  const copy = structuredClone(dataset);
  const reverse = Object.fromEntries(Object.entries(SCENARIOS).map(([old, spec]) => [spec[0], old]));
  for (const row of copy.derivedCases) {
    const old = reverse[row.scenarioType];
    if (!old) throw new Error("Unknown scenario type");
    const [, expected, description, route] = SCENARIOS[old];
    if (row.baseCredentialId !== row.sourceCredentialId || row.expectedOutcome !== expected ||
        row.description !== description || row.requiresRouteHarness !== route) throw new Error("Invalid scenario metadata");
    row.scenarioType = old;
  }
  copy.summary = legacy.summarizeResearchDataset(copy);
  copy.fingerprint = legacy.fingerprintResearchDataset(copy);
  legacy.validateResearchDataset(copy);
  if (JSON.stringify(canonical(dataset.summary)) !== JSON.stringify(canonical(summarizeDataset(dataset)))) throw new Error("Dataset summary/digest mismatch");
  return true;
}
function writeDataset(dataset = generateDataset()) {
  validateDataset(dataset);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const [name, value] of [["dataset.json", dataset], ["dataset-summary.json", dataset.summary]]) {
    fs.writeFileSync(path.join(OUTPUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
  }
  return dataset.summary;
}
if (require.main === module) console.log(JSON.stringify(writeDataset(), null, 2));
module.exports = { generateDataset, validateDataset, summarizeDataset, deterministicDigest, writeDataset };
