# Docker development

Install Docker Desktop with Linux containers. Copy `.env.docker.example` to `.env.docker`, replace every placeholder, then validate with `docker compose --env-file .env.docker --profile local config`. Start the complete stack with `npm run docker:up`; this enables the local profile, runs migrations, verifies or deploys the contract, starts the backend, and finally starts the frontend. Inspect it with `npm run docker:logs`.

On a genuinely empty database, the migration runner creates `schema_migrations`, verifies that no partial core schema exists, applies `000_initial_schema.sql`, then applies later migrations in order. Repeated runs skip matching checksums. A partial core schema or changed applied checksum fails closed. `seed.sql` is never executed automatically.

The backend is available at `http://localhost:3000`, frontend at `http://localhost:5173`, and local RPC at loopback port 8545. The one-shot deployment job reads the runtime chain ID and checks `eth_getCode` before trusting metadata in the named volume. Active metadata is reused; missing, wrong-chain, or stale local metadata is replaced by a verified local deployment. The backend mounts that metadata read-only at `/app/deployments`. Its shared resolver reads `/app/deployments/localhost/CredentialRegistry.json` for local chain 31337; readiness and contract operations validate the chain and deployed bytecode. Local metadata takes precedence over an old environment address. External networks require an explicit `CONTRACT_ADDRESS`. No manual local address copy is required.

Local chain 31337 uses an unlocked JSON-RPC signer selected by its current `DEFAULT_ADMIN_ROLE` on the deployed registry. No local private key is required or copied. Issuance still requires the signer to match the institution wallet and hold the institution role; revocation remains restricted by the contract to its issuer. External network writes require `DEPLOYER_PRIVATE_KEY` from private runtime configuration, passed through Compose without a default value. Never store keys in deployment metadata. Read-only blockchain readiness does not require a signer. The container launcher imports and starts the backend in its own process, but contract resolution no longer depends on a launcher environment assignment.

Hardhat state is intentionally ephemeral. A container restart or recreation can invalidate local proofs even though PostgreSQL and deployment metadata remain. Startup redeploys the registry but never marks old credential proofs valid; existing credential records require reconciliation after a chain reset. Production never auto-deploys.

Use `docker compose --env-file .env.docker --profile local stop` followed by `npm run docker:up` for a normal restart. Never use `docker compose down -v` unless intentionally destroying all named data.

Local credential issuance requires the real Pinata provider: set `IPFS_ENABLED=true`, `PINATA_JWT`, `IPFS_PROVIDER_API_URL`, and `PINATA_GATEWAY` in the ignored `.env.docker` file. The Compose defaults keep IPFS disabled and never fabricate a local CID.

`npm run docker:down` preserves volumes. `npm run docker:down:volumes` is destructive and removes named database and application volumes.

The container backup tools are pinned to PostgreSQL 18 to match the development server. Run `npm run docker:backup`, select the generated manifest as `backups/database/restore.manifest.json`, and run `npm run docker:restore:test`; restoration is restricted to `skill_verification_restore_test`. If the server major changes, update the utility runtime to the same official PostgreSQL major, rebuild without cache, verify `pg_dump`, `pg_restore`, and `psql` versions, and repeat the isolated backup/restore validation.
