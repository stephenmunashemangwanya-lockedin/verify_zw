const express = require("express");

const {
  create,
  list,
  getOne,
  update,
  assignInstitution,
} = require("../controllers/studentController");

const {
  authenticate,
  requireCurrentUser,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();
const { validate } = require("../middleware/validationMiddleware");
const schemas = require("../validators/studentValidator");

// All student routes require authentication
router.use(authenticate, requireCurrentUser);

// List students
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

// Get one student
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

// Create a student
router.post(
  "/",
  authorizeRoles(
    "super_admin",
    "institution_admin",
    "issuer"
  ),
  validate({ body: schemas.create }),
  create
);

router.patch("/:id", authorizeRoles("super_admin", "institution_admin", "issuer"), validate({ params: schemas.idParams, body: schemas.update }), update);
router.patch("/:id/institution", authorizeRoles("super_admin"), validate({ params: schemas.idParams, body: schemas.institution }), assignInstitution);

module.exports = router;
