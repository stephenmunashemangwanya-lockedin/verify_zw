const pool =
  require("../config/database");

const createCredential = async ({
  studentId,
  institutionId,
  qualification,
  issueDate,
  awardDate = issueDate,
  certificateHash,
  createdBy,
}) => {
  const result =
    await pool.query(
      `INSERT INTO credentials (
         student_id,
         institution_id,
         qualification,
         issue_date,
         award_date,
         certificate_hash,
         ipfs_cid,
         blockchain_tx,
         status,
         created_by
       )
       VALUES (
         $1,$2,$3,$4,$5,$6,NULL,NULL,'pending',$7
       )
       RETURNING
         id,
         student_id,
         institution_id,
         qualification,
         issue_date,
         award_date,
         certificate_hash,
         ipfs_cid,
         blockchain_tx,
         status,
         status_list_index,
         proof_version,
         created_by,
         created_at`,
      [
        studentId,
        institutionId,
        qualification,
        issueDate,
        awardDate,
        certificateHash,
        createdBy,
      ]
    );

  return result.rows[0];
};

const createProcessingCredential =
  async ({
    studentId,
    institutionId,
    qualification,
    issueDate,
    awardDate = issueDate,
    certificateHash,
    createdBy,
  }) => {
    const result =
      await pool.query(
        `INSERT INTO credentials (
           student_id,
           institution_id,
           qualification,
           issue_date,
           award_date,
           certificate_hash,
           status,
           public_token,
           created_by
         )
         VALUES (
           $1,$2,$3,$4,$5,$6,
           'processing',
           gen_random_uuid(),
           $7
         )
         RETURNING
           id,
           student_id,
           institution_id,
           qualification,
           issue_date,
           award_date,
           certificate_hash,
           ipfs_cid,
           blockchain_tx,
           status,
           public_token,
           status_list_index,
           proof_version,
           created_by,
           created_at,
           updated_at`,
        [
          studentId,
          institutionId,
          qualification,
          issueDate,
          awardDate,
          certificateHash,
          createdBy,
        ]
      );

    return result.rows[0];
  };

const setCredentialStructuredProof =
  async (
    id,
    {
      payload,
      commitment,
      signature,
      issuerWallet,
      proofType,
      canonicalisation,
      hashAlgorithm,
    }
  ) => {
    const result =
      await pool.query(
        `UPDATE credentials
         SET
           credential_payload = $2::jsonb,
           credential_commitment = $3,
           issuer_signature = $4,
           issuer_wallet = $5,
           proof_type = $6,
           proof_canonicalisation = $7,
           proof_hash_algorithm = $8,
           proof_version = 'structured-v2',
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND status = 'processing'
         RETURNING
           id,
           student_id,
           institution_id,
           qualification,
           issue_date,
           award_date,
           certificate_hash,
           credential_payload,
           credential_commitment,
           issuer_signature,
           issuer_wallet,
           proof_type,
           proof_canonicalisation,
           proof_hash_algorithm,
           proof_version,
           status_list_index,
           status,
           public_token,
           created_by,
           created_at,
           updated_at`,
        [
          id,
          JSON.stringify(
            payload
          ),
          commitment,
          signature,
          issuerWallet,
          proofType,
          canonicalisation,
          hashAlgorithm,
        ]
      );

    return result.rows[0];
  };

const updateCredentialIpfsData =
  async (
    id,
    ipfsCid
  ) => {
    const result =
      await pool.query(
        `UPDATE credentials
         SET
           ipfs_cid = $2,
           status = 'pending',
           processing_error = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING
           id,
           student_id,
           institution_id,
           qualification,
           issue_date,
           award_date,
           certificate_hash,
           credential_commitment,
           issuer_wallet,
           proof_version,
           status_list_index,
           ipfs_cid,
           blockchain_tx,
           blockchain_network,
           contract_address,
           block_number,
           status,
           public_token,
           qr_code_path,
           created_by,
           created_at,
           updated_at`,
        [
          id,
          ipfsCid,
        ]
      );

    return result.rows[0];
  };

