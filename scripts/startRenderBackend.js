const { runMigrations } = require("../backend/database/runMigrations");
const pool = require("../backend/config/database");
const { start } = require("./startDockerBackend");

async function main() {
  await runMigrations({ pool });
  await start();
}

main().catch(async (error) => {
  console.error(JSON.stringify({
    event: "render_startup_failed",
    errorCode: error.code || "STARTUP_ERROR",
    message: error.message
  }));

  try {
    await pool.end();
  } catch {}

  process.exitCode = 1;
});
