# Administrator bootstrap and recovery

Public registration always creates an unprivileged `verifier`; it cannot create `super_admin` or other privileged roles. Administrator bootstrap is an explicit local operations command, is never mounted as an HTTP route, and is never run by startup or migrations.

## First administrator

Bootstrap is permitted only when no active `super_admin` exists and `ALLOW_ADMIN_BOOTSTRAP=true` is set for that invocation. Supply `BOOTSTRAP_ADMIN_FULL_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` in the current process environment, then run `npm run admin:bootstrap`. The email is normalised and validated. The existing password policy applies and bcrypt cost 12 is retained. The account is active, globally scoped with no institution, and uses database token-version defaults.

The command refuses malformed input, weak passwords, duplicate email, database errors, and normal execution when an active super administrator exists. It prints neither passwords nor hashes and records `SUPER_ADMIN_BOOTSTRAPPED`.

An exceptional recovery bootstrap requires both `ALLOW_ADMIN_BOOTSTRAP=true` and `ALLOW_ADMIN_BOOTSTRAP_OVERRIDE=true`. It does not change existing administrators or permit role selection. It records `ADMIN_BOOTSTRAP_OVERRIDE_USED` plus a high-severity security event. Enable it only through an approved incident procedure, then remove both flags.

## Administrator password recovery

Set `ADMIN_RESET_PASSWORD` in the current environment and run `npm run admin:reset-password -- --email <administrator-email>`. Only existing `super_admin` or `institution_admin` accounts are eligible. The command applies the existing password policy and bcrypt cost, increments `token_version`, clears failed attempts and the temporary lock, clears reset material, and sets `must_change_password=true`. It records `ADMIN_PASSWORD_RESET` and a controlled security event.

Remove all sensitive variables from the terminal immediately afterward. Do not place credentials in `.env`, command arguments, source files, tickets, or logs. Never update password hashes manually in PostgreSQL: doing so bypasses policy, session invalidation, lock cleanup, and audit evidence.

## Troubleshooting

Failures return a nonzero exit code and a stable error classification without sensitive values. Confirm database connectivity and migrations, verify that the email is correct, and use the override only when an approved recovery case requires an additional super administrator. Database errors fail closed.

## Docker Compose administrator tools

Docker development administrator operations must use the dedicated `admin-tools` service. It is gated by the `tools` profile, publishes no host ports, attaches only to the internal data network, runs as the unprivileged `node` user, and targets `postgres:5432` using the configured `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` values. It uses the `admin-tools` target in the root Dockerfile, which reuses the application's production dependency layer and includes only the backend and existing administrator scripts needed at runtime. Its harmless default command is `node --version`; it never bootstraps an account during startup.

Do not run administrator bootstrap directly on Windows when that would target a PostgreSQL server on `localhost`. Use `admin-tools` inside the Compose network. Do not use the backup or test-runner services for administrator operations.

### First super-administrator bootstrap

Run this block from the project root. The password exists only in secured input, a briefly allocated native string, and the current process environment while Docker transfers it to the one-off container. It is not printed or written to `.env`.

```powershell
$securePassword = Read-Host "Password for SA@skillverify.co.zw" -AsSecureString
$passwordPointer = [IntPtr]::Zero
try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $env:BOOTSTRAP_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $env:BOOTSTRAP_ADMIN_FULL_NAME = "STEPHEN MUNASHE MANGWANYA"
  $env:BOOTSTRAP_ADMIN_EMAIL = "SA@skillverify.co.zw"
  $env:ALLOW_ADMIN_BOOTSTRAP = "true"

  docker compose --env-file .env.docker --profile tools run --rm `
    -e BOOTSTRAP_ADMIN_PASSWORD `
    -e BOOTSTRAP_ADMIN_FULL_NAME `
    -e BOOTSTRAP_ADMIN_EMAIL `
    -e ALLOW_ADMIN_BOOTSTRAP `
    admin-tools npm run admin:bootstrap
}
finally {
  Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:BOOTSTRAP_ADMIN_FULL_NAME -ErrorAction SilentlyContinue
  Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:ALLOW_ADMIN_BOOTSTRAP -ErrorAction SilentlyContinue
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  $securePassword.Dispose()
}
```

Never set `ALLOW_ADMIN_BOOTSTRAP_OVERRIDE` for normal first-administrator creation.

### Administrator password reset

Replace the email with the existing administrator account being recovered:

```powershell
$administratorEmail = "SA@skillverify.co.zw"
$securePassword = Read-Host "New administrator password" -AsSecureString
$passwordPointer = [IntPtr]::Zero
try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $env:ADMIN_RESET_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

  docker compose --env-file .env.docker --profile tools run --rm `
    -e ADMIN_RESET_PASSWORD `
    admin-tools npm run admin:reset-password -- --email $administratorEmail
}
finally {
  Remove-Item Env:ADMIN_RESET_PASSWORD -ErrorAction SilentlyContinue
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  $securePassword.Dispose()
}
```

### Read-only verification

After the operator performs the bootstrap, these queries return only controlled counts and audit metadata; they do not select password hashes, reset tokens, JWTs, cookies, or CSRF tokens.

```powershell
"SELECT COUNT(*) AS active_super_admins FROM users WHERE role = 'super_admin' AND is_active = TRUE;" | docker compose --env-file .env.docker exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'

"SELECT COUNT(*) AS intended_admins FROM users WHERE LOWER(email) = 'sa@skillverify.co.zw' AND role = 'super_admin' AND institution_id IS NULL AND is_active = TRUE;" | docker compose --env-file .env.docker exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'

"SELECT COUNT(*) AS legacy_verifier_unchanged FROM users WHERE LOWER(email) = 'admin@skillverify.co.zw' AND role = 'verifier' AND institution_id IS NULL AND is_active = TRUE;" | docker compose --env-file .env.docker exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'

"SELECT action, entity_type, entity_id, created_at FROM audit_logs WHERE action = 'SUPER_ADMIN_BOOTSTRAPPED' ORDER BY created_at DESC LIMIT 1;" | docker compose --env-file .env.docker exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
```

### Common errors

- `ACTIVE_SUPER_ADMIN_EXISTS`: an active super administrator already exists; stop and verify the target database. Do not enable the override.
- `WEAK_ADMIN_PASSWORD`: choose a password satisfying the existing password policy; do not weaken the policy.
- Wrong database target: verify the resolved service has `DB_HOST=postgres`, `DB_PORT=5432`, and the expected non-test `DB_NAME` before running anything.
- Missing Compose profile or service: include `--profile tools` and run the explicit `admin-tools` service.
