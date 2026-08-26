const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const response = () => {
  const output = {};
  return {
    output,
    res: {
      status(code) { output.status = code; return this; },
      json(body) { output.body = body; return this; },
    },
  };
};

const withCachedModules = async (mocks, callback) => {
  const previous = new Map();
  for (const [modulePath, exports] of Object.entries(mocks)) {
    previous.set(modulePath, require.cache[modulePath]);
    require.cache[modulePath] = { id: modulePath, filename: modulePath, loaded: true, exports };
  }
  try {
    return await callback();
  } finally {
    for (const [modulePath, cached] of previous) {
      if (cached) require.cache[modulePath] = cached;
      else delete require.cache[modulePath];
    }
  }
};

const loadController = async ({ student, credential, credentials = [] }, callback) => {
  const controllerPath = require.resolve("../backend/controllers/credentialController");
  const credentialModelPath = require.resolve("../backend/models/credentialModel");
  const studentModelPath = require.resolve("../backend/models/studentModel");
  const auditModelPath = require.resolve("../backend/models/auditModel");
  const captured = {};
  delete require.cache[controllerPath];
  await withCachedModules({
    [credentialModelPath]: {
      getCredentialById: async () => credential,
      getCredentialsByStudent: async (studentId, options) => {
        captured.studentId = studentId;
        captured.options = options;
        return { rows: credentials, total: credentials.length };
      },
    },
    [studentModelPath]: { getStudentByUserId: async (userId) => { captured.userId = userId; return student; } },
    [auditModelPath]: { createAuditLog: async () => {} },
  }, async () => callback(require(controllerPath), captured));
  delete require.cache[controllerPath];
};

test("student ownership migration is additive and enforces one linked account", () => {
  const migration = fs.readFileSync(path.join(__dirname, "../backend/database/migrations/007_student_account_ownership.sql"), "utf8");
  assert.match(migration, /'student'/);
  assert.match(migration, /students ADD COLUMN IF NOT EXISTS user_id UUID/);
  assert.match(migration, /FOREIGN KEY \(user_id\) REFERENCES users\(id\) ON DELETE SET NULL/);
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS uq_students_user_id/);
});

test("student credential routes reserve /me before the dynamic credential ID route", async () => {
  const routePath = require.resolve("../backend/routes/credentialRoutes");
  const controllerPath = require.resolve("../backend/controllers/credentialController");
  const authPath = require.resolve("../backend/middleware/authMiddleware");
  const uploadPath = require.resolve("../backend/middleware/uploadMiddleware");
  const validationPath = require.resolve("../backend/middleware/validationMiddleware");
  const securityPath = require.resolve("../backend/middleware/securityMiddleware");
  const next = (_req, _res, proceed) => proceed();
  delete require.cache[routePath];
  await withCachedModules({
    [controllerPath]: { issueCredential: next, listCredentials: next, listMyCredentials: next, getOneCredential: next, revokeCredential: next, generateCredentialPdf: next, downloadCredentialPdf: next },
    [authPath]: { authenticate: next, requireCurrentUser: next, authorizeRoles: () => next },
    [uploadPath]: { uploadCertificate: { single: () => next } },
    [validationPath]: { validate: () => next },
    [securityPath]: { adminActionLimiter: next, sensitiveNoStore: next },
  }, async () => {
    const router = require(routePath);
    const paths = router.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
    assert.ok(paths.indexOf("/me") < paths.indexOf("/:id"));
  });
  delete require.cache[routePath];
});

test("student credential controller derives listing ownership from the authenticated user", async () => {
  await loadController({ student: { id: "student-a" }, credentials: [{ id: "credential-a" }] }, async ({ listMyCredentials }, captured) => {
    const { res, output } = response();
    await listMyCredentials({ user: { userId: "user-a", role: "student" }, query: { studentId: "student-b", page: "1" } }, res);
    assert.equal(output.status, 200);
    assert.equal(captured.userId, "user-a");
    assert.equal(captured.studentId, "student-a");
    assert.equal(captured.options.studentId, undefined);
    assert.equal(output.body.credentials[0].id, "credential-a");
  });
});

test("student A is denied student B's credential", async () => {
  await loadController({ student: { id: "student-a" }, credential: { id: "credential-b", student_id: "student-b", institution_id: "institution-b" } }, async ({ getOneCredential }) => {
    const { res, output } = response();
    await getOneCredential({ user: { userId: "user-a", role: "student" }, params: { id: "credential-b" }, get: () => null }, res);
    assert.equal(output.status, 403);
    assert.equal(output.body.code, "ACCESS_DENIED");
  });
});

test("authentication and student role boundaries reject unauthenticated and non-student access", () => {
  const { authenticate, authorizeRoles } = require("../backend/middleware/authMiddleware");
  const unauthenticated = response();
  authenticate({ headers: {} }, unauthenticated.res, () => { unauthenticated.output.next = true; });
  assert.equal(unauthenticated.output.status, 401);

  const denied = response();
  authorizeRoles("student")({ user: { userId: "issuer-a", role: "issuer" } }, denied.res, () => { denied.output.next = true; });
  assert.equal(denied.output.status, 403);

  const allowed = response();
  authorizeRoles("student")({ user: { userId: "student-a", role: "student" } }, allowed.res, () => { allowed.output.next = true; });
  assert.equal(allowed.output.next, true);
});
