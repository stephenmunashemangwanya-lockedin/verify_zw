# Password recovery

Users start at `/forgot-password`. `POST /api/auth/forgot-password` accepts only
an email address and always returns the same success message, so it does not
reveal whether an active account exists. The endpoint has a dedicated rate
limit. Eligible accounts receive a new 256-bit URL-safe token; a new request
replaces the prior token. PostgreSQL stores only its SHA-256 hash and expiry.

The reset link targets `/reset-password?token=...`. The frontend reads the token
once, immediately removes it from the visible browser URL, and never writes it
to browser storage. `POST /api/auth/reset-password` validates the strict body,
password confirmation, and the central password policy. Token consumption and
the password update are one conditional database operation, preventing replay.
The new bcrypt hash uses cost 12, the current password cannot be reused, lock
state is cleared, and `token_version` is incremented to revoke existing sessions.
Reset never returns a JWT or authentication cookie; the user signs in again.

Development defaults to `EMAIL_PROVIDER=capture`, which sends nothing and only
exposes a reset URL to an explicitly injected test callback. Production startup
requires `EMAIL_PROVIDER=webhook`, HTTPS frontend and delivery URLs,
`EMAIL_FROM`, and `EMAIL_DELIVERY_TOKEN`. Configure the TTL with
`PASSWORD_RESET_TOKEN_TTL_MINUTES` (5–60; default 30). Never log, persist in
plaintext, or place reset tokens in examples, analytics, audit details, or
support messages.
