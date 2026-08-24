# Staging Release Acceptance

- [ ] Human NVDA or Narrator journey validation is completed and evidence attached.
- [ ] Dashboard charts have accessible tabular/data alternatives; `role=img` labels alone are not final acceptance.
- [ ] `SA@skillverify.co.zw` browser login is validated without weakening rate limits, lockout or password verification. If explicitly authorized, use `admin:reset-password` through `admin-tools`.
- [ ] Role-based UAT covers super admin, institution admin, issuer and verifier.
- [ ] Student search is measured with representative staging scale using `EXPLAIN (ANALYZE, BUFFERS)` before any `pg_trgm` migration.

Current search finding: a rolled-back 10k-row fixture used a sequential scan, removed 9,989 rows and completed the database portion in 17.22 ms. This identifies trigram GIN as a candidate but is not sufficient evidence for a compatible extension/index migration. No `pg_trgm` change is introduced in Phase 13.
