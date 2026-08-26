---
stepsCompleted: ["step-01-validate-prerequisites"]
inputDocuments: 
  - "_bmad-output/planning-artifacts/prds/prd-Zimbabwe-Skill-Verification-Platform-2026-08-18/prd.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Zimbabwe-Skill-Verification-Platform-2026-08-18/ARCHITECTURE-SPINE.md"
projectName: "Zimbabwe Skill Verification Platform"
extractedFRCount: 7
extractedNFRCount: 4
extractedAdditionalRequirementsCount: 6
extractedUXRequirementsCount: 0
---

# Zimbabwe Skill Verification Platform - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Zimbabwe Skill Verification Platform, decomposing the requirements from the PRD and Architecture decisions into implementable stories. The platform is a secure digital credentialing and verification system that combines institutional record management, credential lifecycle tracking, public verification, and blockchain-backed proof anchoring.

## Requirements Inventory

### Functional Requirements

**FR-1: Authentication and security**
- The system shall support secure authentication using cookies and JWT-based session enforcement.
- The system shall enforce role- and institution-based access control for protected operations.
- The system shall reject unsafe or untrusted environment configurations before runtime use.

**FR-2: Institution management**
- The system shall support institution creation, activation, and deactivation.
- The system shall associate users and credentials with their institution correctly.
- The system shall prevent unauthorized institution operations across scopes.

**FR-3: Student management**
- The system shall maintain student records with institution ownership.
- The system shall support updates and safe reassignment when permitted.
- The system shall prevent invalid or unauthorized student changes.

**FR-4: Credential lifecycle**
- The system shall support credential creation, processing, activation, and revocation.
- The system shall validate credential inputs and required fields before processing.
- The system shall exercise IPFS upload and blockchain issuance when configured.
- The system shall track credential status changes with audit records.

**FR-5: Verification**
- The system shall allow verification by file, hash, credential ID, or public token.
- The system shall compare credential validity against stored state and blockchain state.
- The system shall surface revocation or inconsistencies safely and clearly.

**FR-6: Audit and dashboarding**
- The system shall record sensitive operational activity using controlled audit logging.
- The system shall provide dashboard summaries for key institutional and system metrics.
- The system shall expose health, metrics, and operational visibility in a protected manner.

**FR-7: Deployment and operational reliability**
- The system shall support Dockerized local and environment-specific deployment.
- The system shall enforce migration safety and fail-closed restore behavior.
- The system shall provide structured logs, health checks, and operational monitoring.

### Non-Functional Requirements

**NFR-1: Security**
- Secrets must be stored outside the repository and never committed.
- Role boundaries must be enforced in the backend and route layer.
- Sensitive data must be minimized in logs and persistence.

**NFR-2: Reliability**
- The system must fail safely when database, IPFS, or blockchain services are unavailable.
- Recovery and restore flows must be explicit and guarded against destructive mistakes.
- Health checks must expose readiness and liveness clearly.

**NFR-3: Maintainability**
- Business logic must remain separated from routing and validation layers.
- Operational configuration must be environment-driven and documented.
- Scripts and migrations must be versioned and executable in a repeatable way.

**NFR-4: Performance and observability**
- The system must support metrics and operational diagnostics.
- The system must provide request correlation and logging for operational debugging.
- The system must support bounded queries and safe pagination for larger datasets.

### Additional Technical Requirements (from Architecture)

**AD-1: Institutional authority is the trust boundary**
- Every protected operation must resolve the current user's role and institution scope before business mutation
- No route may treat a credential or student as globally valid without institution ownership checks
- Implementation: Enforce at middleware/route layer for all protected endpoints

**AD-2: Public verification is intentionally narrow and read-only**
- Public or external verification may expose only minimal proof state and status
- Personal or operational data remains behind institution-scoped access
- Implementation: Separate public verification routes from institutional routes

**AD-3: PostgreSQL is the source of truth**
- The database remains the operational ledger, while blockchain is a trust anchor
- A credential is not considered complete until both application state and blockchain proof are confirmed
- Implementation: Synchronize state between database and blockchain; blockchain cannot be sole source of truth

**AD-4: Evidence is proof-bearing, not document-bearing**
- The system stores the document hash and minimal proof record, not full documents
- IPFS holds the file evidence; blockchain stores only trusted digest and lifecycle metadata
- Implementation: Use IPFS CIDs and SHA-256 hashes, not full document payloads

**AD-5: Environment safety is part of the runtime contract**
- Runtime must fail before starting when staging/production safety requirements are not met
- Unsafe local service endpoints, insecure cookies, and weak secret policy are blocking conditions
- Implementation: Strict environment validation before app initialization

**AD-6: Observability and recovery are mandatory operational features**
- Operational surfaces must provide request correlation, health readiness/liveness, bounded metrics
- Recovery workflows must have explicit safety conditions to prevent destructive mistakes
- Implementation: Health endpoints, correlation IDs, guarded restore paths

### FR Coverage Map

| Requirement | Coverage | Location | Governs |
| --- | --- | --- | --- |
| FR-1 (Auth) | AD-1, AD-5 | backend/middleware, routes/authRoutes | E1, E2 |
| FR-2 (Institutions) | AD-1 | backend/routes/institutionRoutes, DB models | E1, E2 |
| FR-3 (Students) | AD-1 | backend/routes/studentRoutes, domain logic | E1, E3 |
| FR-4 (Credentials) | AD-3, AD-4 | backend/routes/credentialRoutes, services | E4, E5 |
| FR-5 (Verification) | AD-2 | backend/routes/verificationRoutes | E5, E6 |
| FR-6 (Audit) | AD-6 | backend/routes/auditRoutes, metrics | E7 |
| FR-7 (Deployment) | AD-5, AD-6 | docker-compose, config validation | E8 |

## Epic List

### Core Verification Epics (Existing Implementation)
1. **E1: User Authentication & Authorization** — Verify and complete secure authentication with cookies/JWT and role-based institutional access control
2. **E2: Institution Lifecycle Management** — Verify institution creation, activation, deactivation, and user/role management
3. **E3: Student Record Management** — Verify institution-scoped student records; complete update/edit workflows
4. **E4: Credential Issuance Lifecycle** — Verify credential creation, processing, activation, blockchain/IPFS proofing; enable direct PDF download
5. **E5: Credential Revocation & Verification** — Verify verification by multiple methods with consistency checks
6. **E6: Public Verification Interface** — Verify narrow, read-only public verification without exposing institutional data
7. **E7: Audit Logging & Observability** — Verify operational activity recording, dashboards, metrics, and observability
8. **E8: Deployment Safety & Recovery** — Verify environment validation, Docker orchestration, backups, and restore workflows

### Production Completion Epics (Stages 28-34, Phases 1-7)
9. **E9: Admin Bootstrap & Recovery** — Implement secure first-admin bootstrap and administrator recovery workflows (Phase 1 blocker)
10. **E10: Production Authentication** — Implement HttpOnly cookies, CSRF protection, and production-grade session management (Phase 3 blocker)
11. **E11: Password Recovery Workflow** — Implement forgot-password, reset-token, and email delivery (Phase 4 blocker)
12. **E12: Frontend Performance & Code Optimization** — Complete route-level code splitting, bundle optimization, and security headers (Phase 8 blocker)
13. **E13: WCAG & Visual Accessibility** — Complete manual WCAG 2.2 AA audit, remediation, and visual regression (Phase 10 blocker)
14. **E14: Load Testing & Performance Gates** — Implement repeatable load tests and release thresholds (Phase 11 blocker)
15. **E15: Docker & CI/CD Validation** — Validate Docker runtime, GitHub Actions workflows, image scanning, and SBOMs (Phase 12 blocker)
16. **E16: Staging Configuration & Readiness** — Prepare staging environment configuration and infrastructure documentation (Phase 13)

---

## Requirements Traceability & Stage Mapping

### FR Coverage Matrix

| FR | Epic | Stories | Status | Stage |
| --- | --- | --- | --- | --- |
| FR-1: Authentication & security | E1, E10 | 1.1–1.5, 10.1–10.4 | VERIFY + IMPLEMENT | 28–30 |
| FR-2: Institution management | E2 | 2.1–2.4 | VERIFY | 28 |
| FR-3: Student management | E3 | 3.1–3.6 | PARTIAL + IMPLEMENT | 29 |
| FR-4: Credential lifecycle | E4 | 4.1–4.5 | VERIFY + IMPLEMENT | 29–30 |
| FR-5: Verification | E5, E6 | 5.1–5.5, 6.1–6.4 | VERIFY | 28–29 |
| FR-6: Audit & dashboarding | E7 | 7.1–7.5 | VERIFY | 28 |
| FR-7: Deployment & reliability | E8, E15 | 8.1–8.5, 15.1–15.4 | VERIFY + IMPLEMENT | 31–34 |

### NFR Coverage Matrix

| NFR | Epics | Stories | Status | Stage |
| --- | --- | --- | --- | --- |
| NFR-1: Security | E1, E9, E10, E11, E12 | 1.2–1.4, 9.1–9.3, 10.1–10.2, 11.1–11.2, 12.3–12.4 | VERIFY + IMPLEMENT | 28–30 |
| NFR-2: Reliability | E8, E15 | 8.1–8.5, 15.1 | VERIFY | 31–34 |
| NFR-3: Maintainability | E7 | 7.1, 7.5 | VERIFY | 28 |
| NFR-4: Performance & observability | E7, E12, E13, E14 | 7.1–7.5, 12.1–12.2, 13.1–13.4, 14.1–14.4 | NOT IMPLEMENTED | 30–34 |

### Architecture Decision Coverage Matrix

| AD | Epics | Stories | Status | Stage |
| --- | --- | --- | --- | --- |
| AD-1: Institutional authority is trust boundary | E1, E2, E3, E5 | 1.2–1.3, 2.1–2.2, 3.1–3.6, 5.1–5.5 | VERIFY | 28–29 |
| AD-2: Public verification is intentionally narrow | E5, E6 | 5.1–5.5, 6.1–6.4 | VERIFY | 28–29 |
| AD-3: PostgreSQL is source of truth | E4, E5 | 4.2–4.3, 5.5 | VERIFY | 28–30 |
| AD-4: Evidence is proof-bearing | E4, E5, E6 | 4.2–4.5, 5.1–5.5, 6.1–6.4 | VERIFY | 28–30 |
| AD-5: Environment safety is runtime contract | E1, E8, E9, E10 | 1.1, 8.1, 9.1, 10.1–10.2 | VERIFY + IMPLEMENT | 28, 30–31 |
| AD-6: Observability & recovery are mandatory | E7, E8, E15 | 7.1–7.5, 8.3–8.5, 15.1–15.4 | VERIFY + IMPLEMENT | 28, 31–34 |

### Historical Pre-Implementation Classification (Superseded)

The narrative below is retained as historical planning context only. It is superseded by the repository-backed canonical baseline that follows and must not be used for current status counts.

**VERIFY (Existing Implementation, Requires Testing)**
- E1 (1.1–1.5): Authentication and RBAC — backend code exists
- E2 (2.1–2.3): Institution lifecycle — backend code exists
- E3 (3.1–3.3): Student CRUD — backend code exists
- E4 (4.1–4.4): Credential issuance — backend code exists
- E5 (5.1–5.5): Verification and consistency — backend code exists
- E6 (6.1–6.4): Public verification — backend code exists
- E7 (7.1–7.5): Audit and observability — backend code exists
- E8 (8.1–8.5): Deployment safety — scripts and Docker exist

**PARTIAL (Partial Implementation, Requires Completion)**
- E3 (3.4–3.5): Student update backend and frontend — backend PATCH /:id route EXISTS, frontend not implemented
- E4 (4.5): Direct PDF download — backend GET /:id/pdf route EXISTS, downloads from local output/pdf, needs IPFS fallback
- E10 (10.4): Session logout — endpoint exists, revocation incomplete
- E11 (11.1–11.2): Password recovery — backend routes POST /forgot-password and POST /reset-password exist, but mail adapter not integrated, frontend pages not implemented

**IMPLEMENT (Not Implemented, Requires Full Development)**
- E9 (9.1–9.3): Admin bootstrap and recovery CLI — requires new scripts
- E10 (10.1–10.2): HttpOnly cookies and CSRF — requires middleware and frontend changes
- E11 (11.3–11.4): Mail adapter and frontend pages — requires new modules
- E12 (12.1–12.5): Frontend performance and security — requires optimization and audit
- E13 (13.1–13.4): WCAG and visual regression — requires audit and testing setup
- E14 (14.1–14.4): Load testing — requires test framework and scripts
- E15 (15.2–15.4): CI/CD and image scanning — requires workflow validation
- E16 (16.1–16.3): Staging configuration — requires documentation and templates

**BLOCKED**
- E15 (15.1): Docker validation — Docker engine unavailable during Phase 0

### Canonical Repository-Backed Story Classification

Baseline date: 2026-08-20. `development_status` uses only the official BMAD vocabulary; dependency state is recorded separately.

