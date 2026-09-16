const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const withRedis = async (action, failure) => {
  const paths = ["redis", "../backend/config/rateLimitStore", "../backend/middleware/securityMiddleware"].map(require.resolve);
  const cached = paths.map(path => require.cache[path]);
  const old = { ...process.env };
  const counts = new Map(), ttls = new Map(), calls = { connect: 0, create: [], expiry: [] };
  const error = new Error("synthetic Redis failure");
  const client = {
    on: () => client,
    connect: async () => { calls.connect++; if (failure === "connect") throw error; },
    multi: () => {
      let key;
      const tx = { incr: k => { key = k; return tx; }, pTTL: k => { assert.equal(k, key); return tx; }, exec: async () => {
        if (failure === "exec") throw error;
        const count = (counts.get(key) || 0) + 1; counts.set(key, count);
        return [count, ttls.get(key) ?? -1];
      } };
      return tx;
    },
    pExpire: async (key, ttl) => { if (failure === "expiry") throw error; calls.expiry.push([key, ttl]); ttls.set(key, ttl); },
    decr: async key => counts.set(key, counts.get(key) - 1),
    del: async key => { counts.delete(key); ttls.delete(key); },
  };
  try {
    Object.assign(process.env, { NODE_ENV: "staging", RATE_LIMIT_STORE: "redis", REDIS_URL: "redis://default:synthetic%40password@red-staging123:6379/0", REDIS_CONNECT_TIMEOUT_MS: "1234", DISABLE_RATE_LIMITS: "false", REDIS_TEST_MAX: "1", REDIS_TEST_WINDOW: "60000" });
    paths.forEach(path => delete require.cache[path]);
    require.cache[paths[0]] = { id: paths[0], filename: paths[0], loaded: true, exports: { createClient: options => { calls.create.push(options); return client; } } };
    await action({ ...require(paths[1]), calls, counts, ttls, error });
  } finally {
    paths.forEach((path, i) => { if (cached[i]) require.cache[path] = cached[i]; else delete require.cache[path]; });
    for (const key of Object.keys(process.env)) if (!(key in old)) delete process.env[key];
    Object.assign(process.env, old);
  }
};

test("Redis shares counts, reuses connection, preserves URL and manages expiry", () => withRedis(async ({ SharedRateLimitStore, calls, ttls }) => {
  const first = new SharedRateLimitStore("scope:"), second = new SharedRateLimitStore("scope:");
  first.init({ windowMs: 10000 }); second.init({ windowMs: 10000 });
  assert.equal(calls.connect, 0);
  const before = Date.now();
  const results = await Promise.all([first.increment("key"), second.increment("key")]);
  assert.deepEqual(results.map(r => r.totalHits), [1, 2]);
  assert.ok(results[0].resetTime.getTime() >= before + 10000);
  assert.equal(calls.connect, 1);
  assert.deepEqual(calls.create, [{ url: process.env.REDIS_URL, socket: { connectTimeout: 1234, reconnectStrategy: false } }]);
  ttls.set("scope:key", 5000);
  const previousExpiryCalls = calls.expiry.length;
  const next = await first.increment("key");
  assert.equal(next.totalHits, 3);
  assert.ok(next.resetTime.getTime() <= Date.now() + 5000);
  assert.equal(calls.expiry.length, previousExpiryCalls);
  ttls.delete("scope:key");
  await first.increment("key");
  assert.deepEqual(calls.expiry.at(-1), ["scope:key", 10000]);
  await first.decrement("key");
  assert.equal((await second.increment("key")).totalHits, 4);
  await first.resetKey("key");
  assert.equal((await second.increment("key")).totalHits, 1);
}));

for (const failure of ["connect", "exec", "expiry"]) test(`Redis ${failure} failure propagates without fallback`, () => withRedis(async ({ SharedRateLimitStore, calls, error }) => {
  const store = new SharedRateLimitStore();
  await assert.rejects(store.increment("key"), e => e === error);
  await assert.rejects(store.increment("key"), e => e === error);
  assert.equal(calls.connect, 1);
}, failure));

test("Redis-backed buildLimiter returns 200 then shared 429", () => withRedis(async ({ calls }) => {
  const { buildLimiter } = require("../backend/middleware/securityMiddleware");
  const app = express();
  app.get("/one", buildLimiter("REDIS_TEST_WINDOW", "REDIS_TEST_MAX", 1), (_req, res) => res.json({ ok: true }));
  app.get("/two", buildLimiter("REDIS_TEST_WINDOW", "REDIS_TEST_MAX", 1), (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${url}/one`)).status, 200);
    const limited = await fetch(`${url}/two`);
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).code, "RATE_LIMIT_EXCEEDED");
    assert.equal(calls.connect, 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
}));
