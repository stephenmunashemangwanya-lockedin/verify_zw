const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.resolve(__dirname, "../scripts/runApiE2E.js"), "utf8");

test("API E2E requires a database name ending exactly in _test", () => {
  assert.match(source, /\/_test\$\//);
  assert.match(source, /TEST_DB_NAME is required/);
});

test("API E2E rejects development, production, Sepolia, and production mode", () => {
  for (const guard of ["testName === liveName", "testName === productionName", "NODE_ENV === \"production\"", "BLOCKCHAIN_NETWORK"]) assert.ok(source.includes(guard));
});

test("API E2E cleanup targets only the guarded test connection", () => {
  assert.match(source, /new Pool\(testConfig\)/);
  assert.match(source, /TRUNCATE audit_logs, verification_logs, credentials, students, users, institutions/);
  assert.doesNotMatch(source, /DROP DATABASE|DROP SCHEMA/);
});
