# Dependency security report

Audit date: 10 August 2026. Registry: official npm registry. See [DEPENDENCY_SECURITY_BASELINE.md](DEPENDENCY_SECURITY_BASELINE.md) for the complete inventory, advisory IDs, dependency chains, and reachability classification.

## Before and after

| Tree | Critical before/after | High before/after | Moderate before/after | Low before/after |
|---|---:|---:|---:|---:|
| Root complete | 0 / 0 | 16 / 16 | 7 / 7 | 14 / 14 |
| Root production only | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Frontend complete | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Frontend production only | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

Fresh post-review audits were run; these are not copied historical counts.

## Remediation decision

No dependency version changed. There was no compatible critical/high production fix to apply because both production trees and the complete frontend tree were already clean. Root findings are confined to the Hardhat/solidity-coverage development graph.

Hardhat 2.29.0 and Toolbox 6.1.2 are already the newest versions accepted by their current major ranges. npm proposes Hardhat 3.12.0 and Toolbox 7.0.0, both major migrations. Hardhat 3 changes configuration/module/plugin behavior and requires a reviewed migration of compilation, deployment, ABI export, local chain, coverage, Docker, and CI workflows. npm also proposes solidity-coverage 0.7.22 for part of the graph, which is a downgrade from 0.8.17 and was rejected by policy.

No `npm audit fix`, forced audit fix, downgrade, blind override, or lockfile regeneration was performed. No override was added.

## Exploitability and accepted risk

The 16 high, 7 moderate, and 14 low root records are development/build/test-only. They are absent from `npm audit --omit=dev` and from the production backend image installed with `npm ci --omit=dev`. The frontend tree is separate and clean. Hardhat is used for reviewed local Solidity compilation, contract tests, deployment scripts, and chain-ID-31337 development infrastructure; it is not reachable from public HTTP routes.

This reduces remote production reachability but does not make the advisories false positives. A malicious archive, compiler input, RPC/verification response, template object, or coverage fixture could affect a developer or CI worker. Temporary acceptance therefore requires trusted repository inputs, least-privilege CI, pinned actions, dependency review, no exposure of the local Hardhat RPC to untrusted networks, and migration planning. Any critical tooling finding or production high/critical finding blocks release.

## Security gate and release policy

`npm run security:dependencies` performs four fresh audits. It blocks:

- critical or high root production findings;
- critical or high frontend findings, including development/build tooling;
- critical root development/tooling findings.

It reports high root development findings for mandatory review. Pull-request Dependency Review separately rejects newly introduced high-severity packages, preventing the accepted count from silently normalizing new debt.

Release policy:

- **Block:** exploitable critical/high production, authentication/session issues, upload RCE/path traversal, known dependency compromise, critical tooling, or critical/high frontend findings.
- **Review:** moderate production findings, high development-only findings, or breaking-major remediation.
- **Documented temporary acceptance:** non-production transitive findings with no supported non-breaking remediation and compensating controls.

## Supply-chain controls

Both lockfiles remain version 3 and contain integrity hashes for all registry packages. There are no `file:` or non-official resolutions. CI and Docker use `npm ci`; production Docker omits development packages. The supported production-image Node baseline is 24.19.0, with PostgreSQL 18 tooling. GitHub Actions remain version-pinned under Stage 27 policy. Dependency review, repository vulnerability scanning, configuration scanning, secret scanning, image scanning, and SPDX SBOM generation remain enabled. No npm token or registry credential is stored in the repository.

Direct lifecycle review found only bcrypt's expected `node-gyp-build` install action. No unexpected direct dependency lifecycle script was introduced.

## Validations and recommendation

Validation completed with 403 backend tests, 86 frontend tests, frontend lint/build, 36 contract tests after successful compilation, 11 isolated API E2E checks, 15 browser checks with 6 existing visual-fixture skips, 6 accessibility checks, documentation/secret validation, and the Phase 8 performance budget. API E2E deployed and exercised an ephemeral chain-ID-31337 contract and cleaned its isolated database. The standalone local-blockchain integration command could not reuse the unrelated currently running node because its localhost deployment record was not deployed there; this is an environment-state limitation, not a compile or contract-test failure.

Release recommendation: dependency posture is acceptable for the current release because all production and frontend audit scopes are clean. The Hardhat development risk is accepted temporarily, not resolved. Schedule a dedicated Hardhat 3/Toolbox 7 migration in an isolated branch and remove the acceptance only after contract, deployment, Docker, coverage, and CI parity is demonstrated.
