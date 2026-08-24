/* Phase 11 deterministic load harness. Never points at development/production. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { performance } = require("node:perf_hooks");
const { Pool } = require("pg"),
  bcrypt = require("bcryptjs");
const root = path.resolve(__dirname, "../..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
const profile = process.argv.includes("--profile")
  ? process.argv[process.argv.indexOf("--profile") + 1]
  : "smoke";
assert.ok(["smoke", "load"].includes(profile));
const live = String(process.env.DB_NAME || ""),
  name = String(process.env.TEST_DB_NAME || ""),
  prod = String(process.env.PRODUCTION_DB_NAME || "");
if (
  !/_test$/.test(name) ||
  name === live ||
  (prod && name === prod) ||
  process.env.NODE_ENV === "production"
)
  throw Error(
    "Performance safety guard: isolated non-production TEST_DB_NAME ending in _test is required."
  );
const db = {
  host: process.env.TEST_DB_HOST || process.env.DB_HOST,
  port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 5432),
  database: name,
  user: process.env.TEST_DB_USER || process.env.DB_USER,
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS || 10000),
  connectionTimeoutMillis: Number(
    process.env.DB_POOL_CONNECTION_TIMEOUT_MS || 2000
  ),
};
Object.assign(process.env, {
  NODE_ENV: "test",
  DB_HOST: db.host,
  DB_PORT: String(db.port),
  DB_NAME: name,
  DB_USER: db.user,
  DB_PASSWORD: db.password,
  BLOCKCHAIN_ENABLED: "false",
  IPFS_ENABLED: "false",
  BLOCKCHAIN_NETWORK: "localhost",
  BLOCKCHAIN_CHAIN_ID: "31337",
  BLOCKCHAIN_RPC_URL: "http://127.0.0.1:18545",
  AUTH_RETURN_BEARER_TOKEN: "true",
  LOG_TO_CONSOLE: "false",
  LOG_TO_FILES: "false",
  GENERAL_RATE_LIMIT_MAX: "1000000",
  AUTH_RATE_LIMIT_MAX: "1000000",
  VERIFICATION_RATE_LIMIT_MAX: "1000000",
  TOKEN_VERIFICATION_RATE_LIMIT_MAX: "1000000",
});
const pool = new Pool(db),
  tables = [
    "audit_logs",
    "verification_logs",
    "credentials",
    "students",
    "users",
    "institutions",
  ],
  cfg =
    profile === "load"
      ? { ms: 3000, sustain: 300000, seed: 10000, cs: [1, 10, 25, 50, 100] }
      : { ms: 700, sustain: 15000, seed: 1000, cs: [1, 10, 25] };
if (process.env.PERFORMANCE_SUSTAIN_MS) cfg.sustain = Number(process.env.PERFORMANCE_SUSTAIN_MS);
let applicationPool;
const report = {
  profile,
  startedAt: new Date().toISOString(),
  environment: {},
  scenarios: [],
  database: {},
  integrity: {},
  rateLimits: {},
  memory: {},
};
let server, base;
const counts = async () =>
  Object.fromEntries(
    await Promise.all(
      [...tables]
        .reverse()
        .map(async (t) => [
          t,
          (
            await pool.query(`SELECT COUNT(*)::int count FROM ${t}`)
          ).rows[0].count,
        ])
    )
  );
async function prepare() {
  await pool.query(
    fs.readFileSync(path.join(root, "test/fixtures/e2eBaseSchema.sql"), "utf8")
  );
  for (const f of fs
    .readdirSync(path.join(root, "backend/database/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .sort())
    await pool.query(
      fs.readFileSync(path.join(root, "backend/database/migrations", f), "utf8")
    );
  await pool.query(`TRUNCATE ${tables.join(",")} RESTART IDENTITY CASCADE`);
  report.database.beforeSeed = await counts();
  const hash = await bcrypt.hash("Perf-only!Passphrase-2026", 10);
  const inst = (
    await pool.query(
      "INSERT INTO institutions(name,wallet_address,email,status) VALUES('Performance Test University','0x0000000000000000000000000000000000000001','registry@performance.example.test',true) RETURNING id"
    )
  ).rows[0];
  const user = (
    await pool.query(
      "INSERT INTO users(full_name,email,password_hash,role,is_active) VALUES('Performance Administrator','admin@performance.example.test',$1,'super_admin',true) RETURNING id",
      [hash]
    )
  ).rows[0];
  await pool.query(
    "INSERT INTO students(student_number,full_name,email,programme,institution_id) SELECT 'PERF-'||lpad(n::text,6,'0'),'Synthetic Student '||n,'student'||n||'@performance.example.test','Performance Engineering',$1 FROM generate_series(1,$2)n",
    [inst.id, cfg.seed]
  );
  await pool.query(
    "INSERT INTO credentials(student_id,institution_id,qualification,issue_date,certificate_hash,ipfs_cid,blockchain_tx,status,created_by,public_token) SELECT id,$1,'Synthetic Qualification',CURRENT_DATE,encode(digest('perf-'||student_number,'sha256'),'hex'),'QmYwAPJzv5CZsnAzt8auVZRnGNiT1U6d1pXCVQaWnLYPJe','0x'||encode(digest('tx-'||student_number,'sha256'),'hex'),'active',$2,gen_random_uuid() FROM students",
    [inst.id, user.id]
  );
  await pool.query(
    "INSERT INTO verification_logs(credential_id,result,verification_method,result_code) SELECT id,true,'hash','VERIFIED' FROM credentials"
  );
  await pool.query(
    "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,details,institution_id) SELECT $1,'PERFORMANCE_FIXTURE','credential',id,'{}'::jsonb,$2 FROM credentials",
    [user.id, inst.id]
  );
  report.database.seeded = await counts();
  return { inst, user };
}
const pc = (a, p) =>
  a[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)] || 0;
async function run(label, route, opt, c, ms, expected = [200]) {
  let lat = [],
    statuses = {},
    errors = [],
    requests = 0,
    timeouts = 0,
    connections = 0;
  const start = performance.now(),
    cpu0 = process.cpuUsage(),
    mem0 = process.memoryUsage();
  let peaks = { total: 0, idle: 0, waiting: 0 };
  const sample = setInterval(() => {
    const observed = applicationPool || pool;
    peaks.total = Math.max(peaks.total, observed.totalCount);
    peaks.idle = Math.max(peaks.idle, observed.idleCount);
    peaks.waiting = Math.max(peaks.waiting, observed.waitingCount);
  }, 10);
  async function worker() {
    while (performance.now() - start < ms) {
      const t = performance.now(),
        ctrl = new AbortController(),
        timer = setTimeout(() => ctrl.abort(), 5000);
      try {
        const r = await fetch(base + route, { ...opt, signal: ctrl.signal });
        await r.arrayBuffer();
        statuses[r.status] = (statuses[r.status] || 0) + 1;
      } catch (e) {
        errors.push(e.code || e.name);
        e.name === "AbortError" ? timeouts++ : connections++;
      } finally {
        clearTimeout(timer);
        lat.push(performance.now() - t);
        requests++;
      }
    }
  }
  await Promise.all(Array.from({ length: c }, worker));
  clearInterval(sample);
  const elapsed = performance.now() - start,
    cpu = process.cpuUsage(cpu0),
    mem = process.memoryUsage(),
    ok = Object.entries(statuses)
      .filter(([s]) => expected.includes(+s))
      .reduce((n, [, v]) => n + v, 0);
  lat.sort((a, b) => a - b);
  const x = {
    label,
    route,
    c,
    durationMs: Math.round(elapsed),
    requests,
    successful: ok,
    failed: requests - ok,
    errorPercent: +(((requests - ok) / requests) * 100).toFixed(3),
    rps: +((requests / elapsed) * 1000).toFixed(2),
    p50: +pc(lat, 0.5).toFixed(2),
    p90: +pc(lat, 0.9).toFixed(2),
    p95: +pc(lat, 0.95).toFixed(2),
    p99: +pc(lat, 0.99).toFixed(2),
    max: +lat.reduce((largest, value) => Math.max(largest, value), 0).toFixed(2),
    timeouts,
    connectionErrors: connections,
    statuses,
    errors: [...new Set(errors)],
    cpuMs: +((cpu.user + cpu.system) / 1000).toFixed(1),
    heapDelta: mem.heapUsed - mem0.heapUsed,
    poolPeaks: peaks,
  };
  report.scenarios.push(x);
  console.log(
    `${label} c=${c}: ${x.rps} rps p95=${x.p95} p99=${x.p99} err=${x.errorPercent}%`
  );
  return x;
}
async function main() {
  const f = await prepare(),
    pg = (
      await pool.query("SELECT version() version,current_database() database")
    ).rows[0];
  report.environment = {
    cpu: os.cpus()[0]?.model,
    logicalCores: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    node: process.version,
    postgres: pg.version,
    processMode: "single Node process",
    database: pg.database,
    pool: {
      max: db.max,
      min: 0,
      idleTimeoutMs: db.idleTimeoutMillis,
      connectionTimeoutMs: db.connectionTimeoutMillis,
    },
    seed: cfg.seed,
  };
  const ip = require.resolve("../../backend/services/ipfsService");
  require.cache[ip] = {
    id: ip,
    filename: ip,
    loaded: true,
    exports: {
      uploadFileToIPFS: async () => ({
        cid: "QmYwAPJzv5CZsnAzt8auVZRnGNiT1U6d1pXCVQaWnLYPJe",
        provider: "mock-performance",
        pinned: true,
      }),
      validateCid: () => true,
      checkPinStatus: async () => ({ pinned: true }),
    },
  };
  const blockchain = require.resolve("../../backend/services/blockchainService");
  require.cache[blockchain] = {
    id: blockchain,
    filename: blockchain,
    loaded: true,
    exports: {
      verifyCredentialOnChain: async () => ({ exists: true, revoked: false }),
      issueCredentialOnChain: async () => ({ confirmed: true }),
      revokeCredentialOnChain: async () => ({ confirmed: true }),
    },
  };
  server = require("../../backend/app").createApp().listen(0, "127.0.0.1");
  applicationPool = require("../../backend/config/database");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
  let lr = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@performance.example.test",
        password: "Perf-only!Passphrase-2026",
      }),
    }),
    lb = await lr.json();
  assert.equal(lr.status, 200);
  const auth = { authorization: `Bearer ${lb.token}` },
    cred = (
      await pool.query(
        "SELECT id,certificate_hash,public_token FROM credentials LIMIT 1"
      )
    ).rows[0];
  for (const c of cfg.cs)
    await run("health-live", "/health/live", {}, c, cfg.ms);
  await run("health-ready", "/health/ready", {}, 1, cfg.ms);
  for (const c of cfg.cs)
    await run(
      "verification-hash",
      `/api/verify/hash/${cred.certificate_hash}`,
      {},
      c,
      cfg.ms
    );
  await run(
    "verification-id",
    `/api/verify/credential/${cred.id}`,
    {},
    10,
    cfg.ms
  );
  await run(
    "verification-token",
    `/api/verify/token/${cred.public_token}`,
    {},
    10,
    cfg.ms
  );
  for (const c of cfg.cs)
    await run("profile", "/api/auth/profile", { headers: auth }, c, cfg.ms);
  for (const route of [
    "/api/users?limit=100",
    "/api/institutions?limit=100",
    "/api/students?page=5&limit=100",
    "/api/students?search=Synthetic%20Student%20999&limit=100",
    "/api/credentials?page=5&limit=100",
    "/api/verification-logs?page=5&limit=100",
    "/api/audit-logs?page=5&limit=100",
    "/api/dashboard/summary",
  ])
    await run(route.split("?")[0], route, { headers: auth }, 10, cfg.ms);
  await run(
    "login-valid",
    "/api/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@performance.example.test",
        password: "Perf-only!Passphrase-2026",
      }),
    },
    10,
    cfg.ms
  );
  await run(
    "login-invalid-unknown",
    "/api/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "unknown@performance.example.test",
        password: "Wrong-only!Passphrase-2026",
      }),
    },
    2,
    400,
    [401]
  );
  const sh = "f".repeat(64),
    st = (await pool.query("SELECT id FROM students LIMIT 1")).rows[0],
    ins = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        pool.query(
          "INSERT INTO credentials(student_id,institution_id,qualification,issue_date,certificate_hash,status,created_by)VALUES($1,$2,$3,CURRENT_DATE,$4,'pending',$5)",
          [st.id, f.inst.id, `Concurrent ${i}`, sh, f.user.id]
        )
      )
    );
  report.integrity.duplicateIssuance = {
    accepted: ins.filter((x) => x.status === "fulfilled").length,
    rejected: ins.filter((x) => x.status === "rejected").length,
  };
  const target = (
      await pool.query(
        "SELECT id FROM credentials WHERE status='active' LIMIT 1"
      )
    ).rows[0],
    revs = await Promise.all(
      Array.from({ length: 5 }, () =>
        pool.query(
          "UPDATE credentials SET status='revoked',revoked_at=NOW() WHERE id=$1 AND status='active' RETURNING id",
          [target.id]
        )
      )
    );
  report.integrity.concurrentRevocation = {
    transitions: revs.reduce((n, x) => n + x.rowCount, 0),
    status: (
      await pool.query("SELECT status FROM credentials WHERE id=$1", [
        target.id,
      ])
    ).rows[0].status,
  };
  const express = require("express"),
    { buildLimiter } = require("../../backend/middleware/securityMiddleware");
  process.env.PERF_LIMIT_WINDOW = "60000";
  process.env.PERF_LIMIT_MAX = "5";
  const la = express();
  la.get("/", buildLimiter("PERF_LIMIT_WINDOW", "PERF_LIMIT_MAX", 5), (_q, r) =>
    r.json({ ok: true })
  );
  const ls = la.listen(0, "127.0.0.1");
  await new Promise((r) => ls.once("listening", r));
  const rr = await Promise.all(
    Array.from({ length: 10 }, () =>
      fetch(`http://127.0.0.1:${ls.address().port}/`)
    )
  );
  report.rateLimits = {
    statuses: rr.reduce(
      (m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m),
      {}
    ),
    retryAfter: rr
      .filter((r) => r.status === 429)
      .every((r) => !!r.headers.get("retry-after")),
    store: "process-local",
  };
  await new Promise((r) => ls.close(r));
  if (profile === "load") {
    const m0 = process.memoryUsage();
    await run(
      "sustained-profile",
      "/api/auth/profile",
      { headers: auth },
      25,
      cfg.sustain
    );
    global.gc?.();
    const m1 = process.memoryUsage();
    report.memory = {
      durationMs: cfg.sustain,
      startRss: m0.rss,
      endRss: m1.rss,
      rssDelta: m1.rss - m0.rss,
      startHeap: m0.heapUsed,
      endHeap: m1.heapUsed,
      heapDelta: m1.heapUsed - m0.heapUsed,
      activeHandles: process._getActiveHandles().length,
    };
  }
  report.database.beforeCleanup = await counts();
  await pool.query(`TRUNCATE ${tables.join(",")} RESTART IDENTITY CASCADE`);
  report.database.afterCleanup = await counts();
  assert.ok(Object.values(report.database.afterCleanup).every((x) => x === 0));
  report.finishedAt = new Date().toISOString();
  const out = path.join(root, "test-results/performance");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, `${profile}-results.json`),
    JSON.stringify(report, null, 2)
  );
  console.log(`Results: ${path.join(out, `${profile}-results.json`)}`);
}
main()
  .catch((e) => {
    console.error(e.stack || e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((r) => server.close(r));
    await pool
      .query(`TRUNCATE ${tables.join(",")} RESTART IDENTITY CASCADE`)
      .catch(() => {});
    await pool.end();
  });
