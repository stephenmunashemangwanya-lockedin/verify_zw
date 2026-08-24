const model = require("../models/dashboardModel");
const health = require("./healthService");
const { sanitiseDetails } = require("../models/auditModel");
const { maskStudentNumber } = require("../utils/maskStudentNumber");

const PERIODS = { "7days": 7, "30days": 30, "3months": 90, "6months": 180, "12months": 365 };
const iso = (date) => date.toISOString().slice(0, 10);
const resolveRange = ({ period = "30days", dateFrom, dateTo }) => {
  const end = dateTo ? new Date(`${dateTo}T00:00:00Z`) : new Date();
  const start = dateFrom ? new Date(`${dateFrom}T00:00:00Z`) : new Date(end.getTime() - (PERIODS[period] - 1) * 86400000);
  return { dateFrom: iso(start), dateTo: iso(end) };
};
const scope = (user) => user.role === "super_admin" ? null : user.institutionId;

const summary = (user) => model.getSummary({ institutionId: scope(user), includeAdministration: ["super_admin", "institution_admin"].includes(user.role), includeOperations: user.role !== "verifier" });
const recentActivity = async (query, user) => (await model.getRecentActivity({ institutionId: scope(user), limit: query.limit, action: query.action, entityType: query.entityType })).map((row) => ({ id: row.id, action: row.action, entityType: row.entity_type, entityId: row.entity_id, actor: row.actor_id ? { id: row.actor_id, name: row.actor_name, role: row.actor_role } : null, details: sanitiseDetails(row.details), createdAt: row.created_at }));
const credentialTrends = async (query, user) => { const range = resolveRange(query); return { groupBy: query.groupBy, ...range, series: await model.getCredentialTrends({ institutionId: scope(user), ...range, groupBy: query.groupBy }) }; };
const verificationTrends = async (query, user) => { const range = resolveRange(query); return { groupBy: query.groupBy, method: query.method || null, ...range, series: await model.getVerificationTrends({ institutionId: scope(user), ...range, groupBy: query.groupBy, method: query.method }) }; };
const topInstitutions = (query) => { const range = resolveRange(query); return model.getTopInstitutions({ ...query, ...range }); };
const mostVerifiedCredentials = async (query, user) => { const range = resolveRange(query); const rows = await model.getMostVerifiedCredentials({ institutionId: scope(user), ...query, ...range }); return rows.map(({ student_number, ...row }) => ({ ...row, maskedStudentNumber: maskStudentNumber(student_number) })); };
const failures = async (query, user) => { const range = resolveRange(query); const result = await model.getFailures({ institutionId: scope(user), ...query, ...range, offset: (query.page - 1) * query.limit }); const totalPages = result.total ? Math.ceil(result.total / query.limit) : 0; return { counts: Object.fromEntries(result.counts.map((row) => [row.category, Number(row.count)])), failures: result.rows.map((row) => ({ id: row.id, category: row.category, summary: `A ${row.category.replace(/_/g, " ")} event was recorded.`, entityType: row.entity_type, entityId: row.entity_id, createdAt: row.created_at })), pagination: { page: query.page, limit: query.limit, total: result.total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 && totalPages > 0 } }; };
const systemHealth = async () => {
  const started = Date.now(); const [database, ipfs, blockchain, processing] = await Promise.all([health.databaseHealth(), health.ipfsHealth(), health.blockchainHealth(), model.getReconciliationMetrics()]);
  database.latencyMs = Date.now() - started;
  const processingData = { failedCredentials: Number(processing.failed_with_transaction || 0), reconciliationRequired: Number(processing.reconciliation_required || 0), activeMissingCid: Number(processing.active_missing_cid || 0), activeMissingTransaction: Number(processing.active_missing_transaction || 0) };
  const externalBad = [ipfs.status, blockchain.status].some((status) => ["degraded", "unavailable"].includes(status));
  return { overall: database.status === "unavailable" ? "unavailable" : externalBad || Object.values(processingData).some(Boolean) ? "degraded" : "healthy", database, ipfs, blockchain: { ...blockchain, contractAvailable: blockchain.status === "healthy", contractPaused: null }, processing: processingData };
};
module.exports = { resolveRange, summary, recentActivity, credentialTrends, verificationTrends, topInstitutions, mostVerifiedCredentials, failures, systemHealth };
