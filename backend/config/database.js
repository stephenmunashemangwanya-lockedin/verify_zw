const { Pool } = require("pg");

const ssl = process.env.DB_SSL === "true"
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false", ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n") } : {}) }
  : undefined;
const pool = new Pool({
  ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }),
  ssl,
  max: Number(process.env.DB_POOL_MAX || 10),
  min: Number(process.env.DB_POOL_MIN || 0),
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS || 10000),
  connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || 2000),
});

pool.on("connect", () => {
  require("../utils/logger").log("info", "database_connected");
});

pool.on("error", (error) => {
  require("../utils/logger").log("error", "database_pool_error", { errorCode: error.code || "DATABASE_ERROR" });
});

module.exports = pool;
