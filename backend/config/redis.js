// Validate without returning parser errors, which can contain credentials.
const validRedisConfiguration = (env = process.env) => {
  const policy = env.REDIS_CONNECTION_POLICY ?? "tls";
  if (!["tls", "render-private"].includes(policy)) return false;
  const raw = env.REDIS_URL || "";
  if (/\s|[?#]|%(?![\da-f]{2})/i.test(raw)) return false;
  // Check the raw path too: URL parsing can normalize dot segments away.
  const shape = /^(redis|rediss):\/\/([^/]+)(\/\d*)?$/.exec(raw);
  if (!shape) return false;
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname || (parsed.port && Number(parsed.port) === 0)) return false;
    if (shape[2].endsWith(":")) return false;
    // Match the decoding performed by node-redis before opening a connection.
    decodeURIComponent(parsed.username);
    decodeURIComponent(parsed.password);
    if (parsed.protocol === "rediss:") return true;
    return env.NODE_ENV === "staging" && env.RENDER === "true" &&
      policy === "render-private" && /^red-[a-z0-9-]+$/.test(parsed.hostname) &&
      env.REDIS_PRIVATE_HOST === parsed.hostname &&
      Boolean(parsed.username && parsed.password);
  } catch { return false; }
};

module.exports = { validRedisConfiguration };
