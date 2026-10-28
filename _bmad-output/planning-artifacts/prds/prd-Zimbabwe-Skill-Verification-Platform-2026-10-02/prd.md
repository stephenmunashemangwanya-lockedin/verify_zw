---
title: Zimbabwe Skill Verification Platform â€” Whole-System PRD
status: final
created: 2026-10-02
updated: 2026-10-02
basis: Current repository source, tests, and project documentation
approval: Product and production-release decisions remain open
---

# Zimbabwe Skill Verification Platform â€” Product Requirements Document

## 1. Purpose and status

VerifyZW supports institutions issuing academic and skills credentials, holders accessing their credentials, and employers or other verifiers checking authenticity. This PRD describes the entire system represented in the repository: public website, authenticated workspaces, APIs, credential evidence, blockchain registry, storage, accreditation, administration, reporting, and operations.

This is a repository-based requirements baseline dated 2026-10-02. It preserves the historical August PRD and incorporates subsequent capabilities. Source inspection establishes that implementation exists; it does not establish that every capability passes tests or is deployed. No application tests or hosted acceptance checks were run to produce this document.

**Critical boundaries:** accreditation records are simulated research evidence, not a live regulator feed. Blockchain wallet authorization is separate from accreditation. Production readiness and official standards conformance are not established by this PRD. An issuance-screen integration gap is recorded in Section 13.

Requirement wording defines expected behavior. Sections 5â€“8 describe capabilities supported by repository evidence; release gates and proposed targets are explicitly identified. The PRD is intended for the project owner, developers, testers, institutional stakeholders, and operators.

## 2. Product vision and scope

The product aims to reduce credential forgery and manual verification effort by binding credential details to signed evidence and a blockchain anchor, then presenting an understandable verification result. It must preserve the distinction between authentic evidence, revoked or replaced credentials, missing records, and unavailable evidence.

The complete scope includes controlled account provisioning; institution and student administration; effective-dated accreditation; issuance, presentation, revocation and supersession; public verification; student ownership; role-specific dashboards; audit records; security; monitoring; recovery; and research evaluation tooling.

The core release is the complete trust journey: an authorized institution issues a credential for the correct student, the holder accesses it, a third party verifies it, and later revocation or correction remains visible. Supporting governance and recovery are release dependencies, not optional reporting extras.

Outside the evidenced scope are payments, subscriptions, recruitment matching, course delivery, automated skills testing, native mobile applications, public account registration, live national-regulator integration, and guaranteed interoperability with external credential wallets. Adding these requires a separate product decision.

## 3. Users and authority

| Actor | Job and permitted scope |
| --- | --- |
| Public visitor / employer | Learn about the service and verify shared credential evidence without an account. |
| Super administrator | Govern users and institutions across the platform; manage institution blockchain authorization; manage credentials and inspect platform activity. Read accreditation and its history, but do not mutate it. |
| Regulator | Maintain simulated accreditation records and inspect their history through a dedicated workspace. No credential issuance or credential-management authority. |
| Institution administrator | Manage permitted users, students, credentials and activity within the assigned institution; revoke credentials and link student accounts. |
| Issuer | Create or update students, issue credentials and supersede credentials within the permitted institution. Cannot revoke credentials or administer accreditation. |
| Verifier | Read permitted student/credential information and verification analytics; perform verification without issuance authority. |
| Student | Access only credentials connected to the student's explicitly linked account, including permitted details and PDF downloads. |

Institution administrators may provision issuer, verifier and student accounts in their own institution. Institution creation and institution reassignment are super-administrator capabilities. The server must enforce scope independently of frontend navigation.

## 4. Vocabulary and principal journeys

