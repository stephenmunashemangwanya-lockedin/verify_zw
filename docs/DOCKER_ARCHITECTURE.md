# Docker architecture

Development Compose defines an Nginx frontend, Express backend, PostgreSQL 18, local Hardhat chain, one-shot migration and contract-deployment jobs, plus backup/restore tools. Startup order is PostgreSQL health, blockchain health, migration completion, verified local deployment, backend health, then frontend. The deployment job writes metadata; the backend consumes it read-only and independently checks chain ID and bytecode before starting.

The backup and restore services share a multi-stage utility image: Node 24 prepares the JavaScript dependencies, while the pinned `postgres:18.0-bookworm` runtime supplies PostgreSQL 18 client tools. Its runtime guard rejects a `pg_dump` client older than the connected server.

Host ports are loopback-bound: frontend 5173, backend 3000, and optional Hardhat 8545. PostgreSQL has no host port. Local blockchain services use the opt-in `local` profile, so production excludes them by not activating that profile and requires an externally supplied network/RPC/contract configuration.
