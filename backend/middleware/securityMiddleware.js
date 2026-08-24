const crypto = require("crypto");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { allowedOrigins, boolean, integer } = require("../config/environment");
const { log } = require("../utils/logger");
const { sharedStore } = require("../config/rateLimitStore");

const requestIdMiddleware = (req, res, next) => {
  const supplied = req.get("x-request-id");
  const valid = typeof supplied === "string" && /^[A-Za-z0-9._:-]{1,100}$/.test(supplied);
  req.requestId = req.id = valid ? supplied : crypto.randomUUID();
  const correlation = req.get("x-correlation-id");
  req.correlationId = typeof correlation === "string" && /^[A-Za-z0-9._:-]{1,100}$/.test(correlation) ? correlation : crypto.randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  res.setHeader("X-Correlation-ID", req.correlationId);
  next();
};

const corsMiddleware = () => {
  const origins = new Set(allowedOrigins());
  const credentials = boolean("CORS_ALLOW_CREDENTIALS", true);
  return cors({ credentials, exposedHeaders:["X-Request-ID","X-Correlation-ID","X-CSRF-Token"], origin(origin, callback) {
    if (!origin || origins.has(origin) || (process.env.NODE_ENV !== "production" && origins.has("*"))) return callback(null, true);
    const error = new Error("Origin is not allowed by the CORS policy.");
    error.statusCode = 403; error.code = "CORS_ORIGIN_REJECTED";
    log("warn", "security_cors_rejection", { errorCode: error.code }); return callback(error);
  } });
};

const limiterHandler = (req, res) => { log("warn", "security_rate_limit", { requestId: req.requestId, correlationId: req.correlationId, route: req.path }); return res.status(429).json({
  success: false, message: "Too many requests. Please try again later.", code: "RATE_LIMIT_EXCEEDED", requestId: req.requestId || req.id || null,
}); };
const buildLimiter = (windowName, maxName, fallback) => rateLimit({
  windowMs: integer(windowName, 900000, { min: 1000 }) || 900000,
  limit: integer(maxName, fallback) || fallback,
  standardHeaders: "draft-8", legacyHeaders: false, handler: limiterHandler,
  store: sharedStore(maxName.toLowerCase()),
  skip: () => process.env.DISABLE_RATE_LIMITS === "true",
});

const generalApiLimiter = buildLimiter("GENERAL_RATE_LIMIT_WINDOW_MS", "GENERAL_RATE_LIMIT_MAX", 300);
const authenticationLimiter = buildLimiter("AUTH_RATE_LIMIT_WINDOW_MS", "AUTH_RATE_LIMIT_MAX", 10);
const registrationLimiter = buildLimiter("AUTH_RATE_LIMIT_WINDOW_MS", "REGISTRATION_RATE_LIMIT_MAX", 5);
const passwordResetLimiter = buildLimiter("AUTH_RATE_LIMIT_WINDOW_MS", "PASSWORD_RESET_RATE_LIMIT_MAX", 5);
const adminActionLimiter = buildLimiter("GENERAL_RATE_LIMIT_WINDOW_MS", "ADMIN_ACTION_RATE_LIMIT_MAX", 100);

const sensitiveNoStore = (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); };

module.exports = { requestIdMiddleware, corsMiddleware, limiterHandler, buildLimiter, generalApiLimiter, authenticationLimiter, registrationLimiter, passwordResetLimiter, adminActionLimiter, sensitiveNoStore };
