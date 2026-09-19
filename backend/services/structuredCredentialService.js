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
};