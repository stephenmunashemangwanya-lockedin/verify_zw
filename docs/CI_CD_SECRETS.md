# CI/CD secrets and fork safety

Pull-request workflows use fake inline CI credentials only. They never reference deployment, registry, RPC, Pinata, SSH, or production database secrets. IPFS is disabled or mocked, Hardhat is local, and PostgreSQL is disposable.

GHCR publishing uses the event-scoped `GITHUB_TOKEN` only in a job with `packages: write`; PRs cannot reach that job and forks are rejected. Release creation uses `contents: write`. Deployment preparation has only `contents: read` and `packages: read`, is `workflow_dispatch` only, checks that the repository is not a fork, and is bound to a protected GitHub environment.

Configure environment reviewers in GitHub settings for `staging`, `production`, and `release`. If future Stage 28 targets need secrets, store them only in the protected environment, never as repository variables or workflow literals. Do not upload `.env`, `.env.docker`, backups, restore reports, raw logs, private keys, JWTs, passwords, bearer tokens, or real credential files.

Rotate any credential exposed in logs or artifacts outside this repository, remove the artifact, and follow the incident-response runbook. Local deterministic Hardhat keys are test fixtures and must never be reused on a live network or uploaded as CI artifacts.
