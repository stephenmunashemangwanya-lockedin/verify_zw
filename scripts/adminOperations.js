const bcrypt = require("bcryptjs");
const { ROLES } = require("../backend/constants/roles");
const { validatePassword } = require("../backend/utils/passwordPolicy");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN]);
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const validateInputs = (email, password) => {
  const normalised = String(email || "").trim().toLowerCase();
  if (!EMAIL.test(normalised)) fail("INVALID_ADMIN_EMAIL", "A valid administrator email is required.");
  const errors = validatePassword(password); if (errors.length) fail("WEAK_ADMIN_PASSWORD", errors.join(" "));
  return normalised;
};
const bootstrapAdmin = async ({ fullName, email, password, allowBootstrap, allowOverride = false }, dependencies) => {
  if (allowBootstrap !== true) fail("ADMIN_BOOTSTRAP_DISABLED", "Administrator bootstrap requires ALLOW_ADMIN_BOOTSTRAP=true.");
  if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 255) fail("INVALID_ADMIN_NAME", "A valid administrator full name is required.");
  const normalised = validateInputs(email, password); const passwordHash = await dependencies.bcrypt.hash(password, 12);
  try {
    const user = await dependencies.model.createFirstSuperAdmin({ fullName: fullName.trim(), email: normalised, passwordHash, allowOverride });
    await dependencies.audit.createAuditLog({ userId: user.id, action: allowOverride ? "ADMIN_BOOTSTRAP_OVERRIDE_USED" : "SUPER_ADMIN_BOOTSTRAPPED", entityType: "user", entityId: user.id, institutionId: null, details: { source: "CLI", role: ROLES.SUPER_ADMIN, overrideUsed: allowOverride } });
    if (allowOverride) dependencies.logger.log("warn", "security_admin_bootstrap_override_used", { userId: user.id, role: user.role });
    return user;
  } catch (error) { dependencies.logger.log("warn", "security_admin_bootstrap_rejected", { reason: error.code || "DATABASE_ERROR" }); throw error; }
};
const resetAdminPassword = async ({ email, password }, dependencies) => {
  const normalised = validateInputs(email, password); const target = await dependencies.model.findUserByEmail(normalised);
  if (!target) fail("ADMIN_NOT_FOUND", "Administrator account was not found.");
  if (!ADMIN_ROLES.has(target.role)) fail("ADMIN_ROLE_REQUIRED", "Password recovery is limited to privileged administrators.");
  const updated = await dependencies.model.recoverAdministratorPassword(target.id, await dependencies.bcrypt.hash(password, 12));
  await dependencies.audit.createAuditLog({ userId: target.id, action: "ADMIN_PASSWORD_RESET", entityType: "user", entityId: target.id, institutionId: target.institution_id, details: { source: "CLI", role: target.role } });
  dependencies.logger.log("warn", "security_admin_password_reset", { userId: target.id, role: target.role }); return updated;
};
const dependencies = () => ({ bcrypt, model: require("../backend/models/userModel"), audit: require("../backend/models/auditModel"), logger: require("../backend/utils/logger") });
module.exports = { bootstrapAdmin, resetAdminPassword, dependencies, ADMIN_ROLES };
