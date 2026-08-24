# Docker testing

The test Compose file uses `skill_verification_test`, an ephemeral PostgreSQL filesystem, an internal-only network, and local Hardhat. It never mounts the development database volume. Run `npm run docker:test` after setting `TEST_POSTGRES_PASSWORD`.

Static container safety tests run with `npm run test:docker`. Container E2E requires a running Docker engine. IPFS must remain mocked or disabled, and cleanup must target only the test project: `docker compose -f docker-compose.test.yml down`. Add `--volumes` only when intentionally destroying test volumes.

Blockchain readiness distinguishes `not_configured`, `misconfigured`, `wrong_chain`, `contract_missing`, `unavailable`, and `healthy`. Healthy requires RPC access, the configured chain ID, deployed bytecode, ABI construction, and a bounded read-only contract call.

Backup utility builds require an accurate host/Docker clock because Debian repository metadata is time-validated. Synchronize the clock and rebuild without cache; never disable repository validity or signature checks.
