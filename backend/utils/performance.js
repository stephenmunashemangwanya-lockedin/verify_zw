const { log } = require("./logger");
const thresholds = { database: "SLOW_DATABASE_QUERY_MS", ipfs: "SLOW_IPFS_UPLOAD_MS", blockchain: "SLOW_BLOCKCHAIN_TRANSACTION_MS" };
const timeOperation = async (operation, fn, metadata = {}) => {
  const started = process.hrtime.bigint();
  try { return await fn(); }
  finally {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    const threshold = Number(process.env[thresholds[operation]] || 1000);
    log(durationMs >= threshold ? "warn" : "info", `performance_${operation}`, { ...metadata, durationMs: Number(durationMs.toFixed(3)), slow: durationMs >= threshold });
  }
};
module.exports = { timeOperation };
