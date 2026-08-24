# API reference and route inventory

The server mounts the routes below exactly as shown. JSON is the default content type. `multipart/form-data` is used only for credential issuance and public file verification. Protected operations require `Authorization: Bearer <BEARER_TOKEN>`. Full schemas, parameters, success codes, and controlled failures are in [openapi.yaml](openapi.yaml).

| Method and route | Access | Controller / validation |
|---|---|---|
| GET `/health` | Public | `healthController.publicHealth` / none |
| GET `/health/{database,ipfs,blockchain}` | Super admin | corresponding `healthController` check / none |
| POST `/api/auth/register` | Public policy response; self-registration disabled | `authController.register` / `authValidator.register` |
| POST `/api/auth/login` | Public; establishes HttpOnly cookie session | `authController.login` / `authValidator.login` |
| POST `/api/auth/forgot-password` | Public; generic response and dedicated rate limit | `authController.forgotPassword` / `authValidator.forgotPassword` |
| POST `/api/auth/reset-password` | Public; single-use token, no automatic login | `authController.resetPassword` / `authValidator.resetPassword` |
| POST `/api/auth/logout` | Authenticated; CSRF required for cookie sessions | `authController.logout` / current-user check |
| GET, PATCH `/api/auth/profile` | Authenticated | `userController.profile/updateProfile` / `profileUpdate` for PATCH |
| POST `/api/auth/change-password` | Authenticated | `userController.changePassword` / `changePassword` |
| GET `/api/auth/admin-only` | Super or institution admin | inline authorization probe |
| GET, POST `/api/users` | Super or institution admin | `userController.list/create` / `listQuery/create` |
| GET, PATCH `/api/users/:id` | Super or institution admin | `getOne/update` / `idParams`, `update` |
| PATCH `/api/users/:id/{status,role,institution}` | Super or institution admin; actor rules apply | corresponding user controller / named schema |
| POST `/api/users/:id/reset-password` | Super or institution admin; rate limited | `resetPassword` / `reset` |
| POST `/api/users/:id/unlock` | Super admin globally; institution admin in own institution | `unlock` / empty strict body |
| POST `/api/users/:id/require-password-change` | Super admin globally; institution admin in own institution | `requirePasswordChange` / empty strict body |
| GET, POST `/api/institutions` | GET all roles; POST super admin | `institutionController.list/create` / `listQuery/create` |
| GET `/api/institutions/:id` | All authenticated roles | `getOne` / `idParams` |
| PATCH `/api/institutions/:id/status` | Super admin | `changeStatus` / `status` |
| POST `/api/institutions/:id/blockchain/{authorise,deactivate}` | Super admin | corresponding blockchain administrator / `idParams` |
| GET, POST `/api/students` | GET all roles; POST super/admin/issuer | `studentController.list/create` / `listQuery/create` |
| GET `/api/students/:id` | All authenticated roles | `getOne` / `idParams` |
| PATCH `/api/students/:id` | Super/admin/issuer; institution scoped | `update` / `idParams`, `update` |
| PATCH `/api/students/:id/institution` | Super admin; credential-free students only | `assignInstitution` / `idParams`, `institution` |
| GET `/api/credentials`, `/api/credentials/:id` | All authenticated roles | credential list/detail / `listQuery`, `idParams` |
| POST `/api/credentials/issue` | Super/admin/issuer; multipart PDF | `issueCredential` / upload middleware and `issue` |
| PATCH `/api/credentials/:id/revoke` | Super or institution admin | `revokeCredential` / `idParams`, `revoke` |
| POST `/api/credentials/:id/generate-pdf` | Super/admin/issuer | `generateCredentialPdf` / `idParams` |
| GET `/api/credentials/:id/pdf` | All authenticated roles; institution scoped | `downloadCredentialPdf` / `idParams` |
| POST `/api/verify/file` | Public; rate limited; multipart PDF | `verifyFile` / upload middleware, `optionalVerifier` |
| GET `/api/verify/hash/:hash` | Public; rate limited | `verifyHash` / `hashParams` |
| GET `/api/verify/credential/:id` | Public; rate limited | `verifyCredentialId` / `idParams` |
| GET `/api/verify/token/:publicToken` | Public/QR; rate limited | `verifyPublicToken` / `tokenParams` |
| GET `/api/verification-logs` | Super or institution admin | `verificationLogController.list` / `listQuery` |
| GET `/api/audit-logs`, `/api/audit-logs/:id` | Super or institution admin | `auditController.list/getOne` / `listQuery`, `idParams` |
| GET `/api/dashboard/summary` | All roles, role-shaped | `dashboardController.summary` / empty query |
| GET `/api/dashboard/recent-activity` | Super/admin/issuer | `recentActivity` / `recentActivity` |
| GET `/api/dashboard/credential-trends` | Super/admin/issuer | `credentialTrends` / `trend` |
| GET `/api/dashboard/verification-trends` | All roles | `verificationTrends` / `verificationTrend` |
| GET `/api/dashboard/top-institutions` | Super admin | `topInstitutions` / `topInstitutions` |
| GET `/api/dashboard/most-verified-credentials` | All roles | `mostVerifiedCredentials` / `mostVerified` |
| GET `/api/dashboard/failures` | Super/admin/issuer | `failures` / `failures` |
| GET `/api/dashboard/system-health` | Super admin | `systemHealth` / empty query |
| GET `/api/docs` | Development; configurable in production | Swagger UI / parsed OpenAPI document |

