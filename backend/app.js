const express =
  require("express");

const helmet =
  require("helmet");

const pool =
  require("./config/database");

const {
  notFoundMiddleware,
} = require(
  "./middleware/notFoundMiddleware"
);

const {
  errorMiddleware,
} = require(
  "./middleware/errorMiddleware"
);

const {
  authenticate,
  requireCurrentUser,
  authorizeRoles,
} = require(
  "./middleware/authMiddleware"
);

const {
  requestIdMiddleware,
  corsMiddleware,
  generalApiLimiter,
  sensitiveNoStore,
} = require(
  "./middleware/securityMiddleware"
);

const {
  requestLogger,
} = require(
  "./utils/logger"
);

const {
  metricsMiddleware,
} = require(
  "./middleware/metricsMiddleware"
);

const createApp = () => {
  const app =
    express();

  const trustProxy =
    String(
      process.env.TRUST_PROXY ||
        "false"
    ).toLowerCase();

  app.set(
    "trust proxy",
    trustProxy === "true"
      ? 1
      : /^\d+$/.test(
          trustProxy
        )
      ? Number(
          trustProxy
        )
      : false
  );

  app.disable(
    "x-powered-by"
  );

  app.use(
    requestIdMiddleware
  );

  app.use(
    helmet({
      hsts:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : false,

      crossOriginResourcePolicy: {
        policy:
          "same-site",
      },

      referrerPolicy: {
        policy:
          "no-referrer",
      },
    })
  );

  app.use(
    corsMiddleware()
  );

  app.use(
    express.json({
      limit:
        process.env
          .JSON_BODY_LIMIT ||
        "1mb",
    })
  );

  app.use(
    express.urlencoded({
      extended: true,

      limit:
        process.env
          .URLENCODED_BODY_LIMIT ||
        "1mb",
    })
  );

  app.use(
    requestLogger
  );

  app.use(
    metricsMiddleware
  );

  app.use(
    "/api",
    generalApiLimiter,
    sensitiveNoStore
  );

  app.use(
    "/api/auth",
    require(
      "./routes/authRoutes"
    )
  );

  app.use(
    "/api/institutions",
    require(
      "./routes/institutionRoutes"
    )
  );

  app.use(
    "/api/accreditations",
    require(
      "./routes/accreditationRoutes"
    )
  );

  app.use(
    "/api/students",
    require(
      "./routes/studentRoutes"
    )
  );

  app.use(
    "/api/credentials",
    require(
      "./routes/credentialRoutes"
    )
  );

  app.use(
    "/api/verify",
    require(
      "./routes/verificationRoutes"
    )
  );

  app.use(
    "/api/audit-logs",
    require(
      "./routes/auditRoutes"
    )
  );

  app.use(
    "/api/verification-logs",
    require(
      "./routes/verificationLogRoutes"
    )
  );

  app.use(
    "/api/dashboard",
    require(
      "./routes/dashboardRoutes"
    )
  );

  app.use(
    "/api/users",
    require(
      "./routes/userRoutes"
    )
  );

  app.use(
    "/api/docs",
    require(
      "./routes/docsRoutes"
    )
  );

  app.use(
    "/health",
    require(
      "./routes/healthRoutes"
    )
  );

  app.use(
    process.env
      .METRICS_ROUTE ||
      "/metrics",
    require(
      "./routes/metricsRoutes"
    )
  );

  app.get(
    "/",
    (_req, res) =>
      res
        .status(200)
        .json({
          success: true,
          message:
            "Blockchain Skill Verification API is running.",
        })
  );

  app.get(
    "/api/db-test",

    authenticate,
    requireCurrentUser,
    authorizeRoles(
      "super_admin"
    ),

    async (
      _req,
      res,
      next
    ) => {
      try {
        await pool.query(
          "SELECT 1"
        );

        res
          .status(200)
          .json({
            success: true,
            message:
              "PostgreSQL connection successful.",
          });
      } catch (error) {
        next(error);
      }
    }
  );

  app.use(
    notFoundMiddleware
  );

  app.use(
    errorMiddleware
  );

  return app;
};

module.exports = {
  createApp,
};