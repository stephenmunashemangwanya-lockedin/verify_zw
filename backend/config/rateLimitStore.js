let client;
let connection;

const getClient = () => {
  if (process.env.RATE_LIMIT_STORE !== "redis") return null;
  if (!client) {
    const { createClient } = require("redis");
    client = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000), reconnectStrategy: false } });
    client.on("error", (error) => require("../utils/logger").log("error", "rate_limit_store_error", { errorCode: error.code || "REDIS_ERROR" }));
    connection = client.connect();
  }
  return { client, connection };
};

class SharedRateLimitStore {
  constructor(prefix = "zsvp:rl:") { this.prefix = prefix; this.windowMs = 60000; }
  init(options) { this.windowMs = options.windowMs; }
  async increment(key) {
    const state = getClient();
    if (!state) throw new Error("Shared rate-limit store is not configured.");
    await state.connection;
    const redisKey = `${this.prefix}${key}`;
    const results = await state.client.multi().incr(redisKey).pTTL(redisKey).exec();
    let totalHits = Number(results[0]);
    let ttl = Number(results[1]);
    if (totalHits === 1 || ttl < 0) { await state.client.pExpire(redisKey, this.windowMs); ttl = this.windowMs; }
    return { totalHits, resetTime: new Date(Date.now() + ttl) };
  }
  async decrement(key) { const state = getClient(); if (state) { await state.connection; await state.client.decr(`${this.prefix}${key}`); } }
  async resetKey(key) { const state = getClient(); if (state) { await state.connection; await state.client.del(`${this.prefix}${key}`); } }
}

const sharedStore = (scope) => process.env.RATE_LIMIT_STORE === "redis" ? new SharedRateLimitStore(`zsvp:rl:${scope}:`) : undefined;
module.exports = { SharedRateLimitStore, sharedStore };
