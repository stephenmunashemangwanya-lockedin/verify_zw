const {
  JsonRpcProvider,
} = require("ethers");

const {
  getBlockchainConfig,
  validateResolvedContract,
} = require(
  "../config/blockchain"
);

const {
  resolveInstitutionSigner,
} = require(
  "../config/blockchainSigner"
);

const {
  signCredentialPayload,
  verifyCredentialPayloadSignature,
} = require(
  "./credentialProofService"
);

const DEFAULT_FRESHNESS_HOURS =
  24;

const normaliseIndices =
  (
    indices = []
  ) =>
    [
      ...new Set(
        indices.map(
          (
            value
          ) =>
            Number(
              value
            )
        )
      ),
    ]
      .filter(
        Number.isSafeInteger
      )
      .filter(
        (
          value
        ) =>
          value >= 0
      )
      .sort(
        (
          first,
          second
        ) =>
          first -
          second
      );

const buildStatusListPayload =
  ({
    institutionId,
    version,
    revokedIndices = [],
    issuedAt,
    nextUpdate,
  }) => ({
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
    ],

    id:
      `urn:verifyzw:status:${institutionId}:v${version}`,

    type: [
      "VerifiableCredential",
      "VerifyZWStatusListCredential",
    ],

    issuer:
      `urn:verifyzw:institution:${institutionId}`,

    validFrom:
      issuedAt,

    validUntil:
      nextUpdate,

    credentialSubject: {
      id:
        `urn:verifyzw:status:${institutionId}#list`,

      type:
        "VerifyZWStatusList",

      statusPurpose:
        "revocation",

      version,

      revokedIndices:
        normaliseIndices(
          revokedIndices
        ),
    },
  });

const buildStatusTimes =
  ({
    now =
      new Date(),

    freshnessHours =
      DEFAULT_FRESHNESS_HOURS,
  } = {}) => {
    const issuedAt =
      new Date(
        now
      );

    const nextUpdate =
      new Date(
        issuedAt.getTime() +
          freshnessHours *
            60 *
            60 *
            1000
      );

    return {
      issuedAt:
        issuedAt.toISOString(),

      nextUpdate:
        nextUpdate.toISOString(),
    };
  };

const signStatusListPayload =
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

const verifyStatusListArtifact =
  ({
    payload,
    signature,
    expectedInstitutionWallet,
    statusListIndex,
    now =
      new Date(),
  }) => {
    const proof =
      verifyCredentialPayloadSignature({
        payload,
        signature,
        expectedIssuerWallet:
          expectedInstitutionWallet,
      });

    if (!proof.valid) {
      return {
        signatureValid:
          false,

        fresh:
          false,

        revoked:
          null,

        commitmentHash:
          proof
            .commitmentHash ||
          null,
      };
    }

    const issuedAt =
      new Date(
        payload
          ?.validFrom
      );

    const nextUpdate =
      new Date(
        payload
          ?.validUntil
      );

    const currentTime =
      new Date(
        now
      );

    const timesValid =
      !Number.isNaN(
        issuedAt.getTime()
      ) &&
      !Number.isNaN(
        nextUpdate.getTime()
      );

    const fresh =
      timesValid &&
      currentTime >=
        issuedAt &&
      currentTime <=
        nextUpdate;

    const revokedIndices =
      normaliseIndices(
        payload
          ?.credentialSubject
          ?.revokedIndices ||
          []
      );

    const index =
      Number(
        statusListIndex
      );

    return {
      signatureValid:
        true,

      fresh,

      revoked:
        fresh &&
        Number.isSafeInteger(
          index
        )
          ? revokedIndices.includes(
              index
            )
          : null,

      issuedAt:
        timesValid
          ? issuedAt.toISOString()
          : null,

      nextUpdate:
        timesValid
          ? nextUpdate.toISOString()
          : null,

      version:
        payload
          ?.credentialSubject
          ?.version ??
        null,

      commitmentHash:
        proof
          .commitmentHash ||
        null,
    };
  };

module.exports = {
  DEFAULT_FRESHNESS_HOURS,
  normaliseIndices,
  buildStatusListPayload,
  buildStatusTimes,
  signStatusListPayload,
  verifyStatusListArtifact,
};
