"use strict";

// Research-only descriptors, not production rows or signed proofs. No service,
// wallet, database, PDF, or network dependency is loaded by this module.
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SEED = 20260905;
const REFERENCE_TIME = "2026-09-05T12:00:00.000Z";
const DAY_MS = 24 * 60 * 60 * 1000;
const DISTRIBUTION = Object.freeze({
  tampered: 40, invalid_signature: 30, non_accredited: 30,
  temporal_accreditation: 30, stale_status: 20, missing_anchor: 20,
  duplicate: 10, rbac_cross_institution: 10, unknown_id: 10,
});
const hash = (value) => createHash("sha256").update(value).digest("hex");
const label = (prefix, number, width = 4) => `${prefix}-${String(number).padStart(width, "0")}`;
const atOffset = (ms) => new Date(Date.parse(REFERENCE_TIME) + ms).toISOString();
const countBy = (rows, key) => rows.reduce((counts, row) => {
  counts[row[key]] = (counts[row[key]] || 0) + 1;
  return counts;
}, {});

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonical(value[key])])
  );
  return value;
}
// Include all fixed research timestamps and summary; omit only the fingerprint itself.
function fingerprintResearchDataset(dataset) {
  const { fingerprint: _fingerprint, ...content } = dataset;
  return hash(JSON.stringify(canonical(content)));
}
function syntheticCid(digest) {
  // CIDv0: base58btc-encoded SHA-256 multihash; no document is uploaded/stored.
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let value = BigInt(`0x1220${digest}`), encoded = "";
  while (value > 0n) {
    encoded = alphabet[Number(value % 58n)] + encoded;
    value /= 58n;
  }
  return encoded;
}
function syntheticPublicToken(seed, id) {
  const h = hash(`${seed}:synthetic-public-identifier:${id}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function summarizeResearchDataset(dataset) {
  return {
    seed: dataset.metadata.seed,
    baseCredentialCount: dataset.credentials.length,
    statusDistribution: countBy(dataset.credentials, "status"),
    composition: countBy(dataset.credentials, "kind"),
    institutionCount: dataset.institutions.length,
    programmeCount: dataset.programmes.length,
    studentCount: dataset.students.length,
    correctionPairCount: dataset.correctionPairs.length,
    derivedCaseCount: dataset.derivedCases.length,
    derivedDistribution: countBy(dataset.derivedCases, "scenarioType"),
  };
}

function generateResearchDataset(seed = DEFAULT_SEED) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new Error("seed must be a non-negative safe integer");
  const institutions = Array.from({ length: 5 }, (_, i) => ({
    id: label("RESEARCH-INST", i + 1, 2),
    name: label("SYNTHETIC-RESEARCH-INSTITUTION", i + 1, 2),
    issuerIdentity: label("RESEARCH-ISSUER", i + 1, 2), synthetic: true,
  }));
  const programmes = Array.from({ length: 10 }, (_, i) => ({
    code: label("PROG", i + 1, 2), name: label("SYNTHETIC-PROGRAMME", i + 1, 2), synthetic: true,
  }));
  const students = Array.from({ length: 950 }, (_, i) => ({
    id: label("EVAL-STU", i + 1, 6), name: label("SYNTHETIC-STUDENT", i + 1, 6),
    email: `${label("eval-stu", i + 1, 6)}@evaluation.example.test`,
    institutionId: institutions[i % 5].id, programmeCode: programmes[i % 10].code, synthetic: true,
  }));
  const credentials = Array.from({ length: 1000 }, (_, i) => {
    const student = students[i < 950 ? i : i - 50];
    const id = label("EVAL-CRED", i + 1);
    return {
      id, studentId: student.id, studentNumber: student.id, institutionId: student.institutionId,
      programme: student.programmeCode, statusListIndex: i,
      ipfsCid: syntheticCid(hash(`${seed}:synthetic-document:${id}`)),
      issuerWallet: `0x${hash(`${seed}:synthetic-issuer:${student.institutionId}`).slice(0, 40)}`,
      publicToken: syntheticPublicToken(seed, id),
      programmeCode: student.programmeCode, qualification: `SYNTHETIC AWARD ${student.programmeCode}`,
      awardDate: "2026-08-01", issueDate: "2026-08-02",
      status: i < 800 || i >= 950 ? "active" : i < 900 ? "revoked" : "superseded",
      kind: i < 800 ? "ordinary" : i < 900 ? "revoked" : i < 950 ? "original" : "replacement",
      certificateHash: hash(`${seed}:synthetic-document:${id}`),
      credentialCommitment: hash(`${seed}:synthetic-commitment:${id}`),
      issuerIdentity: institutions[i % 5].issuerIdentity,
      proofVersion: "structured-v2", proofMaterial: "synthetic-descriptor-only",
      blockchainTx: `0x${hash(`${seed}:synthetic-transaction:${id}`)}`,
      statusIssuedAt: atOffset(-4 * 60 * 60 * 1000),
      statusValidUntil: atOffset(20 * 60 * 60 * 1000),
      accreditation: {
        id: `RESEARCH-ACC-${student.institutionId}-${student.programmeCode}`,
        institutionId: student.institutionId, programmeCode: student.programmeCode,
        validFrom: "2025-01-01", validUntil: "2027-12-31",
        source: "SYNTHETIC_RESEARCH_ONLY", synthetic: true,
      },
      synthetic: true,
    };
  });
  const correctionPairs = Array.from({ length: 50 }, (_, i) => {
    const original = credentials[900 + i];
    const replacement = credentials[950 + i];
    original.supersededBy = replacement.id;
    original.supersededAt = "2026-08-03T12:00:00.000Z";
    original.supersessionReason = `SYNTHETIC correction ${i + 1}: qualification evidence replaced`;
    replacement.supersedes = original.id;
    return {
      originalCredentialId: original.id, replacementCredentialId: replacement.id,
      studentId: original.studentId, institutionId: original.institutionId,
      programmeCode: original.programmeCode,
      reason: original.supersessionReason,
    };
  });
  const derivedCases = [];
  for (const [scenarioType, count] of Object.entries(DISTRIBUTION)) {
    for (let i = 0; i < count; i += 1) {
      const scenarioId = label("EVAL-CASE", derivedCases.length + 1);
      // SHA-256 is the seeded deterministic selection mechanism; no randomness.
      const source = credentials[parseInt(hash(`${seed}:${scenarioId}`).slice(0, 8), 16) % 800];
      const scenario = { scenarioId, scenarioType, seed, synthetic: true };
      if (scenarioType === "unknown_id") {
        scenario.targetCredentialId = label("EVAL-UNKNOWN", i + 1);
        scenario.sourceCredentialId = null;
        scenario.evidence = { anchorExists: false };
      } else {
        scenario.sourceCredentialId = source.id;
        scenario.targetCredentialId = source.id;
        switch (scenarioType) {
          case "tampered":
            // Claimed-document verification retains the known identifier.
            scenario.evidence = { submittedCertificateHash: hash(`${seed}:tampered:${scenarioId}`) };
            break;
          case "invalid_signature":
            scenario.evidence = { issuerSignature: "0x00" };
            break;
          case "non_accredited":
            scenario.evidence = { accreditation: null };
            break;
          case "temporal_accreditation":
            scenario.evidence = { accreditation: {
              ...source.accreditation, validFrom: "2027-01-01", validUntil: "2027-12-31",
            } };
            break;
          case "stale_status":
            scenario.evidence = {
              statusIssuedAt: atOffset(-DAY_MS - 1000), statusValidUntil: atOffset(-1000),
            };
            break;
          case "missing_anchor":
            // Only external anchor evidence is absent; retain local transaction metadata.
            scenario.evidence = { anchorExists: false, blockchainTx: source.blockchainTx };
            scenario.expectedValidity = { full: false, noAnchor: true };
            scenario.expectationBasis = "Research design: external blockchain-anchor read omitted while local blockchain transaction metadata and all non-chain verification predicates are retained. Not an observed evaluator result.";
            break;
          case "duplicate":
            scenario.evidence = { submissionCredentialIds: [source.id, source.id], certificateHash: source.certificateHash };
            break;
          case "rbac_cross_institution":
            scenario.evidence = {
              actorId: label("RESEARCH-ACTOR", i + 1), actorRole: "issuer",
              actorInstitutionId: institutions[(institutions.findIndex(inst => inst.id === source.institutionId) + 1) % 5].id,
              operation: "issue-credential", expectedAuthorization: "denied",
            };
            break;
        }
      }
      derivedCases.push(scenario);
    }
  }
  const dataset = {
    metadata: {
      schemaVersion: "verifyzw-research-dataset-v1", seed, generatedFor: "Chapter 4 controlled evaluation",
      referenceTime: REFERENCE_TIME, baseCredentialCount: 1000, derivedCaseCount: 200,
      synthetic: true, evidenceType: "descriptors; not signed proofs or live-chain evidence",
      statusFreshnessHours: 24,
    },
    institutions, programmes, students, credentials, correctionPairs, derivedCases,
  };
  dataset.summary = summarizeResearchDataset(dataset);
  dataset.fingerprint = fingerprintResearchDataset(dataset);
  validateResearchDataset(dataset);
  return dataset;
}

function validateResearchDataset(dataset) {
  const check = (condition, message) => { if (!condition) throw new Error(`Invalid research dataset: ${message}`); };
  check(dataset && typeof dataset === "object", "dataset required");
  check(Number.isSafeInteger(dataset.metadata?.seed) && dataset.metadata.seed >= 0, "seed required");
  check(dataset.metadata.referenceTime === REFERENCE_TIME, "fixed referenceTime required");
  check(dataset.metadata.synthetic === true, "synthetic metadata required");
  for (const key of ["institutions", "programmes", "students", "credentials", "correctionPairs", "derivedCases"]) {
    check(Array.isArray(dataset[key]), `${key} array required`);
  }
  const unique = (rows, key, description) => {
    check(rows.every(row => row && typeof row[key] === "string" && row[key]), `${description} values required`);
    check(new Set(rows.map(row => row[key])).size === rows.length, `${description} must be unique`);
  };
  const { credentials, correctionPairs, derivedCases } = dataset;
  check(dataset.institutions.length === 5, "expected 5 institutions");
  check(dataset.programmes.length === 10, "expected 10 programmes");
  check(dataset.students.length === 950, "expected 950 synthetic students");
  check(credentials.length === 1000, "expected 1000 credentials");
  check(correctionPairs.length === 50, "expected 50 correction pairs");
  check(derivedCases.length === 200, "expected 200 derived cases");
  unique(dataset.institutions, "id", "institution IDs");
  unique(dataset.programmes, "code", "programme codes");
  unique(dataset.students, "id", "student IDs");
  unique(credentials, "id", "credential IDs");
  unique(credentials, "certificateHash", "certificate hashes");
  unique(credentials, "credentialCommitment", "commitments");
  unique(credentials, "publicToken", "public identifiers");
  unique(derivedCases, "scenarioId", "scenario IDs");
  const summary = summarizeResearchDataset(dataset);
  for (const [status, count] of Object.entries({ active: 850, revoked: 100, superseded: 50 })) {
    check(summary.statusDistribution[status] === count, `expected ${count} ${status} credentials`);
  }
  for (const [kind, count] of Object.entries({ ordinary: 800, revoked: 100, original: 50, replacement: 50 })) {
    check(summary.composition[kind] === count, `expected ${count} ${kind} credentials`);
  }
  for (const [type, count] of Object.entries(DISTRIBUTION)) {
    check(summary.derivedDistribution[type] === count, `expected ${count} ${type} cases`);
  }
  const inst = new Set(dataset.institutions.map(row => row.id));
  const programmes = new Set(dataset.programmes.map(row => row.code));
  const students = new Map(dataset.students.map(row => [row.id, row]));
  const byId = new Map(credentials.map(row => [row.id, row]));
  for (const row of dataset.institutions) check(row.synthetic === true && /^RESEARCH-INST-\d{2}$/.test(row.id) && /^SYNTHETIC-RESEARCH-INSTITUTION-\d{2}$/.test(row.name), "synthetic institution required");
  for (const row of dataset.programmes) check(row.synthetic === true && /^PROG-\d{2}$/.test(row.code) && /^SYNTHETIC-PROGRAMME-\d{2}$/.test(row.name), "synthetic programme required");
  for (const row of dataset.students) check(row.synthetic === true && /^EVAL-STU-\d{6}$/.test(row.id) && /^SYNTHETIC-STUDENT-\d{6}$/.test(row.name) && /^eval-stu-\d{6}@evaluation\.example\.test$/.test(row.email), "synthetic student required");
  for (const row of credentials) {
    check(row.synthetic === true && /^EVAL-CRED-\d{4}$/.test(row.id), "synthetic credential required");
    check(inst.has(row.institutionId) && programmes.has(row.programmeCode), "credential institution/programme reference");
    const student = students.get(row.studentId);
    check(student && student.institutionId === row.institutionId && student.programmeCode === row.programmeCode, "credential student binding");
    check(row.studentNumber === row.studentId && row.programme === row.programmeCode, "credential metadata binding");
    check(Number.isSafeInteger(row.statusListIndex) && row.statusListIndex >= 0, "valid status list index required");
    check(/^0x[0-9a-f]{40}$/.test(row.issuerWallet), "synthetic wallet address required");
    check(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(row.ipfsCid), "synthetic CIDv0 required");
    check(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(row.publicToken), "synthetic public identifier required");
    check(row.proofMaterial === "synthetic-descriptor-only", "placeholder evidence label required");
    check(/^[a-f0-9]{64}$/.test(row.certificateHash) && /^[a-f0-9]{64}$/.test(row.credentialCommitment), "SHA-256 evidence required");
    check(/^0x[a-f0-9]{64}$/.test(row.blockchainTx), "synthetic transaction required");
    check(row.proofVersion === "structured-v2" && /^RESEARCH-ISSUER-\d{2}$/.test(row.issuerIdentity), "synthetic proof metadata required");
    check(row.status === ({ ordinary: "active", revoked: "revoked", original: "superseded", replacement: "active" })[row.kind], "credential kind/status mismatch");
    const age = Date.parse(REFERENCE_TIME) - Date.parse(row.statusIssuedAt);
    check(age >= 0 && age <= DAY_MS && Date.parse(row.statusValidUntil) >= Date.parse(REFERENCE_TIME), "base status must be fresh");
    const acc = row.accreditation;
    check(acc?.synthetic === true && acc.source === "SYNTHETIC_RESEARCH_ONLY" && acc.institutionId === row.institutionId && acc.programmeCode === row.programmeCode && Date.parse(acc.validFrom) <= Date.parse(row.awardDate) && Date.parse(row.awardDate) <= Date.parse(acc.validUntil), "base accreditation must cover award date");
  }
  unique(correctionPairs, "originalCredentialId", "correction originals");
  unique(correctionPairs, "replacementCredentialId", "correction replacements");
  for (const pair of correctionPairs) {
    const original = byId.get(pair.originalCredentialId);
    const replacement = byId.get(pair.replacementCredentialId);
    check(original && replacement && original.id !== replacement.id, "distinct correction pair credentials required");
    for (const key of ["studentId", "institutionId", "programmeCode"]) check(original[key] === replacement[key] && pair[key] === original[key], `correction pair ${key} mismatch`);
    check(original.kind === "original" && original.status === "superseded" && replacement.kind === "replacement" && replacement.status === "active", "correction pair lifecycle mismatch");
    check(original.supersededBy === replacement.id && replacement.supersedes === original.id, "correction pair links mismatch");
    check(typeof pair.reason === "string" && pair.reason.startsWith("SYNTHETIC correction ") && original.supersessionReason === pair.reason, "correction reason mismatch");
    check(original.supersededAt === "2026-08-03T12:00:00.000Z", "fixed supersession time required");
    check(original.certificateHash !== replacement.certificateHash && original.credentialCommitment !== replacement.credentialCommitment, "correction evidence must differ");
  }
  for (const row of derivedCases) {
    check(row.synthetic === true && row.seed === dataset.metadata.seed, "synthetic scenario and matching seed required");
    const source = byId.get(row.sourceCredentialId);
    if (row.scenarioType === "unknown_id") {
      check(row.sourceCredentialId === null && /^EVAL-UNKNOWN-\d{4}$/.test(row.targetCredentialId) && !byId.has(row.targetCredentialId), "unknown_id must not resolve to a base credential");
      continue;
    }
    check(source?.status === "active" && row.targetCredentialId === source.id, "derived case must reference an active base credential");
    const evidence = row.evidence;
    check(evidence && typeof evidence === "object", "scenario evidence required");
    switch (row.scenarioType) {
      case "tampered": check(/^[a-f0-9]{64}$/.test(evidence.submittedCertificateHash) && evidence.submittedCertificateHash !== source.certificateHash, "tampered hash must differ"); break;
      case "invalid_signature": check(evidence.issuerSignature === "0x00", "invalid signature evidence required"); break;
      case "non_accredited": check(evidence.accreditation === null, "absent accreditation required"); break;
      case "temporal_accreditation": {
        const acc = evidence.accreditation;
        check(acc?.synthetic === true && Date.parse(acc.validFrom) <= Date.parse(acc.validUntil) && (Date.parse(source.awardDate) < Date.parse(acc.validFrom) || Date.parse(source.awardDate) > Date.parse(acc.validUntil)), "temporal accreditation must exclude award date"); break;
      }
      case "stale_status": check(Date.parse(REFERENCE_TIME) - Date.parse(evidence.statusIssuedAt) > DAY_MS, "stale status must exceed 24 hours"); break;
      case "missing_anchor":
        check(evidence.anchorExists === false && evidence.blockchainTx === source.blockchainTx && /^0x[a-f0-9]{64}$/.test(evidence.blockchainTx), "missing external anchor must retain source transaction metadata");
        check(row.expectedValidity?.full === false && row.expectedValidity?.noAnchor === true && row.expectationBasis?.includes("Not an observed evaluator result"), "separate anchor expectations required");
        break;
      case "duplicate": check(evidence.submissionCredentialIds?.length === 2 && evidence.submissionCredentialIds.every(id => id === source.id) && evidence.certificateHash === source.certificateHash, "duplicate submissions must reuse evidence"); break;
      case "rbac_cross_institution": check(inst.has(evidence.actorInstitutionId) && evidence.actorInstitutionId !== source.institutionId && evidence.expectedAuthorization === "denied", "cross-institution actor mismatch required"); break;
    }
  }
  check(dataset.metadata.baseCredentialCount === 1000 && dataset.metadata.derivedCaseCount === 200, "metadata counts mismatch");
  check(JSON.stringify(dataset.summary) === JSON.stringify(summary), "summary mismatch");
  check(dataset.fingerprint === fingerprintResearchDataset(dataset), "fingerprint mismatch");
  return true;
}

// Fixed output destination intentionally avoids arbitrary writes outside research.
if (require.main === module) {
  try {
    if (process.argv.length > 2) throw new Error("No CLI arguments supported; methodology seed and output are fixed");
    const dataset = generateResearchDataset();
    const output = path.resolve(__dirname, "../../test-results/research/research-dataset.json");
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ output, ...dataset.summary, fingerprint: dataset.fingerprint }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { generateResearchDataset, validateResearchDataset, summarizeResearchDataset, fingerprintResearchDataset };
