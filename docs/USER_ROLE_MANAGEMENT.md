# User and role management

## Roles and boundaries

`super_admin` can manage every user, create all supported roles, change status
and roles, assign institutions, and initiate password resets.

`institution_admin` is restricted to users in its current database institution.
It can create and manage only `issuer` and `verifier` accounts and cannot move
users to another institution. Issuers and verifiers have profile access only
and cannot use `/api/users` administration routes.

Sensitive routes reload the actor from PostgreSQL, require an active account,
compare JWT `tokenVersion` with the database, and use the current database role
and institution. Deactivation, role changes, institution reassignment, password
changes, and resets invalidate prior tokens.

## Registration and onboarding

Public `POST /api/auth/register` remains enabled but always creates a verifier
with no institution. A supplied non-verifier role is rejected. Administrative
creation uses `POST /api/users`, validates the target institution is active,
creates an unknown random password, and stores only a SHA-256 password-setup
token digest. Development/test responses expose the one-time setup token;
production responses do not. No email delivery service is currently configured.

## Routes

- `GET /api/users`, `GET /api/users/:id`, `POST /api/users`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/status`
- `PATCH /api/users/:id/role`
- `PATCH /api/users/:id/institution`
- `POST /api/users/:id/reset-password`
- `GET /api/auth/profile`, `PATCH /api/auth/profile`
- `POST /api/auth/change-password`, `POST /api/auth/logout`

General updates accept only `fullName` and `email`; security fields require
their dedicated endpoints. Responses never include password hashes or reset
token hashes.

Passwords default to at least 12 characters and require uppercase, lowercase,
number, and special characters. Self-change requires the current password,
matching confirmation, and a password different from the current one.

Events use the Stage 15 subsystem: `USER_CREATED`, `USER_UPDATED`,
`USER_ACTIVATED`, `USER_DEACTIVATED`, `USER_ROLE_CHANGED`,
`USER_INSTITUTION_ASSIGNED`, `USER_PASSWORD_RESET_BY_ADMIN`,
`PASSWORD_CHANGED`, and `LOGOUT`. Passwords and raw tokens are never audited.

Run isolated mocked tests with `npm run test:users`.
