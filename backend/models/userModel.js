const pool = require("../config/database");
const { ROLES } = require("../constants/roles");

const hasActiveSuperAdmin = async (client = pool) => {
  const result = await client.query(
    "SELECT EXISTS (SELECT 1 FROM users WHERE role = $1 AND is_active = TRUE) AS exists",
    [ROLES.SUPER_ADMIN]
  );
  return result.rows[0].exists === true;
};

const createUser = async ({
  fullName,
  email,
  passwordHash,
  role,
  institutionId,
}) => {
  const query = `
    INSERT INTO users (
      full_name,
      email,
      password_hash,
      role,
      institution_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      full_name,
      email,
      role,
      institution_id,
      is_active,
      must_change_password,
      token_version,
      failed_login_attempts,
      locked_until,
      last_login_at,
      created_at
  `;

  const values = [
    fullName,
    email,
    passwordHash,
    role,
    institutionId || null,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const query = `
    SELECT
      id,
      full_name,
      email,
      password_hash,
      role,
      institution_id,
      is_active,
      must_change_password,
      token_version,
      failed_login_attempts,
      locked_until,
      last_login_at,
      created_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [email]);

  return result.rows[0];
};

const findUserById = async (id) => {
  const query = `
    SELECT
      id,
      full_name,
      email,
      role,
      institution_id,
      is_active,
      must_change_password,
      token_version,
      failed_login_attempts,
      locked_until,
      last_login_at,
      created_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0];
};