| Story | Epic | Exact title | development_status | Dependency | Repository evidence | Tests/evidence supporting completion | Current blocker |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 1.1 | 1 | Verify JWT Authentication with Session Management | done | Met | auth controller/middleware/session | cookie-auth, security tests | — |
| 1.2 | 1 | Verify Role-Based Access Control Enforcement | done | Met | roles and route middleware | user/audit/security tests | — |
| 1.3 | 1 | Verify Institution Scope Enforcement | done | Met | scoped models/controllers | student/user/audit tests | — |
| 1.4 | 1 | Verify Token Version Invalidation on Sensitive Changes | done | Met | user model/current-user middleware | user and cookie-auth tests | — |
| 1.5 | 1 | Verify Account Inactivity Timeout | done | Met | auth session enforcement | security tests | — |
| 2.1 | 2 | Verify Institution Creation and Activation | done | Met | institution controller/model/routes | user-management tests | — |
| 2.2 | 2 | Verify Institution Status Management | done | Met | institution lifecycle code | user/security tests | — |
| 2.3 | 2 | Verify Institution Wallet Authorization | done | Met | wallet validators/authorization script | validation/contract tests | — |
| 2.4 | 2 | Add Validated Institution Selector in UI | done | Met | management UI/contracts | frontend user tests | — |
| 3.1 | 3 | Verify Student Creation with Institution Scope | done | Met | student controller/model/routes | student tests | — |
| 3.2 | 3 | Verify Student Listing with Search and Pagination | done | Met | student model/pagination | pagination/student tests | — |
| 3.3 | 3 | Verify Student Detail View | done | Met | detail controller/UI | backend/frontend student tests | — |
| 3.4 | 3 | Implement Student Record Update/Edit Backend | done | Met | update controller/model/validator | student tests | — |
| 3.5 | 3 | Implement Student Record Update/Edit Frontend | done | Met | student edit UI | frontend student tests | — |
| 3.6 | 3 | Add Validated Student Selector in Credential Workflows | done | Met | credential selector UI/contracts | credential/student frontend tests | — |
| 4.1 | 4 | Verify PDF Upload and Validation | done | Met | upload middleware/validators | validation/credential tests | — |
| 4.2 | 4 | Verify Document Hashing and IPFS Pinning | done | Met | hash/IPFS services | IPFS/credential tests | — |
| 4.3 | 4 | Verify Blockchain Proof Issuance | done | Met | blockchain service/model/contract | contract/blockchain tests | — |
| 4.4 | 4 | Verify Credential Status Lifecycle | done | Met | credential code/migrations | lifecycle/revocation tests | — |
| 4.5 | 4 | Implement Direct Authorized PDF Download | done | Met | protected PDF download route/service | PDF/credential tests | — |
| 5.1 | 5 | Verify Verification by Hash | done | Met | verification service/routes | public/performance tests | — |
| 5.2 | 5 | Verify Verification by Credential ID | done | Met | ID verification route | public/performance tests | — |
| 5.3 | 5 | Verify Verification by Public Token | done | Met | token route/migration | public/performance tests | — |
| 5.4 | 5 | Verify Revocation Workflow | done | Met | revocation service/contract | revocation/contract tests | — |
| 5.5 | 5 | Verify Consistency Checks: DB vs Blockchain | done | Met | reconciliation service/script | blockchain/recovery tests | — |
| 6.1 | 6 | Verify Public Verification Routes | done | Met | public routes/controller | public/E2E tests | — |
| 6.2 | 6 | Verify QR Code Generation and Resolution | done | Met | QR service/token resolution | QR tests | — |
| 6.3 | 6 | Verify Verification Result Display | done | Met | public verification UI | frontend public/E2E tests | — |
| 6.4 | 6 | Verify Public Verification Does Not Expose Institutional Data | done | Met | narrow public DTO/service | public security tests | — |
| 7.1 | 7 | Verify Audit Log Recording and Queries | done | Met | audit service/model/routes | audit tests | — |
| 7.2 | 7 | Verify Dashboard Analytics | done | Met | dashboard backend/UI | dashboard tests | — |
| 7.3 | 7 | Verify Health Endpoints | done | Met | health service/routes | health tests | — |
| 7.4 | 7 | Verify Metrics Exposure | done | Met | metrics middleware/routes | metrics tests | — |
| 7.5 | 7 | Verify Structured Logging with Correlation IDs | done | Met | logger/request middleware | observability tests | — |
| 8.1 | 8 | Verify Environment Validation and Fail-Closed Startup | done | Met | environment/startup validation | security/staging tests | — |
| 8.2 | 8 | Verify Database Migration with Checksum Validation | done | Met | migration runner/verifier | migration tests | — |
| 8.3 | 8 | Verify Backup with Integrity Verification | done | Met | backup/verify scripts | recovery tests/runbook | — |
| 8.4 | 8 | Verify Restore-Test Workflow | done | Met | guarded restore/drill scripts | recovery tests | — |
| 8.5 | 8 | Verify Blockchain State Reconciliation | done | Met | reconciliation script/audit flow | blockchain/recovery tests | — |
| 9.1 | 9 | Implement Secure First-Super-Admin Bootstrap CLI | done | Met | bootstrap CLI/model policy | bootstrap/admin tests | — |
| 9.2 | 9 | Implement Admin Password Recovery CLI | done | Met | reset-admin CLI | admin tests | — |
| 9.3 | 9 | Implement Admin Password Reset Token Management | done | Met | reset-token model/migration | admin/user tests | — |
| 10.1 | 10 | Implement HttpOnly Cookie Authentication | done | Met | cookie/session utilities/client | cookie/frontend auth tests | — |
| 10.2 | 10 | Implement CSRF Protection | done | Met | CSRF enforcement | cookie/frontend security tests | — |
| 10.3 | 10 | Verify Secure CORS Configuration | done | Met | environment/security middleware | security/staging tests | — |
| 10.4 | 10 | Verify Session Invalidation on Logout | done | Met | logout/token controls | cookie-auth tests | — |
| 11.1 | 11 | Implement Forgot-Password Endpoint | done | Met | auth route/recovery service | password-recovery tests | — |
| 11.2 | 11 | Implement Reset-Password with Token Validation | done | Met | reset endpoint/model/migration | password-recovery tests | — |
| 11.3 | 11 | Implement Mail Adapter Integration | done | Met | capture/webhook email adapters | recovery/staging tests | — |
| 11.4 | 11 | Implement Frontend Forgot/Reset-Password Pages | done | Met | recovery pages/routes | frontend auth/visual tests | — |
| 12.1 | 12 | Implement Route-Level Code Splitting | done | Met | lazy routes/boundary | fresh focused 5/5; full frontend 91/91 | — |
| 12.2 | 12 | Implement Bundle Size Analysis and Optimization | done | Met | bundle budget/split assets | fresh production build/report | — |
| 12.3 | 12 | Validate Security Headers | done | Met | security middleware/nginx | backend/frontend security tests | — |
| 12.4 | 12 | Implement Dependency Vulnerability Audit | done | Met | dependency security tooling/report | policy tests | — |
| 12.5 | 12 | Implement Fresh Container Security Scan | done | Met | security workflow/scanner | CI policy tests | — |
| 13.1 | 13 | Perform Manual WCAG 2.2 AA Audit | done | Met | current WCAG review | documented keyboard/contrast evidence | — |
| 13.2 | 13 | Remediate Accessibility Defects | done | Met | semantic UI/styles | accessibility/frontend tests | — |
| 13.3 | 13 | Establish Visual Regression Baseline | done | Met | committed snapshots | visual assets/report | — |
| 13.4 | 13 | Implement Visual Regression Test Suite | done | Met | Playwright visual specs | visual regression evidence | — |
| 14.1 | 14 | Design Load Test Scenarios | done | Met | performance profiles/docs | performance report | — |
| 14.2 | 14 | Implement and Execute Repeatable Load Tests | done | Met | repeatable performance runner | fresh smoke run/load report | — |
| 14.3 | 14 | Define Performance Thresholds and Release Gates | done | Met | thresholds/release checks | performance/release tests | — |
| 14.4 | 14 | Analyze Bottlenecks and Optimize | done | Met | indexes/query analyzer/report | performance evidence | — |
| 15.1 | 15 | Validate Docker Runtime | in-progress | Met | Dockerfiles/Compose; Desktop 4.72/Engine 29.4.2 | services ultimately healthy; Docker tests | `npm run docker:up` exited 1 before backend transitioned healthy; startup gate race remains |
| 15.2 | 15 | Validate GitHub Actions Workflows | done | Met | six workflow files/validator | fresh workflow policy 7/7 | — |
| 15.3 | 15 | Implement Container Image Scanning | done | Met | security/docker workflows/scanner | CI security tests | — |
| 15.4 | 15 | Validate SBOM Generation and Documentation | done | Met | release workflows/`sbom/` | CI validation/SBOM docs | — |
| 16.1 | 16 | Create .env.staging.example with Placeholders | done | Met | staging env example | staging tests/secret scan | — |
| 16.2 | 16 | Create Staging Deployment Configuration | done | Met | staging Compose/runbook | staging tests/render evidence | — |
| 16.3 | 16 | Create Infrastructure Documentation Package | done | Met | staging infrastructure docs | documentation validation | — |

#### Baseline Summary

| Classification | Count | Percentage |
| --- | ---: | ---: |
| Done | 69 | 98.57% |
| In Progress | 1 | 1.43% |
| Ready for Dev | 0 | 0.00% |
| Backlog | 0 | 0.00% |
| Blocked | 0 | 0.00% |
| TOTAL | 70 | 100.00% |

| Epic | Total stories | Done | Remaining | Blocked |
| --- | ---: | ---: | ---: | ---: |
| 1 | 5 | 5 | 0 | 0 |
| 2 | 4 | 4 | 0 | 0 |
| 3 | 6 | 6 | 0 | 0 |
| 4 | 5 | 5 | 0 | 0 |
| 5 | 5 | 5 | 0 | 0 |
| 6 | 4 | 4 | 0 | 0 |
| 7 | 5 | 5 | 0 | 0 |
| 8 | 5 | 5 | 0 | 0 |
| 9 | 3 | 3 | 0 | 0 |
| 10 | 4 | 4 | 0 | 0 |
| 11 | 4 | 4 | 0 | 0 |
| 12 | 5 | 5 | 0 | 0 |
| 13 | 4 | 4 | 0 | 0 |
| 14 | 4 | 4 | 0 | 0 |
| 15 | 4 | 3 | 1 | 0 |
| 16 | 3 | 3 | 0 | 0 |
| **TOTAL** | **70** | **69** | **1** | **0** |

There are no genuinely blocked canonical stories. External staging host, DNS/TLS, managed database, testnet RPC/funding, IPFS/email/Redis credentials, monitoring, and off-host backup destinations are later deployment/UAT prerequisites, not blockers for Stories 16.1–16.3 as written.

### Orphan Requirements Check

**No orphan functional requirements found.** All 7 FRs are covered by at least one epic and story.

**No orphan non-functional requirements found.** All 4 NFRs are covered by at least one epic and story.

**No orphan architecture decisions found.** All 6 ADs are covered by implementation stories.

---

## Stages 28–34 Mapping

### Stage 28: Core Verification & Authentication (Phase 1–2 of Completion Audit)

**Objective:** Verify existing authentication, RBAC, institution, and credential functionality; implement admin bootstrap and first-admin recovery.

**Epics:** E1, E2, E3, E4, E5, E6, E7, E9 (partial)

**Stories:** 1.1–1.5, 2.1–2.4, 3.1–3.3, 4.1–4.4, 5.1–5.5, 6.1–6.4, 7.1–7.5, 9.1–9.2

**Key Deliverables:**
- Verification tests passing for authentication, RBAC, institutions, students, credentials, verification, audit
- Admin bootstrap CLI implemented and tested
- Admin recovery workflow documented
- Production blockers #1 (bootstrap) resolved

**Exit Criteria:**
- All VERIFY stories have passing tests
- 9.1 and 9.2 implemented and integrated
- Existing database has super_admin account created via bootstrap
- No authentication/RBAC defects blocking production

**Estimated Duration:** 2 weeks (8–10 verification stories + 2 implementation stories)

---

### Stage 29: Student Management & Credential Completion (Phase 2, 5–7 of Completion Audit)

**Objective:** Complete student update workflows; enable direct PDF download; verify credential lifecycle end-to-end.

**Epics:** E3, E4, E9 (partial)

**Stories:** 3.4–3.6, 4.5, 9.3

**Key Deliverables:**
- Student update backend and frontend implemented
- Student selectors in credential workflow
- Direct PDF download authorization and delivery working
- Credential lifecycle end-to-end tests passing
- Production blocker #5 (student/credential workflows) resolved

**Exit Criteria:**
- Story 3.4–3.5 implemented and tested
- Story 4.5 implemented and tested
- Credential creation → issuance → download works end-to-end
- No data leakage in download authorization

**Estimated Duration:** 2 weeks (5 stories, mix of backend and frontend)

---

### Stage 30: Production Authentication & Password Recovery (Phase 3–4 of Completion Audit)

**Objective:** Implement HttpOnly cookies, CSRF protection, and password recovery workflow.

**Epics:** E10, E11

**Stories:** 10.1–10.4, 11.1–11.4

**Key Deliverables:**
- HttpOnly cookie authentication fully implemented
- CSRF protection integrated and tested
- Forgot-password and reset-password flows working
- Mail adapter integrated with test mode
- Frontend password recovery pages implemented
- Production blockers #3 (authentication) and #4 (password recovery) resolved

**Exit Criteria:**
- Bearer token authentication removed from production paths
- Cookie authentication works in dev and production (with Secure/SameSite flags)
- CSRF tokens validated on all mutating requests
- Password reset emails sent successfully
- Forced password-change workflow tested

**Estimated Duration:** 2 weeks (8 stories, backend + frontend + integration)

---

### Stage 31: Frontend Optimization & Security (Phase 8–9 of Completion Audit)

**Objective:** Code split frontend, optimize bundle, audit dependencies, scan containers, validate security headers.

**Epics:** E12, E15 (partial)

**Stories:** 12.1–12.5, 15.2–15.4

**Key Deliverables:**
- Route-level code splitting implemented
- Bundle size analysis passing thresholds
- Fresh dependency audit completed
- Container security scanning implemented
- SBOM generated
- Production blockers #5 (performance/security) partially resolved

**Exit Criteria:**
- Initial chunk < 500 KB (gzipped < 150 KB)
- Dependency audit report in DEPENDENCY_SECURITY_REPORT.md
- No critical vulnerabilities without mitigation plan
- Image scanning passing and integrated into CI
- SBOM generated and stored with release artifacts

**Estimated Duration:** 2 weeks (8 stories, includes audits and CI integration)

---

### Stage 32: Accessibility & Load Testing (Phase 10–11 of Completion Audit)

**Objective:** Complete WCAG 2.2 AA audit, implement visual regression tests, design and execute load tests.

**Epics:** E13, E14

**Stories:** 13.1–13.4, 14.1–14.4

**Key Deliverables:**
- WCAG 2.2 AA audit completed with defects documented
- Accessibility defects remediated
- Visual regression baseline established
- Visual regression test suite implemented
- Load test scenarios designed
- Load tests executed repeatably
- Performance thresholds defined and validated
- Production blocker #5 (accessibility/performance) resolved

**Exit Criteria:**
- WCAG manual audit completed (documented in WCAG_MANUAL_REVIEW.md)
- axe-core tests passing
- Accessibility defects BLOCKER/HIGH remediated
- Visual baseline approved and version-controlled
- Load test scenarios covering all major workflows
- Performance thresholds met (p95 < 600ms, error rate < 0.1%)

**Estimated Duration:** 3 weeks (8 stories, includes testing and optimization)

---

### Stage 33: Docker & CI/CD Validation (Phase 12 of Completion Audit)

**Objective:** Validate Docker runtime, GitHub Actions workflows, implement image scanning.

**Epics:** E15

**Stories:** 15.1–15.4

**Key Deliverables:**
- Docker runtime validation on staging environment
- GitHub Actions workflows running successfully
- Image scanning integrated and passing
- SBOM generation validated
- All CI jobs green on main branch
- Production blocker #5 (Docker/CI validation) resolved

**Exit Criteria:**
- `npm run docker:up` completes successfully
- All services healthy (PostgreSQL, Hardhat, backend, frontend)
- GitHub Actions workflows passing on PR and release
- Image scanning detecting vulnerabilities
- SBOM artifacts created and documented

**Estimated Duration:** 2 weeks (5 stories, includes infrastructure/CI validation and debugging)

---

### Stage 34: Staging Configuration & Final Readiness (Phase 13, Preparation for 14–20)

**Objective:** Prepare staging environment configuration, document infrastructure, establish readiness for operator handoff.

**Epics:** E16, E8 (validation)

**Stories:** 16.1–16.3, 8.1–8.5 (revalidation)

**Key Deliverables:**
- `.env.staging.example` with all placeholders
- STAGING_DEPLOYMENT.md with step-by-step instructions
- INFRASTRUCTURE_DOCUMENTATION.md with architecture and compliance
- Backup and restore procedures validated
- Blockchain reconciliation procedures documented
- All Stages 28–33 production blockers resolved
- Final readiness audit completed

**Exit Criteria:**
- Staging environment configuration documented with placeholders only
- All infrastructure components documented
- Operator can follow STAGING_DEPLOYMENT.md to provision new environment
- Backup/restore tested end-to-end
- Final System Readiness Report generated

**Estimated Duration:** 2 weeks (3 stories, includes documentation and final validation)

**Next Phase (Phases 14–20):** Actual staging deployment, UAT, and production go-live (not covered by Stages 28–34)

---

## Epic Details

## Epic 1: User Authentication & Authorization

**Purpose:** Verify that secure authentication using JWT and cookies works correctly with role- and institution-based access control enforcement.

**Governance:** FR-1, AD-1, AD-5

### Story 1.1: Verify JWT Authentication with Session Management

As a **system operator**, I want to confirm that **JWT authentication with token expiry, issuer/audience validation, and algorithm enforcement works correctly**, so that **session security and token integrity are proven**.

**Status:** VERIFY (code exists in backend/controllers/authController.js, backend/middleware/)

