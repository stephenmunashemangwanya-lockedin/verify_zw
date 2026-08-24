# Release test report — Stage 23

- Date: 2026-08-04 (Africa/Harare)
- Environment: Windows, Node 26.5.1, npm 11.17.0, PostgreSQL development instance, local Hardhat 31337
- Commit identifier: unavailable because repository Git metadata is not accessible in this workspace session
- Recommendation: **conditional / not yet production-ready**

## Results

Backend, frontend, documentation, Solidity, local blockchain, security, and build suites pass. Backend coverage is 65.54% lines/statements, 60.88% functions, and 73.82% branches. Frontend full-source coverage is 75.47% lines, 56.92% functions, 53.91% branches, and 60.43% statements. Contract coverage is 100% statements/functions/lines and 88.24% branches.

Passing automated assertions: 265 backend/documentation, 58 frontend, 36
Solidity, and 4 release-readiness checks (363 total), plus the self-contained
local-chain transaction scenario. Documentation validation found 50 documented
operations and passed its generated-artifact secret scan. The production build
and zero-warning frontend lint pass; the main JavaScript chunk is 826.10 kB
(252.92 kB gzip), with Vite's advisory code-splitting warning noted.

API E2E is skipped because no dedicated `TEST_DB_NAME` is provisioned. Browser E2E, axe accessibility execution, visual screenshots, and comparisons are skipped because the Playwright Chromium download did not complete and no executable exists. These are release gaps, not passes.

The final read-only development database check remained: users 1, institutions
1, students 1, credentials 0, verification_logs 0, and audit_logs 1. The local
Hardhat scenario used chain 31337 and an isolated deployment, confirmed real
transactions, found the proof on-chain, and left it unrevoked.

No non-browser flaky test was observed. Generated coverage HTML/LCOV/JSON and Solidity reports are available locally. Playwright is configured for HTML, JUnit, failure traces, and failure screenshots when a browser becomes available.

## Known gaps

- Backend model CRUD and blockchain service execution paths keep backend coverage below target.
- Frontend layouts, dashboard, management workflows, and route guards need direct behavioral coverage.
- A dedicated isolated PostgreSQL database and mocked-IPFS E2E harness must be provisioned.
- Browser/a11y/visual baselines must be run and reviewed on a machine with Playwright Chromium.
- Production load, manual WCAG review, and real deployment smoke tests belong to later release operations.

Root dependency audit found 37 advisories (14 low, 7 moderate, 16 high, 0
critical), concentrated in the Hardhat/tooling dependency tree; suggested fixes
require breaking major-version changes and were not applied during this
regression stage. The frontend registry audit could not complete because the
npm audit endpoint was unavailable, so it remains an explicit release gate.

The measured smoke budget is 250 ms for the in-process public health handler,
and the production JavaScript bundle gate is 1.5 MB. These checks are useful
regressions, not substitutes for production load testing.

## Stage 23 prerequisite resolution

The later prerequisite run supersedes the earlier E2E skip status above.
`skill_verification_test` completed 11 API workflow checkpoints and all six test
tables were then cleaned to zero. Frontend E2E passed 12/12 across desktop,
tablet, and mobile. The dedicated axe run passed 6/6 across landing, login,
public verification, dashboard, and credential views. Primary, footer, and
workspace navigation landmarks now have distinct accessible names. Visual
pixel-comparison baselines and manual accessibility review remain limitations.
