const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveContractAddress, validateResolvedContract, getBlockchainConfig } = require("../backend/config/blockchain");
const original = { ...process.env };
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zsvp-runtime-"));
const deploymentPath = path.join(directory, "CredentialRegistry.json");
const address = "0x0000000000000000000000000000000000000001";
const otherAddress = "0x0000000000000000000000000000000000000002";
const metadata = { network: "localhost", chainId: 31337, contractAddress: address };
const local = { network: "localhost", chainId: 31337, deploymentPath };
test.beforeEach(() => {
  fs.writeFileSync(deploymentPath, JSON.stringify(metadata));
  Object.assign(process.env, { BLOCKCHAIN_ENABLED: "true", BLOCKCHAIN_NETWORK: "localhost", BLOCKCHAIN_RPC_URL: "http://blockchain:8545", BLOCKCHAIN_CHAIN_ID: "31337", LOCAL_DEPLOYMENT_PATH: deploymentPath });
  delete process.env.CONTRACT_ADDRESS;
  delete process.env.DEPLOYER_PRIVATE_KEY;
});
test.afterEach(() => { process.env = { ...original }; });
test.after(() => fs.rmSync(directory, { recursive: true, force: true }));

test("local runtime resolves metadata without an environment address or signer", () => {
  const config = getBlockchainConfig({ requireSigner: false });
  assert.equal(config.contractAddress, address);
  assert.equal(config.privateKey, null);
});
test("current local metadata wins over stale environment and is reread", () => {
  process.env.CONTRACT_ADDRESS = otherAddress;
  assert.equal(getBlockchainConfig({ requireSigner: false }).contractAddress, address);
  fs.writeFileSync(deploymentPath, JSON.stringify({ ...metadata, contractAddress: otherAddress }));
  assert.equal(getBlockchainConfig({ requireSigner: false }).contractAddress, otherAddress);
});
test("external networks use their explicit address without local metadata", () => {
  fs.unlinkSync(deploymentPath);
  assert.equal(resolveContractAddress({ network: "sepolia", chainId: 11155111, contractAddress: otherAddress, deploymentPath }), otherAddress);
});
test("missing local metadata fails closed rather than using a stale environment address", () => {
  fs.unlinkSync(deploymentPath);
  assert.throws(() => resolveContractAddress({ ...local, contractAddress: otherAddress }), /metadata is missing/);
});
for (const [label, value] of [
  ["invalid JSON", "{"], ["null metadata", "null"],
  ["wrong chain", JSON.stringify({ ...metadata, chainId: 1 })],
  ["wrong network", JSON.stringify({ ...metadata, network: "sepolia" })],
  ["bad address", JSON.stringify({ ...metadata, contractAddress: "invalid" })],
  ["zero address", JSON.stringify({ ...metadata, contractAddress: "0x" + "0".repeat(40) })],
]) test(`${label} is a controlled configuration failure`, () => {
  fs.writeFileSync(deploymentPath, value);
  assert.throws(() => resolveContractAddress(local), { code: "BLOCKCHAIN_CONFIGURATION_ERROR" });
});
test("bytecode validation checks the resolved address and expected chain", async () => {
  let requested;
  await validateResolvedContract({ chainId: 31337, contractAddress: address }, {
    getNetwork: async () => ({ chainId: 31337n }),
    getCode: async value => { requested = value; return "0x6000"; },
  });
  assert.equal(requested, address);
});
test("missing bytecode and wrong chain fail closed", async () => {
  const config = { chainId: 31337, contractAddress: address };
  await assert.rejects(validateResolvedContract(config, { getNetwork: async () => ({ chainId: 31337n }), getCode: async () => "0x" }), { reason: "contract_missing" });
  await assert.rejects(validateResolvedContract(config, { getNetwork: async () => ({ chainId: 1n }), getCode: async () => { throw new Error("must not run"); } }), { reason: "wrong_chain" });
});
test("RPC errors cannot expose their URL or credentials", async () => {
  await assert.rejects(validateResolvedContract({ chainId: 31337, contractAddress: address }, { getNetwork: async () => { throw new Error("sensitive upstream detail"); } }), error => error.code === "BLOCKCHAIN_CONFIGURATION_ERROR" && !error.message.includes("sensitive"));
});
test("local configuration requires no private key; external writes fail closed", () => {
  assert.equal(getBlockchainConfig({ requireSigner: false }).contractAddress, address);
  assert.equal(getBlockchainConfig().privateKey, null);
  Object.assign(process.env, { BLOCKCHAIN_NETWORK: "sepolia", BLOCKCHAIN_CHAIN_ID: "11155111", BLOCKCHAIN_RPC_URL: "https://rpc.example.test", CONTRACT_ADDRESS: address });
  assert.throws(() => getBlockchainConfig(), error => error.code === "BLOCKCHAIN_CONFIGURATION_ERROR" && error.message.includes("DEPLOYER_PRIVATE_KEY"));
});

