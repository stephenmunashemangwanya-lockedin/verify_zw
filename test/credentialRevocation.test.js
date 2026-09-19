const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const ID =
  "11111111-1111-4111-8111-111111111111";

const HASH =
  "a".repeat(64);

const INSTITUTION_WALLET =
  "0x1111111111111111111111111111111111111111";

const loadController = (
  overrides = {}
) => {
  const paths = {
    controller:
      require.resolve(
        "../backend/controllers/credentialController"
      ),

    credential:
      require.resolve(
        "../backend/models/credentialModel"
      ),

    institution:
      require.resolve(
        "../backend/models/institutionModel"
      ),

    blockchain:
      require.resolve(
        "../backend/services/blockchainService"
      ),

    audit:
      require.resolve(
        "../backend/models/auditModel"
      ),
  };

  Object.values(
    paths
  ).forEach(
    (path) =>
      delete require.cache[
        path
      ]
  );

  const state = {
    updates: [],
    audits: [],
    chainCalls: 0,
    institutionCalls: 0,
  };

  const credential =
    overrides.credential ===
    undefined
      ? {
          id: ID,
          institution_id:
            "inst-1",
          certificate_hash:
            HASH,
          credential_commitment:
            null,
          proof_version:
            "legacy-v1",
          status:
            "active",
        }
      : overrides.credential;

  const institution =
    overrides.institution ===
    undefined
      ? {
          id:
            "inst-1",

          name:
            "Test Institution",

          status:
            true,

          wallet_address:
            INSTITUTION_WALLET,
        }
      : overrides.institution;

  const credentialModel = {
    createCredential:
      async () => {},

    createProcessingCredential:
      async () => {},

    setCredentialStructuredProof:
      async () => {},

    updateCredentialIpfsData:
      async () => {},

    markCredentialFailed:
      async () => {},

    activateCredential:
      async () => {},

    getAllCredentials:
      async () => [],

    getCredentialsByInstitution:
      async () => [],

    getCredentialsByStudent:
      async () => ({
        rows: [],
        total: 0,
      }),

    findCredentialByHash:
      async () => null,

    getCredentialById:
      async () =>
        credential,

    markCredentialRevoked:
      async (
        id,
        data
      ) => {
        state.updates.push({
          id,
          ...data,
        });

        return {
          ...credential,
          ...data,
          status:
            "revoked",
        };
      },

    ...overrides
      .credentialModel,
  };

  const institutionModel = {
    getInstitutionById:
      async (id) => {
        state.institutionCalls +=
          1;

        if (
          !institution ||
          institution.id !==
            id
        ) {
          return null;
        }

        return institution;
      },

    ...overrides
      .institutionModel,
  };

  const blockchain = {
    issueCredentialOnChain:
      async () => {},

    revokeCredentialOnChain:
      async (
        hash,
        options
      ) => {
        state.chainCalls +=
          1;

        assert.equal(
          hash,
          credential
            ?.proof_version ===
            "structured-v2" &&
            credential
              ?.credential_commitment
            ? credential
                .credential_commitment
            : credential
                ?.certificate_hash
        );

        assert.equal(
          options
            .expectedInstitutionWallet,
          INSTITUTION_WALLET
        );

        await options.onSubmitted({
          transactionHash:
            "0xsubmitted",
        });

        return {
          transactionHash:
            "0xconfirmed",

          confirmed:
            true,

          blockNumber:
            9,
        };
      },

    ...overrides
      .blockchain,
  };

  require.cache[
    paths.credential
  ] = {
    id:
      paths.credential,

    filename:
      paths.credential,

    loaded:
      true,

    exports:
      credentialModel,
  };

  require.cache[
    paths.institution
  ] = {
    id:
      paths.institution,

    filename:
      paths.institution,

    loaded:
      true,

    exports:
      institutionModel,
  };

  require.cache[
    paths.blockchain
  ] = {
    id:
      paths.blockchain,

    filename:
      paths.blockchain,

    loaded:
      true,

    exports:
      blockchain,
  };

  require.cache[
    paths.audit
  ] = {
    id:
      paths.audit,

    filename:
      paths.audit,

    loaded:
      true,

    exports: {
      createAuditLog:
        async (
          entry
        ) => {
          state.audits.push(
            entry
          );
        },
    },
  };

  const controller =
    require(
      paths.controller
    );

  return {
    controller,
    state,
    paths,
  };
};

