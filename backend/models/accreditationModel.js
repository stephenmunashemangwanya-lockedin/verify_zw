const pool =
  require("../config/database");

const createAccreditation = async ({
  institutionId,
  programme = null,
  validFrom,
  validTo = null,
  status = "accredited",
  sourceLabel =
    "SIMULATED_REGULATOR",
  createdBy = null,
}) => {
  const result =
    await pool.query(
      `INSERT INTO institution_accreditations (
         institution_id,
         programme,
         valid_from,
         valid_to,
         status,
         source_label,
         created_by
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6,
         $7
       )
       RETURNING
         id,
         institution_id,
         programme,
         valid_from,
         valid_to,
         status,
         source_label,
         created_by,
         created_at,
         updated_at`,
      [
        institutionId,
        programme || null,
        validFrom,
        validTo || null,
        status,
        sourceLabel,
        createdBy,
      ]
    );

  return result.rows[0];
};

const getAccreditationById =
  async (id) => {
    const result =
      await pool.query(
        `SELECT
           id,
           institution_id,
           programme,
           valid_from,
           valid_to,
           status,
           source_label,
           created_by,
           created_at,
           updated_at
         FROM institution_accreditations
         WHERE id = $1
         LIMIT 1`,
        [id]
      );

    return result.rows[0];
  };

const findEffectiveAccreditation =
  async ({
    institutionId,
    programme,
    awardDate,
  }) => {
    const result =
      await pool.query(
        `SELECT
           id,
           institution_id,
           programme,
           valid_from,
           valid_to,
           status,
           source_label,
           created_by,
           created_at,
           updated_at
         FROM institution_accreditations
         WHERE institution_id = $1
           AND status = 'accredited'
           AND valid_from <= $3::date
           AND (
             valid_to IS NULL
             OR valid_to >= $3::date
           )
           AND (
             programme IS NULL
             OR LOWER(programme) =
                LOWER($2)
           )
         ORDER BY
           CASE
             WHEN programme IS NULL
             THEN 1
             ELSE 0
           END ASC,
           valid_from DESC,
           id ASC
         LIMIT 1`,
        [
          institutionId,
          programme,
          awardDate,
        ]
      );

    return result.rows[0];
  };

const listAccreditations =
  async ({
    institutionId = null,
    status = null,
    limit = 100,
    offset = 0,
  } = {}) => {
    const values = [];
    const where = [];

    if (institutionId) {
      values.push(
        institutionId
      );

      where.push(
        `institution_id = $${values.length}`
      );
    }

    if (status) {
      values.push(status);

      where.push(
        `status = $${values.length}`
      );
    }

    const clause =
      where.length
        ? `WHERE ${where.join(
            " AND "
          )}`
        : "";

    const count =
      await pool.query(
        `SELECT
           COUNT(*)::int AS total
         FROM institution_accreditations
         ${clause}`,
        values
      );

    const resultValues = [
      ...values,
      limit,
      offset,
    ];

    const result =
      await pool.query(
        `SELECT
           ia.id,
           ia.institution_id,
           ia.programme,
           ia.valid_from,
           ia.valid_to,
           ia.status,
           ia.source_label,
           ia.created_by,
           ia.created_at,
           ia.updated_at,
           institutions.name
             AS institution_name
         FROM institution_accreditations ia
         INNER JOIN institutions
           ON institutions.id =
              ia.institution_id
         ${clause
           .replaceAll(
             "institution_id",
             "ia.institution_id"
           )
           .replaceAll(
             "status",
             "ia.status"
           )}
         ORDER BY
           ia.valid_from DESC,
           ia.created_at DESC,
           ia.id ASC
         LIMIT $${resultValues.length - 1}
         OFFSET $${resultValues.length}`,
        resultValues
      );

    return {
      rows: result.rows,
      total:
        count.rows[0].total,
    };
  };

const updateAccreditationStatus =
  async (
    id,
    status
  ) => {
    const result =
      await pool.query(
        `UPDATE institution_accreditations
         SET
           status = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING
           id,
           institution_id,
           programme,
           valid_from,
           valid_to,
           status,
           source_label,
           created_by,
           created_at,
           updated_at`,
        [
          id,
          status,
        ]
      );

    return result.rows[0];
  };

module.exports = {
  createAccreditation,
  getAccreditationById,
  findEffectiveAccreditation,
  listAccreditations,
  updateAccreditationStatus,
};