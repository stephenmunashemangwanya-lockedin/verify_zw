const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { validate } = require("../backend/middleware/validationMiddleware");
const dashboard = require("../backend/validators/dashboardValidator");
const users = require("../backend/validators/userValidator");

async function request(t, schema, query = "") {
  const app = express();
  let controllerCalls = 0;
  app.get("/", validate({ query: schema }), (req, res) => {
    controllerCalls++;
    res.json({ success: true, data: req.query });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/${query}`);
  return { status: response.status, body: await response.json(), controllerCalls };
}

test("Express controller receives default analytics sort and numeric limit", async t => {
  const result = await request(t, dashboard.topInstitutions);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data, { limit: 10, sortBy: "totalCredentials" });
});
test("Express controller receives default analytics grouping and period", async t => {
  const result = await request(t, dashboard.trend);
  assert.deepEqual(result.body.data, { period: "30days", groupBy: "day" });
});
test("Express controller receives trimmed search and coerced pagination", async t => {
  const result = await request(t, users.listQuery, "?search=%20Ada%20&page=2&limit=7");
  assert.equal(result.body.data.search, "Ada");
  assert.equal(result.body.data.page, 2);
  assert.equal(result.body.data.limit, 7);
});
test("valid analytics sort and grouping survive the request boundary", async t => {
  const top = await request(t, dashboard.topInstitutions, "?sortBy=totalStudents&limit=3");
  assert.deepEqual(top.body.data, { sortBy: "totalStudents", limit: 3 });
  const trend = await request(t, dashboard.trend, "?period=7days&groupBy=week");
  assert.deepEqual(trend.body.data, { period: "7days", groupBy: "week" });
});
for (const [label, schema, query] of [
  ["sort", dashboard.topInstitutions, "?sortBy=raw_sql"],
  ["group", dashboard.trend, "?groupBy=century"],
  ["unknown parameter", dashboard.topInstitutions, "?unapproved=true"],
  ["limit", dashboard.topInstitutions, "?limit=999"],
]) test(`invalid ${label} fails before controller execution`, async t => {
  const result = await request(t, schema, query);
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "VALIDATION_ERROR");
  assert.equal(result.controllerCalls, 0);
});
