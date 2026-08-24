# GitHub Actions

| Workflow | Triggers | Purpose |
|---|---|---|
| Primary CI | PR, `main`, `development`, manual | Lint, documentation, unit/regression suites, coverage, builds, safe artifacts |
| Isolated E2E | PR, `main`, `development`, manual | PostgreSQL 18 API lifecycle and Playwright/axe checks |
| Security | PR, `main`, `development`, weekly, manual | Dependency review, audits, CodeQL, Trivy, hadolint, actionlint, secret scans |
| Docker Images | PR, `main`, `v*.*.*`, manual | Compose validation, Docker tests, four images, CVE/secret scans, SPDX SBOM, trusted GHCR publication |
| Release | `v*.*.*`, manual | Full release gate, E2E, coverage, npm SBOM, changelog, image verification, GitHub release |
| Deployment Preparation | manual only | Protected-environment dry-run checks; never deploys |

Actions use exact release tags, workflow permissions are explicit, and checkout credentials are not persisted. PR concurrency cancels stale runs. Release and deployment concurrency never cancels an active run.

Run `npm run ci:validate` locally for YAML parsing and policy tests. The Security workflow additionally runs actionlint. On Ubuntu, npm commands use committed lockfiles and all filesystem paths use repository casing. PowerShell is not required by any workflow.

Troubleshooting: verify the supported Node 24 line, run both `npm ci` commands, confirm test database names end in `_test`, and inspect only failure artifacts. Never paste environment files or secrets into an issue or workflow log.
