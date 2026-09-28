const {
  JsonRpcProvider,
} = require("ethers");

const {
  getBlockchainConfig,
  validateResolvedContract,
} = require("../config/blockchain");

const {
  resolveInstitutionSigner,
} = require("../config/blockchainSigner");

const {
  signCredentialPayload,
} = require("./credentialProofService");

const buildStructuredCredentialPayload = ({
  credentialId,
  institutionId,
  studentId,
  studentNumber,
  qualification,
  programme,
  awardDate,
  issueDate,
  statusListIndex,
}) => {
  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
    ],

    id:
      `urn:uuid:${credentialId}`,

    type: [
      "VerifiableCredential",
      "EducationalCredential",
    ],

    issuer:
      `urn:verifyzw:institution:${institutionId}`,

    credentialSubject: {
      id:
        `urn:verifyzw:student:${studentId}`,

      registrationNumber:
        studentNumber,

      qualification,

      programme,

      awardDate,
    },

    validFrom:
      issueDate,

    credentialStatus: {
      id:
        `urn:verifyzw:status:${institutionId}#${statusListIndex}`,

      type:
        "BitstringStatusListEntry",

      statusPurpose:
        "revocation",

      statusListIndex:
        String(
          statusListIndex
        ),

      statusListCredential:
        `urn:verifyzw:status:${institutionId}`,
    },
  };
};

const signStructuredCredential =
  async ({
    payload,
    expectedInstitutionWallet,
  }) => {
    const config =
      getBlockchainConfig({
        requireSigner:
          false,
      });

    const provider =
      new JsonRpcProvider(
        config.rpcUrl
      );

    await validateResolvedContract(
      config,
      provider
    );

    const signer =
      await resolveInstitutionSigner(
        expectedInstitutionWallet,
        config,
        provider
      );

    return signCredentialPayload({
      payload,
      signer,
      expectedIssuerWallet:
        expectedInstitutionWallet,
    });
  };

module.exports = {
  buildStructuredCredentialPayload,
  signStructuredCredential,
  validateStructuredCredentialBinding,
};

// Validate the prototype schema and bind every security-relevant signed field
// to the row used for accreditation, ownership and lifecycle decisions.
function validateStructuredCredentialBinding(row) {
  const p = row?.credential_payload;
  const s = p?.credentialSubject;
  const status = p?.credentialStatus;
  const day = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  };
  const index = String(row?.status_list_index ?? "");
  return Boolean(p && s && status &&
    p['@context']?.includes('https://www.w3.org/ns/credentials/v2') &&
    Array.isArray(p.type) && p.type.includes('VerifiableCredential') && p.type.includes('EducationalCredential') &&
    row.id && row.institution_id && row.student_id && row.programme && row.qualification && row.student_number &&
    p.id === `urn:uuid:${row.id}` &&
    p.issuer === `urn:verifyzw:institution:${row.institution_id}` &&
    s.id === `urn:verifyzw:student:${row.student_id}` &&
    s.registrationNumber === row.student_number && s.programme === row.programme && s.qualification === row.qualification &&
    day(s.awardDate) && day(s.awardDate) === day(row.award_date || row.issue_date) &&
    day(p.validFrom) && day(p.validFrom) === day(row.issue_date) &&
    /^\d+$/.test(index) && Number.isSafeInteger(Number(index)) &&
    status.type === 'BitstringStatusListEntry' && status.statusPurpose === 'revocation' &&
    status.statusListIndex === index &&
    status.id === `urn:verifyzw:status:${row.institution_id}#${index}` &&
    status.statusListCredential === `urn:verifyzw:status:${row.institution_id}`);
}
