const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
  createUser,
  findUserByEmail,
  recordLoginSuccess,
  recordLoginFailure,
} = require("../models/userModel");
const { createAuditLog } = require("../models/auditModel");
const { ROLES } = require("../constants/roles");
const { validatePassword } = require("../utils/passwordPolicy");
const { metrics } = require("../utils/metrics");
const { setAuthCookies, clearAuthCookies } = require("../utils/authSession");
const recovery=require("../services/passwordRecoveryService");
const {deliverPasswordReset}=require("../services/emailService");
const securityEvent = (req, event, user = null) => require("../utils/logger").log("warn", event, { requestId: req.requestId, correlationId: req.correlationId, userId: user?.id || null, institutionId: user?.institution_id || null });

const auditAuth = (req, action, user = null, details = {}) => createAuditLog({
  userId: user?.id || null,
  institutionId: user?.institution_id || null,
  action,
  entityType: "user",
  entityId: user?.id || null,
  details,
  ipAddress: req.ip,
  userAgent: req.get?.("user-agent") || null,
}).catch(() => {});

const register = async (req, res) => {
  try {
    await auditAuth(req, "PUBLIC_REGISTRATION_REJECTED", null, { reason: "ADMIN_PROVISIONING_REQUIRED" });
    return res.status(403).json({ success: false, message: "Accounts are provisioned by authorised institution administrators. Public credential verification remains available without an account.", code: "PUBLIC_REGISTRATION_DISABLED" });
  } catch (error) {
    require("../utils/logger").log("error", "registration_failed", { errorCode: error.code || "REGISTRATION_ERROR" });

    return res.status(500).json({
      success: false,
      message: "User registration failed.",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      metrics.authenticationFailures.inc({ reason: "invalid_credentials" }); securityEvent(req, "security_login_failure");
      await auditAuth(req, "LOGIN_FAILURE", null, { reason: "INVALID_CREDENTIALS" });
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.is_active) {
      metrics.authenticationFailures.inc({ reason: "inactive" }); securityEvent(req, "security_login_failure", user);
      await auditAuth(req, "LOGIN_FAILURE", user, { reason: "INVALID_CREDENTIALS" });
      return res.status(403).json({
        success: false,
        message: "Unable to sign in with the supplied credentials.",
      });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      metrics.authenticationFailures.inc({ reason: "locked" }); securityEvent(req, "security_account_locked", user);
      await auditAuth(req, "LOGIN_FAILURE", user, { reason: "ACCOUNT_LOCKED" });
      return res.status(423).json({ success: false, message: "Sign-in is temporarily unavailable. Please try again later.", code: "ACCOUNT_LOCKED" });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      const state = await recordLoginFailure(user.id, Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5), Number(process.env.ACCOUNT_LOCK_MINUTES || 15));
      await auditAuth(req, "LOGIN_FAILURE", user, { reason: "INVALID_CREDENTIALS" });
      if (state?.locked_until) await auditAuth(req, "ACCOUNT_LOCKED", user, { reason: "MAX_FAILED_LOGIN_ATTEMPTS" });
      metrics.authenticationFailures.inc({ reason: "invalid_credentials" }); securityEvent(req, "security_login_failure", user); if (state?.locked_until) { metrics.accountLockouts.inc(); securityEvent(req, "security_account_lockout", user); }
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const lockExpired = Boolean(user.locked_until && new Date(user.locked_until) <= new Date());
    await recordLoginSuccess(user.id);
    if (lockExpired) await auditAuth(req, "ACCOUNT_UNLOCKED", user, { reason: "LOCK_EXPIRED" });

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        institutionId: user.institution_id,
        tokenVersion: user.token_version,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
        issuer: process.env.JWT_ISSUER || "zimbabwe-skill-verification-platform",
        audience: process.env.JWT_AUDIENCE || "zsvp-api",
        algorithm: process.env.JWT_ALGORITHM || "HS256",
      }
    );

    await auditAuth(req, "LOGIN_SUCCESS", user);
    const csrfToken = setAuthCookies(res, token); res.setHeader("X-CSRF-Token", csrfToken);
    const response = {
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        institutionId: user.institution_id,
      },
    };
    if (process.env.AUTH_RETURN_BEARER_TOKEN === "true") response.token = token;
    return res.status(200).json(response);
  } catch (error) {
    require("../utils/logger").log("error", "login_failed", { errorCode: error.code || "LOGIN_ERROR" });

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
};

const logout = async (req, res) => {
  await auditAuth(req, "LOGOUT", { id: req.user.userId, institution_id: req.user.institutionId });
  clearAuthCookies(res);
  return res.status(200).json({ success: true, message: "Logout completed." });
};
const recoveryDependencies=()=>({model:require("../models/userModel"),bcrypt,audit:createAuditLog});
const forgotPassword=async(req,res)=>{const started=Date.now();const generic={success:true,message:"If an account exists for that email, password reset instructions have been sent."};try{const prepared=await recovery.preparePasswordReset(String(req.body.email).trim().toLowerCase(),recoveryDependencies());if(prepared)setImmediate(()=>deliverPasswordReset({email:prepared.user.email,resetUrl:prepared.resetUrl}).catch(error=>require("../utils/logger").log("error","password_reset_delivery_failed",{errorCode:error.code||"EMAIL_DELIVERY_FAILED",userId:prepared.user.id})));}catch(error){require("../utils/logger").log("error","password_reset_request_failed",{errorCode:error.code||"PASSWORD_RESET_REQUEST_ERROR"});}const remaining=Math.max(0,75-(Date.now()-started));if(remaining)await new Promise(resolve=>setTimeout(resolve,remaining));return res.status(200).json(generic);};
const resetPassword=async(req,res)=>{try{await recovery.completePasswordReset({token:req.body.token,password:req.body.password},recoveryDependencies());require("../utils/logger").log("warn","security_password_reset_completed");return res.status(200).json({success:true,message:"Password reset successfully. Sign in with your new password."});}catch(error){const invalid=error.code==="INVALID_PASSWORD_RESET_TOKEN";require("../utils/logger").log("warn",invalid?"security_invalid_password_reset_token":"security_password_reset_failed",{errorCode:error.code||"PASSWORD_RESET_ERROR"});const status=error.code==="PASSWORD_REUSE"?409:error.code==="WEAK_PASSWORD"?400:400;return res.status(status).json({success:false,message:invalid?"The password reset link is invalid or expired.":error.message,code:error.code||"PASSWORD_RESET_FAILED",...(error.errors?{errors:error.errors}: {}) });}};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
};
