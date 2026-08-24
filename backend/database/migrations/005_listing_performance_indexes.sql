BEGIN;

-- Support filtered institution lists in stable newest-first order.
CREATE INDEX IF NOT EXISTS idx_institutions_status_created
  ON institutions (status, created_at DESC);

-- Keep tenant-scoped student pagination inside the institution boundary.
CREATE INDEX IF NOT EXISTS idx_students_institution_created
  ON students (institution_id, created_at DESC);

-- Support tenant-scoped user pagination without scanning users from other institutions.
CREATE INDEX IF NOT EXISTS idx_users_institution_created
  ON users (institution_id, created_at DESC);

-- Support common administrative role/status filtering with stable chronological order.
CREATE INDEX IF NOT EXISTS idx_users_role_active_created
  ON users (role, is_active, created_at DESC);

-- Support inclusive issue-date filters and global credential chronology.
CREATE INDEX IF NOT EXISTS idx_credentials_issue_date
  ON credentials (issue_date);
CREATE INDEX IF NOT EXISTS idx_credentials_created
  ON credentials (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credentials_updated
  ON credentials (updated_at DESC);

-- Support method-specific verification history without exposing verifier identity fields.
CREATE INDEX IF NOT EXISTS idx_verification_method_time
  ON verification_logs (verification_method, verification_time DESC);

-- Support global audit chronology; tenant/action composites remain in migration 003.
CREATE INDEX IF NOT EXISTS idx_audit_created
  ON audit_logs (created_at DESC);

COMMIT;
