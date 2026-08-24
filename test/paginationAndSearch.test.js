const test = require("node:test");
const assert = require("node:assert/strict");
const { parsePage, parseLimit, calculateOffset, buildPaginationMetadata, paginationFromQuery } = require("../backend/utils/pagination");
const { escapeLikePattern, normaliseSearchTerm, validateSortField, validateSortOrder, parseOptionalUuid, parseDateRange, statusBoolean } = require("../backend/utils/queryHelpers");

test("pagination defaults to page 1 and limit 20", () => assert.deepEqual(paginationFromQuery({}), { page: 1, limit: 20, offset: 0 }));
test("custom page and limit calculate offset", () => assert.deepEqual(paginationFromQuery({ page: 3, limit: 10 }), { page: 3, limit: 10, offset: 20 }));
for (const value of [0, -1, 1.2, "x"]) test(`invalid page ${value} is rejected`, () => assert.throws(() => parsePage(value), /allowed range/));
for (const value of [0, -1, 101]) test(`invalid limit ${value} is rejected`, () => assert.throws(() => parseLimit(value), /allowed range/));
test("calculateOffset is deterministic", () => assert.equal(calculateOffset(4, 25), 75));
test("empty metadata is zero-safe", () => assert.deepEqual(buildPaginationMetadata({ page: 1, limit: 20, total: 0 }), { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }));
test("metadata next and previous flags are accurate", () => { assert.equal(buildPaginationMetadata({ page: 1, limit: 20, total: 57 }).hasNextPage, true); assert.equal(buildPaginationMetadata({ page: 2, limit: 20, total: 57 }).hasPreviousPage, true); });
test("LIKE wildcard characters are escaped", () => assert.equal(escapeLikePattern("50%_off\\today"), "50\\%\\_off\\\\today"));
test("injection-like search remains ordinary escaped data", () => assert.equal(escapeLikePattern("%' OR 1=1 --"), "\\%' OR 1=1 --"));
test("search is trimmed and bounded", () => { assert.equal(normaliseSearchTerm("  skill  "), "skill"); assert.throws(() => normaliseSearchTerm("x".repeat(201)), /too long/); });
test("sort fields require internal whitelist", () => { assert.equal(validateSortField("name", { name: "safe.name" }, "fallback"), "safe.name"); assert.throws(() => validateSortField("name; DROP TABLE users", { name: "name" }), /Unsupported/); });
test("sort order accepts only asc or desc", () => { assert.equal(validateSortOrder("asc"), "ASC"); assert.throws(() => validateSortOrder("DESC; DROP TABLE users"), /Unsupported/); });
test("optional UUID parser rejects malformed filters", () => { assert.equal(parseOptionalUuid(undefined), null); assert.throws(() => parseOptionalUuid("not-a-uuid"), /invalid/); });
test("date ranges reject reverse chronology", () => assert.throws(() => parseDateRange("2026-02-02", "2026-02-01"), /invalid/));
test("status normalisation supports words and booleans", () => { assert.equal(statusBoolean("active"), true); assert.equal(statusBoolean("false"), false); });

const schemas = {
  institutions: require("../backend/validators/institutionValidator").listQuery,
  students: require("../backend/validators/studentValidator").listQuery,
  users: require("../backend/validators/userValidator").listQuery,
  credentials: require("../backend/validators/credentialValidator").listQuery,
  verification: require("../backend/validators/verificationLogValidator").listQuery,
  audit: require("../backend/validators/auditValidator").listQuery,
};
for (const [name, schema] of Object.entries(schemas)) test(`${name} query applies pagination defaults`, () => { const value = schema.parse({}); assert.equal(value.page, 1); assert.equal(value.limit, 20); assert.equal(value.sortOrder, "desc"); });
for (const [name, schema] of Object.entries(schemas)) test(`${name} query rejects raw sort fragments`, () => assert.equal(schema.safeParse({ sortBy: "created_at; DROP TABLE users" }).success, false));
test("institution filters accept active inactive and booleans", () => { for (const status of ["active", "inactive", "true", "false"]) assert.equal(schemas.institutions.safeParse({ status }).success, true); });
test("student filters validate institution UUID", () => assert.equal(schemas.students.safeParse({ institutionId: "bad" }).success, false));
test("user filters accept controlled roles and statuses", () => { assert.equal(schemas.users.safeParse({ role: "issuer", status: "inactive" }).success, true); assert.equal(schemas.users.safeParse({ role: "root" }).success, false); });
test("credential filters reject invalid and reversed dates", () => { assert.equal(schemas.credentials.safeParse({ issueDateFrom: "bad" }).success, false); assert.equal(schemas.credentials.safeParse({ issueDateFrom: "2026-02-02", issueDateTo: "2026-02-01" }).success, false); });
test("verification filters accept controlled result and method", () => { assert.equal(schemas.verification.safeParse({ result: "VERIFIED", method: "file" }).success, true); assert.equal(schemas.verification.safeParse({ method: "sql" }).success, false); });
test("audit filters reject malformed user UUID", () => assert.equal(schemas.audit.safeParse({ userId: "bad" }).success, false));

