# Authentication

Login verifies the bcrypt password hash and active account state. JWTs use
HS256 with configured issuer, audience, expiration, and the current database
token version. Protected sensitive routes then reload the user from PostgreSQL;
stale, deactivated, deleted, role-changed, reassigned, reset, or password-changed
sessions are rejected.

Required configuration is `JWT_SECRET`. Defaults are documented for
`JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE`, and `PASSWORD_MIN_LENGTH` in
`.env.example`. Secret values are never logged.

Logout is stateless: the server records `LOGOUT`, and the client discards the
token. Security-sensitive database changes increment `token_version`, providing
server-side invalidation.

Public password recovery uses a cryptographically random, single-use token with
a 30-minute default lifetime. Only its SHA-256 hash is stored. Forgot-password
responses are deliberately identical for known, unknown, and inactive accounts.
Successful reset applies the normal password policy and bcrypt cost 12, rejects
the current password, clears lock and recovery state, increments `token_version`,
and requires a fresh login. See [PASSWORD_RECOVERY.md](PASSWORD_RECOVERY.md).
