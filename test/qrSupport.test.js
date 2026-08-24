const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const TOKEN = "123e4567-e89b-42d3-a456-426614174000";
const originalUrl = process.env.FRONTEND_PUBLIC_URL;

test.afterEach(() => {
  if (originalUrl === undefined) delete process.env.FRONTEND_PUBLIC_URL;
  else process.env.FRONTEND_PUBLIC_URL = originalUrl;
});

test("QR payload is exactly the stable public URL and contains no personal data", () => {
  process.env.FRONTEND_PUBLIC_URL = "https://verify.example.org/";
  const { getPublicVerificationUrl } = require("../backend/services/qrCodeService");
  const url = getPublicVerificationUrl(TOKEN);
  assert.equal(url, `https://verify.example.org/verify/${TOKEN}`);
  assert.equal(url.includes("student"), false);
  assert.equal(url.includes("qualification"), false);
});

test("QR generation writes a valid PNG without changing the stable URL", async () => {
  process.env.FRONTEND_PUBLIC_URL = "http://localhost:5173";
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "credential-qr-"));
  try {
    const { generateCredentialQrCode } = require("../backend/services/qrCodeService");
    const result = await generateCredentialQrCode(TOKEN, { outputDirectory: directory });
    const bytes = await fs.promises.readFile(result.absolutePath);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(result.verificationUrl, `http://localhost:5173/verify/${TOKEN}`);
    assert.equal(path.basename(result.absolutePath), `${TOKEN}.png`);
  } finally {
    await fs.promises.rm(directory, { recursive: true, force: true });
  }
});

test("invalid tokens and unsafe frontend URL protocols are rejected", () => {
  const { getPublicVerificationUrl } = require("../backend/services/qrCodeService");
  process.env.FRONTEND_PUBLIC_URL = "https://verify.example.org";
  assert.throws(() => getPublicVerificationUrl("sequential-1"), { code: "QR_INVALID_PUBLIC_TOKEN" });
  process.env.FRONTEND_PUBLIC_URL = "file:///tmp/unsafe";
  assert.throws(() => getPublicVerificationUrl(TOKEN), { code: "QR_CONFIGURATION_ERROR" });
});

test("credential creation uses a database-generated unique non-sequential token", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../backend/models/credentialModel.js"), "utf8");
  assert.match(source, /public_token[\s\S]*gen_random_uuid\(\)/);
  const migration = fs.readFileSync(path.resolve(__dirname, "../backend/database/migrations/001_extend_credential_verification_audit.sql"), "utf8");
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS uq_credentials_public_token/i);
});

test("public token verification route is unauthenticated and remains status-aware", () => {
  const router = require("../backend/routes/verificationRoutes");
  const layer = router.stack.find((item) => item.route?.path === "/token/:publicToken");
  assert.ok(layer);
  assert.equal(layer.route.methods.get, true);
  const source = fs.readFileSync(path.resolve(__dirname, "../backend/services/verificationService.js"), "utf8");
  assert.match(source, /credential\.status === "revoked" \|\| blockchain\.revoked/);
});