**Acceptance Criteria:**
- Given a valid user account exists in the database
- When the user submits credentials to `/api/auth/login`
- Then a JWT token is issued containing user ID, role, institution ID, and token version
- And token validation includes HS256 algorithm check, issuer verification, audience verification, and expiry check
- And protected routes reject tokens with invalid algorithm, issuer, audience, or expiry
- And logout clears the token but does not affect issued tokens (current baseline)
- And audit event is recorded for login success and failure

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (token integrity)
- AD-1: Institutional authority is trust boundary
- AD-5: Environment safety is runtime contract

**Test Coverage:**
- Run: `npm run test:users` and `npm run test:security`
- Verify: `backend/tests/` authentication test suites

**Dependencies:** None

**Evidence Required:**
- Login/logout test results
- Token validation test results
- Audit event recording test results
- Auth middleware validation test results

---

### Story 1.2: Verify Role-Based Access Control Enforcement

As a **backend developer**, I want to confirm that **role-based access control (RBAC) rejects unauthorized operations at the route and controller level**, so that **privilege escalation is prevented**.

**Status:** VERIFY (code exists in backend/middleware/, backend/routes/)

**Acceptance Criteria:**
- Given four roles exist: `super_admin`, `institution_admin`, `issuer`, `verifier`
- When a user with `verifier` role attempts to create a user, institution, or credential
- Then the request is rejected with 403 Forbidden
- And when a user with `institution_admin` role attempts a super_admin operation
- Then the request is rejected with 403 Forbidden
- And each route enforces role requirements at the middleware layer before business logic
- And audit events record authorization failures

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- FR-2: Institution management
- NFR-1: Security (role boundaries enforced)
- AD-1: Institutional authority is trust boundary

**Test Coverage:**
- Run: `npm run test:users` and `npm run test:security`
- Verify: Role-specific route rejection tests

**Dependencies:** Story 1.1

**Evidence Required:**
- RBAC enforcement test results for each role
- Route-level authorization test results
- Audit event recording for failed authorization

---

### Story 1.3: Verify Institution Scope Enforcement

As a **backend developer**, I want to confirm that **protected operations verify the current user's institution scope and reject cross-institution access**, so that **institutional data isolation is enforced**.

**Status:** VERIFY (code exists in backend/middleware/, controllers/)

**Acceptance Criteria:**
- Given two institutions exist with separate user bases
- When User A (from Institution 1) attempts to read/modify Institution 2 data
- Then the request is rejected with 403 Forbidden
- And no data from Institution 2 is returned
- And institution ID is extracted from the current JWT token and verified on every protected operation
- And audit events record cross-institution access attempts

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- FR-2: Institution management
- AD-1: Institutional authority is trust boundary (LOAD-BEARING)

**Test Coverage:**
- Run: `npm run test:users` and `npm run test:security`
- Verify: Cross-institution access rejection tests

**Dependencies:** Story 1.1, Story 1.2

**Evidence Required:**
- Cross-institution access rejection test results
- Institution scope verification test results
- Audit event recording for cross-institution attempts

---

### Story 1.4: Verify Token Version Invalidation on Sensitive Changes

As a **security engineer**, I want to confirm that **token versions increment on sensitive user changes and stale tokens are rejected**, so that **forced logout on role/password changes is enforced**.

**Status:** VERIFY (code exists in backend/models/userModel.js, backend/middleware/)

**Acceptance Criteria:**
- Given a user with an active JWT token exists
- When the user's password is changed or role is changed
- Then the token_version in the database increments
- And the JWT contains the previous token_version
- When the next request includes the stale token
- Then the request is rejected with 401 Unauthorized
- And the user must re-authenticate

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (forced logout on sensitive changes)
- AD-5: Environment safety is runtime contract

**Test Coverage:**
- Run: `npm run test:users`
- Verify: Token version invalidation tests

**Dependencies:** Story 1.1, Story 1.3

**Evidence Required:**
- Token version increment test results on password/role change
- Stale token rejection test results
- Forced logout validation

---

### Story 1.5: Verify Account Inactivity Timeout

As a **security engineer**, I want to confirm that **accounts are locked after N failed login attempts and temporarily disabled**, so that **brute-force attacks are mitigated**.

**Status:** VERIFY (code exists in backend/controllers/authController.js)

**Acceptance Criteria:**
- Given a user account exists
- When the user makes 5 consecutive failed login attempts within a time window
- Then the account is temporarily locked for a configurable lockout duration
- And the next login attempt (even with correct password) is rejected with 429 Too Many Requests
- And after the lockout duration expires, login becomes available again
- And audit events record lockout and unlock
- And a different user account is not affected by another user's lockout

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (brute-force mitigation)

**Test Coverage:**
- Run: `npm run test:security`
- Verify: Failed login attempt tracking and lockout tests

**Dependencies:** Story 1.1

**Evidence Required:**
- Failed login tracking test results
- Temporary lockout enforcement test results
- Audit event recording for lockout/unlock

---

## Epic 2: Institution Lifecycle Management

**Purpose:** Verify that institutions can be created, activated, deactivated, and managed with proper role-based governance.

**Governance:** FR-2, AD-1

### Story 2.1: Verify Institution Creation and Activation

As a **super administrator**, I want to confirm that **institutions can be created via API and activated for operational use**, so that **new institutional members can be onboarded**.

**Status:** VERIFY (code exists in backend/routes/institutionRoutes.js, backend/controllers/institutionController.js)

**Acceptance Criteria:**
- Given a super administrator is authenticated
- When the administrator POSTs to `/api/institutions` with valid institution data
- Then a new institution record is created in the database
- And the institution defaults to inactive status
- When the administrator calls the activation endpoint
- Then the institution status changes to active
- And inactive institutions are hidden from standard listing queries
- And institution creation audit events are recorded

**Relevant FR/NFR/AD:**
- FR-2: Institution management
- AD-1: Institutional authority is trust boundary

**Test Coverage:**
- Run: `npm run test:users`
- Verify: Institution CRUD test suites

**Dependencies:** Story 1.1, Story 1.2

**Evidence Required:**
- Institution creation test results
- Institution activation test results
- Audit event recording for institution lifecycle

---

### Story 2.2: Verify Institution Status Management

As a **super administrator**, I want to confirm that **institution status can be toggled (active/inactive/deactivated) and cascading effects are correct**, so that **administrative controls remain effective**.

**Status:** VERIFY (code exists in backend/controllers/institutionController.js)

**Acceptance Criteria:**
- Given an active institution with associated users and credentials exists
- When an administrator deactivates the institution
- Then the institution status changes to inactive
- And all institution-scoped users are prevented from authenticating
- And audit events record the status change and reason
- When the institution is reactivated
- Then users can authenticate again if their individual accounts are active
- And no data is lost during deactivation/reactivation

**Relevant FR/NFR/AD:**
- FR-2: Institution management
- AD-1: Institutional authority is trust boundary

**Test Coverage:**
- Run: `npm run test:users`
- Verify: Institution status lifecycle tests

**Dependencies:** Story 2.1

**Evidence Required:**
- Institution deactivation test results
- User authentication lockout verification
- Institution reactivation test results

---

### Story 2.3: Verify Institution Wallet Authorization

As a **institution administrator**, I want to confirm that **institutions can authorize wallet addresses for blockchain operations**, so that **credential issuance proof is anchored to the correct issuer**.

**Status:** VERIFY (code exists in backend/models/, backend/routes/)

**Acceptance Criteria:**
- Given an institution is active and has an administrator
- When the administrator registers a wallet address (Ethereum-format)
- Then the address is validated and stored in the database
- And credentials issued by this institution use this address as the issuer on-chain
- And only authorized administrators can change the wallet address
- And audit events record wallet address changes

**Relevant FR/NFR/AD:**
- FR-2: Institution management
- AD-1: Institutional authority is trust boundary
- AD-4: Evidence is proof-bearing, not document-bearing

**Test Coverage:**
- Run: `npm run test:contract` and integration tests
- Verify: Wallet authorization and blockchain integration tests

**Dependencies:** Story 2.1, Story 1.1

**Evidence Required:**
- Wallet address validation test results
- Blockchain issuance proof with correct issuer address
- Audit event recording for wallet changes

---

### Story 2.4: Add Validated Institution Selector in UI

As a **frontend developer**, I want to implement **validated institution selectors in user-creation and credential workflows**, so that **users can only select from active, authorized institutions**.

**Status:** NEW IMPLEMENTATION (UI needs validation list component)

**Acceptance Criteria:**
- Given the institution management or credential-creation page loads
- When a user-creation or institution-assignment dropdown is rendered
- Then only active institutions are listed
- And the selector validates the institution ID exists and is active before submission
- And the frontend prevents submission with an invalid/deactivated institution
- And error messages guide the user to select a valid institution

**Relevant FR/NFR/AD:**
- FR-2: Institution management
- AD-1: Institutional authority is trust boundary

**Test Coverage:**
- Run: `npm run frontend:test`
- Verify: Frontend selector component tests

**Dependencies:** Story 2.1, Story 2.2

**Evidence Required:**
- Selector component test results
- Institution list API integration test results
- UI validation test results

---

## Epic 3: Student Record Management

**Purpose:** Verify that students can be created, listed, and updated within institutional scope; complete missing update/edit workflows.

**Governance:** FR-3, AD-1

### Story 3.1: Verify Student Creation with Institution Scope

As a **issuer**, I want to confirm that **students can be created only within my institution**, so that **student records remain properly scoped**.

**Status:** VERIFY (code exists in backend/routes/studentRoutes.js, backend/controllers/studentController.js)

**Acceptance Criteria:**
- Given an issuer is authenticated and belongs to Institution A
- When the issuer POSTs to `/api/students` with valid student data
- Then a new student record is created
- And the student is automatically associated with the issuer's institution
- And the issuer cannot create students in Institution B
- And student creation audit events are recorded

**Relevant FR/NFR/AD:**
- FR-3: Student management
- AD-1: Institutional authority is trust boundary

**Test Coverage:**
- Run: `npm run test:users`
- Verify: Student CRUD test suites

**Dependencies:** Story 2.1, Story 1.1

**Evidence Required:**
- Student creation test results
- Institution scope enforcement test results
- Audit event recording verification

---

### Story 3.2: Verify Student Listing with Search and Pagination

As a **issuer**, I want to confirm that **students can be listed, searched, and paginated safely within my institution**, so that **large student datasets remain manageable**.

**Status:** VERIFY (code exists in backend/controllers/studentController.js)

**Acceptance Criteria:**
- Given an issuer belongs to Institution A with 50+ students
- When the issuer queries `/api/students?search=name&limit=10&offset=0`
- Then only students from Institution A are returned
- And search filters work on name, ID, email fields
- And results are limited and paginated correctly
- And students from Institution B are never returned
- And audit events record list/search operations (optional)

**Relevant FR/NFR/AD:**
- FR-3: Student management
- NFR-4: Performance and observability (pagination, bounded queries)
- AD-1: Institutional authority is trust boundary

**Test Coverage:**
- Run: `npm run test:pagination`
- Verify: Student listing, search, pagination tests

**Dependencies:** Story 3.1

**Evidence Required:**
- Pagination test results
- Search functionality test results
- Institution scope verification in list results

---

### Story 3.3: Verify Student Detail View

As a **issuer**, I want to confirm that **student detail records can be fetched safely**, so that **student information is accessible for credential issuance**.

**Status:** VERIFY (code exists in backend/controllers/studentController.js)

**Acceptance Criteria:**
- Given an issuer belongs to Institution A
- When the issuer GETs `/api/students/{studentId}` where the student belongs to Institution A
- Then the full student record is returned
- And when the issuer attempts to GET a student from Institution B
- Then 403 Forbidden is returned
- And no information about Institution B students is leaked

**Relevant FR/NFR/AD:**
- FR-3: Student management
- AD-1: Institutional authority is trust boundary

**Test Coverage:**
- Run: `npm run test:users`
- Verify: Student detail access control tests

**Dependencies:** Story 3.1

**Evidence Required:**
- Student detail access test results
- Cross-institution access rejection verification

---

### Story 3.4: Implement Student Record Update/Edit Backend

As a **issuer**, I want to **edit student records (name, contact, etc.) with validation and audit trail**, so that **student information can be corrected and updated**.

**Status:** PARTIALLY IMPLEMENTED (database schema exists; backend route/controller not implemented)

**Blocked by:** Production blocker #5 from completion audit

**Acceptance Criteria:**
- Given an issuer owns a student record
- When the issuer PATCHes `/api/students/{studentId}` with updated fields (name, email, etc.)
- Then the record is updated in the database with validation applied
- And only the owning issuer (or institution_admin/super_admin) can update the record
- And email/identity fields trigger a re-verification workflow if changed
- And an audit event records the update with before/after values
- And the update fails safely if validation constraints are violated

**Relevant FR/NFR/AD:**
- FR-3: Student management
- NFR-1: Security (authorization)
- NFR-3: Maintainability (audit trail)
- AD-1: Institutional authority is trust boundary

**Implementation Path:**
1. Create `backend/routes/studentRoutes.js` PATCH endpoint (if missing)
2. Create `backend/controllers/studentController.js` updateStudent() method
3. Create `backend/validators/studentValidator.js` for update schema
4. Add audit event logging to student updates
5. Write tests: `backend/tests/student-update.test.js`

**Test Coverage:**
- Unit tests for update validation
- Integration tests for authorization checks
- Audit event recording tests
- Email re-verification workflow tests

**Dependencies:** Story 3.1, Story 3.3, Story 1.1

**Evidence Required:**
- Backend route implementation
- Controller update logic implementation
- Validation schema implementation
- Unit and integration test results
- Audit event recording verification

**Story Size:** Medium (3-4 hours development + testing)

---

### Story 3.5: Implement Student Record Update/Edit Frontend

As a **institutional administrator**, I want to **edit student records through the web UI**, so that **administrative corrections are user-friendly**.

**Status:** NOT IMPLEMENTED

**Blocked by:** Production blocker #5 from completion audit

**Acceptance Criteria:**
- Given a student detail page exists in the frontend
- When an administrator clicks an edit button
- Then an edit form is displayed with current student fields
- And the form submits changes to the backend PATCH endpoint (Story 3.4)
- And validation errors are displayed to the user
- And successful updates show a confirmation message
- And only authorized users (issuer, institution_admin, super_admin) see the edit button

**Relevant FR/NFR/AD:**
- FR-3: Student management
- NFR-1: Security (authorization at UI layer)

**Implementation Path:**
1. Create or update student detail page component
2. Add edit form with validation (using React Hook Form)
3. Connect form to PATCH `/api/students/{studentId}` endpoint
4. Add error handling and user feedback
5. Add role-based edit button visibility
6. Write component tests

**Test Coverage:**
- Component render tests
- Form submission tests
- Error handling tests
- Role-based visibility tests
- Backend integration tests

**Dependencies:** Story 3.4, Story 1.1

**Evidence Required:**
- Frontend component implementation
- Form validation tests
- Backend integration test results
- Role-based access UI tests

**Story Size:** Medium (2-3 hours frontend development + testing)

---

### Story 3.6: Add Validated Student Selector in Credential Workflows

As a **issuer**, I want to **select students from a validated dropdown when creating credentials**, so that **credential assignment is error-free**.

**Status:** NEW IMPLEMENTATION (likely needs selector component)

**Acceptance Criteria:**
- Given the credential-creation page loads
- When an issuer clicks a student-selection dropdown
- Then a list of students from their institution is fetched
- And the student name, ID, and email are displayed for selection
- And the selector validates the student exists and belongs to the current institution
- And the form prevents submission with an invalid student selection
- And the frontend shows a "create student" link if no matching student is found

