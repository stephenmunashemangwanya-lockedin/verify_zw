const express =
  require("express");

const {
  create,
  list,
  changeStatus,
} = require(
  "../controllers/accreditationController"
);

const {
  authenticate,
  requireCurrentUser,
  authorizeRoles,
} = require(
  "../middleware/authMiddleware"
);

const {
  validate,
} = require(
  "../middleware/validationMiddleware"
);

const {
  adminActionLimiter,
  sensitiveNoStore,
} = require(
  "../middleware/securityMiddleware"
);

const schemas =
  require(
    "../validators/accreditationValidator"
  );

const router =
  express.Router();

router.use(
  authenticate,
  requireCurrentUser
);

router.use(
  sensitiveNoStore
);

router.get(
  "/",

  authorizeRoles(
    "super_admin",
    "institution_admin",
    "issuer",
    "verifier"
  ),

  validate({
    query:
      schemas.listQuery,
  }),

  list
);

router.post(
  "/",

  authorizeRoles(
    "super_admin"
  ),

  adminActionLimiter,

  validate({
    body:
      schemas.create,
  }),

  create
);

router.patch(
  "/:id/status",

  authorizeRoles(
    "super_admin"
  ),

  adminActionLimiter,

  validate({
    params:
      schemas.idParams,

    body:
      schemas.status,
  }),

  changeStatus
);

module.exports =
  router;
  