"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  generateResearchDataset, validateResearchDataset, summarizeResearchDataset, fingerprintResearchDataset,
} = require("../scripts/evaluation/generateResearchDataset");

const dataset = generateResearchDataset();
const byId = new Map(dataset.credentials.map(row => [row.id, row]));
const distribution = {
  tampered: 40, invalid_signature: 30, non_accredited: 30,
  temporal_accreditation: 30, stale_status: 20, missing_anchor: 20,
  duplicate: 10, rbac_cross_institution: 10, unknown_id: 10,
};
const count = (rows, key) => rows.reduce((out, row) => {
  out[row[key]] = (out[row[key]] || 0) + 1;
  return out;
}, {});

test("same methodology seed produces structurally identical output including timestamps", () => {
  assert.equal(dataset.metadata.seed, 20260905);
  assert.equal(dataset.metadata.referenceTime, "2026-09-05T12:00:00.000Z");
  assert.deepEqual(generateResearchDataset(20260905), dataset);
  assert.notEqual(generateResearchDataset(20260906).credentials[0].certificateHash, dataset.credentials[0].certificateHash);
});

test("fingerprint repeats, canonicalizes key order and covers immutable research content", () => {
  assert.match(dataset.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(generateResearchDataset(20260905).fingerprint, dataset.fingerprint);
  assert.notEqual(generateResearchDataset(20260906).fingerprint, dataset.fingerprint);
  const copy = structuredClone(dataset);
  copy.metadata = Object.fromEntries(Object.entries(copy.metadata).reverse());
  assert.equal(fingerprintResearchDataset(copy), dataset.fingerprint);
  copy.credentials[0].statusIssuedAt = "2026-09-05T09:00:00.000Z";
  assert.notEqual(fingerprintResearchDataset(copy), dataset.fingerprint);
  assert.throws(() => validateResearchDataset(copy), /fingerprint mismatch/);
});

test("materialisation fields have stable valid shapes and no secret fields are emitted", () => {
  const fields = ["id", "studentId", "studentNumber", "institutionId", "programme", "qualification",
    "issueDate", "awardDate", "status", "statusListIndex", "certificateHash", "credentialCommitment",
    "ipfsCid", "blockchainTx", "issuerWallet", "publicToken", "proofVersion"];
  for (const row of dataset.credentials) {
    for (const field of fields) assert.ok(Object.hasOwn(row, field), field);
    assert.equal(row.studentNumber, row.studentId);
    assert.equal(row.programme, row.programmeCode);
    assert.ok(Number.isSafeInteger(row.statusListIndex) && row.statusListIndex >= 0);
    assert.match(row.ipfsCid, /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/);
    assert.match(row.issuerWallet, /^0x[a-f0-9]{40}$/);
    assert.match(row.publicToken, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/);
  }
  const inspect = value => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key, /private.?key|password|secret|mnemonic|access.?token|refresh.?token|api.?key/i);
      inspect(child);
    }
  };
  inspect(dataset);
});

test("correction metadata preserves original immutable evidence and distinct replacement identities", () => {
  const { createHash } = require("node:crypto");
  const sha = value => createHash("sha256").update(value).digest("hex");
  assert.equal(new Set(dataset.correctionPairs.map(pair => pair.replacementCredentialId)).size, 50);
  for (const pair of dataset.correctionPairs) {
    const original = byId.get(pair.originalCredentialId);
    assert.equal(pair.reason, original.supersessionReason);
    assert.match(pair.reason, /^SYNTHETIC correction /);
    assert.equal(original.supersededAt, "2026-08-03T12:00:00.000Z");
    assert.equal(original.certificateHash, sha(`20260905:synthetic-document:${original.id}`));
    assert.equal(original.credentialCommitment, sha(`20260905:synthetic-commitment:${original.id}`));
  }
});

test("missing anchor records separate full and experimental no-anchor expectations", () => {
  const rows = dataset.derivedCases.filter(row => row.scenarioType === "missing_anchor");
  assert.equal(rows.length, 20);
  for (const row of rows) {
    assert.deepEqual(row.expectedValidity, { full: false, noAnchor: true });
    assert.match(row.expectationBasis, /Not an observed evaluator result/);
    assert.equal(row.evidence.anchorExists, false);
    assert.match(row.evidence.blockchainTx, /^0x[a-f0-9]{64}$/);
    assert.equal(row.evidence.blockchainTx, byId.get(row.sourceCredentialId).blockchainTx);
    assert.ok(byId.get(row.sourceCredentialId).blockchainTx);
  }
});

