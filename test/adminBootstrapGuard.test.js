const test = require("node:test");
const assert = require("node:assert/strict");
const { ROLES } = require("../backend/constants/roles");
const { hasActiveSuperAdmin } = require("../backend/models/userModel");
const fs = require("node:fs");
const path = require("node:path");

const clientFor = (users) => ({
  calls: [],
  async query(sql, values) {
    this.calls.push({ sql, values });
    return {
      rows: [{
        exists: users.some((user) => user.role === values[0] && user.is_active === true),
      }],
    };
  },
});

for (const [name, users, expected] of [
  ["zero users", [], false],
  ["active verifier only", [{ role: ROLES.VERIFIER, is_active: true }], false],
  ["active issuer only", [{ role: ROLES.ISSUER, is_active: true }], false],
  ["active institution admin only", [{ role: ROLES.INSTITUTION_ADMIN, is_active: true }], false],
  ["inactive super admin only", [{ role: ROLES.SUPER_ADMIN, is_active: false }], false],
  ["active super admin", [{ role: ROLES.SUPER_ADMIN, is_active: true }], true],
  ["multiple non-super-admin users", [
    { role: ROLES.VERIFIER, is_active: true },
    { role: ROLES.ISSUER, is_active: true },
    { role: ROLES.INSTITUTION_ADMIN, is_active: true },
  ], false],
]) test(`bootstrap guard: ${name}`, async () => {
  const client = clientFor(users);
  assert.equal(await hasActiveSuperAdmin(client), expected);
  assert.deepEqual(client.calls[0].values, [ROLES.SUPER_ADMIN]);
  assert.match(client.calls[0].sql, /SELECT EXISTS/);
  assert.match(client.calls[0].sql, /role = \$1 AND is_active = TRUE/);
});

test("bootstrap creation retains its advisory transaction lock", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../backend/models/userModel.js"), "utf8");
  assert.match(source, /BEGIN/);
  assert.match(source, /pg_advisory_xact_lock\(\$1\)/);
  assert.match(source, /COMMIT/);
  assert.match(source, /ROLLBACK/);
});
