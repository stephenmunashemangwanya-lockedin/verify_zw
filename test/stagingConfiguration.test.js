const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const YAML = require("yaml");
const { validateEnvironment } = require("../backend/config/environment");

const base = {
  NODE_ENV: "staging", DATABASE_URL: "postgresql://app:secret@db.staging.internal:5432/zsvp_staging", DB_NAME: "zsvp_staging", DB_SSL: "true",
  JWT_SECRET: "a".repeat(64), JWT_ISSUER: "zsvp-staging", JWT_AUDIENCE: "zsvp-staging-api", JWT_ALGORITHM: "HS256", JWT_EXPIRES_IN: "8h",
  FRONTEND_PUBLIC_URL: "https://staging.example.test", PASSWORD_RESET_FRONTEND_URL: "https://staging.example.test/reset-password", CORS_ALLOWED_ORIGINS: "https://staging.example.test", CORS_ALLOW_CREDENTIALS: "true",
  AUTH_COOKIE_SECURE: "true", CSRF_ENABLED: "true", EMAIL_PROVIDER: "webhook", EMAIL_DELIVERY_URL: "https://mail.example.test/send", EMAIL_DELIVERY_TOKEN: "secret", EMAIL_FROM: "staging@example.test",
  IPFS_ENABLED: "true", IPFS_PROVIDER_API_URL: "https://api.pinata.cloud", PINATA_JWT: "secret", PINATA_GATEWAY: "https://ipfs.example.test/ipfs",
  BLOCKCHAIN_ENABLED: "true", BLOCKCHAIN_NETWORK: "sepolia", BLOCKCHAIN_RPC_URL: "https://rpc.example.test", BLOCKCHAIN_CHAIN_ID: "11155111", CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000001", DEPLOYER_PRIVATE_KEY: `0x${"11".repeat(32)}`,
  RATE_LIMIT_STORE: "redis", REDIS_URL: "rediss://user:secret@redis.staging.internal:6380",
};
const withEnvironment = (overrides, fn) => { const old = { ...process.env }; Object.assign(process.env, base, overrides); try { return fn(); } finally { for (const key of Object.keys(process.env)) if (!(key in old)) delete process.env[key]; Object.assign(process.env, old); } };
test("complete staging environment validates", () => withEnvironment({}, () => assert.equal(validateEnvironment().issuer, "zsvp-staging")));
for (const [name, overrides, message] of [
  ["localhost database", { DATABASE_URL: "postgresql://app:x@localhost/zsvp_staging" }, /localhost database/],
  ["test database", { DATABASE_URL: "postgresql://app:x@db.internal/zsvp_test", DB_NAME: "zsvp_test" }, /database names/],
  ["Hardhat chain", { BLOCKCHAIN_CHAIN_ID: "31337", BLOCKCHAIN_NETWORK: "localhost", BLOCKCHAIN_RPC_URL: "http://localhost:8545" }, /Hardhat blockchain/],
  ["wildcard CORS", { CORS_ALLOWED_ORIGINS: "*" }, /CORS_ALLOWED_ORIGINS/],
  ["insecure cookie", { AUTH_COOKIE_SECURE: "false" }, /AUTH_COOKIE_SECURE/],
  ["capture email", { EMAIL_PROVIDER: "capture" }, /EMAIL_PROVIDER must be webhook/],
  ["disabled IPFS", { IPFS_ENABLED: "false" }, /IPFS_ENABLED/],
  ["memory limiter", { RATE_LIMIT_STORE: "memory", REDIS_URL: "" }, /Redis rate-limit store/],
]) test(`staging rejects ${name}`, () => withEnvironment(overrides, () => assert.throws(() => validateEnvironment(), message)));
test("staging compose contains no local stateful service", () => { const compose = YAML.parse(fs.readFileSync("docker-compose.staging.yml", "utf8")); assert.deepEqual(Object.keys(compose.services).sort(), ["backend", "frontend", "migration"]); assert.equal(compose.services.backend.read_only, true); assert.deepEqual(compose.services.backend.cap_drop, ["ALL"]); assert.match(compose.services.backend.image, /BACKEND_IMAGE/); });
test("dashboard frontend uses the documented groupBy parameter on both trend routes", () => { const source = fs.readFileSync("frontend/src/pages/Dashboard.tsx", "utf8"); assert.equal((source.match(/groupBy=day/g) || []).length, 2); assert.doesNotMatch(source, /[?&]group=day/); });
