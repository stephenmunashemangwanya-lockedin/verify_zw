BEGIN;

-- Store only a SHA-256 digest of a single-use reset token. Existing users
-- remain unchanged and no plaintext reset material is persisted.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_expiry
  ON users (password_reset_expires_at)
  WHERE password_reset_token_hash IS NOT NULL;

COMMENT ON COLUMN users.password_reset_token_hash IS
  'SHA-256 digest of a single-use password setup/reset token; never plaintext.';
COMMENT ON COLUMN users.password_reset_expires_at IS
  'Expiry for the corresponding single-use password reset token.';

COMMIT;
