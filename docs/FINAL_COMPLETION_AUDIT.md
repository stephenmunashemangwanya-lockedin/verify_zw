# Final completion audit

Audit date: 2026-08-10 (Africa/Harare)  
Program: VerifyZW final production-hardening and completion  
Phase: 0 — baseline audit  
Status: implementation is not authorised to begin until this audit passes its Phase 0 validation gate

## Audit method and preservation baseline

This is a read-only assessment of the existing application. No application code, schema, migration, configuration, dependency, database row, container, volume, or external service was changed during the audit. Values from `.env` were not printed or recorded. The audit inspected the root and frontend package manifests; backend, frontend, contract, script, test, Docker, Compose, workflow, migration, documentation, environment-example, role, authentication, account-management, credential, IPFS, blockchain, recovery, observability, and CI/CD implementation.

The development database baseline was queried read-only on 2026-08-10:

| Table | Rows |
| --- | ---: |
| users | 1 |
| institutions | 1 |
| students | 1 |
| credentials | 0 |
| verification_logs | 0 |
| audit_logs | 1 |

The Stage 25 fixture table and `skill_verification_restore_test` database were absent. These counts are the preservation baseline for later phases.

## 1. Existing functionality

The repository is a mature application, not a greenfield project. Implemented capabilities include:

- Express 5 API with PostgreSQL 18-compatible schema bootstrap and checksum migration ledger (`000` through `006`).
- React 19, Vite 7, and TypeScript frontend with public and authenticated layouts.
- JWT login, logout audit, current-user reload, token-version invalidation, account inactivity checks, failed-login counters, temporary lockout, password policy, profile update, and change-password support.
- Institution creation, listing, detail, activation/status management, wallet authorization, and institution-scoped access.
- Student creation, listing, detail, pagination, search, and institution scope.
- User listing, detail, creation, identity update, activation/deactivation, role change, institution assignment, administrative reset-token initiation, pagination, filtering, and audit logging.
- Credential issuance with secure PDF upload validation, hashing, IPFS integration, blockchain proof, lifecycle status, QR generation, presentation PDF generation, public verification, and revocation.
- Verification and audit logs, dashboards, metrics, health/readiness/liveness checks, redacted structured logs, alert hooks, and graceful shutdown handling.
- Backup, verification, restore-test, retention, integrity, recovery, and blockchain reconciliation scripts with destructive-operation safeguards.
- Docker development, test, production overlay, migration, contract-deployment, backup, and restore-test definitions.
- GitHub Actions for CI, E2E, security, Docker build/scan/SBOM/publish, immutable release gating, and manual deployment preparation.
- Automated backend, frontend, Solidity, API E2E, browser E2E, accessibility, Docker-configuration, recovery, coverage, documentation, CI, and release-readiness tests.

The older `docs/PROJECT_AUDIT.md` does not describe this baseline and must be archived or rewritten in Phase 21.

## 2. Current role model

`backend/constants/roles.js` is authoritative and defines exactly four roles:

| Role | Scope and current intent |
| --- | --- |
| `super_admin` | Global administration, institution administration, and global user scope. |
| `institution_admin` | Administration within the actor's institution; may manage institution-scoped issuer and verifier accounts. |
| `issuer` | Institution-scoped credential operations allowed by route policy. |
| `verifier` | Verification-oriented access allowed by route policy. Public registration currently creates only this role with no institution. |

`INSTITUTION_MANAGED_ROLES` contains only `issuer` and `verifier`. No additional role may be invented. Backend authorization, rather than frontend guards, is authoritative.

## 3. Existing user-management capabilities

The current `/api/users` surface is protected by authentication, a current database user check, and `super_admin`/`institution_admin` role checks. It supports list, detail, create, identity update, status update, role update, institution reassignment, and administrator-initiated reset tokens. It already includes pagination/search/filtering, inactive-institution checks, cross-institution target denial, protection against self-deactivation, protection against deactivating the final active super administrator, password-hash exclusion, audit events, and action rate limiting.