test("base counts and ordinary/original/replacement composition are exact", () => {
  assert.equal(dataset.institutions.length, 5);
  assert.equal(dataset.programmes.length, 10);
  assert.equal(dataset.credentials.length, 1000);
  assert.equal(dataset.students.length, 950);
  assert.deepEqual(count(dataset.credentials, "status"), { active: 850, revoked: 100, superseded: 50 });
  assert.deepEqual(count(dataset.credentials, "kind"), { ordinary: 800, revoked: 100, original: 50, replacement: 50 });
  assert.equal(new Set(dataset.credentials.map(row => row.institutionId)).size, 5);
  assert.equal(new Set(dataset.credentials.map(row => row.programmeCode)).size, 10);
});

test("50 correction pairs preserve student, institution, programme and bidirectional links", () => {
  assert.equal(dataset.correctionPairs.length, 50);
  const originals = new Set();
  const replacements = new Set();
  for (const pair of dataset.correctionPairs) {
    const original = byId.get(pair.originalCredentialId);
    const replacement = byId.get(pair.replacementCredentialId);
    originals.add(original.id);
    replacements.add(replacement.id);
    assert.notEqual(original.id, replacement.id);
    assert.notEqual(original.certificateHash, replacement.certificateHash);
    assert.notEqual(original.credentialCommitment, replacement.credentialCommitment);
    for (const key of ["studentId", "institutionId", "programmeCode"]) {
      assert.equal(original[key], replacement[key]);
      assert.equal(pair[key], original[key]);
    }
    assert.equal(original.status, "superseded");
    assert.equal(replacement.status, "active");
    assert.equal(original.supersededBy, replacement.id);
    assert.equal(replacement.supersedes, original.id);
  }
  assert.equal(originals.size, 50);
  assert.equal(replacements.size, 50);
});

test("identifiers and base SHA-256 evidence are unique and synthetic", () => {
  for (const [rows, key] of [
    [dataset.institutions, "id"], [dataset.programmes, "code"], [dataset.students, "id"],
    [dataset.credentials, "id"], [dataset.credentials, "certificateHash"],
    [dataset.credentials, "credentialCommitment"], [dataset.derivedCases, "scenarioId"],
  ]) assert.equal(new Set(rows.map(row => row[key])).size, rows.length);
  for (const row of dataset.students) {
    assert.equal(row.synthetic, true);
    assert.match(row.id, /^EVAL-STU-\d{6}$/);
    assert.match(row.name, /^SYNTHETIC-STUDENT-\d{6}$/);
    assert.match(row.email, /^eval-stu-\d{6}@evaluation\.example\.test$/);
  }
  for (const row of dataset.credentials) {
    assert.equal(row.synthetic, true);
    assert.match(row.certificateHash, /^[a-f0-9]{64}$/);
    assert.match(row.credentialCommitment, /^[a-f0-9]{64}$/);
    assert.match(row.issuerIdentity, /^RESEARCH-ISSUER-\d{2}$/);
    assert.equal(row.proofMaterial, "synthetic-descriptor-only");
  }
});

test("200 derived scenarios have exact distribution and controlled references", () => {
  assert.equal(dataset.derivedCases.length, 200);
  assert.deepEqual(count(dataset.derivedCases, "scenarioType"), distribution);
  for (const row of dataset.derivedCases) {
    assert.equal(row.synthetic, true);
    assert.equal(row.seed, 20260905);
    if (row.scenarioType === "unknown_id") {
      assert.equal(row.sourceCredentialId, null);
      assert.equal(byId.has(row.targetCredentialId), false);
    } else {
      assert.equal(byId.get(row.sourceCredentialId).status, "active");
      assert.equal(row.targetCredentialId, row.sourceCredentialId);
    }
  }
});

test("base accreditation covers awards and status is fresh; negative evidence is explicit", () => {
  const now = Date.parse(dataset.metadata.referenceTime);
  for (const row of dataset.credentials) {
    assert.ok(Date.parse(row.accreditation.validFrom) <= Date.parse(row.awardDate));
    assert.ok(Date.parse(row.accreditation.validUntil) >= Date.parse(row.awardDate));
    assert.equal(row.accreditation.synthetic, true);
    assert.ok(now - Date.parse(row.statusIssuedAt) >= 0);
    assert.ok(now - Date.parse(row.statusIssuedAt) <= 86400000);
    assert.ok(Date.parse(row.statusValidUntil) >= now);
  }
  for (const row of dataset.derivedCases) {
    const source = byId.get(row.sourceCredentialId);
    const evidence = row.evidence;
    switch (row.scenarioType) {
      case "stale_status":
        assert.ok(now - Date.parse(evidence.statusIssuedAt) > 86400000);
        assert.ok(Date.parse(evidence.statusValidUntil) < now); break;
      case "temporal_accreditation":
        assert.ok(Date.parse(evidence.accreditation.validFrom) > Date.parse(source.awardDate)); break;
      case "non_accredited": assert.equal(evidence.accreditation, null); break;
      case "invalid_signature": assert.equal(evidence.issuerSignature, "0x00"); break;
      case "tampered": assert.notEqual(evidence.submittedCertificateHash, source.certificateHash); break;
      case "missing_anchor":
        assert.equal(evidence.anchorExists, false);
        assert.equal(evidence.blockchainTx, source.blockchainTx);
        assert.ok(source.blockchainTx); break;
      case "duplicate":
        assert.deepEqual(evidence.submissionCredentialIds, [source.id, source.id]);
        assert.equal(evidence.certificateHash, source.certificateHash); break;
      case "rbac_cross_institution":
        assert.notEqual(evidence.actorInstitutionId, source.institutionId);
        assert.equal(evidence.expectedAuthorization, "denied"); break;
    }
  }
});

