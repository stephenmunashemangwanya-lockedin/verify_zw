"use strict";
const { createHash } = require("node:crypto");
const { Wallet } = require("ethers");
const { buildStructuredCredentialPayload } = require("../../../backend/services/structuredCredentialService");
const { buildStatusListPayload } = require("../../../backend/services/statusListService");
const { signCredentialPayload } = require("../../../backend/services/credentialProofService");

// Load the real evaluator while preventing its default dependency imports from
// loading database/env/network clients. Restore all cache entries synchronously.
function loadEvaluator() {
  const service = require.resolve("../../../backend/services/verificationService");
  const guards = {
    "../../../backend/services/blockchainService": "verifyCredentialOnChain",
    "../../../backend/services/ipfsService": "checkPinStatus",
    "../../../backend/models/accreditationModel": "findEffectiveAccreditation",
    "../../../backend/models/statusListModel": "getLatestStatusList",
  };
  const saved = new Map([[service, require.cache[service]]]);
  try {
    for (const [name, method] of Object.entries(guards)) {
      const id = require.resolve(name);
      saved.set(id, require.cache[id]);
      require.cache[id] = { id, filename: id, loaded: true, exports: {
        [method]: () => { throw new Error("Evaluation dependency was not injected"); },
      } };
    }
    delete require.cache[service];
    return require(service).createVerificationEvaluator;
  } finally {
    for (const [id, value] of saved) {
      if (value) require.cache[id] = value;
      else delete require.cache[id];
    }
  }
}
const createVerificationEvaluator = loadEvaluator();

async function createFixture(base, referenceTime, evidence = {}) {
  // Publicly reproducible throwaway signing material, never connected to a provider.
  const key = createHash("sha256").update(`VerifyZW RESEARCH ONLY unfunded fixture:${base.institutionId}`).digest("hex");
  const signer = new Wallet(`0x${key}`);
  const credential = {
    id: base.id, student_id: base.studentId, student_number: base.studentId,
    student_name: `SYNTHETIC ${base.studentId}`, institution_id: base.institutionId,
    institution_name: base.institutionId, programme: base.programmeCode,
    qualification: base.qualification, award_date: base.awardDate, issue_date: base.issueDate,
    status: base.status, superseded_by: base.supersededBy || null,
    certificate_hash: base.certificateHash, blockchain_tx: base.blockchainTx,
    ipfs_cid: `research-only-${base.id}`, proof_version: "structured-v2", status_list_index: 0,
    issuer_wallet: signer.address, institution_wallet: signer.address,
  };
  const payload = buildStructuredCredentialPayload({
    credentialId: credential.id, institutionId: credential.institution_id,
    studentId: credential.student_id, studentNumber: credential.student_number,
    qualification: credential.qualification, programme: credential.programme,
    awardDate: credential.award_date, issueDate: credential.issue_date, statusListIndex: 0,
  });
  const signed = await signCredentialPayload({ payload, signer, expectedIssuerWallet: signer.address });
  Object.assign(credential, { credential_payload: payload, credential_commitment: signed.commitmentHash,
    issuer_signature: evidence.issuerSignature ?? signed.proof.signature });
  if (Object.hasOwn(evidence, "blockchainTx")) credential.blockchain_tx = evidence.blockchainTx;
  const statusPayload = buildStatusListPayload({ institutionId: base.institutionId, version: 1,
    revokedIndices: base.status === "revoked" ? [0] : [],
    issuedAt: evidence.statusIssuedAt ?? base.statusIssuedAt,
    nextUpdate: evidence.statusValidUntil ?? base.statusValidUntil });
  const statusSigned = await signCredentialPayload({ payload: statusPayload, signer });
  const status = { payload: statusPayload, signature: statusSigned.proof.signature, commitment: statusSigned.commitmentHash, version: 1 };
  const acc = Object.hasOwn(evidence, "accreditation") ? evidence.accreditation : base.accreditation;
  const calls = { chain: 0, status: 0, accreditation: 0, ipfs: 0 };
  const dependencies = {
    verifyCredentialOnChain: async hash => {
      calls.chain += 1;
      return { exists: evidence.anchorExists !== false && hash === signed.commitmentHash,
        revoked: base.status === "revoked", issuer: signer.address };
    },
    getLatestStatusList: async institutionId => {
      calls.status += 1;
      return institutionId === base.institutionId ? status : null;
    },
    findEffectiveAccreditation: async ({ institutionId, programme, awardDate }) => {
      calls.accreditation += 1;
      return acc && acc.institutionId === institutionId && acc.programmeCode === programme &&
        Date.parse(acc.validFrom) <= Date.parse(awardDate) && Date.parse(awardDate) <= Date.parse(acc.validUntil)
        ? { id: acc.id, programme, valid_from: acc.validFrom, valid_to: acc.validUntil, source_label: "SYNTHETIC_RESEARCH_ONLY" } : null;
    },
    checkPinStatus: async cid => { calls.ipfs += 1; return cid === credential.ipfs_cid; },
  };
  return { input: { credential, certificateHash: base.certificateHash, verificationTime: referenceTime },
    calls, dependencies, evaluators: Object.fromEntries(["full", "no-anchor"].map(mode =>
      [mode, createVerificationEvaluator(dependencies, { mode })])) };
}
module.exports = { createFixture };
