const { log } = require("../utils/logger");
let transport = async () => ({ delivered: false, transport: "noop" });
const setAlertTransport = (next) => { transport = typeof next === "function" ? next : async () => ({ delivered: false, transport: "noop" }); };
const sendAlert = async (event, metadata = {}) => {
  const allowed = new Set(["database_unavailable", "blockchain_unavailable", "ipfs_unavailable", "authentication_failures_elevated", "account_lockouts_elevated", "http_500_rate_elevated", "credential_reconciliation_required", "log_write_failure", "request_latency_high"]);
  if (!allowed.has(event)) return { delivered: false, transport: "noop" };
  try { const result = await transport({ event, metadata }); return { delivered: result?.delivered === true, transport: result?.transport || "noop" }; }
  catch (error) { log("error", "alert_transport_failed", { event, errorCode: error.code || "ALERT_ERROR" }); return { delivered: false, transport: "failed" }; }
};
module.exports = { sendAlert, setAlertTransport };
