# VERIFYZW PHASE 5 STAGING REPORT

## Approved infrastructure continuation

The operator has now approved Render Oregon, the named staging API/web/PostgreSQL/Key Value resources, Render-generated HTTPS domains, verifyzw-staging-secrets, staging Pinata, Alchemy Ethereum Sepolia (11155111), existing webhook email, Render monitoring and isolated Render database recovery. See [approved execution record](docs/PHASE_5_RENDER_EXECUTION.md). Earlier statements below that providers/network are unselected are historical audit findings, superseded by this approval. Current deployment status is **BLOCKED: Render account access and runtime secrets unavailable to this session**, not a reproduced application defect. No resource creation or Sepolia transaction has been attempted. Resource plan/budget and workspace identity remain needed. The initial failed-acceptance verdict below is not a new executed deployment result.

Audit date: 2026-09-15. Staging is **not deployed: blocked by missing approved infrastructure, network selection and secret injection**. This is an incomplete staging gate, not evidence of a reproduced application defect. No production action, local data mutation or application source change occurred during this audit.

## Phase 4 Carry-Forward Findings

Accepted classification: **LOCAL UAT PASSED WITH NON-BLOCKING FINDINGS**. Commit `95dce9b` corrects only the closure classification in [the Phase 4 report](PHASE_4_FINAL_LOCAL_UAT_REPORT.md), preserving evidence. Carry forward intermittent default frontend test timeout (single-worker 91/91), local Docker API 500 blocking an additional snapshot after successful persistence checks, and ephemeral local Hardhat state. None establishes a staging failure.

## Staging Architecture

Source: [staging architecture](docs/STAGING_ARCHITECTURE.md), `docker-compose.staging.yml`, `.env.staging.example`, and the linked staging runbooks. Vendor choices remain operator inputs; Sepolia support is not approval to deploy there.

| Service | Local implementation | Staging implementation | Required secret/config names | Status |
| --- | --- | --- | --- | --- |
| Frontend | Local Vite/container | Immutable production image behind HTTPS ingress | FRONTEND_IMAGE, VITE_API_BASE_URL | Host/domain/registry missing |
| Backend | Local Node/container | Immutable non-root read-only container | BACKEND_IMAGE, JWT_SECRET | Host/secret injection missing |
| PostgreSQL | Local persistent Docker volume | Managed PostgreSQL 18, TLS, separate app/migration roles | DATABASE_URL, DB_SSL_CA | Provider missing |
| Redis | Local development limiter configuration | Managed TLS Redis for shared rate limiting | REDIS_URL | Provider missing |
| IPFS | Local UAT used real Pinata | Separate staging Pinata credentials/gateway | PINATA_JWT, PINATA_GATEWAY | Staging account scope missing |
| EVM | Ephemeral Hardhat | Approved persistent public testnet | BLOCKCHAIN_RPC_URL, DEPLOYER_PRIVATE_KEY, CONTRACT_ADDRESS | Network decision missing |
| Email/webhook | Local configured delivery | Authenticated HTTPS webhook, safe recipients | EMAIL_DELIVERY_URL, EMAIL_DELIVERY_TOKEN, EMAIL_FROM | Provider/recipients missing |
| Monitoring/logging | Application metrics/logging | External collection, health probes, alerts | Provider-owned credentials; ENABLE_METRICS | Provider/routing missing |
| Backup | Local backup tools | Encrypted off-host backup and isolated restore | BACKUP_DB_*; provider-owned storage credentials | Storage/retention/restore target missing |

The staging Compose file provides migration, backend and frontend services; it does not provision external dependencies, DNS or TLS ingress. The deployment workflow prepares a dry run and does not implement live infrastructure provisioning.

### Release differences

| Area | Local | Staging | Production |
| --- | --- | --- | --- |
| Database/Redis | Development services | Dedicated managed TLS services, synthetic records | Separate approved services and real-data governance |
| IPFS | Local UAT provider scope | Separate staging scope and retention | Separate production scope and retention |
| Blockchain | Hardhat unlocked signer, ephemeral state | Dedicated funded testnet signer and persistent registry | Separately governed network/contract; no deployment authorized |
| Secrets | Local env files | Approved secret manager/injection | Separate access controls and rotation |
| Email | Local delivery configuration | Test-safe webhook recipients | Approved real-user delivery |
| Monitoring | Local logs | Hosted collection and exercised alerts | Approved operational ownership and response |
| Backups | Local tooling | Encrypted off-host copy and isolated restore proof | Approved recovery objectives and recurring drills |