## Pagination

Lists default to `page=1`, `limit=20`, and `sortOrder=desc`; `limit` is capped at 100. Search is capped at 200 characters. Each list documents its `sortBy` allowlist and filters in OpenAPI. Institution admins and other institution users remain SQL-scoped to their current institution even if a different `institutionId` is supplied.

```json
{"success":true,"users":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPreviousPage":false}}
```

The same envelope applies to institutions, students, credentials, verification logs, and audit logs with the corresponding array property. Verification logs intentionally omit free-text search.

### Complete empty-page examples

Each request below is protected and uses `Authorization: Bearer <BEARER_TOKEN>`.

```http
GET /api/institutions?page=1&limit=20&search=University&sortBy=name&sortOrder=asc
200 {"success":true,"total":0,"institutions":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPreviousPage":false}}

GET /api/users?page=1&limit=20&role=issuer&sortBy=created_at&sortOrder=desc
200 {"success":true,"total":0,"users":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPreviousPage":false}}

GET /api/students?page=1&limit=20&programme=Engineering&sortBy=full_name&sortOrder=asc
200 {"success":true,"total":0,"students":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPreviousPage":false}}

GET /api/credentials?page=1&limit=20&status=active&sortBy=issue_date&sortOrder=desc
200 {"success":true,"total":0,"credentials":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPreviousPage":false}}

GET /api/verification-logs?page=1&limit=20&result=VERIFIED&sortBy=verification_time&sortOrder=desc
200 {"success":true,"total":0,"verificationLogs":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPreviousPage":false}}

GET /api/audit-logs?page=1&limit=20&action=LOGIN_SUCCESS&sortBy=created_at&sortOrder=desc
200 {"success":true,"total":0,"auditLogs":[],"pagination":{"page":1,"limit":20,"total":0,"totalPages":0,"hasNextPage":false,"hasPreviousPage":false}}
```

## Test isolation

`npm run test:e2e:api` is fail-safe: it will not run against `DB_NAME`, requires
a separate database name ending in `_test`, and refuses production or Sepolia.
The test database must be migrated and seeded with disposable fixtures before
setting `RUN_API_E2E=true`. Unit and integration fixtures are synthetic and
must never contain production credentials or personal data.

## Authentication policy

Public registration creates verifier accounts only. Login uses email/password and returns a short-lived JWT placeholder represented as `<BEARER_TOKEN>`. Every protected request reloads the current user, role, institution, active state, and token version. Password change, managed reset, role/institution changes, and deactivation invalidate stale tokens. Repeated failed login can produce `423 ACCOUNT_LOCKED`. `mustChangePassword` instructs clients to send the authenticated password-change request before normal work.

## Credential lifecycle

The issuance controller validates the PDF content, computes SHA-256 over the authoritative original, rejects duplicates, uploads it to IPFS, submits and confirms the blockchain transaction, then marks the credential active and creates public-token/QR evidence. Failures use controlled status and messages. Public verification reconciles database and blockchain state. Revocation confirms on-chain before final database revocation; a revoked award remains verifiable. Generated PDFs are presentation copies and never replace the uploaded original. The protected download endpoint streams only a previously generated presentation PDF using a fixed attachment filename; missing artifacts return a controlled `404` and server filesystem paths are never returned.
