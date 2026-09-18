BEGIN;

-- ============================================================
-- Chapter 3 research trust/lifecycle foundation.
-- Additive only: preserves all existing credential evidence.
-- ============================================================

-- Award date is distinct from the platform issue/registration date.
ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS award_date DATE;

-- Preserve existing records by treating their historical issue date
-- as their award date where no separate award date existed.
UPDATE credentials
SET award_date = issue_date
WHERE award_date IS NULL;

ALTER TABLE credentials
  ALTER COLUMN award_date SET NOT NULL;

-- Award cannot occur after the recorded issue date.
ALTER TABLE credentials
  DROP CONSTRAINT IF EXISTS credentials_award_date_check;

ALTER TABLE credentials
  ADD CONSTRAINT credentials_award_date_check
  CHECK (award_date <= issue_date)
  NOT VALID;

ALTER TABLE credentials
  VALIDATE CONSTRAINT credentials_award_date_check;


-- ============================================================
-- Correction / replacement lifecycle
-- ============================================================

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS superseded_by UUID;

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS supersession_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_credentials_superseded_by'
  ) THEN
    ALTER TABLE credentials
      ADD CONSTRAINT fk_credentials_superseded_by
      FOREIGN KEY (superseded_by)
      REFERENCES credentials(id)
      ON DELETE RESTRICT
      NOT VALID;

    ALTER TABLE credentials
      VALIDATE CONSTRAINT fk_credentials_superseded_by;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS
  uq_credentials_superseded_by
ON credentials (superseded_by)
WHERE superseded_by IS NOT NULL;


-- Existing PostgreSQL inline status check is expected to use this name.
ALTER TABLE credentials
  DROP CONSTRAINT IF EXISTS credentials_status_check;

ALTER TABLE credentials
  ADD CONSTRAINT credentials_status_check
  CHECK (
    status IN (
      'pending',
      'processing',
      'active',
      'failed',
      'revoked',
      'superseded'
    )
  )
  NOT VALID;

ALTER TABLE credentials
  VALIDATE CONSTRAINT credentials_status_check;

ALTER TABLE credentials
  DROP CONSTRAINT IF EXISTS credentials_supersession_state_check;

ALTER TABLE credentials
  ADD CONSTRAINT credentials_supersession_state_check
  CHECK (
    (
      status = 'superseded'
      AND superseded_by IS NOT NULL
      AND superseded_at IS NOT NULL
    )
    OR status <> 'superseded'
  )
  NOT VALID;

ALTER TABLE credentials
  VALIDATE CONSTRAINT credentials_supersession_state_check;


-- ============================================================
-- Simulated regulator accreditation records
-- Technical blockchain authorisation remains separate.
-- ============================================================

CREATE TABLE IF NOT EXISTS institution_accreditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  institution_id UUID NOT NULL,

  -- NULL means institution-wide accreditation.
  -- A value means accreditation is limited to that programme.
  programme VARCHAR(300),

  valid_from DATE NOT NULL,
  valid_to DATE,

  status VARCHAR(20) NOT NULL DEFAULT 'accredited',

  source_label VARCHAR(120)
    NOT NULL
    DEFAULT 'SIMULATED_REGULATOR',

  created_by UUID,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_accreditation_institution
    FOREIGN KEY (institution_id)
    REFERENCES institutions(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_accreditation_created_by
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT accreditation_status_check
    CHECK (
      status IN (
        'accredited',
        'suspended',
        'revoked'
      )
    ),

  CONSTRAINT accreditation_date_range_check
    CHECK (
      valid_to IS NULL
      OR valid_to >= valid_from
    )
);

CREATE INDEX IF NOT EXISTS
  idx_accreditation_institution
ON institution_accreditations (
  institution_id
);

CREATE INDEX IF NOT EXISTS
  idx_accreditation_effective_dates
ON institution_accreditations (
  institution_id,
  valid_from,
  valid_to
);

CREATE INDEX IF NOT EXISTS
  idx_accreditation_programme
ON institution_accreditations (
  institution_id,
  programme
)
WHERE programme IS NOT NULL;

CREATE INDEX IF NOT EXISTS
  idx_credentials_award_date
ON credentials (
  award_date
);

CREATE INDEX IF NOT EXISTS
  idx_credentials_status_award
ON credentials (
  status,
  award_date
);

COMMENT ON COLUMN credentials.award_date IS
  'Academic award date used for temporal accreditation checks.';

COMMENT ON COLUMN credentials.superseded_by IS
  'Replacement credential created through a governed correction.';

COMMENT ON TABLE institution_accreditations IS
  'Effective-dated simulated regulator accreditation records. Separate from blockchain institution authorisation.';

COMMIT;