Public `/api/auth/register` rejects requested roles other than `verifier` and always persists `verifier` with a null institution. Therefore it cannot directly self-assign a privileged role, but the product decision in Phase 2 must determine whether unverified public verifier accounts should continue to exist at all.

Important remaining user-provisioning defects or gaps:

- There is no non-HTTP first-super-admin bootstrap command.
- There is no non-HTTP administrator recovery/reset-password command.
- Development setup/reset tokens can be returned by administrative HTTP responses; production expects a secure delivery channel but no email adapter is implemented.
- Role changes require additional invariant review, especially super-admin assignment/removal and institution requirements after role changes.
- Forced-password-change state exists, but login/UI enforcement must be audited and completed.
- Frontend user creation uses raw text for role and institution UUID instead of validated selectors.

## 4. Missing workflows

Confirmed missing or incomplete product workflows are:

- Secure first-admin bootstrap and administrator recovery commands.
- A decided and enforced onboarding policy for public verifier registration.
- Production cookie authentication and any CSRF control required by the final frontend/API topology.
- Public forgot-password and reset-password endpoints, delivery adapter, and frontend pages. The schema already has hashed reset-token and expiry columns.
- Complete forced-password-change behavior and safe lock-state presentation.
- Student update/edit backend and frontend workflows.
- Validated institution/student/role selectors in creation workflows.
- Direct, authorised browser download of generated credential PDFs. Current generation returns metadata only.
- Route-level frontend code splitting and measured bundle optimisation.
- Fresh dependency and container security classification.
- Signed-off manual WCAG review and governed visual-regression baselines.
- Repeatable isolated load tests with release thresholds.
- Successful Docker runtime validation on the present machine.
- Real staging infrastructure, staging deployment, provider acceptance, operational drills, UAT, and release evidence.

## 5. Authentication architecture

Current login signs an HS256 JWT containing user ID, role, institution ID, and token version. Issuer, audience, expiry, and algorithm are configured and verified. Protected routes reload the current database account and reject missing, inactive, or stale-token-version users. Login implements generic credential failures, account inactivity handling, failed-attempt tracking, temporary lockout, audit events, rate limiting, and sensitive-response no-store headers.

The frontend stores the bearer token in `sessionStorage`, attaches it as an `Authorization` header, clears it on logout or HTTP 401, and reloads `/api/auth/profile`. Logout records an event but does not independently revoke the presented token. This is acceptable only as the transitional baseline; Phase 3 must move browser production authentication to an HttpOnly cookie, preserve local/test compatibility only where justified, and document removal of bearer compatibility. CORS already has an explicit credential setting and origin validation, but cookie topology and CSRF requirements are not yet configured.

## 6. Deployment architecture

The root Docker build is multi-stage and Compose separates PostgreSQL, a local Hardhat service, migrations, contract deployment, backend, frontend, backup, and restore-test tooling. The production override removes development bind mounts/commands and does not publish PostgreSQL. Local Hardhat is profile-bound and must remain excluded from production. Fresh databases use `000_initial_schema.sql`; later migrations are checksum tracked.

Stage 27 CI/CD is implemented as preparation and validation, not real deployment:

- `ci.yml`: validation/tests and backend, frontend, and contract coverage.
- `e2e.yml`: isolated PostgreSQL/API and Playwright E2E.
- `security.yml`: dependency review, dependency/secret scanning, and CodeQL.
- `docker.yml`: Compose integration, image scan/SBOM, and trusted publish.
- `release.yml`: full release gate and immutable image/release verification.
- `deploy.yml`: protected, manual, dry-run deployment preparation only.

Stage 28 has no deployment target and must not proceed until operator infrastructure is supplied.

## 7. Current dependencies

Principal runtime dependencies are Express 5, PostgreSQL `pg`, bcrypt/bcryptjs, JWT, Zod, Helmet, CORS, express-rate-limit, Multer, ethers 6, PDFKit, QRCode, prom-client, Swagger UI, YAML, React 19, React Router 7, TanStack Query, Axios, React Hook Form, and Recharts. Principal development tooling is Hardhat 2 with its toolbox and OpenZeppelin contracts, c8, Solidity coverage, Vite 7, TypeScript 5.9, Vitest 4, ESLint 9, Playwright, and axe-core.

