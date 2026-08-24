# Rate Limiting Infrastructure

Development/test retain `express-rate-limit` memory stores. Staging/production require `RATE_LIMIT_STORE=redis` and a TLS `REDIS_URL`; all limiter families use shared namespaced counters. Connection/command failure fails closed at the affected limiter instead of silently reverting to process memory.

Provision a private Redis-compatible service with TLS, authentication, no public listener, least-privilege credentials, encryption at rest, availability monitoring and eviction/capacity sized for short-lived counters. Do not store passwords, JWTs or request bodies. Verify counters are shared between two backend replicas before horizontal scaling.
