const express = require("express");
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const swaggerUi = require("swagger-ui-express");
const { authenticate, requireCurrentUser, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();
const specPath = path.resolve(__dirname, "../../docs/openapi.yaml");
const swaggerEnabled = process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true";

if (!swaggerEnabled) {
  router.use((_req, res) => res.status(404).json({ success: false, code: "RESOURCE_NOT_FOUND", message: "API documentation is not enabled." }));
} else {
  if (process.env.SWAGGER_REQUIRE_AUTH === "true") router.use(authenticate, requireCurrentUser, authorizeRoles("super_admin"));
  router.use((_req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'");
    next();
  });
  router.get("/openapi.yaml", (_req, res) => res.type("application/yaml").sendFile(specPath, (error) => {
    if (error && !res.headersSent) res.status(503).json({ success: false, code: "DOCUMENTATION_UNAVAILABLE", message: "API documentation is temporarily unavailable." });
  }));
  try {
    const specification = YAML.parse(fs.readFileSync(specPath, "utf8"));
    router.use(swaggerUi.serve, swaggerUi.setup(specification, { swaggerOptions: { persistAuthorization: false, displayRequestDuration: true } }));
  } catch (error) {
    require("../utils/logger").log("error", "swagger_spec_load_failed", { errorCode: error.code || "SPEC_ERROR" });
    router.use((_req, res) => res.status(503).json({ success: false, code: "DOCUMENTATION_UNAVAILABLE", message: "API documentation is temporarily unavailable." }));
  }
}

module.exports = router;
