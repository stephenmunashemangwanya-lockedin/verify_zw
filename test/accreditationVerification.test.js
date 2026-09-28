const test =
  require("node:test");

const assert =
  require(
    "node:assert/strict"
  );

const HASH =
  "ab".repeat(32);

const { Wallet } = require("ethers");
const { buildStructuredCredentialPayload } = require("../backend/services/structuredCredentialService");
const { buildStatusListPayload } = require("../backend/services/statusListService");
const { signCredentialPayload } = require("../backend/services/credentialProofService");
const verificationTime = new Date("2026-09-22T12:00:00.000Z");
let statusList;

const baseCredential = {
  id:
    "11111111-1111-4111-8111-111111111111",

  institution_id:
    "22222222-2222-4222-8222-222222222222",

  certificate_hash:
    HASH,

  qualification:
    "Bachelor of Science",

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
    "R227678G",

  student_name:
    "Test Student",

  programme:
    "BSc Computer Systems Engineering",

  institution_name:
    "Test University",
};

test.before(async () => {
  const wallet = Wallet.createRandom();
  baseCredential.student_id = "66666666-6666-4666-8666-666666666666";
  baseCredential.status_list_index = 0;
  const payload = buildStructuredCredentialPayload({
    credentialId: baseCredential.id,
    institutionId: baseCredential.institution_id,
    studentId: baseCredential.student_id,
    studentNumber: baseCredential.student_number,
    qualification: baseCredential.qualification,
    programme: baseCredential.programme,
    awardDate: baseCredential.award_date,
    issueDate: baseCredential.issue_date,
    statusListIndex: 0,
  });
  const signed = await signCredentialPayload({ payload, signer: wallet, expectedIssuerWallet: wallet.address });
  Object.assign(baseCredential, {
    proof_version: "structured-v2", credential_payload: payload,
    credential_commitment: signed.commitmentHash,
    issuer_signature: signed.proof.signature,
    issuer_wallet: wallet.address, institution_wallet: wallet.address,
  });
  const statusPayload = buildStatusListPayload({
    institutionId: baseCredential.institution_id, version: 1, revokedIndices: [],
    issuedAt: "2026-09-22T08:00:00.000Z", nextUpdate: "2026-09-23T08:00:00.000Z",
  });
  const signedStatus = await signCredentialPayload({ payload: statusPayload, signer: wallet, expectedIssuerWallet: wallet.address });
  statusList = { payload: statusPayload, signature: signedStatus.proof.signature, commitment: signedStatus.commitmentHash, version: 1 };
});

const loadService = ({
  accreditation = {
    id:
      "33333333-3333-4333-8333-333333333333",

    programme:
      "BSc Computer Systems Engineering",

    valid_from:
      "2025-01-01",

    valid_to:
      "2027-12-31",

    source_label:
      "SIMULATED_REGULATOR",
  },

  blockchain = {
    exists: true,
    revoked: false,
    issuer: baseCredential.issuer_wallet,
  },

  pinned = true,
} = {}) => {
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
          pinned,
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

  delete require.cache[
    servicePath
  ];

  const statusPath = require.resolve("../backend/models/statusListModel");
  require.cache[statusPath] = {
    id: statusPath, filename: statusPath, loaded: true,
    exports: { getLatestStatusList: async () => statusList },
  };

  return require(
    servicePath
  );
};

test(
  "active credential with accreditation valid at award date is VERIFIED",
  async () => {
    const {
      verifyCredentialState,
    } = loadService();

    const result =
      await verifyCredentialState({
        verificationTime,
        credential:
          baseCredential,

        certificateHash:
          HASH,
      });

    assert.equal(
      result.result,
      "VERIFIED"
    );

    assert.equal(
      result.accreditation
        .checked,
      true
    );

    assert.equal(
      result.accreditation
        .validAtAwardDate,
      true
    );

    assert.equal(
      result.credential
        .awardDate,
      "2026-07-31"
    );
  }
);

test(
  "active credential without effective accreditation is ACCREDITATION_INVALID",
  async () => {
    const {
      verifyCredentialState,
    } = loadService({
      accreditation:
        null,
    });

    const result =
      await verifyCredentialState({
        verificationTime,
        credential:
          baseCredential,

        certificateHash:
          HASH,
      });

    assert.equal(
      result.result,
      "ACCREDITATION_INVALID"
    );

    assert.equal(
      result.accreditation
        .checked,
      true
    );

    assert.equal(
      result.accreditation
        .validAtAwardDate,
      false
    );
  }
);

test(
  "superseded credential returns SUPERSEDED",
  async () => {
    const {
      verifyCredentialState,
    } = loadService();

    const result =
      await verifyCredentialState({
        verificationTime,
        credential: {
          ...baseCredential,

          status:
            "superseded",

          superseded_by:
            "44444444-4444-4444-8444-444444444444",

          superseded_at:
            "2026-09-01T10:00:00.000Z",

          supersession_reason:
            "Corrected award details",
        },

        certificateHash:
          HASH,
      });

    assert.equal(
      result.result,
      "SUPERSEDED"
    );

    assert.equal(
      result.credential
        .supersededBy,
      "44444444-4444-4444-8444-444444444444"
    );
  }
);
