const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

test("test database isolation refuses the live database", () => {
  const live = process.env.DB_NAME || "skill_verification";
  const candidate = process.env.TEST_DB_NAME || "";
  assert.ok(!candidate || candidate !== live);
  if (candidate) assert.match(candidate, /_test$/i);
});

test("production frontend JavaScript stays below the advisory ceiling", () => {
  const directory = path.join(root, "frontend/dist/assets");
  const files = fs.readdirSync(directory).filter((file) => file.endsWith(".js"));
  assert.ok(files.length);
  const bytes = files.reduce((total, file) => total + fs.statSync(path.join(directory, file)).size, 0);
  assert.ok(bytes < 1_500_000, `JavaScript bundle is ${bytes} bytes`);
});

test("the public health handler responds within the smoke-test budget", () => {
  const { publicHealth } = require("../../backend/controllers/healthController");
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  const started = performance.now();
  publicHealth({}, response);
  assert.ok(performance.now() - started < 250);
  assert.equal(response.statusCode, 200);
});

test("generated test artifacts contain no obvious private keys or JWTs", () => {
  for (const relative of ["coverage", "frontend/coverage", "test-results", "artifacts/test"]) {
    const directory = path.join(root, relative);
    if (!fs.existsSync(directory)) continue;
    for (const file of fs.readdirSync(directory, { recursive: true }).filter((name) => /\.(json|html|txt|xml)$/i.test(name))) {
      const contents = fs.readFileSync(path.join(directory, file), "utf8");
      assert.doesNotMatch(contents, /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./);
    }
  }
});
