const express = require("express");

const {
  verifyFile,
  verifyHash,
  verifyCredentialId,
  verifyPublicToken,
  verifyCredentialFile,
  verifyPublicTokenFile,
} = require("../controllers/verificationController");

const {
  uploadVerification,
} = require("../middleware/uploadMiddleware");

const {
  publicVerificationLimiter,
  fileVerificationLimiter,
  tokenVerificationLimiter,
} = require("../middleware/verificationRateLimit");

const {
  validate,
} = require("../middleware/validationMiddleware");

const schemas =
  require("../validators/verificationValidator");

const router = express.Router();

router.post(
  "/file",
  fileVerificationLimiter,
  uploadVerification.single(
    "certificate"
  ),
  validate({
    body: schemas.optionalVerifier,
  }),
  verifyFile
);

router.post(
  "/credential/:id/file",
  fileVerificationLimiter,

  validate({
    params: schemas.idParams,
  }),

  uploadVerification.single(
    "certificate"
  ),

  validate({
    body: schemas.optionalVerifier,
  }),

  verifyCredentialFile
);

router.post(
  "/token/:publicToken/file",
  tokenVerificationLimiter,

  validate({
    params: schemas.tokenParams,
  }),

  uploadVerification.single(
    "certificate"
  ),

  validate({
    body: schemas.optionalVerifier,
  }),

  verifyPublicTokenFile
);

router.get(
  "/hash/:hash",
  publicVerificationLimiter,

  validate({
    params: schemas.hashParams,
  }),

  verifyHash
);

router.get(
  "/credential/:id",
  publicVerificationLimiter,

  validate({
    params: schemas.idParams,
  }),

  verifyCredentialId
);

router.get(
  "/token/:publicToken",
  tokenVerificationLimiter,

  validate({
    params: schemas.tokenParams,
  }),

  verifyPublicToken
);

module.exports = router;