# Zimbabwe Skill Verification Platform

## Stage 21 frontend

The professional React/Vite frontend lives in `frontend/`. Copy `frontend/.env.example` to `frontend/.env.local`, then run `npm install` in that directory. Repository-level commands are available as `npm run frontend:dev`, `npm run frontend:build`, `npm run frontend:test`, `npm run frontend:lint`, and `npm run frontend:preview`.

See `docs/FRONTEND_ARCHITECTURE.md` for security, API integration, routes, roles, and limitations, and `docs/FRONTEND_USER_GUIDE.md` for usage.

Frontend route splitting, bundle measurements, source-map policy, and the enforced initial-JavaScript budget are documented in [`docs/FRONTEND_PERFORMANCE_REPORT.md`](docs/FRONTEND_PERFORMANCE_REPORT.md). After building, run `npm --prefix frontend run performance:budget` to verify chunk isolation and the 500 kB entry budget.

The WCAG 2.2 AA review and visual-baseline policy are documented in [`docs/WCAG_MANUAL_REVIEW.md`](docs/WCAG_MANUAL_REVIEW.md) and [`docs/VISUAL_REGRESSION.md`](docs/VISUAL_REGRESSION.md). Run `npm --prefix frontend run test:visual` for comparisons; baseline regeneration is intentionally separate under `test:visual:update` and requires human review.

## API documentation

- OpenAPI 3.0.3: [`docs/openapi.yaml`](docs/openapi.yaml)
- Route reference and lifecycle: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)
- Role permissions: [`docs/API_ROLE_PERMISSIONS.md`](docs/API_ROLE_PERMISSIONS.md)
- Error catalogue: [`docs/API_ERROR_CATALOGUE.md`](docs/API_ERROR_CATALOGUE.md)
- PowerShell examples: [`docs/POWERSHELL_API_TESTING.md`](docs/POWERSHELL_API_TESTING.md)
- curl examples: [`docs/CURL_API_TESTING.md`](docs/CURL_API_TESTING.md)
- Postman collection and local environment: [`docs/postman/`](docs/postman/)
- Secure password recovery operations: [`docs/PASSWORD_RECOVERY.md`](docs/PASSWORD_RECOVERY.md)
- Administrative user lifecycle and capability matrix: [`docs/USER_MANAGEMENT.md`](docs/USER_MANAGEMENT.md)
- Institution-scoped student lifecycle: [`docs/STUDENT_MANAGEMENT.md`](docs/STUDENT_MANAGEMENT.md)
- Credential issuance, evidence, presentation PDF, and revocation lifecycle: [`docs/CREDENTIAL_MANAGEMENT.md`](docs/CREDENTIAL_MANAGEMENT.md)
- Dependency security baseline, release policy, and reviewed residual tooling risk: [`docs/DEPENDENCY_SECURITY_REPORT.md`](docs/DEPENDENCY_SECURITY_REPORT.md)
- Performance evidence, staging thresholds, and safe load-test commands: [`docs/PERFORMANCE_TEST_REPORT.md`](docs/PERFORMANCE_TEST_REPORT.md), [`docs/PERFORMANCE_ENVIRONMENT.md`](docs/PERFORMANCE_ENVIRONMENT.md), and [`docs/PERFORMANCE_RUNBOOK.md`](docs/PERFORMANCE_RUNBOOK.md)

In development, Swagger UI is available at `http://localhost:3000/api/docs/` and raw YAML at `http://localhost:3000/api/docs/openapi.yaml`. Production requires `ENABLE_SWAGGER=true`; use `SWAGGER_REQUIRE_AUTH=true` to restrict both to a current super administrator. Swagger bearer authorization is session-only and is not persisted by the UI.

Import both Postman JSON files, select the local environment, and replace placeholders locally. Mutating requests are never collection-run automatically. Authentication uses a bearer JWT returned by `/api/auth/login`; protected endpoints reload the current account and enforce role and institution scope.

Route groups include health, authentication, users, institutions, students, credentials, public verification, verification logs, audit logs, dashboards, QR destinations, generated certificates, and blockchain administration. Development URLs are `http://localhost:3000` for the API and `http://localhost:5173` for the frontend.

Validate documentation with `npm run docs:validate`, validate only OpenAPI with `npm run docs:openapi`, and run Swagger/route tests with `npm run test:docs`.

