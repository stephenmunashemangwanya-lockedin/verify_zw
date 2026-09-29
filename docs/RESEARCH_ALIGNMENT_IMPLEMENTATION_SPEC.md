---
title: 'VerifyZW dissertation alignment without architectural replacement'
type: 'feature'
created: '2026-09-21'
status: 'in-progress'
baseline_commit: 'd3144e85453bf1efcc69e78026b5ed787684fb87'
review_loop_iteration: 0
context: ['docs/RESEARCH_ALIGNMENT_GAP_ANALYSIS.md', 'C:/Users/HYDRA/.codex/attachments/03d7e34f-c4f1-421d-9100-bd5b4f71a423/pasted-text.txt']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The working prototype has methodology gaps in strict trust evaluation, holder/regulator boundaries, supersession presentation and reproducible research tooling. Existing tests do not cover all acceptance conditions.

**Approach:** Reuse existing services and endpoints, close demonstrated gaps with focused changes, and add isolated evaluation tooling. Preserve the working React/Node/PostgreSQL/IPFS/Solidity architecture and branding. The complete attached brief remains the acceptance source; the gap report records inspection findings.

## Boundaries & Constraints

**Always:** VALID requires valid signature, matching anchor, active fresh status and accreditation at award date. Preserve data, immutable proofs, existing QR/PDF functionality and unrelated untracked files. Keep branch feature/certificate-security. Use targeted tests followed by complete regression; report actual results.

**Ask First:** Stop the affected subtask if destructive migrations or architectural replacement prove necessary. Never conceal a blocked integration or fabricate research evidence.

**Never:** Rewrite migrations 000–011, replace/redeploy the existing Sepolia registry, expose secrets, enable public evaluation switches, reset user data, run the full benchmark before freeze, or stage unrelated files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior | Error handling |
|---|---|---|---|
| Full trust | ACTIVE and every trust condition passes | VERIFIED | Dependency uncertainty fails closed |
| Lifecycle | REVOKED / SUPERSEDED / FAILED | Corresponding non-valid classification | No reactivation or evidence overwrite |
| Freshness | Status older than 24 hours or malformed | STATUS_INDETERMINATE | Never VERIFIED |
| Holder access | Linked A requests B or administrative operation | Denied in UI and API | No protected data leakage |
| Regulator | Accreditation operation / issuer operation | Allowed / denied | Account administration remains technical admin |
| PDF | Unknown PDF / altered claimed PDF | UNKNOWN / TAMPERED | Preserve identity distinction |
| Comparator | Internal full/no-anchor paired verification | Same work except anchor retrieval/comparison | No public bypass |

</frozen-after-approval>

## Code Map

- `backend/services/verificationService.js`: central proof, anchor, accreditation and status classification; reuse injected verificationTime.
- `backend/services/structuredCredentialService.js`, `credentialProofService.js`, `statusListService.js`: payload, canonicalization, signature and signed status reuse points.
- `backend/controllers/credentialController.js`, `credentialLifecycleController.js`, `backend/models/credentialModel.js`: issuance evidence, FAILED handling, guarded lifecycle transitions.
- `backend/controllers/studentController.js`, `backend/models/studentModel.js`, `backend/middleware/authMiddleware.js`: existing linking and current-user ownership boundaries.
- `backend/constants/roles.js`, `backend/routes/`, `backend/controllers/userController.js`: role and route enforcement; dashboard summary requires explicit restriction.
- `backend/database/migrations/007_student_account_ownership.sql`: read-only ownership evidence; 000–011 are immutable.
- `frontend/src/pages/Management.tsx`, `Accreditations.tsx`, `MyCredentials.tsx`, `App.tsx`, `layouts/AppLayout.tsx`: existing management, holder pages and navigation.
- `scripts/performance/runPerformance.js`, `scripts/recoveryUtils.js`, `test/`: reuse patterns, not final dissertation comparator.
- `contracts/CredentialRegistry.sol`: read-only on-chain privacy/schema evidence.

## Tasks & Acceptance

**Execution:**
- [ ] `backend/services/verificationService.js`, `structuredCredentialService.js`, `statusListService.js` — enforce all explicit trust predicates, schema/row binding and 24-hour age; preserve lifecycle/PDF semantics.
- [ ] `backend/models/credentialModel.js`, `backend/controllers/credentialController.js`, `scripts/reconcileBlockchainCredentials.js` — guard transitions, preserve FAILED evidence, correct failure audit attribution and structured-proof recovery.
- [ ] `backend/routes/dashboardRoutes.js`, `frontend/src/App.tsx`, `layouts/AppLayout.tsx`, `pages/Management.tsx` — close holder route/aggregate gaps and expose existing linking safely.
- [ ] `backend/database/migrations/012_regulator_role.sql`, role/auth/user/accreditation routes/controllers/models, frontend types/pages — add regulator without issuer/wallet powers; safe metadata amendment and scoped history.
- [ ] `frontend/src/pages/Management.tsx`, `AuthPages.tsx`, `PublicPages.tsx` — supersession selector/confirmation/relationships, neutral login wording, PDF explanation and bounded blockchain-write timeouts.
- [ ] `scripts/evaluation/` — deterministic generator, common-path full/no-anchor runner, correctness/export/performance commands, failure/availability trials, read-only recovery snapshots and synthetic privacy evidence. Reset only dedicated fixtures.
- [ ] `test/` and `frontend/src/test/` — extend positive/negative ownership, regulator, lifecycle, freshness, QR/PDF, generator, isolation and timing tests; investigate existing failures without weakening assertions.
- [ ] `docs/` and API documentation — reproducible commands, A–T completion report, limitations and wording alignment; final explicit-file logical commits and push only authorized branch after checks.

**Acceptance Criteria:**
- Given any failed or indeterminate trust condition, when publicly verified, then the credential is never VERIFIED.
- Given linked synthetic accounts A/B, when authenticating and accessing credentials, then each sees its own records and cannot access the other's protected detail/PDF or administrative actions.
- Given a regulator account, when managing accreditation, then allowed operations are audited while issuer, key and account administration are denied.
- Given an eligible original/replacement, when correction is confirmed, then the original becomes SUPERSEDED, the replacement remains independently ACTIVE, and original proofs/history remain intact.
- Given seed 20260905, when regenerating, then the same 1000 base records, 50 correction pairs and 200 prescribed scenarios result, with no real personal data.
- Given internal paired modes, when executing a small smoke run, then actual timing and outcomes export with request/scenario IDs, mode, concurrency, run, timestamps, total/RPC timing and safe errors.
- Given fault, outage or restart experiments, when captured, then observed evidence supports the result without destructive resets or invented live-service claims.

## Spec Change Log

## Review Triage Log

## Verification

Run targeted tests after each area. At completion run `npm run test:backend`, frontend `npm test -- --run` and `npm run build`, `npm run test:contract`, `npm run test:migration`, migration-bootstrap tests, `npm run docs:validate`, available integration checks and evaluation smoke. Record exact failures/skips and environment limitations. Freeze only after required checks and evidence are complete; record the full final Git revision as RESEARCH_EVALUATION_REVISION.
