# VERIFYZW PHASE 4 LOCAL UAT REPORT

**Date:** 2026-09-12  
**Branch:** `feature/certificate-security`  
**HEAD:** `183ecf3634f86db7f6d2622a22be62076581fbc7`  
**Scope:** Local Docker/PostgreSQL/Hardhat UAT only. No staging, production, mainnet, DNS, or real-user activity.

## Baseline

- Branch: `feature/certificate-security`
- HEAD: `183ecf3` (`test: reconcile visual baselines after Phase 3 management fixes`)
- `git diff --check`: PASS
- Tracked working tree changes: none at UAT start
- Untracked artifacts classified and preserved: `PHASE_3_CLOSURE_VERDICT.md`, `PHASE_3_FINAL_REPORT.md`, Phase 2 spec, Phase 3 spec
- Existing PostgreSQL volume: `zsvp_postgres_data` (preserved)
- Existing deployment metadata volume: `zsvp_deployment_metadata` (preserved)

## Docker / Health State

Initial official `npm run docker:up` exposed a reproducible startup issue: the backend restarted against the fresh ephemeral Hardhat chain before its contract metadata was usable. The contract deployment job subsequently completed successfully. A normal backend-only recreation (`docker compose ... up -d --force-recreate backend`) recovered the stack without changing source, schema, or volumes.

Final state:

- PostgreSQL: healthy
- Hardhat: healthy
- Backend: healthy
- Frontend: healthy
- `GET /health/live`: HTTP 200, `{"status":"healthy"}`
- `GET /health/ready`: HTTP 200; database, filesystem, and blockchain healthy; IPFS `not_configured`
- Frontend `http://localhost:5173/`: HTTP 200
- Local chain: chain ID 31337
- Contract: `0x5FbDB2315678afecb367f032d93F642f64180aa3` with deployed bytecode

## Pre-UAT Database Snapshot

- Tables present: `audit_logs`, `credentials`, `institutions`, `schema_migrations`, `students`, `users`, `verification_logs`
- Migration ledger: `000_initial_schema.sql` through `007_student_account_ownership.sql` only
- Migration 008: absent
- Schema fingerprint: `fb6501adc92b59df58a0cb56bd24eabd`
- Row counts: institutions 0, users 2, students 0, credentials 0, verification_logs 0, audit_logs 92
- Existing roles: one active `super_admin`, one active legacy `verifier`

## Role Matrix

| Role | Allowed actions supported by source | Denied actions supported by source |
|---|---|---|
| `super_admin` | Global institution/user/student/credential administration, issuance, revocation, audit access, public verification | Self role change; self deactivation; demotion/deactivation of last active super admin |
| `institution_admin` | Own-institution issuer/verifier provisioning, students, credentials, revocation, scoped audit access | Other-institution access; super-admin creation; cross-institution assignment |
| `issuer` | Own-institution student creation, credential issuance, reads, public verification | User administration; revocation; other-institution access |
| `verifier` | Scoped reads and public verification | Student creation, issuance, revocation, user administration |
| `student` | Own linked credentials through `/api/credentials/me`, own credential reads | Unlinked or another student's credentials; administration |

## Institution Workflow

**NOT EXECUTED.** The controlled business workflow was stopped before creating UAT records after the runtime prerequisites were found insufficient for the required end-to-end flow.

Supported API identified: `POST /api/institutions`. Institution blockchain authorization is available through `POST /api/institutions/:id/blockchain/authorise`.

## User / Issuer Workflow

**NOT EXECUTED.** The documented local admin recovery path was used only to restore authorized access: `ADMIN_PASSWORD_RESET` was recorded and the password was not printed or persisted by this process. No UAT user was created.

## Student Workflow

**NOT EXECUTED.** The supported student creation API is `POST /api/students`, but no UAT student was created.

## Student Ownership

**FAIL / P1 CORE WORKFLOW BLOCKER.** Migration 007 adds `students.user_id` and credential access checks call `getStudentByUserId`, but there is no route/controller/model operation that links a `student` user account to a student record. The legitimate API surface cannot prove `student account -> correct student record`; direct database mutation is prohibited by this UAT. `/api/credentials/me` therefore cannot be exercised legitimately for an owned student.

## Credential Creation

**NOT EXECUTED.** Supported API: multipart `POST /api/credentials/issue` with `certificate`, `studentId`, `institutionId`, `qualification`, and `issueDate`. The workflow was stopped before inserting a credential because evidence processing cannot complete under the current local configuration.

