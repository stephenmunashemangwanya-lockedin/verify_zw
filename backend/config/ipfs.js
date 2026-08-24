const SUPPORTED_PROVIDER = "pinata";

class IpfsConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "IpfsConfigurationError";
    this.statusCode = 503;
    this.code = "IPFS_CONFIGURATION_ERROR";
  }
}

const parsePositiveInteger = (value, fallback, name) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new IpfsConfigurationError(`${name} must be a positive integer.`);
  }
  return parsed;
};

const normaliseGateway = (value) => {
  let url;
  try {
    url = new URL(value || "https://gateway.pinata.cloud/ipfs");
  } catch {
    throw new IpfsConfigurationError("PINATA_GATEWAY must be a valid HTTPS URL.");
  }
  if (url.protocol !== "https:") {
    throw new IpfsConfigurationError("PINATA_GATEWAY must use HTTPS.");
  }
  return url.toString().replace(/\/+$/, "");
};

const normaliseApiUrl = (value) => {
  let url;
  try { url = new URL(value || "https://api.pinata.cloud"); } catch { throw new IpfsConfigurationError("IPFS_PROVIDER_API_URL must be a valid HTTPS URL."); }
  if (url.protocol !== "https:") throw new IpfsConfigurationError("IPFS_PROVIDER_API_URL must use HTTPS.");
  return url.toString().replace(/\/+$/, "");
};

/** Load configuration lazily so unrelated API routes can start safely even
 * when IPFS is not configured. Secrets are never included in errors or logs. */
const getIpfsConfig = () => {
  const provider = (process.env.IPFS_PROVIDER || SUPPORTED_PROVIDER).toLowerCase();
  if (provider !== SUPPORTED_PROVIDER) {
    throw new IpfsConfigurationError(`Unsupported IPFS provider: ${provider}.`);
  }
  if (!process.env.PINATA_JWT || !process.env.PINATA_JWT.trim()) {
    throw new IpfsConfigurationError("PINATA_JWT is required for IPFS operations.");
  }

  return Object.freeze({
    provider,
    pinataJwt: process.env.PINATA_JWT.trim(),
    apiUrl: normaliseApiUrl(process.env.IPFS_PROVIDER_API_URL),
    gatewayUrl: normaliseGateway(process.env.PINATA_GATEWAY),
    timeoutMs: parsePositiveInteger(
      process.env.IPFS_UPLOAD_TIMEOUT_MS,
      60000,
      "IPFS_UPLOAD_TIMEOUT_MS"
    ),
    maxRetries: parsePositiveInteger(
      process.env.IPFS_MAX_RETRIES,
      3,
      "IPFS_MAX_RETRIES"
    ),
  });
};

module.exports = {
  getIpfsConfig,
  IpfsConfigurationError,
};