## Environment Matrix

See [the names-only matrix](docs/PHASE_5_STAGING_ENVIRONMENT_MATRIX.md). `.env.staging` is absent and no alternate staging file or secret-store location was supplied. Missing classifications refer to audited workspace configuration; external stores were not inspected. Local `.env` and `.env.docker` are not staging credentials.

## PostgreSQL

Blocked: approved hosted target and roles unavailable. Source migration discovery is exactly **000–007**; rejected 008 is absent. No hosted baseline, migration execution or ledger validation is claimed. TLS certificate validation must remain enabled; configuration currently supports explicitly disabling it, so deployment configuration must be checked.

## Redis

Blocked: managed `rediss` target unavailable. Runtime supports shared Redis rate limiting; it is not the JWT session store. Connectivity, limiter behavior and failure handling remain unverified on staging. Controls must remain enabled.

## Pinata

Blocked: dedicated staging credentials and gateway policy unavailable. Local Phase 4 upload evidence does not prove staging authentication, upload, retrieval or failure handling.

## External EVM Network

Operator decision required. Repository supports Sepolia but no approved deployment target was supplied. No localhost, Hardhat, default local key or mainnet is selected.

## Contract Deployment

Not attempted. No staging contract address, deployment transaction, block, bytecode/admin-role proof exists for this run. Requires approved testnet, funded dedicated signer and protected secret injection.

## Backend Deployment

Not attempted. Image digest, host, ingress and dependencies unavailable. Staging live/ready HTTP checks were not executed. Source inspection finds readiness omits Redis and checks Pinata configuration rather than live provider authentication; readiness alone cannot prove all required dependency health. Resolve this acceptance gap before staging sign-off; no source edit is justified as a reproduced staging defect by this audit alone.

## Frontend Deployment

Not attempted. `VITE_API_BASE_URL` must be supplied during image build with the approved HTTPS API endpoint. Runtime env injection alone does not replace the compiled URL. Routing, assets and absence of local URLs require inspection of the actual deployed build.

## HTTPS / Cookies / CORS / CSRF

Strict environment validation and security tests passed in the focused run. Actual HTTPS, HttpOnly/Secure/SameSite cookies, CSRF, origin allowlist, proxy trust and JWT behavior remain pending deployed-browser/API checks. No controls were weakened.

## Email / Webhooks

Staging blocker: required provider, sender and safe recipients/endpoints missing. The implementation uses an authenticated HTTPS webhook; capture mode is not acceptable staging proof. No message was sent.

## Monitoring / Logging

Provider and alert destinations missing. Source alert transport defaults to no-op and no application wiring was found. Metrics/log support is not evidence of delivered alerts. Exercise dependency failure visibility and secret redaction against the deployed system before acceptance.

## Staging Institution

Not created; requires deployed API and legitimate staging Super Admin bootstrap/password-change verification. Local institution preserved.

## Staging Issuer

Not created; blocked by staging institution and authentication prerequisites.

## Staging Students

Not created. Fresh synthetic Student A/B and account linkage remain pending; no real records imported.

## Ownership Isolation

Not executed on staging. Requires linked synthetic students and authenticated cross-account denial proof.

## Credential Issuance

Not executed on staging. Synthetic PDF, SHA-256 and active credential lifecycle remain pending.

## Pinata CID

No staging CID produced. Do not substitute the local UAT CID.

## Blockchain Anchor

No staging issuance transaction submitted. Receipt, registry target and authorized signer proof remain pending.

## Active Verification

Staging ID/hash/token/file verification not executed.

## Tamper Detection

Staging tampered-file verification not executed.

## Verification Logs

No staging verification rows generated or verified.

## Unauthorized Revocation

Staging denial and no-on-chain-mutation proof not executed.

## Authorized Revocation

Staging authorized revocation not executed.

