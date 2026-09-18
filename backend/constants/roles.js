const ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  INSTITUTION_ADMIN: "institution_admin",
  ISSUER: "issuer",
  VERIFIER: "verifier",
  STUDENT: "student",
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const INSTITUTION_MANAGED_ROLES = Object.freeze([
  ROLES.ISSUER,
  ROLES.VERIFIER,
  ROLES.STUDENT,
]);

module.exports = {
  ROLES,
  ROLE_VALUES,
  INSTITUTION_MANAGED_ROLES,
};