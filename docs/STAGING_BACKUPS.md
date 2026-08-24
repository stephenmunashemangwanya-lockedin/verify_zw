# Staging Backups

Run PostgreSQL 18 client tools from an isolated scheduled job. Encrypt before transfer to a private off-host object store, use a staging-only prefix and least-privilege write/read credentials, and retain immutable checksummed manifests. Suggested starting policy is 14 daily, 8 weekly and 12 monthly backups, subject to operator/legal approval.

Alert on job failure, age, checksum and storage capacity. Perform a scheduled restore into a disposable database and record RPO/RTO evidence. Verify database and file/IPFS metadata consistency. Never upload development backups, and restore staging only through the reviewed last-resort procedure.
