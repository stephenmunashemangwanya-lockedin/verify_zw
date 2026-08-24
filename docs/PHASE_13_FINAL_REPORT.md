# Phase 13 Final Report — Stage 28 Preparation

Date: 2026-08-14

> Historical Phase 13 closeout: Stage 28 preparation was subsequently authorized on 2026-08-14. The current gate and execution status are recorded in `STAGE_28_PREREQUISITES.md`, `STAGE_28_EXECUTION_CHECKLIST.md`, and `STAGE_28_DEPLOYMENT_REPORT.md`; those documents supersede this report's pre-authorization Stage 28 decision.

## Status and decision

Phase 13 staging preparation is **complete for repository-controlled work**. Stage 27 remains historically complete with its previously verified application, container, recovery, CI/CD, security and administrator-bootstrap evidence. No production deployment, staging deployment, public contract deployment, external IPFS upload, real email, destructive database action, Docker volume removal or secret reuse occurred.

**Stage 28 cannot begin.** External infrastructure and credentials have not been supplied, admin browser login remains a staging-UAT blocker, accessible chart alternatives remain open, and fresh real-deployment authorization is still required. See `STAGE_28_PREREQUISITES.md`.

## Delivered files

Created:

- `.env.staging.example`
- `docker-compose.staging.yml`
- `backend/config/rateLimitStore.js`
- `test/stagingConfiguration.test.js`
- `docs/STAGING_READINESS_AUDIT.md`
- `docs/STAGING_ARCHITECTURE.md`
- `docs/ENVIRONMENT_MATRIX.md`
- `docs/STAGING_DATABASE.md`
- `docs/STAGING_IPFS.md`
- `docs/STAGING_BLOCKCHAIN.md`
- `docs/RATE_LIMITING_INFRASTRUCTURE.md`
- `docs/STAGING_EMAIL.md`
- `docs/MONITORING_AND_ALERTING.md`
- `docs/STAGING_BACKUPS.md`
- `docs/SECRET_MANAGEMENT.md`
- `docs/STAGING_DEPLOYMENT_RUNBOOK.md`
- `docs/STAGING_ROLLBACK.md`
- `docs/STAGE_28_PREREQUISITES.md`
- `docs/STAGING_RELEASE_ACCEPTANCE.md`
- this report

Modified:

- backend environment, database, IPFS and email configuration/services
- general and public-verification limiter middleware
- dashboard frontend query parameters
- development/Docker environment examples and `.gitignore`
- root dependency manifest/lockfile and frontend lockfile
- performance report

## Implementation findings

- **Dashboard 400 routes:** the credential and verification trend calls used `group=day`; the strict API schema requires `groupBy`. Both calls now use `groupBy=day`, with regression coverage. No API/OpenAPI change was needed because the backend contract was already correct.
- **Shared limiting:** development/test retain memory storage. Staging/production require authenticated TLS Redis and use shared namespaced counters; store failure does not silently downgrade.
- **Managed DB:** supports `DATABASE_URL`, PostgreSQL TLS/CA verification, pool limits and bounded timeouts. Staging rejects local/dev/test databases and requires TLS.
- **IPFS:** provider API URL is configurable; HTTPS credential/gateway, CID validation, upload bounds, timeout, retry and controlled failure behavior are retained.
- **Blockchain:** staging rejects local/31337, zero contract address, the default Hardhat key and production chain selection. RPC/key/address remain external and no contract was deployed.
- **Email:** capture remains development-only. Staging requires bounded HTTPS webhook delivery with bounded retries and external token/from identity.
- **Secrets/monitoring/backups:** runtime secret injection, protected metrics/log collection, alert ownership, encrypted off-host backup and restore-test requirements are documented; external destinations were not invented.
- **Student search:** existing 10k-row evidence identifies trigram GIN as a candidate but does not justify a migration. No `pg_trgm` change was made.
- **Staging Compose:** external-service-only, immutable-image-oriented, no Hardhat/PostgreSQL/Redis containers, no development volumes, no implicit contract deployment, non-root inherited images, read-only filesystems, dropped capabilities, health checks, restarts and bounded logs.

## Verification evidence

| Gate | Result |
|---|---|
| Backend suite | PASS — 428/428 |
| Frontend suite | PASS — 88/88 (one initial timeout passed cleanly on rerun) |
| Contract suite | PASS — 36/36 |
| Docker configuration tests | PASS — 18/18 |
| Staging-focused tests | PASS — 11/11 (included in backend total) |
| API E2E | PASS — 11 checks; guarded `_test` DB returned all entity counts to zero |
| Release readiness | PASS — 4/4 |
| Frontend production build | PASS |
| Frontend bundle budget | PASS — entry 325,600 bytes / gzip 106,636, budget 500,000 |
| Workflow validation | PASS — 6 workflows; policy passed |
| Documentation/OpenAPI validation | PASS — 60 operations; secret scan passed |
| Artifact secret scan | PASS — 304 files |
| Production dependencies | PASS — root 0, frontend 0 vulnerabilities |
| Complete dependency policy | PASS — frontend 0; root development-only accepted baseline 14 low/7 moderate/16 high/0 critical |
| Staging Compose render | PASS with placeholder immutable digests and example env |

The live audit surfaced a high-severity transitive frontend `nanoid` advisory. `npm audit fix` updated one package without a breaking upgrade; frontend tests/build and the security gate then passed.

## Exact operator-supplied items still missing

1. Staging host/runtime access, capacity and immutable backend/frontend image digests, plus the previously verified rollback digests.
2. Staging domain, DNS records, TLS certificate/ingress configuration.
3. Private managed PostgreSQL 18 endpoint, dedicated database, app and migration roles/credentials, CA/TLS policy, backup/maintenance settings.
4. Selected public EVM testnet, protected HTTPS RPC, newly generated funded staging-only wallet, confirmations and explicit new/existing contract strategy.
5. IPFS/pinning project: scoped token, HTTPS provider API/gateway, quota/retention policy and authorization for a smoke upload.
6. Transactional email HTTPS endpoint/token, verified staging sender or subdomain and authorized test recipient.
7. Private TLS Redis-compatible endpoint/credential and capacity/availability policy.
8. Secret-manager/runtime injection mechanism, workload access policy and rotation owner.
9. Metrics/log platform credentials, retention, alert destinations and on-call ownership.
10. Encrypted off-host backup bucket/prefix, least-privilege credentials, retention approval and restore-test target.
11. Human NVDA/Narrator acceptance evidence and implementation/acceptance of chart data alternatives.
12. Authorization to validate/reset the super-admin login using the supported `admin:reset-password` operation if needed.
13. Fresh explicit authorization to execute Stage 28 after all prerequisite evidence is PASS.

## Admin blocker

`SA@skillverify.co.zw` remains recorded as active `super_admin` with `institution_id NULL` and bootstrap audit evidence. Browser login is unresolved. It is labeled **STAGING ACCEPTANCE BLOCKER — ADMIN LOGIN VALIDATION** and **STAGING UAT BLOCKER**, not an infrastructure-preparation blocker. No password hash, lockout, authentication or rate-limit bypass was attempted.
