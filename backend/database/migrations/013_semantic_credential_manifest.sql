ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS semantic_manifest JSONB,
  ADD COLUMN IF NOT EXISTS semantic_manifest_version INTEGER,
  ADD COLUMN IF NOT EXISTS semantic_manifest_source_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS semantic_manifest_generated_at TIMESTAMPTZ;
