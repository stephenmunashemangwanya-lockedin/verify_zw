const pool = require("../config/database");
const number = (value) => Number(value || 0);
const scoped = (institutionId, alias, values, where) => { if (institutionId) { values.push(institutionId); where.push(`${alias}.institution_id = $${values.length}`); } };

const getSummary = async ({ institutionId = null, includeAdministration = true, includeOperations = true } = {}) => {
  const queries = [];
  if (includeAdministration) {
    const institutionValues = institutionId ? [institutionId] : [];
    queries.push(pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status)::int active, COUNT(*) FILTER (WHERE NOT status)::int inactive FROM institutions ${institutionId ? "WHERE id = $1" : ""}`, institutionValues));
    queries.push(pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE is_active)::int active, COUNT(*) FILTER (WHERE NOT is_active)::int inactive FROM users ${institutionId ? "WHERE institution_id = $1" : ""}`, institutionValues));
  }
  if (includeOperations) {
    queries.push(pool.query(`SELECT COUNT(*)::int total FROM students ${institutionId ? "WHERE institution_id = $1" : ""}`, institutionId ? [institutionId] : []));
    queries.push(pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='pending')::int pending, COUNT(*) FILTER (WHERE status='processing')::int processing, COUNT(*) FILTER (WHERE status='active')::int active, COUNT(*) FILTER (WHERE status='failed')::int failed, COUNT(*) FILTER (WHERE status='revoked')::int revoked FROM credentials ${institutionId ? "WHERE institution_id = $1" : ""}`, institutionId ? [institutionId] : []));
  }
  const verificationValues = institutionId ? [institutionId] : [];
  queries.push(pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE vl.result_code='VERIFIED')::int verified, COUNT(*) FILTER (WHERE vl.result_code='REVOKED')::int revoked, COUNT(*) FILTER (WHERE vl.result_code='UNKNOWN')::int unknown, COUNT(*) FILTER (WHERE vl.result_code='PENDING')::int pending, COUNT(*) FILTER (WHERE vl.result_code='FAILED')::int failed, COUNT(*) FILTER (WHERE vl.result_code='SYSTEM_INCONSISTENCY')::int inconsistency FROM verification_logs vl LEFT JOIN credentials c ON c.id=vl.credential_id ${institutionId ? "WHERE c.institution_id = $1" : ""}`, verificationValues));
  const results = await Promise.all(queries); let index = 0; const data = {};
  if (includeAdministration) { data.institutions = results[index++].rows[0]; data.users = results[index++].rows[0]; }
  if (includeOperations) { data.students = results[index++].rows[0]; data.credentials = results[index++].rows[0]; }
  data.verifications = results[index].rows[0];
  return Object.fromEntries(Object.entries(data).map(([key, row]) => [key, Object.fromEntries(Object.entries(row).map(([field, value]) => [field, number(value)]))]));
};

const getRecentActivity = async ({ institutionId = null, limit, action = null, entityType = null }) => {
  const values = []; const where = [];
  if (institutionId) { values.push(institutionId); where.push(`audit_logs.institution_id = $${values.length}`); }
  if (action) { values.push(action.toUpperCase()); where.push(`audit_logs.action = $${values.length}`); }
  if (entityType) { values.push(entityType); where.push(`audit_logs.entity_type = $${values.length}`); }
  values.push(limit); const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const result = await pool.query(`SELECT audit_logs.id, audit_logs.action, audit_logs.entity_type, audit_logs.entity_id, audit_logs.details, audit_logs.created_at, users.id actor_id, users.full_name actor_name, users.role actor_role FROM audit_logs LEFT JOIN users ON users.id=audit_logs.user_id ${clause} ORDER BY audit_logs.created_at DESC, audit_logs.id DESC LIMIT $${values.length}`, values);
  return result.rows;
};

