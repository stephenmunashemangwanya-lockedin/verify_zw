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

const buildSignedStatus =
  async ({
    revokedIndices = [],
    issuedAt =
      "2026-09-18T10:00:00.000Z",
    nextUpdate =
      "2026-09-19T10:00:00.000Z",
  } = {}) => {
    const wallet =
      Wallet.createRandom();

    const payload =
      buildStatusListPayload({
        institutionId:
          "22222222-2222-4222-8222-222222222222",

        version:
          3,

        revokedIndices,

        issuedAt,

        nextUpdate,
      });

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
  }
);
