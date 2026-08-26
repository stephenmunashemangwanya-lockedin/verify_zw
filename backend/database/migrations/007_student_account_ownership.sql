-- Additive student self-service ownership. Existing staff accounts remain unchanged.
BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'institution_admin', 'issuer', 'verifier', 'student')) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT users_role_check;

ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_students_user') THEN
    ALTER TABLE students ADD CONSTRAINT fk_students_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;
    ALTER TABLE students VALIDATE CONSTRAINT fk_students_user;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_user_id ON students (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN students.user_id IS
  'Optional one-to-one authenticated student account. Staff accounts have no student profile.';
COMMIT;
