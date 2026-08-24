const jwt = require("jsonwebtoken");
const { findUserForAuthentication } = require("../models/userModel");
const { authCookieName, csrfCookieName, parseCookies, validateCsrf, clearAuthCookies } = require("../utils/authSession");
const securityFailure = (req, event, reason) => { require("../utils/logger").log("warn", event, { requestId: req.requestId, correlationId: req.correlationId, errorCode: reason }); require("../utils/metrics").metrics.authenticationFailures.inc({ reason }); };

const authenticate = (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[authCookieName()];
  const authorizationHeader = req.headers.authorization;
  const bearer = authorizationHeader?.split(" ");
  const bearerToken = bearer?.length === 2 && bearer[0] === "Bearer" && bearer[1] ? bearer[1] : null;
  const token = cookieToken || bearerToken;
  req.authSource = cookieToken ? "cookie" : bearerToken ? "bearer" : null;

  if (!token) {
    securityFailure(req, "security_authentication_required", "missing");
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
      code: "AUTHENTICATION_REQUIRED",
    });
  }

  if (!cookieToken && authorizationHeader && !bearerToken) {
    securityFailure(req, "security_invalid_jwt", "malformed");
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format.",
      code: "AUTHENTICATION_REQUIRED",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: [process.env.JWT_ALGORITHM || "HS256"], issuer: process.env.JWT_ISSUER || "zimbabwe-skill-verification-platform", audience: process.env.JWT_AUDIENCE || "zsvp-api" }
    );

    req.user = decoded;
    if (!validateCsrf(req)) return res.status(403).json({ success:false, message:"CSRF validation failed.", code:"CSRF_VALIDATION_FAILED" });
    if (cookieToken && cookies[csrfCookieName()]) res.setHeader("X-CSRF-Token", cookies[csrfCookieName()]);

    next();
  } catch (error) {
    if (cookieToken && typeof res.clearCookie === "function") clearAuthCookies(res);
    securityFailure(req, error?.name === "TokenExpiredError" ? "security_expired_jwt" : "security_invalid_jwt", error?.name === "TokenExpiredError" ? "expired" : "invalid");
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
      code: "INVALID_CREDENTIALS",
    });
  }
};

const requireCurrentUser = async (req, res, next) => {
  try {
    const current = await findUserForAuthentication(req.user.userId);
    if (!current) return res.status(401).json({ success: false, message: "Authentication state is no longer valid.", code: "INVALID_CREDENTIALS" });
    if (!current.is_active) return res.status(403).json({ success: false, message: "This account is inactive.", code: "ACCOUNT_INACTIVE" });
    if (current.role !== "super_admin" && (!current.institution_id || current.institution_active === false)) return res.status(403).json({ success: false, message: "Institutional access is inactive or unassigned.", code: "INSTITUTION_ACCESS_INACTIVE" });
    if (Number(current.token_version) !== Number(req.user.tokenVersion)) return res.status(401).json({ success: false, message: "Authentication state is no longer valid.", code: "INVALID_CREDENTIALS" });
    const route = `${req.baseUrl || ""}${req.path || ""}`;
    if (current.must_change_password && !["/api/auth/profile","/api/auth/change-password","/api/auth/logout"].some((allowed) => route.endsWith(allowed))) return res.status(403).json({ success:false, message:"Password change is required.", code:"PASSWORD_CHANGE_REQUIRED" });
    req.user = { userId: current.id, role: current.role, institutionId: current.institution_id, tokenVersion: current.token_version, currentUser: current };
    next();
  } catch { return res.status(503).json({ success: false, message: "Unable to validate the current account." }); }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      require("../utils/logger").log("warn", "security_permission_denied", { requestId: req.requestId, correlationId: req.correlationId, userId: req.user.userId, institutionId: req.user.institutionId, route: req.path });
      return res.status(403).json({
        success: false,
      message:
          "You do not have permission to access this resource.",
        code: "ACCESS_DENIED",
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
  requireCurrentUser,
};
