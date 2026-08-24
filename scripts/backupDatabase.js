require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require("pg");
const pkg = require("../package.json");
const { sha256File, timestamp, assertDatabaseName, safeEnvironment, assertPostgresCompatibility, readToolVersion } = require("./recoveryUtils");

const backupDatabase = async (options = {}) => {
  const pick = (key, fallback) => Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback;
  const database = assertDatabaseName(pick("database", process.env.BACKUP_DB_NAME || process.env.DB_NAME));
  const host = pick("host", process.env.BACKUP_DB_HOST || process.env.DB_HOST);
  const port = String(options.port || process.env.BACKUP_DB_PORT || process.env.DB_PORT || "");
  const user = options.user || process.env.BACKUP_DB_USER || process.env.DB_USER;
  const password = options.password || process.env.BACKUP_DB_PASSWORD || process.env.DB_PASSWORD;
  if (![host, port, user, password].every((value) => String(value || "").trim())) throw new Error("Database backup configuration is incomplete.");
  const executable = options.executable || process.env.PG_DUMP_PATH || "pg_dump";
  const clientVersion = readToolVersion(executable, { spawn: options.spawn, label: "pg_dump" });
  let serverVersion = options.serverVersion; const versionClient = options.versionClient || (!serverVersion && new Client({ host, port: Number(port), database, user, password }));
  if (!serverVersion) {
    if (!options.versionClient) await versionClient.connect();
    try { serverVersion = (await versionClient.query("SHOW server_version")).rows[0].server_version; }
    finally { if (!options.versionClient) await versionClient.end(); }
  }
  const versions = assertPostgresCompatibility(clientVersion, serverVersion);
  const environmentLabel = String(options.environment || process.env.BACKUP_ENVIRONMENT || "development").toLowerCase();
  if (environmentLabel === "production" && options.confirmProduction !== true && process.env.CONFIRM_PRODUCTION_BACKUP !== "true") throw new Error("Production backup requires explicit confirmation.");
  const directory = path.resolve(options.directory || process.env.BACKUP_DIRECTORY || "backups/database"); fs.mkdirSync(directory, { recursive: true });
  const backupId = `skill_verification_${timestamp(options.now)}`;
  const dumpPath = path.join(directory, `${backupId}.dump`); const manifestPath = path.join(directory, `${backupId}.manifest.json`);
  if (fs.existsSync(dumpPath) || fs.existsSync(manifestPath)) throw new Error("Backup output already exists.");
  const result = (options.spawn || spawnSync)(executable, ["--format=custom", "--no-owner", "--no-privileges", "--host", host, "--port", port, "--username", user, "--file", dumpPath, database], { env: safeEnvironment({ PGPASSWORD: password }), encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) { fs.rmSync(dumpPath, { force: true }); throw new Error(`pg_dump failed (${result.error?.code || result.status || "unknown"}).`); }
  const stat = fs.statSync(dumpPath); if (!stat.isFile() || stat.size === 0) throw new Error("Database backup is empty.");
  const checksum = await sha256File(dumpPath);
  const manifest = { backupId, createdAt: new Date().toISOString(), databaseName: database, postgresVersion: String(serverVersion).slice(0, 100), postgresClientVersion: clientVersion, postgresServerVersion: String(serverVersion).slice(0, 100), postgresClientMajor: versions.clientMajor, postgresServerMajor: versions.serverMajor, backupFilename: path.basename(dumpPath), backupSize: stat.size, checksum: { algorithm: "SHA-256", sha256: checksum }, applicationVersion: pkg.version, migrationVersion: "006", schemaVersion: "006", environment: environmentLabel, includedFileGroups: ["postgresql"], encryption: { enabled: false, method: null }, verification: { status: "pending" } };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  return { dumpPath, manifestPath, manifest };
};
if (require.main === module) backupDatabase().then(({ manifest }) => console.log(JSON.stringify({ backupId: manifest.backupId, backupFilename: manifest.backupFilename, backupSize: manifest.backupSize }))).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { backupDatabase };
