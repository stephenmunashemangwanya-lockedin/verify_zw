# Database integrity

`npm run integrity:check` performs read-only checks for orphaned students, credentials, verification logs and audit logs; duplicate certificate hashes; active credentials missing IPFS, transaction, or contract evidence; revoked credentials missing revocation metadata; and unsupported statuses. It never repairs or deletes data. Investigate findings through controlled reconciliation and preserve audit evidence.

Fresh installations are governed by `schema_migrations`: migration name, SHA-256 checksum, application timestamp, and execution time. Applied checksum changes and partial core schemas are integrity failures, not automatic repair opportunities.