**Credential:** a recorded qualification or skill award with immutable evidence and lifecycle status. **Certificate PDF:** the uploaded document or generated presentation document; possession alone does not prove validity. **Anchor:** blockchain evidence binding the registered commitment to an issuer. **Structured proof:** signed, canonicalized credential data bound to the recorded award. **Status list:** signed, time-bounded evidence used to determine current credential status. **Accreditation:** effective-dated simulated permission for an institution or programme to award a qualification. **Supersession:** replacement of a credential while preserving the original and its history. **Public token:** an opaque identifier used in a shareable verification link or QR code. **Ownership link:** the explicit relationship between a student record and an authenticated student account.

The following are source-derived workflow scenarios, not interview findings. [ASSUMPTION A1: Fictional names illustrate existing flows; no user research is claimed.]

- **UJ-1 â€” Institution onboarding:** Tariro, the super administrator, creates an institution, provisions its staff, and checks operational status and wallet authorization. Rudo, the regulator, records the relevant simulated accreditation independently. Staff can issue only when applicable prerequisites pass.
- **UJ-2 â€” Issuance:** Tendai, an issuer, selects a student, supplies qualification and date information, and uploads a PDF. The system validates scope and accreditation, creates signed evidence, stores it and anchors it. Tendai receives an active result or a recorded processing/failure state; an incomplete transaction must not appear valid.
- **UJ-3 â€” Holder access:** Nyasha signs in with a student account explicitly linked to the student record, opens My Credentials, and views or downloads a permitted credential. An unlinked account or another student's identifier does not expose that student's documents.
- **UJ-4 â€” Public verification:** Farai, an employer, opens a QR link or submits a PDF, hash or identifier. The result states whether the credential is verified, revoked, superseded, unknown, altered, or not conclusively verifiable, together with limited supporting evidence.
- **UJ-5 â€” Correction:** Tendai issues an active replacement for the same student and institution, then supersedes the original with a reason. Farai subsequently sees the original as superseded. For invalidation without replacement, an authorized administrator revokes an active credential with a reason.
- **UJ-6 â€” Governance and recovery:** Rudo changes accreditation with an auditable history. Tariro investigates scoped activity and operational failures. An operator reconciles storage, database and blockchain records and proves recovery using an isolated restore procedure.

## 5. Functional requirements

Each numbered item includes an observable acceptance condition. IDs are stable references for future implementation and test work.

### 5.1 Public website and navigation

- **FR-01 â€” Public information.** Provide Home, About, Institutions, Privacy, Terms and Contact pages. Acceptance: each configured public route renders without login; informational copy must not imply a live regulator integration or functions absent from the backend.
- **FR-02 â€” Verification entry points.** Provide public verification and token-link routes, plus verification within the authenticated workspace. Acceptance: a public token URL opens the corresponding verification flow without requiring a staff account.
- **FR-03 â€” Role-aware workspace.** Show navigation and landing content appropriate to the authenticated role. Acceptance: restricted routes show a forbidden response or redirect, and unknown routes provide a recoverable not-found page.

### 5.2 Authentication and account management

- **FR-04 â€” Controlled provisioning.** Disable public self-registration and allow authorized administrators to create accounts. Acceptance: unauthenticated registration cannot create a user; institution administrators cannot create global administrators or regulators.
- **FR-05 â€” Sessions.** Support login, authenticated profile retrieval and logout using the configured session mechanism. Acceptance: invalid credentials fail, protected endpoints reject unauthenticated access, and logout clears the browser session.
- **FR-06 â€” Account security.** Apply password policy, failed-login controls, account activation checks and forced password changes. Acceptance: inactive or locked accounts cannot obtain ordinary access, and a required password change cannot be bypassed through direct API calls.
- **FR-07 â€” Password recovery.** Support forgot-password and token-based reset through the configured email channel. Acceptance: recovery responses avoid account enumeration; expired, invalid or reused reset tokens fail.
- **FR-08 â€” Profile maintenance.** Allow permitted profile edits and authenticated password changes. Acceptance: profile edits cannot alter role or institution; security changes invalidate stale authentication as required by the session policy.
- **FR-09 â€” User administration.** Support scoped listing, creation, details, profile updates, activation, unlocking, forced password change and authorized role changes. Acceptance: cross-institution requests are denied; only a super administrator can reassign institutional membership.

