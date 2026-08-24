require("dotenv").config({ quiet: true });
const pool = require("../backend/config/database");
const { bootstrapAdmin, dependencies } = require("./adminOperations");
(async () => {
  const user = await bootstrapAdmin({ fullName: process.env.BOOTSTRAP_ADMIN_FULL_NAME, email: process.env.BOOTSTRAP_ADMIN_EMAIL, password: process.env.BOOTSTRAP_ADMIN_PASSWORD, allowBootstrap: process.env.ALLOW_ADMIN_BOOTSTRAP === "true", allowOverride: process.env.ALLOW_ADMIN_BOOTSTRAP_OVERRIDE === "true" }, dependencies());
  console.log(`Super administrator bootstrap completed for user ${user.id}. Remove bootstrap variables from the current session.`);
})().catch((error) => { console.error(`Administrator bootstrap failed: ${error.code || "ADMIN_BOOTSTRAP_ERROR"}.`); process.exitCode = 1; }).finally(() => pool.end());
