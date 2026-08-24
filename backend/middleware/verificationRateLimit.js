const { rateLimit } = require("express-rate-limit");
const { sharedStore } = require("../config/rateLimitStore");

const buildLimiter = (limit, scope = "verification") => rateLimit({
  windowMs: Number(process.env.VERIFICATION_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: sharedStore(scope),
  handler: (req, res) => res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
    requestId: req.requestId || req.id || null,
  }),
});

const publicVerificationLimiter = buildLimiter(
  Number(process.env.VERIFICATION_RATE_LIMIT_MAX || 60), "public-verification"
);
const fileVerificationLimiter = buildLimiter(
  Number(process.env.FILE_VERIFICATION_RATE_LIMIT_MAX || 20), "file-verification"
);
const tokenVerificationLimiter = buildLimiter(
  Number(process.env.TOKEN_VERIFICATION_RATE_LIMIT_MAX || 60), "token-verification"
);

module.exports = {
  publicVerificationLimiter,
  fileVerificationLimiter,
  tokenVerificationLimiter,
  buildLimiter,
};