const loadModel = (modulePath) => {
  const poolPath = require.resolve("../backend/config/database"); const target = require.resolve(modulePath); delete require.cache[target]; delete require.cache[poolPath];
  const calls = []; const pool = { query: async (sql, values = []) => { calls.push({ sql: String(sql), values }); return /COUNT\(\*\)/.test(sql) ? { rows: [{ total: 3 }] } : { rows: [{ id: "row" }] }; } };
  require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: pool };
  return { model: require(target), calls };
};
const assertSafeList = (calls, hostile) => { assert.equal(calls.length, 2); assert.match(calls[0].sql, /COUNT\(\*\)/); assert.match(calls[1].sql, /LIMIT \$\d+ OFFSET \$\d+/); assert.equal(calls.some((call) => call.sql.includes(hostile)), false); assert.equal(calls.some((call) => call.values.includes(hostile)), true); };
test("institution listing uses COUNT, bounds, and parameterized search", async () => { const hostile = "%x' OR 1=1 --%"; const { model, calls } = loadModel("../backend/models/institutionModel"); const out = await model.getAllInstitutions({ search: hostile, limit: 20, offset: 0 }); assert.equal(out.total, 3); assertSafeList(calls, hostile); });
test("student listing joins institution once and scopes in SQL", async () => { const { model, calls } = loadModel("../backend/models/studentModel"); await model.getStudentsByInstitution("11111111-1111-4111-8111-111111111111", { search: "%learner%" }); assert.equal(calls.length, 2); assert.equal((calls[1].sql.match(/JOIN institutions/g) || []).length, 1); assert.match(calls[1].sql, /students\.institution_id = \$1/); });
test("user listing selects no password reset or security-counter columns", async () => { const { model, calls } = loadModel("../backend/models/userModel"); await model.listUsers({ search: "%admin%" }); assert.match(calls[1].sql, /LIMIT/); assert.doesNotMatch(calls[1].sql, /password_hash|password_reset|failed_login_attempts|locked_until/); });
test("credential listing joins related names and scopes institution", async () => { const { model, calls } = loadModel("../backend/models/credentialModel"); await model.getCredentialsByInstitution("11111111-1111-4111-8111-111111111111", { search: "%degree%" }); assert.match(calls[1].sql, /INNER JOIN students/); assert.match(calls[1].sql, /credentials\.institution_id = \$1/); assert.doesNotMatch(calls[1].sql, /processing_error/); });
test("verification logs exclude verifier identity and scope unattributed logs", async () => { const { model, calls } = loadModel("../backend/models/verificationModel"); await model.listVerificationLogs({ scopeInstitutionId: "11111111-1111-4111-8111-111111111111", method: "file" }); assert.match(calls[1].sql, /credentials\.institution_id = \$1/); assert.doesNotMatch(calls[1].sql, /verifier_name|verifier_email|ip_address|user_agent/); });
test("listing queries cap result size through parameterized limit", async () => { const { model, calls } = loadModel("../backend/models/institutionModel"); await model.getAllInstitutions({ limit: 100, offset: 200 }); assert.deepEqual(calls[1].values.slice(-2), [100, 200]); });
test("verification-log route denies issuer and verifier roles", () => { const router = require("../backend/routes/verificationLogRoutes"); const roleGuard = router.stack[2].handle; for (const role of ["issuer", "verifier"]) { const out = {}; roleGuard({ user: { role } }, { status(code) { out.status = code; return this; }, json() {} }, () => { out.next = true; }); assert.equal(out.status, 403); } });
