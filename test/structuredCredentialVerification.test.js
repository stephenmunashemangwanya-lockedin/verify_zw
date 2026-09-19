const test =
  require("node:test");

const assert =
  require(
    "node:assert/strict"
  );

const {
  Wallet,
} = require("ethers");

const {
  buildStructuredCredentialPayload,
} = require(
  "../backend/services/structuredCredentialService"
);

const {
  buildStatusListPayload,
} = require(
  "../backend/services/statusListService"
);

const {
  signCredentialPayload,
} = require(
  "../backend/services/credentialProofService"
);

const HASH =
  "ab".repeat(32);

const INSTITUTION_ID =
  "22222222-2222-4222-8222-222222222222";

const makeCredential =
  async ({
    revokedIndices = [],
    statusIssuedAt =
      "2026-09-19T08:00:00.000Z",
    statusNextUpdate =
      "2026-09-20T08:00:00.000Z",
  } = {}) => {
    const wallet =
      Wallet.createRandom();

    const payload =
      buildStructuredCredentialPayload({
        credentialId:
          "11111111-1111-4111-8111-111111111111",

        institutionId:
          INSTITUTION_ID,

        studentId:
          "33333333-3333-4333-8333-333333333333",

        studentNumber:
          "VZW-STU-001",

        qualification:
          "BSc Computer Systems Engineering",

        programme:
          "BSc Computer Systems Engineering",

        awardDate:
          "2026-07-31",

        issueDate:
          "2026-08-10",

        statusListIndex:
          12,
      });

    const signed =
      await signCredentialPayload({
        payload,
        signer:
          wallet,

        expectedIssuerWallet:
          wallet.address,
      });

    const statusPayload =
      buildStatusListPayload({
        institutionId:
          INSTITUTION_ID,

        version:
          1,

        revokedIndices,

        issuedAt:
          statusIssuedAt,

        nextUpdate:
          statusNextUpdate,
      });

    const signedStatus =
      await signCredentialPayload({
        payload:
          statusPayload,

        signer:
          wallet,

        expectedIssuerWallet:
          wallet.address,
      });

    return {
      wallet,

      statusList: {
        id:
          "44444444-4444-4444-8444-444444444444",

        institution_id:
          INSTITUTION_ID,

        version:
          1,

        revoked_indices:
          revokedIndices,

        issued_at:
          statusIssuedAt,

        next_update:
          statusNextUpdate,

        payload:
          statusPayload,

        signature:
          signedStatus
            .proof
            .signature,

        issuer_wallet:
          wallet.address,

        commitment:
          signedStatus
            .commitmentHash,
      },

      credential: {
        id:
          "11111111-1111-4111-8111-111111111111",

        student_id:
          "33333333-3333-4333-8333-333333333333",

        institution_id:
          INSTITUTION_ID,

        certificate_hash:
          HASH,

        credential_payload:
          payload,

        credential_commitment:
          signed
            .commitmentHash,

        issuer_signature:
          signed
            .proof
            .signature,

        issuer_wallet:
          wallet.address,

        institution_wallet:
          wallet.address,

        proof_type:
          signed
            .proof
            .type,

        proof_canonicalisation:
          "RFC8785",

        proof_hash_algorithm:
          "SHA-256",

        proof_version:
          "structured-v2",

        status_list_index:
          12,

        qualification:
          "BSc Computer Systems Engineering",

        issue_date:
          "2026-08-10",

        award_date:
          "2026-07-31",

        ipfs_cid:
          "QmYwAPJzv5CZsnAzt8auVZRnGNiT1U6d1pXCVQaWnLYPJe",

        blockchain_tx:
          `0x${"1".repeat(
            64
          )}`,

        blockchain_network:
          "hardhat",

        contract_address:
          "0x0000000000000000000000000000000000000001",

        block_number:
          10,

        status:
          "active",

        student_number:
          "VZW-STU-001",

        student_name:
          "Test Student",

        programme:
          "BSc Computer Systems Engineering",

        institution_name:
          "Test University",
      },
    };
  };

const loadService =
  ({
    blockchain,
    statusList,
    accreditation = {
      id:
        "55555555-5555-4555-8555-555555555555",

      programme:
        "BSc Computer Systems Engineering",

      valid_from:
        "2025-01-01",

      valid_to:
        "2027-12-31",

      source_label:
        "SIMULATED_REGULATOR",
    },
  }) => {
    const blockchainPath =
      require.resolve(
        "../backend/services/blockchainService"
      );

    const ipfsPath =
      require.resolve(
        "../backend/services/ipfsService"
      );

    const accreditationPath =
      require.resolve(
        "../backend/models/accreditationModel"
      );

    const statusListModelPath =
      require.resolve(
        "../backend/models/statusListModel"
      );

    const servicePath =
      require.resolve(
        "../backend/services/verificationService"
      );

    require.cache[
      blockchainPath
    ] = {
      id:
        blockchainPath,

      filename:
        blockchainPath,

      loaded:
        true,

      exports: {
        verifyCredentialOnChain:
          async () =>
            blockchain,
      },
    };

    require.cache[
      ipfsPath
    ] = {
      id:
        ipfsPath,

      filename:
        ipfsPath,

      loaded:
        true,

      exports: {
        checkPinStatus:
          async () =>
            true,
      },
    };

    require.cache[
      accreditationPath
    ] = {
      id:
        accreditationPath,

      filename:
        accreditationPath,

      loaded:
        true,

      exports: {
        findEffectiveAccreditation:
          async () =>
            accreditation,
      },
    };

    require.cache[
      statusListModelPath
    ] = {
      id:
        statusListModelPath,

      filename:
        statusListModelPath,

      loaded:
        true,

      exports: {
        getLatestStatusList:
          async () =>
            statusList,
      },
    };

    delete require.cache[
      servicePath
    ];

    return require(
      servicePath
    );
  };

