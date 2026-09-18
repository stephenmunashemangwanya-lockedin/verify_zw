const test =
  require("node:test");

const assert =
  require(
    "node:assert/strict"
  );

const HASH =
  "ab".repeat(32);

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