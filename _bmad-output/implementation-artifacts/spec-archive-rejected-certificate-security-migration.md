---
title: 'Archive rejected certificate-security migration safely'
type: 'chore'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
baseline_commit: '712ef338a9c827d7772af35347f2c9d961a314b9'
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-Zimbabwe-Skill-Verification-Platform-2026-08-18/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The formally rejected, untracked `008_certificate_security.sql` remains inside the executable migration directory. Both the production migration runner and API E2E setup can discover SQL there, creating an unacceptable risk that speculative certificate-security schema is applied.

**Approach:** Preserve the rejected proposal and review rationale as non-executable Markdown outside every migration-discovery path, remove the untracked SQL file, verify exact discovery of migrations 000–007, prove the database ledger/schema/data did not change through read-only inspection, and commit this migration-safety change independently from Docker work.

## Boundaries & Constraints

**Always:** Preserve enough of the original SQL and review rationale for traceability; keep migrations 000–007 byte-for-byte unchanged; use only read-only database checks; verify the archive before removing the untracked SQL; keep the commit limited to Phase 1 migration safety and its workflow record.

**Ask First:** Any inability to prove the archive contains the complete rejected SQL; any database ledger containing migration 008 or anything other than 000–007; any schema/data change; any need to modify application code, historical migrations, migration execution logic, Docker files, or runtime configuration.

**Never:** Execute migrations; start a process that automatically applies migrations; stage or commit the executable 008 file; retain a `.sql` copy under a migration-discovery path; alter or destroy database records, schemas, or volumes; implement the rejected certificate-security features; include Phase 2 Docker changes in this commit.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Rejected draft present | Untracked 008 inside migrations | Markdown archive contains complete SQL and rejection notice; executable file is removed | Stop if archive comparison is incomplete |
| Migration discovery | Approved migration directory after removal | Exact ordered filenames 000 through 007 only | Stop if any unexpected or missing file is returned |
| Database available | Existing local database | Read-only snapshots show ledger limited to 000–007 and unchanged schema/data | Stop on mismatch; never repair automatically |
| Database unavailable | Authentication/runtime unavailable | Report that live database invariants could not be proven | Do not commit until proof can be obtained |

</frozen-after-approval>

## Code Map

- `backend/database/migrations/008_certificate_security.sql` — untracked rejected SQL; source for the archive, then removed without staging.
- `backend/database/migrations/000_initial_schema.sql` through `007_student_account_ownership.sql` — approved immutable chain; read-only.
- `backend/database/runMigrations.js:6-10` — production discovery accepts numbered SQL and sorts it; exported `migrationFiles` enables non-applying verification.
- `scripts/runApiE2E.js:50` — broader secondary loader executes every `.sql` in the migration directory, so the archive must be outside it.
- `test/migrationBootstrap.test.js:1-2` — existing discovery/order test; use for targeted validation without applying migrations.
- `backend/database/verifyMigration.js:36-112` — read-only schema inspection, but it does not prove the ledger or whole-schema identity.
- `docs/` — established location for uppercase audit/review Markdown; archive as `docs/CERTIFICATE_SECURITY_MIGRATION_008_REVIEW.md`.
- `_bmad-output/implementation-artifacts/deferred-work.md` — workflow record that keeps Docker hardening explicitly outside Phase 1.
- `.env*`, application/UI, contracts and Docker files — read-only and excluded from the commit.

## Tasks & Acceptance

**Execution:**
- [x] `docs/CERTIFICATE_SECURITY_MIGRATION_008_REVIEW.md` — record REJECTED status, date/context, rationale, security findings, non-execution warning, and complete original SQL in a fenced block.
- [x] `backend/database/migrations/008_certificate_security.sql` — compare against the archive and remove the untracked executable draft.
- [x] Migration discovery — invoke exported `migrationFiles` directly and run the focused bootstrap test without connecting to or mutating PostgreSQL.
- [x] Local PostgreSQL — capture and compare read-only ledger, schema fingerprint, and table row-count snapshots; require ledger names 000–007 only.
- [x] Git — review status/diff/check, stage only Phase 1 artifacts, and commit as `chore: archive rejected certificate security migration`.

**Acceptance Criteria:**
- Given the rejected SQL exists untracked, when it is archived, then the Markdown contains the complete SQL and an explicit prohibition against execution before the source file is removed.
- Given migration discovery runs after removal, when filenames are enumerated, then the result is exactly the ordered approved 000–007 chain with no 008.
- Given read-only before/after database snapshots, when compared, then ledger rows, schema fingerprint, and row counts are identical and no 008 ledger entry exists.
- Given the Phase 1 diff is reviewed, when committed, then no migration 000–007, application, UI, Docker, environment, schema, or data change is included.

## Spec Change Log

## Review Triage Log