**Relevant FR/NFR/AD:**
- FR-3: Student management
- FR-4: Credential lifecycle
- AD-1: Institutional authority is trust boundary

**Test Coverage:**
- Component tests for student selector
- API integration tests for student listing
- Form validation tests

**Dependencies:** Story 3.1, Story 3.2

**Evidence Required:**
- Selector component implementation
- Student list API integration tests
- Form validation test results

**Story Size:** Small (1-2 hours frontend)

---

## Epic 4: Credential Issuance Lifecycle

**Purpose:** Verify credential creation, processing, and blockchain proofing; complete missing direct PDF download functionality.

**Governance:** FR-4, AD-3, AD-4

### Story 4.1: Verify PDF Upload and Validation

As a **issuer**, I want to confirm that **PDF uploads are validated for file type, size, and integrity**, so that **malicious or corrupted files are rejected**.

**Status:** VERIFY (code exists in backend/controllers/credentialController.js, backend/validators/)

**Acceptance Criteria:**
- Given an issuer submits a PDF file with a credential creation request
- When the file is validated
- Then the file type is checked (must be PDF)
- And the file size is checked against `MAX_CERTIFICATE_SIZE_MB`
- And the file is not executed or parsed for embedded scripts
- And non-PDF files are rejected with 400 Bad Request
- And oversized files are rejected with 413 Payload Too Large
- And audit events record file upload validation results

**Relevant FR/NFR/AD:**
- FR-4: Credential lifecycle
- NFR-1: Security (file validation)
- AD-4: Evidence is proof-bearing, not document-bearing

**Test Coverage:**
- Run: `npm run test:validation` and file upload tests
- Verify: PDF validation test suites

**Dependencies:** Story 3.1, Story 1.1

**Evidence Required:**
- PDF validation test results
- File type/size rejection test results
- Audit event recording verification

---

### Story 4.2: Verify Document Hashing and IPFS Pinning

As a **blockchain engineer**, I want to confirm that **PDFs are hashed (SHA-256) and pinned to IPFS correctly**, so that **document evidence is immutable**.

**Status:** VERIFY (code exists in backend/services/ipfsService.js, backend/controllers/credentialController.js)

**Acceptance Criteria:**
- Given a valid PDF is uploaded
- When the credential is processed
- Then the PDF is hashed using SHA-256
- And the hash is stored in the database
- And the PDF is pinned to IPFS (or Pinata) with a valid CID
- And the CID is stored in the credential record
- When a credential is verified later
- Then the stored hash matches the IPFS-retrieved file
- And IPFS pinning failures result in credential staying in `pending` status

**Relevant FR/NFR/AD:**
- FR-4: Credential lifecycle
- NFR-2: Reliability (IPFS unavailability handling)
- AD-3: PostgreSQL is source of truth
- AD-4: Evidence is proof-bearing (hash + IPFS, not full payload)

**Test Coverage:**
- Run: `npm run test:ipfs`
- Verify: IPFS pinning, hashing, and retrieval tests

**Dependencies:** Story 4.1, Story 3.1

**Evidence Required:**
- IPFS pinning test results
- Hash calculation and verification test results
- Credential status management during IPFS processing

---

### Story 4.3: Verify Blockchain Proof Issuance

As a **blockchain engineer**, I want to confirm that **credentials are issued on the blockchain registry with correct issuer, hash, and timestamp**, so that **blockchain proof is immutable and verifiable**.

**Status:** VERIFY (code exists in backend/services/blockchainService.js, contracts/CredentialRegistry.sol)

**Acceptance Criteria:**
- Given a credential has been hashed and pinned to IPFS
- When the credential issuance is submitted to the blockchain
- Then a transaction is sent to `CredentialRegistry.issueCredential(bytes32 credentialHash)`
- And the transaction includes the institution's authorized wallet address as issuer
- And the transaction includes the SHA-256 hash of the PDF
- And the transaction is confirmed on-chain
- When the transaction confirms
- Then the credential record is updated to `active` status
- And the blockchain transaction hash is stored in the database
- And an audit event records the successful blockchain confirmation

**Relevant FR/NFR/AD:**
- FR-4: Credential lifecycle
- NFR-2: Reliability (blockchain unavailability handling)
- AD-3: PostgreSQL is source of truth (chain confirms, DB is ledger)
- AD-4: Evidence is proof-bearing (chain stores digest)

**Test Coverage:**
- Run: `npm run test:contract` and `npm run test:blockchain`
- Verify: Blockchain integration and transaction confirmation tests

**Dependencies:** Story 4.2, Story 2.3

**Evidence Required:**
- Blockchain transaction test results
- Credential status transition to `active` verification
- Transaction confirmation handling tests

---

### Story 4.4: Verify Credential Status Lifecycle

As a **issuer**, I want to confirm that **credentials progress through states correctly (pending → active → revoked) with proper validation**, so that **lifecycle consistency is maintained**.

**Status:** VERIFY (code exists in backend/models/credentialModel.js, controllers/)

**Acceptance Criteria:**
- Given a credential is created
- Then it starts in `pending` status
- When IPFS pinning completes and blockchain confirmation succeeds
- Then status transitions to `active`
- When a credential is revoked
- Then status transitions to `revoked`
- And transitions are recorded with timestamps and audit events
- And invalid transitions (e.g., revoked → active) are rejected

**Relevant FR/NFR/AD:**
- FR-4: Credential lifecycle
- FR-5: Verification (revocation detection)
- NFR-3: Maintainability (state machine clarity)
- AD-3: PostgreSQL is source of truth

**Test Coverage:**
- Run: `npm run test:credentials` (if exists)
- Verify: Credential status lifecycle tests

**Dependencies:** Story 4.1, Story 4.2, Story 4.3

**Evidence Required:**
- Status transition test results for each valid path
- Invalid transition rejection tests
- Audit event recording for all transitions

---

### Story 4.5: Implement Direct Authorized PDF Download

As a **verifier**, I want to **download the original PDF credential directly from the platform**, so that **I can inspect the document without using external IPFS gateways**.

**Status:** NOT IMPLEMENTED (generation returns metadata only)

**Blocked by:** Production blocker #5 from completion audit

**Acceptance Criteria:**
- Given a credential has been issued and is active
- When a verifier with permission calls `/api/credentials/{credentialId}/download`
- Then the original PDF is retrieved from IPFS
- And it is served to the browser with `Content-Disposition: attachment`
- And the PDF is not cached in the browser (Cache-Control: no-store)
- And authorization is checked: only the issuer, institution_admin, super_admin, or the verifier (if public link) can download
- And audit events record download requests
- And the hash is verified against the stored hash before serving

**Relevant FR/NFR/AD:**
- FR-4: Credential lifecycle
- NFR-1: Security (authorization)
- NFR-2: Reliability (hash verification before download)
- AD-2: Public verification is intentionally narrow
- AD-4: Evidence is proof-bearing

**Implementation Path:**
1. Create `/api/credentials/{credentialId}/download` backend route
2. Implement authorization checks
3. Retrieve PDF from IPFS using stored CID
4. Verify hash matches stored hash
5. Serve with appropriate Content-Type and headers
6. Record audit event
7. Write integration tests

**Test Coverage:**
- Authorization tests (issuer, admin, verifier roles)
- Hash verification tests
- IPFS retrieval tests
- Response header tests (Content-Disposition, Cache-Control)
- Audit event recording tests

**Dependencies:** Story 4.2, Story 4.3, Story 1.1

**Evidence Required:**
- Backend route implementation
- Authorization enforcement tests
- IPFS hash verification tests
- Test results for all role scenarios
- Audit event recording verification

**Story Size:** Medium (3-4 hours development + testing)

---

## Epic 5: Credential Revocation & Verification

**Purpose:** Verify credential verification by multiple methods with consistency checks between database and blockchain.

**Governance:** FR-5, AD-2, AD-3

### Story 5.1: Verify Verification by Hash

As a **verifier**, I want to confirm that **credentials can be verified by uploading the original PDF**, so that **anyone with a credential copy can verify it**.

**Status:** VERIFY (code exists in backend/routes/verificationRoutes.js, backend/services/)

**Acceptance Criteria:**
- Given a credential has been issued and is active
- When a verifier uploads a PDF to `/api/verify/by-hash`
- Then the platform hashes the uploaded PDF using SHA-256
- And searches the database for a credential with the matching hash
- And returns the credential verification status (active/revoked/not found)
- And no personal information is exposed in the result

**Relevant FR/NFR/AD:**
- FR-5: Verification
- AD-2: Public verification is intentionally narrow (no personal data)
- AD-4: Evidence is proof-bearing (hash-based verification)

**Test Coverage:**
- Run: `npm run test:verification` (if exists)
- Verify: Hash-based verification tests

**Dependencies:** Story 4.2

**Evidence Required:**
- Hash-based verification test results
- Personal data filtering verification
- Revocation status accuracy tests

---

### Story 5.2: Verify Verification by Credential ID

As a **verifier**, I want to confirm that **credentials can be verified using a credential ID**, so that **verifiers can check a specific credential without the PDF**.

**Status:** VERIFY (code exists in backend/routes/verificationRoutes.js)

**Acceptance Criteria:**
- Given a credential has been issued
- When a verifier queries `/api/verify/by-id?credentialId=xxx`
- Then the database is checked for the credential
- And the credential status (active/revoked/not found) is returned
- And no personal information is exposed
- And the issuer institution and issuer name are disclosed (trust anchor)

**Relevant FR/NFR/AD:**
- FR-5: Verification
- AD-2: Public verification is intentionally narrow
- AD-3: PostgreSQL is source of truth

**Test Coverage:**
- Run: `npm run test:verification` (if exists)
- Verify: ID-based verification tests

**Dependencies:** Story 4.3

**Evidence Required:**
- ID-based verification test results
- Personal data filtering verification
- Public trust information accuracy tests

---

### Story 5.3: Verify Verification by Public Token

As a **verifier**, I want to confirm that **credentials can be verified using a public shareable token**, so that **issuers can share verification links with verifiers**.

**Status:** VERIFY (code exists in backend/controllers/credentialController.js; public token generation)

**Acceptance Criteria:**
- Given a credential has been issued
- When the issuer generates a public verification token
- Then a time-limited, secure token is created
- And the issuer can share this token with external verifiers
- When a verifier uses the token at `/api/verify/by-token?token=xxx`
- Then the credential verification is returned
- And the verifier can verify the credential without authentication
- And token expiry is enforced (e.g., 90 days)

**Relevant FR/NFR/AD:**
- FR-5: Verification
- AD-2: Public verification is intentionally narrow

**Test Coverage:**
- Run: `npm run test:verification` (if exists)
- Verify: Token-based verification tests

**Dependencies:** Story 4.3

**Evidence Required:**
- Public token generation tests
- Token expiry enforcement tests
- Public verification by token tests
- Personal data filtering verification

---

### Story 5.4: Verify Revocation Workflow

As a **issuer**, I want to confirm that **credentials can be revoked and revocation is reflected immediately in verification results**, so that **invalid credentials are detected**.

**Status:** VERIFY (code exists in backend/controllers/credentialController.js, contracts/)

**Acceptance Criteria:**
- Given an active credential exists
- When an authorized issuer calls `/api/credentials/{credentialId}/revoke`
- Then a revocation request is submitted to the blockchain `revokeCredential(bytes32)`
- And the transaction is confirmed on-chain
- When the transaction confirms
- Then the credential database record is updated to `revoked` status
- And verification requests immediately return `revoked` status
- And audit events record the revocation with reason and timestamp

**Relevant FR/NFR/AD:**
- FR-5: Verification
- FR-4: Credential lifecycle
- AD-3: PostgreSQL is source of truth (blockchain confirms, DB is ledger)

**Test Coverage:**
- Run: `npm run test:contract` and `npm run test:credentials`
- Verify: Revocation workflow tests

**Dependencies:** Story 4.3, Story 5.1, Story 5.2, Story 5.3

**Evidence Required:**
- Blockchain revocation transaction tests
- Database status update verification
- Immediate revocation status reflection in verification
- Audit event recording tests

---

### Story 5.5: Verify Consistency Checks: DB vs Blockchain

As a **security engineer**, I want to confirm that **verification results are consistent between database and blockchain state**, so that **verification integrity is maintained**.

**Status:** VERIFY (code exists in backend/services/verificationService.js; blockchain reconciliation)

**Acceptance Criteria:**
- Given a credential is verified
- When the verification service queries both database and blockchain
- Then the status (active/revoked/not found) matches in both sources
- And if discrepancies are detected (DB active but chain revoked, or vice versa)
- Then an alert is generated and an audit event records the mismatch
- And the verification result uses the blockchain state as the source of truth
- And the database is reconciled to match the blockchain

**Relevant FR/NFR/AD:**
- FR-5: Verification
- NFR-2: Reliability (state consistency)
- AD-3: PostgreSQL is source of truth (operational, but blockchain is trust anchor)

**Test Coverage:**
- Run: `npm run test:verification` and blockchain reconciliation tests
- Verify: Consistency checking and reconciliation tests

**Dependencies:** Story 5.1, Story 5.2, Story 5.3, Story 5.4

**Evidence Required:**
- Consistency checking logic tests
- Reconciliation workflow tests
- Alert generation on mismatch
- Audit event recording for reconciliations

---

## Epic 6: Public Verification Interface

**Purpose:** Verify that public verification is narrow, read-only, and does not expose institutional data.

**Governance:** FR-5, AD-2

### Story 6.1: Verify Public Verification Routes

As a **external verifier**, I want to confirm that **public verification routes exist and do not require authentication**, so that **anyone can verify credentials**.

**Status:** VERIFY (code exists in backend/routes/verificationRoutes.js)

**Acceptance Criteria:**
- Given a credential has been issued
- When an unauthenticated user accesses `/api/verify/*` endpoints
- Then the endpoint is accessible without JWT authentication
- And only verification-specific data is returned (status, issuer, timestamp)
- And no personal information about the student, issuer password, or institution secrets is returned
- And rate limiting is applied to prevent abuse

**Relevant FR/NFR/AD:**
- FR-5: Verification
- AD-2: Public verification is intentionally narrow (LOAD-BEARING)
- AD-1: Institutional authority is trust boundary (separation)

**Test Coverage:**
- Run: `npm run test:verification` (if exists)
- Verify: Public endpoint access tests

**Dependencies:** None (public routes)

**Evidence Required:**
- Public endpoint access tests (no authentication required)
- Rate limiting verification
- Response data filtering tests

---

### Story 6.2: Verify QR Code Generation and Resolution

As a **issuer**, I want to confirm that **QR codes can be generated for credentials and resolved by public verifiers**, so that **mobile/quick verification is enabled**.

**Status:** VERIFY (code exists in backend/controllers/credentialController.js, frontend/)

**Acceptance Criteria:**
- Given a credential has been issued
- When a QR code is generated for the credential
- Then the QR code encodes a public verification URL or token
- When a verifier scans the QR code with a mobile device
- Then the browser navigates to the verification page
- And the credential verification is performed automatically
- And the result is displayed in a mobile-friendly format

**Relevant FR/NFR/AD:**
- FR-5: Verification
- AD-2: Public verification is intentionally narrow

**Test Coverage:**
- Run: `npm run test:credentials` and QR tests
- Verify: QR generation and resolution tests

**Dependencies:** Story 4.3, Story 6.1

**Evidence Required:**
- QR code generation tests
- QR resolution tests
- Mobile verification flow tests

---

### Story 6.3: Verify Verification Result Display

As a **verifier**, I want to confirm that **verification results are displayed clearly and accurately**, so that **decision-making is informed**.

**Status:** VERIFY (code exists in frontend pages)