const markCredentialFailed =
  async (
    id,
    processingError
  ) => {
    const result =
      await pool.query(
        `UPDATE credentials
         SET
           status = 'failed',
           processing_error = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING
           id,
           status,
           updated_at`,
        [
          id,
          processingError,
        ]
      );

    return result.rows[0];
  };

const activateCredential =
  async (
    id,
    blockchainResult
  ) => {
    const result =
      await pool.query(
        `UPDATE credentials
         SET
           blockchain_tx = $2,
           blockchain_network = $3,
           contract_address = $4,
           block_number = $5,
           status = 'active',
           processing_error = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND ipfs_cid IS NOT NULL
         RETURNING
           id,
           student_id,
           institution_id,
           qualification,
           issue_date,
           award_date,
           certificate_hash,
           credential_commitment,
           issuer_wallet,
           proof_version,
           status_list_index,
           ipfs_cid,
           blockchain_tx,
           blockchain_network,
           contract_address,
           block_number,
           status,
           public_token,
           created_by,
           created_at,
           updated_at`,
        [
          id,
          blockchainResult
            .transactionHash,
          blockchainResult
            .network,
          blockchainResult
            .contractAddress,
          blockchainResult
            .blockNumber,
        ]
      );

    return result.rows[0];
  };

const markCredentialRevoked =
  async (
    id,
    {
      revokedBy,
      reason,
      transactionHash,
    }
  ) => {
    const result =
      await pool.query(
        `UPDATE credentials
         SET
           status = 'revoked',
           revoked_by = $2,
           revocation_reason = $3,
           revocation_tx = $4,
           revoked_at = CURRENT_TIMESTAMP,
           processing_error = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND status = 'active'
         RETURNING
           id,
           student_id,
           institution_id,
           qualification,
           issue_date,
           award_date,
           certificate_hash,
           credential_commitment,
           issuer_wallet,
           proof_version,
           status_list_index,
           ipfs_cid,
           blockchain_tx,
           blockchain_network,
           contract_address,
           block_number,
           status,
           public_token,
           qr_code_path,
           created_by,
           revoked_by,
           revocation_reason,
           revocation_tx,
           revoked_at,
           superseded_by,
           superseded_at,
           supersession_reason,
           created_at,
           updated_at`,
        [
          id,
          revokedBy,
          reason,
          transactionHash,
        ]
      );

    return result.rows[0];
  };

const markCredentialSuperseded =
  async (
    id,
    {
      replacementCredentialId,
      reason,
    }
  ) => {
    const result =
      await pool.query(
        `UPDATE credentials
         SET
           status = 'superseded',
           superseded_by = $2,
           superseded_at = CURRENT_TIMESTAMP,
           supersession_reason = $3,
           processing_error = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND status = 'active'
           AND superseded_by IS NULL
         RETURNING
           id,
           student_id,
           institution_id,
           qualification,
           issue_date,
           award_date,
           certificate_hash,
           credential_commitment,
           issuer_wallet,
           proof_version,
           status_list_index,
           ipfs_cid,
           blockchain_tx,
           blockchain_network,
           contract_address,
           block_number,
           status,
           public_token,
           qr_code_path,
           superseded_by,
           superseded_at,
           supersession_reason,
           created_by,
           created_at,
           updated_at`,
        [
          id,
          replacementCredentialId,
          reason,
        ]
      );

    return result.rows[0];
  };

const updateCredentialQrCodePath =
  async (
    id,
    qrCodePath
  ) => {
    const result =
      await pool.query(
        `UPDATE credentials
         SET
           qr_code_path = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND public_token IS NOT NULL
         RETURNING
           id,
           public_token,
           qr_code_path,
           status,
           updated_at`,
        [
          id,
          qrCodePath,
        ]
      );

    return result.rows[0];
  };

