---
title: Render staging private Redis compatibility
type: bugfix
created: 2026-09-15
status: in-progress
baseline_commit: 95dce9bf8161f55acb7176ca035d5ec7eaa46589
review_loop_iteration: 0
context: []
---

<frozen-after-approval>
## Intent

Current strict environment validation rejects every redis:// URL, preventing the approved Render private Key Value connection. Implement the user's explicit staging-only private-network exception without weakening production/external transport or disabling shared limiting. User explicitly authorized implementation and tests; existing untracked workflow/readiness documents must be preserved.

## Boundaries & Constraints

Always require TLS for production and external Redis. Permit plaintext only with NODE_ENV=staging, Render runtime marker RENDER=true, explicit REDIS_CONNECTION_POLICY=render-private, and REDIS_PRIVATE_HOST matching the URL's exact single-label Render internal hostname (red- followed by lowercase letters/digits/hyphens). Require nonempty username/password for this exception. Default policy is tls. Validate policy enum and URL shape (host, scheme, nonzero port if specified, numeric database path only, no query/fragment/whitespace or invalid percent escapes). Never log URL or credentials. Host pinning is operator configuration; it does not prove network isolation. Operator must copy actual internal hostname, enable internal auth and use same workspace/region.

Never deploy, modify external resources, touch local UAT data, disable limiting, add migrations, or commit. Production rejects plaintext even with exception flags. Existing valid rediss URLs continue working. Do not expand readiness behavior in this scoped fix; document existing gap.

## I/O & Edge-Case Matrix

| Scenario | Expected behavior |
|---|---|
| Staging Render, explicit policy, matching internal host, authenticated redis URL | Accepted |
| Missing opt-in/Render marker, host mismatch, dotted external host, no auth | Rejected |
| Production redis URL, including exception flags | Rejected |
| Valid rediss URL in staging or production | Accepted |
| Malformed URL, wrong scheme, invalid port/path/escape/query/fragment | Rejected |
| Redis-backed limiter initialization and increments | Redis client receives unchanged URL; connects once; shared counts and expiry work; failures propagate without memory fallback |
</frozen-after-approval>

## Code Map

- backend/config/environment.js: strict validation block currently only checks URL protocol; replace with narrow helper policy validation.
- backend/config/rateLimitStore.js: lazy node-redis createClient, connection promise, INCR/PTTL/PEXPIRE shared store. Avoid changing behavior unless needed; test mocked client and failure propagation.
- backend/services/healthService.js: readiness has no Redis check; leave unchanged and document limitation.
- test/stagingConfiguration.test.js: complete synthetic staging env fixture and synchronous restoration; extend policy tests here.
- test/redisRateLimitStore.test.js: add meaningful mocked client behavior tests using isolated module/cache restoration, no live credentials or services.
- docs/STAGING_REDIS.md: document exact new knobs, Render internal auth, production TLS, no secrets, readiness limitations. Existing docs/PHASE_5_RENDER_EXECUTION.md is untracked and must be preserved; parent will update historical conflict wording.
- Render official docs https://render.com/docs/key-value confirm internal same-region/workspace connection, optional auth (must enable for our policy), external TLS.

## Tasks & Acceptance

- [ ] Implement narrow Redis configuration policy in backend/config/environment.js (helper may be separate backend/config/redis.js).
- [ ] Add table-driven environment coverage for all matrix rows and mocked limiter behavior including failures.
- [ ] Document settings and transport boundary in docs/STAGING_REDIS.md.
- Given production configuration, when plaintext Redis is selected, then validation fails regardless of private exception flags.
- Given staging explicit Render private configuration, when validated and used by the limiter, then URL remains unchanged and Redis shared counts/expiry operate.

## Verification

Run focused staging/Redis tests and report exact counts. Parent will run npm run test:backend and npm run test:docker, inspect changes and independent review. No full local UAT or deployment.

## Spec Change Log

## Review Triage Log
