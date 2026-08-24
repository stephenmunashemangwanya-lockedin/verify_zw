const pool = require("../config/database");
const { getIpfsConfig } = require("../config/ipfs");
const { getBlockchainConfig } = require("../config/blockchain");
const fs = require("fs");
const path = require("path");
const { sendAlert } = require("./alertService");
const registryAbi = require("../blockchain/CredentialRegistry.abi.json");

const timeout = (promise, milliseconds = 2000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("Health check timed out."), { code: "HEALTH_TIMEOUT" })), milliseconds)),
]);

const databaseHealth = async () => {
  try { await timeout(pool.query("SELECT 1")); return { status: "healthy" }; }
  catch { await sendAlert("database_unavailable"); return { status: "unavailable" }; }
};
const ipfsHealth = async () => {
  if (process.env.IPFS_ENABLED === "false") return { status: "not_configured" };
  try { getIpfsConfig(); return { status: "healthy", provider: "pinata" }; }
  catch { return { status: process.env.PINATA_JWT ? "degraded" : "not_configured" }; }
};
const blockchainHealth = async (dependencies = {}) => {
  if (process.env.BLOCKCHAIN_ENABLED === "false") return { status: "not_configured" };
  let config;
  try {
    config = (dependencies.getConfig || getBlockchainConfig)({ requireSigner: false });
  } catch { return { status: "misconfigured" }; }
  try {
    const { JsonRpcProvider, Contract, ZeroHash } = require("ethers");
    const provider = dependencies.provider || new JsonRpcProvider(config.rpcUrl);
    const network = await timeout(provider.getNetwork(), Number(process.env.READINESS_TIMEOUT_MS || 2000));
    if (Number(network.chainId) !== config.chainId) return { status: "wrong_chain", network: config.network, chainId: config.chainId };
    const bytecode = await timeout(provider.getCode(config.contractAddress), Number(process.env.READINESS_TIMEOUT_MS || 2000));
    if (bytecode === "0x") return { status: "contract_missing", network: config.network, chainId: config.chainId };
    const contract = dependencies.contract || new Contract(config.contractAddress, registryAbi, provider);
    await timeout(contract.credentialExists(ZeroHash), Number(process.env.READINESS_TIMEOUT_MS || 2000));
    return { status: "healthy", network: config.network, chainId: config.chainId };
  } catch { return { status: "unavailable", network: config.network, chainId: config.chainId }; }
};
const filesystemHealth = async () => { try { await timeout(fs.promises.access(path.resolve("backend")), Number(process.env.READINESS_TIMEOUT_MS || 2000)); return { status: "healthy" }; } catch { return { status: "unavailable" }; } };
const readinessHealth = async () => { const [database, filesystem, ipfs, blockchain] = await Promise.all([databaseHealth(), filesystemHealth(), ipfsHealth(), blockchainHealth()]); const states = [database.status, filesystem.status, ipfs.status, blockchain.status]; const failed = states.some((status) => !["healthy", "not_configured"].includes(status)); return { status: failed ? "unavailable" : "healthy", checks: { database, filesystem, ipfs, blockchain } }; };
module.exports = { timeout, databaseHealth, ipfsHealth, blockchainHealth, filesystemHealth, readinessHealth };
