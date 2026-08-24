const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SAFE_DATABASE = /^[A-Za-z0-9_]+$/;
const sha256File = async (file) => {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(file);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
};
const timestamp = (date = new Date()) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "_");
const assertDatabaseName = (name) => { if (!SAFE_DATABASE.test(String(name || ""))) throw new Error("Database name is missing or unsafe."); return name; };
const assertRestoreTarget = (target, { source, development, production } = {}) => {
  assertDatabaseName(target);
  if (!/_(?:restore_)?test$/.test(target)) throw new Error("Restore target must end in _test or _restore_test.");
  if ([source, development, production].filter(Boolean).includes(target)) throw new Error("Restore target conflicts with a protected or source database.");
  return target;
};
const resolveInside = (root, candidate) => { const base = path.resolve(root); const resolved = path.resolve(base, candidate); if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw new Error("Path traversal is not allowed."); return resolved; };
const readManifest = (manifestPath) => { const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")); if (!parsed.backupId || !parsed.createdAt || !parsed.checksum?.sha256) throw new Error("Backup manifest is invalid."); return parsed; };
const safeEnvironment = (overrides = {}) => ({ ...process.env, ...overrides, PGPASSWORD: overrides.PGPASSWORD || process.env.DB_PASSWORD || "" });
const parsePostgresMajor = (version) => {
  const value = String(version || "").trim();
  const match = value.match(/PostgreSQL\)?\s+(\d+)(?:\.\d+)?/i) || value.match(/^(\d+)(?:\.\d+)?/);
  if (!match) throw new Error("PostgreSQL version could not be parsed.");
  return Number(match[1]);
};
const assertPostgresCompatibility = (clientVersion, serverVersion) => {
  const clientMajor = parsePostgresMajor(clientVersion); const serverMajor = parsePostgresMajor(serverVersion);
  if (clientMajor < serverMajor) throw new Error(`PostgreSQL client major ${clientMajor} is older than server major ${serverMajor}; backup refused.`);
  return { clientMajor, serverMajor };
};
const readToolVersion = (executable, { spawn, label } = {}) => {
  const runner = spawn || require("child_process").spawnSync;
  const result = runner(executable, ["--version"], { encoding: "utf8", windowsHide: true });
  const version = String(result.stdout || result.stderr || "").trim();
  if (result.error || result.status !== 0 || !version) throw new Error(`${label || "PostgreSQL tool"} version check failed.`);
  parsePostgresMajor(version);
  return version.slice(0, 100);
};
module.exports = { sha256File, timestamp, assertDatabaseName, assertRestoreTarget, resolveInside, readManifest, safeEnvironment, parsePostgresMajor, assertPostgresCompatibility, readToolVersion };
