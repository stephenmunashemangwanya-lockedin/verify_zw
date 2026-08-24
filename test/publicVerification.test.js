const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");

const HASH = "ab".repeat(32);
const ID = "123e4567-e89b-42d3-a456-426614174000";
const TOKEN = "223e4567-e89b-42d3-a456-426614174000";
const baseCredential = {
  id: ID,
  certificate_hash: HASH,
  qualification: "Bachelor of Science",
  issue_date: "2026-08-03",
  ipfs_cid: "QmYwAPJzv5CZsnAzt8auVZRnGNiT1U6d1pXCVQaWnLYPJe",
  blockchain_tx: `0x${"1".repeat(64)}`,
  blockchain_network: "localhost",
  contract_address: "0x0000000000000000000000000000000000000001",
  block_number: 4,
  status: "active",
  public_token: TOKEN,
  student_number: "R227678G",
  institution_name: "Test University",
};

const loadService = ({ blockchain = { exists: true, revoked: false }, pinned = true } = {}) => {
  const blockchainPath = require.resolve("../backend/services/blockchainService");
  const ipfsPath = require.resolve("../backend/services/ipfsService");
  const servicePath = require.resolve("../backend/services/verificationService");
  require.cache[blockchainPath] = { id: blockchainPath, filename: blockchainPath, loaded: true, exports: { verifyCredentialOnChain: async () => blockchain } };
  require.cache[ipfsPath] = { id: ipfsPath, filename: ipfsPath, loaded: true, exports: { checkPinStatus: async () => pinned } };
  delete require.cache[servicePath];
  return require(servicePath);
};

test("active database and blockchain credential is VERIFIED", async () => {
  const { verifyCredentialState } = loadService();
  const result = await verifyCredentialState({ credential: baseCredential, certificateHash: HASH });
  assert.equal(result.result, "VERIFIED");
  assert.equal(result.blockchain.confirmed, true);
});

test("unknown database and blockchain credential is UNKNOWN", async () => {
  const { verifyCredentialState } = loadService({ blockchain: { exists: false, revoked: false } });
  assert.equal((await verifyCredentialState({ credential: null, certificateHash: HASH })).result, "UNKNOWN");
});

test("unknown database credential with on-chain proof is inconsistent", async () => {
  const { verifyCredentialState } = loadService();
  assert.equal((await verifyCredentialState({ credential: null, certificateHash: HASH })).result, "SYSTEM_INCONSISTENCY");
});

test("revoked database credential is REVOKED", async () => {
  const { verifyCredentialState } = loadService();
  assert.equal((await verifyCredentialState({ credential: { ...baseCredential, status: "revoked" }, certificateHash: HASH })).result, "REVOKED");
});

test("blockchain revocation is REVOKED", async () => {
  const { verifyCredentialState } = loadService({ blockchain: { exists: true, revoked: true } });
  assert.equal((await verifyCredentialState({ credential: baseCredential, certificateHash: HASH })).result, "REVOKED");
});

test("pending credential without blockchain proof is PENDING", async () => {
  const { verifyCredentialState } = loadService({ blockchain: { exists: false, revoked: false } });
  assert.equal((await verifyCredentialState({ credential: { ...baseCredential, status: "pending", blockchain_tx: null }, certificateHash: HASH })).result, "PENDING");
});

test("failed credential without blockchain proof is FAILED", async () => {
  const { verifyCredentialState } = loadService({ blockchain: { exists: false, revoked: false } });
  assert.equal((await verifyCredentialState({ credential: { ...baseCredential, status: "failed" }, certificateHash: HASH })).result, "FAILED");
});

test("active credential missing IPFS CID is inconsistent", async () => {
  const { verifyCredentialState } = loadService();
  assert.equal((await verifyCredentialState({ credential: { ...baseCredential, ipfs_cid: null }, certificateHash: HASH })).result, "SYSTEM_INCONSISTENCY");
});

test("student number masking hides the middle", () => {
  const { maskStudentNumber } = require("../backend/utils/maskStudentNumber");
  const masked = maskStudentNumber("R227678G");
  assert.notEqual(masked, "R227678G");
  assert.equal(masked.startsWith("R22"), true);
  assert.equal(masked.endsWith("8G"), true);
});

