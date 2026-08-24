# Container backup and restore

`npm run docker:backup` runs the Stage 25 backup utility against the internal PostgreSQL service and writes custom-format dumps plus SHA-256 manifests to the host `backups/database` directory. The utility runtime is pinned to `postgres:18.0-bookworm`, supplies PostgreSQL 18 `pg_dump`, `pg_restore`, and `psql`, and records the client and server versions in each new manifest. Passwords remain in the process environment and are not printed.

Before dumping, the utility reads `pg_dump --version` and the server's `server_version`. It fails closed when the client major version is older than the server major version; for example, `pg_dump` 15 cannot dump PostgreSQL 18. Same-major and newer clients are accepted. Verify both utility images with `docker compose --env-file .env.docker --profile tools run --rm --no-deps --entrypoint pg_dump backup --version` and the equivalent `pg_restore --version` command for `restore-test`.

For restore testing, provision only `skill_verification_restore_test`, select a manifest as `backups/database/restore.manifest.json`, then run `npm run docker:restore:test`. The Stage 25 checksum, manifest, `pg_restore --list`, explicit-confirmation, and target-name guards remain active. The report is persisted at `restore-test/restore-report.json`. Restore never targets the development database. File volumes should first be restored beneath `restore-test`, verified, and copied into live volumes only through a separate reviewed operation.

When the PostgreSQL server major version changes, update the pinned official PostgreSQL runtime in `docker/backup.Dockerfile` to the same major, rebuild both tool images without cache, verify all three client commands report that major, and complete a backup plus isolated restore test before deployment.

Normal `docker compose down` retains PostgreSQL and application volumes. `down --volumes` permanently deletes them and must never be used as routine shutdown.
