# Staging Readiness Audit

Date: 2026-08-14  
Scope: Phase 13, Stage 28 preparation  
Decision vocabulary: `READY`, `NEEDS CONFIGURATION`, `NEEDS EXTERNAL SERVICE`, `NEEDS CODE CHANGE`, `BLOCKER`

This audit was recorded before Phase 13 implementation changes. It describes the repository as inherited after Stage 27; later Phase 13 changes and their verification are tracked in `STAGE_28_PREREQUISITES.md` and the final report.

## Executive finding

The development and test platform is mature, but the inherited deployment model is not an isolated real staging topology. `docker-compose.yml` embeds PostgreSQL and optionally Hardhat, while `docker-compose.production.yml` is an override rather than a complete external-service staging definition. No external staging credentials or endpoints are present or assumed. Stage 28 cannot begin until operator-required infrastructure is supplied and the acceptance blockers are cleared.

## Dependency classification

| Area | Inherited state and evidence | Classification |
|---|---|---|
| Backend image | Multi-stage Node image, non-root runtime, npm removed, healthcheck present | READY |
| Frontend image | Static Vite build in unprivileged nginx with healthcheck | READY |
| Development Compose | Isolated named volumes, internal data network, local-only published ports | READY |
| Staging Compose | No standalone staging file; production override still depends on embedded development PostgreSQL and inherited local settings | NEEDS CODE CHANGE |
| Managed PostgreSQL | `pg` pool has host-style settings and bounded pool timeouts, but no `DATABASE_URL` or TLS configuration | NEEDS CODE CHANGE |
| Managed PostgreSQL instance | No host, database, roles, CA requirements, or credentials supplied | NEEDS EXTERNAL SERVICE |
| Environment validation | Production validation covers cookies, CSRF, JWT minimum length, email, IPFS, CORS and blockchain shape; staging is not a recognized fail-closed tier and local/dev identifiers remain possible | NEEDS CODE CHANGE |
| Frontend environment | `VITE_API_BASE_URL` build argument exists; inherited default is localhost and no staging build guard exists | NEEDS CONFIGURATION |
| Blockchain application integration | Sepolia configuration, bounded confirmations/timeouts and contract validation exist | READY |
| Public testnet deployment | RPC, funded non-Hardhat wallet, deployment decision and deployed contract address absent | NEEDS EXTERNAL SERVICE |
| IPFS integration | Pinata-oriented JWT/gateway configuration, CID checks, size limits, timeout and retries exist | NEEDS CONFIGURATION |
| Real IPFS provider | Provider account/token and dedicated staging gateway absent | NEEDS EXTERNAL SERVICE |
| Password-reset delivery | Capture and bounded HTTPS webhook abstraction exist; non-enumerating flow is already tested | READY |
| Transactional email | Provider webhook endpoint/token/from identity absent | NEEDS EXTERNAL SERVICE |
| Rate limiting | Multiple narrow `express-rate-limit` controls exist, but storage is process-local | NEEDS CODE CHANGE |
| Shared limiter store | No Redis-compatible endpoint/credentials supplied | NEEDS EXTERNAL SERVICE |
| Health/readiness/metrics | Liveness, readiness, Prometheus metrics, structured logs and alert service exist | READY |
| Monitoring/alerting service | No scraper, log destination, alert destination, credentials or on-call routing supplied | NEEDS EXTERNAL SERVICE |
| Local backup/restore | Database/file backup, manifests, checksums, retention and guarded restore tooling are validated | READY |
| Off-host backup | No encrypted object store, retention policy target or scoped credentials supplied | NEEDS EXTERNAL SERVICE |
| Secret management | Examples avoid real secrets and CI scanning exists; staging runtime injection contract is undocumented/incomplete | NEEDS CONFIGURATION |
| CI/CD | CI, security, Docker, E2E, release and deploy workflows exist and use protected secret concepts | READY |
| Deployment/rollback runbook | General release/deploy/recovery docs exist, but no staging-specific end-to-end or immutable-digest rollback procedure | NEEDS CODE CHANGE |
| Dashboard analytics | Frontend sends `group=day`; backend validator contract uses `groupBy`, explaining at least one controlled 400. Full route analysis required | NEEDS CODE CHANGE |
| Student search scale | Indexed pagination/search exists; no staging-scale `EXPLAIN ANALYZE` evidence supports `pg_trgm` yet | NEEDS CONFIGURATION |
| Accessibility release items | Automated work exists; human NVDA/Narrator validation and chart data alternatives remain acceptance items | NEEDS CONFIGURATION |
| Super-admin existence | `SA@skillverify.co.zw` is recorded active with `super_admin`, institution `NULL`, and bootstrap audit evidence | READY |
| Super-admin browser login | Login remains unresolved; must use the supported reset operation if authorized before UAT | BLOCKER |
| Staging host/ingress/domain/DNS/TLS | Not supplied | NEEDS EXTERNAL SERVICE |
| Production release | Explicitly outside Phase 13 authorization | BLOCKER |

## Files and paths audited

- Compose and images: `docker-compose.yml`, `docker-compose.production.yml`, `docker-compose.test.yml`, `docker-compose.override.yml`, root/frontend/backup/blockchain/test Dockerfiles, nginx configuration.
- Runtime configuration: `backend/config/environment.js`, `database.js`, `blockchain.js`, `ipfs.js`, example environment files, Vite configuration and browser API client.
- Application dependencies: PostgreSQL migration/backup scripts, IPFS and blockchain services, email/password-recovery services, limiter middleware, health/metrics/logging/alerts.
- Delivery: `.github/workflows/*.yml`, release/deployment/security scripts, Docker and release tests.
- Existing evidence: Stage 27-era Docker, security, recovery, performance, accessibility, CI/CD, monitoring and final-completion documentation.

## Audit constraints

- The real `.env` was not copied into this report and no secret values are documented.
- No external service was contacted, no credential was invented, no contract was deployed, and no development data or Docker volume was modified.
- `STAGING ACCEPTANCE BLOCKER — ADMIN LOGIN VALIDATION` is not an infrastructure-preparation blocker, but it prevents role-based UAT, staging acceptance sign-off and production release.
