const test =
  require("node:test");

const assert =
  require(
    "node:assert/strict"
  );

const fs =
  require("fs");

const os =
  require("os");

const path =
  require("path");

const STUDENT_ID =
  "11111111-1111-4111-8111-111111111111";

const INSTITUTION_ID =
  "22222222-2222-4222-8222-222222222222";

const loadMiddleware = ({
  student = {
    id:
      STUDENT_ID,

    institution_id:
      INSTITUTION_ID,

    programme:
      "BSc Computer Systems Engineering",
  },

  accreditation = {
    id:
      "33333333-3333-4333-8333-333333333333",

    institution_id:
      INSTITUTION_ID,

    programme:
      "BSc Computer Systems Engineering",

    valid_from:
      "2025-01-01",

    valid_to:
      "2027-12-31",

    status:
      "accredited",

    source_label:
      "SIMULATED_REGULATOR",
  },
} = {}) => {
  const studentPath =
    require.resolve(
      "../backend/models/studentModel"
    );

  const accreditationPath =
    require.resolve(
      "../backend/models/accreditationModel"
    );

  const auditPath =
    require.resolve(
      "../backend/models/auditModel"
    );

  const middlewarePath =
    require.resolve(
      "../backend/middleware/accreditationIssuanceMiddleware"
    );

  const state = {
    accreditationCalls:
      0,

    audits: [],
  };

  require.cache[
    studentPath
  ] = {
    id:
      studentPath,

    filename:
      studentPath,

    loaded:
      true,

    exports: {
      getStudentById:
        async () =>
          student,
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
        async () => {
          state.accreditationCalls +=
            1;

          return accreditation;
        },
    },
  };

  require.cache[
    auditPath
  ] = {
    id:
      auditPath,

    filename:
      auditPath,

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

  delete require.cache[
    middlewarePath
  ];

  return {
    middleware:
      require(
        middlewarePath
      )
        .requireAccreditationAtAwardDate,

    state,
  };
};

const response = () => ({
  statusCode:
    200,

  body:
    null,

  status(code) {
    this.statusCode =
      code;

    return this;
  },

  json(body) {
    this.body =
      body;

    return this;
  },
});

const request = ({
  filePath = null,
  role =
    "institution_admin",
  institutionId =
    INSTITUTION_ID,
} = {}) => ({
  user: {
    userId:
      "44444444-4444-4444-8444-444444444444",

    role,

    institutionId,
  },

  body: {
    studentId:
      STUDENT_ID,

    institutionId:
      INSTITUTION_ID,

    awardDate:
      "2026-07-31",

    issueDate:
      "2026-08-10",
  },

  file:
    filePath
      ? {
          path:
            filePath,
        }
      : undefined,

  ip:
    "127.0.0.1",

  get:
    () =>
      "test-agent",
});

test(
  "valid accreditation permits issuance and preserves award date",
  async () => {
    const {
      middleware,
      state,
    } =
      loadMiddleware();

    const req =
      request();

    const res =
      response();

    let nextCalled =
      false;

    await middleware(
      req,
      res,
      () => {
        nextCalled =
          true;
      }
    );

    assert.equal(
      nextCalled,
      true
    );

    assert.equal(
      state.accreditationCalls,
      1
    );

    assert.equal(
      req.effectiveAwardDate,
      "2026-07-31"
    );

    assert.equal(
      req.accreditationRecord.id,
      "33333333-3333-4333-8333-333333333333"
    );
  }
);

test(
  "missing accreditation blocks issuance before downstream processing",
  async () => {
    const directory =
      await fs.promises.mkdtemp(
        path.join(
          os.tmpdir(),
          "zsvp-accreditation-"
        )
      );

    const filePath =
      path.join(
        directory,
        "certificate.pdf"
      );

    await fs.promises.writeFile(
      filePath,
      "%PDF-1.4\n%%EOF"
    );

    const {
      middleware,
      state,
    } =
      loadMiddleware({
        accreditation:
          null,
      });

    const req =
      request({
        filePath,
      });

    const res =
      response();

    let nextCalled =
      false;

    await middleware(
      req,
      res,
      () => {
        nextCalled =
          true;
      }
    );

    assert.equal(
      nextCalled,
      false
    );

    assert.equal(
      res.statusCode,
      422
    );

    assert.equal(
      res.body.code,
      "ACCREDITATION_INVALID"
    );

    assert.equal(
      fs.existsSync(
        filePath
      ),
      false
    );

    assert.equal(
      state.audits[0]
        .action,
      "CREDENTIAL_ISSUANCE_BLOCKED_ACCREDITATION"
    );

    await fs.promises.rm(
      directory,
      {
        recursive:
          true,
      }
    );
  }
);

test(
  "cross institution request defers to existing authorization controls",
  async () => {
    const {
      middleware,
      state,
    } =
      loadMiddleware();

    const req =
      request({
        institutionId:
          "55555555-5555-4555-8555-555555555555",
      });

    const res =
      response();

    let nextCalled =
      false;

    await middleware(
      req,
      res,
      () => {
        nextCalled =
          true;
      }
    );

    assert.equal(
      nextCalled,
      true
    );

    assert.equal(
      state.accreditationCalls,
      0
    );
  }
);