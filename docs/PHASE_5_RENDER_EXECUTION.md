# Phase 5 approved Render execution

This operator-approved decision record supersedes the unselected-provider findings in the initial Phase 5 audit. Infrastructure approval is established; authenticated account access and provisioned runtime values are not yet established. No resources or transactions have been created in this continuation.

## Approved targets

| Resource | Approved decision |
| --- | --- |
| Region | Render Oregon / US West |
| Backend | verifyzw-staging-api |
| Frontend | verifyzw-staging-web |
| HTTPS | Render-generated domains; custom domain not required |
| PostgreSQL | verifyzw-staging-postgres; backend uses internal DATABASE_URL |
| Key Value | verifyzw-staging-kv; internal authenticated connection |
| Secrets | Render Environment Group verifyzw-staging-secrets |
| IPFS | Staging-specific Pinata credential |
| Blockchain | Ethereum Sepolia, chain 11155111, Alchemy RPC |
| Email | Existing webhook integration and operator staging endpoint/token |
| Monitoring | Render logs, /health/live, /health/ready, /metrics; ENABLE_METRICS=true; LOG_LEVEL=info |
| Recovery | Render PostgreSQL export/backup and restore to a separate isolated database |

## Current access gate

Git status was checked before infrastructure work. Existing Phase 5 documents and the two untracked Phase 2/3 BMAD specs are preserved. No tracked application edits exist.

Available tools contain no Render connector. The Render executable, RENDER_API_KEY and RENDER_OWNER_ID are absent from the current agent environment. This does not prove the operator has no Render account. Required next input is an approved secure credential-source location or injected API key, workspace/owner identity, and resource plan/budget. Never put credential values in chat, source, logs or this document.

Render API authentication uses an API key: [Render API](https://render.com/docs/api). Do not treat provider approval as evidence that a usable session exists.

## Sequential deployment preparation

1. Authenticate, identify the approved workspace, and list existing resources before creating anything. Reuse matching staging resources after identity checks; never duplicate by assuming they are absent. Confirm paid PostgreSQL plan supports required recovery and budget includes an isolated restore instance.
2. Create the named resources in Oregon. Keep application rollout controlled until dependencies and configuration are ready. Obtain actual generated domains; names alone do not guarantee exact URLs.
3. Populate verifyzw-staging-secrets securely. Include staging database/Redis connections, JWT settings, separate Pinata credential, Alchemy RPC, funded dedicated Sepolia signer, and webhook endpoint/token. Attach backend secrets only to appropriate backend/jobs; frontend needs only public build configuration, not the backend secret group. Keep migration-role credentials scoped to migration execution.
4. Verify RPC chain 11155111 and signer balance/address before invoking the existing contract deployment command with explicit --network sepolia. Use a controlled job with development dependencies available; the production backend image does not contain Hardhat. Record public contract address, transaction, successful receipt/block, bytecode and admin role. Do not print raw provider errors that could include secret-bearing URLs. Check existing deployment metadata before another deployment.
5. Configure the returned CONTRACT_ADDRESS and verify the migration inventory 000–007. Capture hosted baseline metadata and run the existing migration runner using the dedicated migration context. Never apply rejected 008.
6. Deploy backend using the existing Dockerfile and reviewed commit/image. Deploy frontend using frontend/Dockerfile with repository root build context and actual HTTPS API URL ending in /api. Record deployed commit/image identities; no localhost default may remain. Render maps service environment settings to Docker build arguments, so never consume secret-valued build arguments: [Docker on Render](https://render.com/docs/docker).
7. Verify authenticated internal Redis connectivity and limiter operations, separate Pinata upload/retrieval, and test-safe webhook delivery. Then verify health, HTTPS, cookie/CSRF/CORS and metrics access. Keep the existing webhook implementation.
8. Execute fresh synthetic staging UAT only after these gates pass. Record issuance/revocation receipts and application/audit evidence. Redeploy application services and prove external blockchain and database state persist.
9. Create a Render export and record its identifier/time securely. Restore into a separate empty database, compare required VerifyZW records, and leave the live database connection unchanged. Run monitoring, safe staging performance checks and applicable release regression; update the Phase 5 report with actual evidence.

## Compatibility checks before rollout

- Internal Key Value authentication must be explicitly enabled; Render defaults internal connections to unauthenticated. The scoped compatibility correction permits the actual authenticated redis internal URL only with NODE_ENV=staging, RENDER=true, REDIS_CONNECTION_POLICY=render-private and an exact REDIS_PRIVATE_HOST pin. Default and production policy still require TLS. See [Redis policy](STAGING_REDIS.md). Never simulate the Render marker off-platform or rewrite the URL scheme. Runtime connectivity still requires verification on Render. [Render Key Value](https://render.com/docs/key-value).
- Render-managed recovery/export requires a paid PostgreSQL instance. Recovery creates a new database; this task must not perform the provider documentation's optional production connection-switch step. Verify an export restore independently. [Render backups](https://render.com/docs/postgresql-backups).
- Existing readiness omits Redis and only checks Pinata configuration. Record real dependency checks separately and resolve acceptance coverage before declaring staging healthy. Render logs are approved; no extra monitoring vendor decision is required.
- Verify PostgreSQL internal TLS certificate behavior without disabling certificate validation blindly. Verify actual proxy trust and generated-domain cookie behavior using the deployed frontend/API.

## Resume point

Resume at authenticated Render workspace inspection. Provider, network, region, secret-group name, email architecture and monitoring decisions are approved and must not be requested again. Source functionality, local UAT data, production and mainnet remain untouched.
