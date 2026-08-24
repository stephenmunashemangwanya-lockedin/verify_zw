const { listVerificationLogs } = require("../models/verificationModel");
const { paginationFromQuery, buildPaginationMetadata } = require("../utils/pagination");
const { validateSortOrder } = require("../utils/queryHelpers");
const list = async (req, res, next) => {
  try {
    const paging = paginationFromQuery(req.query);
    if (req.user.role !== "super_admin" && req.query.institutionId && req.query.institutionId !== req.user.institutionId) return res.status(403).json({ success: false, message: "You cannot query verification logs from another institution.", code: "ACCESS_DENIED" });
    const result = await listVerificationLogs({ ...paging, scopeInstitutionId: req.user.role === "super_admin" ? null : req.user.institutionId, institutionId: req.user.role === "super_admin" ? req.query.institutionId || null : null, resultCode: req.query.result || null, method: req.query.method || null, credentialId: req.query.credentialId || null, dateFrom: req.query.dateFrom || null, dateTo: req.query.dateTo || null, sortBy: req.query.sortBy || "verification_time", sortOrder: validateSortOrder(req.query.sortOrder) });
    return res.json({ success: true, total: result.total, verificationLogs: result.rows, pagination: buildPaginationMetadata({ page: paging.page, limit: paging.limit, total: result.total }) });
  } catch (error) { return next(error); }
};
module.exports = { list };
