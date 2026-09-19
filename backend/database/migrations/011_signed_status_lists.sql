BEGIN;

CREATE TABLE IF NOT EXISTS status_lists (
  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  institution_id UUID NOT NULL
    REFERENCES institutions(id)
    ON DELETE RESTRICT,

  version INTEGER NOT NULL,

  revoked_indices JSONB NOT NULL
    DEFAULT '[]'::jsonb,

  issued_at TIMESTAMPTZ NOT NULL,

  next_update TIMESTAMPTZ NOT NULL,

  payload JSONB NOT NULL,

  signature TEXT NOT NULL,

  issuer_wallet VARCHAR(42) NOT NULL,

  commitment VARCHAR(64) NOT NULL,

  blockchain_tx TEXT,
  blockchain_network TEXT,
  contract_address TEXT,
  block_number BIGINT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (
    institution_id,
    version
  )
);

ALTER TABLE status_lists
  DROP CONSTRAINT IF EXISTS
    status_lists_version_check;

ALTER TABLE status_lists
  ADD CONSTRAINT
    status_lists_version_check
  CHECK (
    version > 0
  );

ALTER TABLE status_lists
  DROP CONSTRAINT IF EXISTS
    status_lists_time_range_check;

ALTER TABLE status_lists
  ADD CONSTRAINT
    status_lists_time_range_check
  CHECK (
    next_update > issued_at
  );

ALTER TABLE status_lists
  DROP CONSTRAINT IF EXISTS
    status_lists_revoked_indices_check;

ALTER TABLE status_lists
  ADD CONSTRAINT
    status_lists_revoked_indices_check
  CHECK (
    jsonb_typeof(
      revoked_indices
    ) = 'array'
  );

ALTER TABLE status_lists
  DROP CONSTRAINT IF EXISTS
    status_lists_commitment_check;

ALTER TABLE status_lists
  ADD CONSTRAINT
    status_lists_commitment_check
  CHECK (
    commitment
      ~ '^[0-9a-f]{64}$'
  );

CREATE INDEX IF NOT EXISTS
  idx_status_lists_institution_latest
ON status_lists (
  institution_id,
  version DESC
);

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
      'STATUS_INDETERMINATE',
      'ACCREDITATION_INVALID',
      'SYSTEM_INCONSISTENCY',
      'INVALID_FILE'
    )
  );

COMMENT ON TABLE status_lists IS
  'Versioned issuer-controlled signed credential lifecycle status artefacts.';

COMMENT ON COLUMN status_lists.revoked_indices IS
  'Status-list indexes treated as revoked in this published version.';

COMMENT ON COLUMN status_lists.next_update IS
  'Freshness boundary after which this artefact must not produce a valid lifecycle decision.';

COMMIT;