An Express and PostgreSQL credential-verification API. The current issuance
workflow validates and hashes PDF certificates, pins the actual bytes through
Pinata, stores only the returned IPFS CID, and leaves the credential in
`pending` status until future blockchain confirmation succeeds.

## Local setup

1. Copy `.env.example` to `.env` and replace placeholders locally.
2. Create the PostgreSQL database and run `npm run migrate`.
3. Start the API with `npm start` or `npm run dev`.

Never commit `.env`; it is ignored by Git.

## IPFS configuration

Create a restricted Pinata JWT with pinning permissions and configure:

- `IPFS_PROVIDER=pinata`
- `PINATA_JWT` with the private JWT
- `PINATA_GATEWAY` with the HTTPS gateway ending in `/ipfs`
- `IPFS_UPLOAD_TIMEOUT_MS` with a positive timeout
- `IPFS_MAX_RETRIES` with a positive attempt count
- `MAX_CERTIFICATE_SIZE_MB` with the upload limit

Run isolated tests with `npm run test:ipfs`. Tests mock all Pinata requests and
never use the configured JWT or upload real content.

See [IPFS integration](docs/IPFS_INTEGRATION.md) for workflow and security
details.

## Audit logging

Protected `/api/audit-logs` routes provide role enforcement, institution
scoping, safe filters and sorting, and bounded pagination. Sensitive detail
keys are recursively removed before JSONB persistence. See
[Audit logging](docs/AUDIT_LOGGING.md) and run `npm run test:audit`.

## Users and authentication

Public registration is verifier-only. Administrative user management enforces
database-backed role and institution boundaries, while token versions invalidate
stale sessions after sensitive changes. See [User and role management](docs/USER_ROLE_MANAGEMENT.md)
and [Authentication](docs/AUTHENTICATION.md). Run `npm run test:users`.

The first super administrator and privileged password recovery are operations-only CLI workflows; no public bootstrap endpoint exists. See [Administrator bootstrap and recovery](docs/ADMIN_BOOTSTRAP.md).

Public account registration is disabled because every implemented non-global role belongs to an approved institution. See [User provisioning](docs/USER_PROVISIONING.md) and the [role and institution model](docs/ROLE_AND_INSTITUTION_MODEL.md).

Browser authentication uses an HttpOnly cookie, credentialed explicit-origin CORS, and double-submit CSRF protection; browser JavaScript does not persist JWTs. See [Authentication security](docs/AUTHENTICATION_SECURITY.md).

## Validation and errors

Strict Zod schemas validate request bodies, parameters, and queries before
business logic. Central JSON error handling maps database, JWT, upload, IPFS,
and blockchain failures without exposing internals. See [Input validation](docs/INPUT_VALIDATION.md)
and [Error handling](docs/ERROR_HANDLING.md). Run `npm run test:validation` and
`npm run test:errors`.

## Blockchain proof

The Solidity 0.8.24 `CredentialRegistry` stores only the original 32-byte
SHA-256 digest, issuer address, and issue/revocation timestamps. Compile and
test it with `npm run compile:contract` and `npm run test:contract`.

Credential issuance becomes `active` only after IPFS pinning, a confirmed
registry transaction, and successful PostgreSQL metadata storage. Configure
the blockchain variables in `.env.example`; real private keys must never be
committed. See the blockchain documents under `docs/` for deployment,
integration, and recovery procedures.

## Stage 23 test and release gates

Run `npm run test:all` for the aggregate regression suite. Coverage is available
through `npm run test:backend:coverage`, `npm run test:frontend:coverage`, and
`npm run test:contract:coverage`; print saved summaries with
`npm run coverage:report`. Browser tests require Playwright Chromium. API E2E
requires a separately provisioned `TEST_DB_NAME` ending in `_test` and never
uses the development database. See [Testing strategy](docs/TESTING_STRATEGY.md),
[flaky-test policy](docs/FLAKY_TEST_POLICY.md), and the current
[release test report](docs/RELEASE_TEST_REPORT.md).

Configure `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_NAME`, `TEST_DB_USER`, and
`TEST_DB_PASSWORD` for `npm run test:e2e:api`. The runner rejects unsafe names,
uses mocked IPFS and local Hardhat only, and cleans only its dedicated database.
Use `CREATE DATABASE skill_verification_test;` when provisioning manually; no
drop or recreation is performed automatically.
# Zimbabwe Skill Verification Platform

