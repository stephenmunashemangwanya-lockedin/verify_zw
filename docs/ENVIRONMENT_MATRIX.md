# Environment Matrix

Legend: D=development, T=test, S=staging, P=production; `secret` means runtime injection only in S/P. Blank optional values must be intentionally omitted.

| Variables | Purpose / requirement | D/T source | S/P source | Secret | Validation |
|---|---|---|---|---|---|
| `NODE_ENV`, `PORT` | Runtime tier/listener; required | local/test runner | deployment | no | tier; port 1–65535 |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Component DB settings; required unless URL | `.env`/isolated test | secret manager | password | S/P non-local, dedicated name, valid port |
| `DATABASE_URL` | Managed PostgreSQL URL; optional alternative | omit | secret manager | yes | PostgreSQL URL; S/P non-local |
| `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`, `DB_SSL_CA` | Database TLS; required S/P | false | provider CA/secret manager | CA maybe | TLS true S/P; verification on |
| `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONNECTION_TIMEOUT_MS` | Pool bounds | example/test | deployment | no | positive bounded integers |
| `JWT_SECRET` | Session signing | local/test generated | secret manager | yes | >=24 D/T, >=48 S/P |
| `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ALGORITHM`, `JWT_EXPIRES_IN` | Token contract | examples | deployment | no | required S/P; HS256 only |
| `AUTH_COOKIE_NAME`, `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAME_SITE`, `AUTH_COOKIE_DOMAIN`, `AUTH_COOKIE_PATH`, `AUTH_COOKIE_MAX_AGE_MS`, `AUTH_RETURN_BEARER_TOKEN` | Cookie session | local defaults | deployment | no | secure S/P; valid name/path/SameSite |
| `CSRF_ENABLED`, `CSRF_COOKIE_NAME`, `CSRF_HEADER_NAME` | CSRF defense | examples | deployment | no | enabled S/P; valid names |
| `FRONTEND_PUBLIC_URL`, `PASSWORD_RESET_FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `CORS_ALLOW_CREDENTIALS`, `VITE_API_BASE_URL` | Browser/API origins | localhost | staging/production domain/build pipeline | no | HTTPS S/P; no wildcard |
| `BLOCKCHAIN_ENABLED`, `BLOCKCHAIN_NETWORK`, `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_CHAIN_ID`, `CONTRACT_ADDRESS` | Registry connection | local Hardhat/test fixtures | testnet/mainnet provider + release metadata | RPC may be | S/P enabled, HTTPS, valid nonzero address; no 31337 |
| `DEPLOYER_PRIVATE_KEY`, `BLOCK_CONFIRMATIONS`, `BLOCKCHAIN_TX_TIMEOUT_MS`, `BLOCKCHAIN_MAX_RETRIES`, `BLOCK_EXPLORER_URL` | Signed transactions | disposable local key only | secret manager/deployment config | key yes | 32-byte key, positive bounds, HTTPS |
| `IPFS_ENABLED`, `IPFS_PROVIDER`, `IPFS_PROVIDER_API_URL`, `PINATA_JWT`, `PINATA_GATEWAY`, `IPFS_UPLOAD_TIMEOUT_MS`, `IPFS_MAX_RETRIES` | Pinning/gateway | disabled or dev token | provider + secret manager | JWT yes | S/P enabled; HTTPS; bounded timeout/retry |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_DELIVERY_URL`, `EMAIL_DELIVERY_TOKEN`, `EMAIL_DELIVERY_TIMEOUT_MS`, `EMAIL_DELIVERY_MAX_RETRIES` | Password-reset delivery | capture | provider + secret manager | token yes | webhook/HTTPS S/P; bounded timeout/retries |
| `RATE_LIMIT_STORE`, `REDIS_URL`, `REDIS_CONNECT_TIMEOUT_MS`, all `*_RATE_LIMIT_*` | Shared abuse protection | memory | private managed Redis | URL yes | Redis + `rediss://` S/P; positive limits |
| `ENABLE_METRICS`, `METRICS_ROUTE`, `METRICS_AUTH_MODE`, `READINESS_TIMEOUT_MS` | Monitoring | local optional | monitoring config | auth may be | protected metrics, bounded timeout |
| `LOG_LEVEL`, `LOG_TO_CONSOLE`, `LOG_TO_FILES`, `LOG_DIRECTORY`, `LOG_RETENTION_DAYS`, `LOG_MAX_SIZE` | Structured logs | local | stdout collector | no | no secret logging; bounded rotation |
| `BACKUP_DIRECTORY`, `BACKUP_ENVIRONMENT`, `BACKUP_MAX_AGE_HOURS`, `BACKUP_DAILY_DAYS`, `BACKUP_WEEKLY_WEEKS`, `BACKUP_MONTHLY_MONTHS` | Backup/retention | local guarded directory | backup job/object prefix | credentials external | staging label, positive retention |
| `PG_DUMP_PATH`, `PG_RESTORE_PATH` | Client parity | local/Postgres 18 image | pinned PostgreSQL 18 job | no | major version matches server |

Production uses separate values from staging for every secret and stateful target. No `VITE_*` variable may contain a secret.
