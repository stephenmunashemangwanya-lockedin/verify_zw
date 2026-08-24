# Stage 28 Deployment Report

Date: 2026-08-14  
Status: **STAGE 28 PARTIALLY COMPLETE — OPERATOR ACTION REQUIRED**

## Decision

Repository-controlled preparation and local release-candidate evidence are complete. Real staging deployment did not begin because no hosting target, domain/TLS, distinct external PostgreSQL, Redis, testnet/wallet/funds, IPFS, email, secret manager, monitoring/alerts, backup target, registry references or rollback digests were supplied. Development infrastructure was not used as a substitute and remains healthy.

## Release candidate evidence

| Component | Local tag | Immutable local digest | Size | Build time (UTC) | Runtime/build baseline |
|---|---|---|---:|---|---|
| Backend | `zsvp-stage28-backend:rc-20260814` | `sha256:acd5bafe6caef79725cf8510cbca7327c6df8f2c3cb6e39072ac6ae34527df01` | 98,127,295 bytes | 2026-08-14 16:26:16 | Node 24.19.0 runtime |
| Frontend | `zsvp-stage28-frontend:rc-20260814` | `sha256:08c1b2eb496ecc17ab2cec56c39f264c9c5b9a504b7a3b0b4711d3e0e33a7fe4` | 26,028,656 bytes | 2026-08-14 16:27:21 | Node 24.19.0 build; nginx-unprivileged 1.28 runtime; `VITE_API_BASE_URL=/api` |

These are local OCI image digests, not published registry references. Git SHA is `OPERATOR_REQUIRED` because this workspace has no repository-local Git metadata.

Docker Scout 1.20.4 found 0 fixable critical and 0 fixable high vulnerabilities in both images. Image builds also reported 0 npm dependency vulnerabilities. SPDX JSON SBOMs were generated at `sbom/stage28-backend.spdx.json` and `sbom/stage28-frontend.spdx.json`. Contract/tooling SBOM generation remains available in the release workflow but requires the approved Git checkout/CI release run.

## Infrastructure and execution results

| Area | Status | Result |
|---|---|---|
| Host/runtime | OPERATOR REQUIRED | No staging target supplied. |
| Domain/DNS/TLS | OPERATOR REQUIRED | No FQDN, DNS control or certificate supplied. |
| PostgreSQL | OPERATOR REQUIRED | No external credentials; no connection, identity check or migration occurred. |
| Redis | OPERATOR REQUIRED | No staging endpoint; shared limiter was not disabled or downgraded. |
| Blockchain | OPERATOR REQUIRED | No network selected and no testnet deployment attempted. Hardhat/mainnet were not used. |
| Wallet/funding | OPERATOR REQUIRED | No staging-only wallet address, injection source or funds evidence supplied. |
| IPFS | OPERATOR REQUIRED | No provider credential; no artifact uploaded. |
| Email | OPERATOR REQUIRED | No provider/sender/recipient; no message sent. |
| Secrets | OPERATOR REQUIRED | Required runtime injection system and workload policy are unspecified. No secrets were added to repository artifacts. |
| Monitoring/alerts | OPERATOR REQUIRED | No external destination or on-call owner supplied. |
| Backup/restore | OPERATOR REQUIRED | No off-host store or isolated restore target supplied. |
| Deployment | BLOCKED | Mandatory infrastructure is absent; staging Compose was not started. |
| Smoke and role tests | BLOCKED | No staging URL or test identities/data. Super-admin browser acceptance also remains unresolved. |
| Blockchain/IPFS acceptance | BLOCKED | Providers and authorized staging data are absent. |
| Rollback drill | BLOCKED | No isolated staging target or previous digests. |
| Accessibility | OPERATOR REQUIRED | Human NVDA/Narrator, keyboard and zoom acceptance remains. |
| Performance | BLOCKED | No staging endpoint; Phase 11 development baseline was not rerun against third parties. |

## Release metadata pending deployment

- Staging URL: `OPERATOR_REQUIRED`
- Deployment date/time: not deployed
- Git SHA: `OPERATOR_REQUIRED`
- Registry backend/frontend digests: `OPERATOR_REQUIRED`
- Database migration version: not applied to staging
- Blockchain network/address/transaction/block: `OPERATOR_REQUIRED`
- Rollback target: `OPERATOR_REQUIRED`
- Operator approvals: Stage 28 preparation authorization received; provider selection, migration, contract deployment, smoke data and rollback approvals remain required where applicable.

## Next gate

The operator must supply the items in `STAGE_28_EXECUTION_CHECKLIST.md`, starting with the staging host/FQDN/TLS and protected secret-injection system, followed by distinct PostgreSQL and Redis endpoints and an explicit public testnet/wallet strategy. Re-run the gate from an approved Git checkout, publish the recorded images to the authorized registry by immutable digest, prove the staging database identity, and only then authorize actual migration/deployment.

Stage 29 may not begin. Production deployment is not authorized.
