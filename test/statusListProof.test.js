const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  Wallet,
} = require(
  "ethers"
);

const {
  buildStatusListPayload,
  buildStatusTimes,
  verifyStatusListArtifact,
} = require(
  "../backend/services/statusListService"
);

const {
  signCredentialPayload,
} = require(
  "../backend/services/credentialProofService"
);

const INSTITUTION_ID =
  "22222222-2222-4222-8222-222222222222";

const OTHER_INSTITUTION_ID =
  "33333333-3333-4333-8333-333333333333";

const buildSignedStatus =
  async ({
    revokedIndices = [],
    issuedAt =
      "2026-09-18T10:00:00.000Z",
    nextUpdate =
      "2026-09-19T10:00:00.000Z",
    institutionId =
      INSTITUTION_ID,
    transformPayload = null,
  } = {}) => {
    const wallet =
      Wallet.createRandom();

    let payload =
      buildStatusListPayload({
        institutionId,
        version:
          3,
        revokedIndices,
        issuedAt,
        nextUpdate,
      });

    if (
      typeof transformPayload ===
      "function"
    ) {
      payload =
        transformPayload(
          payload
        );
    }

    const signed =
      await signCredentialPayload({
        payload,
        signer:
          wallet,
        expectedIssuerWallet:
          wallet.address,
      });

    return {
      wallet,
      payload,
      signed,
    };
  };

test(
  "status freshness defaults to 24 hours",
  () => {
    const times =
      buildStatusTimes({
        now:
          new Date(
            "2026-09-18T10:00:00.000Z"
          ),
      });

    assert.equal(
      times.issuedAt,
      "2026-09-18T10:00:00.000Z"
    );

    assert.equal(
      times.nextUpdate,
      "2026-09-19T10:00:00.000Z"
    );
  }
);

test(
  "fresh signed active status is accepted",
  async () => {
    const {
      wallet,
      payload,
      signed,
    } =
      await buildSignedStatus();

    const result =
      verifyStatusListArtifact({
        payload,

        signature:
          signed.proof
            .signature,

        expectedInstitutionWallet:
          wallet.address,

        expectedInstitutionId:
          INSTITUTION_ID,

        statusListIndex:
          12,

        now:
          new Date(
            "2026-09-18T15:00:00.000Z"
          ),
      });

    assert.equal(
      result.signatureValid,
      true
    );

    assert.equal(
      result.fresh,
      true
    );

    assert.equal(
      result.revoked,
      false
    );
  }
);

test(
  "revoked status-list index is detected",
  async () => {
    const {
      wallet,
      payload,
      signed,
    } =
      await buildSignedStatus({
        revokedIndices: [
          4,
          12,
          50,
        ],
      });

    const result =
      verifyStatusListArtifact({
        payload,

        signature:
          signed.proof
            .signature,

        expectedInstitutionWallet:
          wallet.address,

        expectedInstitutionId:
          INSTITUTION_ID,

        statusListIndex:
          12,

        now:
          new Date(
            "2026-09-18T15:00:00.000Z"
          ),
      });

    assert.equal(
      result.signatureValid,
      true
    );

    assert.equal(
      result.fresh,
      true
    );

    assert.equal(
      result.revoked,
      true
    );
  }
);

test(
  "status older than freshness boundary is stale",
  async () => {
    const {
      wallet,
      payload,
      signed,
    } =
      await buildSignedStatus();

    const result =
      verifyStatusListArtifact({
        payload,

        signature:
          signed.proof
            .signature,

        expectedInstitutionWallet:
          wallet.address,

        expectedInstitutionId:
          INSTITUTION_ID,

        statusListIndex:
          12,

        now:
          new Date(
            "2026-09-19T10:00:01.000Z"
          ),
      });

    assert.equal(
      result.signatureValid,
      true
    );

    assert.equal(
      result.fresh,
      false
    );

    assert.equal(
      result.revoked,
      null
    );
  }
);