## Evidence / Hash

**BLOCKED.** The controller correctly requires a PDF signature and computes SHA-256 server-side. The repository contains a synthetic fixture at `test/fixtures/sample-certificate.pdf`, but no UAT upload was performed.

## IPFS Local Integration

**FAIL / P1 CORE WORKFLOW BLOCKER.** The Docker backend has no configured `PINATA_JWT`; readiness reports `ipfs: not_configured`. The upload service supports Pinata only and has no local/mock provider. `IPFS_ENABLED` is not a usable mock switch for this path. Issuance would create processing state and then fail with `IPFS_CONFIGURATION_ERROR`; bypassing this with a direct database insert would violate the UAT rules.

Classification: `EXTERNAL PROVIDER REQUIRED` for real Pinata verification; no `LOCAL / MOCK VERIFIED` path exists in the current runtime.

## Blockchain Local Integration

**LOCAL INFRASTRUCTURE VERIFIED, BUSINESS ISSUANCE NOT VERIFIED.** Hardhat is healthy on chain 31337, the contract is deployed at the metadata address, and backend startup verification passed. A real credential transaction was not attempted because IPFS is a required preceding lifecycle step.

Classification: `LOCAL HARDHAT AVAILABLE; END-TO-END ANCHOR NOT PROVEN`.

## Student Self-Service

**NOT EXECUTED.** `/api/credentials/me` exists and is restricted to `student`, but no supported ownership-link workflow exists.

## QR / Public Token

**NOT EXECUTED IN UAT.** The source generates a UUID public token and QR artifact after activation. Unit/integration contract tests passed, but no real UAT credential reached activation.

## Verification by Credential ID

**NOT EXECUTED IN UAT.** Route exists at `GET /api/verify/credential/:id`.

## Verification by Hash

**NOT EXECUTED IN UAT.** Route exists at `GET /api/verify/hash/:hash`.

## Verification by Token

**NOT EXECUTED IN UAT.** Route exists at `GET /api/verify/token/:publicToken`.

## Verification by File

**NOT EXECUTED IN UAT.** Route exists at `POST /api/verify/file`; isolated tests cover valid PDF hashing and logging.

## Tampered File Test

**NOT EXECUTED IN UAT.** Isolated verification tests cover invalid/tampered outcomes, but no activated UAT credential exists to test against.

## Unknown Credential Test

**NOT EXECUTED IN UAT.** Isolated public verification tests pass for unknown identifiers and controlled `UNKNOWN` outcomes.

## Verification Logs

**NOT EXECUTED IN UAT.** Baseline count was 0. Isolated verification tests validate controlled result codes and logging behavior.

## Audit Trail

**PARTIAL.** The admin recovery operation emitted `ADMIN_PASSWORD_RESET`; no UAT institution, student, credential, verification, or revocation events were created. Baseline audit rows increased from 92 to 93 solely because of this authorized password reset.

## Unauthorized Revocation Test

**NOT EXECUTED IN UAT.** Route authorization is source-verified and isolated revocation tests pass.

## Authorized Revocation

**NOT EXECUTED IN UAT.** No active UAT credential exists.

## Blockchain Revocation

**NOT EXECUTED IN UAT.** Isolated revocation tests pass, but no real local credential proof was issued.

## Post-Revocation Verification

**NOT EXECUTED IN UAT.** No UAT credential exists.

## Student View After Revocation

**NOT EXECUTED IN UAT.** Student ownership and issuance are blocked.

## Cross-Institution Isolation

**NOT EXECUTED IN UAT.** Source and isolated authorization tests cover institution scoping, but no two-institution UAT records were created.

## Persistence Restart Test

**NOT EXECUTED.** The core UAT flow did not complete and no UAT records were created. The PostgreSQL volume was preserved; no `down -v` or volume recreation command was used.

## Post-UAT Database Snapshot

- Row counts: institutions 0, users 2, students 0, credentials 0, verification_logs 0, audit_logs 93
- Schema fingerprint unchanged: `fb6501adc92b59df58a0cb56bd24eabd`
- Migration ledger remains exactly 000-007
- No migration 008
- Only expected data change: one `ADMIN_PASSWORD_RESET` audit record from authorized local admin recovery

## Full Regression

The full Phase 4 post-UAT regression set was not run because the UAT stopped before business data creation. Focused official checks relevant to the blocker passed:

