require("dotenv").config({ quiet: true });
const pool = require("./config/database");
const { validateEnvironment } = require("./config/environment");
const { createApp } = require("./app");
const { log } = require("./utils/logger");

let httpServer;
let shuttingDown = false;

const startServer = async () => {
  const config = validateEnvironment();
  const app = createApp();
  httpServer = app.listen(config.port, () => log("info", "server_started", { port: config.port }));
  return httpServer;
};

const shutdown = async (signal = "shutdown") => {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", "server_shutdown_started", { signal });
  const forceTimer = setTimeout(() => { log("error", "server_shutdown_forced"); process.exit(1); }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000));
  forceTimer.unref();
  try {
    if (httpServer) await new Promise((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
    await pool.end();
    clearTimeout(forceTimer);
    log("info", "server_shutdown_complete");
    if (require.main === module) process.exit(0);
  } catch (error) {
    clearTimeout(forceTimer);
    log("error", "server_shutdown_failed", { errorCode: error.code || "SHUTDOWN_ERROR" });
    if (require.main === module) process.exit(1);
  }
};

if (require.main === module) {
  startServer().catch((error) => { log("error", "server_start_failed", { errorCode: error.code || "STARTUP_ERROR", message: error.message }); process.exit(1); });
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("uncaughtException", (error) => { log("error", "fatal_uncaught_exception", { errorCode: error.code || "UNCAUGHT_EXCEPTION", message: error.message }); shutdown("uncaughtException"); });
  process.once("unhandledRejection", (reason) => { log("error", "fatal_unhandled_rejection", { errorCode: reason?.code || "UNHANDLED_REJECTION", message: reason?.message }); shutdown("unhandledRejection"); });
}

module.exports = { startServer, shutdown, getServer: () => httpServer };
