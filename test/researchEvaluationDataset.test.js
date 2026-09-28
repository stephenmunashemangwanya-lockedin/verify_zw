"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { generateDataset, validateDataset, deterministicDigest } = require("../scripts/evaluation/generateDataset");
const { seededRandom } = require("../scripts/evaluation/lib/seededRandom");
const dataset = generateDataset();

test("research export preserves exact methodology counts and lowercase categories", () => {
  assert.equal(validateDataset(dataset), true);
  const summary = dataset.summary;
  assert.equal(summary.seed, 20260905);
  assert.equal(summary.baseCount, 1000);
  assert.equal(summary.derivedCount, 200);
  assert.equal(summary.finalActiveCount, 850);
  assert.equal(summary.correctionPairCount, 50);
  assert.equal(summary.institutionCount, 5);
  assert.equal(summary.programmeCount, 10);
  assert.deepEqual(summary.baseStatusDistribution, { active: 850, revoked: 100, superseded: 50 });
  assert.equal(dataset.credentials.filter(row => row.kind === "ordinary" && row.status === "active").length, 800);
  assert.equal(dataset.credentials.filter(row => row.kind === "original" && row.status === "superseded").length, 50);
  assert.equal(dataset.credentials.filter(row => row.kind === "replacement" && row.status === "active").length, 50);
  assert.deepEqual(summary.derivedScenarioDistribution, {
    tampered: 40, invalid_signature: 30, non_accredited: 30, temporal_accreditation: 30,
    stale_status: 20, missing_anchor: 20, duplicate: 10, rbac_cross_institution: 10, unknown_identifier: 10,
  });
});
test("digest and seeded order repeat; a different seed changes content", () => {
  assert.deepEqual(generateDataset(), dataset);
  assert.equal(generateDataset(20260905).summary.deterministicDigest, dataset.summary.deterministicDigest);
  assert.notEqual(generateDataset(20260906).summary.deterministicDigest, dataset.summary.deterministicDigest);
  const a = seededRandom(20260905), b = seededRandom(20260905);
  assert.deepEqual(Array.from({ length: 10 }, a), Array.from({ length: 10 }, b));
});
test("digest canonicalizes object keys and excludes timestamps, but captures evidence changes", () => {
  const copy = structuredClone(dataset);
  copy.metadata = Object.fromEntries(Object.entries(copy.metadata).reverse());
  copy.metadata.referenceTime = "2099-01-01T00:00:00.000Z";
  copy.credentials[0].statusIssuedAt = "2099-01-01T00:00:00.000Z";
  assert.equal(deterministicDigest(copy), dataset.summary.deterministicDigest);
  copy.credentials[0].certificateHash = "ab".repeat(32);
  assert.notEqual(deterministicDigest(copy), dataset.summary.deterministicDigest);
});
test("all entity IDs are unique; correction links and derived references are valid", () => {
  for (const [rows, key] of [[dataset.credentials, "id"], [dataset.students, "id"],
    [dataset.institutions, "id"], [dataset.programmes, "code"], [dataset.derivedCases, "scenarioId"]]) {
    assert.equal(new Set(rows.map(row => row[key])).size, rows.length);
  }
  const base = new Map(dataset.credentials.map(row => [row.id, row]));
  for (const pair of dataset.correctionPairs) {
    const original = base.get(pair.originalCredentialId), replacement = base.get(pair.replacementCredentialId);
    assert.notEqual(original.id, replacement.id);
    assert.equal(original.supersededBy, replacement.id);
    assert.equal(replacement.supersedes, original.id);
    for (const key of ["studentId", "institutionId", "programmeCode"]) assert.equal(original[key], replacement[key]);
  }
  for (const row of dataset.derivedCases) {
    assert.ok(Object.hasOwn(row, "expectedOutcome"));
    assert.ok(row.description);
    assert.equal(row.seed, 20260905);
    if (row.scenarioType === "unknown_identifier") {
      assert.equal(row.baseCredentialId, null);
      assert.equal(base.has(row.targetCredentialId), false);
    } else assert.equal(base.has(row.baseCredentialId), true);
  }
  assert.ok(dataset.students.every(row => row.synthetic && row.email.endsWith("@evaluation.example.test") && row.name.startsWith("SYNTHETIC-")));
});
test("research export validation rejects bad counts, references and digest", () => {
  for (const mutate of [d => d.credentials.pop(), d => { d.derivedCases[0].baseCredentialId = "absent"; },
    d => { d.summary.deterministicDigest = "incorrect"; }]) {
    const copy = structuredClone(dataset); mutate(copy);
    assert.throws(() => validateDataset(copy));
  }
});
