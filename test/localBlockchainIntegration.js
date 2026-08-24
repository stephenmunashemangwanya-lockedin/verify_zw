const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { ContractFactory, JsonRpcProvider, Wallet, isAddress } = require("ethers");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

let localNode = null;

const waitForLocalNode = async (provider, privateKeyState) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const network = await provider.getNetwork();
      if (Number(network.chainId) === 31337 && privateKeyState.value) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Local Hardhat node did not become ready.");
};

const prepareIsolatedLocalDeployment = async () => {
  const provider = new JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  try {
    await provider.getNetwork();
    const recordPath = path.resolve(__dirname, "../deployments/localhost/CredentialRegistry.json");
    if (!fs.existsSync(recordPath)) throw new Error("No localhost deployment record exists.");
    const record = JSON.parse(await fs.promises.readFile(recordPath, "utf8"));
    if (!isAddress(record.contractAddress) || await provider.getCode(record.contractAddress) === "0x") throw new Error("The localhost deployment record is not deployed on the running node.");
    if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error("A running external node requires its local test signer to be configured.");
    process.env.CONTRACT_ADDRESS = record.contractAddress;
    return { contractAddress: record.contractAddress, deploymentSource: recordPath };
  } catch (error) {
    if (!String(error.message).includes("connect") && !String(error.code).includes("ECONNREFUSED")) throw error;
  }

  const privateKeyState = { value: null };
  const hardhatCli = require.resolve("hardhat/internal/cli/cli.js");
  localNode = spawn(process.execPath, [hardhatCli, "node"], { cwd: path.resolve(__dirname, ".."), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const inspectOutput = (chunk) => {
    const match = chunk.toString().match(/Private Key:\s*(0x[0-9a-fA-F]{64})/);
    if (match && !privateKeyState.value) privateKeyState.value = match[1];
  };
  localNode.stdout.on("data", inspectOutput);
  localNode.stderr.on("data", inspectOutput);
  await waitForLocalNode(provider, privateKeyState);
  process.env.DEPLOYER_PRIVATE_KEY = privateKeyState.value;
  const artifact = require("../artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json");
  const signer = new Wallet(privateKeyState.value, provider);
  const contract = await new ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(signer.address);
  await contract.waitForDeployment();
  process.env.CONTRACT_ADDRESS = await contract.getAddress();
  return { contractAddress: process.env.CONTRACT_ADDRESS, deploymentSource: "isolated test deployment" };
};

(async () => {
  const deployment = await prepareIsolatedLocalDeployment();
  const {
    getSigner, authoriseInstitution, issueCredentialOnChain,
    verifyCredentialOnChain, validateBlockchainConnection,
    getTransactionReceipt, validateExpectedNetwork,
  } = require("../backend/services/blockchainService");
  const rpcUrl = new URL(process.env.BLOCKCHAIN_RPC_URL);
  console.log("Local blockchain configuration:", {
    network: process.env.BLOCKCHAIN_NETWORK?.toLowerCase(),
    rpcHostname: rpcUrl.hostname,
    rpcPort: rpcUrl.port || (rpcUrl.protocol === "https:" ? "443" : "80"),
    chainId: process.env.BLOCKCHAIN_CHAIN_ID,
    ...(process.env.CONTRACT_ADDRESS
      ? { contractAddress: process.env.CONTRACT_ADDRESS }
      : {}),
  });
  console.log("Local deployment source:", deployment.deploymentSource);

  const connection = await validateBlockchainConnection();
  const expectedChainId = process.env.BLOCKCHAIN_CHAIN_ID;
  process.env.BLOCKCHAIN_CHAIN_ID = "1";
  await assert.rejects(() => validateExpectedNetwork(), { code: "BLOCKCHAIN_WRONG_NETWORK" });
  process.env.BLOCKCHAIN_CHAIN_ID = expectedChainId;
  const signerAddress = await getSigner().getAddress();
  const authorisation = await authoriseInstitution(signerAddress);
  const certificateHash = "4f7e7a946f8e9f1a61a4e23d7c8af82cbd02f70d21ed83c8e0e7c844c3c7c951";
  const existing = await verifyCredentialOnChain(certificateHash);
  const issuance = existing.exists
    ? null
    : await issueCredentialOnChain(certificateHash, { expectedInstitutionWallet: signerAddress });
  const proof = await verifyCredentialOnChain(certificateHash);

  assert.equal(connection.connected, true);
  assert.equal(proof.exists, true);
  assert.equal(proof.revoked, false);
  assert.equal(proof.issuer, signerAddress);
  if (issuance) {
    const receipt = await getTransactionReceipt(issuance.transactionHash);
    assert.equal(receipt.status, 1);
    assert.equal(issuance.confirmed, true);
    assert.equal(issuance.blockNumber, receipt.blockNumber);
  }

  // Drive the production controller with real local-chain calls while IPFS and
  // persistence remain isolated. SQL parameter/storage behavior is covered by
  // credentialBlockchainModel.test.js.
  const controllerHash = "9b3e2f4e115d7a5b8b8f7cf735c03f7d4df4bcbc56a0a041e49a599351ed2ce8";
  const fixtureDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "zsvp-chain-e2e-"));
  const fixturePath = path.join(fixtureDirectory, "certificate.pdf");
  await fs.promises.writeFile(fixturePath, "%PDF-1.4\nlocal blockchain test\n%%EOF");
  const auditEntries = [];
  const credentialModelPath = require.resolve("../backend/models/credentialModel");
  const studentModelPath = require.resolve("../backend/models/studentModel");
  const institutionModelPath = require.resolve("../backend/models/institutionModel");
  const hashPath = require.resolve("../backend/utils/fileHash");
  const ipfsPath = require.resolve("../backend/services/ipfsService");
  const auditPath = require.resolve("../backend/models/auditModel");
  const controllerPath = require.resolve("../backend/controllers/credentialController");
  require.cache[credentialModelPath] = { id: credentialModelPath, filename: credentialModelPath, loaded: true, exports: {
    createCredential: async () => ({}),
    createProcessingCredential: async (data) => ({ id: "isolated-credential", ...data, status: "processing" }),
    updateCredentialIpfsData: async (id, cid) => ({ id, ipfs_cid: cid, status: "pending" }),
    activateCredential: async (id, chain) => ({ id, ipfs_cid: "QmYwAPJzv5CZsnAzt8auVZRnGNiT1U6d1pXCVQaWnLYPJe", blockchain_tx: chain.transactionHash, blockchain_network: chain.network, contract_address: chain.contractAddress, block_number: chain.blockNumber, status: "active" }),
    markCredentialFailed: async () => {},
    getCredentialById: async () => null,
    getAllCredentials: async () => [],
    getCredentialsByInstitution: async () => [],
    findCredentialByHash: async () => null,
  } };
  require.cache[studentModelPath] = { id: studentModelPath, filename: studentModelPath, loaded: true, exports: { getStudentById: async () => ({ institution_id: "institution-id", student_number: "LOCAL-1" }) } };
  require.cache[institutionModelPath] = { id: institutionModelPath, filename: institutionModelPath, loaded: true, exports: { getInstitutionById: async () => ({ id: "institution-id", status: true, wallet_address: signerAddress }) } };
  require.cache[hashPath] = { id: hashPath, filename: hashPath, loaded: true, exports: { generateFileHash: async () => controllerHash } };
  require.cache[ipfsPath] = { id: ipfsPath, filename: ipfsPath, loaded: true, exports: { uploadFileToIPFS: async () => ({ cid: "QmYwAPJzv5CZsnAzt8auVZRnGNiT1U6d1pXCVQaWnLYPJe", provider: "isolated-test", pinned: true, gatewayUrl: null }) } };
  require.cache[auditPath] = { id: auditPath, filename: auditPath, loaded: true, exports: { createAuditLog: async (entry) => auditEntries.push(entry) } };
  delete require.cache[controllerPath];
  const { issueCredential } = require(controllerPath);
  const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await issueCredential({
    body: { studentId: "student-id", institutionId: "institution-id", qualification: "Local Test", issueDate: "2026-08-03" },
    file: { path: fixturePath, originalname: "certificate.pdf", size: 37 },
    user: { userId: "user-id", role: "issuer", institutionId: "institution-id" },
    ip: "127.0.0.1",
    get: () => "local-test",
  }, response);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.credential.status, "active");
  assert.equal(response.body.blockchain.confirmed, true);
  assert.equal(response.body.credential.blockchain_tx, response.body.blockchain.transactionHash);
  assert.equal(fs.existsSync(fixturePath), false);
  assert.equal(auditEntries.some((entry) => entry.action === "credential_activated"), true);
  await fs.promises.rm(fixtureDirectory, { recursive: true });

  const databasePool = require("../backend/config/database");
  const databaseClient = await databasePool.connect();
  let databaseMetadataVerified = false;
  try {
    await databaseClient.query("BEGIN");
    const fixtureRecords = await databaseClient.query(`
      SELECT
        students.id AS student_id,
        students.institution_id,
        users.id AS user_id
      FROM students
      CROSS JOIN users
      LIMIT 1
    `);
    assert.equal(fixtureRecords.rowCount, 1, "Local database fixtures are required");
    const fixtureRecord = fixtureRecords.rows[0];
    const stored = await databaseClient.query(
      `INSERT INTO credentials (
         student_id, institution_id, qualification, issue_date,
         certificate_hash, ipfs_cid, blockchain_tx, blockchain_network,
         contract_address, block_number, status, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11)
       RETURNING certificate_hash, ipfs_cid, blockchain_tx,
         blockchain_network, contract_address, block_number, status`,
      [
        fixtureRecord.student_id,
        fixtureRecord.institution_id,
        "Isolated Local Blockchain Test",
        "2026-08-03",
        controllerHash,
        response.body.credential.ipfs_cid,
        response.body.blockchain.transactionHash,
        response.body.blockchain.network,
        response.body.blockchain.contractAddress,
        response.body.blockchain.blockNumber,
        fixtureRecord.user_id,
      ]
    );
    assert.equal(stored.rows[0].status, "active");
    assert.equal(stored.rows[0].blockchain_tx, response.body.blockchain.transactionHash);
    assert.equal(Number(stored.rows[0].block_number), response.body.blockchain.blockNumber);
    assert.equal(stored.rows[0].contract_address, response.body.blockchain.contractAddress);
    assert.equal(stored.rows[0].blockchain_network, "localhost");
    assert.equal(stored.rows[0].ipfs_cid, response.body.credential.ipfs_cid);
    databaseMetadataVerified = true;
  } finally {
    await databaseClient.query("ROLLBACK");
    databaseClient.release();
    await databasePool.end();
  }

  console.log(JSON.stringify({
    connection,
    signerAddress,
    authorisation,
    issuance,
    proof,
    databaseMetadataVerified,
    controllerIssuance: {
      status: response.body.credential.status,
      transactionHash: response.body.blockchain.transactionHash,
      blockNumber: response.body.blockchain.blockNumber,
      contractAddress: response.body.blockchain.contractAddress,
      network: response.body.blockchain.network,
      proof: await verifyCredentialOnChain(controllerHash),
    },
  }, null, 2));
  if (localNode) localNode.kill();
  process.exit(0);
})().catch((error) => {
  console.error(`Local blockchain integration failed: ${error.message}`);
  if (localNode) localNode.kill();
  process.exit(1);
});