**Acceptance Criteria:**
- Given a verification is performed
- When the result page loads
- Then the result is clearly displayed (e.g., "VALID", "REVOKED", "NOT FOUND")
- And the issuer institution name and issuer name are displayed
- And the issuance date and revocation date (if applicable) are displayed
- And no personal information is visible
- And results remain visible and downloadable

**Relevant FR/NFR/AD:**
- FR-5: Verification
- AD-2: Public verification is intentionally narrow

**Test Coverage:**
- Run: `npm run frontend:test`
- Verify: Verification result component tests

**Dependencies:** Story 6.1

**Evidence Required:**
- Component render tests
- Result display accuracy tests
- Personal data filtering tests

---

### Story 6.4: Verify Public Verification Does Not Expose Institutional Data

As a **security engineer**, I want to confirm that **public verification never leaks institutional secrets or personal student data**, so that **privacy and institutional boundaries are maintained**.

**Status:** VERIFY (requires security audit of verification responses)

**Acceptance Criteria:**
- Given a public verification is performed
- When the response is generated
- Then the response contains only: credential status, issuer institution name, issuer name, issuance date, hash digest
- And the response does NOT contain: student email/phone/address, institution wallet address, institution admin contact, any secrets
- And API responses are validated against a schema
- And a security audit confirms no data leakage

**Relevant FR/NFR/AD:**
- FR-5: Verification
- NFR-1: Security (data minimization)
- AD-2: Public verification is intentionally narrow (LOAD-BEARING)

**Test Coverage:**
- Run: `npm run test:security` and verification response filtering tests
- Verify: Response data schema validation tests

**Dependencies:** Story 6.1, Story 6.2, Story 6.3

**Evidence Required:**
- Response schema validation tests
- Data leakage audit results
- Security test results for verification endpoints

---

## Epic 7: Audit Logging & Observability

**Purpose:** Verify that operational activity is recorded, dashboards work, and observability is complete.

**Governance:** FR-6, NFR-4, AD-6

### Story 7.1: Verify Audit Log Recording and Queries

As a **institution administrator**, I want to confirm that **all sensitive operations are recorded in audit logs**, so that **compliance and troubleshooting are supported**.

**Status:** VERIFY (code exists in backend/models/auditLogModel.js, backend/controllers/auditController.js)

**Acceptance Criteria:**
- Given protected operations occur (user login, credential issuance, role changes)
- When the operations complete
- Then an audit event is recorded with: timestamp, user ID, operation, resource, institution, result, sensitive keys redacted
- When an authorized user queries `/api/audit-logs`
- Then audit logs are returned with pagination and filtering
- And sensitive detail keys are recursively removed before return
- And only the requesting user's institution logs are visible (institution_admin sees institution logs, super_admin sees all)
- And log retention policy is enforced

**Relevant FR/NFR/AD:**
- FR-6: Audit and dashboarding
- NFR-1: Security (sensitive data minimization)
- NFR-3: Maintainability (audit trail)
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Run: `npm run test:audit`
- Verify: Audit log recording and query tests

**Dependencies:** Story 1.1, Story 1.2

**Evidence Required:**
- Audit event recording tests for all sensitive operations
- Log filtering and pagination tests
- Sensitive data redaction tests
- Authorization tests for audit log access

---

### Story 7.2: Verify Dashboard Analytics

As a **institutional administrator**, I want to confirm that **dashboards display accurate institutional and system metrics**, so that **operational visibility is provided**.

**Status:** VERIFY (code exists in backend/routes/dashboardRoutes.js, frontend pages)

**Acceptance Criteria:**
- Given a dashboard page is requested by an authenticated user
- When the dashboard loads
- Then it displays: credential count, verification count, user count, recent activity summary, trend charts
- And institution admins see only their institution metrics
- And super admins see system-wide metrics
- And data is accurate and updated regularly
- And queries are efficient and bounded

**Relevant FR/NFR/AD:**
- FR-6: Audit and dashboarding
- NFR-4: Performance and observability
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Run: `npm run test:dashboard`
- Verify: Dashboard metrics calculation and display tests

**Dependencies:** Story 7.1

**Evidence Required:**
- Dashboard component render tests
- Metrics accuracy tests
- Authorization tests (institution vs system-wide metrics)
- Query performance tests

---

### Story 7.3: Verify Health Endpoints

As a **platform operator**, I want to confirm that **health, readiness, and liveness endpoints report system status correctly**, so that **infrastructure monitoring is supported**.

**Status:** VERIFY (code exists in backend/routes/healthRoutes.js)

**Acceptance Criteria:**
- Given `/health` is called
- When the endpoint is accessed
- Then it returns 200 OK if the system is healthy
- And `/health/ready` returns 200 OK when the system is ready (dependencies available)
- And `/health/live` returns 200 OK when the system is running
- And responses include: database status, IPFS status, blockchain status
- And status probes are non-blocking and fast (< 1s)

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- NFR-2: Reliability (fail-safe behavior)
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Run: `npm run test:health`
- Verify: Health endpoint response tests

**Dependencies:** None (diagnostic endpoints)

**Evidence Required:**
- Health endpoint response tests
- Dependency status verification tests
- Response time tests

---

### Story 7.4: Verify Metrics Exposure

As a **platform operator**, I want to confirm that **Prometheus metrics are exposed on a protected endpoint**, so that **operational monitoring is enabled**.

**Status:** VERIFY (code exists in backend/middleware/metricsMiddleware.js)

**Acceptance Criteria:**
- Given `/metrics` endpoint is called
- When the request is authenticated (super_admin only in production)
- Then Prometheus-format metrics are returned
- And metrics include: request count by endpoint, response times, error rates, database connection pool status, IPFS upload/retrieve times
- And metrics are accurate and updated in real-time
- And the metrics endpoint is protected by authentication

**Relevant FR/NFR/AD:**
- FR-6: Audit and dashboarding
- FR-7: Deployment and operational reliability
- NFR-1: Security (endpoint protection)
- NFR-4: Performance and observability
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Run: `npm run test:metrics`
- Verify: Metrics generation and access control tests

**Dependencies:** Story 1.1, Story 1.2

**Evidence Required:**
- Metrics endpoint access control tests
- Metrics accuracy tests
- Prometheus format validation tests

---

### Story 7.5: Verify Structured Logging with Correlation IDs

As a **platform operator**, I want to confirm that **structured logs include correlation IDs for request tracing**, so that **troubleshooting and debugging are efficient**.

**Status:** VERIFY (code exists in backend/middleware/requestIdMiddleware.js, backend/utils/logger.js)

**Acceptance Criteria:**
- Given a request is received
- When the request is processed
- Then a correlation ID is generated or extracted from the request header
- And all logs for this request include the correlation ID
- And logs are structured JSON (not plain text)
- And sensitive values are redacted from logs
- And logs can be queried by correlation ID for complete request traces

**Relevant FR/NFR/AD:**
- FR-6: Audit and dashboarding
- FR-7: Deployment and operational reliability
- NFR-1: Security (sensitive data minimization)
- NFR-4: Performance and observability
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Run: `npm run test:observability`
- Verify: Correlation ID propagation and structured logging tests

**Dependencies:** Story 7.1

**Evidence Required:**
- Correlation ID generation and propagation tests
- Structured log format validation tests
- Sensitive data redaction tests
- Log query and tracing tests

---

## Epic 8: Deployment Safety & Recovery

**Purpose:** Verify environment validation, Docker orchestration, and recovery workflows.

**Governance:** FR-7, NFR-2, AD-5, AD-6

### Story 8.1: Verify Environment Validation and Fail-Closed Startup

As a **platform operator**, I want to confirm that **the application fails to start if staging/production environment requirements are not met**, so that **unsafe configurations are prevented**.

**Status:** VERIFY (code exists in backend/config/environment.js)

**Acceptance Criteria:**
- Given an unsafe production configuration (e.g., localhost database, insecure cookies)
- When the application starts
- Then the application fails with a clear error message
- And required environment variables are validated: DATABASE_URL or DB_HOST/PORT/USER/PASSWORD/NAME
- And JWT_SECRET length is validated (min 48 chars production, 24 dev)
- And production/staging blocking conditions are checked: localhost DB, test DB names, insecure cookies, weak secrets, default Hardhat keys
- And the application does not start until all validations pass

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- NFR-1: Security (configuration validation)
- NFR-2: Reliability (fail-closed)
- AD-5: Environment safety is runtime contract (LOAD-BEARING)

**Test Coverage:**
- Run: `npm run test:validation` and environment validation tests
- Verify: Startup validation for various unsafe configurations

**Dependencies:** None (startup-time check)

**Evidence Required:**
- Validation test results for each blocking condition
- Error message clarity tests
- Safe configuration startup tests

---

### Story 8.2: Verify Database Migration with Checksum Validation

As a **platform operator**, I want to confirm that **migrations are applied safely with checksum validation**, so that **partial migrations are rejected**.

**Status:** VERIFY (code exists in backend/database/runMigrations.js, schema_migrations table)

**Acceptance Criteria:**
- Given fresh database is initialized
- When `npm run migrate` is executed
- Then migrations are applied in order from `000_initial_schema.sql` through `006_*`
- And each migration records its name and SHA-256 checksum in `schema_migrations`
- And repeated migration runs apply nothing (idempotent)
- And if a migration file is modified, the checksum fails and the migration is rejected
- And the application fails to start if migrations are incomplete or checksums mismatch

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- NFR-2: Reliability (safe state transitions)
- NFR-3: Maintainability (versioned migrations)
- AD-5: Environment safety is runtime contract

**Test Coverage:**
- Run: `npm run test:migrations` (if exists) and integration tests
- Verify: Migration application, checksum validation, idempotency tests

**Dependencies:** None (migration-time check)

**Evidence Required:**
- Migration application tests
- Checksum validation tests
- Idempotency tests (rerun migrations)
- Failed checksum rejection tests

---

### Story 8.3: Verify Backup with Integrity Verification

As a **platform operator**, I want to confirm that **backups can be created and validated for integrity**, so that **disaster recovery is prepared**.

**Status:** VERIFY (code exists in backend/scripts/backup.js, backend/scripts/)

**Acceptance Criteria:**
- Given the application is running with data
- When `npm run docker:backup` is executed
- Then a PostgreSQL dump is created with `pg_dump`
- And the dump is verified for read ability (can be restored to test database)
- And file integrity is checked (size, timestamps)
- And backup metadata is recorded (date, size, database version)
- And backups are retained per policy

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- NFR-2: Reliability (backup integrity)
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Run: `npm run docker:backup` and backup verification tests
- Verify: Backup creation and integrity tests

**Dependencies:** None (operational task)

**Evidence Required:**
- Backup creation tests
- Integrity verification tests
- Backup metadata recording tests

---

### Story 8.4: Verify Restore-Test Workflow

As a **platform operator**, I want to confirm that **backups can be restored to a dedicated test database safely**, so that **recovery procedures are practiced**.

**Status:** VERIFY (code exists in backend/scripts/restore.js, skill_verification_restore_test database)

**Acceptance Criteria:**
- Given a backup file exists
- When `npm run docker:restore:test` is executed
- Then the backup is restored only to the hardcoded `skill_verification_restore_test` database
- And the application is NOT restored to production or development databases (fail-safe)
- And the restore completes successfully
- And the restored database can be queried (read-only checks)
- And restore operations are logged with timestamps and status

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- NFR-2: Reliability (fail-safe restore, guarded destructive operations)
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Run: `npm run test:recovery` and restore tests
- Verify: Restore workflow and target validation tests

**Dependencies:** Story 8.3

**Evidence Required:**
- Restore workflow tests
- Hardcoded test-database validation tests
- Production/dev database protection tests
- Restored database query tests

---

### Story 8.5: Verify Blockchain State Reconciliation

As a **platform operator**, I want to confirm that **blockchain state can be reconciled with database state if the chain is reset or stale**, so that **mismatched proofs are detected and corrected**.

**Status:** VERIFY (code exists in backend/scripts/blockchain-reconciliation.js or similar)

**Acceptance Criteria:**
- Given a local Hardhat blockchain is reset (new state, old block history gone)
- When the operator runs a reconciliation check
- Then the script queries the blockchain for the institutional contract state
- And compares it with database credential records
- And identifies missing or mismatched proofs
- And alerts are generated for discrepancies
- And procedures exist to correct database state or re-issue blockchain proofs

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- NFR-2: Reliability (state consistency)
- AD-3: PostgreSQL is source of truth (operational ledger)
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Run: reconciliation test suite with fresh Hardhat state
- Verify: Mismatch detection and alerting tests

**Dependencies:** Story 4.3, Story 5.5

**Evidence Required:**
- Reconciliation detection tests
- Mismatch alerting tests
- Database correction/re-proof procedures

---

## Epic 9: Admin Bootstrap & Recovery

**Purpose:** Implement secure first-admin bootstrap and administrator recovery workflows (Phase 1 of completion audit).

**Governance:** Production blocker #1, NFR-1

### Story 9.1: Implement Secure First-Super-Admin Bootstrap CLI

As a **system operator**, I want to **create the first super administrator account using a secure CLI command**, so that **there is a non-HTTP bootstrap path**.

**Status:** NOT IMPLEMENTED

**Production Blocker:** #1 from completion audit

**Acceptance Criteria:**
- Given the application is freshly deployed with an empty users table
- When an operator runs `npm run bootstrap:admin -- --email admin@institution.local --password-stdin`
- Then a super_admin account is created with the provided email
- And the password is read from stdin (not command-line argument)
- And the account is marked active and verified
- And the operation is logged with timestamp and operator hostname
- And the operation can only be run when the users table is empty (prevent accidental duplicate admins)
- And no output is printed containing passwords or secrets

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- FR-2: Institution management
- NFR-1: Security (secure secret handling)

**Implementation Path:**
1. Create `scripts/bootstrap-admin.js` with secure argument parsing
2. Read password from stdin using `prompt-sync` or similar
3. Create super_admin account with hashed password
4. Verify users table is empty before allowing bootstrap
5. Log operation to audit log
6. Add to `package.json` scripts
7. Write integration tests

**Test Coverage:**
- Bootstrap CLI execution tests
- Account creation verification
- Empty table prerequisite validation tests
- Secure password handling tests
- Logging tests

**Dependencies:** Story 1.1, Story 1.2

**Evidence Required:**
- CLI script implementation
- Account creation tests
- Password security tests
- Audit log entry verification

**Story Size:** Small-Medium (2-3 hours)

---

### Story 9.2: Implement Admin Password Recovery CLI

As a **system operator**, I want to **recover admin access by generating a password reset token via CLI**, so that **account lockout can be resolved without database access**.

**Status:** NOT IMPLEMENTED

**Production Blocker:** #1 from completion audit

**Acceptance Criteria:**
- Given an admin account is locked out or password is forgotten
- When an operator runs `npm run recover:admin -- --email admin@institution.local`
- Then a password reset token is generated and hashed in the database
- And the token is printed to stdout (single-use, long expiry like 24 hours)
- And the operator communicates this token securely to the admin (out-of-band)
- And the admin uses the token at `/api/auth/reset-password` to set a new password
- And the token becomes invalid after use or expiry
- And the recovery operation is logged

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (token-based recovery)

**Implementation Path:**
1. Create `scripts/recover-admin.js` with email-based admin lookup
2. Generate secure random reset token
3. Hash and store token in users table with expiry
4. Return token to stdout for operator to relay
5. Update auth controller to validate reset token
6. Log recovery operation
7. Write integration tests

**Test Coverage:**
- Admin lookup by email tests
- Token generation and storage tests
- Token validation and expiry tests
- Account recovery flow tests
- Logging tests

