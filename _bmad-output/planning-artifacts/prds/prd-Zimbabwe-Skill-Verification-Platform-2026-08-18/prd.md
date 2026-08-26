---
title: Zimbabwe Skill Verification Platform
status: draft
created: 2026-08-18
updated: 2026-08-18
---

# Zimbabwe Skill Verification Platform

## 1. Product summary

The Zimbabwe Skill Verification Platform is a secure digital credentialing and verification system for institutions, students, issuers, and verifiers. The platform allows institutions to issue credentials, preserve proof of issuance, and allow third parties to verify authenticity without exposing unnecessary personal data. It combines institutional record management, credential lifecycle tracking, public verification, and blockchain-backed proof anchoring.

The product exists as a working platform with a documented architecture and implemented backend, frontend, and contract layers. The current system is structured around a trust model: institutional records live in PostgreSQL, credential documents and supporting files can be processed through IPFS, and the proof of issuance is anchored on a blockchain registry contract.

## 2. Problem statement

The current environment has a real need for trustworthy skill and academic verification. A paper-based or system-local credential process is vulnerable to fraud, incomplete verification, slow checking, and blurred authority boundaries. Institutions and verifiers need a way to confirm that credentials are genuine, issued by the correct authority, and not revoked or invalid.

This system addresses that by creating a single operational flow for:

- institution administration and role-based access
- student record management
- credential issuance and tracking
- verification by public or authorized parties
- audit logging and operational visibility
- cryptographic proofing through blockchain and document hashing

## 3. Goals

### 3.1 Business goals

- Reduce fraud and forgery in credential verification
- Establish a clear trust chain from institution to credential to verification
- Give verifiers a simple and auditable verification workflow
- Support institutional governance with role segregation and auditability
- Create a platform that can scale across educational and skills verification scenarios

### 3.2 Product goals

- Create a dependable issuance workflow
- Separate private institutional data from public verification data
- Allow verification without exposing more sensitive information than needed
- Keep credential records auditable and reviewable
- Make the system usable by both internal staff and external verifiers

## 4. Users and stakeholders

### 4.1 Primary users

- Super administrator: operates and governs the platform at the system level
- Institution administrator: manages institutional operations and roles
- Issuer: creates and issues credentials under an institution
- Verifier: verifies credential authenticity in a public or regulated context
- Student: subject of credential issuance and data management within institution workflows

### 4.2 Stakeholders

- Educational institutions
- Skills and training bodies
- Employers and external verifiers
- Platform operators
- Security and compliance teams
- Development and infrastructure teams

## 5. Core user needs

- Verify that a credential is real and not counterfeit
- Confirm the originating institution and issuer authority
- See whether a credential has been revoked or flagged as invalid
- Access credential records within strict authorization boundaries
- Maintain audit trails for administrative and verification actions
- Preserve operational safety and secure handling of credentials and secrets

## 6. Scope

### 6.1 In scope

- User authentication and authorization
- Institution lifecycle and role management
- Student record management
- Credential issuance and processing
- Public verification by hash, ID, or token
- Audit logging and dashboard analytics
- IPFS storage and blockchain proofing
- Docker-based deployment and environment isolation
- Operational health, metrics, and recovery flows

### 6.2 Out of scope for this PRD

- A full public marketplace for credentials
- Payment or billing workflows
- Consumer social features or public profile portals beyond verification
- Broad citizen self-service functions beyond credential verification and account management
- Full production cloud deployment handoff without environment-specific configuration work

## 7. User journeys

### UJ-1: Institution administrator sets up a new institution

1. An institution administrator logs into the platform.
2. The administrator creates or activates an institution profile.
3. Role assignments are applied to institution users.
4. The institution becomes authorized for credential workflows.
5. The institution enters operational use with audit logging enabled.

### UJ-2: Issuer creates and issues a credential

1. An issuer logs in with institutional authorization.
2. The issuer verifies the student record exists and is valid.
3. The issuer creates a credential record and submits supporting data.
4. The credential is processed, pinned, and hashed.
5. The proof is issued on the blockchain registry and recorded in the system.
6. The credential moves to an active or pending lifecycle state based on checks.

### UJ-3: External verifier checks a credential

1. A verifier submits a file, hash, credential ID, or public token.
2. The platform validates the submitted data.
3. The system confirms if the credential exists, is valid, and has not been revoked.
4. The verifier receives a safe verification result without unnecessary sensitive metadata.

### UJ-4: Platform operator monitors health and recovery

1. An operator checks health endpoints, metrics, and logs.
2. They review failing states, audits, or degraded infrastructure.
3. They investigate database, IPFS, or blockchain issues.
4. They run backup, restore, or recovery procedures under controlled conditions.

## 8. Functional requirements

### FR-1: Authentication and security

- The system shall support secure authentication using cookies and JWT-based session enforcement.
- The system shall enforce role- and institution-based access control for protected operations.
- The system shall reject unsafe or untrusted environment configurations before runtime use.

### FR-2: Institution management