- `npm run test:migration`: PASS
- `npm run test:ipfs`: 22/22 PASS
- `npm run test:blockchain`: 9/9 PASS
- `npm run test:verification`: 18/18 PASS
- `npm run test:revocation`: 8/8 PASS
- `npm run test:qr`: 5/5 PASS

These are isolated/contract tests and do not establish real Pinata or complete local business-lifecycle evidence.

## UAT Evidence Matrix

| UAT Step | Expected | Actual | Evidence | Result |
|---|---|---|---|---|
| Safety baseline | No unexplained tracked changes | Clean tracked tree; known untracked Phase 2/3 artifacts preserved | Git status/log/diff check | PASS |
| Docker startup | Stack starts healthy | Initial backend race; recovered by backend recreation | Compose status/logs; live/ready/frontend checks | PASS WITH FINDING |
| Migration safety | 000-007, no 008 | Exactly 000-007; fingerprint unchanged | `test:migration`, PostgreSQL ledger | PASS |
| Local Hardhat | Chain and contract available | Chain 31337 and contract bytecode available | RPC checks; backend readiness | PASS |
| Admin access | Authorized local admin path | Password reset completed securely; no credential output | `ADMIN_PASSWORD_RESET` audit | PASS |
| Institution creation | Legitimate API/UI creation | Not attempted after blockers found | No UAT record | NOT APPLICABLE |
| Student account ownership | Server-derived link | No supported link API exists | Migration 007 vs route/model surface | FAIL |
| Evidence/IPFS | Local/mock or real provider upload | No PINATA_JWT; no mock provider | Backend readiness; `ipfsService.js`; runtime env | FAIL |
| Credential issuance | Active credential after confirmed proof | Not reached | No credential; no blockchain tx | FAIL |
| Verification/revocation lifecycle | Verified then revoked | Not reached | No UAT credential | NOT APPLICABLE |
| Persistence | UAT records survive restart | Not run | UAT stopped before data creation | NOT APPLICABLE |

## Defects Found

### P1-1: No runnable local/mock IPFS integration

- **Impact:** Credential issuance cannot progress from processing to active in the official Docker environment.
- **Evidence:** Backend readiness reports `ipfs: not_configured`; `.env.docker` has no `PINATA_JWT`; `ipfsService.js` requires Pinata and has no local adapter.
- **Required correction:** Either provide an approved local mock/IPFS test provider for local UAT, or run with explicitly authorized non-production Pinata credentials outside the repository. Do not bypass through PostgreSQL.

### P1-2: Student ownership cannot be established through a legitimate workflow

- **Impact:** `/api/credentials/me` and backend ownership denial cannot be proven for real accounts.
- **Evidence:** Migration 007 adds `students.user_id`; `studentModel.js` reads it, but no route/controller/model operation assigns it.
- **Required correction:** Add a documented, server-authorized student-account linking/provisioning workflow with ownership checks and regression tests.

### P1-3: Normal Docker startup can leave backend unhealthy after ephemeral chain reset

- **Impact:** `npm run docker:up` initially left the backend restarting with `BLOCKCHAIN_STARTUP_ERROR` even though contract deployment later completed.
- **Evidence:** Backend restart loop; contract deployment subsequently wrote fresh chain-31337 metadata; backend-only recreation recovered health.
- **Required correction:** Make backend startup ordering/recreation robust when the ephemeral Hardhat chain is redeployed, then add a regression test for the normal `docker:up` path.

## Remaining External Integration Work

- Real Pinata/IPFS provider verification requires authorized credentials and must be explicitly distinguished from local/mock testing.
- Any managed Redis, email provider, external EVM, and staging PostgreSQL remain unverified by this local UAT.
- Hardhat state is ephemeral; PostgreSQL persistence does not imply blockchain persistence across chain recreation.

## Files Changed

- `PHASE_4_LOCAL_UAT_REPORT.md` (this report)
- No application source files changed.
- No migrations changed.
- No Docker files changed.
- No UAT business records were created.

## Commits Created

None.

## Final Git Status

The tracked worktree remains unchanged. Known untracked Phase 2/Phase 3 artifacts remain preserved. This Phase 4 report is newly untracked and intentionally not committed.

## Final Classification

# LOCAL UAT FAILED

The required core flow did not complete end-to-end. The local infrastructure and isolated contracts are healthy, but the official local runtime lacks a usable IPFS path and lacks a legitimate student-account ownership-link workflow. Phase 4 stops here. No staging work or deployment was started.