**Dependencies:** Story 9.1, Story 1.1

**Evidence Required:**
- CLI script implementation
- Token generation and validation tests
- Account recovery workflow tests
- Audit log entry verification

**Story Size:** Small-Medium (2-3 hours)

---

### Story 9.3: Implement Admin Password Reset Token Management

As a **developer**, I want to **add password reset token support to the user model**, so that **administrative recovery tokens can be managed safely**.

**Status:** PARTIALLY IMPLEMENTED (schema has reset_token and reset_token_expiry columns)

**Acceptance Criteria:**
- Given the users table has reset_token and reset_token_expiry columns
- When a reset token is generated
- Then it is hashed before storage (never stored in plain text)
- And the expiry is set to current time + 24 hours
- When a user attempts password reset with a token
- Then the token is hashed and compared against the stored hash
- And the expiry is checked (expired tokens are rejected)
- And the password is updated if validation passes
- And the reset token is cleared immediately after use (single-use)
- And if password reset fails, the token remains valid for retry

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (token integrity, single-use)

**Test Coverage:**
- Token hashing and comparison tests
- Expiry validation tests
- Single-use enforcement tests
- Failed reset retry tests

**Dependencies:** Story 9.2

**Evidence Required:**
- Model implementation with token hashing
- Reset token handling tests
- Expiry validation tests
- Single-use enforcement tests

**Story Size:** Small (1-2 hours, mostly exists)

---

## Epic 10: Production Authentication

**Purpose:** Implement HttpOnly cookie authentication and CSRF protection for production (Phase 3 of completion audit).

**Governance:** Production blocker #3, NFR-1, AD-5

### Story 10.1: Implement HttpOnly Cookie Authentication

As a **security engineer**, I want to **replace sessionStorage bearer tokens with HttpOnly cookies**, so that **browser XSS cannot steal authentication tokens**.

**Status:** PARTIALLY IMPLEMENTED (backend JWT exists; frontend uses sessionStorage)

**Production Blocker:** #3 from completion audit

**Acceptance Criteria:**
- Given a user logs in successfully
- When the backend issues the JWT
- Then the token is also set as an HttpOnly cookie (not accessible by JavaScript)
- And the cookie includes Secure flag (HTTPS only in production)
- And the cookie includes SameSite=Strict
- When the browser makes authenticated requests
- Then the cookie is automatically sent with each request (browser handles it)
- And the frontend JavaScript does not need to read or store the token
- And logout clears the cookie
- And Cookie authentication works in development (localhost) and production (HTTPS)

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (XSS prevention)
- AD-5: Environment safety is runtime contract

**Implementation Path:**
1. Update backend auth controller to set HttpOnly cookie on login
2. Add Express middleware to verify cookie (if bearer token missing)
3. Remove sessionStorage token storage from frontend
4. Update frontend API client to rely on cookies (credentials: 'include')
5. Update logout to clear cookies
6. Add environment-driven Secure/SameSite flags
7. Write tests for both dev/prod cookie configurations

**Test Coverage:**
- Backend cookie-setting tests
- Cookie flag validation (HttpOnly, Secure, SameSite)
- Cookie presence in requests tests
- Logout cookie clearing tests
- Development vs production flag tests

**Dependencies:** Story 1.1, Story 1.4

**Evidence Required:**
- Backend implementation with cookie-setting logic
- Cookie flag validation tests
- Frontend integration tests
- Development and production configuration tests

**Story Size:** Medium (3-4 hours)

---

### Story 10.2: Implement CSRF Protection

As a **security engineer**, I want to **add CSRF protection to state-changing requests**, so that **cross-site request forgery attacks are prevented**.

**Status:** NOT IMPLEMENTED

**Production Blocker:** #3 from completion audit

**Acceptance Criteria:**
- Given a user is authenticated via cookie
- When a mutating request (POST, PATCH, DELETE) is made
- Then a CSRF token must be included in the request header or form data
- And the backend validates the CSRF token against the session
- And mismatched or missing CSRF tokens result in 403 Forbidden
- And GET, HEAD, OPTIONS requests do not require CSRF tokens
- And the CSRF token is rotated on login
- And the frontend automatically includes the CSRF token in all mutation requests

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (CSRF prevention)

**Implementation Path:**
1. Add `csurf` middleware to Express app
2. Generate CSRF token on login and store in secure cookie
3. Require CSRF token header on mutating requests
4. Update frontend API client to extract and send CSRF token
5. Add error handling for CSRF failures
6. Write tests for token validation

**Test Coverage:**
- CSRF token generation and storage tests
- Token validation on mutating requests tests
- Invalid/missing token rejection tests
- GET requests bypass CSRF tests
- Token rotation on login tests

**Dependencies:** Story 10.1

**Evidence Required:**
- CSRF middleware implementation
- Backend token validation logic
- Frontend CSRF token handling
- Test results for all CSRF scenarios

**Story Size:** Medium (3-4 hours)

---

### Story 10.3: Verify Secure CORS Configuration

As a **security engineer**, I want to confirm that **CORS is configured restrictively for production**, so that **cross-origin attacks are mitigated**.

**Status:** PARTIALLY IMPLEMENTED (CORS middleware exists)

**Acceptance Criteria:**
- Given a CORS middleware is configured in Express
- When a cross-origin request is made
- Then only whitelisted origins are allowed (development: localhost:5173, production: configured domain)
- And credentials (cookies) are only sent to whitelisted origins
- And disallowed origins receive 403 Forbidden
- And preflight requests (OPTIONS) are validated
- And exposed headers are only those necessary for API functionality

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (CORS control)

**Test Coverage:**
- Allowed origin tests
- Disallowed origin rejection tests
- Credential inclusion tests
- Preflight request tests

**Dependencies:** Story 10.1, Story 10.2

**Evidence Required:**
- CORS configuration tests
- Origin validation tests
- Credential handling tests

**Story Size:** Small (1-2 hours, mostly existing)

---

### Story 10.4: Verify Session Invalidation on Logout

As a **security engineer**, I want to confirm that **sessions are properly invalidated on logout**, so that **logged-out users cannot reuse old tokens**.

**Status:** PARTIALLY IMPLEMENTED (logout route exists; session revocation not fully implemented)

**Acceptance Criteria:**
- Given a user is authenticated
- When the user calls `/api/auth/logout`
- Then the session is marked invalid in the database (if using session store)
- And the cookie is cleared with a Set-Cookie header
- And the JWT token_version is incremented (Story 1.4)
- When the user attempts to reuse the old token or cookie
- Then the request is rejected with 401 Unauthorized
- And the frontend is redirected to the login page

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (session cleanup)

**Test Coverage:**
- Logout endpoint tests
- Token/cookie invalidation tests
- Reuse rejection tests
- Frontend redirect tests

**Dependencies:** Story 1.4, Story 10.1

**Evidence Required:**
- Logout implementation verification
- Token invalidation tests
- Reuse prevention tests

**Story Size:** Small (1-2 hours)

---

## Epic 11: Password Recovery Workflow

**Purpose:** Implement forgot-password, reset-token, and email delivery (Phase 4 of completion audit).

**Governance:** Production blocker #4, NFR-1

### Story 11.1: Implement Forgot-Password Endpoint

As a **user**, I want to **request a password reset if I forget my password**, so that **I can regain account access**.

**Status:** PARTIALLY IMPLEMENTED (schema exists; routes/controller not fully implemented)

**Production Blocker:** #4 from completion audit

**Acceptance Criteria:**
- Given a user visits the forgot-password page
- When the user enters their email address and submits
- Then the backend checks if an account with that email exists
- If the account exists:
  - A password reset token is generated and hashed
  - The token is stored in the database with a 1-hour expiry
  - A password-reset email is sent to the user (via mail adapter)
  - The user sees a message: "If an account with this email exists, you will receive a password reset link."
- If the account does NOT exist:
  - The same message is shown (no account enumeration)
- And audit events record the forgot-password request

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (account enumeration prevention)

**Implementation Path:**
1. Create `/api/auth/forgot-password` POST endpoint
2. Implement email existence check (without revealing result)
3. Generate and hash reset token
4. Store token with expiry in database
5. Call mail adapter to send reset email
6. Log forgot-password request to audit trail
7. Write tests

**Test Coverage:**
- Email existence check tests
- Token generation and storage tests
- Email sending tests
- Account enumeration prevention tests
- Audit log recording tests

**Dependencies:** Story 9.3, Story 10.1

**Evidence Required:**
- Endpoint implementation
- Token handling tests
- Email delivery tests
- Security tests (enumeration prevention)

**Story Size:** Medium (3-4 hours)

---

### Story 11.2: Implement Reset-Password with Token Validation

As a **user**, I want to **set a new password using a reset token**, so that **I can complete the password recovery**.

**Status:** PARTIALLY IMPLEMENTED (schema columns exist; endpoint logic incomplete)

**Acceptance Criteria:**
- Given a user has received a password-reset email with a reset-token link
- When the user navigates to the reset-password page with the token
- Then the frontend validates the token with the backend (optional pre-check)
- When the user submits a new password
- Then the backend:
  - Finds the account by reset_token hash
  - Validates the token has not expired (< 1 hour old)
  - Validates the password meets complexity requirements
  - Hashes the new password with bcryptjs
  - Updates the user account with the new password
  - Clears the reset_token and reset_token_expiry from the database
  - Increments token_version (Story 1.4) to invalidate existing sessions
  - Returns success message
- And audit events record the successful password reset

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (password complexity, token single-use)
- Story 1.4: Token version invalidation

**Implementation Path:**
1. Create `/api/auth/reset-password` POST endpoint
2. Hash submitted token and compare against database
3. Validate token expiry
4. Validate password complexity
5. Hash new password
6. Update user record and clear reset token
7. Increment token_version
8. Log successful reset to audit trail
9. Write tests

**Test Coverage:**
- Token validation tests
- Expiry checking tests
- Password complexity validation tests
- Token single-use enforcement tests
- Successful password update tests
- Token version increment verification

**Dependencies:** Story 9.3, Story 1.4

**Evidence Required:**
- Endpoint implementation
- Token validation tests
- Password complexity tests
- Single-use enforcement tests
- Audit log recording

**Story Size:** Medium (3-4 hours)

---

### Story 11.3: Implement Mail Adapter Integration

As a **platform operator**, I want to **configure a transactional email provider**, so that **password-reset emails can be delivered**.

**Status:** NOT IMPLEMENTED

**Production Blocker:** #4 from completion audit

**Acceptance Criteria:**
- Given a mail provider is configured (e.g., SendGrid, AWS SES, MailerSend)
- When a password-reset email needs to be sent
- Then the mail adapter connects to the provider
- And the email is sent with:
  - Recipient: user email
  - Subject: "Password Reset for [Platform Name]"
  - Body: includes reset link with token
  - From: configured sender address
  - Reply-To: support email (if configured)
- And if email sending fails, an error is logged and the user is notified
- And test mode uses a mock adapter (never sends real emails)
- And configuration is environment-driven (API keys never committed)

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (configuration management)

**Implementation Path:**
1. Create `backend/services/mailAdapter.js` interface
2. Implement concrete adapters (SendGrid, Mock for tests)
3. Add configuration to `.env.example` with placeholders
4. Integrate mail adapter into forgot-password and reset-password flows
5. Add error handling and logging
6. Write tests with mock adapter

**Test Coverage:**
- Mock mail adapter tests
- Email content validation tests
- Configuration loading tests
- Error handling tests

**Dependencies:** Story 11.1, Story 11.2

**Evidence Required:**
- Mail adapter implementation
- Configuration setup documentation
- Integration tests with mock adapter
- Email template content verification

**Story Size:** Medium (3-4 hours)

---

### Story 11.4: Implement Frontend Forgot/Reset-Password Pages

As a **user**, I want to **use the frontend to reset my password**, so that **I don't need to use email links alone**.

**Status:** NOT IMPLEMENTED

**Acceptance Criteria:**
- Given a user visits the login page
- When they click "Forgot Password?"
- Then they are navigated to a forgot-password page
- And they can enter their email and submit
- And after submission, they see a success message with instructions
- Given a password-reset email contains a link with a reset token
- When the user clicks the link or pastes it in the browser
- Then they are navigated to a reset-password page
- And a form allows them to enter a new password (with complexity hints)
- And password confirmation field matches the first entry
- When they submit the form
- Then the new password is set and they are redirected to login
- And error messages guide them if validation fails

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- UI/UX: User-friendly password recovery

**Implementation Path:**
1. Create `frontend/src/pages/ForgotPasswordPage.tsx` with form
2. Create `frontend/src/pages/ResetPasswordPage.tsx` with token parsing
3. Connect forms to backend endpoints (Stories 11.1, 11.2)
4. Add form validation with React Hook Form
5. Add error/success message handling
6. Style with Tailwind/existing design system
7. Write component tests

**Test Coverage:**
- Component render tests
- Form submission tests
- Error message display tests
- Backend integration tests
- Token parsing tests

**Dependencies:** Story 11.1, Story 11.2, Story 11.3

**Evidence Required:**
- Frontend components implementation
- Form validation tests
- Backend integration tests
- User flow tests

**Story Size:** Medium (3-4 hours frontend)

---

## Epic 12: Frontend Performance & Code Optimization

**Purpose:** Implement route-level code splitting, bundle optimization, and security headers (Phase 8-9 blockers).

**Governance:** Production blocker #5, NFR-4

### Story 12.1: Implement Route-Level Code Splitting

As a **frontend developer**, I want to **code-split components by route**, so that **initial bundle size is reduced and lazy loading works**.

**Status:** NOT IMPLEMENTED

**Production Blocker:** #5 from completion audit

**Acceptance Criteria:**
- Given the frontend has multiple route groups (login, dashboard, credentials, admin, public)
- When the application loads
- Then only the entry route's code is loaded initially
- And other route bundles are loaded on-demand when the user navigates
- And React Router is configured with lazy-loaded components
- And Suspense boundaries handle loading states
- And bundle analysis shows separate chunks for each route

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability

**Implementation Path:**
1. Update `frontend/src/main.tsx` to use React.lazy() for route components
2. Wrap route components with Suspense
3. Add loading/error fallback UI
4. Configure Vite for automatic chunk splitting
5. Verify chunks in build output
6. Document route structure

**Test Coverage:**
- Component lazy-loading tests
- Suspense rendering tests
- Route transition tests
- Bundle size analysis

**Dependencies:** None (frontend-only)

**Evidence Required:**
- Lazy-loading component implementation
- Suspense boundary tests
- Bundle analysis showing separate chunks
- Route loading tests

**Story Size:** Medium (2-3 hours)

---

### Story 12.2: Implement Bundle Size Analysis and Optimization

As a **frontend developer**, I want to **measure and optimize bundle size**, so that **performance thresholds are met**.

**Status:** NOT IMPLEMENTED

**Acceptance Criteria:**
- Given the application is built
- When `npm run frontend:build` completes
- Then bundle size analysis is performed:
  - Entry chunk size < 500 KB (gzipped < 150 KB)
  - Total initial chunks < 800 KB (gzipped < 250 KB)
  - Lazy chunks < 200 KB each
- When bundle size exceeds thresholds
- Then the build fails with a clear error message
- And developers can regenerate baseline with an approved flag
- And `npm run performance:budget` validates chunk isolation

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability

**Implementation Path:**
1. Install `vite-plugin-visualizer` or similar
2. Create build-analysis script
3. Define performance thresholds in `vite.config.ts`
4. Generate visual bundle report
5. Add threshold validation to CI
6. Document approved baseline

**Test Coverage:**
- Build analysis tests
- Threshold validation tests
- Report generation tests

