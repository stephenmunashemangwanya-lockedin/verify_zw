require("dotenv").config({ quiet: true });
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const { Client } = require("pg");
const { verifyBackup } = require("./verifyBackup");
const { assertRestoreTarget, readManifest, safeEnvironment } = require("./recoveryUtils");
const TABLES = ["users", "institutions", "students", "credentials", "verification_logs", "audit_logs"];
const restoreDatabase = async (options = {}) => {
  const manifestPath = path.resolve(options.manifestPath || process.env.BACKUP_MANIFEST || ""); const manifest = readManifest(manifestPath);
  const target = assertRestoreTarget(options.target || process.env.RESTORE_DB_NAME, { source: manifest.databaseName, development: process.env.DB_NAME, production: process.env.PRODUCTION_DB_NAME });
  if (options.confirm !== true && process.env.CONFIRM_TEST_RESTORE !== "true") throw new Error("Destructive test restore requires explicit confirmation.");
  const verification = await verifyBackup(manifestPath, { executable: options.pgRestorePath, spawn: options.spawn });
  const dumpPath = path.join(path.dirname(manifestPath), manifest.backupFilename); const host = options.host || process.env.TEST_DB_HOST || process.env.DB_HOST; const port = String(options.port || process.env.TEST_DB_PORT || process.env.DB_PORT); const user = options.user || process.env.TEST_DB_USER || process.env.DB_USER; const password = options.password || process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD;
  if (![host, port, user, password].every(Boolean)) throw new Error("Restore configuration is incomplete.");
  const executable = options.pgRestorePath || process.env.PG_RESTORE_PATH || "pg_restore"; const result = (options.spawn || spawnSync)(executable, ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--exit-on-error", "--host", host, "--port", port, "--username", user, "--dbname", target, dumpPath], { env: safeEnvironment({ PGPASSWORD: password }), encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`pg_restore failed (${result.error?.code || result.status || "unknown"}).`);
  const client = options.client || new Client({ host, port: Number(port), database: target, user, password }); if (!options.client) await client.connect();
  try { const counts = {}; for (const table of TABLES) counts[table] = (await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`)).rows[0].count; const schema = await client.query("SELECT COUNT(*)::int AS count FROM information_schema.columns WHERE table_schema='public'"); const indexes = await client.query("SELECT COUNT(*)::int AS count FROM pg_indexes WHERE schemaname='public'"); return { restored: true, targetDatabase: target, sourceDatabase: manifest.databaseName, pgRestoreVersion: verification.pgRestoreVersion, backupVerified: verification.verified, checksumVerified: true, dumpListed: verification.listed, counts, schemaColumns: schema.rows[0].count, indexes: indexes.rows[0].count }; }
  finally { if (!options.client) await client.end(); }
};
if (require.main === module) restoreDatabase({ manifestPath: process.argv[2] }).then((report) => { const out = path.resolve(process.env.RESTORE_REPORT || "restore-test/restore-report.json"); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify(report)); }).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { restoreDatabase, TABLES };
