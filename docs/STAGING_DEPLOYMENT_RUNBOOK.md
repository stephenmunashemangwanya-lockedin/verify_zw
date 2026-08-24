# Staging Deployment Runbook

1. Validate every item in `STAGE_28_PREREQUISITES.md`, DNS/TLS, firewall rules and provider status.
2. Retrieve staging-only secrets through the approved runtime mechanism; never print them.
3. Resolve backend/frontend tags to immutable digests, verify provenance/SBOM and record previous digests.
4. Test TLS PostgreSQL connectivity with app and migration roles; confirm backup and restore-test evidence.
5. Run reviewed forward-compatible migrations once with the migration role and record output.
6. Explicitly deploy the testnet contract if authorized, or validate configured bytecode/address/chain; record release metadata.
7. Render `docker-compose.staging.yml` with the protected env file and start the immutable images behind TLS ingress.
8. Require successful liveness, readiness, DB, Redis, RPC and provider checks; inspect logs for secret leakage/5xx.
9. Perform a public verification smoke test using designated staging data, including QR/PDF and IPFS retrieval.
10. Perform authentication/CSRF/logout/password-reset and role smoke tests. Admin login validation must be cleared first.
11. Roll back on migration incompatibility, readiness failure, sustained 5xx, auth/security regression or corrupted verification.
12. Record timestamp, operator, commit, image digests, config version, migration IDs, contract metadata, evidence and rollback target.

Stage 28 requires fresh explicit authorization after external prerequisites exist. This runbook does not authorize deployment.
