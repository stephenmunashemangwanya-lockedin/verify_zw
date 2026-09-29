---
title: 'Phase 3 frontend and API reliability'
type: 'bugfix'
created: '2026-09-09'
status: 'in-progress'
baseline_commit: 'f27f4179890f4adcf568731ebc9db463da7a3a63'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="User-authorized Phase 3 scope; internal review required before implementation">

## Intent

Correct reproduced Super Admin frontend/API integration defects while preserving VerifyZW identity. Interactive Computer Use is unavailable; the user explicitly approved existing Playwright and synthetic E2E authentication as the browser-audit fallback. Never claim fixtures prove live authenticated API behavior.

## Boundaries & Constraints

**Always:** Preserve security validation, RBAC, ownership, CSRF and existing API contracts. Use real validators and response fields. Keep errors distinguishable from empty results. Make logical commits only after checks pass. Preserve the untracked Phase 2 spec.

**Ask first:** Schema, credential-lifecycle or authorization redesign.

**Never:** Docker changes, migrations (including 008), contracts, secret output, account resets, real-data seeding, unrelated refactors, new browser framework, skipped assertions, blanket timeout increases. No Phase 4 UAT.

## I/O & Edge-Case Matrix

| Input | Expected behavior |
|---|---|
| Nested dashboard counts containing zero | Labeled numerical zero cards; no invented data |
| Empty trend/top arrays | Widget-specific empty message |
| API failure | Visible error, never normalized to zero |
| Omitted valid query defaults | Controller receives validated defaults/coercions |
| Invalid sort/group/filter | Controlled 400; whitelist preserved |
| Audit action / credential status / verification result | Explicit domain value; no inferred entity state |
| Domain change after filtering/pagination | Reset query state; use only supported parameters |
| Verify mode change after error | Correct labels and current-mode feedback; no stale result |

</frozen-after-approval>

## Reproduction and Code Map

- `logs/phase3/source-before-*-*.png` and `source-before-audit.json`: Playwright capture of freshly built HEAD on preview port 4173. The Docker-served frontend differs from checkout; its images are not checkout evidence. Synthetic responses follow backend contracts; query fixtures execute actual middleware on the Express request prototype.
- `frontend/src/pages/Dashboard.tsx`: summary filters top-level numbers but `backend/models/dashboardModel.js:getSummary` returns nested groups. Screenshot shows empty summary despite valid counts. Credential rows have `period,issued,activated,failed,revoked`, not `total`; top rows have `institution_name,total_credentials`, not `period,total`. Verification series uses `period,total`. `backend/services/dashboardService.js` wraps trends in `{series,groupBy,dateFrom,dateTo}`; controller wraps all widgets in `{success,data,requestId}`. Axios therefore unwraps `.data.data` correctly. Recent activity is not currently rendered.
- `backend/middleware/validationMiddleware.js:8`: `Object.assign(req.query,result.data)` mutates a temporary Express 5 getter result. Actual-prototype reproduction: top schema gives `{limit:10,sortBy:totalCredentials}`, controller reads `{}`; trend loses `period,groupBy`. Invalid sort still returns 400. Controllers consistently consume `req.query`; no separate validated-query abstraction exists. Preserve this pattern by defining a validated per-request query value at the shared boundary.
- `backend/validators/dashboardValidator.js`, `docs/openapi.yaml`, `backend/controllers/dashboardController.js`, dashboard service/model: canonical sorts `totalCredentials/activeCredentials/totalVerifications/totalStudents`; groups `day/week/month`; omitted top sort must work. No validation relaxation or SQL changes needed.
- `frontend/src/pages/Management.tsx:columnsFor`: `r.status || r.result || r.isActive === false || r.is_active === false ? inactive : active` corrupts truthy statuses and assigns ACTIVE to audit events. Generic name/date sorts violate validators; generic status invalid for students/audit/verification; verification search rejected. Audit list fields remain snake_case; users are camelCase via `safeUser`.
- Domain contracts in `backend/validators/*Validator.js` and corresponding models/controllers: institutions name/email/boolean status; users fullName/email/role/isActive/institutionId; students full_name/student_number/programme/institution_name; credentials qualification/status/student_name/institution_name/issue_date; verification logs result_code/result/verification_method/credential_id/verification_time; audit action/entity_type/entity_id/created_at. Valid sort keys must come directly from each validator.
- Institution create currently sends unsupported `code`, omits required `walletAddress,email`; canonical create schema requires name/walletAddress/email and optional phone. Correct form and test submission without writing real records. Institution detail/edit has no current frontend route: do not invent one. Credentials should link existing detail route, not sort from row text.
- `frontend/src/pages/PublicPages.tsx`, `frontend/src/styles.css`: inspect public and workspace Verify with axe, mode-switch errors and keyboard controls. Change only demonstrated contrast/state defects, using existing tokens.
- `frontend/src/test/lazyRoutes.test.tsx`: baseline 90/91 (dashboard timeout), isolated 5/5; repeat full 91/91 and isolated 5/5. Timing under full-suite contention remains suspected, not a broken production route. Investigate heavy asynchronous chart import versus test deadline; retain actual route/navigation assertions and avoid raising timeouts.

