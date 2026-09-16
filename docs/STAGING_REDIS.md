# Staging Redis transport

Staging and production require `RATE_LIMIT_STORE=redis`. `REDIS_CONNECTION_POLICY` defaults to `tls`; its only other value is `render-private`. TLS connections use `rediss://`. Production always requires TLS, including when private exception flags are present. External Redis connections always require TLS.

For the approved staging Render private connection, all these settings are required:

```dotenv
NODE_ENV=staging
RATE_LIMIT_STORE=redis
REDIS_CONNECTION_POLICY=render-private
REDIS_PRIVATE_HOST=red-your-actual-internal-host
# RENDER=true must be provided by the Render runtime.
```

Store the authenticated internal URL as the secret `REDIS_URL` in Render. Its shape is `redis://USERNAME:PASSWORD@red-your-actual-internal-host:6379/0`; these are placeholders, not usable credentials. Copy the actual internal hostname exactly into `REDIS_PRIVATE_HOST`. It must be a single label beginning with `red-` followed only by lowercase letters, digits or hyphens. A nonempty username and password are mandatory. Percent-encode credential characters as needed; never paste real URLs or credentials into documentation, logs or commits.

The backend and Key Value instance must be in the same Render workspace and region. Enable **Internal Authentication** on the Key Value instance and use its authenticated internal URL. Render makes internal authentication optional; this application's exception requires it. Host pinning is operator configuration and does not prove network isolation. Do not set the runtime marker on another platform to imitate Render.

See [Render Key Value connection documentation](https://render.com/docs/key-value) for internal authentication, same-workspace/region networking and external TLS details. This change does not provision resources or enable authentication on your behalf.

Both policies reject malformed URLs, empty hosts, invalid or zero ports, nonnumeric database paths, queries, fragments, whitespace and invalid percent escapes. An omitted database or trailing slash is accepted. Validation never includes the URL or credentials in its error. The limiter receives the original URL without rewriting it, keeps Redis shared counting enabled and propagates Redis failures without falling back to memory.

Readiness currently checks database, filesystem, IPFS and blockchain, but does **not** check Redis. A successful readiness response therefore does not establish Redis connectivity or authentication. Redis connects lazily on limiter use; connection or command failures can affect requests despite healthy readiness. This scoped change leaves that gap unchanged. Validate connectivity and shared rate limiting separately during the authorized staging rollout.
