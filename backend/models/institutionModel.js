const pool = require("../config/database");

const createInstitution = async ({
  name,
  walletAddress,
  email,
  phone,
}) => {
  const query = `
    INSERT INTO institutions (
      name,
      wallet_address,
      email,
      phone
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      name,
      wallet_address,
      email,
      phone,
      status,
      created_at
  `;

  const values = [
    name,
    walletAddress,
    email,
    phone || null,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

const getAllInstitutions = async ({ search = null, status = null, limit = 20, offset = 0, sortBy = "created_at", sortOrder = "DESC" } = {}) => {
  const sortFields = { name: "name", email: "email", status: "status", created_at: "created_at" };
  const column = sortFields[sortBy] || "created_at";
  const order = sortOrder === "ASC" ? "ASC" : "DESC";
  const values = []; const where = [];
  if (search) { values.push(search); where.push(`(name ILIKE $${values.length} ESCAPE '\\' OR email ILIKE $${values.length} ESCAPE '\\' OR wallet_address ILIKE $${values.length} ESCAPE '\\' OR phone ILIKE $${values.length} ESCAPE '\\')`); }
  if (status !== null) { values.push(status); where.push(`status = $${values.length}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM institutions ${clause}`, values);
  const resultValues = [...values, limit, offset];
  const result = await pool.query(`SELECT id, name, wallet_address, email, phone, status, created_at FROM institutions ${clause} ORDER BY ${column} ${order}, id ASC LIMIT $${resultValues.length - 1} OFFSET $${resultValues.length}`, resultValues);
  return { rows: result.rows, total: count.rows[0].total };
};

const getInstitutionById = async (id) => {
  const query = `
    SELECT
      id,
      name,
      wallet_address,
      email,
      phone,
      status,
      created_at
    FROM institutions
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0];
};

const updateInstitutionStatus = async (id, status) => {
  const query = `
    UPDATE institutions
    SET status = $1
    WHERE id = $2
    RETURNING
      id,
      name,
      wallet_address,
      email,
      phone,
      status,
      created_at
  `;

  const result = await pool.query(query, [status, id]);

  return result.rows[0];
};

module.exports = {
  createInstitution,
  getAllInstitutions,
  getInstitutionById,
  updateInstitutionStatus,
};