### 5.3 Institutions and students

- **FR-10 â€” Institution registry.** Allow super administrators to create institutions and change operational status; expose permitted read views. Acceptance: institution administrators cannot create institutions or change another institution's status.
- **FR-11 â€” Issuer wallet administration.** Allow super administrators to inspect, authorize and deactivate institutional blockchain wallets. Acceptance: the result distinguishes database operational status from actual blockchain authorization and reports transaction failures.
- **FR-12 â€” Student records.** Allow authorized staff to list, view, create and update student records within scope. Acceptance: required identity fields are validated and institution reassignment is restricted to the super administrator.
- **FR-13 â€” Student account linking.** Allow super administrators and institution administrators to link permitted student accounts to student records. Acceptance: unrelated or incompatible accounts cannot gain ownership through a forged identifier or institution mismatch.
- **FR-14 â€” Holder workspace.** Provide My Credentials, credential details and authorized PDF access for the linked student. Acceptance: an unlinked account receives an explicit empty/unlinked state; another student's credential is inaccessible through both list and direct-object routes.

### 5.4 Accreditation governance

- **FR-15 â€” Accreditation records.** Record institution-wide or programme-specific simulated accreditation with effective dates and status. Acceptance: invalid date ranges and invalid institution references are rejected; the source is explicitly labeled simulated.
- **FR-16 â€” Separation of duties.** Only the regulator can create accreditation records, amend metadata or change accreditation status. Acceptance: super administrators have read/history access but mutation requests fail.
- **FR-17 â€” Accreditation history.** Preserve an inspectable history for regulators and super administrators. Acceptance: a status or metadata amendment is attributable and does not silently erase the previous state.
- **FR-18 â€” Award-date gate.** Check applicable accreditation at the award date during issuance and verification. Acceptance: technical wallet authorization alone cannot satisfy accreditation; an invalid accreditation result prevents verified status.

### 5.5 Credential issuance and evidence

- **FR-19 â€” Issuance input.** Accept an authorized student/institution, qualification, issue date, optional award date and PDF from super administrators, institution administrators or issuers. Acceptance: award date cannot exceed issue date; scope and active-institution checks run before successful issuance. The active frontend's separate award-date control remains a gap in Section 13.
- **FR-20 â€” Upload protection.** Validate filename, PDF extension, MIME type, file signature and configured size limit. Acceptance: invalid or oversized files are rejected and temporary files are cleaned up; issuance and verification default limits are 10 MB each in current source.
- **FR-21 â€” Structured evidence.** Produce signed credential data bound to the recorded metadata and commitment. Acceptance: altered signed metadata or an invalid proof does not evaluate as VERIFIED.
- **FR-22 â€” Storage and anchoring.** Store evidence through IPFS and record the corresponding blockchain anchor, CID and transaction reference. Acceptance: successful completion links these artifacts to the credential; dependency failure is recorded rather than reported as active success.
- **FR-23 â€” Processing states.** Preserve pending, processing, active and failed states. Acceptance: a processing or failed credential cannot be presented as VERIFIED, and operators can identify incomplete work for reconciliation.
- **FR-24 â€” Credential retrieval.** Provide authorized paginated lists and credential detail with supported search/filter controls. Acceptance: access remains institution- or owner-scoped even when callers supply arbitrary filter or credential identifiers.
- **FR-25 â€” Sharing and presentation.** Generate public verification tokens/QR codes and support presentation-PDF generation and authorized download. Acceptance: a QR code resolves to verification; the public result does not grant unrestricted PDF access. Current generation support includes active and revoked credentials, whose displayed status must remain clear.
- **FR-26 â€” Signed status publication.** Publish signed status evidence needed for verification and update it as lifecycle changes require. Acceptance: missing, invalid or stale status evidence cannot yield VERIFIED.

### 5.6 Revocation and supersession

