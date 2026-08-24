require("dotenv").config({ quiet: true });
const pool = require("../backend/config/database");
const { resetAdminPassword, dependencies } = require("./adminOperations");
const args = process.argv.slice(2); const emailIndex = args.indexOf("--email");
(async () => {
  const user = await resetAdminPassword({ email: emailIndex >= 0 ? args[emailIndex + 1] : null, password: process.env.ADMIN_RESET_PASSWORD }, dependencies());
  console.log(`Administrator password recovery completed for user ${user.id}. Existing sessions were invalidated; password change is required.`);
})().catch((error) => { console.error(`Administrator password recovery failed: ${error.code || "ADMIN_RESET_ERROR"}.`); process.exitCode = 1; }).finally(() => pool.end());
