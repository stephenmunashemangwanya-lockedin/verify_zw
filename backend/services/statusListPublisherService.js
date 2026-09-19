const {
  getLatestStatusList,
  createStatusList,
} = require(
  "../models/statusListModel"
);

const {
  normaliseIndices,
  buildStatusListPayload,
  buildStatusTimes,
  signStatusListPayload,
} = require(
  "./statusListService"
);

const {
  issueCredentialOnChain,
} = require(
  "./blockchainService"
);

const publishStatusListForInstitution =
  async ({
    institutionId,
    institutionWallet,
    revokeIndex = null,
    now = new Date(),
  }) => {
    const latest =
      await getLatestStatusList(
        institutionId
      );

    const previousIndices =
      Array.isArray(
        latest?.revoked_indices
      )
        ? latest.revoked_indices
        : [];

    const revokedIndices =
      normaliseIndices([
        ...previousIndices,

        ...(
          revokeIndex === null ||
          revokeIndex === undefined
            ? []
            : [
                revokeIndex,
              ]
        ),
      ]);

    const version =
      Number(
        latest?.version ||
          0
      ) + 1;

    const {
      issuedAt,
      nextUpdate,
    } =
      buildStatusTimes({
        now,
      });

    const payload =
      buildStatusListPayload({
        institutionId,
        version,
        revokedIndices,
        issuedAt,
        nextUpdate,
      });

    const signed =
      await signStatusListPayload({
        payload,

        expectedInstitutionWallet:
          institutionWallet,
      });

    const blockchainResult =
      await issueCredentialOnChain(
        signed.commitmentHash,
        {
          expectedInstitutionWallet:
            institutionWallet,
        }
      );

    return createStatusList({
      institutionId,
      version,
      revokedIndices,
      issuedAt,
      nextUpdate,
      payload,

      signature:
        signed.proof
          .signature,

      issuerWallet:
        signed.proof
          .issuerWallet,

      commitment:
        signed
          .commitmentHash,

      blockchainResult,
    });
  };

module.exports = {
  publishStatusListForInstitution,
};