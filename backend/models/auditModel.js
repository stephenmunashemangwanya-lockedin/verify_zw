const pool = require("../config/database");

const SECRET_KEY = /(password|password_hash|secret|token|jwt|authorization|cookie|private.?key|mnemonic|pinata|db_password|deployer_private_key|rpc.?url|certificate.*(bytes|buffer|file)|environment|process\.env)/i;
const sanitiseDetails = (value, depth = 0) => {
  if (depth > 5) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitiseDetails(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !SECRET_KEY.test(key)).map(([key, item]) => [key, sanitiseDetails(item, depth + 1)]));
  if (typeof value === "string") return value.slice(0, 2000);
  return value;
};

const createAuditLog = async ({
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
  userAgent,
  institutionId,
}) => {
  try {
    const result = await pool.query(
    `INSERT INTO audit_logs
      (user_id, action, entity_type, entity_id, details, ip_address, user_agent, institution_id)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
     RETURNING id, user_id, action, entity_type, entity_id, institution_id, created_at`,
    [
      userId || null,
      String(action).toUpperCase(),
      entityType || null,
      entityId || null,
      JSON.stringify(sanitiseDetails(details || {})),
      ipAddress || null,
      userAgent || null,
      institutionId || null,
    ]
  );
    return result.rows[0];
  } catch (error) {
    // Log only the PostgreSQL classification, never SQL, values, or details.
    console.error("Audit log persistence failed:", error.code || "AUDIT_DATABASE_ERROR");
    throw error;
  }
};

const institutionExpression = `COALESCE(
  audit_logs.institution_id,
  CASE WHEN audit_logs.entity_type = 'institution' THEN audit_logs.entity_id END,
  credential_scope.institution_id,
  student_scope.institution_id,
  user_scope.institution_id
)`;
const scopeJoins = `
  LEFT JOIN credentials credential_scope ON audit_logs.entity_type = 'credential' AND credential_scope.id = audit_logs.entity_id
  LEFT JOIN students student_scope ON audit_logs.entity_type = 'student' AND student_scope.id = audit_logs.entity_id
  LEFT JOIN users user_scope ON audit_logs.user_id = user_scope.id`;

const listAuditLogs = async ({ filters, scopeInstitutionId, limit, offset, sortBy, sortOrder }) => {
  const values = [];
  const where = [];
  const add = (sql, value) => { values.push(value); where.push(sql.replace("?", `$${values.length}`)); };
  if (scopeInstitutionId) add(`${institutionExpression} = ?`, scopeInstitutionId);
  for (const [key, column] of Object.entries({ action: "action", entityType: "entity_type", entityId: "entity_id", userId: "user_id", institutionId: "institution_id" })) {
    if (filters[key]) add(`audit_logs.${column} = ?`, filters[key]);
  }
  if (filters.dateFrom) add("audit_logs.created_at >= ?", filters.dateFrom);
  if (filters.dateTo) add("audit_logs.created_at <= ?", filters.dateTo);
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM audit_logs ${scopeJoins} ${clause}`, [...values]);
  values.push(limit, offset);
  const rows = await pool.query(
    `SELECT audit_logs.id, audit_logs.user_id, audit_logs.action, audit_logs.entity_type,
       audit_logs.entity_id, audit_logs.institution_id, audit_logs.details,
       audit_logs.ip_address, audit_logs.user_agent, audit_logs.created_at
     FROM audit_logs ${scopeJoins} ${clause} ORDER BY audit_logs.${sortBy} ${sortOrder} LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return { rows: rows.rows, total: count.rows[0].total };
};

const findAuditLogById = async (id, scopeInstitutionId = null) => {
  const values = [id];
  const scope = scopeInstitutionId ? `AND ${institutionExpression} = $2` : "";
  if (scopeInstitutionId) values.push(scopeInstitutionId);
  const result = await pool.query(`SELECT audit_logs.id, audit_logs.user_id, audit_logs.action, audit_logs.entity_type, audit_logs.entity_id, audit_logs.institution_id, audit_logs.details, audit_logs.ip_address, audit_logs.user_agent, audit_logs.created_at FROM audit_logs ${scopeJoins} WHERE audit_logs.id = $1 ${scope} LIMIT 1`, values);
  return result.rows[0];
};

const countAuditLogs = async ({ scopeInstitutionId = null } = {}) => {
  const values = scopeInstitutionId ? [scopeInstitutionId] : [];
  const where = scopeInstitutionId ? `WHERE ${institutionExpression} = $1` : "";
  const result = await pool.query(`SELECT COUNT(*)::int AS total FROM audit_logs ${scopeJoins} ${where}`, values);
  return result.rows[0].total;
};

module.exports = { createAuditLog, listAuditLogs, findAuditLogById, countAuditLogs, sanitiseDetails };
