const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const VALID_CID = "QmYwAPJzv5CZsnAzt8auVZRnGNiT1U6d1pXCVQaWnLYPJe";
const originalEnvironment = { ...process.env };
const originalFetch = global.fetch;

const configureIpfs = () => {
  process.env.IPFS_PROVIDER = "pinata";
  process.env.PINATA_JWT = "test-jwt-never-sent";
  process.env.PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";
  process.env.IPFS_UPLOAD_TIMEOUT_MS = "50";
  process.env.IPFS_MAX_RETRIES = "3";
};

const makePdf = async (contents = "%PDF-1.4\n%%EOF") => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "zsvp-ipfs-test-"));
  const filePath = path.join(directory, "certificate.pdf");
  await fs.promises.writeFile(filePath, contents);
  return { directory, filePath };
};

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

test.afterEach(() => {
  process.env = { ...originalEnvironment };
  global.fetch = originalFetch;
});

test("CID validation accepts CIDv0 and rejects malformed input", () => {
  const { validateCid } = require("../backend/services/ipfsService");
  assert.equal(validateCid(VALID_CID), true);
  assert.equal(validateCid("not-a-cid"), false);
  assert.equal(validateCid(` ${VALID_CID}`), false);
});

test("missing Pinata JWT fails safely", async () => {
  delete process.env.PINATA_JWT;
  const { uploadFileToIPFS } = require("../backend/services/ipfsService");
  await assert.rejects(() => uploadFileToIPFS("missing.pdf"), { code: "IPFS_CONFIGURATION_ERROR" });
});

