CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(255), email VARCHAR(255) UNIQUE NOT NULL, phone VARCHAR(30),
  status BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL CHECK (role IN ('super_admin','institution_admin','issuer','verifier')),
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_number VARCHAR(100) NOT NULL,
  full_name VARCHAR(255) NOT NULL, email VARCHAR(255), programme VARCHAR(255) NOT NULL,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, UNIQUE (institution_id, student_number)
);
CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  qualification VARCHAR(255) NOT NULL, issue_date DATE NOT NULL,
  certificate_hash TEXT UNIQUE NOT NULL, ipfs_cid TEXT, blockchain_tx TEXT UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), credential_id UUID REFERENCES credentials(id) ON DELETE CASCADE,
  verifier_name VARCHAR(255), verifier_email VARCHAR(255), verification_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  result BOOLEAN NOT NULL, ip_address INET
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, entity_type VARCHAR(100), entity_id UUID, details JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
