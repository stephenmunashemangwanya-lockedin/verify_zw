const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zsvp-chain-config-"));
const metadataPath = path.join(directory, "CredentialRegistry.json");
test.after(() => fs.rmSync(directory, { recursive: true, force: true }));

const { getBlockchainConfig } = require("../backend/config/blockchain");
const { convertSha256HashToBytes32 } = require("../backend/services/blockchainService");

const originalEnvironment = { ...process.env };
const validEnvironment = () => {
  process.env.BLOCKCHAIN_ENABLED = "true";
  process.env.BLOCKCHAIN_NETWORK = "localhost";
  process.env.BLOCKCHAIN_RPC_URL = "http://127.0.0.1:8545";
  process.env.BLOCKCHAIN_CHAIN_ID = "31337";
  process.env.CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000001";
  process.env.LOCAL_DEPLOYMENT_PATH = metadataPath;
  fs.writeFileSync(metadataPath, JSON.stringify({ network: "localhost", chainId: 31337, contractAddress: process.env.CONTRACT_ADDRESS }));
  process.env.DEPLOYER_PRIVATE_KEY = `0x${"1".repeat(64)}`;
};

test.afterEach(() => { process.env = { ...originalEnvironment }; });

test("valid local blockchain configuration is parsed safely", () => {
  validEnvironment();
  const config = getBlockchainConfig();
  assert.equal(config.chainId, 31337);
  assert.equal(config.network, "localhost");
  assert.equal(Object.keys(config).includes("privateKey"), true);
});

test("Docker internal blockchain RPC is allowed for the local network", () => {
  validEnvironment();
  process.env.BLOCKCHAIN_RPC_URL = "http://blockchain:8545";
  const config = getBlockchainConfig({ requireSigner: false });
  assert.equal(config.rpcUrl, "http://blockchain:8545");
});

test("unsupported blockchain network is rejected", () => {
  validEnvironment();
  process.env.BLOCKCHAIN_NETWORK = "mainnet";
  assert.throws(() => getBlockchainConfig(), { code: "BLOCKCHAIN_CONFIGURATION_ERROR" });
});

test("invalid external private key is rejected", () => {
  validEnvironment();
  process.env.BLOCKCHAIN_NETWORK = "sepolia";
  process.env.BLOCKCHAIN_RPC_URL = "https://rpc.example.test";
  process.env.BLOCKCHAIN_CHAIN_ID = "11155111";
  process.env.DEPLOYER_PRIVATE_KEY = "invalid";
  assert.throws(() => getBlockchainConfig(), { code: "BLOCKCHAIN_CONFIGURATION_ERROR" });
});

test("invalid explicit external contract address is rejected", () => {
  validEnvironment();
  process.env.BLOCKCHAIN_NETWORK = "sepolia";
  process.env.BLOCKCHAIN_RPC_URL = "https://rpc.example.test";
  process.env.BLOCKCHAIN_CHAIN_ID = "11155111";
  process.env.CONTRACT_ADDRESS = "invalid";
  assert.throws(() => getBlockchainConfig(), { code: "BLOCKCHAIN_CONFIGURATION_ERROR" });
});

test("SHA-256 digest is represented directly as bytes32", () => {
  const digest = "ab".repeat(32);
  assert.equal(convertSha256HashToBytes32(digest), `0x${digest}`);
});

test("invalid certificate hashes are rejected", () => {
  assert.throws(() => convertSha256HashToBytes32("abc"), { code: "INVALID_CERTIFICATE_HASH" });
});
