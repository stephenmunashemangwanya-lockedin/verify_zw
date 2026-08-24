# Phase 11 performance test report

## Scope and tool

The primary tool is the deterministic Node HTTP harness in `scripts/performance/runPerformance.js`. It fits the Node/Express API, bearer/cookie-compatible requests, controlled concurrency, percentile/status reporting, CI smoke use, process memory/CPU sampling, and direct PostgreSQL pool observation without adding dependencies.

The load profile used 10,000 synthetic students, credentials, verification logs, and audit logs in `skill_verification_test`. IPFS and verification-chain reads were mocked. No development data, external RPC, Pinata, or real funds were used. See `PERFORMANCE_ENVIRONMENT.md` for hardware and limits.

## Measured results

Three-second scenarios; all valid scenarios had 0% errors, timeouts, and connection errors.

| Scenario | Clients | Requests/s | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|---:|---:|
| Health live | 1 | 1,372.58 | 0.64 | 1.50 | 3.42 |
| Health live | 25 | 2,128.09 | 10.67 | 18.07 | 23.37 |
| Health live | 100 | 2,718.76 | 35.13 | 47.71 | 70.93 |
| Readiness | 1 | 776.51 | 1.11 | 2.14 | 3.93 |
| Verification hash | 1 | 240.41 | 3.94 | 6.03 | 7.14 |
| Verification hash | 25 | 607.42 | 40.47 | 74.15 | 84.47 |
| Verification hash | 50 | 583.07 | 83.03 | 104.08 | 110.15 |
| Verification hash | 100 | 620.23 | 161.21 | 215.61 | 261.52 |
| Verification ID | 10 | 527.63 | 17.02 | 34.61 | 57.34 |
| Verification token | 10 | 650.16 | 14.21 | 22.69 | 34.85 |
| Profile | 1 | 341.85 | 2.54 | 4.25 | 6.45 |
| Profile | 25 | 716.81 | 33.51 | 49.87 | 68.08 |
| Profile | 100 | 800.95 | 123.75 | 151.68 | 159.93 |
| Valid login (bcrypt) | 10 | 9.87 | 1,014.55 | 1,143.63 | 1,143.75 |
| Users list, 10k fixture set | 10 | 548.97 | 15.35 | 29.72 | 43.70 |
| Students page | 10 | 208.38 | 47.16 | 73.06 | 96.17 |
| Students search | 10 | 30.02 | 326.18 | 470.40 | 556.03 |
| Credentials page | 10 | 78.16 | 118.65 | 188.05 | 229.81 |
| Verification logs page | 10 | 291.69 | 31.32 | 61.79 | 77.57 |
| Audit logs page | 10 | 314.25 | 30.76 | 50.55 | 71.31 |
| Dashboard summary | 10 | 198.52 | 48.06 | 73.62 | 83.08 |

Throughput for public verification flattened after 25 clients and latency materially degraded at 50. Health remained responsive through 100. Profile throughput flattened above 25. Login is intentionally bcrypt CPU-bound; no bcrypt reduction is recommended.

## Pool and memory

The application pool reached max 10. Peak waiting was 15/40/90 at 25/50/100 public-verification clients, 12/40/90 for profile, and 29 for dashboard summary. There were no connection-acquisition failures or timeouts. Pool max 10 is appropriate for one small staging instance; scaling must consider aggregate connections before changing it.

At 25 profile clients for five minutes, throughput was 654.22 requests/s, p95 62.75 ms, p99 85.47 ms, with 0% errors. RSS increased 101,695,488 bytes while heap fell 28,128,872 bytes after collection. This does not demonstrate an unbounded JavaScript leak; RSS/native allocator behavior should be rechecked in longer staging soak tests.

## Integrity, rate limiting, and recovery

- Five simultaneous inserts with the same credential hash produced one accepted row and four unique-constraint rejections. Five conditional revocations produced exactly one state transition and final `revoked` state.
- Actual limiter middleware returned five 200 and five controlled 429 responses; every 429 included `Retry-After`. Current storage is process-local and is unsuitable for consistent multi-instance enforcement without a shared store.
- Invalid unknown-user login remained responsive (539.78 requests/s, p95 5.01 ms) and produced controlled 401 responses without locking a real account.
- Existing backend failure tests cover unavailable IPFS/blockchain, bounded errors, and database failure sanitization. High-volume external failure injection was intentionally excluded.

## Bottlenecks and query observations

The main bottlenecks are bcrypt login CPU, four-column substring student search, credential list joins/counting, verification-log writes, and pool queuing beyond ten DB-heavy clients. Phase 13 traced the two secondary dashboard 400 responses to frontend `group=day` parameters conflicting with the strict backend `groupBy` contract; both calls now use `groupBy=day` and have regression coverage. Their historical results remain excluded from this run.

`EXPLAIN ANALYZE` in a rolled-back 10k-row fixture showed the ordinary student page doing a sequential scan plus in-memory top-N sort in 2.50 ms. Four-column substring search also used a sequential scan, removed 9,989 rows, and took 17.22 ms before API/concurrency overhead. This proves the search access pattern but not yet enough production-scale benefit to justify an index migration. `pg_trgm`/GIN is the first candidate for staging analysis.

No index or query migration was made. No pool increase was hard-coded beyond making the existing default explicit and configurable.

Credential issuance/revocation with actual blockchain state remains deliberately low-volume: API E2E performs one full mocked-IPFS/local-Hardhat issue and revoke. Database concurrency controls were stress-tested, but multi-transaction on-chain issuance timing was not claimed.

## Proposed staging release thresholds

On a staging instance at least comparable to this machine, with one application process and pool max 10:

- Health at 100 clients: error rate 0%, p95 under 100 ms, p99 under 150 ms.
- Public verification at 25 clients: error rate below 0.5%, p95 under 120 ms, p99 under 180 ms. Initial operational concurrency recommendation: 25; do not advertise 50+ until real RPC latency is measured.
- Profile at 25 clients: error rate below 0.5%, p95 under 100 ms, p99 under 150 ms.
- Paginated lists at 10 clients: p95 under 300 ms; substring search p95 under 650 ms.
- Dashboard summary at 10 clients: p95 under 150 ms, p99 under 250 ms.
- Valid login at 10 clients: p95 under 1,750 ms, error rate below 1% excluding expected 429s.
- Five-minute moderate soak: no timeouts/connection errors, heap not monotonically growing across post-GC samples, DB waiting returns to zero after load.

## Cleanup and limitations

Test counts were zero before seed and zero after cleanup. Development counts remained users 1, institutions 1, students 1, credentials 0, verification logs 0, audit logs 1. Local results exclude real RPC/IPFS latency, multi-process limiter behavior, production TLS/proxy/network overhead, multiple app instances, and a long staging soak. Frontend network throttling and actual multi-transaction blockchain load remain staging tasks, not localhost production guarantees.
