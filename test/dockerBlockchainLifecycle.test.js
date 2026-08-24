const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { inspectLocalDeployment, safeDeploymentRecord } = require("../scripts/localDeploymentLifecycle");
const { loadActiveLocalDeployment } = require("../scripts/startDockerBackend");

const address = "0x0000000000000000000000000000000000000001";
const metadata = { network: "localhost", chainId: 31337, contractAddress: address };

test("absent deployment metadata requires deployment", async () => {
  assert.deepEqual(await inspectLocalDeployment({ deployment: null, networkName: "localhost", chainId: 31337, provider: {} }), { reusable: false, reason: "metadata_absent" });
});
test("matching metadata with bytecode is reusable and idempotent", async () => {
  const result = await inspectLocalDeployment({ deployment: metadata, networkName: "localhost", chainId: 31337, provider: { getCode: async () => "0x6000" } });
  assert.equal(result.reusable, true); assert.equal(result.deployment, metadata);
});
test("stale local metadata requires redeployment", async () => {
  const result = await inspectLocalDeployment({ deployment: metadata, networkName: "localhost", chainId: 31337, provider: { getCode: async () => "0x" } });
  assert.deepEqual(result, { reusable: false, reason: "contract_missing" });
});
test("metadata for another chain is never reused", async () => {
  const result = await inspectLocalDeployment({ deployment: metadata, networkName: "localhost", chainId: 31338, provider: {} });
  assert.deepEqual(result, { reusable: false, reason: "wrong_chain" });
});
test("non-local deployment metadata is never automatically replaced", async () => {
  const result = await inspectLocalDeployment({ deployment: metadata, networkName: "sepolia", chainId: 11155111, provider: {} });
  assert.deepEqual(result, { reusable: false, reason: "non_local_metadata" });
});
test("deployment metadata contains no private key", () => {
  const record = safeDeploymentRecord({ ...metadata, privateKey: `0x${"1".repeat(64)}` });
  assert.equal(Object.hasOwn(record, "privateKey"), false);
});
test("backend accepts active deployment metadata and returns its address", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zsvp-deployment-"));
  const deploymentPath = path.join(directory, "CredentialRegistry.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(metadata));
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => ({ ok: true, json: async () => ({ result: JSON.parse(options.body).method === "eth_chainId" ? "0x7a69" : "0x6000" }) });
  try { assert.equal((await loadActiveLocalDeployment({ deploymentPath, rpcUrl: "http://blockchain:8545", expectedChainId: 31337 })).contractAddress, address); }
  finally { global.fetch = originalFetch; fs.rmSync(directory, { recursive: true, force: true }); }
});
test("startup RPC failures identify blockchain without exposing its URL", async () => { const { rpc }=require("../scripts/startDockerBackend");const secretUrl="http://user:secret@blockchain:8545";await assert.rejects(()=>rpc(secretUrl,"eth_chainId",[],{fetchImpl:async()=>{throw Object.assign(new Error("fetch failed"),{name:"TypeError"})},timeoutMs:10}),error=>error.code==="BLOCKCHAIN_RPC_UNAVAILABLE"&&error.dependency==="blockchain"&&!error.message.includes(secretUrl));await assert.rejects(()=>rpc(secretUrl,"eth_getCode",[],{fetchImpl:async()=>{throw Object.assign(new Error("aborted"),{name:"TimeoutError"})},timeoutMs:10}),error=>error.code==="BLOCKCHAIN_RPC_TIMEOUT"&&/eth_getCode timed out/.test(error.message)&&!error.message.includes(secretUrl));});