test(
  "signed structured credential with matching anchor and fresh status is VERIFIED",
  async () => {
    const {
      wallet,
      credential,
      statusList,
    } =
      await makeCredential();

    const {
      verifyCredentialState,
    } =
      loadService({
        statusList,

        blockchain: {
          exists:
            true,

          revoked:
            false,

          issuer:
            wallet.address,
        },
      });

    const result =
      await verifyCredentialState({
        credential,

        certificateHash:
          HASH,

        verificationTime:
          new Date(
            "2026-09-19T12:00:00.000Z"
          ),
      });

    assert.equal(
      result.result,
      "VERIFIED"
    );

    assert.equal(
      result.proof
        .signatureValid,
      true
    );

    assert.equal(
      result.blockchain
        .anchorMatch,
      true
    );

    assert.equal(
      result.lifecycle
        .fresh,
      true
    );

    assert.equal(
      result.accreditation
        .validAtAwardDate,
      true
    );
  }
);

test(
  "modified structured credential fails issuer signature validation",
  async () => {
    const {
      wallet,
      credential,
      statusList,
    } =
      await makeCredential();

    credential
      .credential_payload = {
      ...credential
        .credential_payload,

      credentialSubject: {
        ...credential
          .credential_payload
          .credentialSubject,

        qualification:
          "Modified qualification",
      },
    };

    const {
      verifyCredentialState,
    } =
      loadService({
        statusList,

        blockchain: {
          exists:
            false,

          revoked:
            false,

          issuer:
            wallet.address,
        },
      });

    const result =
      await verifyCredentialState({
        credential,

        certificateHash:
          HASH,

        verificationTime:
          new Date(
            "2026-09-19T12:00:00.000Z"
          ),
      });

    assert.equal(
      result.result,
      "SIGNATURE_INVALID"
    );
  }
);

test(
  "valid signature without matching blockchain commitment is ANCHOR_MISMATCH",
  async () => {
    const {
      wallet,
      credential,
      statusList,
    } =
      await makeCredential();

    const {
      verifyCredentialState,
    } =
      loadService({
        statusList,

        blockchain: {
          exists:
            false,

          revoked:
            false,

          issuer:
            wallet.address,
        },
      });

    const result =
      await verifyCredentialState({
        credential,

        certificateHash:
          HASH,

        verificationTime:
          new Date(
            "2026-09-19T12:00:00.000Z"
          ),
      });

    assert.equal(
      result.result,
      "ANCHOR_MISMATCH"
    );
  }
);

test(
  "stale signed status returns STATUS_INDETERMINATE",
  async () => {
    const {
      wallet,
      credential,
      statusList,
    } =
      await makeCredential({
        statusNextUpdate:
          "2026-09-19T10:00:00.000Z",
      });

    const {
      verifyCredentialState,
    } =
      loadService({
        statusList,

        blockchain: {
          exists:
            true,

          revoked:
            false,

          issuer:
            wallet.address,
        },
      });

    const result =
      await verifyCredentialState({
        credential,

        certificateHash:
          HASH,

        verificationTime:
          new Date(
            "2026-09-19T12:00:00.000Z"
          ),
      });

    assert.equal(
      result.result,
      "STATUS_INDETERMINATE"
    );

    assert.equal(
      result.lifecycle
        .fresh,
      false
    );
  }
);

test(
  "fresh signed status-list revocation returns REVOKED",
  async () => {
    const {
      wallet,
      credential,
      statusList,
    } =
      await makeCredential({
        revokedIndices: [
          12,
        ],
      });

    const {
      verifyCredentialState,
    } =
      loadService({
        statusList,

        blockchain: {
          exists:
            true,

          revoked:
            false,

          issuer:
            wallet.address,
        },
      });

    const result =
      await verifyCredentialState({
        credential,

        certificateHash:
          HASH,

        verificationTime:
          new Date(
            "2026-09-19T12:00:00.000Z"
          ),
      });

    assert.equal(
      result.result,
      "REVOKED"
    );

    assert.equal(
      result.lifecycle
        .revoked,
      true
    );
  }
);