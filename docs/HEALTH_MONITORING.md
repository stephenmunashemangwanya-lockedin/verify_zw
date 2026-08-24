# Health monitoring

`GET /health` is public and returns only `{ "status": "healthy" }` when the HTTP process is responsive.

The following routes require a current `super_admin` JWT:

- `GET /health/database`
- `GET /health/ipfs`
- `GET /health/blockchain`

Detailed checks return only `healthy`, `degraded`, `unavailable`, or `not_configured`, plus non-secret provider/network labels where useful. They never return database credentials, RPC URLs, private keys, contract secrets, or Pinata authentication. External checks have short timeouts.

Use `npm run test:health`. Configure an orchestrator liveness probe against `/health`; use authenticated detailed checks for operational diagnostics, not public monitoring.

Super administrators may also use `GET /api/dashboard/system-health`. It combines these safe checks with database latency and read-only credential reconciliation counts. The response never includes provider URLs or credentials. An unavailable dependency degrades the aggregate status without preventing the other checks from completing.