- **FR-27 â€” Revocation.** Permit super administrators and institution administrators to revoke an eligible active credential with a reason. Acceptance: issuers and students cannot revoke; original evidence remains inspectable and subsequent verification reports revocation.
- **FR-28 â€” Supersession.** Permit super administrators, institution administrators and issuers to supersede an active credential using an active replacement for the same student and institution. Acceptance: mismatched or inactive replacements fail; replacement ID, reason and timestamp are preserved.
- **FR-29 â€” Historical integrity.** Preserve original credential evidence through lifecycle transitions. Acceptance: correction links a replacement rather than rewriting the original signed award; failed and superseded records remain distinguishable from active credentials.

### 5.7 Verification and trust results

- **FR-30 â€” Multiple verification methods.** Verify by PDF, hash, credential ID or public token; support comparison of a supplied PDF against a specified credential/token. Acceptance: each supported route invokes the common trust evaluation appropriate to the submitted evidence.
- **FR-31 â€” Verified predicate.** Return VERIFIED only for an active credential with valid bound structured proof, matching commitment and issuer anchor, valid award-date accreditation, fresh valid non-revoked status evidence, and required CID/transaction references. Acceptance: independently breaking any required condition prevents VERIFIED. Current IPFS availability is reported separately and is not itself required to be true for VERIFIED.
- **FR-32 â€” Explicit outcomes.** Preserve the distinct outcomes in Section 6. Acceptance: an unavailable dependency or inconsistent record never silently becomes a valid credential; API and UI distinguish credential lifecycle from verification outcome.
- **FR-33 â€” File comparison semantics.** Distinguish an unknown standalone PDF from a mismatched PDF asserted against a known credential. Acceptance: the former is UNKNOWN and a confirmed targeted mismatch is TAMPERED.
- **FR-34 â€” Minimal disclosure.** Return limited credential metadata, masked student number, verification time and relevant trust evidence. Acceptance: public responses do not disclose private account data, unmasked student numbers or unrestricted stored documents.
- **FR-35 â€” Abuse protection and records.** Apply separate configured limits to general, token and file verification and record verification activity. Acceptance: excessive requests receive a rate-limit response and scoped administrative records remain available without exposing secrets.

### 5.8 Dashboards, search and audit

- **FR-36 â€” Staff analytics.** Provide role-permitted summaries, recent activity, credential and verification trends, frequently verified credentials and failure views. Acceptance: verifiers receive only their narrower permitted analytics; global top-institution and system-health views remain super-administrator-only.
- **FR-37 â€” Dedicated workspaces.** Use student and regulator workspaces suited to ownership and accreditation duties. Acceptance: these roles do not receive ordinary staff dashboard API access merely because they can authenticate.
- **FR-38 â€” Search and pagination.** Provide validated bounded pagination, filtering and sorting on supported listings, including relevant date filters. Acceptance: unsupported or malformed query values fail safely and filters cannot bypass scope.
- **FR-39 â€” Audit records.** Record material account, administrative and credential actions with actor, target, time and relevant outcome. Acceptance: super administrators and institution administrators can inspect only their permitted audit scope; ordinary users cannot alter audit history.
- **FR-40 â€” Verification history.** Provide scoped verification-log listing and filtering to authorized administrators. Acceptance: institutional viewers cannot retrieve another institution's private activity through direct API queries.

### 5.9 Operations and research support

- **FR-41 â€” Health and monitoring.** Expose public health/liveness/readiness and protected detailed dependency status; provide configured protected metrics. Acceptance: public health responses omit secrets and privileged infrastructure detail, and dependency failure can be diagnosed through protected channels.
- **FR-42 â€” Recoverability.** Support documented database backup/restore, IPFS recovery and blockchain reconciliation. Acceptance: restore rehearsals use explicitly isolated targets and reconcile database records against external evidence before a release is accepted.
- **FR-43 â€” Configuration and API documentation.** Validate required environment settings and maintain documented API contracts. Acceptance: invalid critical configuration prevents unsafe startup; optional API documentation exposure follows environment policy.
- **FR-44 â€” Contract administration.** Support contract-level institution authorization, issuance/revocation, public evidence queries and administrator pause/unpause. Acceptance: unauthorized callers cannot invoke privileged contract actions. Pause/unpause is an operator/contract capability; no end-user management screen is promised.
- **FR-45 â€” Research evaluation.** Maintain deterministic synthetic data generation, smoke/formal verification runs and result summaries. Acceptance: output identifies scenarios, run conditions and failures; synthetic or mocked results are labeled and cannot be represented as live-network measurements. Internal comparison modes must not expose a public trust-check bypass.

