# Certificate Security Migration 008 Review

**Status:** REJECTED

**Reviewed:** 2026-09-01

**Disposition:** Archived for traceability; must not be executed

## Decision

The proposed certificate-security migration was rejected before adoption. It is preserved here only as architectural history. This Markdown file is outside all migration discovery paths, and the SQL below is inert documentation.

**Do not copy, extract, rename, or execute this SQL as a migration.** Any future certificate-security schema must be designed, reviewed, and approved as a new proposal against the current database and application contracts.

## Rationale and security findings

- The proposal introduces institution signing keys, certificate serials, verification-code hashes, digital signatures, and anomaly records without an approved application contract or lifecycle design.
- Key creation, rotation, revocation, expiry, custody, and compromise recovery are not specified, so the schema could create misleading trust guarantees.
- New uniqueness constraints and foreign keys have not been validated against production data, rollout sequencing, or backward compatibility.
- The proposal mixes identity, signing, counterfeit detection, and credential schema changes in one migration, increasing operational and rollback risk.
- Both production and API E2E migration loaders discover SQL in `backend/database/migrations`; leaving this rejected draft there creates a path for accidental execution.

## Complete rejected SQL (verbatim)

```sql
-- VerifyZW certificate authenticity and anti-counterfeit security extension.
-- Extends the existing credential system without replacing existing fields.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Institution identity/security metadata
-- ---------------------------------------------------------------------------

ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS institution_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS accreditation_number VARCHAR(120),
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30)
        DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'institutions'::regclass
          AND conname = 'institutions_verification_status_check'
    ) THEN
        ALTER TABLE institutions
            ADD CONSTRAINT institutions_verification_status_check
            CHECK (
                verification_status IN (
                    'pending',
                    'verified',
                    'suspended',
                    'revoked'
                )
            ) NOT VALID;
    END IF;
END $$;

ALTER TABLE institutions
    VALIDATE CONSTRAINT institutions_verification_status_check;

CREATE UNIQUE INDEX IF NOT EXISTS uq_institutions_code
    ON institutions (institution_code)
    WHERE institution_code IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 2. Institution cryptographic signing keys
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS institution_signing_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    institution_id UUID NOT NULL
        REFERENCES institutions(id)
        ON DELETE CASCADE,

    algorithm VARCHAR(30) NOT NULL DEFAULT 'Ed25519',

    public_key TEXT NOT NULL,

    key_fingerprint VARCHAR(128) NOT NULL UNIQUE,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    valid_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    valid_until TIMESTAMPTZ,

    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT institution_signing_keys_status_check
        CHECK (status IN ('active', 'revoked', 'expired')),

    CONSTRAINT institution_signing_keys_validity_check
        CHECK (
            valid_until IS NULL
            OR valid_until > valid_from
        )
);

CREATE INDEX IF NOT EXISTS idx_institution_signing_keys_institution
    ON institution_signing_keys (institution_id);

CREATE INDEX IF NOT EXISTS idx_institution_signing_keys_status
    ON institution_signing_keys (status);


-- ---------------------------------------------------------------------------
-- 3. Extend existing credentials
-- ---------------------------------------------------------------------------

ALTER TABLE credentials
    ADD COLUMN IF NOT EXISTS certificate_serial VARCHAR(100),

    ADD COLUMN IF NOT EXISTS verification_code_hash VARCHAR(64),

    ADD COLUMN IF NOT EXISTS canonical_data_hash VARCHAR(64),

    ADD COLUMN IF NOT EXISTS digital_signature TEXT,

    ADD COLUMN IF NOT EXISTS signing_key_id UUID,

    ADD COLUMN IF NOT EXISTS template_version VARCHAR(50),

    ADD COLUMN IF NOT EXISTS security_version VARCHAR(20)
        DEFAULT 'v1';


-- ---------------------------------------------------------------------------
-- 4. Signing key relationship
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'credentials'::regclass
          AND conname = 'fk_credentials_signing_key'
    ) THEN
        ALTER TABLE credentials
            ADD CONSTRAINT fk_credentials_signing_key
            FOREIGN KEY (signing_key_id)
            REFERENCES institution_signing_keys(id)
            ON DELETE SET NULL
            NOT VALID;
    END IF;
END $$;

ALTER TABLE credentials
    VALIDATE CONSTRAINT fk_credentials_signing_key;


-- ---------------------------------------------------------------------------
-- 5. Certificate serial must never be duplicated
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_credentials_certificate_serial
    ON credentials (certificate_serial)
    WHERE certificate_serial IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 6. Verification code must also be unique
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_credentials_verification_code_hash
    ON credentials (verification_code_hash)
    WHERE verification_code_hash IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 7. Canonical integrity hash lookup
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_credentials_canonical_data_hash
    ON credentials (canonical_data_hash)
    WHERE canonical_data_hash IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 8. Counterfeit/anomaly evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS credential_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    credential_id UUID
        REFERENCES credentials(id)
        ON DELETE CASCADE,

    verification_log_id UUID
        REFERENCES verification_logs(id)
        ON DELETE SET NULL,

    anomaly_type VARCHAR(60) NOT NULL,

    severity VARCHAR(20) NOT NULL,

    expected_value TEXT,

    observed_value TEXT,

    details JSONB,

    detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    reviewed_at TIMESTAMPTZ,

    reviewed_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT credential_anomalies_severity_check
        CHECK (
            severity IN (
                'low',
                'medium',
                'high',
                'critical'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_credential_anomalies_credential
    ON credential_anomalies (credential_id);

CREATE INDEX IF NOT EXISTS idx_credential_anomalies_detected
    ON credential_anomalies (detected_at DESC);


-- ---------------------------------------------------------------------------
-- 9. Documentation
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN credentials.certificate_serial IS
    'Human-readable unique VerifyZW certificate serial number.';

COMMENT ON COLUMN credentials.verification_code_hash IS
    'SHA-256 hash of the human-readable verification code printed on the certificate.';

COMMENT ON COLUMN credentials.canonical_data_hash IS
    'SHA-256 integrity fingerprint calculated from normalized credential data.';

COMMENT ON COLUMN credentials.digital_signature IS
    'Digital signature covering the canonical credential fingerprint.';

COMMENT ON COLUMN credentials.signing_key_id IS
    'Institution public-key record used to verify the credential signature.';

COMMENT ON COLUMN credentials.template_version IS
    'Issuing institution certificate template version.';

COMMENT ON COLUMN credentials.security_version IS
    'VerifyZW anti-counterfeit security profile version.';

COMMIT;
```
