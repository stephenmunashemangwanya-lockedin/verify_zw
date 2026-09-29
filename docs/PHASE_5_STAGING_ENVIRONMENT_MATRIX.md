# Phase 5 staging environment matrix

Operator decisions now approve Render Oregon and Environment Group `verifyzw-staging-secrets`, Render-generated domains, internal Render PostgreSQL/authenticated Key Value, separate staging Pinata, Alchemy Sepolia chain 11155111, existing webhook email, and Render logs/recovery. See [execution record](PHASE_5_RENDER_EXECUTION.md). Provider/network decisions are resolved; table entries remain unverified runtime configuration, not requests to reselect providers. `BLOCKCHAIN_NETWORK` and `BLOCKCHAIN_CHAIN_ID` have approved public settings but are not yet injected. No secret group has been accessed or provisioned by this session.

Audit date: 2026-09-15. No values are reproduced. `.env.staging` is absent; no alternate staging secret-injection location was supplied. External secret stores have not been inspected. MISSING means absent in this audited scope, not proof that no operator-owned resource exists elsewhere. Local `.env` and `.env.docker` are not treated as staging credentials. CONFIGURED is reserved for actual staging runtime evidence; there are no such entries yet.

Names come from `.env.staging.example`, runtime modules and backup/restore scripts. Defaults in examples require deliberate staging materialization and review. Credentials for different database roles must be injected into the appropriate jobs, not shared indiscriminately.

