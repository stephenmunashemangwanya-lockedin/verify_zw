const express = require("express");
const { authenticate, requireCurrentUser, authorizeRoles } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { sensitiveNoStore } = require("../middleware/securityMiddleware");
const schemas = require("../validators/verificationLogValidator");
const router = express.Router();
router.use(authenticate, requireCurrentUser, authorizeRoles("super_admin", "institution_admin"), sensitiveNoStore);
router.get("/", validate({ query: schemas.listQuery }), require("../controllers/verificationLogController").list);
module.exports = router;
