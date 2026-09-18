BEGIN;

-- ============================================================
-- Verification outcomes introduced after the original
-- research trust/lifecycle migration.
--
-- Migration 008 is already applied and immutable.
-- ============================================================

ALTER TABLE verification_logs
  DROP CONSTRAINT IF EXISTS verification_logs_result_code_check;

ALTER TABLE verification_logs
  ADD CONSTRAINT verification_logs_result_code_check
  CHECK (
    result_code IS NULL
    OR result_code IN (
      'VERIFIED',
      'REVOKED',
      'SUPERSEDED',
      'UNKNOWN',
      'PENDING',
      'FAILED',
      'TAMPERED',
      'ACCREDITATION_INVALID',
      'SYSTEM_INCONSISTENCY',
      'INVALID_FILE'
    )
  )
  NOT VALID;

ALTER TABLE verification_logs
  VALIDATE CONSTRAINT verification_logs_result_code_check;

COMMENT ON COLUMN verification_logs.result_code IS
  'Controlled verification outcome including document integrity, credential lifecycle and accreditation decisions.';

COMMIT;