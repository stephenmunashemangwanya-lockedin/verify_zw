const client = require("prom-client");
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: "zsvp_" });
const counter = (name, help, labelNames = []) => new client.Counter({ name, help, labelNames, registers: [registry] });
const histogram = (name, help, labelNames = []) => new client.Histogram({ name, help, labelNames, registers: [registry] });
const metrics = {
  httpRequests: counter("http_requests_total", "HTTP requests", ["method", "route", "status_class"]),
  httpErrors: counter("http_errors_total", "HTTP errors", ["route", "status_class"]),
  httpDuration: histogram("http_request_duration_seconds", "HTTP request duration", ["method", "route"]),
  authenticationFailures: counter("authentication_failures_total", "Authentication failures", ["reason"]),
  accountLockouts: counter("account_lockouts_total", "Account lockouts"),
  credentialsIssued: counter("credentials_issued_total", "Credentials issued", ["result"]),
  credentialsRevoked: counter("credentials_revoked_total", "Credentials revoked", ["result"]),
  verifications: counter("verifications_total", "Verifications", ["method"]),
  verificationResults: counter("verification_results_total", "Verification results", ["result"]),
  ipfsUploads: counter("ipfs_uploads_total", "IPFS uploads", ["result"]),
  blockchainTransactions: counter("blockchain_transactions_total", "Blockchain transactions", ["operation", "result"]),
  databaseDuration: histogram("database_query_duration_seconds", "Database query duration", ["operation"]),
};
module.exports = { client, registry, metrics };
