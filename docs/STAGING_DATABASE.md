# Staging Database

Provision a PostgreSQL 18 managed instance where compatible, private/firewalled to staging, with provider backups and TLS required. Create a dedicated `zsvp_staging` database, an application role limited to required DML/sequences, and a separate migration role allowed to apply reviewed schema migrations. Do not grant public access or superuser to the app.

Operator inputs: `DATABASE_URL` (or component settings), CA certificate, TLS policy, pool allowance, app credential, migration credential, backup schedule/retention and maintenance window. Inject credentials at runtime. Run connectivity with the app role, then migrations once with the migration role. The application supports URL or component settings, verified TLS, pool max/min, connection timeout and idle timeout.

Backups use PostgreSQL 18 client tools. Confirm checksum/manifest and perform a restore into a disposable isolated database before acceptance. Never run a destructive restore against staging automatically.
