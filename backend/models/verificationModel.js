const pool = require("../config/database");

const publicCredentialSelect = `
  SELECT
    credentials.id,
    credentials.certificate_hash,
    credentials.qualification,
    credentials.issue_date,
    credentials.ipfs_cid,
    credentials.blockchain_tx,
    credentials.blockchain_network,
    credentials.contract_address,
    credentials.block_number,
    credentials.status,
    credentials.public_token,
    credentials.revoked_at,
    credentials.revocation_reason,
    students.student_number,
    institutions.name AS institution_name
  FROM credentials
  INNER JOIN students ON students.id = credentials.student_id
  INNER JOIN institutions ON institutions.id = credentials.institution_id
`;

const findOne = async (whereClause, value) => {
  const result = await pool.query(
    `${publicCredentialSelect} WHERE ${whereClause} = $1 LIMIT 1`,
    [value]
  );
  return result.rows[0];
};

const findCredentialByHashForVerification = (hash) =>
  findOne("credentials.certificate_hash", hash);
const findCredentialByIdForVerification = (id) =>
  findOne("credentials.id", id);
const findCredentialByPublicToken = (token) =>
  findOne("credentials.public_token", token);

const createVerificationLog = async ({
  credentialId,
  verifierName,
  verifierEmail,
  resultCode,
  verificationMethod,
  uploadedHash,
  ipAddress,
  userAgent,
}) => {
  const result = await pool.query(
    `INSERT INTO verification_logs (
       credential_id, verifier_name, verifier_email, result, result_code,
       verification_method, uploaded_hash, ip_address, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, credential_id, result_code, verification_method, verification_time`,
    [
      credentialId || null,
      verifierName || null,
      verifierEmail || null,
      resultCode === "VERIFIED",
      resultCode,
      verificationMethod,
      uploadedHash || null,
      ipAddress || null,
      userAgent || null,
    ]
  );
  return result.rows[0];
};

const listVerificationLogs = async ({ scopeInstitutionId = null, institutionId = null, resultCode = null, method = null, credentialId = null, dateFrom = null, dateTo = null, limit = 20, offset = 0, sortBy = "verification_time", sortOrder = "DESC" } = {}) => {
  const fields = { verification_time: "verification_logs.verification_time", result: "verification_logs.result", verification_method: "verification_logs.verification_method" };
  const column = fields[sortBy] || fields.verification_time; const order = sortOrder === "ASC" ? "ASC" : "DESC";
  const values = []; const where = [];
  const add = (sql, value) => { values.push(value); where.push(sql.replace("?", `$${values.length}`)); };
  if (scopeInstitutionId) add("credentials.institution_id = ?", scopeInstitutionId); else if (institutionId) add("credentials.institution_id = ?", institutionId);
  if (resultCode) add("verification_logs.result_code = ?", resultCode);
  if (method) add("verification_logs.verification_method = ?", method);
  if (credentialId) add("verification_logs.credential_id = ?", credentialId);
  if (dateFrom) add("verification_logs.verification_time >= ?", dateFrom);
  if (dateTo) add("verification_logs.verification_time < (?::date + INTERVAL '1 day')", dateTo);
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const joins = "FROM verification_logs LEFT JOIN credentials ON credentials.id = verification_logs.credential_id";
  const count = await pool.query(`SELECT COUNT(*)::int AS total ${joins} ${clause}`, values);
  const resultValues = [...values, limit, offset];
  const result = await pool.query(`SELECT verification_logs.id, verification_logs.credential_id, verification_logs.result, verification_logs.result_code, verification_logs.verification_method, verification_logs.uploaded_hash, verification_logs.verification_time ${joins} ${clause} ORDER BY ${column} ${order}, verification_logs.id ASC LIMIT $${resultValues.length - 1} OFFSET $${resultValues.length}`, resultValues);
  return { rows: result.rows, total: count.rows[0].total };
};

module.exports = {
  findCredentialByHashForVerification,
  findCredentialByIdForVerification,
  findCredentialByPublicToken,
  createVerificationLog,
  listVerificationLogs,
};
