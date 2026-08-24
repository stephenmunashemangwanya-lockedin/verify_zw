-- Allow every public verification attempt, including unknown certificates, to
-- be recorded without changing or deleting legacy verification data.
BEGIN;

ALTER TABLE verification_logs
    ALTER COLUMN credential_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS result_code VARCHAR(30);

-- Backfill a controlled code for any legacy boolean result rows.
UPDATE verification_logs
SET result_code = CASE WHEN result THEN 'VERIFIED' ELSE 'UNKNOWN' END
WHERE result_code IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'verification_logs'::regclass
          AND conname = 'verification_logs_result_code_check'
    ) THEN
        ALTER TABLE verification_logs
            ADD CONSTRAINT verification_logs_result_code_check
            CHECK (result_code IS NULL OR result_code IN (
                'VERIFIED', 'REVOKED', 'UNKNOWN', 'PENDING', 'FAILED',
                'SYSTEM_INCONSISTENCY', 'INVALID_FILE'
            )) NOT VALID;
    END IF;
END $$;

ALTER TABLE verification_logs
    VALIDATE CONSTRAINT verification_logs_result_code_check;

CREATE INDEX IF NOT EXISTS idx_verification_logs_result_code
    ON verification_logs (result_code);

COMMENT ON COLUMN verification_logs.result IS
    'Legacy boolean compatibility: true only for VERIFIED outcomes.';
COMMENT ON COLUMN verification_logs.result_code IS
    'Controlled public verification outcome code.';

COMMIT;
