---
title: Issuance-time semantic manifest integration
status: in-progress
baseline_commit: 6650ef4e3a36a12a248f14ca050ca7f8e5cbed79
context:
  - C:/Users/HYDRA/.codex/attachments/1bd8213b-63bf-4863-9a07-4f25d88b047f/Pasted text.txt
  - C:/Users/HYDRA/.codex/attachments/303ec006-518a-45f3-89b4-e549a66652cc/Pasted text.txt
---

## Scope and current flow

Credential issuance validates metadata, student/institution, accreditation middleware and PDF signature, hashes the source bytes, checks duplicates, creates a processing row, builds optional structured proof, uploads IPFS, anchors blockchain, activates, publishes status lists/QR and cleans temporary files. Manifest generation belongs after the processing row exists and before external side effects. All current trust, lifecycle, hash, signature, ownership and accreditation decisions remain unchanged.

No commit, staging, deployment, real database migration or real backfill execution is authorized. Preserve all existing unrelated work, including Management.tsx, _bmad-output, existing semantic logs and diagnostics, and frontend/vitest.config.ts. Do not edit frontend or formal research evidence. Known lazy-route flake follows the user's retry exception.

## Implementation boundaries

This integration work owns only:
- New `backend/database/migrations/013_semantic_credential_manifest.sql` (existing chain ends at 012).
- Internal persistence in `backend/models/credentialModel.js` or a focused new `backend/models/semanticManifestModel.js` if safer for existing serialization.
- Necessary internal columns in `backend/models/verificationModel.js` (inspect every route, including student-number fallback).
- Manifest generation/persistence call in `backend/controllers/credentialController.js`, preferably via new `backend/services/semanticManifestIssuanceService.js` for testability.
- New backfill service/CLI `backend/services/semanticManifestBackfillService.js`, `scripts/backfillSemanticManifests.js` and corresponding npm script.
- Focused migration/model/issuance/backfill tests. Existing issuance test harness mocks may stub the new enrichment service to preserve those tests' existing focus; add actual issuance integration tests proving call order and controlled failure.

Parent implementation separately owns PDF layout/canonicalisation/manifest generation/verification and tamper service integration. Do not edit those files. Do not launch more agents. Return integration test results; parent handles final whole-repository validation.

## Service contract from parent

`backend/services/semanticManifestService.js` exports:
- `buildSemanticManifest({ credential, sourceBytes })` async: deterministic version-1 internal manifest. Requires nonempty credential.id and SHA-256 equality to credential.certificate_hash; throws controlled code on mismatch/extraction failure. Manifest has `version`, `credentialId`, `sourceSha256`, `fields`, `integrityDigest`, optional structural snapshot. Each field has status ASSESSABLE / NOT_ASSESSABLE / NOT_AVAILABLE, semanticType, canonicalValue only when present, and anchor only when assessable.
- `validateSemanticManifest(manifest, credential)` returns `{valid,reason}`; validates schema/digest/version/id/source hash. Does not fetch source or mutate anything.

Generated timestamp belongs in persistence column; deterministic manifest bytes exclude wall-clock time. The source bytes and certificate_hash are never changed. Do not include manifest in any generic credential response or audit payload.

## Persistence

Add nullable JSONB semantic_manifest, integer semantic_manifest_version, varchar(64) semantic_manifest_source_hash and timestamptz semantic_manifest_generated_at. Use ADD COLUMN IF NOT EXISTS; no historical migration edits. Internal setter uses compare-and-set on id/source hash and only null manifest by default; explicit overwrite is opt-in and returns whether saved. No new credential rows or lifecycle changes. Keep serialization explicit: no SELECT * leaks.

At issuance compose authoritative fields from processing credential plus already-validated student and institution (student.full_name/student_number/programme, institution.name, qualification/issue_date). Read original file bytes. Persist before IPFS/blockchain. A normal partial/empty-text manifest is allowed: unavailable fields are not invented. For nonempty text with zero safe field alignment, report controlled SEMANTIC_ALIGNMENT_FAILED, not a fabricated manifest. Unexpected generation/persistence failures use the existing outer controlled failure/cleanup path, never leak raw secrets. Tests must prove original source hash/bytes and downstream signature/anchor inputs remain unchanged.

## Backfill

CLI default dry run; --apply enables persistence; --overwrite explicitly permits replacement; optional --credential-id and bounded --limit. Fetch authoritative bytes using existing bounded safe IPFS helper. If existing manifest present, ALREADY_PRESENT by default, never silently overwrite. Confirm source hash before build. Outcome status BACKFILLED, ALREADY_PRESENT, SOURCE_UNAVAILABLE, SOURCE_HASH_MISMATCH, SEMANTIC_ALIGNMENT_PARTIAL, SEMANTIC_ALIGNMENT_FAILED or ERROR; report saved/dryRun separately for partial alignment. Catch errors and output fixed safe status/code only, never raw messages/credentials/secrets. Make fetching injectable in service tests. Parent will expose fetchOfficialPdf(credential, {requireEnabled:false}) for explicit backfill; default structural feature flag behaviour stays unchanged.

## Required verification

Given a new credential, manifest is built and saved before IPFS/blockchain with no public leakage; generation failure follows controlled failure and file cleanup. Given existing credential, default backfill has no mutations, apply is idempotent, hash mismatch/unavailable source never persists, and overwrite requires explicit flag. Test DB compare-and-set protection and privacy. Run relevant existing issuance/model/migration suites plus new tests. Do not weaken tests or silently skip failures; report unrelated deterministic failures.
