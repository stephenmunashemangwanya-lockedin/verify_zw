const pool = require("../config/database");

const createStudent = async ({
  studentNumber,
  fullName,
  email,
  programme,
  institutionId,
}) => {
  const query = `
    INSERT INTO students (
      student_number,
      full_name,
      email,
      programme,
      institution_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      student_number,
      full_name,
      email,
      programme,
      institution_id,
      created_at
  `;

  const values = [
    studentNumber,
    fullName,
    email || null,
    programme,
    institutionId,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

const listStudents = async ({ institutionId = null, search = null, programme = null, limit = 20, offset = 0, sortBy = "created_at", sortOrder = "DESC" } = {}) => {
  const fields = { student_number: "students.student_number", full_name: "students.full_name", programme: "students.programme", created_at: "students.created_at" };
  const column = fields[sortBy] || fields.created_at; const order = sortOrder === "ASC" ? "ASC" : "DESC";
  const values = []; const where = [];
  if (institutionId) { values.push(institutionId); where.push(`students.institution_id = $${values.length}`); }
  if (search) { values.push(search); where.push(`(students.student_number ILIKE $${values.length} ESCAPE '\\' OR students.full_name ILIKE $${values.length} ESCAPE '\\' OR students.email ILIKE $${values.length} ESCAPE '\\' OR students.programme ILIKE $${values.length} ESCAPE '\\')`); }
  if (programme) { values.push(programme); where.push(`students.programme ILIKE $${values.length} ESCAPE '\\'`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM students ${clause}`, values);
  const resultValues = [...values, limit, offset];
  const result = await pool.query(`SELECT students.id, students.student_number, students.full_name, students.email, students.programme, students.institution_id, institutions.name AS institution_name, students.created_at FROM students INNER JOIN institutions ON students.institution_id = institutions.id ${clause} ORDER BY ${column} ${order}, students.id ASC LIMIT $${resultValues.length - 1} OFFSET $${resultValues.length}`, resultValues);
  return { rows: result.rows, total: count.rows[0].total };
};
const getAllStudents = (options = {}) => listStudents(options);
const getStudentsByInstitution = (institutionId, options = {}) => listStudents({ ...options, institutionId });

const getStudentById = async (id) => {
  const query = `
    SELECT
      students.id,
      students.student_number,
      students.full_name,
      students.email,
      students.programme,
      students.institution_id,
      institutions.name AS institution_name,
      students.created_at
    FROM students
    INNER JOIN institutions
      ON students.institution_id = institutions.id
    WHERE students.id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0];
};

const updateStudent = async (id, { studentNumber, fullName, email, programme }) => {
  const result = await pool.query(`UPDATE students SET student_number=$2, full_name=$3, email=$4, programme=$5 WHERE id=$1 RETURNING id,student_number,full_name,email,programme,institution_id,created_at`, [id, studentNumber, fullName, email || null, programme]);
  return result.rows[0];
};
const studentHasCredentials = async (id) => Number((await pool.query(`SELECT COUNT(*)::int AS count FROM credentials WHERE student_id=$1`, [id])).rows[0].count) > 0;
const reassignStudentInstitution = async (id, institutionId) => {
  const result = await pool.query(`UPDATE students SET institution_id=$2 WHERE id=$1 RETURNING id,student_number,full_name,email,programme,institution_id,created_at`, [id, institutionId]);
  return result.rows[0];
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentsByInstitution,
  getStudentById,
  updateStudent,
  studentHasCredentials,
  reassignStudentInstitution,
};
