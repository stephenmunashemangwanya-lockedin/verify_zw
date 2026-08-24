const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const UUID = "11111111-1111-4111-8111-111111111111";

test("audit detail sanitization recursively removes secrets", () => {
  const { sanitiseDetails } = require("../backend/models/auditModel");
  const clean = sanitiseDetails({ reason: "ok", password: "bad", nested: { jwtToken: "bad", value: "safe" }, privateKey: "bad" });
  assert.deepEqual(clean, { reason: "ok", nested: { value: "safe" } });
});

test("audit model uses parameterized filters and enforces institution scope", async () => {
  const dbPath = require.resolve("../backend/config/database");
  const modelPath = require.resolve("../backend/models/auditModel");
  const queries = [];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: async (sql, values) => { queries.push({ sql, values }); return sql.includes("COUNT") ? { rows: [{ total: 0 }] } : { rows: [] }; } } };
  delete require.cache[modelPath];
  const { listAuditLogs } = require(modelPath);
  await listAuditLogs({ filters: { action: "LOGIN_SUCCESS" }, scopeInstitutionId: "inst-1", limit: 20, offset: 0, sortBy: "created_at", sortOrder: "DESC" });
  assert.equal(queries.every((query) => !query.sql.includes("inst-1")), true);
  assert.deepEqual(queries[0].values, ["inst-1", "LOGIN_SUCCESS"]);
  delete require.cache[modelPath]; delete require.cache[dbPath];
});

test("audit routes allow administrators and deny issuer/verifier roles", async () => {
  const router = require("../backend/routes/auditRoutes");
  const roleMiddleware = router.stack[2].handle;
  const invoke = (role) => {
    const response = { statusCode: 200 }; let nextCalled = false;
    const res = { status(code) { response.statusCode = code; return this; }, json() { return this; } };
    roleMiddleware({ user: { role } }, res, () => { nextCalled = true; });
    return { response, nextCalled };
  };
  assert.equal(invoke("super_admin").nextCalled, true);
  assert.equal(invoke("institution_admin").nextCalled, true);
  assert.equal(invoke("issuer").response.statusCode, 403);
  assert.equal(invoke("verifier").response.statusCode, 403);
});

test("audit creation stores JSONB details with parameterized SQL", async () => {
  const dbPath = require.resolve("../backend/config/database"); const modelPath = require.resolve("../backend/models/auditModel");
  let call;
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: async (sql, values) => { call = { sql, values }; return { rows: [{ id: UUID }] }; } } };
  delete require.cache[modelPath];
  await require(modelPath).createAuditLog({ userId: UUID, action: "LOGIN_SUCCESS", details: { safe: true } });
  assert.match(call.sql, /\$5::jsonb/); assert.equal(JSON.parse(call.values[4]).safe, true); assert.equal(call.sql.includes("LOGIN_SUCCESS"), false);
  delete require.cache[modelPath]; delete require.cache[dbPath];
});

test("unauthenticated audit events store a null user", async () => {
  const dbPath = require.resolve("../backend/config/database"); const modelPath = require.resolve("../backend/models/auditModel"); let values;
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: async (_sql, input) => { values = input; return { rows: [{}] }; } } };
  delete require.cache[modelPath]; await require(modelPath).createAuditLog({ action: "LOGIN_FAILURE", details: {} }); assert.equal(values[0], null);
  delete require.cache[modelPath]; delete require.cache[dbPath];
});

for (const [label, input] of [
  ["passwords", { password: "x", currentPassword: "x", newPassword: "x", confirmPassword: "x", password_hash: "x" }],
  ["JWTs and tokens", { token: "x", jwt: "x", JWT_SECRET: "x", nested: [{ authorization: "x" }] }],
  ["private keys and mnemonics", { privateKey: "x", private_key: "x", mnemonic: "x", DEPLOYER_PRIVATE_KEY: "x" }],
  ["provider and database secrets", { PINATA_JWT: "x", DB_PASSWORD: "x", rpcUrl: "x" }],
  ["certificate bytes and environment values", { certificateFileBytes: "x", environment: { SAFE: "not-stored" } }],
]) test(`sanitizer removes ${label}`, () => {
  const clean = require("../backend/models/auditModel").sanitiseDetails(input);
  assert.equal(JSON.stringify(clean).includes('"x"'), false);
});

