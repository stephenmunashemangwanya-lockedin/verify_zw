BEGIN;

-- ============================================================
-- Structured credential proof foundation.
--
-- Existing credentials remain valid legacy records.
-- New structured credentials will later use these fields for:
--   RFC 8785 canonical payload
--   SHA-256 canonical commitment
--   institution issuer signature
--   status-list index
--
-- This migration does NOT replace certificate_hash.
-- certificate_hash remains the SHA-256 of the uploaded PDF.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Stable lifecycle/status-list index
-- ------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS
  credential_status_list_index_seq
  MINVALUE 0
  START WITH 0;

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS
    status_list_index BIGINT;

ALTER TABLE credentials
  ALTER COLUMN status_list_index
  SET DEFAULT
    nextval(
      'credential_status_list_index_seq'
    );

UPDATE credentials
SET status_list_index =
  nextval(
    'credential_status_list_index_seq'
  )
WHERE status_list_index IS NULL;

ALTER TABLE credentials
  ALTER COLUMN status_list_index
  SET NOT NULL;

ALTER SEQUENCE
  credential_status_list_index_seq
  OWNED BY
  credentials.status_list_index;

CREATE UNIQUE INDEX IF NOT EXISTS
  uq_credentials_status_list_index
ON credentials (
  status_list_index
);


-- ------------------------------------------------------------
-- 2. Structured credential proof material
-- ------------------------------------------------------------

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS
    credential_payload JSONB;

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS
    credential_commitment VARCHAR(64);

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS
    issuer_signature TEXT;

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS
    issuer_wallet VARCHAR(42);

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS
    proof_type VARCHAR(80);

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS
    proof_canonicalisation VARCHAR(20);

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS
    proof_hash_algorithm VARCHAR(20);

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS
    proof_version VARCHAR(30)
    NOT NULL
    DEFAULT 'legacy-v1';


-- ------------------------------------------------------------
-- 3. Proof integrity constraints
-- ------------------------------------------------------------

ALTER TABLE credentials
  DROP CONSTRAINT IF EXISTS
    credentials_proof_version_check;

ALTER TABLE credentials
  ADD CONSTRAINT
    credentials_proof_version_check
  CHECK (
    proof_version IN (
      'legacy-v1',
      'structured-v2'
    )
  )
  NOT VALID;

ALTER TABLE credentials
  VALIDATE CONSTRAINT
    credentials_proof_version_check;


ALTER TABLE credentials
  DROP CONSTRAINT IF EXISTS
    credentials_commitment_format_check;

ALTER TABLE credentials
  ADD CONSTRAINT
    credentials_commitment_format_check
  CHECK (
    credential_commitment IS NULL
    OR credential_commitment
      ~ '^[0-9a-f]{64}$'
  )
  NOT VALID;

ALTER TABLE credentials
  VALIDATE CONSTRAINT
    credentials_commitment_format_check;


ALTER TABLE credentials
  DROP CONSTRAINT IF EXISTS
    credentials_structured_proof_check;

ALTER TABLE credentials
  ADD CONSTRAINT
    credentials_structured_proof_check
  CHECK (
    proof_version <> 'structured-v2'
    OR (
      credential_payload IS NOT NULL
      AND credential_commitment IS NOT NULL
      AND issuer_signature IS NOT NULL
      AND issuer_wallet IS NOT NULL
      AND proof_type IS NOT NULL
      AND proof_canonicalisation IS NOT NULL
      AND proof_hash_algorithm IS NOT NULL
    )
  )
  NOT VALID;

ALTER TABLE credentials
  VALIDATE CONSTRAINT
    credentials_structured_proof_check;


CREATE UNIQUE INDEX IF NOT EXISTS
  uq_credentials_credential_commitment
ON credentials (
  credential_commitment
)
WHERE credential_commitment IS NOT NULL;


-- ------------------------------------------------------------
-- 4. Verification result vocabulary
-- ------------------------------------------------------------

ALTER TABLE verification_logs
  DROP CONSTRAINT IF EXISTS
    verification_logs_result_code_check;

ALTER TABLE verification_logs
  ADD CONSTRAINT
    verification_logs_result_code_check
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
      'SIGNATURE_INVALID',
      'ANCHOR_MISMATCH',
      'ACCREDITATION_INVALID',
      'SYSTEM_INCONSISTENCY',
      'INVALID_FILE'
    )
  )
  NOT VALID;

ALTER TABLE verification_logs
  VALIDATE CONSTRAINT
    verification_logs_result_code_check;


-- ------------------------------------------------------------
-- 5. Documentation
-- ------------------------------------------------------------

COMMENT ON COLUMN credentials.certificate_hash IS
  'SHA-256 hash of the uploaded certificate PDF; retained for document tamper detection.';

COMMENT ON COLUMN credentials.credential_payload IS
  'Unsigned W3C-compatible structured credential payload stored off-ledger.';

COMMENT ON COLUMN credentials.credential_commitment IS
  'SHA-256 commitment of the RFC 8785 canonical credential payload.';

COMMENT ON COLUMN credentials.issuer_signature IS
  'Institution issuer signature over the canonical credential payload.';

COMMENT ON COLUMN credentials.issuer_wallet IS
  'Institution wallet address expected to validate the issuer signature.';

COMMENT ON COLUMN credentials.status_list_index IS
  'Stable index reserved for the credential lifecycle status-list mechanism.';

COMMENT ON COLUMN credentials.proof_version IS
  'legacy-v1 preserves credentials issued before structured proof support; structured-v2 identifies canonical signed credentials.';

COMMIT;