const test =
  require("node:test");

const assert =
  require(
    "node:assert/strict"
  );

const ORIGINAL_ID =
  "11111111-1111-4111-8111-111111111111";

const REPLACEMENT_ID =
  "22222222-2222-4222-8222-222222222222";

const loadController =
  (
    overrides = {}
  ) => {
    const paths = {
      controller:
        require.resolve(
          "../backend/controllers/credentialLifecycleController"
        ),

      credential:
        require.resolve(
          "../backend/models/credentialModel"
        ),

      institution:
        require.resolve(
          "../backend/models/institutionModel"
        ),

      statusPublisher:
        require.resolve(
          "../backend/services/statusListPublisherService"
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
      supersedeCalls:
        [],

      statusCalls:
        [],

      audits:
        [],
    };

    const original = {
      id:
        ORIGINAL_ID,

      institution_id:
        "inst-1",

      student_id:
        "student-1",

      qualification:
        "BSc Computer Systems Engineering",

      issue_date:
        "2026-08-10",

      award_date:
        "2026-07-31",

      status:
        "active",

      proof_version:
        "structured-v2",

      status_list_index:
        12,

      ...overrides
        .original,
    };

    const replacement = {
      id:
        REPLACEMENT_ID,

      institution_id:
        "inst-1",

      student_id:
        "student-1",

      qualification:
        "BSc Computer Systems Engineering",

      issue_date:
        "2026-09-01",

      award_date:
        "2026-07-31",

      status:
        "active",

      ...overrides
        .replacement,
    };

    const credentialModel = {
      getCredentialById:
        async (id) => {
          if (
            id ===
            ORIGINAL_ID
          ) {
            return original;
          }

          if (
            id ===
            REPLACEMENT_ID
          ) {
            return replacement;
          }

          return null;
        },

      markCredentialSuperseded:
        async (
          id,
          data
        ) => {
          state
            .supersedeCalls
            .push({
              id,
              ...data,
            });

          return {
            ...original,

            status:
              "superseded",

            superseded_by:
              data
                .replacementCredentialId,

            supersession_reason:
              data.reason,
          };
        },

      ...overrides
        .credentialModel,
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

      exports: {
        getInstitutionById:
          async () => ({
            id:
              "inst-1",

            status:
              true,

            wallet_address:
              "0x1111111111111111111111111111111111111111",
          }),
      },
    };

    require.cache[
      paths.statusPublisher
    ] = {
      id:
        paths.statusPublisher,

      filename:
        paths.statusPublisher,

      loaded:
        true,

      exports: {
        publishStatusListForInstitution:
          async (
            input
          ) => {
            state
              .statusCalls
              .push(
                input
              );

            return {
              version:
                5,

              commitment:
                "a".repeat(
                  64
                ),

              blockchain_tx:
                "0xtest",
            };
          },
      },
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
            state
              .audits
              .push(
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
    };
  };

const invoke =
  async (
    controller,
    {
      role =
        "institution_admin",

      institutionId =
        "inst-1",

      replacementCredentialId =
        REPLACEMENT_ID,

      reason =
        "Correction of credential details",
    } = {}
  ) => {
    const req = {
      params: {
        id:
          ORIGINAL_ID,
      },

      body: {
        replacementCredentialId,
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
      .supersedeCredential(
        req,
        res
      );

    return response;
  };

test(
  "active credential can be superseded by an active replacement for the same student",
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
      state
        .supersedeCalls
        .length,
      1
    );

    assert.equal(
      state
        .supersedeCalls[0]
        .replacementCredentialId,
      REPLACEMENT_ID
    );

    assert.equal(
      state
        .statusCalls
        .length,
      1
    );

    assert.equal(
      state
        .statusCalls[0]
        .revokeIndex,
      12
    );

    assert.equal(
      response.body
        .credential
        .status,
      "superseded"
    );
  }
);

test(
  "institution user cannot supersede another institution credential",
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
      state
        .supersedeCalls
        .length,
      0
    );
  }
);

test(
  "replacement must belong to the same student",
  async () => {
    const {
      controller,
      state,
    } =
      loadController({
        replacement: {
          student_id:
            "student-2",
        },
      });

    const response =
      await invoke(
        controller
      );

    assert.equal(
      response.statusCode,
      422
    );

    assert.equal(
      state
        .supersedeCalls
        .length,
      0
    );
  }
);

test(
  "replacement must be active",
  async () => {
    const {
      controller,
      state,
    } =
      loadController({
        replacement: {
          status:
            "revoked",
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
      state
        .supersedeCalls
        .length,
      0
    );
  }
);

test(
  "credential cannot supersede itself",
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
          replacementCredentialId:
            ORIGINAL_ID,
        }
      );

    assert.equal(
      response.statusCode,
      400
    );

    assert.equal(
      state
        .supersedeCalls
        .length,
      0
    );
  }
);
