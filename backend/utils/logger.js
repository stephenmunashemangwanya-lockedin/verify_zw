const fs = require("fs");
const path = require("path");
const { redact } = require("./redaction");

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const sanitise = redact;
const enabled = (level) => levels[level] <= (levels[String(process.env.LOG_LEVEL || "info").toLowerCase()] ?? 2);
const category = (event, level) => level === "error" ? "error" : event.startsWith("security_") ? "security" : event.startsWith("performance_") ? "performance" : "application";
const fileName = (kind) => kind === "application" ? "application.log" : `${kind}.log`;

const writeFile = (entry, kind) => {
  if (process.env.NODE_ENV === "test" || process.env.LOG_TO_FILES !== "true") return;
  try {
    const directory = path.resolve(process.env.LOG_DIRECTORY || "logs");
    fs.mkdirSync(directory, { recursive: true });
    fs.appendFileSync(path.join(directory, fileName(kind)), `${JSON.stringify(entry)}\n`, { encoding: "utf8", flag: "a" });
  } catch { /* Logging must never crash request handling. */ }
};

const log = (level, event, metadata = {}) => {
  try {
    if (!enabled(level)) return null;
    const entry = { timestamp: new Date().toISOString(), level, event: String(event || "application_event").slice(0, 100), ...redact(metadata) };
    const line = JSON.stringify(entry);
    if (process.env.NODE_ENV !== "test" && process.env.LOG_TO_CONSOLE !== "false") (level === "error" ? console.error : console.log)(line);
    writeFile(entry, category(entry.event, level));
    return entry;
  } catch { return null; }
};

const logger = Object.fromEntries(Object.keys(levels).map((level) => [level, (event, metadata) => log(level, event, metadata)]));
const safeRoute = (req) => String(req.route?.path || req.baseUrl || req.path || "/").split("?")[0].slice(0, 200);
const requestLogger = (req, res, next) => {
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    const data = { requestId: req.requestId, correlationId: req.correlationId, method: req.method, route: safeRoute(req), statusCode: res.statusCode, durationMs: Number(durationMs.toFixed(3)), userId: req.user?.userId || null, institutionId: req.user?.institutionId || null, ip: String(req.ip || "").slice(0, 64), userAgent: String(req.get?.("user-agent") || "").slice(0, 256) };
    log(durationMs >= Number(process.env.SLOW_REQUEST_MS || 1000) ? "warn" : "info", durationMs >= Number(process.env.SLOW_REQUEST_MS || 1000) ? "performance_slow_request" : "http_request", data);
  });
  next();
};

module.exports = { log, logger, sanitise, requestLogger, safeRoute };
