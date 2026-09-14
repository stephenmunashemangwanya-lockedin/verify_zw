const fs = require("fs");
const path = require("path");
const { isAddress, isHexString, ZeroAddress } = require("ethers");

const SUPPORTED_NETWORKS = new Set(["hardhat", "localhost", "sepolia"]);

class BlockchainConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "BlockchainConfigurationError";
    this.code = "BLOCKCHAIN_CONFIGURATION_ERROR";
    this.statusCode = 503;
  }
}

/** Local deployments are ephemeral: read the shared metadata, never a cached address. */
const resolveContractAddress = ({
  network,
  chainId,
  contractAddress = process.env.CONTRACT_ADDRESS,
  deploymentPath = process.env.LOCAL_DEPLOYMENT_PATH,
} = {}) => {
  let address = contractAddress;
  if (["localhost", "hardhat"].includes(network)) {
    if (Number(chainId) !== 31337) {
      throw new BlockchainConfigurationError("Local blockchain configuration requires chain 31337.");
    }
    let deployment;
    try { deployment = JSON.parse(fs.readFileSync(deploymentPath || path.resolve(__dirname, "../../deployments", network, "CredentialRegistry.json"), "utf8")); }
    catch (error) {
      throw new BlockchainConfigurationError(error.code === "ENOENT"
        ? "Local blockchain deployment metadata is missing. Run the local deployment service."
        : "Local blockchain deployment metadata cannot be read or is invalid JSON.");
    }
    if (!deployment || deployment.network !== network || Number(deployment.chainId) !== Number(chainId)) {
      throw new BlockchainConfigurationError("Local blockchain deployment metadata has the wrong network or chain ID.");
    }
    address = deployment.contractAddress;
  }
  if (!isAddress(address || "") || address.toLowerCase() === ZeroAddress) {
    throw new BlockchainConfigurationError("Resolved blockchain contract address must be a valid non-zero EVM address.");
  }
  return address;
};

/** Shared read-only deployment validation; a signer is deliberately unnecessary. */
const validateResolvedContract = async (config, provider) => {
  let network;
  let bytecode;
  try {
    network = await provider.getNetwork();
    if (Number(network.chainId) !== Number(config.chainId)) {
      const error = new BlockchainConfigurationError("Connected blockchain chain ID does not match configuration.");
      error.reason = "wrong_chain";
      throw error;
    }
    bytecode = await provider.getCode(config.contractAddress);
  } catch (error) {
    if (error instanceof BlockchainConfigurationError) throw error;
    const safe = new BlockchainConfigurationError("Blockchain RPC is unavailable while validating the deployed contract.");
    safe.reason = "unavailable";
    throw safe;
  }
  if (typeof bytecode !== "string" || !/^0x[0-9a-f]+$/i.test(bytecode)) {
    const error = new BlockchainConfigurationError("Credential registry bytecode is missing at the resolved contract address.");
    error.reason = "contract_missing";
    throw error;
  }
  return config.contractAddress;
};

const positiveInteger = (value, fallback, name) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BlockchainConfigurationError(`${name} must be a positive integer.`);
  }
  return parsed;
};

const validUrl = (value, name, { allowHttpHosts = [], optional = false } = {}) => {
  if (!value && optional) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new BlockchainConfigurationError(`${name} must be a valid URL.`);
  }
  const localHttp = url.protocol === "http:" && allowHttpHosts.includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new BlockchainConfigurationError(`${name} must use HTTPS except for localhost.`);
  }
  return url.toString().replace(/\/+$/, "");
};

/** Load blockchain configuration lazily so non-blockchain APIs still start. */
const getBlockchainConfig = ({ requireSigner = true } = {}) => {
  if (process.env.BLOCKCHAIN_ENABLED === "false") {
    throw new BlockchainConfigurationError("Blockchain operations are disabled.");
  }
  const network = (process.env.BLOCKCHAIN_NETWORK || "").toLowerCase();
  if (!SUPPORTED_NETWORKS.has(network)) {
    throw new BlockchainConfigurationError("BLOCKCHAIN_NETWORK is missing or unsupported.");
  }
  const rpcUrl = validUrl(process.env.BLOCKCHAIN_RPC_URL, "BLOCKCHAIN_RPC_URL", {
    allowHttpHosts: network === "localhost" ? ["localhost", "127.0.0.1", "blockchain"] : [],
  });
  const chainId = positiveInteger(process.env.BLOCKCHAIN_CHAIN_ID, undefined, "BLOCKCHAIN_CHAIN_ID");
  const contractAddress = resolveContractAddress({ network, chainId });

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  const localSigner = ["localhost", "hardhat"].includes(network) && chainId === 31337;
  if (requireSigner && !localSigner && (!privateKey || !isHexString(privateKey, 32))) {
    throw new BlockchainConfigurationError("DEPLOYER_PRIVATE_KEY must be a valid 32-byte private key.");
  }

  return Object.freeze({
    network,
    rpcUrl,
    chainId,
    contractAddress,
    privateKey: requireSigner && !localSigner ? privateKey : null,
    confirmations: positiveInteger(process.env.BLOCK_CONFIRMATIONS, 1, "BLOCK_CONFIRMATIONS"),
    timeoutMs: positiveInteger(process.env.BLOCKCHAIN_TX_TIMEOUT_MS, 120000, "BLOCKCHAIN_TX_TIMEOUT_MS"),
    maxRetries: positiveInteger(process.env.BLOCKCHAIN_MAX_RETRIES, 3, "BLOCKCHAIN_MAX_RETRIES"),
    explorerUrl: validUrl(process.env.BLOCK_EXPLORER_URL, "BLOCK_EXPLORER_URL", { optional: true }),
  });
};

module.exports = {
  getBlockchainConfig,
  resolveContractAddress,
  validateResolvedContract,
  BlockchainConfigurationError,
  SUPPORTED_NETWORKS,
};
