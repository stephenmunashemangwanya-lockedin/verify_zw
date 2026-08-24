# Logging

Production request and lifecycle logs are newline-delimited JSON. Request entries include timestamp, level, event, request ID, method, route, status, duration, and authenticated user ID when available. Controlled failures log only a safe error code and status.

The logger recursively redacts keys associated with passwords, authorization, tokens, secrets, private keys, Pinata credentials, database URLs, and mnemonics. It does not log request bodies or uploaded bytes. Bearer-like strings are redacted as an additional safeguard.

Levels are `error`, `warn`, `info`, and `debug`. Production output is newline-delimited JSON. Optional files are `application.log`, `error.log`, `security.log`, and `performance.log`; test mode never persists logs. Retention, size and compression settings are documented configuration boundaries; deployments should use an OS/container log rotator because the dependency-free file sink does not itself rotate files.

An incoming `X-Request-ID` is retained only when it contains 1–100 safe ASCII identifier characters; otherwise a cryptographic UUID is generated. The selected ID is returned in `X-Request-ID` and controlled error responses.

On SIGINT or SIGTERM the server stops accepting connections, closes HTTP, closes the PostgreSQL pool, and exits cleanly. A configurable timeout forces termination if shutdown cannot finish; repeated signals do not start duplicate shutdown work.
