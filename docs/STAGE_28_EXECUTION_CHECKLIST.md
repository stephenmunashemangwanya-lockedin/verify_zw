# Stage 28 Execution Checklist

Date: 2026-08-14. Statuses reflect repository and local evidence only. Development values never satisfy staging prerequisites.

## Gate

| Prerequisite | Status | Evidence / operator action |
|---|---|---|
| Stage 28 authorization | PASS | Operator explicitly authorized staging preparation and execution only where every mandatory prerequisite passes. |
| Phase 13 artifacts | PASS | Named reports, architecture, matrix, environment template, Compose file and runbook revalidated. |
| Isolated staging Compose | PASS | Contains only migration, backend and frontend; no local PostgreSQL, Redis or Hardhat service and no development volume. |
| Fail-closed staging validation | PASS | Rejects local/dev/test DBs, insecure cookies/origins, Hardhat 31337/local RPC/default key, mainnet, capture email, disabled IPFS and non-TLS/non-shared Redis. |
| Staging hosting target | OPERATOR REQUIRED | Supply runtime/host access, capacity, ingress topology and registry access. |
| Staging domain and DNS control | OPERATOR REQUIRED | Supply FQDN and DNS owner/change path. |
| TLS/HTTPS | OPERATOR REQUIRED | Supply certificate/automated issuer and ingress termination configuration. |
| External PostgreSQL | OPERATOR REQUIRED | Supply private PostgreSQL 18 endpoint, dedicated new database, app/migration roles, TLS CA and credentials. |
| Shared Redis | OPERATOR REQUIRED | Supply private authenticated `rediss://` endpoint and network policy. |
| Public EVM testnet/RPC | OPERATOR REQUIRED | Explicitly select a non-mainnet network, chain ID, protected HTTPS RPC, explorer and confirmation count. |
| Staging deployment wallet/funds | OPERATOR REQUIRED | Supply a newly generated, secret-injected staging-only wallet address and proof of test funds. |
| Contract strategy | OPERATOR REQUIRED | Authorize a new testnet deployment or identify an existing verified staging contract. |
| IPFS/pinning provider | OPERATOR REQUIRED | Supply provider selection, scoped credential, HTTPS API/gateway, quota and retention policy. |
| Transactional email | OPERATOR REQUIRED | Supply HTTPS provider endpoint/token, verified sender and operator-controlled recipient. |
| Secret manager | OPERATOR REQUIRED | Supply source system, workload identity/access policy, rotation owner and injection procedure. |
| Backup storage | OPERATOR REQUIRED | Supply encrypted off-host target, least-privilege credentials, retention and isolated restore target. |
| Monitoring/logging | OPERATOR REQUIRED | Supply collection platform, protected metrics access and retention. |
| Alert destination | OPERATOR REQUIRED | Supply on-call destination/owner for health, DB, blockchain, IPFS, backup and auth anomalies. |
| Git SHA/provenance | OPERATOR REQUIRED | This workspace has no repository-local Git metadata; build from an approved commit/checkout. |
| Registry-published immutable images | OPERATOR REQUIRED | Local RC digests exist but are not registry-pullable staging references. |
| Previous rollback digests | OPERATOR REQUIRED | Supply previously verified backend/frontend digests. |
| Super-admin browser acceptance | BLOCKED | Latest attempt returned `423 ACCOUNT_LOCKED`; repeat once only after natural lock expiry using the known password, then complete forced change and role UAT. |
| Human accessibility acceptance | OPERATOR REQUIRED | NVDA/Narrator, keyboard and 200%/400% zoom evidence. |
| Chart/tabular accessibility review | OPERATOR REQUIRED | Human acceptance of accessible alternatives is still required. |

## Least-complex staging stack

Use one operator-controlled container host behind one TLS ingress, with the existing backend and frontend images and all stateful/provider dependencies external. A free/testing tier is acceptable only if it supports private/TLS connectivity, required quotas, backups and the provider's staging use terms.

| Item | Purpose / minimum | Free/testing tier | Variables / operator action |
|---|---|---|---|
| Host + TLS ingress | Run one backend and frontend and route same-origin `/api` | Acceptable if stable and TLS-capable | Provide host, FQDN, DNS, certificate, registry access. |
| PostgreSQL 18 | Dedicated empty staging DB, TLS verification, separate app/migration access | Acceptable if private/TLS and backups supported | `DATABASE_URL`, `DB_NAME`, `DB_SSL*`, pool variables. |
| Redis-compatible service | Shared authentication limiter state over authenticated TLS | Acceptable if private and persistent enough for limiter windows | `RATE_LIMIT_STORE=redis`, `REDIS_URL`, timeout. |
| EVM testnet RPC + wallet | Credential registry transactions on an explicitly selected public testnet | Faucet/provider testing tier acceptable | `BLOCKCHAIN_*`, `CONTRACT_ADDRESS`, `DEPLOYER_PRIVATE_KEY`, confirmations, explorer. |
| IPFS pinning | Persist staging-only evidence and retrieve by CID | Acceptable if quota/retention supports tests | `IPFS_*`, provider credential/gateway. |
| Transactional email | Deliver staging password-recovery messages | Sandbox tier acceptable if it delivers to the approved recipient | `EMAIL_*`. |
| Secret manager | Runtime-only protected injection and rotation | Platform-native free tier acceptable | Inject every secret; provide workload policy and owner. |
| Monitoring/alerts | Collect logs/metrics and notify an operator | Free tier acceptable if retention and alerts suffice | Platform-specific protected configuration. |
| Backup storage | Encrypted off-host dumps and isolated restore tests | Free tier acceptable if encryption/retention controls exist | External job credentials and `BACKUP_*`/PostgreSQL client paths. |

## Execution hold

Do not render or start `docker-compose.staging.yml`, connect to a database, deploy a contract, upload to IPFS, send email, create test data, run staging load tests or perform rollback until every relevant mandatory item above is `PASS`. Never substitute localhost or the development Compose stack.
