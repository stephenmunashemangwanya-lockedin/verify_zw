const { spawnSync } = require("child_process"); const fs = require("fs"); const path = require("path"); const frontend = path.resolve(__dirname, "../frontend");
const playwright = require(require.resolve("playwright", { paths: [frontend] }));
if (!fs.existsSync(playwright.chromium.executablePath())) { console.log("SKIPPED browser E2E: Playwright Chromium is not installed. Run: npx playwright install chromium"); process.exit(0); }
const args = ["playwright", "test"];
if (process.argv.includes("--accessibility")) args.push("--grep", "@a11y");
const result = spawnSync("npx.cmd", args, { cwd: frontend, stdio: "inherit", shell: true });
if (result.status === 0) process.exit(0);
process.exit(result.status || 1);
