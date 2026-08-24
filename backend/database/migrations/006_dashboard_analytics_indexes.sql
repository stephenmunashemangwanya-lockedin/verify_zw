BEGIN;

-- Support tenant-scoped credential status aggregates.
CREATE INDEX IF NOT EXISTS idx_credentials_institution_status
  ON credentials (institution_id, status);

-- Support tenant-scoped active/inactive user aggregates.
CREATE INDEX IF NOT EXISTS idx_users_institution_active
  ON users (institution_id, is_active);

-- Support result-code trend aggregation over bounded date ranges.
CREATE INDEX IF NOT EXISTS idx_verification_result_time
  ON verification_logs (result_code, verification_time DESC);

-- Support recent activity and failure analytics by entity category.
CREATE INDEX IF NOT EXISTS idx_audit_entity_type_created
  ON audit_logs (entity_type, created_at DESC);

COMMIT;
