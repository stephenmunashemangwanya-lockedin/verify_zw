# Testing strategy

## Inventory and pyramid

The release pyramid contains Node `node:test` unit/API/security/regression suites, Vitest + Testing Library frontend behavior tests, Hardhat/Mocha contract tests, a real local Hardhat integration, documentation/route-parity tests, and opt-in Playwright browser tests. At the Stage 23 audit there were 17 backend test files plus one local-chain script, one Solidity suite with 36 tests, and five frontend files with 58 tests. Most backend controller/service tests mock database and provider boundaries; migration verification and local-chain checks use real local dependencies without changing development records.

Unit tests own validation, utilities, middleware, models, services, components, forms, and guards. API tests exercise Express response contracts. Contract tests use ephemeral Hardhat state. Browser tests intercept APIs with deterministic fake responses. Snapshots are not the primary assertion style.

## Dependency policy

- PostgreSQL: full API E2E requires a dedicated `TEST_DB_NAME` ending in `_test` and different from `DB_NAME`. The safety runner skips without it and never truncates the development database.
- Blockchain: Hardhat only; no Sepolia or funds. Local deterministic accounts must never leave tests.
- IPFS: mocked provider responses unless a dedicated test provider is explicitly configured. Real Pinata is forbidden in automated suites.
- Files: fake PDFs and temporary directories only; temporary outputs must be cleaned by the owning test.
- Time/network: deterministic fixtures, bounded waits, no arbitrary sleeps, and at most one CI browser retry.

## Coverage

Measured backend coverage is 65.54% lines/statements, 60.88% functions, and 73.82% branches. Initial regression floors are 65/65/60/70 respectively. Release goals remain 80% lines/statements, 75% functions, and 70% branches.

Measured full-source frontend coverage is 75.47% lines, 56.92% functions, 53.91% branches, and 60.43% statements. Initial floors are 40/35/35/40 while uncovered layouts, dashboard, management, and guards receive behavior tests. Release goals remain 75% lines/statements, 70% functions, and 65% branches.

Solidity coverage is 100% statements/functions/lines and 88.24% branches, meeting the 90/90/90/85 contract goals.

Only generated artifacts, migrations, test code, type-only files, and the frontend bootstrap are excluded. Business logic is not excluded.

## E2E, accessibility, and visual policy

`npm run test:e2e:api` refuses the live database. After a dedicated test database is provisioned, migrations, fake seed identities, mocked IPFS, local Hardhat deployment, and the full issue/verify/revoke flow can be enabled with `RUN_API_E2E=true`. This orchestration remains intentionally blocked until those services exist.

Playwright specifications cover public verification, unauthorized redirects, desktop/mobile/tablet projects, and axe checks. Browser installation was attempted but unavailable in this environment, so browser E2E, accessibility execution, screenshots, and visual comparisons are reported as skipped—not passed. Failure screenshots, traces, HTML, and JUnit artifacts are configured under `test-results/`; approved baselines have not been captured.

Automated axe results never establish full WCAG compliance. Manual keyboard, contrast, zoom, and screen-reader review remains required.

## Release gates

Required gates are documentation validation, backend/frontend/contract regressions, coverage floors, local blockchain integration, production build, secret scan, database-count parity, and zero critical dependency vulnerabilities. Optional environment-dependent E2E gates must be explicitly recorded as passed or skipped. No suite may hide flakiness with unlimited retries or mutate live data.

Typical fast suites take under one minute each; coverage and aggregate validation take several minutes. Browser installation can take longer and requires external download access.

## Verified isolated E2E setup

The current API runner requires `TEST_DB_NAME` to end exactly in `_test` and to
differ from both `DB_NAME` and optional `PRODUCTION_DB_NAME`; unsafe or missing
configuration fails rather than skips. It applies the synthetic baseline and
existing migrations, seeds fake identities, mocks IPFS, uses an isolated local
Hardhat 31337 node, exercises the complete credential lifecycle, and truncates
only the test tables in guaranteed cleanup. If absent, create the database with
`CREATE DATABASE skill_verification_test;`, or set `CREATE_TEST_DB=true` for one
invocation. The runner never drops or recreates a database.

Playwright Chromium is now available. Desktop, tablet, and mobile E2E cover the
public flow and authentication redirect. Axe checks cover landing, login,
verification, dashboard, and credential views. Failure screenshots, traces,
HTML, and JUnit files remain generated artifacts. Visual pixel baselines and
manual keyboard/screen-reader review remain outstanding.
