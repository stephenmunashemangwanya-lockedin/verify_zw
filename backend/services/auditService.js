const { listAuditLogs, findAuditLogById } = require("../models/auditModel");
const { sanitiseDetails } = require("../models/auditModel");
const sanitiseOutputDetails = typeof sanitiseDetails === "function" ? sanitiseDetails : (value) => value;

const SORT_FIELDS = { created_at: "created_at", action: "action", entity_type: "entity_type" };
const parsePositive = (value, fallback, maximum) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};

const getAuditLogs = async (query, user) => {
  const page = parsePositive(query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePositive(query.limit, 20, 100);
  const sortBy = SORT_FIELDS[query.sortBy] || "created_at";
  const sortOrder = String(query.sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";
  const filters = Object.fromEntries(["action", "entityType", "entityId", "userId", "institutionId", "dateFrom", "dateTo"].filter((key) => query[key]).map((key) => [key, query[key]]));
  if (user.role !== "super_admin") delete filters.institutionId;
  const result = await listAuditLogs({ filters, scopeInstitutionId: user.role === "super_admin" ? null : user.institutionId, limit, offset: (page - 1) * limit, sortBy, sortOrder });
  const totalPages = Math.ceil(result.total / limit);
  return { total: result.total, auditLogs: result.rows.map((row) => ({ ...row, details: sanitiseOutputDetails(row.details) })), pagination: { page, limit, total: result.total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && totalPages > 0 } };
};

const getAuditLog = (id, user) => findAuditLogById(id, user.role === "super_admin" ? null : user.institutionId);

module.exports = { getAuditLogs, getAuditLog, SORT_FIELDS };
