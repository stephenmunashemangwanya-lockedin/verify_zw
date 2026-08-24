const { getAuditLogs, getAuditLog } = require("../services/auditService");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const list = async (req, res) => {
  try { return res.status(200).json({ success: true, ...(await getAuditLogs(req.query, req.user)) }); }
  catch { return res.status(500).json({ success: false, message: "Failed to retrieve audit logs." }); }
};
const getOne = async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id || "")) return res.status(400).json({ success: false, message: "Audit log ID is invalid." });
  try {
    const auditLog = await getAuditLog(req.params.id, req.user);
    return auditLog ? res.status(200).json({ success: true, auditLog }) : res.status(404).json({ success: false, message: "Audit log not found." });
  } catch { return res.status(500).json({ success: false, message: "Failed to retrieve audit log." }); }
};
module.exports = { list, getOne };
