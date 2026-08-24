const assert = require("node:assert/strict");
const path = require("node:path");
const { Client } = require("pg");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
const name = String(process.env.TEST_DB_NAME || "");
assert.ok(/_test$/.test(name) && name !== process.env.DB_NAME, "Query analysis requires an isolated _test database.");
const client = new Client({ host: process.env.TEST_DB_HOST || process.env.DB_HOST, port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 5432), database: name, user: process.env.TEST_DB_USER || process.env.DB_USER, password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD });
(async () => {
  await client.connect(); await client.query("BEGIN");
  try {
    const institution = (await client.query("INSERT INTO institutions(name,email,status) VALUES('Plan Fixture','plan@performance.example.test',true) RETURNING id")).rows[0];
    await client.query("INSERT INTO students(student_number,full_name,email,programme,institution_id) SELECT 'PLAN-'||n,'Synthetic Student '||n,'plan'||n||'@performance.example.test','Performance Engineering',$1 FROM generate_series(1,10000)n", [institution.id]);
    await client.query("ANALYZE students");
    for (const [name, sql, values] of [
      ["student_page", "SELECT id FROM students ORDER BY created_at DESC,id ASC LIMIT $1 OFFSET $2", [100, 400]],
      ["student_substring_search", "SELECT id FROM students WHERE student_number ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1 OR programme ILIKE $1 ORDER BY created_at DESC,id ASC LIMIT $2", ["%Student 999%", 100]],
    ]) {
      const plan = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, values);
      console.log(JSON.stringify({ name, plan: plan.rows[0]["QUERY PLAN"][0] }));
    }
  } finally { await client.query("ROLLBACK"); await client.end(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
