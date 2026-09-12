const test = require("node:test");
const assert = require("node:assert/strict");

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const INSTITUTION_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_INSTITUTION_ID = "44444444-4444-4444-8444-444444444444";

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

const loadController = ({ student = {}, user = {}, linked = true } = {}) => {
  const paths = {
    controller: require.resolve("../backend/controllers/studentController"),
    student: require.resolve("../backend/models/studentModel"),
    institution: require.resolve("../backend/models/institutionModel"),
    audit: require.resolve("../backend/models/auditModel"),
    user: require.resolve("../backend/models/userModel"),
  };
  const state = { audits: [] };
  Object.values(paths).forEach((path) => delete require.cache[path]);
  require.cache[paths.student] = { id: paths.student, filename: paths.student, loaded: true, exports: {
    getStudentById: async () => ({ id: STUDENT_ID, institution_id: INSTITUTION_ID, user_id: null, ...student }),
    linkStudentToUser: async () => linked ? ({ id: STUDENT_ID, user_id: USER_ID, institution_id: INSTITUTION_ID }) : undefined,
    createStudent: async () => ({}), getAllStudents: async () => [], getStudentsByInstitution: async () => [], updateStudent: async () => ({}), studentHasCredentials: async () => false, reassignStudentInstitution: async () => ({}),
  }};
  require.cache[paths.institution] = { id: paths.institution, filename: paths.institution, loaded: true, exports: { getInstitutionById: async () => ({ status: true }) } };
  require.cache[paths.audit] = { id: paths.audit, filename: paths.audit, loaded: true, exports: { createAuditLog: async (entry) => state.audits.push(entry) } };
  require.cache[paths.user] = { id: paths.user, filename: paths.user, loaded: true, exports: { findUserForAuthentication: async () => user } };
  return { controller: require(paths.controller), state, paths };
};

const invoke = async (controller, options = {}) => {
  const result = response();
  await controller.linkAccount({
    user: { userId: "actor", role: "super_admin", institutionId: null },
    params: { id: STUDENT_ID },
    body: { userId: USER_ID },
    ip: "127.0.0.1",
    get: () => "test-agent",
    ...options,
  }, result.res);
  return result.output;
};

test("links an active same-institution student account and audits the link", async () => {
  const { controller, state } = loadController({ user: { id: USER_ID, role: "student", institution_id: INSTITUTION_ID, is_active: true, institution_active: true } });
  const output = await invoke(controller);
  assert.equal(output.status, 200);
  assert.equal(output.body.student.user_id, USER_ID);
  assert.equal(state.audits[0].action, "STUDENT_ACCOUNT_LINKED");
});

test("rejects non-student, inactive, and cross-institution accounts", async () => {
  for (const user of [
    { role: "issuer", institution_id: INSTITUTION_ID, is_active: true, institution_active: true },
    { role: "student", institution_id: INSTITUTION_ID, is_active: false, institution_active: true },
    { role: "student", institution_id: OTHER_INSTITUTION_ID, is_active: true, institution_active: true },
  ]) {
    const { controller } = loadController({ user });
    const output = await invoke(controller);
    assert.ok([403, 422].includes(output.status));
  }
});

test("rejects a pre-linked student and a concurrent duplicate link", async () => {
  const prelinked = loadController({ student: { user_id: OTHER_INSTITUTION_ID }, user: { role: "student", institution_id: INSTITUTION_ID, is_active: true, institution_active: true } });
  assert.equal((await invoke(prelinked.controller)).status, 409);
  const concurrent = loadController({ user: { role: "student", institution_id: INSTITUTION_ID, is_active: true, institution_active: true }, linked: false });
  assert.equal((await invoke(concurrent.controller)).status, 409);
});

test("account-link schema rejects client-supplied ownership fields", () => {
  const schema = require("../backend/validators/studentValidator").accountLink;
  assert.equal(schema.safeParse({ userId: USER_ID }).success, true);
  assert.equal(schema.safeParse({ userId: USER_ID, institutionId: OTHER_INSTITUTION_ID }).success, false);
});