- **Kept and patched:** Both review layers correctly found that the bootstrap test accepted any sorted migration chain. `test/migrationBootstrap.test.js` now asserts the exact approved 000–007 list for production and API-E2E discovery; 11/11 tests pass.
- **Dismissed — untracked removal absent from diff:** Git cannot represent deletion of a never-tracked file; the archived source comparison, filesystem absence check, exact discovery result, and clean status verify disposition.
- **Dismissed — archive lacks checksum/byte count:** Completeness was verified before deletion by normalized full-content comparison. Durable source provenance is the complete fenced SQL plus this recorded verification; no checksum requirement was approved.
- **Dismissed — database command/results not reproducible:** The exact result is recorded, and the final gate independently reran the read-only transaction. Embedding environment-specific container commands or timestamps in the archive is unnecessary.
- **Dismissed — row counts do not prove unchanged values:** The approved acceptance criterion explicitly requires row-count comparison, not a full data export or sensitive row-content fingerprint. No database write-capable command ran.
- **Dismissed — schema fingerprint omits some object classes:** The fingerprint scope is intentionally columns, constraints, and indexes affected by the rejected migration; the approved SQL creates no functions, views, triggers, policies, privileges, or extensions.
- **Dismissed — ledger detail absent:** The read-only output included all eight migration names, checksums, application timestamps, and execution times; migration 008 was absent.
- **Dismissed — exact filenames recorded only in prose:** The direct discovery output and new exact-list tests enumerate all eight approved filenames.
- **Dismissed — deferred item traceability/metadata:** `source_spec: none` correctly records that the user split Phase 2 before this freeform spec existed; the deferred ledger's prescribed format has no identifier, owner, status, or acceptance fields.
- **Dismissed — lifecycle metadata incomplete:** `in-review` is the correct status during this review step; completion status is assigned only after review succeeds.
- **Dismissed — empty change/triage logs:** The phase split is captured in `deferred-work.md`; this triage log now records the actual implementation review. No spec re-derivation occurred.
- **Dismissed — missing commit hash in spec:** Commit identity is release evidence reported from Git, not a requirement of the implementation spec; the final reviewed commit is reported to the user.
- **Dismissed — snapshots did not bracket a database mutation:** No database mutation was authorized or performed. The snapshots bracketed filesystem archival/removal and prove database state remained stable during the task.
- **Dismissed — archive relies on prose inertness:** Markdown outside both loaders is non-executable by construction. The new exact-list regression tests guard both executable discovery rules.
- **Dismissed — mojibake:** Inspection of the actual UTF-8 files shows correct em/en dashes; the claimed corruption came from an earlier display/decoding layer, not repository bytes.
- **Dismissed — missing rejecting authority/reference:** The archive identifies the formal E.REJECT decision, review date, rationale, and approved replacement gate. Naming an individual authority or external issue was not supplied or required.
- **Dismissed — test output lacks names:** The rerun reported all 11 test names, including both exact discovery assertions, with 11 passed and zero failed/skipped.
- **Dismissed — no repository-wide duplicate search:** Both executable loaders are confined to `backend/database/migrations`; exact directory assertions and filesystem absence close the accidental-execution path. Documentation intentionally retains the SQL as inert review history.

## Design Notes

Markdown is intentionally used as the archival format because neither migration loader discovers it. The original SQL remains inside a fenced code block so architectural history is preserved without leaving an executable artifact.

## Verification

**Results (2026-09-02):** The archive matched the rejected source after line-ending normalization before the source was removed. Discovery returned only the exact ordered 000–007 chain, and all 11 focused migration-bootstrap tests passed after review added exact production and API-E2E allowlist assertions. Two baseline read-only PostgreSQL transactions and the final review transaction returned the same ledger rows, schema fingerprint `b303d47bf62c304ee26f6904c85e6d87`, and row counts; the ledger contained exactly migrations 000–007.

**Commands:**
- `node -e "const {migrationFiles}=require('./backend/database/runMigrations'); console.log(JSON.stringify(migrationFiles()))"` — expected: exact ordered 000–007 filenames.
- `node --test --test-concurrency=1 test/migrationBootstrap.test.js` — expected: all migration-runner unit tests pass without applying SQL.
- Read-only PostgreSQL snapshot command — expected: identical before/after ledger, schema hash and row counts; ledger contains 000–007 only.
- `git diff --check` — expected: no whitespace errors.
- `git status --short` and staged diff inspection — expected: only the archive/workflow record and removal disposition are represented.

## Suggested Review Order

**Rejected design disposition**

- Start with the explicit rejection decision and non-execution boundary.
  [`CERTIFICATE_SECURITY_MIGRATION_008_REVIEW.md:9`](../../docs/CERTIFICATE_SECURITY_MIGRATION_008_REVIEW.md#L9)

- Confirm the complete rejected SQL remains inert but traceable.
  [`CERTIFICATE_SECURITY_MIGRATION_008_REVIEW.md:23`](../../docs/CERTIFICATE_SECURITY_MIGRATION_008_REVIEW.md#L23)

**Executable-path protection**

- Verify production discovery permits exactly the approved migration chain.
  [`migrationBootstrap.test.js:3`](../../test/migrationBootstrap.test.js#L3)

- Verify the broader API-E2E scan enforces the same allowlist.
  [`migrationBootstrap.test.js:4`](../../test/migrationBootstrap.test.js#L4)

**Scope continuity**

- Confirm Docker stabilization remains deferred to its independent Phase 2 commit.
  [`deferred-work.md:1`](deferred-work.md#L1)
