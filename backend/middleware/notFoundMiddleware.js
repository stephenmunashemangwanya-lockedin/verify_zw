const notFoundMiddleware = (req, res) => res.status(404).json({ success: false, message: "API endpoint not found.", code: "RESOURCE_NOT_FOUND", requestId: req.id || null });
module.exports = { notFoundMiddleware };