test("derived evidence is independent of base records", () => {
  const copy = generateResearchDataset();
  const before = JSON.stringify(copy.credentials);
  copy.derivedCases.find(row => row.scenarioType === "temporal_accreditation").evidence.accreditation.validFrom = "2099-01-01";
  assert.equal(JSON.stringify(copy.credentials), before);
});

test("generated output validates and summary reflects actual records", () => {
  assert.equal(validateResearchDataset(dataset), true);
  assert.deepEqual(summarizeResearchDataset(dataset), dataset.summary);
});

const invalidCases = [
  ["missing anchor transaction removed", d => { d.derivedCases.find(r => r.scenarioType === "missing_anchor").evidence.blockchainTx = null; }, /retain source transaction metadata/],
  ["missing anchor transaction changed", d => { d.derivedCases.find(r => r.scenarioType === "missing_anchor").evidence.blockchainTx = "0x" + "00".repeat(32); }, /retain source transaction metadata/],
  ["fingerprint", d => { d.fingerprint = "00".repeat(32); }, /fingerprint mismatch/],
  ["correction reason", d => { d.correctionPairs[0].reason = ""; }, /reason mismatch/],
  ["replacement reuse", d => { d.correctionPairs[1].replacementCredentialId = d.correctionPairs[0].replacementCredentialId; }, /correction replacements must be unique/],
  ["anchor expectations", d => { d.derivedCases.find(r => r.scenarioType === "missing_anchor").expectedValidity.full = true; }, /separate anchor expectations/],
  ["missing seed", d => { delete d.metadata.seed; }, /seed required/],
  ["reference time", d => { d.metadata.referenceTime = "2027-01-01"; }, /referenceTime/],
  ["institution count", d => d.institutions.pop(), /5 institutions/],
  ["programme count", d => d.programmes.pop(), /10 programmes/],
  ["base count", d => d.credentials.pop(), /1000 credentials/],
  ["status counts", d => { d.credentials[0].status = "revoked"; }, /850 active/],
  ["composition", d => { d.credentials[0].kind = "replacement"; }, /800 ordinary/],
  ["pair count", d => d.correctionPairs.pop(), /50 correction pairs/],
  ["case count", d => d.derivedCases.pop(), /200 derived cases/],
  ["case distribution", d => { d.derivedCases[0].scenarioType = "invalid_signature"; }, /40 tampered/],
  ["duplicate IDs", d => { d.credentials[1].id = d.credentials[0].id; }, /credential IDs must be unique/],
  ["duplicate hashes", d => { d.credentials[1].certificateHash = d.credentials[0].certificateHash; }, /certificate hashes must be unique/],
  ["duplicate commitments", d => { d.credentials[1].credentialCommitment = d.credentials[0].credentialCommitment; }, /commitments must be unique/],
  ["pair identity", d => { d.correctionPairs[0].replacementCredentialId = d.correctionPairs[0].originalCredentialId; }, /distinct correction/],
  ["pair student", d => { d.correctionPairs[0].studentId = d.students[0].id; }, /studentId mismatch/],
  ["pair institution", d => { d.correctionPairs[0].institutionId = "RESEARCH-INST-02"; }, /institutionId mismatch/],
  ["pair programme", d => { d.correctionPairs[0].programmeCode = "PROG-02"; }, /programmeCode mismatch/],
  ["pair links", d => { d.credentials[900].supersededBy = d.credentials[0].id; }, /links mismatch/],
  ["unknown collision", d => { d.derivedCases.find(r => r.scenarioType === "unknown_id").targetCredentialId = d.credentials[0].id; }, /unknown_id/],
  ["fresh stale case", d => { d.derivedCases.find(r => r.scenarioType === "stale_status").evidence.statusIssuedAt = d.metadata.referenceTime; }, /exceed 24 hours/],
  ["personal email", d => { d.students[0].email = "person@example.com"; }, /synthetic student/],
  ["summary counts", d => { d.summary.baseCredentialCount = 999; }, /summary mismatch/],
];
for (const [name, mutate, message] of invalidCases) {
  test(`validator rejects ${name}`, () => {
    const copy = structuredClone(dataset);
    mutate(copy);
    assert.throws(() => validateResearchDataset(copy), message);
  });
}
