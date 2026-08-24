# Environment configuration

Copy `.env.example` and provide secrets through the deployment secret manager. Never commit `.env`.

Core startup validation checks database settings, ports, a minimum 24-character JWT secret, HS256, issuer/audience/expiry in production, boolean CORS settings, origin URLs, and proxy configuration. IPFS and blockchain values are validated when their features are enabled; production blockchain startup additionally checks RPC URL, contract address, and private-key shape without logging their values.

`CORS_ALLOWED_ORIGINS` is a comma-separated list. Local HTTP is accepted only for `localhost`/`127.0.0.1`; deployed origins should use HTTPS. `CORS_ALLOW_CREDENTIALS=false` is the safe default.

`TRUST_PROXY=false` is the safe direct-server default. Set it to a controlled proxy hop count only when the application is behind that many trusted reverse proxies. This determines `req.ip`, audit IPs, and rate-limit keys.

Body and upload controls use `JSON_BODY_LIMIT`, `URLENCODED_BODY_LIMIT`, `CERTIFICATE_MAX_SIZE_MB`, and `VERIFICATION_FILE_MAX_SIZE_MB`. The current shared upload middleware uses the lower certificate-compatible policy; keep both upload values aligned unless separate middleware is introduced.

Do not set `DISABLE_RATE_LIMITS=true` outside isolated automated tests.
