const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { requestIdMiddleware } = require("../backend/middleware/securityMiddleware");
const healthRoutes = require("../backend/routes/healthRoutes");

const request = async (path) => { const app = express(); app.use(requestIdMiddleware); app.use("/health", healthRoutes); const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r)); try { const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`); return { status: response.status, body: await response.json() }; } finally { await new Promise((r) => server.close(r)); } };
test("public health route is minimal", async () => { const result = await request("/health"); assert.equal(result.status, 200); assert.deepEqual(result.body, { status: "healthy" }); });
test("liveness route is minimal", async () => { const result = await request("/health/live"); assert.equal(result.status, 200); assert.deepEqual(result.body, { status: "healthy" }); });
test("readiness reports disabled providers as not_configured", async () => { const oldIpfs = process.env.IPFS_ENABLED; const oldChain = process.env.BLOCKCHAIN_ENABLED; process.env.IPFS_ENABLED = "false"; process.env.BLOCKCHAIN_ENABLED = "false"; const health = require("../backend/services/healthService"); const original = require("../backend/config/database").query; require("../backend/config/database").query = async () => ({ rows: [] }); try { const result = await health.readinessHealth(); assert.equal(result.checks.ipfs.status, "not_configured"); assert.equal(result.checks.blockchain.status, "not_configured"); } finally { require("../backend/config/database").query = original; process.env.IPFS_ENABLED = oldIpfs; process.env.BLOCKCHAIN_ENABLED = oldChain; } });
for (const endpoint of ["database", "ipfs", "blockchain"]) test(`detailed ${endpoint} health requires authentication`, async () => { const result = await request(`/health/${endpoint}`); assert.equal(result.status, 401); assert.equal(JSON.stringify(result.body).includes("RPC"), false); assert.equal(JSON.stringify(result.body).includes("password"), false); });
test("disabled IPFS reports not_configured without credentials", async () => { const old = process.env.IPFS_ENABLED; process.env.IPFS_ENABLED = "false"; try { assert.deepEqual(await require("../backend/services/healthService").ipfsHealth(), { status: "not_configured" }); } finally { process.env.IPFS_ENABLED = old; } });
test("disabled blockchain reports not_configured without RPC details", async () => { const old = process.env.BLOCKCHAIN_ENABLED; process.env.BLOCKCHAIN_ENABLED = "false"; try { assert.deepEqual(await require("../backend/services/healthService").blockchainHealth(), { status: "not_configured" }); } finally { process.env.BLOCKCHAIN_ENABLED = old; } });

const blockchainConfig = { network: "localhost", rpcUrl: "http://blockchain:8545", chainId: 31337, contractAddress: "0x0000000000000000000000000000000000000001" };
const withBlockchainEnabled = async (callback) => { const old = process.env.BLOCKCHAIN_ENABLED; process.env.BLOCKCHAIN_ENABLED = "true"; try { await callback(); } finally { process.env.BLOCKCHAIN_ENABLED = old; } };
test("blockchain readiness is healthy only after bytecode and a safe contract read", () => withBlockchainEnabled(async () => {
  const result = await require("../backend/services/healthService").blockchainHealth({ getConfig: () => blockchainConfig, provider: { getNetwork: async () => ({ chainId: 31337n }), getCode: async () => "0x6000" }, contract: { credentialExists: async () => false } });
  assert.equal(result.status, "healthy");
}));
test("blockchain readiness reports contract_missing for empty bytecode", () => withBlockchainEnabled(async () => {
  const result = await require("../backend/services/healthService").blockchainHealth({ getConfig: () => blockchainConfig, provider: { getNetwork: async () => ({ chainId: 31337n }), getCode: async () => "0x" } });
  assert.equal(result.status, "contract_missing");
}));
test("blockchain readiness reports wrong_chain", () => withBlockchainEnabled(async () => {
  const result = await require("../backend/services/healthService").blockchainHealth({ getConfig: () => blockchainConfig, provider: { getNetwork: async () => ({ chainId: 1n }) } });
  assert.equal(result.status, "wrong_chain");
}));
test("blockchain readiness reports unavailable without leaking RPC errors", () => withBlockchainEnabled(async () => {
  const result = await require("../backend/services/healthService").blockchainHealth({ getConfig: () => blockchainConfig, provider: { getNetwork: async () => { throw new Error("secret RPC token"); } } });
  assert.equal(result.status, "unavailable"); assert.equal(JSON.stringify(result).includes("secret"), false);
}));
test("blockchain readiness reports misconfigured separately", () => withBlockchainEnabled(async () => {
  const result = await require("../backend/services/healthService").blockchainHealth({ getConfig: () => { throw new Error("bad config"); } });
  assert.deepEqual(result, { status: "misconfigured" });
}));

test("graceful shutdown closes HTTP and PostgreSQL exactly once", async () => {
  const paths = { server: require.resolve("../backend/server"), pool: require.resolve("../backend/config/database"), environment: require.resolve("../backend/config/environment"), app: require.resolve("../backend/app"), logger: require.resolve("../backend/utils/logger") };
  Object.values(paths).forEach((path) => delete require.cache[path]);
  const state = { httpClose: 0, poolClose: 0 };
  const fakeServer = { close(callback) { state.httpClose += 1; callback(); } };
  require.cache[paths.pool] = { id: paths.pool, filename: paths.pool, loaded: true, exports: { end: async () => { state.poolClose += 1; } } };
  require.cache[paths.environment] = { id: paths.environment, filename: paths.environment, loaded: true, exports: { validateEnvironment: () => ({ port: 3000 }) } };
  require.cache[paths.app] = { id: paths.app, filename: paths.app, loaded: true, exports: { createApp: () => ({ listen: (_port, callback) => { callback(); return fakeServer; } }) } };
  require.cache[paths.logger] = { id: paths.logger, filename: paths.logger, loaded: true, exports: { log: () => {} } };
  const server = require(paths.server); await server.startServer(); await Promise.all([server.shutdown("SIGTERM"), server.shutdown("SIGINT")]);
  assert.deepEqual(state, { httpClose: 1, poolClose: 1 });
  Object.values(paths).forEach((path) => delete require.cache[path]);
});