const getCredentialsRequiringReconciliation =
  async () => {
    const result =
      await pool.query(
        `SELECT
           id,
           certificate_hash,
           credential_commitment,
           proof_version,
           issuer_wallet,
           ipfs_cid,
           status,
           blockchain_tx
         FROM credentials
         WHERE ipfs_cid IS NOT NULL
           AND status IN (
             'processing',
             'pending',
             'failed'
           )
         ORDER BY updated_at ASC`
      );

    return result.rows;
  };

const getCredentialById =
  async (id) => {
    const result =
      await pool.query(
        `SELECT
           credentials.id,
           credentials.student_id,
           credentials.institution_id,
           credentials.qualification,
           credentials.issue_date,
           credentials.award_date,
           credentials.certificate_hash,
           credentials.credential_payload,
           credentials.credential_commitment,
           credentials.issuer_signature,
           credentials.issuer_wallet,
           credentials.proof_type,
           credentials.proof_canonicalisation,
           credentials.proof_hash_algorithm,
           credentials.proof_version,
           credentials.status_list_index,
           credentials.ipfs_cid,
           credentials.blockchain_tx,
           credentials.blockchain_network,
           credentials.contract_address,
           credentials.block_number,
           credentials.public_token,
           credentials.qr_code_path,
           credentials.revocation_reason,
           credentials.revoked_at,
           credentials.superseded_by,
           credentials.superseded_at,
           credentials.supersession_reason,
           credentials.status,
           credentials.created_at,
           credentials.updated_at,

           students.student_number,
           students.full_name AS student_name,
           students.programme,

           institutions.name AS institution_name,
           institutions.wallet_address AS institution_wallet

         FROM credentials

         INNER JOIN students
           ON credentials.student_id =
              students.id

         INNER JOIN institutions
           ON credentials.institution_id =
              institutions.id

         WHERE credentials.id = $1
         LIMIT 1`,
        [
          id,
        ]
      );

    return result.rows[0];
  };

