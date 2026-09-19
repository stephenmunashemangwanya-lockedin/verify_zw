const test =
  require("node:test");

const assert =
  require(
    "node:assert/strict"
  );

const {
  Wallet,
} = require(
  "ethers"
);

const loadPublisher =
  ({
    latest = null,
  } = {}) => {
    const modelPath =
      require.resolve(
        "../backend/models/statusListModel"
      );

    const blockchainPath =
      require.resolve(
        "../backend/services/blockchainService"
      );

    const servicePath =
      require.resolve(
        "../backend/services/statusListService"
      );

    const publisherPath =
      require.resolve(
        "../backend/services/statusListPublisherService"
      );

    for (
      const path
      of [
        modelPath,
        blockchainPath,
        servicePath,
        publisherPath,
      ]
    ) {
      delete require.cache[
        path
      ];
    }

    const state = {
      created:
        null,

      chainCalls:
        [],
    };

    require.cache[
      modelPath
    ] = {
      id:
        modelPath,

      filename:
        modelPath,

      loaded:
        true,

      exports: {
        getLatestStatusList:
          async () =>
            latest,

        createStatusList:
          async (
            input
          ) => {
            state.created =
              input;

            return {
              id:
                "status-list-1",

              ...input,
            };
          },
      },
    };

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
        issueCredentialOnChain:
          async (
            hash,
            options
          ) => {
            state.chainCalls.push({
              hash,
              options,
            });

            return {
              transactionHash:
                `0x${"1".repeat(
                  64
                )}`,

              network:
                "test",

              contractAddress:
                "0x1111111111111111111111111111111111111111",

              blockNumber:
                50,

              confirmed:
                true,
            };
          },
      },
    };

    const wallet =
      Wallet.createRandom();

    const realStatusService =
      require(
        servicePath
      );

    require.cache[
      servicePath
    ] = {
      id:
        servicePath,

      filename:
        servicePath,

      loaded:
        true,

      exports: {
        ...realStatusService,

        signStatusListPayload:
          async ({
            payload,
          }) => {
            const {
              signCredentialPayload,
            } =
              require(
                "../backend/services/credentialProofService"
              );

            return signCredentialPayload({
              payload,

              signer:
                wallet,

              expectedIssuerWallet:
                wallet.address,
            });
          },
      },
    };

    delete require.cache[
      publisherPath
    ];

    return {
      state,
      wallet,

      publishStatusListForInstitution:
        require(
          publisherPath
        )
          .publishStatusListForInstitution,
    };
  };

test(
  "publisher creates signs and anchors the first status-list version",
  async () => {
    const {
      state,
      wallet,
      publishStatusListForInstitution,
    } =
      loadPublisher();

    const result =
      await publishStatusListForInstitution({
        institutionId:
          "22222222-2222-4222-8222-222222222222",

        institutionWallet:
          wallet.address,

        now:
          new Date(
            "2026-09-19T08:00:00.000Z"
          ),
      });

    assert.equal(
      result.version,
      1
    );

    assert.deepEqual(
      state.created
        .revokedIndices,
      []
    );

    assert.equal(
      state.chainCalls.length,
      1
    );

    assert.equal(
      state.chainCalls[0]
        .hash,
      state.created
        .commitment
    );

    assert.equal(
      state.chainCalls[0]
        .options
        .expectedInstitutionWallet,
      wallet.address
    );

    assert.equal(
      state.created
        .blockchainResult
        .confirmed,
      true
    );

    assert.equal(
      state.created
        .nextUpdate,
      "2026-09-20T08:00:00.000Z"
    );
  }
);

test(
  "publisher preserves revoked indexes and anchors the new version",
  async () => {
    const {
      state,
      wallet,
      publishStatusListForInstitution,
    } =
      loadPublisher({
        latest: {
          version:
            4,

          revoked_indices: [
            3,
            8,
          ],
        },
      });

    const result =
      await publishStatusListForInstitution({
        institutionId:
          "22222222-2222-4222-8222-222222222222",

        institutionWallet:
          wallet.address,

        revokeIndex:
          12,

        now:
          new Date(
            "2026-09-19T08:00:00.000Z"
          ),
      });

    assert.equal(
      result.version,
      5
    );

    assert.deepEqual(
      state.created
        .revokedIndices,
      [
        3,
        8,
        12,
      ]
    );

    assert.equal(
      state.chainCalls.length,
      1
    );

    assert.equal(
      state.chainCalls[0]
        .hash,
      state.created
        .commitment
    );
  }
);