-- Add the institution-independent simulated accreditation authority role.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'institution_admin', 'issuer', 'verifier', 'student', 'regulator')) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT users_role_check;
