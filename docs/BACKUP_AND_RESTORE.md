# Backup and restore

Install PostgreSQL client tools compatible with the server and set `PG_DUMP_PATH` and `PG_RESTORE_PATH` when they are not on `PATH`. The backup guard parses `pg_dump --version` and the server version and rejects a client whose major version is older than the server; PostgreSQL 15 therefore cannot dump PostgreSQL 18. Matching and newer client majors are accepted. `npm run backup:db` creates a timestamped custom-format dump, SHA-256 checksum in a JSON manifest, and safe metadata including client/server versions. Passwords are passed only through the child-process environment and are never printed. Production backup requires `CONFIRM_PRODUCTION_BACKUP=true`.

`npm run backup:verify -- <manifest>` verifies non-zero size, checksum, age policy, manifest fields, and `pg_restore --list`. A zero exit status alone is not sufficient.

Database restore accepts only `_test` or `_restore_test`, refuses the source, development, and configured production database, verifies the checksum and manifest, records `pg_restore --version`, requires a successful `pg_restore --list`, and requires `CONFIRM_TEST_RESTORE=true`. It runs `pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error`, then reports table counts, schema columns, and indexes.

`npm run backup:files` creates a gzip-compressed JSON evidence archive with relative paths and per-file SHA-256 hashes. It excludes `.env`, secrets, temporary uploads, logs, dependencies, coverage, and test artifacts. File restore defaults beneath `restore-test`, blocks traversal, checks archive and file hashes, and refuses overwrite.

Backups are unencrypted by default. For production, wrap verified artifacts with `age` or GPG using a recipient/key held outside the repository and backup. This repository does not claim encryption support until that external tool is configured and separately tested.
