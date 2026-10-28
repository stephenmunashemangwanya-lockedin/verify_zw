---
title: 'Repair semantic PDF tamper localisation'
type: bugfix
created: '2026-10-22'
status: in-progress
baseline_commit: 1e40716f43d87365d0900ce3f149fbff1021a317
review_loop_iteration: 0
context:
  - 'C:/Users/HYDRA/.codex/attachments/8fbedb82-db80-42f1-b455-80f9524c03b2/Pasted text.txt'
---

<frozen-after-approval reason="Explicit user repair request authorizes implementation; approval reserved for commit/deploy">

## Intent

**Problem:** A name-only modified source certificate is correctly TAMPERED but returns no localised fields. An automated production controller reproduction now proves the exact prefix-name defect before product edits.

**Approach:** Compare each assessable semantic field against the authoritative source PDF using exact contextual field matching. Preserve field boundaries during extraction, handle overlapping values, and remain conservative where attribution is unsafe. Keep the common analyser used by all document routes.

## Boundaries & Constraints

**Always:** Preserve document-level mismatch classification, correct privacy behaviour, existing working-tree edits and untracked files. Reuse bounded safe baseline fetching. Missing baseline or ambiguous field attribution must never invent ALTERED fields. Record actual test output and calculated metrics.

**Ask First:** Commit, push, deployment or any contract change. These actions are not authorized.

**Never:** Change contracts, hash/signature semantics, source/presentation trust model, credential resolution, accreditation, lifecycle, RBAC, issuance, authentication or institution signing. Do not stage. Do not broaden scope to duplicate controller cleanup. Preserve Management.tsx and frontend/vitest.config.ts existing edits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Name only | Evaluation Student 001 becomes Altered Evaluation Student 001 | TAMPERED; only student_name ALTERED | No substring acceptance |
| Individual changes | institution_name, programme, qualification, student_number, issue_date, classification | Only deliberately changed field ALTERED | Explicit PDF field values |
| Overlap | Programme Computer Systems Engineering; qualification BSc Computer Systems Engineering | Independent field attribution | Ambiguity NOT_ASSESSABLE |
| Multiple | Name, programme, issue date changed | Exactly these three fields | No extra allegations |
| Absent baseline | DB institution EVALUATION never printed | NOT_ASSESSABLE | Never ALTERED |
| Missing DB | No official value | NOT_AVAILABLE | Never ALTERED |
| Equivalent dates | ISO, day/month/year, day-month-year, long GB/US | UNCHANGED | Compare date candidates exactly |
| Metadata only | Same visible fields, modified metadata | TAMPERED with no semantic alterations | Keep fallback UI |
| Unavailable baseline | Fetch/extraction fails | TAMPERED, availability information, no guessed fields | Existing limits retained |
| Unrelated PDF | No credential identity evidence | UNKNOWN | Resolution unchanged |
| Public routes | PDF-only, ID+PDF, token+PDF, QR-linked token PDF | Identical exact name-only localisation | Shared analyser |

</frozen-after-approval>

## Code Map

- `backend/services/tamperAnalysisService.js`: containsCandidate uses includes, accepts original name as substring of altered name; extractPdfTextFromBytes discards EOL. Baseline comparison exists but relies on substring presence. Legacy direct calls currently bypass baseline; reconcile tests with required baseline model rather than retaining unsafe behavior.
- `backend/services/pdfStructureAnalysisService.js`: fetchOfficialPdf is existing baseline fetch with timeout/size controls and structural-comparison flag; reuse and preserve semantics unless required to separate semantic availability. Do not expose secrets.
- `backend/services/pdfCredentialResolutionService.js`: consumes extracted text; read-only, ensure retained identifiers work with newline extraction.
- `backend/controllers/verificationController.js`: PDF-only and shared claimed-file routes call analyseTamperedPdf; do not change verification logic.
- `frontend/src/pages/PublicPages.tsx`: existing alteredFields rendering and unavailable/empty fallback; inspect filtering to ALTERED only, no public correct values.
- `test/objectivePdfEvidence.test.js`: real PDFKit files and production controller/evaluator with in-memory baseline transport; exact evaluation-name regression added and executed before fix. Result TAMPERED/documentModified true passed, expected holder field failed against actual []. Existing unlabeled PDFs each use separate lines.
- `test/tamperBaseline.test.js`: existing unit fixtures flatten fields; update to representative boundaries if necessary, retaining intent. Search all callers of analyseSemanticChanges and update missing-baseline expectations deliberately.
- `test/publicVerification.test.js`, `frontend/src/test/public.test.tsx`: existing route/UI coverage, extend where necessary.

## Tasks & Acceptance

**Execution:**
- [ ] `backend/services/tamperAnalysisService.js` -- implement smallest safe baseline-aware exact/contextual comparison and line-preserving extraction; avoid wholesale rewrite.
- [ ] `test/objectivePdfEvidence.test.js`, `test/tamperBaseline.test.js` -- real PDF regression matrix, exact full field statuses, equivalent dates, absent/unavailable baseline, overlap/removal/ambiguity, shared paths. Calculate metrics from executed seven required semantic cases (six singles plus triple).
- [ ] `frontend/src/test/public.test.tsx`, optionally `frontend/src/pages/PublicPages.tsx` -- verify only ALTERED fields displayed, metadata fallback retained, no correct-value disclosure.
- [ ] `_bmad-output/implementation-artifacts/semantic-pdf-localisation-evidence.md` -- document root cause, before/after output, changed files, actual totals, metric numerators/denominators and limits; preserve baseline working tree inventory from git status.

**Acceptance Criteria:**
- Given each required controlled PDF, when production verification runs, then its exact changed-field set and all unchanged assessable statuses match expectations.
- Given all existing backend/frontend suites and frontend build, when executed, then report zero failures or explicitly investigate and resolve in-scope regressions without hiding unrelated failures.
- Given a real baseline unavailable or layout ambiguous, when localisation runs, then no accusation is inferred from DB absence alone.

## Spec Change Log

## Review Triage Log

## Design Notes

Before-fix command: node --test --test-concurrency=1 --test-name-pattern='evaluation name prefix' test/objectivePdfEvidence.test.js. Executed 1 test: 0 pass, 1 fail. Assertion actual [] versus expected [{field:'student_name',label:'Holder name',status:'ALTERED'}]. Assertion follows successful TAMPERED and documentModified checks. Product code was unchanged.

Explicit user instructions already authorize repair on the dirty tree and reserve approval for the end; no intermediate approval needed. User requests supersede generic workflow gates. Do not stage/commit. Synthetic evidence does not establish live deployment success.

## Verification

- `node --check backend/services/tamperAnalysisService.js`
- `node --test --test-concurrency=1 test/tamperBaseline.test.js test/objectivePdfEvidence.test.js test/publicVerification.test.js` plus discovered PDF/tamper suites
- `npm run test:backend` -- all tests pass; baseline about 638, not fixed target
- Frontend targeted public/tamper tests then all files, isolated Vitest processes with `--pool=vmForks --maxWorkers=1 --fileParallelism=false` as needed -- all pass
- `npm --prefix frontend run build` -- production build pass
- Final `git status --short`, `git diff --stat`, `git diff`; confirm unrelated edits preserved and contracts untouched
