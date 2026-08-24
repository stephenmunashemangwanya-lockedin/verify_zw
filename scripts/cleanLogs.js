const fs = require("fs");
const path = require("path");
const directory = path.resolve(process.env.LOG_DIRECTORY || "logs");
if (path.basename(directory).toLowerCase() !== "logs") throw new Error("Refusing to clean a directory not named logs.");
for (const name of ["application.log", "error.log", "security.log", "performance.log"]) fs.rmSync(path.join(directory, name), { force: true });
