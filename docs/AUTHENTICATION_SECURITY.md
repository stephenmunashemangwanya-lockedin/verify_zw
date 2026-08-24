# Authentication security

## Architecture

Browser authentication uses a signed JWT stored only in an HttpOnly cookie. Frontend JavaScript never receives, stores, parses, or injects the JWT. On application startup, the frontend sends a credentialed `GET /api/auth/profile`; a successful response hydrates the current user and HTTP 401 produces anonymous state.

The JWT retains `userId`, `role`, `institutionId`, and `tokenVersion`, is restricted to HS256, and validates expiry, issuer, and audience. Every protected request reloads the current database account. Inactive users, inactive or unassigned institutions, and stale token versions are rejected.

## Cookie configuration

`AUTH_COOKIE_NAME` defaults to `verifyzw_session`. It is always HttpOnly, uses the configured path and optional domain, has an explicit bounded Max-Age, and defaults to SameSite=Lax. Secure is mandatory in production and may be false only for local HTTP development. SameSite=None is rejected unless Secure is enabled. Logout clears the authentication and CSRF cookies with matching attributes.

Use host-only cookies unless a shared parent domain is operationally required. Never configure a broad production domain unnecessarily.

## CSRF and CORS

Cookie-authenticated POST, PUT, PATCH, and DELETE requests use double-submit CSRF protection. Login creates a cryptographically random, non-credential CSRF proof. The proof is returned in the `X-CSRF-Token` response header and the frontend echoes it on unsafe requests; the backend compares it in constant time with the CSRF cookie. GET, HEAD, and OPTIONS do not require proof. Bearer-authenticated API clients do not require CSRF because the browser cannot attach their Authorization header implicitly.

Login CSRF is additionally constrained by SameSite cookies and the explicit CORS origin policy. Credentialed CORS requires exact configured origins; wildcard origins are invalid. Server-to-server requests without Origin remain supported.

## Browser and API clients

Browser mode is cookie-only and `AUTH_RETURN_BEARER_TOKEN` defaults false. Existing non-browser clients may continue sending `Authorization: Bearer <token>`. An operator may temporarily enable `AUTH_RETURN_BEARER_TOKEN=true` for a controlled API-client/Postman environment; it must not be enabled for the production browser frontend.

## Expiry and invalidation

The cookie lifetime defaults to eight hours and should not outlive the configured JWT. Expired or malformed cookies are rejected and cleared. Password changes, administrative password recovery, role changes, institution reassignment, and deactivation increment `token_version` under their existing policies, invalidating old cookie and bearer sessions.

Accounts with `must_change_password=true` may authenticate and access profile, logout, and password change only. Other protected routes return `PASSWORD_CHANGE_REQUIRED`. Successful password change clears the flag, increments the token version, and requires a new login.

## Environment guidance

Local HTTP normally uses Secure=false, SameSite=Lax, explicit localhost origins, and credentialed CORS. Staging and production require HTTPS, Secure=true, explicit deployed origins, and CSRF enabled. Use SameSite=None only for a genuinely cross-site frontend/API topology and verify third-party-cookie policy before deployment.

If profile hydration fails, confirm the exact CORS origin, Axios credential mode, cookie domain/path/SameSite/Secure attributes, proxy HTTPS awareness, and CSRF response-header exposure. Never log cookies, JWTs, passwords, or CSRF proof values.