- The system shall support institution creation, activation, and deactivation.
- The system shall associate users and credentials with their institution correctly.
- The system shall prevent unauthorized institution operations across scopes.

### FR-3: Student management

- The system shall maintain student records with institution ownership.
- The system shall support updates and safe reassignment when permitted.
- The system shall prevent invalid or unauthorized student changes.

### FR-4: Credential lifecycle

- The system shall support credential creation, processing, activation, and revocation.
- The system shall validate credential inputs and required fields before processing.
- The system shall exercise IPFS upload and blockchain issuance when configured.
- The system shall track credential status changes with audit records.

### FR-5: Verification

- The system shall allow verification by file, hash, credential ID, or public token.
- The system shall compare credential validity against stored state and blockchain state.
- The system shall surface revocation or inconsistencies safely and clearly.

### FR-6: Audit and dashboarding

- The system shall record sensitive operational activity using controlled audit logging.
- The system shall provide dashboard summaries for key institutional and system metrics.
- The system shall expose health, metrics, and operational visibility in a protected manner.

### FR-7: Deployment and operational reliability

- The system shall support Dockerized local and environment-specific deployment.
- The system shall enforce migration safety and fail-closed restore behavior.
- The system shall provide structured logs, health checks, and operational monitoring.

## 9. Non-functional requirements

### NFR-1: Security

- Secrets must be stored outside the repository and never committed.
- Role boundaries must be enforced in the backend and route layer.
- Sensitive data must be minimized in logs and persistence.

### NFR-2: Reliability

- The system must fail safely when database, IPFS, or blockchain services are unavailable.
- Recovery and restore flows must be explicit and guarded against destructive mistakes.
- Health checks must expose readiness and liveness clearly.

### NFR-3: Maintainability

- Business logic must remain separated from routing and validation layers.
- Operational configuration must be environment-driven and documented.
- Scripts and migrations must be versioned and executable in a repeatable way.

### NFR-4: Performance and observability

- The system must support metrics and operational diagnostics.
- The system must provide request correlation and logging for operational debugging.
- The system must support bounded queries and safe pagination for larger datasets.

## 10. Success metrics

- Credential verification is available through standardized public routes
- Audit logs record the key actions of administrators, issuers, and verifiers
- Institutions can safely create and manage authorized users and credential workflows
- Verification and revocation outcomes are consistent with blockchain and stored metadata
- The platform remains deployable and observable in local and containerized operational environments

## 11. Risks and constraints

- Configuration and secrets management is a major operational dependency
- Blockchain and IPFS require correct network and provider configuration
- Local DB and chain setup can produce misleading errors if service ordering is not respected
- The project is broad and layered, increasing integration risk across frontend, backend, blockchain, and infrastructure areas
- Production hardening still depends on environment-specific validation and operational discipline

## 12. Open questions and assumptions

### Open questions

- Which institutions and credential classes are the first live users?
- Which deployment target will be used for staging and production?
- What is the final approval and approval-chain policy for issuing institutions?
- What level of user self-service is required beyond the current admin and verifier flows?

### Assumptions

- [ASSUMPTION] The platform will be governed through institution-scoped roles and a central super-admin layer.
- [ASSUMPTION] Blockchain proofing is a requirement for trusted verification, not a purely optional feature.
- [ASSUMPTION] IPFS-backed document handling is acceptable as long as the stored proof remains minimal and secure.
- [ASSUMPTION] The platform will continue to rely on environment-managed secrets and explicit deployment controls.

## 13. Completion path

### Work already done

- Core backend API, routes, middleware, and validation structure are in place
- Role model and institution-based access controls are implemented
- Student and credential flows are implemented in the application logic
- Blockchain registry contract exists and supports issuance and revocation
- IPFS and health/metrics services are implemented
- Documentation and operational procedures are extensive and organized under docs/
- Docker orchestration and backup/restore workflows are defined

### Work still required for completion

- Finalize environment-specific production and staging secrets and network configuration
- Validate stack behavior end-to-end in a clean deployment environment
- Confirm operational defaults for production and staging against secure external infrastructure
- Complete deeper live verification of edge-case production scenarios and failure recovery paths
- Close any remaining residual gaps between docs and actual runtime behavior
- Establish a final rollout and release process for live institutional onboarding

### Completion status

The product is best described as a substantially implemented, governance-aware credential verification platform with strong foundations and clear operational intent. It is not yet a fully proven “go-live complete” system without environment-specific validation, final operational hardening, and rollout decisions.

## 14. Next recommended actions

1. Validate the environment configuration for staging and production against secure infrastructure.
2. Run a clean end-to-end verification flow from institution creation through credential issuance and public verification.
3. Confirm the production operational model for blockchain, IPFS, redis, and database hosting.
4. Review the remaining operational and security gaps against docs and runtime evidence.
5. Proceed to architecture and UX specification handoff for final hardening and user-facing refinement.

## 15. Related artifacts

- Backend API: backend/
- Frontend app: frontend/
- Smart contract: contracts/CredentialRegistry.sol
- Deployment config: docker-compose.yml
- Operational documentation: docs/
- Security and environment guidance: README.md and docs/
