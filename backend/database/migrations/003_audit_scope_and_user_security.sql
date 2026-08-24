BEGIN;

-- Institution scope enables efficient, enforceable audit-log boundaries.
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS institution_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_institution') THEN
    ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_institution
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_institution_created
  ON audit_logs (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_created
  ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_logs (entity_type, entity_id);

COMMENT ON COLUMN audit_logs.institution_id IS
  'Optional denormalised institution boundary used to enforce scoped audit access.';

-- Additive account-security state. Defaults preserve every existing account.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_token_version_nonnegative') THEN
    ALTER TABLE users ADD CONSTRAINT users_token_version_nonnegative CHECK (token_version >= 0) NOT VALID;
    ALTER TABLE users VALIDATE CONSTRAINT users_token_version_nonnegative;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_failed_login_attempts_nonnegative') THEN
    ALTER TABLE users ADD CONSTRAINT users_failed_login_attempts_nonnegative CHECK (failed_login_attempts >= 0) NOT VALID;
    ALTER TABLE users VALIDATE CONSTRAINT users_failed_login_attempts_nonnegative;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_institution_role ON users (institution_id, role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active);

COMMIT;