**Dependencies:** Story 12.1

**Evidence Required:**
- Bundle analysis configuration
- Performance threshold tests
- Visual bundle report
- Baseline documentation

**Story Size:** Medium (2-3 hours)

---

### Story 12.3: Validate Security Headers

As a **security engineer**, I want to confirm that **security headers are correctly set on frontend responses**, so that **XSS, clickjacking, and MIME sniffing are mitigated**.

**Status:** PARTIALLY IMPLEMENTED (Helmet middleware exists on backend)

**Acceptance Criteria:**
- Given a frontend request is made
- When the response is returned
- Then the following headers are present:
  - `Content-Security-Policy`: restrictive policy (no unsafe-inline)
  - `X-Frame-Options: DENY` (prevent clickjacking)
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block` (legacy, for older browsers)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000` (HTTPS only)
- And headers are validated by security test suite

**Relevant FR/NFR/AD:**
- FR-1: Authentication and security
- NFR-1: Security (attack mitigation)

**Test Coverage:**
- Security header validation tests
- CSP validation tests
- Production vs development header tests

**Dependencies:** Story 10.1

**Evidence Required:**
- Security header configuration
- Header validation tests
- Production environment tests

**Story Size:** Small (1-2 hours)

---

### Story 12.4: Implement Dependency Vulnerability Audit

As a **security engineer**, I want to **audit and classify all dependencies for vulnerabilities**, so that **known exploits are documented and prioritized**.

**Status:** NOT IMPLEMENTED (Fresh audit required)

**Production Blocker:** #5 from completion audit

**Acceptance Criteria:**
- Given the root and frontend `package.json` files
- When a fresh audit is run
- Then all dependencies are scanned for known vulnerabilities:
  - Run `npm audit --audit-level=moderate`
  - Run `npm audit --json` for detailed report
  - For frontend: `npm --prefix frontend audit`
- For each vulnerability:
  - Assess runtime reachability (is it actually exposed?)
  - Assess architecture exposure (can an attacker trigger the code path?)
  - Classify as direct/transitive dependency
  - Plan remediation (upgrade, remove, mitigate)
- And results are documented in `docs/DEPENDENCY_SECURITY_REPORT.md`
- And no known critical/high vulnerabilities remain without mitigation plan

**Relevant FR/NFR/AD:**
- NFR-1: Security (dependency management)

**Implementation Path:**
1. Run fresh npm audit for root and frontend
2. Generate JSON reports
3. Analyze each vulnerability for impact
4. Create remediation plan (upgrades, patches, workarounds)
5. Document in DEPENDENCY_SECURITY_REPORT.md
6. Add audit to CI pipeline

**Test Coverage:**
- Audit report generation tests
- Remediation verification tests
- CI audit integration tests

**Dependencies:** None (audit-time check)

**Evidence Required:**
- Fresh npm audit reports
- Vulnerability analysis documentation
- Remediation plan for each high/critical issue
- Updated DEPENDENCY_SECURITY_REPORT.md

**Story Size:** Medium (4-5 hours, includes analysis and documentation)

---

### Story 12.5: Implement Fresh Container Security Scan

As a **security engineer**, I want to **scan built Docker images for vulnerabilities**, so that **container exploits are detected**.

**Status:** NOT IMPLEMENTED (Docker engine unavailable during Phase 0)

**Production Blocker:** #5 from completion audit

**Acceptance Criteria:**
- Given Docker images are built
- When image scanning is performed
- Then tools like Trivy or Grype scan the images:
  - Backend image: `app:latest`
  - Frontend image: `frontend:latest`
- For each vulnerability:
  - Assess runtime exposure
  - Classify severity
  - Plan remediation
- And a Software Bill of Materials (SBOM) is generated
- And results are documented in scan reports
- And CI jobs include image scanning

**Relevant FR/NFR/AD:**
- NFR-1: Security (container security)
- FR-7: Deployment and operational reliability

**Implementation Path:**
1. Set up image scanning tool (Trivy or Grype)
2. Build and scan Docker images
3. Generate SBOM in SPDX format
4. Document findings and remediation
5. Add scanning to GitHub Actions CI

**Test Coverage:**
- Scan tool integration tests
- SBOM generation tests
- Scan result reporting tests

**Dependencies:** Story 15.1 (Docker validation)

**Evidence Required:**
- Image scan reports
- SBOM documentation
- Vulnerability analysis
- Remediation plan

**Story Size:** Medium (3-4 hours, includes documentation)

---

## Epic 13: WCAG & Visual Accessibility

**Purpose:** Complete manual WCAG 2.2 AA audit, remediation, and visual regression (Phase 10 blocker).

**Governance:** Production blocker #5 (accessibility), NFR-1

### Story 13.1: Perform Manual WCAG 2.2 AA Audit

As a **accessibility specialist**, I want to **audit the frontend for WCAG 2.2 AA compliance**, so that **accessibility defects are identified**.

**Status:** NOT IMPLEMENTED

**Production Blocker:** #5 from completion audit (WCAG review missing)

**Acceptance Criteria:**
- Given the frontend is deployed locally
- When a manual WCAG 2.2 Level AA audit is performed
- Then each page is tested for:
  - Keyboard navigation (Tab, Enter, Escape)
  - Color contrast (WCAG AA 4.5:1 for text)
  - Focus indicators (visible on all interactive elements)
  - Screen reader compatibility (NVDA, JAWS, VoiceOver)
  - Form labels and error messages
  - Alt text for images
  - Heading hierarchy (h1, h2, h3 in order)
  - ARIA landmarks and roles (where appropriate)
  - Semantic HTML (buttons, links, form controls)
  - Mobile responsiveness and touch targets
- And findings are documented with WCAG criteria references
- And severity is classified (blocker, high, medium, low)
- And results are recorded in `docs/WCAG_MANUAL_REVIEW.md`

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability (user experience)
- Regulatory: Accessibility compliance

**Implementation Path:**
1. Set up accessibility testing tools (axe DevTools, WAVE, Lighthouse)
2. Perform manual audit of key user flows
3. Test with actual screen readers
4. Keyboard-only navigation testing
5. Document all findings with screenshots/video
6. Create remediation priority list

**Test Coverage:**
- Automated axe-core scanning (baseline)
- Manual keyboard navigation tests
- Screen reader testing
- Visual contrast validation

**Dependencies:** None (audit-time task)

**Evidence Required:**
- WCAG audit report in WCAG_MANUAL_REVIEW.md
- Screenshots/videos of defects
- Test methodology documentation
- Remediation plan prioritized by severity

**Story Size:** Large (6-8 hours, includes detailed manual testing)

---

### Story 13.2: Remediate Accessibility Defects

As a **frontend developer**, I want to **fix identified accessibility defects**, so that **WCAG 2.2 AA compliance is achieved**.

**Status:** DEPENDS ON 13.1 FINDINGS

**Acceptance Criteria:**
- For each blocker/high defect identified in Story 13.1:
  - Add missing alt text to images
  - Fix color contrast issues (adjust colors)
  - Add missing focus indicators (outline, box-shadow)
  - Add missing ARIA labels/roles
  - Fix heading hierarchy
  - Improve keyboard navigation
  - Update form labels and error messages
- And all fixes are tested with axe-core
- And screen reader testing confirms fixes work
- And no new accessibility regressions are introduced

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability

**Implementation Path:**
1. Update component code with accessibility fixes
2. Run axe-core tests to validate
3. Manual screen reader testing
4. Keyboard navigation testing
5. Visual regression testing (Story 13.3)
6. Document fixes and test results

**Test Coverage:**
- axe-core automated testing
- Manual keyboard navigation tests
- Screen reader compatibility tests
- Visual regression tests

**Dependencies:** Story 13.1

**Evidence Required:**
- Code changes with accessibility improvements
- axe-core test results showing all issues resolved
- Manual testing evidence
- Before/after screenshots of fixes

**Story Size:** Large (depends on 13.1 findings; assume 8-12 hours for comprehensive fixes)

---

### Story 13.3: Establish Visual Regression Baseline

As a **QA engineer**, I want to **establish an approved baseline for visual regression testing**, so that **unintended visual changes are caught**.

**Status:** NOT IMPLEMENTED

**Acceptance Criteria:**
- Given the frontend is rendered in multiple browsers (Chrome, Firefox, Safari)
- When screenshots are captured of all major pages
- Then baseline images are stored in `frontend/tests/visual/baseline/`
- And each baseline is reviewed and approved by a designer/QA lead
- And baseline images are version-controlled (not ignored)
- And documentation explains when baselines should be updated
- And baseline regeneration requires human review before commit

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability
- UI: Visual consistency

**Implementation Path:**
1. Set up visual testing tool (e.g., Percy, chromatic, or local Playwright)
2. Capture baseline screenshots
3. Store baselines in git
4. Document baseline update procedure
5. Add visual regression tests to CI

**Test Coverage:**
- Baseline capture and storage
- Baseline review workflow
- Update procedure tests

**Dependencies:** Story 13.2 (accessibility fixes applied)

**Evidence Required:**
- Baseline image directory with all major pages
- Baseline review documentation
- Update procedure documented
- CI integration

**Story Size:** Medium (3-4 hours)

---

### Story 13.4: Implement Visual Regression Test Suite

As a **QA engineer**, I want to **run automated visual regression tests**, so that **accidental visual changes are detected**.

**Status:** NOT IMPLEMENTED

**Acceptance Criteria:**
- Given visual baselines exist (Story 13.3)
- When `npm run test:visual` is executed
- Then screenshots are captured of all major pages
- And screenshots are compared against baselines
- And if differences exceed a threshold (e.g., 1% pixel difference)
- Then the test fails and a diff report is generated
- And developers can review diffs and approve/reject
- And approved diffs are committed as new baselines with `npm run test:visual:update`

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability

**Implementation Path:**
1. Set up Playwright visual comparison
2. Create test specs for each major page
3. Implement diff reporting
4. Add manual update approval workflow
5. Integrate into CI

**Test Coverage:**
- Visual regression test execution
- Diff detection and reporting
- Baseline update workflow

**Dependencies:** Story 13.3

**Evidence Required:**
- Visual regression test implementation
- CI integration
- Test results showing diffs caught and reviewed

**Story Size:** Medium (3-4 hours)

---

## Epic 14: Load Testing & Performance Gates

**Purpose:** Implement repeatable load tests and release thresholds (Phase 11 blocker).

**Governance:** Production blocker #5, NFR-4

### Story 14.1: Design Load Test Scenarios

As a **performance engineer**, I want to **define realistic load test scenarios**, so that **performance bottlenecks are identified**.

**Status:** NOT IMPLEMENTED

**Production Blocker:** #5 from completion audit

**Acceptance Criteria:**
- Given the platform supports credential issuance, verification, and dashboard workflows
- When load test scenarios are designed
- Then the following scenarios are included:
  - User login/logout (spike: 100 concurrent users)
  - Credential list and search (sustained: 50 concurrent users, 10 pages)
  - Credential issuance with IPFS (sustained: 10 concurrent users, 5-minute duration)
  - Verification by hash/ID (spike: 200 concurrent users)
  - Dashboard metrics aggregation (sustained: 50 concurrent users)
- And each scenario includes ramp-up time, peak load, and cooldown
- And success criteria are defined (e.g., 95th percentile response < 500ms, error rate < 0.1%)
- And scenarios are documented in `docs/PERFORMANCE_TEST_REPORT.md`

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability

**Implementation Path:**
1. Analyze user workflows and traffic patterns
2. Define realistic load scenarios
3. Set performance thresholds
4. Document scenarios and success criteria
5. Create load test configuration files (k6, JMeter, or similar)

**Test Coverage:**
- Scenario documentation
- Threshold documentation
- Load test configuration review

**Dependencies:** None (design-time task)

**Evidence Required:**
- Load test scenario documentation in PERFORMANCE_TEST_REPORT.md
- Detailed scenario definitions with user flows
- Success criteria for each scenario
- Load test configuration files

**Story Size:** Medium (4-5 hours, analysis + documentation)

---

### Story 14.2: Implement and Execute Repeatable Load Tests

As a **performance engineer**, I want to **execute load tests repeatedly in isolation**, so that **performance is measured consistently**.

**Status:** NOT IMPLEMENTED

**Acceptance Criteria:**
- Given load test scenarios are defined (Story 14.1)
- When load tests are executed
- Then:
  - A fresh PostgreSQL database is provisioned for each run
  - IPFS and blockchain are mocked
  - All external dependencies are stable
  - Backend is deployed locally
  - Load is applied per scenario definition
  - Results are captured (response times, throughput, errors)
  - Results are logged and compared against baselines
- And tests can be repeated identically
- And results are stored in `test-results/load-test-results-{date}.json`

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability

**Implementation Path:**
1. Set up k6 or similar load testing tool
2. Create load test scripts from scenarios (Story 14.1)
3. Implement test database provisioning
4. Create test execution wrapper script
5. Implement result logging and comparison
6. Document test execution procedure

**Test Coverage:**
- Load test execution tests
- Result logging tests
- Reproducibility tests

**Dependencies:** Story 14.1

**Evidence Required:**
- Load test script implementation
- Test execution documentation
- Sample load test results
- Reproducibility verification

**Story Size:** Large (6-8 hours, includes tool setup and script development)

---

### Story 14.3: Define Performance Thresholds and Release Gates

As a **product manager**, I want to **define performance thresholds that must be met before release**, so that **performance is not regressed**.

**Status:** NOT IMPLEMENTED

**Acceptance Criteria:**
- Given load test results are available (Story 14.2)
- When a release is prepared
- Then the following thresholds must be met:
  - Login endpoint: p95 response < 200ms, error rate < 0.01%
  - Credential issuance: p95 response < 1000ms, error rate < 0.1%
  - Verification: p95 response < 300ms, error rate < 0.01%
  - Dashboard: p95 response < 500ms, error rate < 0.1%
  - 95th percentile API response time overall < 600ms
  - Error rate overall < 0.1%
  - Throughput maintained with ≥ 20% margin above peak load
- And if any threshold is violated, the release is blocked
- And thresholds are documented in `docs/PERFORMANCE_ENVIRONMENT.md`

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability

**Implementation Path:**
1. Analyze baseline performance from Story 14.2 results
2. Set conservative thresholds (with margin for variation)
3. Document thresholds with justification
4. Implement threshold validation in CI
5. Create release gate that blocks deployment if thresholds violated

**Test Coverage:**
- Threshold validation tests
- Release gate tests
- Baseline performance analysis

**Dependencies:** Story 14.2

**Evidence Required:**
- Performance threshold documentation in PERFORMANCE_ENVIRONMENT.md
- Threshold setting rationale
- CI release gate implementation
- Threshold violation detection tests

**Story Size:** Medium (3-4 hours)

---

### Story 14.4: Analyze Bottlenecks and Optimize

As a **backend engineer**, I want to **identify performance bottlenecks from load tests**, so that **optimization can be prioritized**.

**Status:** DEPENDS ON 14.2 RESULTS

**Acceptance Criteria:**
- Given load test results show performance issues
- When results are analyzed
- Then:
  - Slow endpoints are identified (p95 > threshold)
  - Database queries are profiled (slow queries identified)
  - IPFS operations are timed
  - Cache hit rates are measured
  - Connection pool utilization is analyzed
- For each bottleneck:
  - Root cause is identified
  - Optimization is planned (query index, caching, pooling, etc.)
  - Fix is implemented and tested
  - Performance improvement is verified
  - Results are documented

**Relevant FR/NFR/AD:**
- NFR-4: Performance and observability