const invoke =
  async (
    controller,
    {
      id = ID,
      reason =
        "Academic misconduct",
      role =
        "institution_admin",
      institutionId =
        "inst-1",
    } = {}
  ) => {
    const req = {
      params: {
        id,
      },

      body: {
        reason,
      },

      user: {
        userId:
          "user-1",

        role,

        institutionId,
      },

      ip:
        "127.0.0.1",

      get:
        () =>
          "test-agent",
    };

    const response = {
      statusCode:
        200,

      body:
        null,
    };

    const res = {
      status(code) {
        response.statusCode =
          code;

        return this;
      },

      json(body) {
        response.body =
          body;

        return this;
      },
    };

    await controller
      .revokeCredential(
        req,
        res
      );

    return response;
  };

test.afterEach(() => {
  for (
    const file
    of [
      "../backend/controllers/credentialController",
      "../backend/models/credentialModel",
      "../backend/models/institutionModel",
      "../backend/services/blockchainService",
      "../backend/models/auditModel",
    ]
  ) {
    delete require.cache[
      require.resolve(
        file
      )
    ];
  }
});

test(
  "confirmed blockchain revocation is persisted and audited",
  async () => {
    const {
      controller,
      state,
    } =
      loadController();

    const response =
      await invoke(
        controller
      );

    assert.equal(
      response.statusCode,
      200
    );

    assert.equal(
      state.updates.length,
      1
    );

    assert.equal(
      state
        .updates[0]
        .transactionHash,
      "0xconfirmed"
    );

    assert.equal(
      state.chainCalls,
      1
    );

    assert.equal(
      state
        .institutionCalls,
      1
    );

    assert.deepEqual(
      state.audits.map(
        (
          entry
        ) =>
          entry.action
      ),
      [
        "credential_revocation_submitted",
        "CREDENTIAL_REVOKED",
      ]
    );
  }
);

test(
  "institution administrator cannot revoke another institution credential",
  async () => {
    const {
      controller,
      state,
    } =
      loadController();

    const response =
      await invoke(
        controller,
        {
          institutionId:
            "inst-2",
        }
      );

    assert.equal(
      response.statusCode,
      403
    );

    assert.equal(
      state.chainCalls,
      0
    );

    assert.equal(
      state.updates.length,
      0
    );

    assert.equal(
      state
        .institutionCalls,
      0
    );
  }
);

test(
  "super administrator may revoke across institutions",
  async () => {
    const {
      controller,
      state,
    } =
      loadController();

    const response =
      await invoke(
        controller,
        {
          role:
            "super_admin",

          institutionId:
            null,
        }
      );

    assert.equal(
      response.statusCode,
      200
    );

    assert.equal(
      state.updates.length,
      1
    );

    assert.equal(
      state.chainCalls,
      1
    );
  }
);

test(
  "non-active credential is rejected before blockchain mutation",
  async () => {
    const {
      controller,
      state,
    } =
      loadController({
        credential: {
          id:
            ID,

          institution_id:
            "inst-1",

          certificate_hash:
            HASH,

          credential_commitment:
            null,

          proof_version:
            "legacy-v1",

          status:
            "pending",
        },
      });

    const response =
      await invoke(
        controller
      );

    assert.equal(
      response.statusCode,
      409
    );

    assert.equal(
      state.chainCalls,
      0
    );

    assert.equal(
      state
        .institutionCalls,
      0
    );
  }
);

