const test = require("node:test");
const assert = require("node:assert/strict");

const { getBlockchainConfig } = require("../backend/config/blockchain");
const { convertSha256HashToBytes32 } = require("../backend/services/blockchainService");

const originalEnvironment = { ...process.env };
const validEnvironment = () => {
  process.env.BLOCKCHAIN_ENABLED = "true";
  process.env.BLOCKCHAIN_NETWORK = "localhost";
  process.env.BLOCKCHAIN_RPC_URL = "http://127.0.0.1:8545";
  process.env.BLOCKCHAIN_CHAIN_ID = "31337";
  process.env.CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000001";
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

test("invalid private key is rejected", () => {
  validEnvironment();
  process.env.DEPLOYER_PRIVATE_KEY = "invalid";
  assert.throws(() => getBlockchainConfig(), { code: "BLOCKCHAIN_CONFIGURATION_ERROR" });
});

test("invalid contract address is rejected", () => {
  validEnvironment();
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
