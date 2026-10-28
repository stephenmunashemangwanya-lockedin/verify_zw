# Implementation context and source inventory

This companion supports the whole-system PRD dated 2026-10-02. Paths below are relative to the repository root. It records technical context without treating implementation presence as release acceptance.

## System composition

The repository contains a React/TypeScript frontend; a Node.js/Express API; PostgreSQL records and versioned migrations; Solidity/EVM credential registry integration through a configured RPC and signer; IPFS evidence storage; optional Redis-backed controls; email delivery; Docker/environment definitions; and operational/research scripts. Sepolia is referenced in current operational documentation. No runtime deployment was verified in this authoring run.

The frontend calls protected APIs for account and institution operations. The API validates the actor and institution, persists credential workflow state, produces structured signed evidence, interacts with IPFS and the blockchain registry, and publishes signed status evidence. Public verification evaluates these evidence sources and exposes a restricted result. The browser must not hold administrative signing secrets.

## Source inventory

| Area | Primary evidence |
| --- | --- |
| Routes and public/workspace screens | `frontend/src/App.tsx`, `frontend/src/layouts/AppLayout.tsx`, `frontend/src/routes/guards.tsx`, `frontend/src/pages/PublicPages.tsx` |
| Authentication and accounts | `frontend/src/pages/AuthPages.tsx`, `frontend/src/context/AuthContext.tsx`, `backend/constants/roles.js`, `backend/routes/authRoutes.js`, `backend/routes/userRoutes.js`, `backend/controllers/authController.js`, `backend/controllers/userController.js` |
| Institution and student administration | `frontend/src/pages/Management.tsx`, `backend/routes/institutionRoutes.js`, `backend/routes/studentRoutes.js`, related controllers/models, `docs/STUDENT_ACCOUNT_OWNERSHIP.md` |
| Holder and regulator workspaces | `frontend/src/pages/MyCredentials.tsx`, `frontend/src/pages/RegulatorDashboard.tsx`, `frontend/src/pages/Accreditations.tsx` |
| Accreditation | `backend/routes/accreditationRoutes.js`, `backend/controllers/accreditationController.js`, `backend/middleware/accreditationIssuanceMiddleware.js` |
| Credential workflow | `backend/routes/credentialRoutes.js`, `backend/controllers/credentialController.js`, `backend/controllers/credentialLifecycleController.js`, `backend/validators/credentialValidator.js`, `backend/middleware/uploadMiddleware.js` |
| Trust evaluation | `backend/controllers/verificationController.js`, `backend/services/verificationService.js`, `backend/services/structuredCredentialService.js`, `backend/services/credentialProofService.js`, status-list services |
| Presentation and storage | `backend/services/certificatePdfService.js`, `backend/services/qrCodeService.js`, `backend/services/ipfsService.js` |
| Registry and signing | `contracts/CredentialRegistry.sol`, `backend/services/blockchainService.js`, `backend/config/blockchainSigner.js` |
| Analytics, audit and operations | `backend/routes/dashboardRoutes.js`, `backend/routes/auditRoutes.js`, `backend/routes/verificationLogRoutes.js`, `backend/routes/healthRoutes.js`, `backend/routes/metricsRoutes.js` |
| Data model | `backend/database/schema.sql` and migrations `000`–`012`, especially ownership, trust lifecycle, trust results, structured proofs, signed lists and regulator-role migrations |
| API and integration contract | `docs/openapi.yaml`, `docs/API_REFERENCE.md`, `docs/postman/`, `frontend/src/api/client.ts`, `frontend/src/types/index.ts` |
| Quality evidence | `test/`, `frontend/src/test/`, package scripts, `docs/TESTING_STRATEGY.md`, release/UAT reports; reports require date and environment qualification |
| Performance and accessibility | `docs/PERFORMANCE_TEST_REPORT.md`, `docs/FRONTEND_PERFORMANCE_REPORT.md`, `docs/WCAG_MANUAL_REVIEW.md` |
| Recovery and hosting | `docs/RETENTION_POLICY.md`, `docs/RECOVERY_AND_RECONCILIATION.md`, staging runbooks, `PHASE_5_STAGING_REPORT.md` |
| Research | `scripts/evaluation/`, associated research tests, `docs/RESEARCH_ALIGNMENT_IMPLEMENTATION_SPEC.md`, `docs/RESEARCH_ALIGNMENT_GAP_ANALYSIS.md` |
| Historical baseline | `_bmad-output/planning-artifacts/prds/prd-Zimbabwe-Skill-Verification-Platform-2026-08-18/prd.md` |

## Reconciliation notes

The historical PRD predates the regulator and authenticated student model. Current code takes precedence where it differs from older narratives about institution creation, role authority or feature availability. Research gap-analysis documents also precede some current implementation; their missing-feature lists are not treated as current findings without source corroboration.

The main PRD covers six roles, every current page family, all backend route domains, credential lifecycle and trust outcomes, contract administration, operational services and research tooling. Archived controller copies, generated assets and backup artifacts are not independent product features.

## Verification performed for document creation

Inspected route definitions, role constants, relevant controllers/services, frontend routing and pages, test inventory and project documentation. Used separate source-extraction passes for frontend, backend and documentation, then reconciled findings. No application source code was changed. Fresh execution results are required before claiming current functional correctness or readiness.
