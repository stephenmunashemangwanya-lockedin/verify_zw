const express = require("express");

const {
  verifyFile,
  verifyHash,
  verifyCredentialId,
  verifyPublicToken,
} = require("../controllers/verificationController");
const { uploadVerification } = require("../middleware/uploadMiddleware");
const {
  publicVerificationLimiter,
  fileVerificationLimiter,
  tokenVerificationLimiter,
} = require("../middleware/verificationRateLimit");

const router = express.Router();
const { validate } = require("../middleware/validationMiddleware");
const schemas = require("../validators/verificationValidator");

router.post("/file", fileVerificationLimiter, uploadVerification.single("certificate"), validate({ body: schemas.optionalVerifier }), verifyFile);
router.get("/hash/:hash", publicVerificationLimiter, validate({ params: schemas.hashParams }), verifyHash);
router.get("/credential/:id", publicVerificationLimiter, validate({ params: schemas.idParams }), verifyCredentialId);
router.get("/token/:publicToken", tokenVerificationLimiter, validate({ params: schemas.tokenParams }), verifyPublicToken);

module.exports = router;
