const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ quiet: true });

const migrationsDirectory = path.join(__dirname, "migrations");
const CORE_TABLES = ["institutions", "users", "students", "credentials", "verification_logs", "audit_logs"];
const DESTRUCTIVE_SQL = /\b(DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE|DELETE\s+FROM)\b/i;
const checksum = (sql) => crypto.createHash("sha256").update(sql).digest("hex");
const migrationFiles = (directory = migrationsDirectory) => fs.readdirSync(directory).filter((name) => /^\d{3}_[A-Za-z0-9_.-]+\.sql$/.test(name)).sort((a, b) => a.localeCompare(b));
const transactionalBody = (sql) => sql.replace(/^\s*BEGIN;\s*/i, "").replace(/\s*COMMIT;\s*$/i, "");
const assertSafeInitialSchema = (sql) => { if (DESTRUCTIVE_SQL.test(sql)) throw new Error("Initial schema contains destructive SQL."); if (!/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+"?pgcrypto"?/i.test(sql)) throw new Error("Initial schema must create pgcrypto."); for (const table of CORE_TABLES) if (!new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${table}\\b`, "i").test(sql)) throw new Error(`Initial schema is missing ${table}.`); };

const inspectCoreSchema = async (client) => {
  const result = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])", [CORE_TABLES]);
  const present = new Set(result.rows.map((row) => row.table_name));
  if (present.size > 0 && present.size < CORE_TABLES.length) throw Object.assign(new Error("Partial core schema detected; migration stopped without changes."), { code: "PARTIAL_SCHEMA" });
  if (present.size === 0) {
    const other = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name <> 'schema_migrations'");
    if (other.rowCount) throw Object.assign(new Error("Database is not empty; refusing initial bootstrap."), { code: "NONEMPTY_UNKNOWN_SCHEMA" });
  }
  return present.size === CORE_TABLES.length ? "complete" : "empty";
};

const runMigrations = async ({ pool, directory = migrationsDirectory, logger = console } = {}) => {
  if (!pool) pool = require("../config/database");
  const client = await pool.connect(); const appliedNow = []; const adopted = [];
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY, migration_name VARCHAR(255) UNIQUE NOT NULL,
      checksum VARCHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      execution_ms INTEGER NOT NULL
    )`);
    const state = await inspectCoreSchema(client); const files = migrationFiles(directory);
    for (const fileName of files) {
      const sql = fs.readFileSync(path.join(directory, fileName), "utf8"); const digest = checksum(sql);
      const prior = await client.query("SELECT checksum FROM schema_migrations WHERE migration_name=$1", [fileName]);
      if (prior.rowCount) { if (prior.rows[0].checksum !== digest) throw Object.assign(new Error(`Applied migration checksum mismatch: ${fileName}`), { code: "MIGRATION_CHECKSUM_MISMATCH" }); continue; }
      if (fileName === "000_initial_schema.sql") {
        assertSafeInitialSchema(sql);
        if (state === "complete") { await client.query("INSERT INTO schema_migrations(migration_name,checksum,execution_ms) VALUES($1,$2,0)", [fileName, digest]); adopted.push(fileName); continue; }
      }
      const started = Date.now(); await client.query("BEGIN");
      try { await client.query(transactionalBody(sql)); await client.query("INSERT INTO schema_migrations(migration_name,checksum,execution_ms) VALUES($1,$2,$3)", [fileName, digest, Date.now() - started]); await client.query("COMMIT"); appliedNow.push(fileName); }
      catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
    }
    logger.log(JSON.stringify({ applied: appliedNow, adopted, skipped: files.length - appliedNow.length - adopted.length }));
    return { applied: appliedNow, adopted, skipped: files.length - appliedNow.length - adopted.length };
  } finally { client.release(); }
};

if (require.main === module) { const pool = require("../config/database"); runMigrations({ pool }).catch((error) => { console.error("Database migration failed:", error.code || error.message); process.exitCode = 1; }).finally(() => pool.end()); }
module.exports = { runMigrations, migrationFiles, checksum, transactionalBody, assertSafeInitialSchema, inspectCoreSchema, CORE_TABLES };