Both `bcrypt` and `bcryptjs` remain installed while current authentication code uses `bcryptjs`. This should be classified in Phase 9, not removed without dependency/use verification.

Package manifests and lockfiles are present and non-empty. Exact versions remain lockfile-controlled.

## 8. Current vulnerabilities

No fresh registry or image audit was performed in Phase 0 because Phase 9 explicitly requires the network-backed audit, classification, remediation, regression testing, and report as one controlled unit.

The latest checked-in release documentation records 37 root advisories (14 low, 7 moderate, 16 high, zero critical), concentrated in development/Hardhat tooling, and later documentation records two high frontend routing advisories. These figures are historical, may now be stale, and are not accepted risk decisions. Runtime exploitability is not established. Phase 9 must run fresh root and frontend audits and classify directness, runtime reachability, architecture exposure, remediation, and residual risk. Container scanning remains part of Phases 9 and 12.

Known architecture risks independent of advisory counts are JavaScript-readable browser tokens, a process-local rate-limit store unsuitable for horizontally scaled enforcement, missing password-recovery delivery, and incomplete manual/load/staging acceptance.

## 9. Current Docker status

Docker client version 29.4.2 is installed. On 2026-08-10 the engine could not be reached through `//./pipe/docker_engine`; the server version was unavailable. Access to the user Docker configuration also reported permission denial. In accordance with the completion program, no prune, reset, volume deletion, Compose shutdown, or application workaround was attempted.

Therefore Docker definitions are present and previously tested, but current runtime health, images, containers, volumes, Stage 26 HTTP health, image sizes, image scans, SBOMs, and isolated Docker suite are **not currently revalidated**. Phase 12 must stop rather than modify project logic if Docker Desktop remains unstable.

## 10. Existing CI/CD status

Six least-privilege workflow files exist and cover validation, tests, coverage, E2E, CodeQL, dependency review, secret scanning, Docker integration, vulnerability scanning, SBOM generation, trusted publishing, immutable releases, and protected manual deployment preparation. Local scripts validate workflow structure and documentation.

This is implementation evidence, not evidence that the workflows have run successfully for the current commit. Git metadata was unavailable from the workspace command context during the prior release report, and Phase 0 does not claim a current GitHub run, commit SHA, image digest, signature, or published artifact. Stage 27 remains conditional until Phase 12 completes runtime and workflow validation.

## 11. Missing external configuration

The following operator-supplied items are absent or intentionally represented only by placeholders and are hard stop conditions for external acceptance:

- staging domain, DNS authority, and TLS/HTTPS termination;
- cloud/hosting account and backend/frontend deployment targets;
- managed staging PostgreSQL URL/credentials;
- Pinata/IPFS staging credentials and gateway;
- approved blockchain testnet, RPC URL, funded test wallet, and deployment authorization;
- secret manager and access policy;
- transactional email provider and sender configuration;
- backup object storage and retention policy;
- monitoring platform, alerting provider, and operator destinations/contacts;
- protected environment/release approvals and rollback target.

Examples must contain placeholders only. No external value will be fabricated or silently substituted.

## 12. Production blockers

Release is currently blocked by all of the following:

1. No secure first-admin/recovery CLI workflow.
2. Public verifier onboarding policy is not finalised.
3. Browser production authentication still relies on `sessionStorage` bearer tokens.
4. Forgot/reset-password workflow and production delivery are incomplete.
5. Student editing, direct PDF download, and validated relationship selectors are incomplete.
6. Dependency/security state is historical rather than freshly classified.
7. Manual WCAG, governed visual comparison, and realistic load acceptance are incomplete.
8. Docker engine is unavailable for the required Stage 27/Stage 26 validation.
9. No supplied staging infrastructure or external provider configuration exists.
10. No actual staging deployment, IPFS/testnet acceptance, restore drill, alert delivery test, rollback drill, or role-based UAT evidence exists.
11. Final documentation and full release gate have not been completed.
12. No immutable release version, current Git SHA, image digests, final SBOM/vulnerability package, operator approval record, or production release package exists.