const loadController = (overrides = {}) => {
  const paths = {
    model: require.resolve("../backend/models/verificationModel"),
    audit: require.resolve("../backend/models/auditModel"),
    service: require.resolve("../backend/services/verificationService"),
    hash: require.resolve("../backend/utils/fileHash"),
    controller: require.resolve("../backend/controllers/verificationController"),
  };
  const state = { logs: [], audits: [] };
  const model = {
    findCredentialByHashForVerification: async () => baseCredential,
    findCredentialByIdForVerification: async () => baseCredential,
    findCredentialByPublicToken: async () => baseCredential,
    createVerificationLog: async (entry) => state.logs.push(entry),
    ...overrides.model,
  };
  require.cache[paths.model] = { id: paths.model, filename: paths.model, loaded: true, exports: model };
  require.cache[paths.audit] = { id: paths.audit, filename: paths.audit, loaded: true, exports: { createAuditLog: async (entry) => state.audits.push(entry) } };
  require.cache[paths.service] = { id: paths.service, filename: paths.service, loaded: true, exports: { verifyCredentialState: async ({ credential }) => ({ result: credential ? "VERIFIED" : "UNKNOWN", credential, blockchain: { exists: Boolean(credential), revoked: false }, ipfs: { cidPresent: Boolean(credential), available: true }, verificationTime: new Date().toISOString() }), ...overrides.service } };
  require.cache[paths.hash] = { id: paths.hash, filename: paths.hash, loaded: true, exports: { generateFileHash: async () => HASH } };
  delete require.cache[paths.controller];
  return { controller: require(paths.controller), state };
};

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});
const request = (extra = {}) => ({ params: {}, body: {}, ip: "127.0.0.1", get: () => "test-agent", ...extra });

test("valid hash lookup returns verified and creates log", async () => {
  const { controller, state } = loadController();
  const res = response();
  await controller.verifyHash(request({ params: { hash: HASH } }), res);
  assert.equal(res.body.data.result, "VERIFIED");
  assert.equal(state.logs[0].verificationMethod, "hash");
});

test("invalid hash is rejected", async () => {
  const { controller } = loadController();
  const res = response();
  await controller.verifyHash(request({ params: { hash: "bad" } }), res);
  assert.equal(res.statusCode, 400);
});

test("credential ID lookup works", async () => {
  const { controller } = loadController();
  const res = response();
  await controller.verifyCredentialId(request({ params: { id: ID } }), res);
  assert.equal(res.body.data.result, "VERIFIED");
});

test("public token lookup works", async () => {
  const { controller } = loadController();
  const res = response();
  await controller.verifyPublicToken(request({ params: { publicToken: TOKEN } }), res);
  assert.equal(res.body.data.result, "VERIFIED");
});

test("unknown public token returns UNKNOWN and logs attempt", async () => {
  const { controller, state } = loadController({ model: { findCredentialByPublicToken: async () => null } });
  const res = response();
  await controller.verifyPublicToken(request({ params: { publicToken: TOKEN } }), res);
  assert.equal(res.body.data.result, "UNKNOWN");
  assert.equal(state.logs[0].credentialId, undefined);
});

test("missing file is rejected", async () => {
  const { controller } = loadController();
  const res = response();
  await controller.verifyFile(request(), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "INVALID_FILE");
});

test("invalid PDF signature is rejected, logged, and cleaned", async () => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "zsvp-verify-"));
  const filePath = path.join(directory, "invalid.pdf");
  await fs.promises.writeFile(filePath, "not pdf");
  const { controller, state } = loadController();
  const res = response();
  await controller.verifyFile(request({ file: { path: filePath } }), res);
  assert.equal(res.statusCode, 422);
  assert.equal(state.logs[0].resultCode, "INVALID_FILE");
  assert.equal(fs.existsSync(filePath), false);
  await fs.promises.rm(directory, { recursive: true });
});

test("valid PDF is hashed, verified, logged, and cleaned", async () => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "zsvp-verify-"));
  const filePath = path.join(directory, "valid.pdf");
  await fs.promises.writeFile(filePath, "%PDF-1.4\n%%EOF");
  const { controller, state } = loadController();
  const res = response();
  await controller.verifyFile(request({ file: { path: filePath }, body: {} }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.result, "VERIFIED");
  assert.equal(state.logs[0].uploadedHash, HASH);
  assert.equal(fs.existsSync(filePath), false);
  await fs.promises.rm(directory, { recursive: true });
});

test("public verification limiter returns 429 after configured limit", async () => {
  const { buildLimiter } = require("../backend/middleware/verificationRateLimit");
  const app = express();
  app.set("trust proxy", false);
  app.get("/limited", buildLimiter(2), (req, res) => res.json({ success: true }));
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  try {
    const port = server.address().port;
    assert.equal((await fetch(`http://127.0.0.1:${port}/limited`)).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${port}/limited`)).status, 200);
    const limited = await fetch(`http://127.0.0.1:${port}/limited`);
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).code, "RATE_LIMIT_EXCEEDED");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