## 6. Credential and verification states

Stored credential states are **pending, processing, active, failed, revoked, superseded**. Accreditation states are **accredited, suspended, revoked**. These are distinct state models.

| Verification outcome | Product meaning |
| --- | --- |
| VERIFIED | All required trust checks pass. |
| UNKNOWN | No corresponding credential was identified. |
| PENDING | Credential processing is incomplete. |
| FAILED | Issuance failed. |
| REVOKED | Credential has been revoked. |
| SUPERSEDED | Credential has been replaced; preserve the replacement relationship. |
| TAMPERED | Submitted file does not match the specified credential. |
| SIGNATURE_INVALID | Required structured signature or its binding fails validation. |
| ANCHOR_MISMATCH | Anchored evidence does not match the expected commitment/issuer. |
| ACCREDITATION_INVALID | Award-date accreditation does not satisfy the evaluator. |
| STATUS_INDETERMINATE | Current status cannot be established from acceptable evidence. |
| SYSTEM_INCONSISTENCY | Evidence or system records conflict. |

The interface must explain these outcomes without reducing them to an ambiguous green/red badge. Legacy proof records do not automatically satisfy the current structured-proof predicate. A hash demonstrates a binding, not anonymity, accreditation, or independent proof that a person possesses a skill.

## 7. Information and integration requirements

Core records comprise users, institutions, students and ownership links; credentials and evidence references; accreditation and amendment history; signed status lists; verification events; audit events; and migration history. Preserve relationships among credential, student, issuer institution, signing evidence, anchor and replacement credential. Protect security fields and recovery tokens from ordinary read responses.

External dependencies include the database, blockchain RPC/registry/signer, IPFS pinning and retrieval, email delivery, distributed rate-limit storage where configured, and monitoring/alerting. Each dependency needs environment-specific credentials and a documented failure/recovery path. An approved provider plan is not proof that credentials, service access, or deployment are operational.

Public information pages and the Contact page are frontend surfaces; do not infer a public institution-directory API or working contact-message delivery solely from a page's existence. Detailed runtime/component choices and evidence paths are recorded in the accompanying addendum.

## 8. Non-functional requirements