Production deployment is not recommended at Phase 0.

## 13. Expected change matrix

Exact paths will be narrowed before each phase. The following is the currently expected maximum scope; existing modules will be modified only when required and historical migrations will not be rewritten.

| Phase | Expected files |
| --- | --- |
| 0 | `docs/FINAL_COMPLETION_AUDIT.md` only. |
| 1 | New scripts under `scripts/` for bootstrap/recovery; `package.json`; user/audit model helpers if required; focused tests; `.env.example`; `docs/ADMIN_BOOTSTRAP.md`. No public bootstrap route. |
| 2 and 5 | `backend/controllers/userController.js`, `backend/models/userModel.js`, `backend/validators/userValidator.js`, `backend/routes/userRoutes.js`, role-aware tests, frontend user-management components, `docs/USER_PROVISIONING.md`. `backend/constants/roles.js` is expected to remain authoritative and unchanged unless a verified defect exists. |
| 3 | `backend/controllers/authController.js`, authentication/security middleware, environment validation/examples, Express/CORS configuration, frontend API/auth context, authentication tests, `docs/AUTHENTICATION_SECURITY.md`. |
| 4 | Additive migration `007_*` or later, auth controller/model/validator/routes/security middleware, mail adapter, frontend auth pages/routes/tests, environment examples, authentication documentation. |
| 6 | Student controller/model/validator/routes/tests and relevant frontend management pages/tests. |
| 7 | Credential route/controller/service/tests and frontend credential detail/form/tests; documentation/OpenAPI for the download operation. |
| 8 | Frontend route/component imports and tests; Vite/build-analysis configuration if justified; `docs/FRONTEND_PERFORMANCE_REPORT.md`. |
| 9 | Compatible package manifests/lockfiles only where remediation is validated; Docker/workflow pins if justified; `docs/DEPENDENCY_SECURITY_REPORT.md`. No forced audit upgrade. |
| 10 | Playwright specs/config and approved baseline assets; `docs/WCAG_MANUAL_REVIEW.md`. Existing wording/order is preserved unless correcting a recorded defect. |
| 11 | Load-test configuration/scripts and `docs/PERFORMANCE_TEST_REPORT.md`; no production target. |
| 12 | Primarily evidence/report documentation; Docker or CI files change only for verified project defects, never to mask Docker Desktop failure. |
| 13 | `.env.staging.example` and staging interface/documentation with placeholders only. |
| 14–20 | Deployment/acceptance reports, protected deployment interfaces, runbooks, UAT checklist, and narrowly justified fixes discovered by real staging evidence. These phases are blocked until operator inputs exist. |
| 21 | Rewrite/archive `docs/PROJECT_AUDIT.md`; update `docs/RELEASE_TEST_REPORT.md` and `README.md`; create or reconcile final architecture, operations, provisioning, authentication, deployment, rollback, recovery, monitoring, release, and UAT documents without conflicting duplicates. |
| 22–23 | Final evidence/release reports and generated release artifacts in their existing ignored output locations; production deployment remains manual and separately authorised. |

Likely new documentation includes `FINAL_ARCHITECTURE.md`, `PRODUCTION_OPERATIONS.md`, `ADMIN_BOOTSTRAP.md`, `USER_PROVISIONING.md`, `AUTHENTICATION_SECURITY.md`, `STAGING_DEPLOYMENT.md`, `PRODUCTION_DEPLOYMENT.md`, `ROLLBACK.md`, `DISASTER_RECOVERY.md`, `MONITORING_RUNBOOK.md`, `RELEASE_CHECKLIST.md`, and `FINAL_UAT.md`. Before creating any of these, existing documents with overlapping purposes will be reconciled to avoid duplicate or contradictory sources of truth.

## Phase 0 exit criteria

- The audit matrix exists and records verified capabilities, roles, gaps, architecture, dependencies, historical vulnerability evidence, Docker/CI state, external prerequisites, blockers, and anticipated scope.
- Development database counts match the baseline above after documentation validation.
- Only this audit document changed during Phase 0.
- No secret value appears in this document.
- Implementation remains blocked until Phase 0 validation passes.

