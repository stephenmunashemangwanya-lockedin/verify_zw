const SECRET_KEY = /(password|password_?hash|token|jwt|authorization|cookie|secret|private_?key|mnemonic|database_?password|db_?password|pinata|reset_?token|certificate.*(bytes|buffer|contents?)|environment|process\.env)/i;
const SECRET_VALUE = /(Bearer\s+)[^\s,;]+|((?:password|token|jwt|private[_-]?key|db[_-]?password)\s*[=:]\s*)[^\s,;]+/gi;

const redact = (value, depth = 0, seen = new WeakSet()) => {
  if (depth > 8) return "[TRUNCATED]";
  if (typeof value === "string") return value.replace(SECRET_VALUE, (_m, bearer, prefix) => `${bearer || prefix || ""}[REDACTED]`).slice(0, 2000);
  if (Buffer.isBuffer(value)) return "[REDACTED]";
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1, seen));
  return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [key, SECRET_KEY.test(key) ? "[REDACTED]" : redact(item, depth + 1, seen)]));
};

module.exports = { redact, SECRET_KEY };