| ID | Requirement and acceptance evidence |
| --- | --- |
| NFR-01 Security | Server-side current-user role and institution checks on every protected action; cookie/session, CSRF and origin policies tested; injection, unsafe file and direct-object-access tests pass. Secrets must be absent from logs and public errors. |
| NFR-02 Privacy | Public output follows FR-34; uploads and backups have restricted access. Document the personal data held on persistent storage before production use. No claim that hashing anonymizes data. |
| NFR-03 Accessibility | Target WCAG 2.2 AA, including keyboard operation, focus management, labels, status announcements, contrast, reduced motion and 320px reflow. The current dashboard supplies chart data tables; complete actual screen-reader acceptance for charts and the wider interface. Historical automated results alone are insufficient. |
| NFR-04 Frontend performance | Preserve the documented 500 kB initial JavaScript entry budget and route isolation. A release build supplies measured evidence against the configured budget. |
| NFR-05 API performance | Use the proposed staging budgets below as candidates pending owner approval; measure the actual target environment and distinguish provider latency from application latency. |
| NFR-06 Trust freshness | Research requirements specify a maximum signed-status age of 24 hours. Verify deployed configuration and stale-evidence behavior; older or unverifiable evidence must not produce VERIFIED. |
| NFR-07 Reliability | Failure of storage, RPC, signing or status publication must produce an explicit failed/pending/indeterminate result and a recoverable record. Reconciliation must not create duplicate or contradictory valid credentials. |
| NFR-08 Observability | Correlate operational logs, request outcomes and dependency failures without exposing passwords, tokens or private evidence. Demonstrate protected metrics and delivery of configured alerts. |
| NFR-09 Recovery | Prove a backup restore and external-evidence reconciliation in an isolated environment. Production recovery time and recovery point objectives remain owner decisions; no uptime SLA is implied. |
| NFR-10 Retention | The documented prototype defaults are daily backups for 14 days, weekly for 8 weeks and monthly for 12 months. Retention tooling defaults to dry run, preserves recent manifest-backed backup evidence, and must not delete audit records. Production retention requires explicit policy approval. |
| NFR-11 Quality and delivery | Run applicable backend, frontend, contract, integration, browser, accessibility, security, build and migration checks for the release candidate. Record commit, environment and results; script presence is not passing evidence. |
| NFR-12 Maintainability | Keep schema migrations, API documentation, role contracts and recovery runbooks consistent with behavior. Reject migration integrity errors and validate forward deployment and rollback procedures. |

**Proposed staging performance budgets from project documentation:** health p95 under 100 ms at 100 clients; public verification p95 under 120 ms at 25 clients with under 0.5% errors; profile p95 under 100 ms at 25 clients; paginated lists p95 under 300 ms and substring search under 650 ms at 10 clients; dashboard p95 under 150 ms at 10 clients; valid login p95 under 1,750 ms at 10 clients with under 1% errors, excluding expected rate-limit responses. A five-minute moderate soak should show no connection failures/timeouts or persistent resource growth. These are proposed budgets, not contractual SLAs. Historical synthetic tests used mocked external dependencies and do not establish hosted or live blockchain performance.

## 9. Success measures

Business targets have not been approved. Measure the following in a controlled pilot before assigning adoption or cost-reduction commitments.

| ID | Measure | Counter-metric / qualification |
| --- | --- | --- |
| SM-1 | Percentage of valid issuance attempts reaching a consistent active state; record failure category and completion time. Supports FR-19â€“26. | Track duplicate anchors, orphaned evidence and incorrect active states; issuance throughput alone is insufficient. |
| SM-2 | Correct classification across verified, revoked, superseded, altered, unknown and dependency-failure scenarios. Supports FR-30â€“35. | Release gate: zero false VERIFIED results in the approved negative-case suite; also report false rejection and indeterminate rates. |
| SM-3 | Completion rate and elapsed time for holders accessing their own credentials and employers completing verification. Supports FR-14 and FR-30. | Record abandonment, accessibility failures and privacy exposure alongside completion. |
| SM-4 | Successful prevention of cross-institution and cross-student access. Supports FR-09â€“14 and FR-39â€“40. | Release gate: no unauthorized access in the agreed access-control suite; report legitimate requests wrongly denied. |
| SM-5 | Recovery rehearsal completion time and reconciled-record completeness. Supports FR-42. | Report data loss, unresolved contradictions and stale status evidence; speed does not compensate for incorrect recovery. |

## 10. Release acceptance and rollout

The following is a proposed release sequence, not evidence that deployment has occurred. [ASSUMPTION A2: A controlled institutional pilot precedes broader production access.]

1. **Baseline and integration:** reconcile frontend/API contracts, resolve the active issuance form gap, confirm all six roles and document remaining limitations.
2. **End-to-end acceptance:** demonstrate institution onboarding, accreditation, student linking, issuance, holder access, public verification, revocation, supersession and account recovery. Include tampered files, stale status, invalid signatures, unauthorized access and provider failure cases.
3. **Hosted staging evidence:** confirm real provider authentication, email delivery, distributed rate limiting, alerts, signer permissions, TLS/session behavior, measured performance and isolated restore. Record deployed revisions and evidence locations.
4. **Pilot approval:** project owner and institutional representatives accept workflow usability; security/operations owners accept access controls and recovery; the accreditation stakeholder approves how simulated evidence is communicated.
5. **Production decision:** resolve Section 12 launch decisions, complete required evidence and explicitly approve the intended deployment and data policy.

