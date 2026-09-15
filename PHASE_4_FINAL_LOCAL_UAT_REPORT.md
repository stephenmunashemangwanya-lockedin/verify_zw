# VERIFYZW PHASE 4 FINAL LOCAL UAT REPORT

## Baseline

Completed business UAT on 2026-09-14; closure on branch `feature/certificate-security`. Baseline commit: `0f65d205f78dae3f3d083bbe7e98646a79107cf2`. Phases 1-3 were not restarted. One existing institution was reused. No duplicate institution, additional credential, re-anchoring, or volume deletion occurred.

The business lifecycle passed. Final closure remains unsuccessful because the required default frontend regression command fails a timing gate and the additional final database snapshot is blocked by a Docker daemon API error. These are distinct from the proven blockchain runtime remediation.

## Authentication

PASS. Required password change returned 200; subsequent fresh login returned 200 with role `super_admin`, CSRF present, and `must_change_password=false`. Earlier HTTP 409 attempts were password reuse, not an application defect. Credentials and session material stayed in memory. Synthetic account setup used the legitimate development password-setup response and reset-password API with randomly generated in-memory passwords.

## Institution Blockchain Authorization

PASS before persistence restart. Existing institution `90d05e1d-8742-42e2-8b3d-24a589cc73bb`, UAT VerifyZW Institution 2026, active. Wallet and local RPC signer: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`.

Precheck: unauthorized. The authenticated authorization endpoint returned 200. Transaction `0x487b5cf085340e5ff71f246c7ae444dc14f53cbf7d2e85ad165894a917d27233` had receipt status 1, matched the expected signer and current registry `0x5FbDB2315678afecb367f032d93F642f64180aa3`, and independently returned on-chain authorization true. `DEFAULT_ADMIN_ROLE` was confirmed. Audit: `INSTITUTION_WALLET_AUTHORISED`, entity `institution`, existing institution ID, `2026-09-14T04:55:23.227Z`.

## Issuer Provisioning

PASS. Issuer `55234bee-aeda-4c5c-9771-7b06fddf046a` was created through the API, active and scoped to the existing institution. Password setup and issuer login both returned 200; creation and setup audit events exist.

## Student Provisioning

PASS. Synthetic records only:

| Student | Student ID | Account ID |
|---|---|---|
| A | `c6d3ff16-13e1-47e8-af58-29f2ec787f18` | `8899597a-f9b9-410d-9ac1-1dff40147d44` |
| B | `d2516083-b371-43d1-a2c3-c77b109045ef` | `3ceee976-cbbe-4961-849d-8eba3159ae00` |

Both belong to the existing institution. Account setup and student logins passed.

## Student Account Ownership

PASS. Both `POST /api/students/{id}/account` calls returned 200. Database ownership and institution relationships were verified before and after restart. `STUDENT_ACCOUNT_LINKED` audits exist.

## Duplicate Ownership Protection

PASS - duplicate link returned HTTP 409.

## Ownership Isolation

PASS. Student A retrieved the owned credential with 200. Student B's direct request for that credential returned 403 `ACCESS_DENIED`. Student A's self-service list contained one credential; Student B's contained zero. Cross-institution student/account/revocation fixture checks are included in the 29-test focused ownership/isolation run.

## Credential Issuance

PASS. Credential `752c121c-f1cd-4333-b9c5-a49273767382` was issued for Student A through the authenticated issuer API using a 1,353-byte synthetic PDF. Qualification: Synthetic Local UAT Qualification. Issue date: 2026-09-14. Created `2026-09-14T04:56:43.462Z`; active after confirmation at `2026-09-14T04:56:49.535Z`.

## SHA-256 Integrity

PASS. Independently computed source-PDF hash equals the server response, database hash, and on-chain commitment:

`58252b939a85ec0eed40585ce000c3160f684e61c28d2133681e278ef7e88e02`

## Pinata

PASS. REAL PINATA DEVELOPMENT PROVIDER: VERIFIED. The actual upload returned provider `pinata`, pinned true, and CID `bafkreicyeuvzhguf5qho2qcyltqabqywb5ue4yocruqtg2a6e6hpp2eoai`. The same CID was stored on the credential. No fabricated provider response was used. STAGING PINATA CONFIGURATION: NOT YET VERIFIED.

## Blockchain Anchor

PASS before restart. Chain 31337; current registry and signer matched. Issuance transaction `0x2e0a138436d211e1a6a847b29e5f110778587648c5c0f5509434c48eb273bf35`, block 3, receipt status 1. A direct contract read confirmed the stored hash existed and was not revoked. Activation followed IPFS upload and confirmed issuance.

## Active Credential Verification

PASS before revocation. Credential ID, hash, public token, and original file each returned HTTP 200 and `VERIFIED`. Public token: `126efae9-c55a-414d-956b-773aebd22f0d`.

## Tampered Evidence

PASS. A modified copy of the synthetic PDF returned `UNKNOWN`, never `VERIFIED`.

## Unknown Evidence

PASS. Unknown credential ID, hash, and token returned `UNKNOWN`.

## Malformed Input

PASS. Invalid hash returned HTTP 400 `VALIDATION_ERROR`; no stack trace exposed.

## Verification Logs

PASS. Last successful database snapshot: 12 logs. Each supported method (`credential_id`, `hash`, `public_token`, `file`) has one VERIFIED, one UNKNOWN, and one REVOKED result. Malformed input was rejected before semantic verification. Method, result, credential references, and persistence were checked.

## Unauthorized Revocation

PASS. Student A received HTTP 403 `ACCESS_DENIED`. Chain height remained 3, proving no new transaction was submitted.

## Authorized Revocation

PASS. Super Admin revocation returned 200. Transaction `0x063b48409aa451bdcc0a1664e0f547ab4745266a020ed1454a769517056e3ab4` confirmed in block 4 with receipt status 1. Direct on-chain read confirmed revoked true. Database status is `revoked`, actor `d219f6e7-9a58-400a-8928-470be536906c`, timestamp `2026-09-14T04:58:50.826Z`, reason -Synthetic Phase 4 UAT lifecycle completed-.

## Post-Revocation Verification

PASS before restart. ID, hash, token, and original file each returned `REVOKED`; none returned VERIFIED.

## Student Revoked Credential View

PASS. Student A retained historical visibility through `/api/credentials/me` with status revoked.

## Audit Trail

PASS. Last successful snapshot: 156 rows. Safe-field review verified login, institution authorization, three account provisioning/setup flows, student creation, account linking, processing/hash generation, IPFS upload, blockchain submission/confirmation, activation, ownership denial, verification, and revocation events. Only action, entity type/ID, and timestamps were reported; unrelated payloads were not exposed.

## Persistence

PASS FOR POSTGRESQL APPLICATION STATE. Official `npm run docker:down` and `npm run docker:up` exited 0 without volume removal. Before and after restart: institutions 1, users 5, students 2, credentials 1, verification logs 12, audit rows 156. Institution, issuer, students, ownership links, credential, revocation metadata, logs, and audits persisted. Live, ready, and frontend each returned 200 after restart.

Relative to the immediate UAT baseline: users +3, students +2, credentials +1, verification logs +12, audits +41 (including intervening authentication). Institutions unchanged. No counts were normalized manually.

The requested additional closure-time read-only snapshot subsequently failed: Docker Desktop returned HTTP 500 for container inspection, version, and Compose listing. No Docker restart or database mutation was attempted to bypass it. The counts above are the last successful post-restart evidence, not a claim of a fresh closure-time query.

## Local Blockchain Persistence

LOCAL DEVELOPMENT LIMITATION. LOCAL HARDHAT CHAIN = EPHEMERAL / NON-PERSISTENT.

Before restart, authorization existed; issuance and revocation confirmed in blocks 3 and 4. After normal restart, the local chain was fresh at block 1 and the historic credential proof was absent. PostgreSQL retained its application and transaction history. No old history was rewritten and the revoked credential was not silently re-anchored. This is not a PostgreSQL persistence failure or proof of an external production-chain defect.

STAGING MUST USE A PERSISTENT EXTERNAL APPROVED EVM NETWORK. Production blockchain persistence was not tested here.

## Database Safety

PASS in the successful post-restart snapshot. Ledger contains only 000-007; 008 absent. SHA-256 fingerprint of ordered public column metadata was unchanged before/after:

`30baf29f890dbb277235b9274283c2719b93a59dcb8e56f407bfad295f583524`

This fingerprint uses a newly recorded, explicit column-metadata method; it is not compared numerically to the older report's differently computed fingerprint. No migration/schema changes occurred. Closure-time requery is environment-blocked as described above.

## Regression Gates

Complete post-UAT evidence was reused rather than rerunning passing gates. Tests have zero skips unless indicated.

| Gate | Passed | Failed | Skipped | Result |
|---|---:|---:|---:|---|
| `npm run test:backend` | 470 | 0 | 0 | PASS |
| `npm run test:frontend` default workers, two runs | 90 | 1 | 0 | FAIL, exit 1 |
| Same frontend suite: `npm --prefix frontend run test -- --maxWorkers=1` | 91 | 0 | 0 | PASS, exit 0 |
| Isolated lazy-route file | 5 | 0 | 0 | PASS, exit 0 |
| `npm run test:contract` | 36 | 0 | 0 | PASS |
| `npm run test:migration` | - | - | - | Schema verification PASS |
| `npm run test:e2e:frontend` | 32 | 0 | 10 | PASS, exit 0; intentional skips |
| `npm run test:accessibility` | 6 | 0 | 0 | PASS, exit 0; no reported violations |
| `npm run frontend:build` | - | - | - | PASS |
| `npm run docs:validate` | - | - | - | PASS; OpenAPI 62 operations, secret scan passed |
| `npm run test:blockchain` | 9 | 0 | 0 | PASS |
| `npm run test:docker` | 22 | 0 | 0 | PASS |
| `npm run test:ipfs` | 23 | 0 | 0 | PASS |
| `npm run test:verification` | 18 | 0 | 0 | PASS |
| `npm run test:revocation` | 8 | 0 | 0 | PASS |
| Focused ownership/linking/student-management/revocation files | 29 | 0 | 0 | PASS, exit 0 |

For the original multi-command regression batch, complete success summaries were preserved for the passing gates; individual process exit codes were not persisted for every command after interruption, so they are not invented here. The backend exit 0 was observed. Named Node suites contain complete zero-failure summaries.

Default frontend failure: `lazyRoutes.test.tsx`, -loads the authenticated dashboard and keeps navigation labels-, exceeds the unchanged 5,000 ms test limit. The isolated file passed in 2.92 seconds and the full one-worker suite in 14.72 seconds. This supports startup contention as a test-environment explanation, but does not turn the failed default gate into a pass. No application source, timeout, or snapshot was changed during closure. E2E baselines were not updated.

## Security Findings

Proven controls: own-student access allowed; other-student access 403; duplicate ownership 409; unauthorized revocation 403 with no transaction; malformed verification 400; tampered evidence not VERIFIED; revoked evidence returned REVOKED before local-chain reset. Fixture tests cover selected cross-institution boundaries. This is not a penetration test or staging security certification.

## Files Changed

A - contract/runtime resolution: `backend/config/blockchain.js`, `backend/config/environment.js`, `backend/services/healthService.js`, `scripts/startDockerBackend.js`, relevant configuration/runtime tests.

B - signer resolution: new `backend/config/blockchainSigner.js`, shared `backend/services/blockchainService.js`, async signer integration-test call and focused runtime tests.

C - Docker/config documentation: `.env.docker.example` blank external signer placeholder; Compose signer pass-through; separately committed existing Pinata environment pass-through; `docs/DOCKER_DEVELOPMENT.md` runtime/signing explanation.

D - this Phase 4 report. E - two pre-existing untracked Phase 2/3 BMAD workflow artifacts retained. F - ignored `logs/blockchain-runtime` helpers, sanitized evidence and test logs retained locally. G - no unexpected tracked changes found. No credentials, private environment files, session material, or temporary logs staged.

## Commits Created

- `1afe98833ed02be6e918742a4f55e8e022190db2` - `fix: pass development Pinata configuration through Compose`
- `d99d2e882694586a4fbde6239d4e462fa0a65078` - `fix: resolve local blockchain signer at runtime`
- Separate documentation commit containing this report and `docs/DOCKER_DEVELOPMENT.md`; its SHA is reported in the final closure response.

The blockchain commit gate was satisfied by actual authorization, issuance, revocation, receipt, role, and audit proof. Later regression/environment findings are reported without withholding the already-proven focused fix.

## Final Git Status

At documentation staging: only this report and Docker documentation remained for the documentation commit, plus the two preserved untracked BMAD artifacts. Ignored evidence is not committed. Final post-commit status and documentation SHA are recorded in the closure response. `git diff --check` and staged private-runtime-value scan passed for the runtime commit.

## Remaining External / Staging Requirements

Before closure acceptance: resolve the default parallel frontend timing gate and restore Docker daemon availability for the final read-only snapshot. Do not recreate UAT records or re-anchor historic local proofs to conceal the limitation.

Staging requires a persistent approved external EVM network; hosted staging PostgreSQL; managed Redis; separately verified staging Pinata configuration; email/webhook delivery; secure secret management; staging backup/restore; monitoring/logging; and staging performance/security validation. No staging or Phase 5 work was started.

## Final Verdict

LOCAL UAT FAILED

The business lifecycle and PostgreSQL persistence passed. The required default frontend regression remains failing, and the additional final database query is environment-blocked. The successful one-worker run is diagnostic evidence, not an unconditional replacement of the required gate.