test(
  "far-future validUntil cannot extend freshness beyond 24 hours",
  async () => {
    const {
      wallet,
      payload,
      signed,
    } =
      await buildSignedStatus({
        issuedAt:
          "2026-09-18T10:00:00.000Z",

        nextUpdate:
          "2026-09-25T10:00:00.000Z",
      });

    const result =
      verifyStatusListArtifact({
        payload,

        signature:
          signed.proof
            .signature,

        expectedInstitutionWallet:
          wallet.address,

        expectedInstitutionId:
          INSTITUTION_ID,

        statusListIndex:
          12,

        now:
          new Date(
            "2026-09-19T10:00:01.000Z"
          ),
      });

    assert.equal(
      result.signatureValid,
      true
    );

    assert.equal(
      result.fresh,
      false
    );

    assert.equal(
      result.revoked,
      null
    );
  }
);

test(
  "tampered status artefact fails signature validation",
  async () => {
    const {
      wallet,
      payload,
      signed,
    } =
      await buildSignedStatus();

    const tampered = {
      ...payload,

      credentialSubject: {
        ...payload
          .credentialSubject,

        revokedIndices: [
          12,
        ],
      },
    };

    const result =
      verifyStatusListArtifact({
        payload:
          tampered,

        signature:
          signed.proof
            .signature,

        expectedInstitutionWallet:
          wallet.address,

        expectedInstitutionId:
          INSTITUTION_ID,

        statusListIndex:
          12,

        now:
          new Date(
            "2026-09-18T15:00:00.000Z"
          ),
      });

    assert.equal(
      result.signatureValid,
      false
    );

    assert.equal(
      result.fresh,
      false
    );

    assert.equal(
      result.revoked,
      null
    );
  }
);

test(
  "status artefact signed by the wrong institution wallet is rejected",
  async () => {
    const {
      payload,
      signed,
    } =
      await buildSignedStatus();

    const differentWallet =
      Wallet.createRandom();

    const result =
      verifyStatusListArtifact({
        payload,

        signature:
          signed.proof
            .signature,

        expectedInstitutionWallet:
          differentWallet.address,

        expectedInstitutionId:
          INSTITUTION_ID,

        statusListIndex:
          12,

        now:
          new Date(
            "2026-09-18T15:00:00.000Z"
          ),
      });

    assert.equal(
      result.signatureValid,
      false
    );

    assert.equal(
      result.fresh,
      false
    );

    assert.equal(
      result.revoked,
      null
    );
  }
);

test(
  "status artefact bound to another institution is not accepted as fresh",
  async () => {
    const {
      wallet,
      payload,
      signed,
    } =
      await buildSignedStatus();

    const result =
      verifyStatusListArtifact({
        payload,

        signature:
          signed.proof
            .signature,

        expectedInstitutionWallet:
          wallet.address,

        expectedInstitutionId:
          OTHER_INSTITUTION_ID,

        statusListIndex:
          12,

        now:
          new Date(
            "2026-09-18T15:00:00.000Z"
          ),
      });

    assert.equal(
      result.signatureValid,
      true
    );

    assert.equal(
      result.fresh,
      false
    );

    assert.equal(
      result.revoked,
      null
    );
  }
);

test(
  "validly signed malformed status schema is rejected as non-fresh",
  async () => {
    const {
      wallet,
      payload,
      signed,
    } =
      await buildSignedStatus({
        transformPayload:
          (
            original
          ) => ({
            ...original,

            credentialSubject: {
              ...original
                .credentialSubject,

              statusPurpose:
                "suspension",
            },
          }),
      });

    const result =
      verifyStatusListArtifact({
        payload,

        signature:
          signed.proof
            .signature,

        expectedInstitutionWallet:
          wallet.address,

        expectedInstitutionId:
          INSTITUTION_ID,

        statusListIndex:
          12,

        now:
          new Date(
            "2026-09-18T15:00:00.000Z"
          ),
      });

    assert.equal(
      result.signatureValid,
      true
    );

    assert.equal(
      result.fresh,
      false
    );

    assert.equal(
      result.revoked,
      null
    );
  }
);