Historical staging documents approve a Render/Sepolia direction but also record account-access and secret blockers. Later documents reference a Sepolia registry. Neither statement proves the current full deployment is ready; verify runtime state before release.

## 11. Risks and mitigations

| Risk | Required treatment |
| --- | --- |
| Simulated accreditation mistaken for official endorsement | Label it in regulator views, user explanations and release materials; establish the governance model before real institutional claims. |
| Blockchain authorization mistaken for accreditation | Preserve independent controls and award-date evaluation. |
| Partial completion across database, IPFS and chain | Record intermediate/failure states, retain evidence and reconcile before presenting success. |
| Revocation or correction not reflected in verification | Publish acceptable status evidence and test revoked/superseded paths end to end. |
| Privacy exposure through shared links or persistent storage | Minimize public fields, enforce owner/scope checks, review persistent-data policy before production. |
| Issuer signing key compromise | Establish key custody, rotation, incident response and impact review before hosted release. |
| Historical reports treated as current test proof | Require release-specific results with revision and environment; distinguish mocked and live providers. |
| Frontend feature exists but is not routed | Validate actual route-to-component behavior and source requirements from active flows. |

## 12. Open decisions and assumptions

These do not block delivery of this document, but the launch decisions block an unqualified production recommendation.

| Decision | Owner role | Revisit condition |
| --- | --- | --- |
| Confirm pilot institutions, audience size, adoption and turnaround targets | Project/product owner | Before pilot planning and success-target approval. |
| Define authority and process for real accreditation, if intended | Product owner and accreditation stakeholder | Before claiming official endorsement or importing real regulator data. |
| Approve hosting budget, actual provider accounts, signer custody and service ownership | Project owner and operations lead | Before hosted acceptance. |
| Approve uptime, RPO/RTO, incident responsibilities and support hours | Operations lead | Before production sign-off. |
| Approve personal-data handling, public disclosure, retention and deletion policy | Data-governance owner | Before processing production personal data. Applicable requirements need separate review. |
| Confirm interoperability objectives and external credential/status standards, if any | Product and technical owners | Before promising external wallet or standards compatibility. |
| Approve candidate performance budgets against actual pilot conditions | Product and engineering owners | Before performance release gating. |
| Resolve explicit award-date capture and default-date communication in the active issuance screen | Frontend and product owners | Before award-date-sensitive workflow acceptance. |

Assumptions index: **A1** fictional source-derived journey names, Section 4; **A2** controlled-pilot release sequence, Section 10. Both are documentation aids requiring owner confirmation, not user-research or deployment facts.

## 13. Known gaps and evidence limits

- The active `/app/credentials/new` route renders `CreatePage` from `Management.tsx`. The separate `IssueCredential.tsx` includes award-date/accreditation content but is not the routed issuance component. The active form exposes qualification, issue date and PDF without a distinct award-date control. Backend support must not be described as delivered explicit award-date UI.
- Historical accessibility documentation leaves actual screen-reader acceptance unresolved. Current dashboard code includes chart data-table alternatives, superseding the older missing-table note; fresh assistive-technology acceptance is still required.
- Historical readiness checks do not establish distributed rate-limit dependency health or real IPFS provider authentication; validate those separately with the actual release configuration.
- Prior staging, UAT and performance reports are historical. No new regression suite, provider probe, deployment or recovery rehearsal was performed for this PRD.
- Research scripts and tests exist, but their presence does not prove formal evaluation completion, live-network performance or standards interoperability.
- This document maps product capabilities, not every helper function, generated file or archived backup. The accompanying source inventory identifies the authoritative areas to inspect for implementation detail.


