const express = require("express");
const { registry } = require("../utils/metrics");
const { authenticate, requireCurrentUser, authorizeRoles } = require("../middleware/authMiddleware");
const router = express.Router();
const serve = async (_req, res, next) => { try { res.type(registry.contentType).send(await registry.metrics()); } catch (error) { next(error); } };
router.use((req, res, next) => process.env.ENABLE_METRICS === "true" ? next() : res.status(404).json({ success: false, code: "RESOURCE_NOT_FOUND", message: "Resource not found.", requestId: req.requestId || null }));
router.use(authenticate, requireCurrentUser, authorizeRoles("super_admin"));
router.get("/", serve);
module.exports = router;
