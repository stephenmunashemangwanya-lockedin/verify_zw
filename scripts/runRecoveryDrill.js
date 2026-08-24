require("dotenv").config({ quiet: true });
const fs = require("fs"); const path = require("path"); const { Client } = require("pg");
const { backupDatabase } = require("./backupDatabase"); const { restoreDatabase } = require("./restoreDatabase"); const { verifyBackup } = require("./verifyBackup");
const runRecoveryDrill = async () => {
  const source = String(process.env.TEST_DB_NAME || ""); const target = String(process.env.RESTORE_DB_NAME || "skill_verification_restore_test");
  if (!/_test$/.test(source) || !/_restore_test$/.test(target) || source === process.env.DB_NAME || target === process.env.DB_NAME) throw new Error("Recovery drill database names are unsafe.");
  const config = { host: process.env.TEST_DB_HOST || process.env.DB_HOST, port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT), user: process.env.TEST_DB_USER || process.env.DB_USER, password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD };
  const adminDatabase = process.env.TEST_DB_ADMIN_NAME || "postgres"; const sourceClient = new Client({ ...config, database: source }); const admin = new Client({ ...config, database: adminDatabase }); let targetClient;
  try {
    await sourceClient.connect(); await sourceClient.query("CREATE TABLE IF NOT EXISTS stage25_recovery_fixture (id integer PRIMARY KEY, evidence_hash text NOT NULL UNIQUE)"); await sourceClient.query("TRUNCATE stage25_recovery_fixture"); await sourceClient.query("INSERT INTO stage25_recovery_fixture(id, evidence_hash) VALUES ($1, $2)", [1, "fixture-sha256"]);
    await admin.connect(); const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [target]); if (!exists.rowCount) await admin.query(`CREATE DATABASE ${target}`);
    const backup = await backupDatabase({ database: source, host: config.host, port: config.port, user: config.user, password: config.password, directory: process.env.BACKUP_DIRECTORY || "backups/database", environment: "test", executable: process.env.PG_DUMP_PATH || "pg_dump" });
    const verified = await verifyBackup(backup.manifestPath, { executable: process.env.PG_RESTORE_PATH || "pg_restore" });
    const restored = await restoreDatabase({ manifestPath: backup.manifestPath, target, confirm: true, host: config.host, port: config.port, user: config.user, password: config.password, pgRestorePath: process.env.PG_RESTORE_PATH || "pg_restore" });
    targetClient = new Client({ ...config, database: target }); await targetClient.connect(); const fixture = await targetClient.query("SELECT id, evidence_hash FROM stage25_recovery_fixture ORDER BY id"); const indexes = await targetClient.query("SELECT COUNT(*)::int AS count FROM pg_indexes WHERE schemaname='public' AND tablename='stage25_recovery_fixture'");
    if (fixture.rowCount !== 1 || fixture.rows[0].evidence_hash !== "fixture-sha256" || indexes.rows[0].count < 2) throw new Error("Recovery fixture verification failed.");
    const report = { backupId: backup.manifest.backupId, sourceDatabase: source, targetDatabase: target, backupVerified: verified.verified, restoreVerified: restored.restored, fixtureRows: fixture.rowCount, fixtureHashMatched: true, fixtureIndexes: indexes.rows[0].count };
    const reportPath = path.resolve("restore-test/recovery-drill-report.json"); fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`); return report;
  } finally {
    if (targetClient) await targetClient.end().catch(() => {}); await sourceClient.query("DROP TABLE IF EXISTS stage25_recovery_fixture").catch(() => {}); await sourceClient.end().catch(() => {});
    if (admin._connected) { await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()", [target]).catch(() => {}); await admin.query(`DROP DATABASE IF EXISTS ${target}`).catch(() => {}); await admin.end().catch(() => {}); }
  }
};
if (require.main === module) runRecoveryDrill().then((report) => console.log(JSON.stringify(report, null, 2))).catch((error) => { console.error(error.code || error.message); process.exitCode = 1; });
module.exports = { runRecoveryDrill };
