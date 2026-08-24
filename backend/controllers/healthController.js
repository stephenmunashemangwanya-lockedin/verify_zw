const health = require("../services/healthService");
const publicHealth = (_req, res) => res.json({ status: "healthy" });
const liveHealth = (_req, res) => res.json({ status: "healthy" });
const readyHealth = async (_req, res) => { const result = await health.readinessHealth(); res.status(result.status === "unavailable" ? 503 : 200).json(result); };
const detail = (check) => async (_req, res) => { const result = await check(); res.status(result.status === "unavailable" ? 503 : 200).json(result); };
module.exports = { publicHealth, liveHealth, readyHealth, databaseHealth: detail(health.databaseHealth), ipfsHealth: detail(health.ipfsHealth), blockchainHealth: detail(health.blockchainHealth) };
