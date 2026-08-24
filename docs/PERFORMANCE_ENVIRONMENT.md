# Phase 11 performance environment

Measured 10 August 2026 on a local Windows workstation. These results are repeatable evidence for this machine, not production guarantees.

| Item | Value |
|---|---|
| CPU | 11th Gen Intel Core i5-1135G7 @ 2.40 GHz |
| Logical cores | 8 |
| Memory | 16,905,969,664 bytes (15.74 GiB) |
| Node | 26.5.1 |
| PostgreSQL | 18.4, 64-bit Windows; server `max_connections=100` |
| Backend | One Node/Express process |
| Database | `skill_verification_test` only |
| Dependencies | IPFS and verification-chain reads mocked; no external RPC; API E2E uses Hardhat chain 31337 |

## Runtime limits

- PostgreSQL pool: max 10, min 0, idle timeout 10,000 ms, acquisition timeout 2,000 ms.
- JSON and URL-encoded bodies: 1 MiB each. Certificate/verification files: 10 MiB defaults.
- General API limiter: 300 requests per 15 minutes; login 10; registration 5; password reset 5; public hash/ID/token verification 60; file verification 20. Stores are process-local.
- Account lock: 5 failed attempts for 15 minutes.
- Pagination: default 20, maximum 100. Analytics list limits are 50 or 100 depending on route.

The load harness raises limit ceilings only for throughput scenarios and separately exercises the real limiter implementation. It does not reduce bcrypt cost or alter business logic.

