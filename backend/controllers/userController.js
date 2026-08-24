const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { ROLES, ROLE_VALUES, INSTITUTION_MANAGED_ROLES } = require("../constants/roles");
const { validatePassword } = require("../utils/passwordPolicy");
const { createAuditLog } = require("../models/auditModel");
const { getInstitutionById } = require("../models/institutionModel");
const { deliverPasswordReset } = require("../services/emailService");
const { resetUrl } = require("../services/passwordRecoveryService");
const { createUser, findUserByEmail, findUserForAuthentication, findSafeUserById, listUsers, updateUserFields, updateUserStatus, updateUserRoleAndInstitution, updateUserInstitution, unlockUser, requireUserPasswordChange, updateUserPassword, setPasswordReset, countActiveSuperAdmins } = require("../models/userModel");
const { paginationFromQuery, buildPaginationMetadata } = require("../utils/pagination");
const { normaliseSearchTerm, escapeLikePattern, statusBoolean, validateSortOrder } = require("../utils/queryHelpers");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeUser = (user) => user && ({ id: user.id, fullName: user.full_name, email: user.email, role: user.role, institutionId: user.institution_id, institutionName: user.institution_name, isActive: user.is_active, mustChangePassword: user.must_change_password, isLocked: Boolean(user.is_locked), lastLoginAt: user.last_login_at || null, passwordChangedAt: user.password_changed_at, createdAt: user.created_at, updatedAt: user.updated_at });
const audit = (req, action, target, details = {}) => createAuditLog({ userId: req.user.userId, institutionId: target?.institution_id || req.user.institutionId, action, entityType: "user", entityId: target?.id, details, ipAddress: req.ip, userAgent: req.get?.("user-agent") || null });
const respond = (res, status, message) => res.status(status).json({ success: false, message });
const targetForActor = async (req, id) => {
  if (!UUID.test(id || "")) return { error: [400, "User ID is invalid."] };
  const target = await findUserForAuthentication(id);
  if (!target) return { error: [404, "User not found."] };
  if (req.user.role !== ROLES.SUPER_ADMIN && target.institution_id !== req.user.institutionId) return { error: [403, "You cannot manage a user from another institution."] };
  return { target };
};
const validateIdentity = ({ fullName, email }) => {
  if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.length > 150) return "A valid full name is required.";
  if (!EMAIL.test(String(email || "").toLowerCase())) return "A valid email address is required.";
  return null;
};
const createResetMaterial = () => { const raw = crypto.randomBytes(32).toString("base64url"); return { raw, hash: crypto.createHash("sha256").update(raw).digest("hex"), expiresAt: new Date(Date.now() + 60 * 60 * 1000) }; };

const list = async (req, res) => {
  const paging = paginationFromQuery(req.query); const search = normaliseSearchTerm(req.query.search);
  if (req.user.role !== ROLES.SUPER_ADMIN && req.query.institutionId && req.query.institutionId !== req.user.institutionId) return respond(res, 403, "You cannot query users from another institution.");
  const result = await listUsers({ institutionId: req.user.role === ROLES.SUPER_ADMIN ? req.query.institutionId || null : req.user.institutionId, ...paging, search: search ? `%${escapeLikePattern(search)}%` : null, role: req.query.role || null, status: statusBoolean(req.query.status), sortBy: req.query.sortBy || "created_at", sortOrder: validateSortOrder(req.query.sortOrder) });
  const rows = Array.isArray(result) ? result : result.rows; const total = Array.isArray(result) ? result.length : result.total;
  return res.json({ success: true, total, users: rows.map(safeUser), pagination: buildPaginationMetadata({ page: paging.page, limit: paging.limit, total }) });
};
const getOne = async (req, res) => { const result = await targetForActor(req, req.params.id); if (result.error) return respond(res, ...result.error); return res.json({ success: true, user: safeUser(await findSafeUserById(result.target.id)) }); };

