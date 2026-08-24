"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("dependency gate audits production and complete root/frontend trees", () => {
  const source = fs.readFileSync(
    path.join(root, "scripts", "checkDependencySecurity.js"),
    "utf8"
  );
  assert.match(source, /--omit=dev/);
  assert.match(source, /frontendProduction/);
  assert.match(source, /rootComplete\.critical/);
  assert.match(source, /counts\.high/);
  assert.doesNotMatch(source, /audit fix|--force|audit-level=critical/);
});

test("security workflow uses deterministic dependency gate after npm ci", () => {
  const workflow = fs.readFileSync(
    path.join(root, ".github", "workflows", "security.yml"),
    "utf8"
  );
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm --prefix frontend ci/);
  assert.match(workflow, /npm run security:dependencies/);
  assert.doesNotMatch(workflow, /npm audit fix/);
});

test("lockfiles retain registry integrity without local dependency sources", () => {
  for (const relative of ["package-lock.json", "frontend/package-lock.json"]) {
    const lock = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
    assert.equal(lock.lockfileVersion, 3);
    for (const [name, entry] of Object.entries(lock.packages)) {
      if (!name || !entry.resolved) continue;
      assert.match(entry.resolved, /^https:\/\/registry\.npmjs\.org\//);
      assert.ok(entry.integrity, `${relative}:${name} has no integrity hash`);
    }
  }
});
