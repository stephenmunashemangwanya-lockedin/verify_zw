/** Keep a small prefix/suffix while hiding the identifying middle section. */
const maskStudentNumber = (studentNumber) => {
  if (typeof studentNumber !== "string" || studentNumber.length === 0) return null;
  if (studentNumber.length <= 4) return "*".repeat(studentNumber.length);
  const prefixLength = Math.min(3, Math.ceil(studentNumber.length / 3));
  const suffixLength = Math.min(3, Math.floor(studentNumber.length / 3));
  return `${studentNumber.slice(0, prefixLength)}${"*".repeat(studentNumber.length - prefixLength - suffixLength)}${studentNumber.slice(-suffixLength)}`;
};

module.exports = { maskStudentNumber };
