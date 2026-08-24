const express = require("express");

const {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const {
  authenticate,
  requireCurrentUser,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();
const { validate } = require("../middleware/validationMiddleware");
const authSchemas = require("../validators/authValidator");
const { authenticationLimiter, registrationLimiter, passwordResetLimiter, sensitiveNoStore } = require("../middleware/securityMiddleware");

router.use(sensitiveNoStore);
router.post("/register", registrationLimiter, validate({ body: authSchemas.register }), register);

router.post("/login", authenticationLimiter, validate({ body: authSchemas.login }), login);
router.post("/forgot-password", passwordResetLimiter, validate({body:authSchemas.forgotPassword}),forgotPassword);
router.post("/reset-password", passwordResetLimiter, validate({body:authSchemas.resetPassword}),resetPassword);
router.post("/logout", authenticate, requireCurrentUser, logout);

const userController = require("../controllers/userController");
router.get("/profile", authenticate, requireCurrentUser, userController.profile);
router.patch("/profile", authenticate, requireCurrentUser, validate({ body: authSchemas.profileUpdate }), userController.updateProfile);
router.post("/change-password", authenticate, requireCurrentUser, validate({ body: authSchemas.changePassword }), userController.changePassword);

router.get(
  "/admin-only",
  authenticate,
  authorizeRoles("super_admin", "institution_admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Administrative route accessed successfully.",
    });
  }
);

module.exports = router;
