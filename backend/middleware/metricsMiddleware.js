const { metrics } = require("../utils/metrics");
const { safeRoute } = require("../utils/logger");
const metricsMiddleware = (req, res, next) => {
  const stop = metrics.httpDuration.startTimer();
  res.on("finish", () => { const route = safeRoute(req); const statusClass = `${Math.floor(res.statusCode / 100)}xx`; stop({ method: req.method, route }); metrics.httpRequests.inc({ method: req.method, route, status_class: statusClass }); if (res.statusCode >= 400) metrics.httpErrors.inc({ route, status_class: statusClass }); });
  next();
};
module.exports = { metricsMiddleware };