test("valid PDF bytes are uploaded and pin confirmation is returned", async () => {
  configureIpfs();
  const fixture = await makePdf();
  let calls = 0;
  global.fetch = async (url, options) => {
    calls += 1;
    if (calls === 1) {
      assert.equal(options.method, "POST");
      assert.match(options.headers.Authorization, /^Bearer /);
      return jsonResponse({ IpfsHash: VALID_CID });
    }
    assert.match(String(url), /pinList/);
    return jsonResponse({ rows: [{ ipfs_pin_hash: VALID_CID }] });
  };
  const { uploadFileToIPFS } = require("../backend/services/ipfsService");
  const result = await uploadFileToIPFS(fixture.filePath, {
    credentialId: "safe-id",
    institutionId: "institution-id",
    studentNumber: "ST-1",
    qualification: "Degree",
    issueDate: "2026-08-03",
    certificateHash: "a".repeat(64),
  });
  assert.equal(result.cid, VALID_CID);
  assert.equal(result.pinned, true);
  assert.equal(result.provider, "pinata");
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("Pinata authentication failure is not retried", async () => {
  configureIpfs();
  const fixture = await makePdf();
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return jsonResponse({}, 401);
  };
  const { uploadFileToIPFS } = require("../backend/services/ipfsService");
  await assert.rejects(() => uploadFileToIPFS(fixture.filePath), { code: "IPFS_HTTP_401" });
  assert.equal(calls, 1);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("transient Pinata failures are retried", async () => {
  configureIpfs();
  const fixture = await makePdf();
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls < 3) return jsonResponse({}, 503);
    if (calls === 3) return jsonResponse({ IpfsHash: VALID_CID });
    return jsonResponse({ rows: [{ ipfs_pin_hash: VALID_CID }] });
  };
  const { uploadFileToIPFS } = require("../backend/services/ipfsService");
  const result = await uploadFileToIPFS(fixture.filePath);
  assert.equal(result.cid, VALID_CID);
  assert.equal(calls, 4);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("Pinata timeout becomes a controlled unavailable error", async () => {
  configureIpfs();
  process.env.IPFS_MAX_RETRIES = "1";
  const fixture = await makePdf();
  global.fetch = async (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(options.signal.reason));
  });
  const { uploadFileToIPFS } = require("../backend/services/ipfsService");
  await assert.rejects(() => uploadFileToIPFS(fixture.filePath), { code: "IPFS_TIMEOUT" });
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("invalid provider CID is rejected", async () => {
  configureIpfs();
  const fixture = await makePdf();
  global.fetch = async () => jsonResponse({ IpfsHash: "invalid" });
  const { uploadFileToIPFS } = require("../backend/services/ipfsService");
  await assert.rejects(() => uploadFileToIPFS(fixture.filePath), { code: "IPFS_INVALID_CID" });
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("upload middleware rejects invalid extension and MIME type", async () => {
  const { fileFilter } = require("../backend/middleware/uploadMiddleware");
  const invoke = (file) => new Promise((resolve) => fileFilter({}, file, (error, accepted) => resolve({ error, accepted })));
  assert.match((await invoke({ originalname: "bad.txt", mimetype: "application/pdf" })).error.message, /Only PDF/);
  assert.match((await invoke({ originalname: "bad.pdf", mimetype: "text/plain" })).error.message, /Only PDF/);
  assert.equal((await invoke({ originalname: "good.pdf", mimetype: "application/pdf" })).accepted, true);
});

test("upload middleware has a finite configured size limit", () => {
  const {
    certificateFileSizeLimit,
    uploadDirectory,
  } = require("../backend/middleware/uploadMiddleware");
  assert.equal(Number.isSafeInteger(certificateFileSizeLimit), true);
  assert.equal(certificateFileSizeLimit > 0, true);
  assert.equal(fs.statSync(uploadDirectory).isDirectory(), true);
});

const loadControllerWithMocks = (overrides = {}) => {
  const paths = {
    credential: require.resolve("../backend/models/credentialModel"),
    student: require.resolve("../backend/models/studentModel"),
    institution: require.resolve("../backend/models/institutionModel"),
    hash: require.resolve("../backend/utils/fileHash"),
    ipfs: require.resolve("../backend/services/ipfsService"),
    audit: require.resolve("../backend/models/auditModel"),
    blockchain: require.resolve("../backend/services/blockchainService"),
    controller: require.resolve("../backend/controllers/credentialController"),
  };
  const state = { failed: null, audits: [], ipfsCid: null };
  const mocks = {
    credential: {
      createCredential: async () => ({}),
      createProcessingCredential: async (data) => ({ id: "credential-id", ...data, status: "processing" }),
      updateCredentialIpfsData: async (id, cid) => {
        state.ipfsCid = cid;
        return { id, ipfs_cid: cid, status: "pending" };
      },
      activateCredential: async (id, result) => ({ id, ipfs_cid: VALID_CID, blockchain_tx: result.transactionHash, status: "active" }),
      markCredentialFailed: async (id, error) => { state.failed = { id, error }; },
      getCredentialById: async () => null,
      getAllCredentials: async () => [],
      getCredentialsByInstitution: async () => [],
      findCredentialByHash: async () => null,
      ...overrides.credential,
    },
    student: { getStudentById: async () => ({ id: "student-id", institution_id: "institution-id", student_number: "ST-1" }), ...overrides.student },
    institution: { getInstitutionById: async () => ({ id: "institution-id", status: true }), ...overrides.institution },
    hash: { generateFileHash: async () => "a".repeat(64), ...overrides.hash },
    ipfs: { uploadFileToIPFS: async () => ({ cid: VALID_CID, provider: "pinata", pinned: true, gatewayUrl: `https://gateway/${VALID_CID}` }), ...overrides.ipfs },
    audit: { createAuditLog: async (entry) => { state.audits.push(entry); }, ...overrides.audit },
    blockchain: {
      issueCredentialOnChain: async (hash, options) => {
        await options.onSubmitted({ transactionHash: `0x${"1".repeat(64)}` });
        return {
          transactionHash: `0x${"1".repeat(64)}`,
          blockNumber: 1,
          network: "hardhat",
          contractAddress: "0x0000000000000000000000000000000000000001",
          confirmed: true,
        };
      },
      ...overrides.blockchain,
    },
  };
  for (const key of ["credential", "student", "institution", "hash", "ipfs", "audit", "blockchain"]) {
    require.cache[paths[key]] = { id: paths[key], filename: paths[key], loaded: true, exports: mocks[key] };
  }
  delete require.cache[paths.controller];
  return { controller: require(paths.controller), state };
};

const invokeIssue = async (controller, request) => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await controller.issueCredential({
    body: {},
    user: { userId: "user-id", role: "issuer", institutionId: "institution-id" },
    ip: "127.0.0.1",
    get: () => "test-agent",
    ...request,
  }, response);
  return response;
};

test("missing certificate is rejected", async () => {
  const { controller } = loadControllerWithMocks();
  const response = await invokeIssue(controller, { file: undefined });
  assert.equal(response.statusCode, 400);
});

test("missing credential metadata cleans the temporary file", async () => {
  const fixture = await makePdf();
  const { controller } = loadControllerWithMocks();
  const response = await invokeIssue(controller, { file: { path: fixture.filePath } });
  assert.equal(response.statusCode, 400);
  assert.equal(fs.existsSync(fixture.filePath), false);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("invalid student is rejected and file is cleaned", async () => {
  const fixture = await makePdf();
  const { controller } = loadControllerWithMocks({ student: { getStudentById: async () => null } });
  const response = await invokeIssue(controller, { file: { path: fixture.filePath }, body: { studentId: "x", institutionId: "institution-id", qualification: "Degree", issueDate: "2026-08-03" } });
  assert.equal(response.statusCode, 404);
  assert.equal(fs.existsSync(fixture.filePath), false);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("student institution mismatch is rejected", async () => {
  const fixture = await makePdf();
  const { controller } = loadControllerWithMocks({ student: { getStudentById: async () => ({ institution_id: "other" }) } });
  const response = await invokeIssue(controller, { file: { path: fixture.filePath }, body: { studentId: "x", institutionId: "institution-id", qualification: "Degree", issueDate: "2026-08-03" } });
  assert.equal(response.statusCode, 400);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("inactive institution is rejected", async () => {
  const fixture = await makePdf();
  const { controller } = loadControllerWithMocks({ institution: { getInstitutionById: async () => ({ status: false }) } });
  const response = await invokeIssue(controller, { file: { path: fixture.filePath }, body: { studentId: "x", institutionId: "institution-id", qualification: "Degree", issueDate: "2026-08-03" } });
  assert.equal(response.statusCode, 422);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("invalid PDF signature is rejected", async () => {
  const fixture = await makePdf("plain text");
  const { controller } = loadControllerWithMocks();
  const response = await invokeIssue(controller, { file: { path: fixture.filePath }, body: { studentId: "x", institutionId: "institution-id", qualification: "Degree", issueDate: "2026-08-03" } });
  assert.equal(response.statusCode, 422);
  assert.equal(fs.existsSync(fixture.filePath), false);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("duplicate certificate hash is rejected", async () => {
  const fixture = await makePdf();
  const { controller } = loadControllerWithMocks({ credential: { findCredentialByHash: async () => ({ id: "duplicate" }) } });
  const response = await invokeIssue(controller, { file: { path: fixture.filePath, originalname: "x.pdf", size: 10 }, body: { studentId: "x", institutionId: "institution-id", qualification: "Degree", issueDate: "2026-08-03" } });
  assert.equal(response.statusCode, 409);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("successful mocked IPFS and blockchain workflow activates record and removes temp file", async () => {
  const fixture = await makePdf();
  const { controller, state } = loadControllerWithMocks();
  const response = await invokeIssue(controller, { file: { path: fixture.filePath, originalname: "x.pdf", size: 10 }, body: { studentId: "x", institutionId: "institution-id", qualification: "Degree", issueDate: "2026-08-03" } });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.credential.status, "active");
  assert.equal(response.body.credential.ipfs_cid, VALID_CID);
  assert.equal(state.audits.some((entry) => entry.action === "ipfs_upload_success"), true);
  assert.equal(fs.existsSync(fixture.filePath), false);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("IPFS failure marks database record failed, audits failure, and cleans file", async () => {
  const fixture = await makePdf();
  const providerError = Object.assign(new Error("secret provider detail"), { code: "IPFS_TIMEOUT", statusCode: 503 });
  const { controller, state } = loadControllerWithMocks({ ipfs: { uploadFileToIPFS: async () => { throw providerError; } } });
  const response = await invokeIssue(controller, { file: { path: fixture.filePath, originalname: "x.pdf", size: 10 }, body: { studentId: "x", institutionId: "institution-id", qualification: "Degree", issueDate: "2026-08-03" } });
  assert.equal(response.statusCode, 503);
  assert.equal(state.failed.error, "IPFS_TIMEOUT");
  assert.deepEqual(state.audits.map((entry) => entry.action).sort(), [
    "CERTIFICATE_HASH_GENERATED",
    "CREDENTIAL_FAILED",
    "CREDENTIAL_PROCESSING_STARTED",
    "ipfs_upload_failure",
  ]);
  assert.equal(JSON.stringify(response.body).includes("secret provider detail"), false);
  assert.equal(fs.existsSync(fixture.filePath), false);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("IPFS success and blockchain failure retains CID and marks credential failed", async () => {
  const fixture = await makePdf();
  const blockchainError = Object.assign(new Error("rpc detail"), { code: "BLOCKCHAIN_UNAVAILABLE", statusCode: 503 });
  const { controller, state } = loadControllerWithMocks({ blockchain: { issueCredentialOnChain: async () => { throw blockchainError; } } });
  const response = await invokeIssue(controller, { file: { path: fixture.filePath, originalname: "x.pdf", size: 10 }, body: { studentId: "x", institutionId: "institution-id", qualification: "Degree", issueDate: "2026-08-03" } });
  assert.equal(response.statusCode, 503);
  assert.equal(state.ipfsCid, VALID_CID);
  assert.equal(state.failed.error, "BLOCKCHAIN_UNAVAILABLE");
  assert.equal(state.audits.some((entry) => entry.action === "blockchain_transaction_failed"), true);
  assert.equal(fs.existsSync(fixture.filePath), false);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("confirmed blockchain proof with database activation failure creates recovery audit", async () => {
  const fixture = await makePdf();
  const { controller, state } = loadControllerWithMocks({ credential: { activateCredential: async () => null } });
  const response = await invokeIssue(controller, { file: { path: fixture.filePath, originalname: "x.pdf", size: 10 }, body: { studentId: "x", institutionId: "institution-id", qualification: "Degree", issueDate: "2026-08-03" } });
  assert.equal(response.statusCode, 500);
  assert.equal(state.failed.error, "BLOCKCHAIN_RECONCILIATION_REQUIRED");
  assert.equal(state.audits.some((entry) => entry.action === "blockchain_reconciliation_required"), true);
  assert.equal(fs.existsSync(fixture.filePath), false);
  await fs.promises.rm(fixture.directory, { recursive: true });
});

test("credential routes remain protected without a bearer token", () => {
  const { authenticate } = require("../backend/middleware/authMiddleware");
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let nextCalled = false;
  authenticate({ headers: {} }, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.success, false);
  assert.equal(nextCalled, false);
});

test("existing authentication, institution, student, and credential routers load", () => {
  for (const route of ["authRoutes", "institutionRoutes", "studentRoutes", "credentialRoutes"]) {
    const router = require(`../backend/routes/${route}`);
    assert.equal(typeof router, "function");
  }
});
