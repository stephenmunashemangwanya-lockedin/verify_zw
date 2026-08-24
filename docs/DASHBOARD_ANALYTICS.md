# Dashboard and analytics API

All routes are under `/api/dashboard`, require a current database-backed user session, return `Cache-Control: no-store`, and use the Stage 17 success/error conventions. Analytics are read-only PostgreSQL aggregates; no table is loaded wholesale and no dashboard route performs reconciliation.

## Routes and permissions

- `GET /summary`: every authenticated role. Super administrators receive platform totals; institution administrators receive their institution's administration and operational totals; issuers receive institution operational totals; verifiers receive verification totals only.
- `GET /recent-activity`: super administrator, institution administrator, issuer. Query: `limit` (10 default, 50 maximum), `action`, `entityType`. Details are sanitized and rows are newest first.
- `GET /credential-trends`: super administrator, institution administrator, issuer. Query: `period`, `dateFrom`, `dateTo`, `groupBy`.
- `GET /verification-trends`: all authenticated roles. Also supports `method=file|hash|credential_id|public_token|qr`.
- `GET /top-institutions`: super administrator only. Query: `limit`, date range, and `sortBy=totalCredentials|activeCredentials|totalVerifications|totalStudents`.
- `GET /most-verified-credentials`: all authenticated roles. Query: `limit`, date range, and controlled credential `status`. Certificate hashes are excluded and student numbers are masked.
- `GET /failures`: super administrator, institution administrator, issuer. Query: date range, category, page, limit. Categories are `ipfs`, `blockchain`, `certificate_processing`, `pdf_generation`, `reconciliation`, `verification_inconsistency`, and `account_lockout`. Only category-derived summaries are returned; raw details and processing errors are excluded.
- `GET /system-health`: super administrator only. Reuses bounded health checks and adds read-only reconciliation counts.

Sensitive access to platform rankings, failure analytics, and system health creates `PLATFORM_ANALYTICS_VIEWED`, `FAILURE_ANALYTICS_VIEWED`, or `SYSTEM_HEALTH_VIEWED` audit records. Dashboard output is never copied into those audit details.

## Dates and grouping

Periods are `7days`, `30days` (default), `3months`, `6months`, and `12months`. Custom ISO dates override the period and may span at most 24 months. Ranges are inclusive of both calendar dates. Grouping is restricted to `day`, `week`, or `month` and PostgreSQL groups timestamps in UTC.

Credential trends return `issued`, `activated`, `failed`, and `revoked`. Verification trends return total, verified, revoked, unknown, pending, failed, and inconsistency counts. Empty data returns zero-valued summaries and empty series.

## Scoping and privacy

The authenticated role and institution are reloaded from PostgreSQL by existing middleware. Institution scope is included directly in aggregate SQL; the API accepts no institution override. Unattributed verification attempts are excluded from institution-scoped metrics.

No response contains password/security fields, certificate hashes, raw audit details, provider errors, RPC URLs, private keys, Pinata authentication, database credentials, or filesystem paths.

Migration `006_dashboard_analytics_indexes.sql` adds four idempotent composite indexes for credential status, user activity, verification result trends, and audit entity chronology. Run Stage 20 tests with `npm run test:dashboard`.

Limitations: results are live and intentionally uncached; large future datasets may need materialized rollups. `contractPaused` is currently `null` because the existing health service does not call the administrative pause method. Failure analytics relies on controlled audit action classifications rather than exposing raw provider errors.