const GROUPS = { day: "day", week: "week", month: "month" };
const getCredentialTrends = async ({ institutionId = null, dateFrom, dateTo, groupBy }) => {
  const group = GROUPS[groupBy]; if (!group) throw Object.assign(new Error("Unsupported analytics grouping."), { code: "VALIDATION_ERROR", statusCode: 400 });
  const values = [dateFrom, dateTo]; const scope = institutionId ? (values.push(institutionId), `AND institution_id = $${values.length}`) : "";
  const result = await pool.query(`SELECT TO_CHAR(date_trunc('${group}', event_time AT TIME ZONE 'UTC'), CASE WHEN '${group}'='month' THEN 'YYYY-MM' ELSE 'YYYY-MM-DD' END) period, COUNT(*) FILTER (WHERE event='issued')::int issued, COUNT(*) FILTER (WHERE event='activated')::int activated, COUNT(*) FILTER (WHERE event='failed')::int failed, COUNT(*) FILTER (WHERE event='revoked')::int revoked FROM (SELECT created_at event_time, 'issued' event FROM credentials WHERE created_at >= $1 AND created_at < ($2::date + INTERVAL '1 day') ${scope} UNION ALL SELECT created_at, 'activated' FROM credentials WHERE status='active' AND created_at >= $1 AND created_at < ($2::date + INTERVAL '1 day') ${scope} UNION ALL SELECT created_at, 'failed' FROM credentials WHERE status='failed' AND created_at >= $1 AND created_at < ($2::date + INTERVAL '1 day') ${scope} UNION ALL SELECT revoked_at, 'revoked' FROM credentials WHERE revoked_at IS NOT NULL AND revoked_at >= $1 AND revoked_at < ($2::date + INTERVAL '1 day') ${scope}) events GROUP BY date_trunc('${group}', event_time AT TIME ZONE 'UTC') ORDER BY date_trunc('${group}', event_time AT TIME ZONE 'UTC')`, values);
  return result.rows;
};

const getVerificationTrends = async ({ institutionId = null, dateFrom, dateTo, groupBy, method = null }) => {
  const group = GROUPS[groupBy]; if (!group) throw Object.assign(new Error("Unsupported analytics grouping."), { code: "VALIDATION_ERROR", statusCode: 400 });
  const values = [dateFrom, dateTo]; const where = ["vl.verification_time >= $1", "vl.verification_time < ($2::date + INTERVAL '1 day')"];
  if (institutionId) { values.push(institutionId); where.push(`c.institution_id = $${values.length}`); } if (method) { values.push(method); where.push(`vl.verification_method = $${values.length}`); }
  const result = await pool.query(`SELECT TO_CHAR(date_trunc('${group}', vl.verification_time AT TIME ZONE 'UTC'), CASE WHEN '${group}'='month' THEN 'YYYY-MM' ELSE 'YYYY-MM-DD' END) period, COUNT(*)::int total, COUNT(*) FILTER (WHERE vl.result_code='VERIFIED')::int verified, COUNT(*) FILTER (WHERE vl.result_code='REVOKED')::int revoked, COUNT(*) FILTER (WHERE vl.result_code='UNKNOWN')::int unknown, COUNT(*) FILTER (WHERE vl.result_code='PENDING')::int pending, COUNT(*) FILTER (WHERE vl.result_code='FAILED')::int failed, COUNT(*) FILTER (WHERE vl.result_code='SYSTEM_INCONSISTENCY')::int inconsistency FROM verification_logs vl LEFT JOIN credentials c ON c.id=vl.credential_id WHERE ${where.join(" AND ")} GROUP BY date_trunc('${group}', vl.verification_time AT TIME ZONE 'UTC') ORDER BY date_trunc('${group}', vl.verification_time AT TIME ZONE 'UTC')`, values);
  return result.rows;
};

const getTopInstitutions = async ({ limit, dateFrom, dateTo, sortBy }) => {
  const sorts = { totalCredentials: "total_credentials", activeCredentials: "active_credentials", totalVerifications: "total_verifications", totalStudents: "total_students" };
  const sort = sorts[sortBy]; if (!sort) throw Object.assign(new Error("Unsupported analytics sort."), { code: "VALIDATION_ERROR", statusCode: 400 });
  const result = await pool.query(`WITH student_counts AS (SELECT institution_id, COUNT(*)::int total_students FROM students GROUP BY institution_id), credential_counts AS (SELECT institution_id, COUNT(*)::int total_credentials, COUNT(*) FILTER (WHERE status='active')::int active_credentials, COUNT(*) FILTER (WHERE status='revoked')::int revoked_credentials FROM credentials WHERE created_at >= $1 AND created_at < ($2::date + INTERVAL '1 day') GROUP BY institution_id), verification_counts AS (SELECT c.institution_id, COUNT(*)::int total_verifications FROM verification_logs vl JOIN credentials c ON c.id=vl.credential_id WHERE vl.verification_time >= $1 AND vl.verification_time < ($2::date + INTERVAL '1 day') GROUP BY c.institution_id) SELECT i.id institution_id, i.name institution_name, COALESCE(s.total_students,0)::int total_students, COALESCE(c.total_credentials,0)::int total_credentials, COALESCE(c.active_credentials,0)::int active_credentials, COALESCE(c.revoked_credentials,0)::int revoked_credentials, COALESCE(v.total_verifications,0)::int total_verifications FROM institutions i LEFT JOIN student_counts s ON s.institution_id=i.id LEFT JOIN credential_counts c ON c.institution_id=i.id LEFT JOIN verification_counts v ON v.institution_id=i.id ORDER BY ${sort} DESC, i.id ASC LIMIT $3`, [dateFrom, dateTo, limit]);
  return result.rows;
};

