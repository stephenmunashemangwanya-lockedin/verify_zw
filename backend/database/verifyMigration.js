const assert = require("assert/strict");

require("dotenv").config({ quiet: true });

const pool = require("../config/database");

const expectedColumns = {
  credentials: [
    "id", "student_id", "institution_id", "qualification", "issue_date",
    "certificate_hash", "ipfs_cid", "blockchain_tx", "blockchain_network",
    "contract_address", "block_number", "status", "processing_error",
    "public_token", "qr_code_path", "created_by", "revoked_by",
    "revocation_reason", "revocation_tx", "revoked_at", "created_at",
    "updated_at",
  ],
  verification_logs: [
    "credential_id", "verifier_name", "verifier_email", "result",
    "verification_method", "uploaded_hash", "ip_address", "user_agent",
    "verification_time", "result_code",
  ],
  audit_logs: [
    "user_id", "action", "entity_type", "entity_id", "details",
    "ip_address", "user_agent", "created_at",
  ],
};

const requiredIndexes = [
  "credentials_certificate_hash_key",
  "uq_credentials_public_token",
  "idx_credentials_status",
  "idx_credentials_institution",
  "idx_credentials_student",
  "idx_verification_logs_time",
];

const verifyMigration = async () => {
  const columnsResult = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('credentials', 'verification_logs', 'audit_logs')
    ORDER BY table_name, ordinal_position
  `);

  const constraintsResult = await pool.query(`
    SELECT
      conrelid::regclass::text AS table_name,
      conname,
      pg_get_constraintdef(pg_constraint.oid) AS definition,
      convalidated
    FROM pg_constraint
    WHERE conrelid IN (
      'credentials'::regclass,
      'verification_logs'::regclass,
      'audit_logs'::regclass
    )
    ORDER BY table_name, conname
  `);

  const indexesResult = await pool.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('credentials', 'verification_logs', 'audit_logs')
    ORDER BY tablename, indexname
  `);

  for (const [tableName, columnNames] of Object.entries(expectedColumns)) {
    const actualNames = new Set(
      columnsResult.rows
        .filter((column) => column.table_name === tableName)
        .map((column) => column.column_name)
    );

    for (const columnName of columnNames) {
      assert(actualNames.has(columnName), `${tableName}.${columnName} is missing`);
    }
  }

  const indexNames = new Set(indexesResult.rows.map((index) => index.indexname));
  for (const indexName of requiredIndexes) {
    assert(indexNames.has(indexName), `Required index ${indexName} is missing`);
  }

  assert(
    indexesResult.rows.some(
      (index) =>
        index.tablename === "verification_logs" &&
        /\(credential_id\)/.test(index.indexdef)
    ),
    "Verification credential index is missing"
  );

  const statusConstraint = constraintsResult.rows.find(
    (constraint) => constraint.conname === "credentials_status_check"
  );
  assert(statusConstraint, "Credential status constraint is missing");
  assert(statusConstraint.convalidated, "Credential status constraint is not validated");

  for (const status of ["pending", "processing", "active", "failed", "revoked"]) {
    assert(
      statusConstraint.definition.includes(status),
      `Credential status constraint does not permit ${status}`
    );
  }

  console.log(JSON.stringify({
    columns: columnsResult.rows,
    constraints: constraintsResult.rows,
    indexes: indexesResult.rows,
  }, null, 2));
  console.log("Migration schema verification passed.");
};

verifyMigration()
  .catch((error) => {
    console.error("Migration schema verification failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
