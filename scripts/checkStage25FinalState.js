require("dotenv").config({ quiet: true });
const { Client } = require("pg");
(async () => {
  const tables = ["users", "institutions", "students", "credentials", "verification_logs", "audit_logs"];
  const liveConfig = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const live = new Client({ ...liveConfig, database: process.env.DB_NAME }); await live.connect(); const finalCounts = {};
  for (const table of tables) finalCounts[table] = Number((await live.query(`SELECT COUNT(1) AS count FROM ${table}`)).rows[0].count); await live.end();
  const testConfig = { host: process.env.TEST_DB_HOST || process.env.DB_HOST, port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT), user: process.env.TEST_DB_USER || process.env.DB_USER, password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD };
  const testClient = new Client({ ...testConfig, database: process.env.TEST_DB_NAME }); await testClient.connect(); const fixture = await testClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='stage25_recovery_fixture'"); await testClient.end();
  const admin = new Client({ ...testConfig, database: process.env.TEST_DB_ADMIN_NAME || "postgres" }); await admin.connect(); const restored = await admin.query("SELECT datname FROM pg_database WHERE datname='skill_verification_restore_test'"); await admin.end();
  console.log(JSON.stringify({ finalCounts, fixtureTableRemoved: fixture.rowCount === 0, restoreTestDatabaseRemoved: restored.rowCount === 0 }));
})().catch((error) => { console.error(error.code || error.message); process.exitCode = 1; });