| Name | Kind | Status | Evidence / decision |
|---|---|---|---|
| `REDIS_CONNECTION_POLICY` | Configuration | NEEDS OPERATOR INPUT | Default tls. render-private permits authenticated plaintext only in staging on Render with an exact internal-host pin; see STAGING_REDIS.md. |
| `REDIS_PRIVATE_HOST` | Configuration | NEEDS OPERATOR INPUT | Exact single-label internal Render hostname, copied from the approved Key Value connection. Required only for render-private. |
| `RENDER` | Configuration | NEEDS OPERATOR INPUT | Render-provided runtime marker must be true for the staging private exception; do not simulate it outside Render. |
| `STAGING_ENV_FILE` | Configuration | NEEDS OPERATOR INPUT | Optional path override; no staging runtime file is present. |
| `BACKEND_IMAGE` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `FRONTEND_IMAGE` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `VITE_API_BASE_URL` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `NODE_ENV` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `PORT` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DATABASE_URL` | Sensitive | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DB_NAME` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DB_SSL` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DB_SSL_REJECT_UNAUTHORIZED` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DB_SSL_CA` | Sensitive | NEEDS OPERATOR INPUT | Provider-dependent CA material; operator must specify trust requirements. |
| `DB_POOL_MAX` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DB_POOL_MIN` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DB_POOL_IDLE_TIMEOUT_MS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `JWT_SECRET` | Sensitive | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `JWT_ISSUER` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `JWT_AUDIENCE` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `JWT_ALGORITHM` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `JWT_EXPIRES_IN` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `FRONTEND_PUBLIC_URL` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `PASSWORD_RESET_FRONTEND_URL` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `CORS_ALLOWED_ORIGINS` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `CORS_ALLOW_CREDENTIALS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `AUTH_COOKIE_NAME` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `AUTH_COOKIE_SECURE` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `AUTH_COOKIE_SAME_SITE` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `AUTH_COOKIE_PATH` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `AUTH_COOKIE_MAX_AGE_MS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `AUTH_RETURN_BEARER_TOKEN` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `CSRF_ENABLED` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `CSRF_COOKIE_NAME` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `CSRF_HEADER_NAME` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `EMAIL_PROVIDER` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `EMAIL_DELIVERY_URL` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `EMAIL_DELIVERY_TOKEN` | Sensitive | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `EMAIL_FROM` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `EMAIL_DELIVERY_TIMEOUT_MS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `EMAIL_DELIVERY_MAX_RETRIES` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `IPFS_ENABLED` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `IPFS_PROVIDER` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `IPFS_PROVIDER_API_URL` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `PINATA_JWT` | Sensitive | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `PINATA_GATEWAY` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `IPFS_UPLOAD_TIMEOUT_MS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `IPFS_MAX_RETRIES` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `ALCHEMY_API_KEY` | Sensitive | NOT REQUIRED | Not read by the current runtime or Hardhat config; an approved provider may encode its credential in BLOCKCHAIN_RPC_URL. |
| `BLOCKCHAIN_ENABLED` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `BLOCKCHAIN_NETWORK` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `BLOCKCHAIN_RPC_URL` | Sensitive | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `BLOCKCHAIN_CHAIN_ID` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `CONTRACT_ADDRESS` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DEPLOYER_PRIVATE_KEY` | Sensitive | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `BLOCK_CONFIRMATIONS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `BLOCKCHAIN_TX_TIMEOUT_MS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `BLOCKCHAIN_MAX_RETRIES` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `BLOCK_EXPLORER_URL` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `RATE_LIMIT_STORE` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `REDIS_URL` | Sensitive | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `REDIS_CONNECT_TIMEOUT_MS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `ENABLE_METRICS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `METRICS_ROUTE` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `METRICS_AUTH_MODE` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `READINESS_TIMEOUT_MS` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `TRUST_PROXY` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `LOG_LEVEL` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `LOG_TO_CONSOLE` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `LOG_TO_FILES` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `BACKUP_ENVIRONMENT` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `BACKUP_DIRECTORY` | Configuration | NEEDS OPERATOR INPUT | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `PG_DUMP_PATH` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `PG_RESTORE_PATH` | Configuration | MISSING | Required staging setting/injection is absent from the audited workspace; template presence is not runtime configuration. |
| `DB_HOST` | Configuration | NOT REQUIRED | Optional component alternative to DATABASE_URL. |
| `DB_PORT` | Configuration | NOT REQUIRED | Optional component alternative to DATABASE_URL. |
| `DB_USER` | Configuration | NOT REQUIRED | Optional component alternative to DATABASE_URL. |
| `DB_PASSWORD` | Sensitive | NOT REQUIRED | Optional component alternative to DATABASE_URL. |
| `AUTH_COOKIE_DOMAIN` | Configuration | NOT REQUIRED | Optional cookie scope. |
| `DISABLE_RATE_LIMITS` | Configuration | NOT REQUIRED | Must not disable staging controls; absent by default. |
| `BACKUP_DB_HOST` | Configuration | NEEDS OPERATOR INPUT | Operator must supply dedicated backup/isolated restore job configuration; not an application secret. |
| `BACKUP_DB_PORT` | Configuration | NEEDS OPERATOR INPUT | Operator must supply dedicated backup/isolated restore job configuration; not an application secret. |
| `BACKUP_DB_NAME` | Configuration | NEEDS OPERATOR INPUT | Operator must supply dedicated backup/isolated restore job configuration; not an application secret. |
| `BACKUP_DB_USER` | Configuration | NEEDS OPERATOR INPUT | Operator must supply dedicated backup/isolated restore job configuration; not an application secret. |
| `BACKUP_DB_PASSWORD` | Sensitive | NEEDS OPERATOR INPUT | Operator must supply dedicated backup/isolated restore job configuration; not an application secret. |
| `BACKUP_MANIFEST` | Configuration | NEEDS OPERATOR INPUT | Operator must supply dedicated backup/isolated restore job configuration; not an application secret. |
| `RESTORE_DB_NAME` | Configuration | NEEDS OPERATOR INPUT | Operator must supply dedicated backup/isolated restore job configuration; not an application secret. |

## Required policies (no secret values)

- Strict staging environment; dedicated external PostgreSQL with TLS certificate validation, least-privilege app role, separate migration role, isolated restore target.
- Managed authenticated Redis, shared limiter enabled; TLS by default and always in production. The explicit Render staging private-network exception is documented in STAGING_REDIS.md; no limiter bypass.
- Dedicated staging JWT identity/secret; secure HttpOnly cookie, deliberate SameSite/domain policy, HTTPS CORS allowlist, CSRF enforced. Validate reverse-proxy trust against the actual ingress topology.
- Frontend API base is set at image build time, not merely in the deployed container environment. Use staging HTTPS endpoint and immutable digest references.
- Pinata must have staging-only credentials, quota, retention and gateway policy. Local upload evidence is not staging provider proof.
- Explicit approved non-mainnet external EVM network, dedicated funded test wallet, deployed registry, chain/bytecode/admin checks. Local unlocked accounts and Hardhat keys are forbidden.
- Email provider must use the implemented authenticated HTTPS webhook and test-safe sender/recipient. Delivery is a staging UAT blocker, not optional capture mode.
- Monitoring, alert routing, registry access, TLS/DNS, encrypted backup storage and secret-manager permissions are provider-owned inputs. No fictional application environment names are introduced for integrations the repository does not implement.
