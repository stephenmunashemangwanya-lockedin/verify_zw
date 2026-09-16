const { isHexString } = require("ethers");
const { validRedisConfiguration } = require("./redis");

class EnvironmentConfigurationError extends Error {
  constructor(issues) {
    super(`Environment configuration is invalid: ${issues.join("; ")}`);
    this.name = "EnvironmentConfigurationError";
    this.code = "ENVIRONMENT_CONFIGURATION_ERROR";
  }
}

const integer = (name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < min || value > max) return null;
  return value;
};

const boolean = (name, fallback = false) => {
  const raw = String(process.env[name] ?? fallback).toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
};

const url = (value, { localHttp = false, localHttpHosts = ["localhost", "127.0.0.1"] } = {}) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") return true;
    return localHttp && parsed.protocol === "http:" && localHttpHosts.includes(parsed.hostname);
  } catch { return false; }
};

const allowedOrigins = () => String(process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000")
  .split(",").map((value) => value.trim()).filter(Boolean);

const validateEnvironment = ({ strict = process.env.NODE_ENV === "production" } = {}) => {
  const issues = [];
  const staging = process.env.NODE_ENV === "staging";
  strict = strict || staging;
  const required = process.env.DATABASE_URL
    ? ["JWT_SECRET"]
    : ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"];
  for (const name of required) if (!String(process.env[name] || "").trim()) issues.push(`${name} is required`);
  if (integer("PORT", 3000, { max: 65535 }) === null) issues.push("PORT must be between 1 and 65535");
  if (!process.env.DATABASE_URL && integer("DB_PORT", undefined, { max: 65535 }) === null) issues.push("DB_PORT must be between 1 and 65535");
  if (String(process.env.JWT_SECRET || "").length < (strict ? 48 : 24)) issues.push(`JWT_SECRET must be at least ${strict ? 48 : 24} characters`);
  const algorithm = process.env.JWT_ALGORITHM || "HS256";
  if (algorithm !== "HS256") issues.push("JWT_ALGORITHM is unsupported");
  for (const name of ["JWT_EXPIRES_IN", "JWT_ISSUER", "JWT_AUDIENCE"]) {
    if (strict && !String(process.env[name] || "").trim()) issues.push(`${name} is required`);
  }
  if (boolean("CORS_ALLOW_CREDENTIALS", true) === null) issues.push("CORS_ALLOW_CREDENTIALS must be true or false");
  if (strict && boolean("CORS_ALLOW_CREDENTIALS", true) !== true) issues.push("CORS_ALLOW_CREDENTIALS must be true in production cookie mode");
  if (boolean("AUTH_COOKIE_SECURE", strict) === null) issues.push("AUTH_COOKIE_SECURE must be true or false");
  if (strict && boolean("AUTH_COOKIE_SECURE", true) !== true) issues.push("AUTH_COOKIE_SECURE must be true in production");
  if (!/^(lax|strict|none)$/.test(String(process.env.AUTH_COOKIE_SAME_SITE || "lax").toLowerCase())) issues.push("AUTH_COOKIE_SAME_SITE must be lax, strict, or none");
  if (String(process.env.AUTH_COOKIE_SAME_SITE || "lax").toLowerCase() === "none" && boolean("AUTH_COOKIE_SECURE", strict) !== true) issues.push("SameSite=None requires a secure cookie");
  if (integer("AUTH_COOKIE_MAX_AGE_MS", 28800000, { min:60000, max:604800000 }) === null) issues.push("AUTH_COOKIE_MAX_AGE_MS must be between 60000 and 604800000");
  if (integer("PASSWORD_RESET_TOKEN_TTL_MINUTES", 30, { min: 5, max: 60 }) === null) issues.push("PASSWORD_RESET_TOKEN_TTL_MINUTES must be between 5 and 60");
  const emailProvider = String(process.env.EMAIL_PROVIDER || (strict ? "" : "capture")).toLowerCase();
  if (!["capture", "webhook"].includes(emailProvider)) issues.push("EMAIL_PROVIDER must be capture or webhook");
  if (strict && emailProvider !== "webhook") issues.push("EMAIL_PROVIDER must be webhook in production");
  if (!url(process.env.PASSWORD_RESET_FRONTEND_URL || "http://localhost:5173/reset-password", { localHttp: !strict })) issues.push("PASSWORD_RESET_FRONTEND_URL must be an HTTPS URL in production");
  if (emailProvider === "webhook") {
    if (!url(process.env.EMAIL_DELIVERY_URL || "", { localHttp: !strict })) issues.push("EMAIL_DELIVERY_URL must be a secure URL");
    for (const name of ["EMAIL_DELIVERY_TOKEN", "EMAIL_FROM"]) if (!String(process.env[name] || "").trim()) issues.push(`${name} is required for webhook delivery`);
  }
  if (integer("EMAIL_DELIVERY_TIMEOUT_MS", 5000, { min: 1000, max: 30000 }) === null) issues.push("EMAIL_DELIVERY_TIMEOUT_MS must be between 1000 and 30000");
  if (integer("EMAIL_DELIVERY_MAX_RETRIES", 3, { min: 1, max: 5 }) === null) issues.push("EMAIL_DELIVERY_MAX_RETRIES must be between 1 and 5");
  if (boolean("CSRF_ENABLED", true) === null) issues.push("CSRF_ENABLED must be true or false");
  if (strict && boolean("CSRF_ENABLED", true) !== true) issues.push("CSRF_ENABLED must be true in production cookie mode");
  for (const name of ["AUTH_COOKIE_NAME", "CSRF_COOKIE_NAME"]) if (!/^[A-Za-z0-9_.-]+$/.test(process.env[name] || (name === "AUTH_COOKIE_NAME" ? "verifyzw_session" : "verifyzw_csrf"))) issues.push(`${name} is invalid`);
  if (!String(process.env.AUTH_COOKIE_PATH || "/").startsWith("/")) issues.push("AUTH_COOKIE_PATH must start with /");
  if (!/^[A-Za-z0-9-]+$/.test(process.env.CSRF_HEADER_NAME || "x-csrf-token")) issues.push("CSRF_HEADER_NAME is invalid");
  const origins = allowedOrigins();
  if (!origins.length || origins.some((origin) => origin === "*" && boolean("CORS_ALLOW_CREDENTIALS", true))) issues.push("CORS_ALLOWED_ORIGINS is unsafe");
  if (origins.some((origin) => origin !== "*" && !url(origin, { localHttp: true }))) issues.push("CORS_ALLOWED_ORIGINS contains an invalid URL");
  if (strict && origins.some((origin) => origin === "*" || !url(origin))) issues.push("CORS_ALLOWED_ORIGINS must contain only HTTPS origins in staging/production");
  if (strict && !url(process.env.FRONTEND_PUBLIC_URL || "")) issues.push("FRONTEND_PUBLIC_URL must be an HTTPS URL in staging/production");
  if (boolean("TRUST_PROXY", false) === null && integer("TRUST_PROXY", null, { min: 1, max: 10 }) === null) issues.push("TRUST_PROXY must be false, true, or a proxy count from 1 to 10");
  if (process.env.IPFS_ENABLED === "true") {
    if (!process.env.PINATA_JWT) issues.push("PINATA_JWT is required when IPFS is enabled");
    if (!url(process.env.PINATA_GATEWAY || "")) issues.push("PINATA_GATEWAY must be an HTTPS URL");
    if (!url(process.env.IPFS_PROVIDER_API_URL || "")) issues.push("IPFS_PROVIDER_API_URL must be an HTTPS URL");
  }
  if (process.env.BLOCKCHAIN_ENABLED === "true" && strict) {
    const rpcHosts = process.env.BLOCKCHAIN_NETWORK === "localhost"
      ? ["localhost", "127.0.0.1", "blockchain"]
      : ["localhost", "127.0.0.1"];
    if (!url(process.env.BLOCKCHAIN_RPC_URL || "", { localHttp: true, localHttpHosts: rpcHosts })) issues.push("BLOCKCHAIN_RPC_URL is invalid");
    try { require("./blockchain").resolveContractAddress({ network: (process.env.BLOCKCHAIN_NETWORK || "").toLowerCase(), chainId: Number(process.env.BLOCKCHAIN_CHAIN_ID) }); }
    catch { issues.push("CONTRACT_ADDRESS is invalid"); }
    if (!isHexString(process.env.DEPLOYER_PRIVATE_KEY || "", 32)) issues.push("DEPLOYER_PRIVATE_KEY is invalid");
  }
  if (strict) {
    const dbTarget = process.env.DATABASE_URL || process.env.DB_HOST || "";
    const dbName = process.env.DB_NAME || (() => { try { return new URL(process.env.DATABASE_URL || "").pathname.slice(1); } catch { return ""; } })();
    if (/localhost|127\.0\.0\.1|\[::1\]/i.test(dbTarget)) issues.push("localhost database is forbidden in staging/production");
    if (/^(skill_verification|postgres)$/i.test(dbName) || /_test$/i.test(dbName)) issues.push("development or test database names are forbidden in staging/production");
    if (boolean("DB_SSL", false) !== true) issues.push("DB_SSL must be true in staging/production");
    if (process.env.BLOCKCHAIN_ENABLED !== "true") issues.push("BLOCKCHAIN_ENABLED must be true in staging/production");
    if (["localhost", "hardhat"].includes(String(process.env.BLOCKCHAIN_NETWORK || "").toLowerCase()) || Number(process.env.BLOCKCHAIN_CHAIN_ID) === 31337) issues.push("local Hardhat blockchain is forbidden in staging/production");
    if (/localhost|127\.0\.0\.1|blockchain:8545/i.test(process.env.BLOCKCHAIN_RPC_URL || "")) issues.push("local blockchain RPC is forbidden in staging/production");

    const knownHardhatKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    if ((process.env.DEPLOYER_PRIVATE_KEY || "").toLowerCase() === knownHardhatKey) issues.push("default Hardhat private keys are forbidden");
    if (staging && (Number(process.env.BLOCKCHAIN_CHAIN_ID) === 1 || /mainnet/i.test(process.env.BLOCKCHAIN_NETWORK || ""))) issues.push("production blockchain is forbidden in staging");
    if (process.env.IPFS_ENABLED !== "true") issues.push("IPFS_ENABLED must be true in staging/production");
    if (process.env.RATE_LIMIT_STORE !== "redis" || !validRedisConfiguration()) issues.push("a secure Redis rate-limit store is required in staging/production (TLS or explicitly configured staging Render private connection)");
  }
  if (issues.length) throw new EnvironmentConfigurationError(issues);
  return Object.freeze({
    port: integer("PORT", 3000, { max: 65535 }), algorithm,
    issuer: process.env.JWT_ISSUER || "zimbabwe-skill-verification-platform",
    audience: process.env.JWT_AUDIENCE || "zsvp-api", expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    corsOrigins: origins, corsCredentials: boolean("CORS_ALLOW_CREDENTIALS", true),
  });
};

module.exports = { validateEnvironment, EnvironmentConfigurationError, integer, boolean, allowedOrigins };