const listUsers = async ({ institutionId = null, search = null, role = null, status = null, limit = 20, offset = 0, sortBy = "created_at", sortOrder = "DESC" } = {}) => {
  const fields = { full_name: "full_name", email: "email", role: "role", is_active: "is_active", created_at: "created_at", updated_at: "updated_at" };
  const column = fields[sortBy] || "created_at"; const order = sortOrder === "ASC" ? "ASC" : "DESC";
  const values = []; const where = [];
  if (institutionId) { values.push(institutionId); where.push(`institution_id = $${values.length}`); }
  if (search) { values.push(search); where.push(`(full_name ILIKE $${values.length} ESCAPE '\\' OR email ILIKE $${values.length} ESCAPE '\\')`); }
  if (role) { values.push(role); where.push(`role = $${values.length}`); }
  if (status !== null) { values.push(status); where.push(`is_active = $${values.length}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM users ${clause}`, values);
  const resultValues = [...values, limit, offset];
  const result = await pool.query(`SELECT id, full_name, email, role, institution_id, is_active, must_change_password, last_login_at, created_at, updated_at FROM users ${clause} ORDER BY ${column} ${order}, id ASC LIMIT $${resultValues.length - 1} OFFSET $${resultValues.length}`, resultValues);
  return { rows: result.rows, total: count.rows[0].total };
};

const findUserForAuthentication = async (id) => {
  const result = await pool.query(`SELECT users.id, users.full_name, users.email, users.password_hash, users.role, users.institution_id, users.is_active, users.must_change_password, users.password_changed_at, users.token_version, users.created_at, institutions.status AS institution_active FROM users LEFT JOIN institutions ON institutions.id = users.institution_id WHERE users.id = $1 LIMIT 1`, [id]);
  return result.rows[0];
};

const findSafeUserById = async (id) => {
  const result = await pool.query(`SELECT users.id, users.full_name, users.email, users.role, users.institution_id, institutions.name AS institution_name, users.is_active, users.must_change_password, users.password_changed_at, users.last_login_at, (users.locked_until IS NOT NULL AND users.locked_until > CURRENT_TIMESTAMP) AS is_locked, users.created_at, users.updated_at FROM users LEFT JOIN institutions ON institutions.id = users.institution_id WHERE users.id = $1 LIMIT 1`, [id]);
  return result.rows[0];
};

const updateUserStatus = async (id, isActive) => {
  const result = await pool.query(`UPDATE users SET is_active = $2, token_version = token_version + CASE WHEN $2 = FALSE THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, full_name, email, role, institution_id, is_active, must_change_password, created_at, updated_at`, [id, isActive]);
  return result.rows[0];
};
const updateUserRole = async (id, role) => {
  const result = await pool.query(`UPDATE users SET role = $2, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, full_name, email, role, institution_id, is_active, must_change_password, created_at, updated_at`, [id, role]); return result.rows[0];
};
const updateUserRoleAndInstitution = async (id, role, institutionId) => {
  const result = await pool.query(`UPDATE users SET role=$2, institution_id=$3, token_version=token_version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id,full_name,email,role,institution_id,is_active,must_change_password,token_version,created_at,updated_at`, [id, role, institutionId]); return result.rows[0];
};
const updateUserInstitution = async (id, institutionId) => {
  const result = await pool.query(`UPDATE users SET institution_id = $2, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, full_name, email, role, institution_id, is_active, must_change_password, created_at, updated_at`, [id, institutionId]); return result.rows[0];
};
const unlockUser = async (id) => {
  const result = await pool.query(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, full_name, email, role, institution_id, is_active, must_change_password, FALSE AS is_locked, created_at, updated_at`, [id]); return result.rows[0];
};
const requireUserPasswordChange = async (id) => {
  const result = await pool.query(`UPDATE users SET must_change_password = TRUE, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, full_name, email, role, institution_id, is_active, must_change_password, created_at, updated_at`, [id]); return result.rows[0];
};
const updateUserPassword = async (id, passwordHash) => {
  const result = await pool.query(`UPDATE users SET password_hash = $2, password_changed_at = CURRENT_TIMESTAMP, must_change_password = FALSE, password_reset_token_hash = NULL, password_reset_expires_at = NULL, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, token_version, password_changed_at`, [id, passwordHash]); return result.rows[0];
};
const setPasswordReset = async (id, tokenHash, expiresAt) => {
  const result = await pool.query(`UPDATE users SET password_reset_token_hash = $2, password_reset_expires_at = $3, must_change_password = TRUE, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, must_change_password, password_reset_expires_at`, [id, tokenHash, expiresAt]); return result.rows[0];
};
const setPasswordRecoveryToken = async (id, tokenHash, expiresAt) => {
  const result = await pool.query(`UPDATE users SET password_reset_token_hash=$2,password_reset_expires_at=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id,email,role,institution_id,is_active,password_reset_expires_at`,[id,tokenHash,expiresAt]); return result.rows[0];
};
const findUserByValidResetTokenHash = async (tokenHash) => {
  const result=await pool.query(`SELECT id,email,role,institution_id,is_active,password_hash,token_version,password_reset_expires_at FROM users WHERE password_reset_token_hash=$1 AND password_reset_expires_at>CURRENT_TIMESTAMP LIMIT 1`,[tokenHash]); return result.rows[0];
};
const consumePasswordRecoveryToken = async (id, tokenHash, passwordHash) => {
  const result=await pool.query(`UPDATE users SET password_hash=$3,password_changed_at=CURRENT_TIMESTAMP,password_reset_token_hash=NULL,password_reset_expires_at=NULL,token_version=token_version+1,failed_login_attempts=0,locked_until=NULL,must_change_password=FALSE,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND password_reset_token_hash=$2 AND password_reset_expires_at>CURRENT_TIMESTAMP RETURNING id,email,role,institution_id,token_version,must_change_password`,[id,tokenHash,passwordHash]); return result.rows[0];
};
const countActiveSuperAdmins = async () => (await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = $1 AND is_active = TRUE", [ROLES.SUPER_ADMIN])).rows[0].count;

const createFirstSuperAdmin = async ({ fullName, email, passwordHash, allowOverride = false }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [9142026]);
    const existingEmail = await client.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
    if (existingEmail.rowCount) throw Object.assign(new Error("A user with this email already exists."), { code: "ADMIN_EMAIL_EXISTS" });
    if (await hasActiveSuperAdmin(client) && !allowOverride) throw Object.assign(new Error("An active super administrator already exists."), { code: "ACTIVE_SUPER_ADMIN_EXISTS" });
    const result = await client.query(`INSERT INTO users (full_name,email,password_hash,role,institution_id,is_active) VALUES ($1,$2,$3,$4,NULL,TRUE) RETURNING id,full_name,email,role,institution_id,is_active,token_version,must_change_password,created_at`, [fullName, email, passwordHash, ROLES.SUPER_ADMIN]);
    await client.query("COMMIT"); return result.rows[0];
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); }
};

const recoverAdministratorPassword = async (id, passwordHash) => {
  const result = await pool.query(`UPDATE users SET password_hash=$2, password_changed_at=CURRENT_TIMESTAMP, must_change_password=TRUE, password_reset_token_hash=NULL, password_reset_expires_at=NULL, token_version=token_version+1, failed_login_attempts=0, locked_until=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id,email,role,institution_id,is_active,must_change_password,token_version`, [id, passwordHash]);
  return result.rows[0];
};

const updateUserFields = async (id, fields) => {
  const allowed = { fullName: "full_name", email: "email", role: "role", institutionId: "institution_id", isActive: "is_active", passwordHash: "password_hash", mustChangePassword: "must_change_password" };
  const entries = Object.entries(fields).filter(([key]) => allowed[key]);
  if (!entries.length) return findUserById(id);
  const values = entries.map(([, value]) => value); values.push(id);
  const sets = entries.map(([key], index) => `${allowed[key]} = $${index + 1}`);
  if (Object.hasOwn(fields, "passwordHash")) sets.push("password_changed_at = CURRENT_TIMESTAMP", "token_version = token_version + 1");
  const result = await pool.query(`UPDATE users SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING id, full_name, email, role, institution_id, is_active, must_change_password, token_version, password_changed_at, created_at, updated_at`, values);
  return result.rows[0];
};

const recordLoginSuccess = (id) => pool.query("UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
const recordLoginFailure = async (id, maximum, lockMinutes) => {
  const result = await pool.query(`UPDATE users SET failed_login_attempts = failed_login_attempts + 1, locked_until = CASE WHEN failed_login_attempts + 1 >= $2 THEN CURRENT_TIMESTAMP + ($3 * INTERVAL '1 minute') ELSE locked_until END WHERE id = $1 RETURNING failed_login_attempts, locked_until`, [id, maximum, lockMinutes]);
  return result.rows[0];
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUserFields,
  recordLoginSuccess,
  recordLoginFailure,
  findUserForAuthentication,
  findSafeUserById,
  updateUserStatus,
  updateUserRole,
  updateUserRoleAndInstitution,
  updateUserInstitution,
  unlockUser,
  requireUserPasswordChange,
  updateUserPassword,
  setPasswordReset,
  setPasswordRecoveryToken,
  findUserByValidResetTokenHash,
  consumePasswordRecoveryToken,
  countActiveSuperAdmins,
  hasActiveSuperAdmin,
  createFirstSuperAdmin,
  recoverAdministratorPassword,
};