const listCredentials =
  async ({
    institutionId = null,
    studentId = null,
    search = null,
    status = null,
    issueDateFrom = null,
    issueDateTo = null,
    awardDateFrom = null,
    awardDateTo = null,
    limit = 20,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = {}) => {
    const fields = {
      issue_date:
        "credentials.issue_date",

      award_date:
        "credentials.award_date",

      qualification:
        "credentials.qualification",

      status:
        "credentials.status",

      created_at:
        "credentials.created_at",

      updated_at:
        "credentials.updated_at",
    };

    const column =
      fields[sortBy] ||
      fields.created_at;

    const order =
      sortOrder === "ASC"
        ? "ASC"
        : "DESC";

    const values = [];
    const where = [];

    const add = (
      condition,
      value
    ) => {
      values.push(
        value
      );

      where.push(
        condition.replace(
          "?",
          `$${values.length}`
        )
      );
    };

    if (institutionId) {
      add(
        "credentials.institution_id = ?",
        institutionId
      );
    }

    if (studentId) {
      add(
        "credentials.student_id = ?",
        studentId
      );
    }

    if (status) {
      add(
        "credentials.status = ?",
        status
      );
    }

    if (issueDateFrom) {
      add(
        "credentials.issue_date >= ?",
        issueDateFrom
      );
    }

    if (issueDateTo) {
      add(
        "credentials.issue_date <= ?",
        issueDateTo
      );
    }

    if (awardDateFrom) {
      add(
        "credentials.award_date >= ?",
        awardDateFrom
      );
    }

    if (awardDateTo) {
      add(
        "credentials.award_date <= ?",
        awardDateTo
      );
    }

    if (search) {
      values.push(
        search
      );

      const parameter =
        `$${values.length}`;

      where.push(
        `(credentials.qualification ILIKE ${parameter} ESCAPE '\\'
          OR students.full_name ILIKE ${parameter} ESCAPE '\\'
          OR students.student_number ILIKE ${parameter} ESCAPE '\\'
          OR institutions.name ILIKE ${parameter} ESCAPE '\\'
          OR LOWER(credentials.certificate_hash) =
             LOWER(REPLACE(${parameter}, '%', ''))
          OR LOWER(COALESCE(credentials.credential_commitment, '')) =
             LOWER(REPLACE(${parameter}, '%', '')))`
      );
    }

    const clause =
      where.length
        ? `WHERE ${where.join(
            " AND "
          )}`
        : "";

    const joins = `
      FROM credentials

      INNER JOIN students
        ON credentials.student_id =
           students.id

      INNER JOIN institutions
        ON credentials.institution_id =
           institutions.id
    `;

    const count =
      await pool.query(
        `SELECT
           COUNT(*)::int AS total
         ${joins}
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
           credentials.id,
           credentials.student_id,
           credentials.institution_id,
           credentials.qualification,
           credentials.issue_date,
           credentials.award_date,
           credentials.certificate_hash,
           credentials.credential_commitment,
           credentials.proof_version,
           credentials.status_list_index,
           credentials.ipfs_cid,
           credentials.blockchain_tx,
           credentials.status,
           credentials.superseded_by,
           credentials.superseded_at,
           credentials.supersession_reason,
           credentials.created_at,
           credentials.updated_at,

           students.student_number,
           students.full_name AS student_name,
           students.programme,

           institutions.name AS institution_name

         ${joins}
         ${clause}

         ORDER BY
           ${column} ${order},
           credentials.id ASC

         LIMIT $${resultValues.length - 1}
         OFFSET $${resultValues.length}`,
        resultValues
      );

    return {
      rows:
        result.rows,

      total:
        count.rows[0]
          .total,
    };
  };

const getAllCredentials =
  (
    options = {}
  ) =>
    listCredentials(
      options
    );

const getCredentialsByInstitution =
  (
    institutionId,
    options = {}
  ) =>
    listCredentials({
      ...options,
      institutionId,
    });

const getCredentialsByStudent =
  (
    studentId,
    options = {}
  ) =>
    listCredentials({
      ...options,
      studentId,
    });

const findCredentialByHash =
  async (
    certificateHash
  ) => {
    const result =
      await pool.query(
        `SELECT
           credentials.id,
           credentials.student_id,
           credentials.institution_id,
           credentials.qualification,
           credentials.issue_date,
           credentials.award_date,
           credentials.certificate_hash,
           credentials.credential_payload,
           credentials.credential_commitment,
           credentials.issuer_signature,
           credentials.issuer_wallet,
           credentials.proof_type,
           credentials.proof_canonicalisation,
           credentials.proof_hash_algorithm,
           credentials.proof_version,
           credentials.status_list_index,
           credentials.ipfs_cid,
           credentials.blockchain_tx,
           credentials.blockchain_network,
           credentials.contract_address,
           credentials.block_number,
           credentials.status,
           credentials.superseded_by,
           credentials.superseded_at,
           credentials.supersession_reason,
           credentials.created_at,

           students.student_number,
           students.full_name AS student_name,
           students.programme,

           institutions.name AS institution_name,
           institutions.wallet_address AS institution_wallet

         FROM credentials

         INNER JOIN students
           ON credentials.student_id =
              students.id

         INNER JOIN institutions
           ON credentials.institution_id =
              institutions.id

         WHERE credentials.certificate_hash = $1
         LIMIT 1`,
        [
          certificateHash,
        ]
      );

    return result.rows[0];
  };

module.exports = {
  createCredential,
  createProcessingCredential,
  setCredentialStructuredProof,
  updateCredentialIpfsData,
  markCredentialFailed,
  activateCredential,
  markCredentialRevoked,
  markCredentialSuperseded,
  updateCredentialQrCodePath,
  getCredentialsRequiringReconciliation,
  getCredentialById,
  getAllCredentials,
  getCredentialsByInstitution,
  getCredentialsByStudent,
  listCredentials,
  findCredentialByHash,
};