test(
  "blockchain failure leaves database unchanged and creates failure audit",
  async () => {
    const error =
      Object.assign(
        new Error(
          "offline"
        ),
        {
          code:
            "BLOCKCHAIN_UNAVAILABLE",

          statusCode:
            503,
        }
      );

    const {
      controller,
      state,
    } =
      loadController({
        blockchain: {
          revokeCredentialOnChain:
            async () => {
              throw error;
            },
        },
      });

    const response =
      await invoke(
        controller
      );

    assert.equal(
      response.statusCode,
      503
    );

    assert.equal(
      state.updates.length,
      0
    );

    assert.equal(
      state
        .audits.at(-1)
        .action,
      "credential_revocation_failed"
    );
  }
);

test(
  "database failure after confirmation creates reconciliation audit",
  async () => {
    const {
      controller,
      state,
    } =
      loadController({
        credentialModel: {
          markCredentialRevoked:
            async () => {
              throw new Error(
                "database unavailable"
              );
            },
        },
      });

    const response =
      await invoke(
        controller
      );

    assert.equal(
      response.statusCode,
      500
    );

    assert.equal(
      state
        .audits.at(-1)
        .action,
      "credential_revocation_reconciliation_required"
    );

    assert.equal(
      state
        .audits.at(-1)
        .details
        .transactionHash,
      "0xconfirmed"
    );
  }
);

test(
  "structured credential revocation uses canonical credential commitment",
  async () => {
    const commitment =
      "b".repeat(
        64
      );

    const {
      controller,
      state,
    } =
      loadController({
        credential: {
          id:
            ID,

          institution_id:
            "inst-1",

          certificate_hash:
            HASH,

          credential_commitment:
            commitment,

          proof_version:
            "structured-v2",

          status:
            "active",
        },

        blockchain: {
          revokeCredentialOnChain:
            async (
              hash,
              options
            ) => {
              state.chainCalls +=
                1;

              assert.equal(
                hash,
                commitment
              );

              assert.equal(
                options
                  .expectedInstitutionWallet,
                INSTITUTION_WALLET
              );

              await options
                .onSubmitted({
                  transactionHash:
                    "0xsubmitted",
                });

              return {
                transactionHash:
                  "0xconfirmed",

                confirmed:
                  true,

                blockNumber:
                  10,
              };
            },
        },
      });

    const response =
      await invoke(
        controller
      );

    assert.equal(
      response.statusCode,
      200
    );

    assert.equal(
      state.chainCalls,
      1
    );

    assert.equal(
      state.updates.length,
      1
    );
  }
);

test(
  "invalid ID and short reason are rejected",
  async () => {
    const first =
      loadController();

    assert.equal(
      (
        await invoke(
          first.controller,
          {
            id:
              "invalid",
          }
        )
      ).statusCode,
      400
    );

    const second =
      loadController();

    assert.equal(
      (
        await invoke(
          second.controller,
          {
            reason:
              "no",
          }
        )
      ).statusCode,
      400
    );

    assert.equal(
      second.state
        .chainCalls,
      0
    );
  }
);

test(
  "revocation route remains authentication protected",
  async () => {
    const router =
      require(
        "../backend/routes/credentialRoutes"
      );

    const layer =
      router.stack.find(
        (
          item
        ) =>
          item.route?.path ===
          "/:id/revoke"
      );

    assert.ok(
      layer
    );

    assert.equal(
      layer.route.methods
        .patch,
      true
    );

    const req = {
      headers: {},
    };

    const response = {
      statusCode:
        200,
    };

    const res = {
      status(code) {
        response.statusCode =
          code;

        return this;
      },

      json() {
        return this;
      },
    };

    await layer.route
      .stack[0]
      .handle(
        req,
        res,
        () => {}
      );

    assert.equal(
      response.statusCode,
      401
    );
  }
);