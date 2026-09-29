const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const controllerPath = require.resolve(
  "../backend/controllers/institutionController"
);
const institutionModelPath = require.resolve(
  "../backend/models/institutionModel"
);
const blockchainServicePath = require.resolve(
  "../backend/services/blockchainService"
);
const auditModelPath = require.resolve(
  "../backend/models/auditModel"
);

const INSTITUTION_ID =
  "11111111-1111-4111-8111-111111111111";

const WALLET =
  "0x1111111111111111111111111111111111111111";

function installMock(path, exports) {
  require.cache[path] = {
    id: path,
    filename: path,
    loaded: true,
    exports,
  };
}

function clearMocks() {
  delete require.cache[controllerPath];
  delete require.cache[institutionModelPath];
  delete require.cache[blockchainServicePath];
  delete require.cache[auditModelPath];
}

function loadController({
  institution = {
    id: INSTITUTION_ID,
    name: "Test University",
    status: true,
    wallet_address: WALLET,
  },
  authorised = true,
} = {}) {
  clearMocks();

  const state = {
    blockchainChecks: [],
  };

  installMock(institutionModelPath, {
    createInstitution: async () => ({}),
    getAllInstitutions: async () => [],
    getInstitutionById: async (id) =>
      institution && id === INSTITUTION_ID
        ? institution
        : null,
    updateInstitutionStatus: async () => ({}),
  });

  installMock(blockchainServicePath, {
    authoriseInstitution: async () => ({}),
    deactivateInstitution: async () => ({}),

    isInstitutionAuthorised: async (walletAddress) => {
      state.blockchainChecks.push(walletAddress);
      return authorised;
    },
  });

  installMock(auditModelPath, {
    createAuditLog: async () => ({}),
  });

  return {
    controller: require(controllerPath),
    state,
  };
}

async function invoke(
  handler,
  {
    id = INSTITUTION_ID,
    role = "super_admin",
  } = {}
) {
  const output = {};

  const req = {
    params: {
      id,
    },

    user: {
      userId:
        "22222222-2222-4222-8222-222222222222",
      role,
      institutionId: null,
    },

    ip: "127.0.0.1",
    get: () => "test",
  };

  const res = {
    status(code) {
      output.status = code;
      return this;
    },

    json(body) {
      output.body = body;

      if (!output.status) {
        output.status = 200;
      }

      return this;
    },
  };

  await handler(req, res);

  return output;
}

test(
  "blockchain status returns authoritative on-chain state",
  async () => {
    const {
      controller,
      state,
    } = loadController({
      authorised: true,
    });

    try {
      const result =
        await invoke(
          controller.blockchainStatus
        );

      assert.equal(
        result.status,
        200
      );

      assert.deepEqual(
        result.body,
        {
          success: true,
          institutionId:
            INSTITUTION_ID,
          walletAddress:
            WALLET,
          authorised: true,
        }
      );

      assert.deepEqual(
        state.blockchainChecks,
        [
          WALLET,
        ]
      );
    } finally {
      clearMocks();
    }
  }
);

test(
  "blockchain status preserves a false on-chain authorisation result",
  async () => {
    const {
      controller,
    } = loadController({
      authorised: false,
    });

    try {
      const result =
        await invoke(
          controller.blockchainStatus
        );

      assert.equal(
        result.status,
        200
      );

      assert.equal(
        result.body.authorised,
        false
      );
    } finally {
      clearMocks();
    }
  }
);

test(
  "unknown institution returns 404 without querying blockchain",
  async () => {
    const {
      controller,
      state,
    } = loadController({
      institution: null,
    });

    try {
      const result =
        await invoke(
          controller.blockchainStatus
        );

      assert.equal(
        result.status,
        404
      );

      assert.equal(
        result.body.success,
        false
      );

      assert.equal(
        state.blockchainChecks.length,
        0
      );
    } finally {
      clearMocks();
    }
  }
);

test(
  "blockchain status route is restricted to super administrators",
  () => {
    const source =
      fs.readFileSync(
        require.resolve(
          "../backend/routes/institutionRoutes"
        ),
        "utf8"
      );

    assert.match(
      source,
      /router\.get\(\s*["']\/:id\/blockchain\/status["']\s*,\s*authorizeRoles\(\s*["']super_admin["']\s*\)/s
    );
  }
);

test(
  "regulator is denied by the super-admin role guard",
  () => {
    const {
      authorizeRoles,
    } = require(
      "../backend/middleware/authMiddleware"
    );

    const output = {};
    let nextCalled = false;

    const req = {
      user: {
        userId:
          "33333333-3333-4333-8333-333333333333",
        role: "regulator",
        institutionId: null,
      },

      requestId: "test-request",
      correlationId:
        "test-correlation",
      path:
        `/${INSTITUTION_ID}/blockchain/status`,
    };

    const res = {
      status(code) {
        output.status = code;
        return this;
      },

      json(body) {
        output.body = body;
        return this;
      },
    };

    authorizeRoles(
      "super_admin"
    )(
      req,
      res,
      () => {
        nextCalled = true;
      }
    );

    assert.equal(
      nextCalled,
      false
    );

    assert.equal(
      output.status,
      403
    );

    assert.equal(
      output.body.code,
      "ACCESS_DENIED"
    );
  }
);