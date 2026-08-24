# Docker production

Use `docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file <approved-file> config` without enabling the `local` profile, and deploy immutable images without source mounts. PostgreSQL is internal, the backend and frontend run read-only where practical, local Hardhat and its deployment job remain inactive, Swagger and metrics are disabled, and external blockchain settings are mandatory. Production requires an explicit external contract address and signer; it never reads local deployment metadata to auto-deploy.

Run exactly one migration job before backend rollout. The checksum ledger makes successful repeats safe, but competing migration jobs are unsupported. Existing complete schemas adopt the initial baseline without executing it; partial schemas require operator investigation.

Compose environment files are acceptable only for local development. Production secrets should use Docker secrets or an external secret manager, and CI credentials should come from the CI secret store. Never use build arguments, Vite variables, labels, or image layers for secrets. Apply deployment-specific CPU/memory limits after load testing.
