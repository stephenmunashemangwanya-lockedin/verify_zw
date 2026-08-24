# Stage 28 Prerequisite Gate

Date: 2026-08-14. `OPERATOR REQUIRED` is never substituted with localhost or development infrastructure.

| Prerequisite | Status | Required evidence/input |
|---|---|---|
| Phase 13 staging code/config | PASS | Standalone staging Compose and fail-closed validation |
| Stage 28 preparation authorization | PASS | Operator authorization received on 2026-08-14 |
| Local backend/frontend RC images | PASS | Immutable local digests, SBOMs and critical/high scans recorded |
| Staging host/ingress | OPERATOR REQUIRED | Host/runtime access, registry access and capacity |
| Domain, DNS, TLS | OPERATOR REQUIRED | Staging FQDN, records and valid certificate |
| External PostgreSQL | OPERATOR REQUIRED | Private PostgreSQL 18 endpoint, dedicated database, roles, credentials, CA and backups |
| Blockchain RPC | OPERATOR REQUIRED | Explicit non-mainnet testnet choice and protected HTTPS endpoint |
| Funded testnet wallet | OPERATOR REQUIRED | New staging-only secret-injected wallet and test funds |
| Contract strategy/address | OPERATOR REQUIRED | Authorized deploy or verified existing testnet contract |
| IPFS provider | OPERATOR REQUIRED | API URL, scoped token, gateway, quota and retention |
| Transactional email | OPERATOR REQUIRED | HTTPS endpoint, token, verified sender and test recipient |
| Shared limiter | OPERATOR REQUIRED | Private authenticated TLS Redis-compatible endpoint |
| Secret manager | OPERATOR REQUIRED | Runtime injection, workload access and rotation owner |
| Monitoring/alerting | OPERATOR REQUIRED | Platform, credentials, destinations and on-call owner |
| External backup storage | OPERATOR REQUIRED | Encrypted off-host target, credential, retention and restore-test target |
| Registry immutable images | OPERATOR REQUIRED | Publish approved Git build and supply pullable backend/frontend digest references |
| Git SHA/provenance | OPERATOR REQUIRED | Approved repository checkout; this workspace has no local Git metadata |
| Rollback target | OPERATOR REQUIRED | Previously verified immutable image digests |
| Admin login validation | BLOCKED | Latest browser attempt returned `423 ACCOUNT_LOCKED`; acceptance remains incomplete |
| Human screen-reader validation | OPERATOR REQUIRED | NVDA/Narrator, keyboard and zoom evidence |
| Chart data alternatives | OPERATOR REQUIRED | Human accessibility acceptance evidence |
| Actual staging execution gate | OPERATOR REQUIRED | Reconfirm after every mandatory prerequisite is PASS and targets are proven |

Machine decision: **STAGE 28 PARTIALLY COMPLETE — OPERATOR ACTION REQUIRED.** Repository preparation and local RC evidence are complete; real staging execution remains stopped.