**Implementation Path:**
1. Analyze load test results from Story 14.2
2. Profile slow endpoints
3. Query database slow logs
4. Identify optimization opportunities
5. Implement fixes (indexes, caching, connection tuning)
6. Re-run load tests to verify improvement
7. Document findings and optimizations

**Test Coverage:**
- Profiling and bottleneck identification
- Performance improvement verification

**Dependencies:** Story 14.2

**Evidence Required:**
- Bottleneck analysis report
- Optimization implementations
- Before/after performance results
- Documentation of fixes applied

**Story Size:** Large (8-12 hours, highly dependent on findings)

---

## Epic 15: Docker & CI/CD Validation

**Purpose:** Validate Docker runtime, GitHub Actions workflows, image scanning, and SBOMs (Phase 12 blocker).

**Governance:** Production blocker #5, FR-7, AD-6

### Story 15.1: Validate Docker Runtime

As a **DevOps engineer**, I want to **confirm Docker and Docker Compose work on the target machine**, so that **deployment is possible**.

**Status:** BLOCKED (Docker engine unavailable during Phase 0)

**Production Blocker:** #5 from completion audit

**Acceptance Criteria:**
- Given Docker Desktop or Docker Engine is installed and running
- When `npm run docker:up` is executed
- Then:
  - All services start in order (PostgreSQL, Hardhat, migrations, backend, frontend)
  - Health checks pass (PostgreSQL ready, Hardhat responding, backend /health → 200)
  - Frontend is accessible at http://localhost:5173
  - Backend is accessible at http://localhost:3000
  - Database migrations complete
  - Hardhat contract is deployed
  - No errors in service logs
- And `npm run docker:down` gracefully shuts down services
- And volumes are preserved on shutdown
- And Docker Compose version is compatible

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- NFR-2: Reliability
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Docker Compose integration tests
- Service startup sequence validation
- Health check verification
- Log analysis for errors
- Graceful shutdown tests

**Dependencies:** None (Docker availability prerequisite)

**Evidence Required:**
- Docker startup log showing all services healthy
- Service readiness verification
- Frontend and backend accessibility confirmation
- Database migration verification
- Hardhat contract deployment verification

**Story Size:** Small (1-2 hours, mostly validation)

---

### Story 15.2: Validate GitHub Actions Workflows

As a **DevOps engineer**, I want to **confirm all GitHub Actions workflows run successfully**, so that **CI/CD pipeline integrity is verified**.

**Status:** NOT FULLY VALIDATED

**Acceptance Criteria:**
- Given GitHub Actions workflows are defined (`.github/workflows/*.yml`)
- When a pull request is created
- Then:
  - `ci.yml` runs: linting, unit tests, backend/frontend/contract tests
  - `e2e.yml` runs: API E2E with isolated test database
  - `security.yml` runs: dependency scanning, CodeQL, secret scanning
  - `docker.yml` runs: Docker build/scan/SBOM for backend and frontend
  - All workflows pass without errors
  - Coverage reports are generated
  - SBOM artifacts are created
- When a release is tagged
- Then:
  - `release.yml` runs: full test gate, image build, publish to GHCR
  - Image is signed and pushed with immutable digest
  - Release notes are generated

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- AD-5: Environment safety is runtime contract
- AD-6: Observability and recovery are mandatory

**Test Coverage:**
- Workflow execution validation
- Artifact generation tests
- Image publish verification

**Dependencies:** Story 12.1 through 14.4 (tests must pass)

**Evidence Required:**
- GitHub Actions workflow run logs
- All jobs passing on main branch
- Coverage reports and thresholds met
- SBOM artifacts generated
- Image push confirmation

**Story Size:** Medium (4-5 hours, includes workflow debugging and fixing)

---

### Story 15.3: Implement Container Image Scanning

As a **security engineer**, I want to **scan built container images for vulnerabilities**, so that **container exploits are detected**.

**Status:** NOT IMPLEMENTED (configured in workflow, not yet validated)

**Acceptance Criteria:**
- Given backend and frontend Docker images are built
- When image scanning is performed (part of `docker.yml` workflow)
- Then:
  - Trivy or Grype scans the images
  - Vulnerabilities are classified by severity
  - Critical and high vulnerabilities are reported
  - Scan results fail the workflow if unacceptable vulnerabilities exist
  - Low and medium vulnerabilities are logged but don't fail
- And scan results are stored as workflow artifacts

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- NFR-1: Security

**Test Coverage:**
- Image scanning tool integration
- Vulnerability detection validation
- Scan result reporting

**Dependencies:** Story 15.1

**Evidence Required:**
- Image scan workflow integration
- Sample scan results with vulnerability classifications
- Scan result failure scenarios

**Story Size:** Small (2-3 hours)

---

### Story 15.4: Validate SBOM Generation and Documentation

As a **compliance officer**, I want to **generate Software Bill of Materials (SBOM) for supply chain compliance**, so that **component transparency is documented**.

**Status:** NOT IMPLEMENTED (configured in workflow, not yet validated)

**Acceptance Criteria:**
- Given Docker images are built
- When SBOM generation is performed (part of `docker.yml` workflow)
- Then:
  - SBOMs are generated in SPDX or CycloneDX format
  - SBOMs include all OS packages, runtime dependencies, and versions
  - SBOMs are stored in GHCR container metadata
  - SBOMs are downloadable from release artifacts
  - SBOM can be validated with `syft` or similar tool
  - Documentation in `sbom/` directory catalogs available SBOMs

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- Compliance: Supply chain transparency

**Test Coverage:**
- SBOM generation validation
- SBOM format validation
- SBOM completeness verification

**Dependencies:** Story 15.1

**Evidence Required:**
- SBOM generation workflow integration
- Sample SBOM files (SPDX/CycloneDX format)
- SBOM metadata in container images
- Documentation of SBOM availability

**Story Size:** Small (2-3 hours)

---

## Epic 16: Staging Configuration & Readiness

**Purpose:** Prepare staging environment configuration and infrastructure documentation (Phase 13 preparation).

**Governance:** Production blocker #9, AD-5

### Story 16.1: Create .env.staging.example with Placeholders

As a **platform operator**, I want to **have a staging environment template**, so that **configuration is documented and operators know what to set**.

**Status:** NOT IMPLEMENTED

**Acceptance Criteria:**
- Given a new operator needs to deploy to staging
- When they reference `.env.staging.example`
- Then they see all required staging environment variables:
  - DATABASE_URL: `postgresql://user:password@staging-postgres:5432/skill_verification`
  - IPFS_PROVIDER: `pinata` (staging IPFS service)
  - PINATA_JWT: `[staging-jwt-placeholder]`
  - BLOCKCHAIN_RPC: `https://sepolia.infura.io/v3/[api-key]`
  - JWT_SECRET: `[min-48-char-random-secret]`
  - REDIS_URL: `redis://staging-redis:6379`
  - CORS_ORIGINS: `https://staging-app.example.com`
  - COOKIE_DOMAIN: `staging-app.example.com`
  - LOG_LEVEL: `info`
  - And all values are placeholders (never real credentials)
- And documentation explains each variable's purpose and production requirements
- And the file is version-controlled but `.env.staging` (with real values) is `.gitignore`'d

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- NFR-1: Security (configuration management)
- AD-5: Environment safety is runtime contract (LOAD-BEARING)

**Implementation Path:**
1. Copy `.env.example` to `.env.staging.example`
2. Update placeholders with staging-specific values (staging domain, staging RPC, etc.)
3. Add inline documentation for each variable
4. Verify all required variables are included
5. Create accompanying documentation

**Test Coverage:**
- Configuration validation (required fields present)
- Placeholder verification (no real secrets)
- Documentation validation

**Dependencies:** None (documentation task)

**Evidence Required:**
- `.env.staging.example` file with all required variables
- Placeholders clearly marked
- Inline documentation for each variable
- .gitignore verification that `.env.staging` is ignored

**Story Size:** Small (1-2 hours)

---

### Story 16.2: Create Staging Deployment Configuration

As a **DevOps engineer**, I want to **document the staging deployment topology**, so that **operators know how to provision infrastructure**.

**Status:** NOT IMPLEMENTED

**Acceptance Criteria:**
- Given operators need to stand up a staging environment
- When they reference `docs/STAGING_DEPLOYMENT.md`
- Then they find documentation for:
  - Infrastructure requirements (cloud provider, region, instance types, storage)
  - Network configuration (VPC, security groups, TLS/HTTPS)
  - Database provisioning (managed PostgreSQL, backup/restore setup)
  - IPFS staging setup (Pinata credentials, gateway configuration)
  - Blockchain testnet selection and configuration (Sepolia, funded accounts)
  - Redis cache setup
  - Email provider configuration (SendGrid, SES, etc.)
  - Logging and monitoring setup
  - DNS configuration and TLS/HTTPS certificates
  - Backup and retention policy
- And the documentation includes step-by-step provisioning instructions
- And example configurations for major cloud providers (AWS, Azure, GCP)
- And validation steps to confirm each component is working

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- AD-5: Environment safety is runtime contract
- AD-6: Observability and recovery are mandatory

**Implementation Path:**
1. Create `docs/STAGING_DEPLOYMENT.md`
2. Document infrastructure architecture
3. Add provisioning steps for each component
4. Include cloud provider examples
5. Add validation and health check procedures
6. Create sample configurations

**Test Coverage:**
- Documentation completeness review
- Configuration validation procedures

**Dependencies:** Story 16.1

**Evidence Required:**
- STAGING_DEPLOYMENT.md documentation
- Infrastructure architecture diagrams
- Provisioning step-by-step instructions
- Example configurations for supported providers

**Story Size:** Medium (4-5 hours, includes research and documentation)

---

### Story 16.3: Create Infrastructure Documentation Package

As a **compliance officer**, I want to **document all infrastructure requirements for external audit**, so that **infrastructure choices are justified and auditable**.

**Status:** NOT IMPLEMENTED

**Acceptance Criteria:**
- Given an external auditor needs to review infrastructure
- When they request infrastructure documentation
- Then they receive:
  - Overall architecture diagram (topology, security zones)
  - Infrastructure as Code (Terraform/CloudFormation templates) if used
  - Network security documentation (firewalls, WAF, TLS)
  - Data residency and compliance documentation
  - Backup and disaster recovery topology
  - Monitoring and alerting configuration
  - Incident response procedures
  - Change management procedures
  - Access control policies
  - Retention policy for logs and backups
- And documentation is current and linked from main README

**Relevant FR/NFR/AD:**
- FR-7: Deployment and operational reliability
- AD-5: Environment safety is runtime contract
- AD-6: Observability and recovery are mandatory

**Implementation Path:**
1. Create `docs/INFRASTRUCTURE_DOCUMENTATION.md`
2. Add architecture diagrams and descriptions
3. Document each infrastructure component
4. Add compliance and security sections
5. Link from README and other relevant docs
6. Create or reference IaC templates

**Test Coverage:**
- Documentation completeness review
- Link validation

**Dependencies:** Story 16.2

**Evidence Required:**
- INFRASTRUCTURE_DOCUMENTATION.md
- Architecture diagrams
- Component documentation
- Compliance statements

**Story Size:** Medium (3-4 hours)

---

---

## Story Dependency Graph

```mermaid
graph TD
  1.1["1.1: JWT Auth"] --> 1.2["1.2: RBAC"]
  1.1 --> 1.3["1.3: Institution Scope"]
  1.2 --> 1.3
  1.1 --> 1.4["1.4: Token Version"]
  1.1 --> 1.5["1.5: Inactivity Timeout"]
  
  1.1 --> 2.1["2.1: Institution Create"]
  1.2 --> 2.1
  2.1 --> 2.2["2.2: Institution Status"]
  2.1 --> 2.3["2.3: Wallet Auth"]
  2.1 --> 2.4["2.4: Inst Selector"]
  
  2.1 --> 3.1["3.1: Student Create"]
  1.1 --> 3.1
  3.1 --> 3.2["3.2: Student List"]
  3.1 --> 3.3["3.3: Student Detail"]
  3.3 --> 3.4["3.4: Student Update Backend"]
  3.4 --> 3.5["3.5: Student Update Frontend"]
  3.1 --> 3.6["3.6: Student Selector"]
  
  3.3 --> 4.1["4.1: PDF Upload"]
  4.1 --> 4.2["4.2: IPFS Hashing"]
  4.2 --> 4.3["4.3: Blockchain Issuance"]
  4.3 --> 4.4["4.4: Status Lifecycle"]
  4.3 --> 4.5["4.5: PDF Download"]
  
  4.2 --> 5.1["5.1: Verify by Hash"]
  4.3 --> 5.2["5.2: Verify by ID"]
  4.3 --> 5.3["5.3: Verify by Token"]
  4.3 --> 5.4["5.4: Revocation"]
  5.1 --> 5.5["5.5: Consistency Checks"]
  5.2 --> 5.5
  5.3 --> 5.5
  5.4 --> 5.5
  
  5.1 --> 6.1["6.1: Public Verify Routes"]
  6.1 --> 6.2["6.2: QR Code"]
  6.1 --> 6.3["6.3: Result Display"]
  6.1 --> 6.4["6.4: No Data Leakage"]
  
  1.1 --> 7.1["7.1: Audit Logging"]
  1.2 --> 7.1
  7.1 --> 7.2["7.2: Dashboard"]
  7.2 --> 7.3["7.3: Health Endpoints"]
  7.1 --> 7.4["7.4: Metrics"]
  7.1 --> 7.5["7.5: Correlation IDs"]
  
  8.1["8.1: Env Validation"]
  8.1 --> 8.2["8.2: Migrations"]
  8.2 --> 8.3["8.3: Backup"]
  8.3 --> 8.4["8.4: Restore"]
  4.3 --> 8.5["8.5: Blockchain Reconciliation"]
  
  1.1 --> 9.1["9.1: Bootstrap CLI"]
  9.1 --> 9.2["9.2: Recovery CLI"]
  9.2 --> 9.3["9.3: Reset Token"]
  
  1.1 --> 10.1["10.1: HttpOnly Cookies"]
  10.1 --> 10.2["10.2: CSRF Protection"]
  10.1 --> 10.3["10.3: CORS Config"]
  1.4 --> 10.4["10.4: Session Logout"]
  
  9.3 --> 11.1["11.1: Forgot Password"]
  10.1 --> 11.1
  9.3 --> 11.2["11.2: Reset Password"]
  1.4 --> 11.2
  11.1 --> 11.3["11.3: Mail Adapter"]
  11.2 --> 11.3
  11.3 --> 11.4["11.4: Frontend Pages"]
  
  12.1["12.1: Code Splitting"]
  12.1 --> 12.2["12.2: Bundle Analysis"]
  10.1 --> 12.3["12.3: Security Headers"]
  12.4["12.4: Dependency Audit"]
  12.5["12.5: Image Scan"]
  
  13.1["13.1: WCAG Audit"]
  13.1 --> 13.2["13.2: Remediate Defects"]
  13.2 --> 13.3["13.3: Visual Baseline"]
  13.3 --> 13.4["13.4: Visual Regression Tests"]
  
  14.1["14.1: Load Test Design"]
  14.1 --> 14.2["14.2: Load Tests"]
  14.2 --> 14.3["14.3: Performance Gates"]
  14.2 --> 14.4["14.4: Optimization"]
  
  8.1 --> 15.1["15.1: Docker Validation"]
  12.4 --> 15.2["15.2: CI/CD Validation"]
  15.1 --> 15.3["15.3: Image Scanning"]
  15.1 --> 15.4["15.4: SBOM Gen"]
  
  16.1["16.1: .env.staging"]
  16.1 --> 16.2["16.2: Staging Config"]
  16.2 --> 16.3["16.3: Infrastructure Docs"]

