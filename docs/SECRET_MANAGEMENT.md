# Secret Management

Staging/production secrets are DB credentials/CA where sensitive, JWT secret, deployer private key, credentialed RPC URL, IPFS token, email token, Redis URL, backup credentials and monitoring credentials. Store them in the hosting platform or dedicated secret manager and inject them at runtime; never bake them into images, Vite variables, Compose, logs, artifacts or release metadata.

Use separate staging/production namespaces, least-privilege workload identity, audited access, rotation/revocation, version pinning and break-glass ownership. Rotate after suspected exposure and test dual-secret transition where supported. `.env` remains development-only; `.env.staging` is ignored. CI secret scans and dependency gates must remain green.
