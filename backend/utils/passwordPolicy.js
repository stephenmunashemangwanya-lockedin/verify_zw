const COMMON = new Set(["password", "password123", "admin123", "qwerty123", "letmein123"]);
const validatePassword = (password) => {
  const minimum = Math.max(8, Number.parseInt(process.env.PASSWORD_MIN_LENGTH || "12", 10) || 12);
  const errors = [];
  if (typeof password !== "string" || password.length < minimum) errors.push(`Password must contain at least ${minimum} characters.`);
  if (!/[A-Z]/.test(password || "")) errors.push("Password must include an uppercase letter.");
  if (!/[a-z]/.test(password || "")) errors.push("Password must include a lowercase letter.");
  if (!/[0-9]/.test(password || "")) errors.push("Password must include a number.");
  if (!/[^A-Za-z0-9]/.test(password || "")) errors.push("Password must include a special character.");
  if (COMMON.has(String(password || "").toLowerCase())) errors.push("Password is too common.");
  return errors;
};
module.exports = { validatePassword };