const getMostVerifiedCredentials = async ({ institutionId = null, limit, dateFrom, dateTo, status = null }) => {
  const values = [dateFrom, dateTo]; const where = ["vl.verification_time >= $1", "vl.verification_time < ($2::date + INTERVAL '1 day')"];
  if (institutionId) { values.push(institutionId); where.push(`c.institution_id = $${values.length}`); } if (status) { values.push(status); where.push(`c.status = $${values.length}`); } values.push(limit);
  const result = await pool.query(`SELECT c.id credential_id, s.student_number, s.full_name student_name, i.name institution_name, c.qualification, c.status credential_status, COUNT(vl.id)::int verification_count, MAX(vl.verification_time) last_verified_at FROM credentials c JOIN students s ON s.id=c.student_id JOIN institutions i ON i.id=c.institution_id JOIN verification_logs vl ON vl.credential_id=c.id WHERE ${where.join(" AND ")} GROUP BY c.id,s.student_number,s.full_name,i.name,c.qualification,c.status ORDER BY verification_count DESC,c.id ASC LIMIT $${values.length}`, values);
  return result.rows;
};

const failureCase = `CASE WHEN action ILIKE '%IPFS%' THEN 'ipfs' WHEN action ILIKE '%BLOCKCHAIN%' THEN 'blockchain' WHEN action ILIKE '%PDF%' THEN 'pdf_generation' WHEN action ILIKE '%RECONCILIATION%' THEN 'reconciliation' WHEN action IN ('ACCOUNT_LOCKED','LOGIN_FAILURE') THEN 'account_lockout' WHEN action ILIKE '%VERIFICATION%' OR action ILIKE '%INCONSISTENCY%' THEN 'verification_inconsistency' ELSE 'certificate_processing' END`;
const getFailures = async ({ institutionId = null, dateFrom, dateTo, category = null, limit, offset }) => {
  const values = [dateFrom, dateTo]; const where = ["created_at >= $1", "created_at < ($2::date + INTERVAL '1 day')", "(action ILIKE '%FAIL%' OR action ILIKE '%ERROR%' OR action ILIKE '%RECONCILIATION%' OR action='ACCOUNT_LOCKED' OR action ILIKE '%INCONSISTENCY%')"];
  if (institutionId) { values.push(institutionId); where.push(`institution_id = $${values.length}`); } if (category) { values.push(category); where.push(`${failureCase} = $${values.length}`); }
  const clause = `WHERE ${where.join(" AND ")}`;
  const counts = await pool.query(`SELECT ${failureCase} category, COUNT(*)::int count FROM audit_logs ${clause} GROUP BY ${failureCase}`, values);
  const total = await pool.query(`SELECT COUNT(*)::int total FROM audit_logs ${clause}`, values);
  const pageValues = [...values, limit, offset];
  const rows = await pool.query(`SELECT id, ${failureCase} category, action, entity_type, entity_id, created_at FROM audit_logs ${clause} ORDER BY created_at DESC,id DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`, pageValues);
  return { counts: counts.rows, total: number(total.rows[0].total), rows: rows.rows };
};

const getReconciliationMetrics = async ({ institutionId = null } = {}) => {
  const values = institutionId ? [institutionId] : []; const where = institutionId ? "AND institution_id=$1" : "";
  const result = await pool.query(`SELECT COUNT(*) FILTER (WHERE status='failed' AND blockchain_tx IS NOT NULL)::int failed_with_transaction, COUNT(*) FILTER (WHERE status='active' AND ipfs_cid IS NULL)::int active_missing_cid, COUNT(*) FILTER (WHERE status='active' AND blockchain_tx IS NULL)::int active_missing_transaction, COUNT(*) FILTER (WHERE processing_error='BLOCKCHAIN_RECONCILIATION_REQUIRED')::int reconciliation_required FROM credentials WHERE TRUE ${where}`, values);
  return result.rows[0];
};

module.exports = { getSummary, getRecentActivity, getCredentialTrends, getVerificationTrends, getTopInstitutions, getMostVerifiedCredentials, getFailures, getReconciliationMetrics, GROUPS };