const create = async (req, res) => {
  const { fullName, email, role, institutionId, isActive = true } = req.body || {};
  const identityError = validateIdentity({ fullName, email }); if (identityError) return respond(res, 400, identityError);
  if (!ROLE_VALUES.includes(role)) return respond(res, 400, "Invalid user role.");
  if (req.user.role === ROLES.INSTITUTION_ADMIN && (!req.user.institutionId || req.user.currentUser?.institution_active === false)) return respond(res, 403, "Your institution is inactive or unassigned.");
  if (req.user.role === ROLES.INSTITUTION_ADMIN && !INSTITUTION_MANAGED_ROLES.includes(role)) return respond(res, 403, "Institution administrators may create only issuer or verifier accounts.");
  const effectiveInstitution = role === ROLES.SUPER_ADMIN ? null : (req.user.role === ROLES.INSTITUTION_ADMIN ? req.user.institutionId : institutionId || null);
  if (role !== ROLES.SUPER_ADMIN && !UUID.test(effectiveInstitution || "")) return respond(res, 400, "A valid institution is required for this role.");
  if (effectiveInstitution) { const institution = await getInstitutionById(effectiveInstitution); if (!institution) return respond(res, 404, "Institution not found."); if (!institution.status) return respond(res, 422, "Users cannot be assigned to an inactive institution."); }
  if (await findUserByEmail(email.toLowerCase())) return respond(res, 409, "A user with this email already exists.");
  const reset = createResetMaterial();
  const user = await createUser({ fullName: fullName.trim(), email: email.toLowerCase(), passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12), role, institutionId: effectiveInstitution });
  await setPasswordReset(user.id, reset.hash, reset.expiresAt);
  if (isActive === false) await updateUserStatus(user.id, false);
  await audit(req, effectiveInstitution ? "INSTITUTION_USER_CREATED" : "USER_CREATED", user, { role, institutionId: effectiveInstitution });
  const response = { success: true, message: "User created with password setup required.", user: safeUser(await findSafeUserById(user.id)) };
  if (process.env.NODE_ENV !== "production") response.developmentPasswordSetupToken = reset.raw;
  return res.status(201).json(response);
};

const update = async (req, res) => {
  const allowed = new Set(["fullName", "email"]); if (Object.keys(req.body || {}).some((key) => !allowed.has(key))) return respond(res, 400, "Only fullName and email may be updated here.");
  const result = await targetForActor(req, req.params.id); if (result.error) return respond(res, ...result.error);
  const fields = {}; if (req.body.fullName !== undefined) fields.fullName = String(req.body.fullName).trim(); if (req.body.email !== undefined) { if (!EMAIL.test(req.body.email)) return respond(res, 400, "A valid email is required."); fields.email = req.body.email.toLowerCase(); }
  const before = { fullName: result.target.full_name, email: result.target.email }; const user = await updateUserFields(result.target.id, fields); const after = { fullName: user.full_name, email: user.email }; await audit(req, "USER_UPDATED", user, { before, after }); return res.json({ success: true, user: safeUser(user) });
};

