const { isAddress, isHexString } = require("ethers");

const SUPPORTED_NETWORKS = new Set(["hardhat", "localhost", "sepolia"]);

class BlockchainConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "BlockchainConfigurationError";
    this.code = "BLOCKCHAIN_CONFIGURATION_ERROR";
    this.statusCode = 503;
  }
}

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
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!isAddress(contractAddress || "")) {
    throw new BlockchainConfigurationError("CONTRACT_ADDRESS must be a valid EVM address.");
  }

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (requireSigner && (!privateKey || !isHexString(privateKey, 32))) {
    throw new BlockchainConfigurationError("DEPLOYER_PRIVATE_KEY must be a valid 32-byte private key.");
  }

  return Object.freeze({
    network,
    rpcUrl,
    chainId,
    contractAddress,
    privateKey: requireSigner ? privateKey : null,
    confirmations: positiveInteger(process.env.BLOCK_CONFIRMATIONS, 1, "BLOCK_CONFIRMATIONS"),
    timeoutMs: positiveInteger(process.env.BLOCKCHAIN_TX_TIMEOUT_MS, 120000, "BLOCKCHAIN_TX_TIMEOUT_MS"),
    maxRetries: positiveInteger(process.env.BLOCKCHAIN_MAX_RETRIES, 3, "BLOCKCHAIN_MAX_RETRIES"),
    explorerUrl: validUrl(process.env.BLOCK_EXPLORER_URL, "BLOCK_EXPLORER_URL", { optional: true }),
  });
};

module.exports = {
  getBlockchainConfig,
  BlockchainConfigurationError,
  SUPPORTED_NETWORKS,
};