## Blockchain Revocation

No staging revocation transaction or successful receipt exists for this run.

## Post-Revocation Verification

Staging revoked results through all verification methods not executed.

## Audit Trail

Staging authorization, issuance, denial and revocation audit events not generated or verified.

## Application Persistence

No staging service redeploy performed. Database counts and ownership/revocation continuity remain pending before/after comparison.

## Blockchain Persistence

Not verified. Requires external network issuance/revocation followed by application redeploy and repeat chain reads. Local Hardhat ephemerality remains a carry-forward limitation until this proof succeeds.

## Database Backup

No staging backup created. Approved mechanism, encrypted off-host destination, retention, time and artifact identifier remain pending. Backup tooling uses BACKUP_DB_* or DB_* component settings; DATABASE_URL alone is not sufficient job configuration. Validate TLS/CA propagation for the actual backup client.

## Restore Test

Not executed. Requires backup manifest and separately approved isolated database target; active staging must never be overwritten. Verify restored records, revocation, verification logs and audit history.

## Security Validation

New focused run: **70 passed, 0 failed, 0 skipped**, exit 0, 24.059 seconds. Includes staging configuration, security hardening, health monitoring, blockchain configuration and runtime tests. This is local automated evidence, not a hosted security assessment. Staging RBAC, ownership, authentication, CSRF/CORS, safe rate limits, file validation and tamper checks remain pending.

## Performance

No staging latency or concurrency measurements exist. The current performance harness uses an isolated test database with mocked external services and must not be pointed at staging or reported as external blockchain overhead. Record actual staging verification/issuance p50/p95, sample size and safe concurrency separately from transaction submission-to-confirmation timing.

## Full Regression

The full Phase 5 gate is **incomplete**. New evidence is the focused 70-test run above; log: `logs/phase5/readiness-tests.log` (ignored). Command: `node --test --test-concurrency=1 test/stagingConfiguration.test.js test/securityHardening.test.js test/healthMonitoring.test.js test/blockchainConfiguration.test.js test/blockchainRuntime.test.js`.

Phase 4 carry-forward evidence, not re-executed staging results: backend 470/470; frontend single-worker 91/91 with default-mode timeout finding; contracts 36/36; E2E 32 passed and 10 intentional skips; accessibility 6 passed; blockchain 9/9; Docker 22/22; IPFS 23/23; verification 18/18; revocation 8/8; ownership 29/29; migration/schema and frontend build passed; OpenAPI 62 operations. See the preserved Phase 4 report for limitations. Full current release regression and hosted checks remain required before acceptance; no entire local UAT was rerun.

## Files Changed

- `PHASE_4_FINAL_LOCAL_UAT_REPORT.md`: classification-only correction, separately committed.
- `docs/PHASE_5_STAGING_ENVIRONMENT_MATRIX.md`: staging configuration names, status and policies; no values.
- `PHASE_5_STAGING_REPORT.md`: this readiness inventory, evidence and blocked deployment gates.

No application, migration, contract, frontend or secret files changed in Phase 5. Existing untracked Phase 2/3 BMAD specs are preserved outside these changes.

## Commits

`95dce9b` — `docs: accept Phase 4 with non-blocking findings`. Phase 5 readiness artifacts remain reviewable working-tree documentation; no deployment commit is claimed.

## Final Git Status

At report preparation: the two Phase 5 documentation files and two pre-existing Phase 2/3 BMAD specs are untracked. No tracked working-tree modifications remain. Verify with `git status --short` after documentation validation.

## Production Blockers

Approved staging host/account, domains, immutable image registry, managed PostgreSQL/Redis, separate Pinata scope, persistent testnet, funded signer, secret-store location, email recipients, monitoring/alerts, encrypted backup destination and isolated restore target remain unspecified. No staging UAT, external persistence, recovery or performance proof exists. Readiness coverage limitations require resolution before acceptance. Production is outside this authorization.

Next action: operator supplies approved targets and secret-store references only, never secret values in chat. Resume at infrastructure preparation; preserve completed local UAT and this audit.

**STAGING FAILED**

Classification means staging acceptance was not achieved because deployment prerequisites are missing; it does not assert a reproduced application defect.