test("readiness uses metadata without signer and fails on missing contract", async () => {
  const { blockchainHealth } = require("../backend/services/healthService");
  let requested;
  const dependencies = {
    provider: { getNetwork: async () => ({ chainId: 31337n }), getCode: async value => { requested = value; return "0x6000"; } },
    contract: { credentialExists: async () => false },
  };
  assert.equal((await blockchainHealth(dependencies)).status, "healthy");
  assert.equal(requested, address);
  dependencies.provider.getCode = async () => "0x";
  assert.equal((await blockchainHealth(dependencies)).status, "contract_missing");
  fs.unlinkSync(deploymentPath);
  assert.equal((await blockchainHealth(dependencies)).status, "misconfigured");
});

test("authorization, issuance, revocation and reads share metadata resolution", async () => {
  const ethersPath = require.resolve("ethers");
  const actualEthers = require(ethersPath);
  const servicePath = require.resolve("../backend/services/blockchainService");
  const existingService = require.cache[servicePath];
  const calls = [];
  let exists = false;
  const transaction = { hash: "0x" + "a".repeat(64), wait: async () => ({ status: 1, blockNumber: 1 }) };
  class Provider { async listAccounts() { return [{ getAddress: async () => address }]; } async getSigner(value) { calls.push(["rpcSigner", value]); return new Signer(); } async getNetwork() { return { chainId: 31337n }; } async getCode(value) { calls.push(["bytecode", value]); return "0x6000"; } }
  class Signer { async getAddress() { return address; } }
  class Registry {
    constructor(value) { calls.push(["contract", value]); }
    async DEFAULT_ADMIN_ROLE() { return "0x" + "0".repeat(64); }
    async hasRole() { return true; }
    async paused() { return false; }
    async isAuthorisedInstitution() { return true; }
    async authoriseInstitution() { calls.push(["authorise", address]); return transaction; }
    async verifyCredential() { return { exists, revoked: false, issuer: address, issuedAt: 1n, revokedAt: 0n }; }
    async issueCredential() { calls.push(["issue", address]); return transaction; }
    async revokeCredential() { calls.push(["revoke", address]); return transaction; }
  }
  require.cache[ethersPath].exports = { ...actualEthers, JsonRpcProvider: Provider, Wallet: Signer, Contract: Registry };
  delete require.cache[servicePath];
  try {
    const service = require(servicePath);
    Registry.prototype.isAuthorisedInstitution = async () => false;

    assert.equal((await service.authoriseInstitution(otherAddress)).confirmed, true);
    Registry.prototype.isAuthorisedInstitution = async () => true;
    assert.equal((await service.issueCredentialOnChain("b".repeat(64))).confirmed, true);
    exists = true;
    assert.equal((await service.revokeCredentialOnChain("b".repeat(64))).confirmed, true);
    assert.equal((await service.verifyCredentialOnChain("b".repeat(64))).exists, true);
    assert.ok(calls.some(([kind]) => kind === "rpcSigner"));
    assert.ok(calls.some(([kind]) => kind === "issue"));
    assert.ok(calls.some(([kind]) => kind === "revoke"));
    assert.ok(calls.filter(([kind]) => kind === "contract" || kind === "bytecode").every(([, value]) => value === address));
    const { resolveBlockchainSigner } = require("../backend/config/blockchainSigner");
    const localConfig = getBlockchainConfig();
    Registry.prototype.hasRole = async () => false;
    await assert.rejects(resolveBlockchainSigner(localConfig, new Provider()), /No unlocked local RPC account/);
    await assert.rejects(resolveBlockchainSigner(localConfig, { getNetwork: async () => ({ chainId: 1n }) }), /chain 31337/);
    const external = { ...localConfig, network: "sepolia", chainId: 11155111, privateKey: null };
    const noRpcFallback = { getSigner: () => { throw new Error("External RPC fallback forbidden"); }, listAccounts: () => { throw new Error("External account discovery forbidden"); } };
    await assert.rejects(resolveBlockchainSigner(external, noRpcFallback), /requires DEPLOYER_PRIVATE_KEY/);
    assert.ok(await resolveBlockchainSigner({ ...external, privateKey: "0x" + "1".repeat(64) }, noRpcFallback) instanceof Signer);

  } finally {
    require.cache[ethersPath].exports = actualEthers;
    if (existingService) require.cache[servicePath] = existingService; else delete require.cache[servicePath];
  }
});
