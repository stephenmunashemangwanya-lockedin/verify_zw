const express = require("express");

const {
  issueCredential,
  listCredentials,
  listMyCredentials,
  getOneCredential,
  revokeCredential,
  generateCredentialPdf,
  downloadCredentialPdf,
} = require("../controllers/credentialController");

const {
  authenticate,
  requireCurrentUser,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const {
  uploadCertificate,
} = require("../middleware/uploadMiddleware");

const router = express.Router();
const { validate } = require("../middleware/validationMiddleware");
const schemas = require("../validators/credentialValidator");
const { adminActionLimiter, sensitiveNoStore } = require("../middleware/securityMiddleware");

router.use(authenticate, requireCurrentUser);
router.use(sensitiveNoStore);

router.get("/me", authorizeRoles("student"), validate({ query: schemas.listQuery }), listMyCredentials);

router.get(
  "/",
  authorizeRoles(
    "super_admin",
    "institution_admin",
    "issuer",
    "verifier"
  ),
  validate({ query: schemas.listQuery }),
  listCredentials
);

router.get(
  "/:id",
  authorizeRoles(
    "super_admin",
    "institution_admin",
    "issuer",
    "verifier",
    "student"
  ),
  validate({ params: schemas.idParams }),
  getOneCredential
);

router.post(
  "/issue",
  authorizeRoles(
    "super_admin",
    "institution_admin",
    "issuer"
  ),
  uploadCertificate.single("certificate"),
  validate({ body: schemas.issue }),
  issueCredential
);

router.get("/:id/pdf", authorizeRoles("super_admin", "institution_admin", "issuer", "verifier", "student"), validate({ params: schemas.idParams }), downloadCredentialPdf);

router.patch(
  "/:id/revoke",
  authorizeRoles("super_admin", "institution_admin"),
  adminActionLimiter,
  validate({ params: schemas.idParams, body: schemas.revoke }),
  revokeCredential
);

router.post(
  "/:id/generate-pdf",
  authorizeRoles("super_admin", "institution_admin", "issuer"),
  validate({ params: schemas.idParams }),
  generateCredentialPdf
);

module.exports = router;
