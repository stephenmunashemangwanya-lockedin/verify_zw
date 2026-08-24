# Project audit

Audit date: 2026-08-03

## Current structure

- `backend/config`: PostgreSQL pool configuration.
- `backend/controllers`: authentication, institution, student, and credential controllers.
- `backend/models`: user, institution, student, and credential query modules.
- `backend/routes`: authentication, institution, student, and credential routers.
- `backend/middleware`: JWT/RBAC and PDF upload middleware.
- `backend/utils`: streaming SHA-256 file hashing.
- `backend/database`: partial schema, seed, and query SQL files.
- `frontend`: an empty HTML entry point only.
- Root: package manifests, an empty README, and an empty legacy SQL file.

## Installed packages

Runtime: bcrypt, bcryptjs, cors, dotenv, ethers, express, helmet,
jsonwebtoken, morgan, multer, pg, and qrcode. Development: nodemon.

There is no test runner, validation library, rate limiter, IPFS client,
Hardhat toolchain, frontend framework, linter, formatter, or OpenAPI package.
Both `bcrypt` and `bcryptjs` are installed, although the code uses only
`bcryptjs`.

## Routes

- `GET /`
- `GET /api/db-test`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `GET /api/auth/admin-only`
- `GET /api/institutions`
- `POST /api/institutions`
- `GET /api/institutions/:id`
- `PATCH /api/institutions/:id/status`
- `GET /api/students`
- `POST /api/students`
- `GET /api/students/:id`
- `GET /api/credentials`
- `GET /api/credentials/:id`
- `POST /api/credentials/issue`

The duplicate direct institution and student handlers formerly in
`server.js` were removed. The mounted routers remain authoritative and all
endpoint paths are unchanged.

## Exports

- Controllers: `register`, `login`; institution `create`, `list`, `getOne`,
  `changeStatus`; student `create`, `list`, `getOne`; credential
  `issueCredential`, `listCredentials`, `getOneCredential`.
- Models: user creation and lookup; institution creation/list/lookup/status;
  student creation/list/lookup; credential creation/list/lookup/hash lookup.
- Middleware: `authenticate`, `authorizeRoles`, `uploadCertificate`.
- Utility: `generateFileHash`.

All current router imports and exports load successfully. No missing runtime
dependency or current import/export mismatch was detected.

## Database

The live PostgreSQL database contains `institutions`, `users`, `students`,
`credentials`, `verification_logs`, and `audit_logs`. Primary keys and the
main foreign keys exist. Credential hashes and blockchain transaction hashes
are unique. Student numbers are unique per institution. User roles have a
check constraint.

Important gaps:

- The checked-in `backend/database/schema.sql` describes only institutions
  and cannot reproduce the live database.
- Credential status permits only `pending`, `active`, and `revoked`; it lacks
  `processing` and `failed`.
- Credentials lack blockchain network, contract address, block number,
  issuer wallet, revoked-by, revocation reason, and internal failure fields.
- Audit logs lack IP address and user agent.
- Several boolean and timestamp columns are nullable despite having defaults.
- Institutions do not have a unique wallet constraint in the live schema.
- There is no migrations ledger or idempotent migration system.

Environment variable names found (values were not inspected or recorded):
`PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and
`JWT_SECRET`.

## Functional status

Complete or operational foundations: PostgreSQL connection, registration,
login, JWT parsing, role checks, institution CRUD subset, student creation and
reads, PDF upload filtering, streaming SHA-256 hashing, and credential reads.

Partial: credential issuance currently validates authorization, ownership,
student/institution association, active institution, PDF extension/MIME/header,
and duplicate hashes. It creates a pending database record, but does not yet
upload to IPFS, register blockchain proof, generate QR data, or audit the
operation. A local path is no longer written into `ipfs_cid`.

Unimplemented: public verification, revocation, IPFS and blockchain services,
smart contract, user administration, audit APIs, dashboards, frontend,
OpenAPI documentation, automated tests, containers, CI/CD, production
deployment, monitoring, and recovery tooling.

## Security findings

- Public registration accepts privileged roles, including `super_admin`.
- JWT authorization trusts role and account state from the token without a
  current database check.
- JWT issuer/audience and token-version revocation are absent.
- CORS is unrestricted and there is no rate limiting.
- Request validation is ad hoc; UUID, email, date, password, and wallet formats
  are not comprehensively validated.
- Some controllers return internal database error messages.
- Login has no lockout/progressive delay and may reveal inactive accounts.
- Upload limits are now configurable, but startup environment validation is
  absent.
- The upload remains on local disk after successful pending issuance; cleanup
  must be tied to the future IPFS workflow.

## Safe implementation sequence

1. Add tested, idempotent migrations for the credential and audit fields.
2. Add centralized validation/errors and close privileged public registration.
3. Add IPFS configuration/service with timeouts, retry, and retrieval checks.
4. Add and test the Hardhat contract, then the ethers backend service.
5. Complete transactional issuance and compensation/audit behavior.
6. Implement public verification, revocation, and QR workflows.
7. Add user management, pagination, analytics, and security hardening.
8. Build the frontend only after the API contract is tested and documented.
9. Add complete automated tests, deployment assets, and truthful project docs.

## Verification performed

- All JavaScript files changed in this audit passed `node --check`.
- All four Express routers loaded successfully.
- PostgreSQL schema introspection connected successfully.
- A clean backend process served `GET /` successfully.

No automated test suite exists yet, so broader regression behavior is not yet
automatically verifiable.
