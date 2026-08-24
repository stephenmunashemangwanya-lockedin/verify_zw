require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { sha256File, readManifest, readToolVersion } = require("./recoveryUtils");
const verifyBackup = async (manifestPath, options = {}) => {
  const manifest = readManifest(path.resolve(manifestPath || process.env.BACKUP_MANIFEST || "")); const dumpPath = path.join(path.dirname(path.resolve(manifestPath)), manifest.backupFilename);
  if (!fs.existsSync(dumpPath) || fs.statSync(dumpPath).size === 0) throw new Error("Backup file is missing or empty.");
  if (await sha256File(dumpPath) !== manifest.checksum.sha256) throw new Error("Backup checksum mismatch.");
  const executable = options.executable || process.env.PG_RESTORE_PATH || "pg_restore"; const toolVersion = readToolVersion(executable, { spawn: options.spawn, label: "pg_restore" }); const result = (options.spawn || spawnSync)(executable, ["--list", dumpPath], { encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0 || !String(result.stdout || "").trim()) throw new Error("Database dump listing failed.");
  const ageHours = (Date.now() - Date.parse(manifest.createdAt)) / 36e5; const maxAge = Number(options.maxAgeHours || process.env.BACKUP_MAX_AGE_HOURS || 48); if (!Number.isFinite(ageHours) || ageHours > maxAge) throw new Error("Backup is older than policy permits.");
  return { verified: true, backupId: manifest.backupId, checksum: manifest.checksum.sha256, listed: true, pgRestoreVersion: toolVersion };
};
if (require.main === module) verifyBackup(process.argv[2]).then((report) => console.log(JSON.stringify(report))).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { verifyBackup };
