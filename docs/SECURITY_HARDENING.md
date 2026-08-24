# Security hardening

Stage 18 adds defence-in-depth without changing existing API paths or database records.

- Helmet remains enabled. HSTS is production-only; no-sniffing, frame protection, same-site resource policy, and no-referrer policy remain active.
- Browser origins are restricted by `CORS_ALLOWED_ORIGINS`. Requests without an `Origin` are permitted for server-to-server clients. Never combine `*` with credentials.
- General, login, registration, verification-file, verification-lookup, reset, and sensitive-admin operations have separate rate limits. The bundled memory store is suitable for one process; use a compatible shared store for a multi-instance deployment.
- Five failed logins lock an existing account for 15 minutes by default. Unknown accounts are not mutated. A successful login resets the counter; lock, unlock, success, and failure events are audited.
- JWTs are signed and verified with the configured algorithm (only HS256 is accepted), issuer, audience, and expiry. Every protected request reloads active state, token version, current role, and institution from PostgreSQL.
- JSON, URL-encoded, and PDF uploads have finite limits. Upload names are server-generated UUIDs. Traversal, control characters, double extensions, incorrect MIME/extension, and invalid `%PDF` content are rejected, with cleanup performed by the existing issuance/verification workflows.
- Dynamic SQL sorting remains whitelist-controlled and all request values remain parameterized.
- Authenticated APIs use `Cache-Control: no-store`. Public verification is not configured for shared sensitive-input caching.

Run `npm run test:security`. Automated tests use local processes and mocks; they do not call Sepolia or Pinata and do not persist database records.

Known limitation: the rate-limit store is process-local. The dependency audit findings are in the Hardhat development toolchain and require a major upgrade; see the Stage 18 report before upgrading.
