const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { sanitise, log, requestLogger } = require("../backend/utils/logger");
const { requestIdMiddleware } = require("../backend/middleware/securityMiddleware");
const { timeOperation } = require("../backend/utils/performance");
const { sendAlert, setAlertTransport } = require("../backend/services/alertService");

test("structured application, error, security and performance logs are controlled", async () => {
  for (const [level, event] of [["info", "application_test"], ["error", "error_test"], ["warn", "security_test"], ["info", "performance_test"]]) { const entry = log(level, event, { requestId: "r1" }); assert.equal(entry.event, event); assert.ok(entry.timestamp); assert.equal(entry.level, level); }
  await timeOperation("database", async () => 1);
});
test("secrets are recursively redacted from arrays, objects and values", () => {
  const secret = "do-not-print"; const output = JSON.stringify(sanitise({ password: secret, passwordHash: secret, jwt: secret, authorization: `Bearer ${secret}`, private_key: secret, databasePassword: secret, pinataJwt: secret, resetToken: secret, certificateBytes: Buffer.from(secret), nested: [{ safe: `token=${secret}` }] }));
  assert.equal(output.includes(secret), false); assert.equal(output.includes("[REDACTED]"), true);
});
test("request and correlation IDs are generated and response headers returned", async () => {
  const app = express(); app.use(requestIdMiddleware, requestLogger); app.get("/probe", (req, res) => res.json({ requestId: req.requestId, correlationId: req.correlationId }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  try { const response = await fetch(`http://127.0.0.1:${server.address().port}/probe`, { headers: { "x-correlation-id": "trace-1" } }); const body = await response.json(); assert.match(body.requestId, /^[0-9a-f-]{36}$/); assert.equal(body.correlationId, "trace-1"); assert.equal(response.headers.get("x-correlation-id"), "trace-1"); } finally { await new Promise((resolve) => server.close(resolve)); }
});
test("no-op alerts do not claim delivery and configured hook is invoked", async () => { setAlertTransport(); assert.equal((await sendAlert("database_unavailable")).delivered, false); let invoked = false; setAlertTransport(async () => { invoked = true; return { delivered: true, transport: "test" }; }); assert.equal((await sendAlert("database_unavailable")).delivered, true); assert.equal(invoked, true); setAlertTransport(); });
test("logging failures do not crash", () => { const old = process.env.LOG_DIRECTORY; const oldFiles = process.env.LOG_TO_FILES; process.env.LOG_DIRECTORY = "\0invalid"; process.env.LOG_TO_FILES = "true"; assert.doesNotThrow(() => log("info", "application_write_failure_test")); process.env.LOG_DIRECTORY = old; process.env.LOG_TO_FILES = oldFiles; });
