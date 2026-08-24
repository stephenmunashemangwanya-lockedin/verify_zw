const multer = require("multer");
const mappings = {
  "23505": [409, "DUPLICATE_RESOURCE", "A resource with these values already exists."],
  "23503": [400, "INVALID_REFERENCE", "A referenced resource is invalid."],
  "22P02": [400, "INVALID_INPUT", "The supplied identifier or value is invalid."],
  "23514": [422, "CONSTRAINT_VIOLATION", "The supplied value violates a data constraint."],
  IPFS_TIMEOUT: [504, "IPFS_UNAVAILABLE", "Certificate storage timed out."],
  IPFS_UNAVAILABLE: [503, "IPFS_UNAVAILABLE", "Certificate storage is temporarily unavailable."],
  BLOCKCHAIN_UNAVAILABLE: [503, "BLOCKCHAIN_UNAVAILABLE", "The blockchain network is temporarily unavailable."],
  BLOCKCHAIN_CONFIRMATION_TIMEOUT: [504, "TRANSACTION_TIMEOUT", "Blockchain confirmation timed out."],
  BLOCKCHAIN_DUPLICATE_CREDENTIAL: [409, "DUPLICATE_RESOURCE", "The credential already exists on-chain."],
  BLOCKCHAIN_TRANSACTION_REJECTED: [422, "BLOCKCHAIN_TRANSACTION_REJECTED", "The blockchain transaction was rejected."],
  "entity.too.large": [413, "PAYLOAD_TOO_LARGE", "The request body exceeds the configured size limit."],
};
const errorMiddleware = (error, req, res, _next) => {
  let mapped = mappings[error.code] || mappings[error.type];
  if (error instanceof multer.MulterError) mapped = error.code === "LIMIT_FILE_SIZE" ? [413, "FILE_TOO_LARGE", "Certificate file exceeds the configured size limit."] : [400, "INVALID_FILE", "The uploaded file is invalid."];
  if (error.message === "Only PDF certificate files are allowed.") mapped = [422, "INVALID_FILE", "Only valid PDF certificate files are allowed."];
  const statusCode = mapped?.[0] || error.statusCode || 500;
  const code = mapped?.[1] || error.code || (statusCode === 500 ? "INTERNAL_ERROR" : "CONTROLLED_ERROR");
  const message = mapped?.[2] || (statusCode === 500 ? "An unexpected server error occurred." : error.message || "Request failed.");
  const safeCode = /^[A-Z0-9_]+$/.test(code) ? code : "INTERNAL_ERROR";
  require("../utils/logger").log(statusCode >= 500 ? "error" : "warn", statusCode >= 500 ? "request_error" : "security_malformed_request", { requestId: req.requestId || req.id || null, correlationId: req.correlationId || null, errorCode: safeCode, statusCode });
  const response = { success: false, message, code: safeCode, requestId: req.requestId || req.id || null };
  if (error.details && statusCode < 500) response.errors = error.details;
  return res.status(statusCode).json(response);
};
module.exports = { errorMiddleware, mappings };
