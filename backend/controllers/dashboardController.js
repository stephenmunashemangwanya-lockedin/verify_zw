const service = require("../services/dashboardService");
const { createAuditLog } = require("../models/auditModel");
const success = (req, res, data) => res.json({ success: true, data, requestId: req.requestId || req.id || null });
const auditSensitive = (req, action) => createAuditLog({ userId: req.user.userId, institutionId: req.user.institutionId, action, entityType: "dashboard", details: { endpoint: req.path }, ipAddress: req.ip, userAgent: req.get?.("user-agent") || null });
const handler = (operation, auditAction = null) => async (req, res, next) => { try { const data = await operation(req.query, req.user); if (auditAction) await auditSensitive(req, auditAction); return success(req, res, data); } catch (error) { return next(error); } };
module.exports = {
  summary: handler((_query, user) => service.summary(user)),
  recentActivity: handler(service.recentActivity),
  credentialTrends: handler(service.credentialTrends),
  verificationTrends: handler(service.verificationTrends),
  topInstitutions: handler((query) => service.topInstitutions(query), "PLATFORM_ANALYTICS_VIEWED"),
  mostVerifiedCredentials: handler(service.mostVerifiedCredentials),
  failures: handler(service.failures, "FAILURE_ANALYTICS_VIEWED"),
  systemHealth: handler(() => service.systemHealth(), "SYSTEM_HEALTH_VIEWED"),
};
