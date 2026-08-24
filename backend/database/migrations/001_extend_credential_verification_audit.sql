-- Extend the existing credential workflow without renaming or removing data.
-- This migration is intentionally idempotent and safe to execute repeatedly.
BEGIN;

-- Blockchain and IPFS lifecycle metadata. Existing ipfs_cid and blockchain_tx
-- columns are preserved; ipfs_cid must contain only a provider-issued CID.
ALTER TABLE credentials
    ADD COLUMN IF NOT EXISTS blockchain_network VARCHAR(100),
    ADD COLUMN IF NOT EXISTS contract_address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS block_number BIGINT,
    ADD COLUMN IF NOT EXISTS processing_error TEXT,
    ADD COLUMN IF NOT EXISTS public_token UUID,
    ADD COLUMN IF NOT EXISTS qr_code_path TEXT,
    ADD COLUMN IF NOT EXISTS revoked_by UUID,
    ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
    ADD COLUMN IF NOT EXISTS revocation_tx TEXT;

-- Block numbers cannot be negative. Add the check only when it is not already
-- present, because PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'credentials'::regclass
          AND conname = 'credentials_block_number_check'
    ) THEN
        ALTER TABLE credentials
            ADD CONSTRAINT credentials_block_number_check
            CHECK (block_number IS NULL OR block_number >= 0) NOT VALID;
    END IF;
END $$;

-- Preserve the issuing/revoking user history if a user is later removed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'credentials'::regclass
          AND conname = 'fk_credentials_revoked_by'
    ) THEN
        ALTER TABLE credentials
            ADD CONSTRAINT fk_credentials_revoked_by
            FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
            NOT VALID;
    END IF;
END $$;

-- Never silently rewrite an unknown status. Abort the transaction if existing
-- data would conflict with the expanded lifecycle constraint.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM credentials
        WHERE status IS NULL
           OR status NOT IN ('pending', 'processing', 'active', 'failed', 'revoked')
    ) THEN
        RAISE EXCEPTION
            'Credential status migration aborted: unsupported existing status found';
    END IF;
END $$;

ALTER TABLE credentials
    DROP CONSTRAINT IF EXISTS credentials_status_check;

ALTER TABLE credentials
    ADD CONSTRAINT credentials_status_check
    CHECK (status IN ('pending', 'processing', 'active', 'failed', 'revoked'))
    NOT VALID;

ALTER TABLE credentials VALIDATE CONSTRAINT credentials_status_check;
ALTER TABLE credentials VALIDATE CONSTRAINT credentials_block_number_check;
ALTER TABLE credentials VALIDATE CONSTRAINT fk_credentials_revoked_by;

-- Public tokens identify verification URLs without exposing sequential or
-- guessable identifiers. Multiple NULL values remain valid for legacy rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_credentials_public_token
    ON credentials (public_token);

-- The existing certificate_hash UNIQUE constraint is retained. Its backing
-- unique B-tree index provides both duplicate prevention and hash lookup.
CREATE INDEX IF NOT EXISTS idx_credentials_status
    ON credentials (status);
CREATE INDEX IF NOT EXISTS idx_credentials_institution
    ON credentials (institution_id);
CREATE INDEX IF NOT EXISTS idx_credentials_student
    ON credentials (student_id);

-- Verification context supports file, hash, ID, token, URL, and QR workflows.
ALTER TABLE verification_logs
    ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS uploaded_hash TEXT,
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_verification_logs_time
    ON verification_logs (verification_time DESC);

-- An older installation may already use idx_verification_credential for this
-- column. Remove only this migration's redundant index from an earlier run,
-- then create it only when no equivalent credential_id index exists.
DROP INDEX IF EXISTS idx_verification_logs_credential;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'verification_logs'
          AND indexdef ~ '\(credential_id\)'
    ) THEN
        CREATE INDEX idx_verification_logs_credential
            ON verification_logs (credential_id);
    END IF;
END $$;

-- Audit request context is added without changing existing JSON details.
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS ip_address INET,
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

COMMENT ON COLUMN credentials.blockchain_network IS
    'Configured EVM network on which the credential proof was confirmed.';
COMMENT ON COLUMN credentials.contract_address IS
    'Registry contract address used for this credential transaction.';
COMMENT ON COLUMN credentials.block_number IS
    'Confirmed blockchain block number; never a pending estimate.';
COMMENT ON COLUMN credentials.processing_error IS
    'Internal failure summary for failed processing; not for public responses.';
COMMENT ON COLUMN credentials.public_token IS
    'Unpredictable unique token used by public verification URLs and QR codes.';
COMMENT ON COLUMN credentials.qr_code_path IS
    'Server-managed QR artifact path; never stored in ipfs_cid.';
COMMENT ON COLUMN credentials.revoked_by IS
    'User who authorised revocation, retained as a nullable foreign key.';
COMMENT ON COLUMN credentials.revocation_reason IS
    'Human-readable reason supplied by the authorised revoker.';
COMMENT ON COLUMN credentials.revocation_tx IS
    'Confirmed blockchain transaction hash recording revocation.';
COMMENT ON COLUMN verification_logs.verification_method IS
    'Controlled verification channel such as file, hash, id, token, or qr.';
COMMENT ON COLUMN verification_logs.uploaded_hash IS
    'SHA-256 calculated from a certificate submitted for verification.';
COMMENT ON COLUMN verification_logs.user_agent IS
    'Request user agent captured for security auditing.';
COMMENT ON COLUMN audit_logs.ip_address IS
    'Originating request address where an audit event has request context.';
COMMENT ON COLUMN audit_logs.user_agent IS
    'Originating request user agent, excluding credentials and tokens.';

COMMIT;
