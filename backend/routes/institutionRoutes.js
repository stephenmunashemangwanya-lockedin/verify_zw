const express = require("express");

const {
  create,
  list,
  getOne,
  changeStatus,
  authoriseOnBlockchain,
  deactivateOnBlockchain,
} = require("../controllers/institutionController");

const {
  authenticate,
  requireCurrentUser,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();
const { validate } = require("../middleware/validationMiddleware");
const schemas = require("../validators/institutionValidator");
const { adminActionLimiter, sensitiveNoStore } = require("../middleware/securityMiddleware");

router.use(authenticate, requireCurrentUser);
router.use(sensitiveNoStore);

router.get(
  "/",
  authorizeRoles(
    "super_admin",
    "institution_admin",
    "issuer",
    "verifier"
  ),
  validate({ query: schemas.listQuery }),
  list
);

router.get(
  "/:id",
  authorizeRoles(
    "super_admin",
    "institution_admin",
    "issuer",
    "verifier"
  ),
  validate({ params: schemas.idParams }),
  getOne
);

router.post(
  "/",
  authorizeRoles("super_admin"),
  validate({ body: schemas.create }),
  create
);

router.patch(
  "/:id/status",
  authorizeRoles("super_admin"),
  adminActionLimiter,
  validate({ params: schemas.idParams, body: schemas.status }),
  changeStatus
);

router.post(
  "/:id/blockchain/authorise",
  authorizeRoles("super_admin"),
  adminActionLimiter,
  validate({ params: schemas.idParams }),
  authoriseOnBlockchain
);

router.post(
  "/:id/blockchain/deactivate",
  authorizeRoles("super_admin"),
  adminActionLimiter,
  validate({ params: schemas.idParams }),
  deactivateOnBlockchain
);

module.exports = router;
