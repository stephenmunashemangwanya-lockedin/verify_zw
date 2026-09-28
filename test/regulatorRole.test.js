const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROLES, ROLE_VALUES, INSTITUTION_MANAGED_ROLES } = require("../backend/constants/roles");
const { role } = require("../backend/validators/commonValidator");
const { migrationFiles } = require("../backend/database/runMigrations");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("regulator is a supported institution-independent role", () => {
  assert.equal(ROLES.REGULATOR, "regulator");
  assert.equal(ROLE_VALUES.includes("regulator"), true);
  assert.equal(INSTITUTION_MANAGED_ROLES.includes("regulator"), false);
  assert.equal(role.parse("regulator"), "regulator");
});

test("regulator migration is present in the discovered migration chain", () => {
  assert.equal(migrationFiles(path.join(root, "backend/database/migrations")).includes("012_regulator_role.sql"), true);
  const sql = read("backend/database/migrations/012_regulator_role.sql");
  assert.match(sql, /users_role_check/);
  assert.match(sql, /regulator/);
});

test("accreditation routes grant regulator authority without user-admin authority", () => {
  const accreditation = read("backend/routes/accreditationRoutes.js");
  assert.match(accreditation, /authorizeRoles\([^)]*["']regulator["']/);
  assert.doesNotMatch(read("backend/routes/userRoutes.js"), /authorizeRoles\([^)]*["']regulator["']/);
});

test("frontend exposes the accreditation workspace to regulator", () => {
  const app = read("frontend/src/App.tsx");
  assert.match(read("frontend/src/types/index.ts"), /["']regulator["']/);
  assert.match(app, /user\?\.role\s*===\s*["']regulator["']/);
  assert.match(app, /\/app\/accreditations/);
  const nav = read("frontend/src/layouts/AppLayout.tsx").match(/\[\s*["']\/app\/accreditations["'][\s\S]*?\],/)?.[0] || "";
  assert.match(nav, /["']regulator["']/);
});

test("regulator is not exposed to institution-management navigation", () => {
  const nav = read("frontend/src/layouts/AppLayout.tsx").match(/\[\s*["']\/app\/institutions["'][\s\S]*?\],/)?.[0];
  assert.ok(nav, "Institution navigation must remain present");
  assert.doesNotMatch(nav, /["']regulator["']/);
});
