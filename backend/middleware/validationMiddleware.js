const fs = require("fs");
const validate = (schemas = {}) => async (req, res, next) => {
  const errors = [];
  for (const location of ["params", "query", "body"]) {
    if (!schemas[location]) continue;
    const result = schemas[location].safeParse(req[location] || {});
    if (!result.success) errors.push(...result.error.issues.map((issue) => ({ field: [location, ...issue.path].join("."), message: issue.message })));
    else if (location === "query") Object.assign(req.query, result.data);
    else req[location] = result.data;
  }
  if (!errors.length) return next();
  if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
  return res.status(400).json({ success: false, message: "Validation failed.", code: "VALIDATION_ERROR", errors });
};
module.exports = { validate };
