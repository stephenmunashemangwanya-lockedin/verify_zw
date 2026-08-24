const { z, uuid, isoDate } = require("./commonValidator");
const { pagination } = require("./paginationValidator");
const RESULTS = ["VERIFIED", "REVOKED", "UNKNOWN", "PENDING", "FAILED", "SYSTEM_INCONSISTENCY", "INVALID_FILE"];
const METHODS = ["file", "hash", "credential_id", "public_token", "qr"];
const listQuery = pagination(["verification_time", "result", "verification_method"]).omit({ search: true }).extend({ result: z.enum(RESULTS).optional(), method: z.enum(METHODS).optional(), credentialId: uuid.optional(), institutionId: uuid.optional(), dateFrom: isoDate.optional(), dateTo: isoDate.optional() }).strict().refine((data) => !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo, { path: ["dateTo"], message: "dateTo must not be before dateFrom." });
module.exports = { listQuery, RESULTS, METHODS };