test("sanitizer retains safe nested values and bounds arrays", () => {
  const clean = require("../backend/models/auditModel").sanitiseDetails({ nested: [{ result: "VERIFIED" }], long: "a".repeat(3000) });
  assert.deepEqual(clean.nested, [{ result: "VERIFIED" }]); assert.equal(clean.long.length, 2000);
});

test("audit persistence failures are rethrown without business data", async () => {
  const dbPath = require.resolve("../backend/config/database"); const modelPath = require.resolve("../backend/models/auditModel");
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: async () => { throw Object.assign(new Error("sensitive"), { code: "08006" }); } } };
  delete require.cache[modelPath]; await assert.rejects(() => require(modelPath).createAuditLog({ action: "TEST", details: { password: "x" } }), { code: "08006" });
  delete require.cache[modelPath]; delete require.cache[dbPath];
});

test("institution scope uses server-side entity and user joins", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../backend/models/auditModel.js"), "utf8");
  assert.match(source, /LEFT JOIN credentials/); assert.match(source, /LEFT JOIN students/); assert.match(source, /LEFT JOIN users/); assert.match(source, /COALESCE/);
});

test("pagination defaults and metadata are stable", async () => {
  const modelPath = require.resolve("../backend/models/auditModel"); const servicePath = require.resolve("../backend/services/auditService");
  require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: { listAuditLogs: async (args) => ({ rows: [{ args }], total: 57 }), findAuditLogById: async () => null } };
  delete require.cache[servicePath]; const result = await require(servicePath).getAuditLogs({}, { role: "super_admin" });
  assert.deepEqual(result.pagination, { page: 1, limit: 20, total: 57, totalPages: 3, hasNextPage: true, hasPreviousPage: false });
  assert.equal(result.auditLogs[0].args.sortBy, "created_at"); assert.equal(result.auditLogs[0].args.sortOrder, "DESC");
  delete require.cache[servicePath]; delete require.cache[modelPath];
});

test("pagination limit is capped at 100", async () => {
  const modelPath = require.resolve("../backend/models/auditModel"); const servicePath = require.resolve("../backend/services/auditService"); let args;
  require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: { listAuditLogs: async (input) => { args = input; return { rows: [], total: 0 }; }, findAuditLogById: async () => null } };
  delete require.cache[servicePath]; await require(servicePath).getAuditLogs({ page: "2", limit: "1000" }, { role: "super_admin" }); assert.equal(args.limit, 100); assert.equal(args.offset, 100);
  delete require.cache[servicePath]; delete require.cache[modelPath];
});

test("filters and whitelisted sorting are forwarded safely", async () => {
  const modelPath = require.resolve("../backend/models/auditModel"); const servicePath = require.resolve("../backend/services/auditService"); let args;
  require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: { listAuditLogs: async (input) => { args = input; return { rows: [], total: 0 }; }, findAuditLogById: async () => null } };
  delete require.cache[servicePath]; await require(servicePath).getAuditLogs({ action: "LOGIN_SUCCESS", entityType: "user", sortBy: "action", sortOrder: "asc" }, { role: "super_admin" });
  assert.equal(args.filters.action, "LOGIN_SUCCESS"); assert.equal(args.filters.entityType, "user"); assert.equal(args.sortBy, "action"); assert.equal(args.sortOrder, "ASC");
  delete require.cache[servicePath]; delete require.cache[modelPath];
});

