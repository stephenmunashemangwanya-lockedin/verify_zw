class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined, operational = true) {
    super(message); this.name = "ApiError"; this.statusCode = statusCode; this.code = code; this.details = details; this.operational = operational;
  }
}
module.exports = { ApiError };
