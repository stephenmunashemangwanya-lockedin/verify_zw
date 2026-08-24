# Audit logging

The API records security and business events in PostgreSQL `audit_logs`.
Timestamps come from PostgreSQL. Records contain the actor when known, action,
entity, safe JSONB details, request IP and user agent, and an optional
institution boundary.

## Events

- Authentication: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `USER_CREATED`.
- Institutions: `INSTITUTION_CREATED`, `INSTITUTION_ACTIVATED`,
  `INSTITUTION_DEACTIVATED`, `INSTITUTION_WALLET_AUTHORISED`,
  `INSTITUTION_WALLET_DEACTIVATED`.
- Students: `STUDENT_CREATED`.
- Credentials: `CREDENTIAL_PROCESSING_STARTED`, `CERTIFICATE_HASH_GENERATED`,
  `IPFS_UPLOAD_SUCCESS`, `IPFS_UPLOAD_FAILURE`,
  `BLOCKCHAIN_TRANSACTION_SUBMITTED`, `BLOCKCHAIN_TRANSACTION_CONFIRMED`,
  `BLOCKCHAIN_TRANSACTION_FAILED`, `CREDENTIAL_ACTIVATED`,
  `CREDENTIAL_FAILED`, `CREDENTIAL_REVOKED`, `QR_GENERATED`,
  `CERTIFICATE_PDF_GENERATED`.
- Verification: `VERIFICATION_COMPLETED`, `VERIFICATION_INCONSISTENCY`,
  `UNKNOWN_CERTIFICATE_CHECKED`.

Password, user-administration, student update/export, institution update,
certificate download, and account lock events will be attached when those real
operations exist. The audit layer does not emit fictional events.

## Sanitisation and failures

Details are recursively sanitised. Passwords, password hashes, tokens, JWTs,
authorization headers, cookies, secrets, private keys, mnemonics, Pinata and
database credentials, RPC URLs, certificate bytes, and complete environment
values are removed. Arrays and nesting are bounded, strings are truncated, and
complete request bodies are never captured automatically.

Inserts use parameterised SQL and JSONB. Awaited critical audit failures are
reported to the action point. Best-effort failure/security events catch audit
errors so they cannot corrupt an already-completed blockchain or credential
operation. Internal logging includes only the database error classification,
never SQL or supplied values.

## API and access

- `GET /api/audit-logs`
- `GET /api/audit-logs/:id`

Both are authenticated. `super_admin` can access all records.
`institution_admin` is scoped using server-derived associations through the
audit boundary, credential, student, institution entity, and actor. A supplied
`institutionId` cannot override this boundary. Issuer and verifier roles are
denied.

List filters are `page`, `limit`, `action`, `entityType`, `entityId`, `userId`,
`institutionId`, `dateFrom`, `dateTo`, `sortBy`, and `sortOrder`. Limit defaults
to 20 and is capped at 100. Sort fields are `action`, `entity_type`, and
`created_at`; direction is `asc` or `desc` and defaults to `created_at desc`.

Responses contain `auditLogs` and pagination metadata: `page`, `limit`,
`total`, `totalPages`, `hasNextPage`, and `hasPreviousPage`.

Run `npm run test:audit`. The suite uses mocks and does not persist development
records.