const changeStatus = async (req, res) => {
  if (typeof req.body?.isActive !== "boolean") return respond(res, 400, "isActive must be boolean.");
  const result = await targetForActor(req, req.params.id); if (result.error) return respond(res, ...result.error);
  if (!req.body.isActive && result.target.id === req.user.userId) return respond(res, 409, "You cannot deactivate your own account.");
  if (!req.body.isActive && result.target.role === ROLES.SUPER_ADMIN && await countActiveSuperAdmins() <= 1) return respond(res, 409, "The last active super administrator cannot be deactivated.");
  const user = await updateUserStatus(result.target.id, req.body.isActive); await audit(req, req.body.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED", user); return res.json({ success: true, user: safeUser(user) });
};
const changeRole = async (req, res) => {
  const role = req.body?.role; if (!ROLE_VALUES.includes(role)) return respond(res, 400, "Invalid user role.");
  const result = await targetForActor(req, req.params.id); if (result.error) return respond(res, ...result.error);
  if (result.target.id === req.user.userId) return respond(res, 409, "You cannot change your own role.");
  if (req.user.role !== ROLES.SUPER_ADMIN && !INSTITUTION_MANAGED_ROLES.includes(role)) return respond(res, 403, "You cannot assign this role.");
  if (result.target.role === ROLES.SUPER_ADMIN && role !== ROLES.SUPER_ADMIN && await countActiveSuperAdmins() <= 1) return respond(res, 409, "The last active super administrator cannot be demoted.");
  const institutionId = role === ROLES.SUPER_ADMIN ? null : (req.user.role === ROLES.SUPER_ADMIN ? req.body.institutionId || result.target.institution_id : result.target.institution_id);
  if (role !== ROLES.SUPER_ADMIN && !institutionId) return respond(res, 422, "An institution must be assigned before applying this role.");
  if (role !== ROLES.SUPER_ADMIN) { const institution = await getInstitutionById(institutionId); if (!institution?.status) return respond(res, 422, "The assigned institution is inactive."); }
  const oldRole = result.target.role; const user = await updateUserRoleAndInstitution(result.target.id, role, institutionId); await audit(req, "USER_ROLE_CHANGED", user, { oldRole, newRole: role }); return res.json({ success: true, user: safeUser(user) });
};
const assignInstitution = async (req, res) => {
  if (req.user.role !== ROLES.SUPER_ADMIN) return respond(res, 403, "Only a super administrator may reassign institutions.");
  const result = await targetForActor(req, req.params.id); if (result.error) return respond(res, ...result.error);
  if (result.target.role === ROLES.SUPER_ADMIN) return respond(res, 409, "A global super administrator cannot be assigned to an institution.");
  const institutionId = req.body?.institutionId; if (!UUID.test(institutionId || "")) return respond(res, 400, "A valid institution ID is required.");
  const institution = await getInstitutionById(institutionId); if (!institution) return respond(res, 404, "Institution not found."); if (!institution.status) return respond(res, 422, "The institution is inactive.");
  const oldInstitutionId = result.target.institution_id; const user = await updateUserInstitution(result.target.id, institutionId); await audit(req, "USER_INSTITUTION_REASSIGNED", user, { oldInstitutionId, newInstitutionId: institutionId }); return res.json({ success: true, user: safeUser(user) });
};
const unlock = async (req, res) => { const result = await targetForActor(req, req.params.id); if (result.error) return respond(res, ...result.error); const user = await unlockUser(result.target.id); await audit(req, "ACCOUNT_UNLOCKED", user); require("../utils/logger").log("warn", "security_account_unlocked", { actorId: req.user.userId, userId: user.id }); return res.json({ success: true, message: "Account unlocked.", user: safeUser(user) }); };
const requirePasswordChange = async (req, res) => { const result = await targetForActor(req, req.params.id); if (result.error) return respond(res, ...result.error); const user = await requireUserPasswordChange(result.target.id); await audit(req, "PASSWORD_CHANGE_REQUIRED", user); return res.json({ success: true, message: "Password change required. Existing sessions have been invalidated.", user: safeUser(user) }); };
const resetPassword = async (req, res) => {
  const result = await targetForActor(req, req.params.id); if (result.error) return respond(res, ...result.error); const reset = createResetMaterial();
  await setPasswordReset(result.target.id, reset.hash, reset.expiresAt); await audit(req, "USER_PASSWORD_RESET_BY_ADMIN", result.target, { expiresAt: reset.expiresAt.toISOString() });
  setImmediate(()=>deliverPasswordReset({ email: result.target.email, resetUrl: resetUrl(reset.raw) }).catch(error=>require("../utils/logger").log("error", "admin_password_reset_delivery_failed", { errorCode: error.code || "EMAIL_DELIVERY_FAILED", userId: result.target.id })));
  return res.json({ success: true, message: "Password reset instructions have been requested through the configured delivery channel." });
};

const profile = async (req, res) => res.json({ success: true, user: safeUser(await findSafeUserById(req.user.userId)) });
const updateProfile = async (req, res) => { req.params.id = req.user.userId; return update(req, res); };
const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {}; if (!currentPassword || !newPassword) return respond(res, 400, "Current and new passwords are required."); if (newPassword !== confirmPassword) return respond(res, 400, "Password confirmation does not match.");
  const user = req.user.currentUser; if (!await bcrypt.compare(currentPassword, user.password_hash)) return respond(res, 401, "Current password is incorrect."); if (await bcrypt.compare(newPassword, user.password_hash)) return respond(res, 409, "The new password must differ from the current password.");
  const errors = validatePassword(newPassword); if (errors.length) return res.status(400).json({ success: false, message: "Password does not meet security requirements.", errors });
  await updateUserPassword(user.id, await bcrypt.hash(newPassword, 12)); await audit(req, "PASSWORD_CHANGED", user); return res.json({ success: true, message: "Password changed. Sign in again with the new password." });
};
module.exports = { list, getOne, create, update, changeStatus, changeRole, assignInstitution, unlock, requirePasswordChange, resetPassword, profile, updateProfile, changePassword, safeUser };