## Routes, Roles and Dependencies

| Route | Component | Role gate | API |
|---|---|---|---|
| `/app` | Dashboard | authenticated; widget role gates | four `/dashboard/*` widgets above |
| `/app/institutions` | ManagementPage | super_admin | `/institutions` |
| `/app/users` | ManagementPage | super_admin/institution_admin | `/users` |
| `/app/students`, `/app/credentials` | ManagementPage | authenticated; backend RBAC | matching resource |
| `/verify`, `/app/verify` | VerifyPage | public / authenticated | hash, credential, token GET; file POST |
| `/app/verifications` | ManagementPage | authenticated; backend RBAC | `/verification-logs` |
| `/app/audit` | ManagementPage | super_admin/institution_admin | `/audit-logs` |
| `/app/profile` | Profile | authenticated | AuthContext `/auth/profile` |

## Tasks & Acceptance

- [ ] Fix query persistence and add actual Express HTTP integration tests for defaults, trims, coercions and invalid values; run backend regression.
- [ ] Explicit dashboard metric/series mappings, labeled zero states and accessible chart data; add widget contract tests, preserving error states.
- [ ] Explicit per-domain table columns, valid filters/sorts, route-state reset, credential links and institution creation contract; behavioral tests for populated/empty/error/loading and request parameters.
- [ ] Investigate lazy-route contention and apply a deterministic test-only fix only with evidence; run full frontend suite three times if changed.
- [ ] Correct browser-proven accessibility/Verify defects; add checks for both Verify routes, keyboard behavior and three viewport sizes.
- [ ] Repeat automated audit; run focused dashboard/management, frontend E2E, accessibility, production build, docs validation and backend tests. Existing E2E baseline is 32 pass/10 intentional non-desktop skips. Inspect visual differences before updating only intentional, spec-authorized affected snapshots.
- [ ] Review complete diff, confirm migration discovery 000–007, then create separate logical commits; root agent handles final validation/commits.

Given canonical valid API responses, every listed route must load correct values or a valid empty state. Given a failed request, show an error instead. Given unsupported parameters, backend rejects them before model execution. Given desktop/tablet/mobile viewports, controls remain named, keyboard-operable and readable with no unintended page overflow.

## Review Triage Log

- Internal review passed: spec follows actual envelopes/validators and preserves security; real Express HTTP tests required. `test/queryValidation.test.js` now reproduces four default/coercion/trim failures with four invalid-input checks passing before the fix.
- Completed populated preview audit: audit events and students invent active state; inactive institution becomes active; VERIFIED verification and revoked credential become inactive. Evidence: `logs/phase3/populated-before-audit.json` and screenshots.
- Authenticated Verify screenshot confirms dark subtitle and tab text on dark workspace background at all audited widths. Axe reports zero automated violations; gradient contrast requires visual/computed-color checks. Use scoped existing light tokens for subtitle/tabs/focus; preserve public Verify styling. Do not change Verify request/security semantics. Mode-error cleanup is conditional on focused reproduction.
- Lazy-route root cause remains unconfirmed after full 91/91 and isolated 5/5 reruns. Preserve existing lazy-route tests unless new evidence establishes a specific cause; no speculative timing correction.
- Implementation handoff: implement application fixes and focused tests only; root agent owns additional audit harness/E2E checks, full regressions, visual snapshot decisions and atomic commits.

- Verify mode-error reproduction completed on unchanged preview: submit invalid hash (synthetic 400), switch to Credential ID; `Validation failed.` remains in the new panel. Clear prior mode feedback and avoid late responses being displayed for another mode; add a focused regression.

## Verification

`npm run test:dashboard`; focused frontend files; `npm run test:frontend` three consecutive runs if reliability changed; `npm run test:e2e:frontend`; `npm run test:accessibility`; `npm run frontend:build`; `npm run docs:validate`; `npm run test:backend`; `git diff --check`. Final audit must record console/request failures and axe results; fixture limitations and any manual visual review remain explicit.