test("arbitrary sort fields fall back to created_at", async () => {
  const modelPath = require.resolve("../backend/models/auditModel"); const servicePath = require.resolve("../backend/services/auditService"); let args;
  require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: { listAuditLogs: async (input) => { args = input; return { rows: [], total: 0 }; }, findAuditLogById: async () => null } };
  delete require.cache[servicePath]; await require(servicePath).getAuditLogs({ sortBy: "DROP TABLE" }, { role: "super_admin" }); assert.equal(args.sortBy, "created_at");
  delete require.cache[servicePath]; delete require.cache[modelPath];
});

test("institution administrator scope cannot be overridden by query", async () => {
  const modelPath = require.resolve("../backend/models/auditModel"); const servicePath = require.resolve("../backend/services/auditService"); let args;
  require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: { listAuditLogs: async (input) => { args = input; return { rows: [], total: 0 }; }, findAuditLogById: async () => null } };
  delete require.cache[servicePath]; await require(servicePath).getAuditLogs({ institutionId: "other" }, { role: "institution_admin", institutionId: "own" });
  assert.equal(args.scopeInstitutionId, "own"); assert.equal(args.filters.institutionId, undefined);
  delete require.cache[servicePath]; delete require.cache[modelPath];
});

test("invalid audit UUID returns 400 and unknown valid UUID returns 404", async () => {
  const servicePath = require.resolve("../backend/services/auditService"); const controllerPath = require.resolve("../backend/controllers/auditController");
  require.cache[servicePath] = { id: servicePath, filename: servicePath, loaded: true, exports: { getAuditLogs: async () => ({}), getAuditLog: async () => null } };
  delete require.cache[controllerPath]; const controller = require(controllerPath);
  const invoke = async (id) => { const result = {}; const res = { status(code) { result.status = code; return this; }, json(body) { result.body = body; return this; } }; await controller.getOne({ params: { id }, user: { role: "super_admin" } }, res); return result; };
  assert.equal((await invoke("invalid")).status, 400); assert.equal((await invoke(UUID)).status, 404);
  delete require.cache[controllerPath]; delete require.cache[servicePath];
});

test("real action points declare all currently implemented Stage 15 events", () => {
  const sources = ["authController.js", "userController.js", "institutionController.js", "studentController.js", "credentialController.js", "verificationController.js"].map((file) => fs.readFileSync(path.resolve(__dirname, `../backend/controllers/${file}`), "utf8")).join("\n").toUpperCase();
  for (const event of ["LOGIN_SUCCESS", "LOGIN_FAILURE", "LOGOUT", "PUBLIC_REGISTRATION_REJECTED", "USER_CREATED", "INSTITUTION_USER_CREATED", "USER_ROLE_CHANGED", "USER_INSTITUTION_REASSIGNED", "INSTITUTION_CREATED", "INSTITUTION_ACTIVATED", "INSTITUTION_DEACTIVATED", "INSTITUTION_WALLET_AUTHORISED", "INSTITUTION_WALLET_DEACTIVATED", "STUDENT_CREATED", "CREDENTIAL_PROCESSING_STARTED", "CERTIFICATE_HASH_GENERATED", "IPFS_UPLOAD_SUCCESS", "IPFS_UPLOAD_FAILURE", "BLOCKCHAIN_TRANSACTION_SUBMITTED", "BLOCKCHAIN_TRANSACTION_CONFIRMED", "BLOCKCHAIN_TRANSACTION_FAILED", "CREDENTIAL_ACTIVATED", "CREDENTIAL_FAILED", "CREDENTIAL_REVOKED", "QR_GENERATED", "CERTIFICATE_PDF_GENERATED", "VERIFICATION_COMPLETED", "VERIFICATION_INCONSISTENCY", "UNKNOWN_CERTIFICATE_CHECKED"]) assert.match(sources, new RegExp(event));
});

test("administrative audit API exposes list and detail routes", () => {
  const router = require("../backend/routes/auditRoutes");
  assert.ok(router.stack.find((layer) => layer.route?.path === "/" && layer.route.methods.get));
  assert.ok(router.stack.find((layer) => layer.route?.path === "/:id" && layer.route.methods.get));
});