Security and operational guidance is documented in [Security hardening](docs/SECURITY_HARDENING.md), [environment configuration](docs/ENVIRONMENT_CONFIGURATION.md), [health monitoring](docs/HEALTH_MONITORING.md), and [logging](docs/LOGGING.md).

Listing query parameters and response metadata are documented in [Pagination and search](docs/PAGINATION_AND_SEARCH.md). Run the Stage 19 coverage with `npm run test:pagination`.

Authenticated dashboard aggregates, role permissions, trends, failure analytics, and system-health summaries are documented in [Dashboard analytics](docs/DASHBOARD_ANALYTICS.md). Run Stage 20 coverage with `npm run test:dashboard`.

Stage 18 checks can be run with `npm run test:security` and `npm run test:health`. Existing validation, user, audit, IPFS, contract, blockchain, verification, revocation, QR, and PDF suites remain separate scripts in `package.json`.

## Stage 24 observability

Structured redacted operational logging, request/correlation IDs, protected Prometheus metrics, readiness/liveness endpoints, safe alert hooks, and fatal shutdown handling are described in [logging](docs/LOGGING.md), [monitoring](docs/MONITORING.md), [observability](docs/OBSERVABILITY.md), and [incident response](docs/INCIDENT_RESPONSE.md). Run `npm run test:observability` and `npm run test:metrics`. Metrics are disabled by default and, when enabled, require a current super administrator.

## Stage 25 recovery

Fail-closed PostgreSQL backup/restore, file-integrity archives, retention, and read-only integrity checks are documented in [backup and restore](docs/BACKUP_AND_RESTORE.md), the [disaster recovery runbook](docs/DISASTER_RECOVERY_RUNBOOK.md), [database integrity](docs/DATABASE_INTEGRITY.md), [blockchain recovery](docs/BLOCKCHAIN_RECOVERY.md), [IPFS recovery](docs/IPFS_RECOVERY.md), and [retention policy](docs/RETENTION_POLICY.md). Destructive database restore is limited to explicitly confirmed `_test` or `_restore_test` targets. Run `npm run test:recovery` for safe isolated tests.

## Stage 26 containers

Docker development, production, testing, security, and backup workflows are documented in [Docker architecture](docs/DOCKER_ARCHITECTURE.md), [development](docs/DOCKER_DEVELOPMENT.md), [production](docs/DOCKER_PRODUCTION.md), [testing](docs/DOCKER_TESTING.md), [security](docs/DOCKER_SECURITY.md), and [container backup/restore](docs/CONTAINER_BACKUP_RESTORE.md). Copy `.env.docker.example` locally and never commit the resulting `.env.docker`.

Fresh databases bootstrap through `000_initial_schema.sql`; later migrations are transactionally recorded with SHA-256 checksums in `schema_migrations`. Repeated migration runs apply nothing, partial schemas fail closed, and seed data is never loaded automatically.

Start the complete local container stack with `npm run docker:up`. Its explicit startup chain waits for PostgreSQL and Hardhat health, migrations, and a bytecode-verified local contract deployment before starting the backend and frontend. Hardhat state is ephemeral; stale metadata is detected with `eth_getCode` and refreshed locally, while existing database proofs require reconciliation after a chain reset. Restart without volume deletion; never use `docker compose down -v` unless intentional data destruction is required.

Container backup and restore utilities use PostgreSQL 18 client tools to match the server and fail closed if `pg_dump` is older than the server. Run `npm run docker:backup` and restore only into the approved `skill_verification_restore_test` target with `npm run docker:restore:test`; see [container backup/restore](docs/CONTAINER_BACKUP_RESTORE.md) for version checks and upgrade steps.

## Stage 27 CI/CD

GitHub Actions now provide least-privilege primary CI, PostgreSQL 18 and local-Hardhat E2E, coverage gates, CodeQL and dependency/security scanning, Docker build/scan/SBOM jobs, trusted GHCR publishing, immutable semantic releases, and protected manual deployment preparation. Pull requests cannot publish or deploy, IPFS is mocked, test databases end in `_test`, and deployment preparation is dry-run only. Start with [CI/CD architecture](docs/CI_CD_ARCHITECTURE.md), [GitHub Actions](docs/GITHUB_ACTIONS.md), [secrets](docs/CI_CD_SECRETS.md), [branch protection](docs/BRANCH_PROTECTION.md), [release process](docs/RELEASE_PROCESS.md), and [deployment preparation](docs/DEPLOYMENT_WORKFLOW.md).
