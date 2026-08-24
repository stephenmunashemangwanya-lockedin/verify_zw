# Student management

Students belong to one active institution. Super administrators can view all
students; institution administrators, issuers, and verifiers can view only their
institution. Institution administrators and issuers may create and edit students
in that scope. Verifiers have read-only access.

Editable identity fields are student number, full name, optional email, and
programme. Student numbers are limited to letters, numbers, dots, underscores,
slashes, and hyphens, and must begin with a letter or number. PostgreSQL remains
authoritative for the unique `(institution_id, student_number)` constraint;
duplicate races return a controlled `409`. Email is normalized but is not unique
in the existing schema.

Only a super administrator may reassign a student, only to an existing active
institution, and only while the student has no credential history. If any
credential references the student, reassignment returns `409`. Credentials are
never moved, rewritten, or deleted. Updates change the current directory record
only; previously issued PDF, IPFS, hash, and blockchain evidence remains as
originally issued. Credential issuance continues to require the current student
and credential institution to match.

The schema has no student active/status field, so Phase 6 adds no artificial
activation, deactivation, archival, or deletion workflow. The credential foreign
key uses `ON DELETE RESTRICT`, and normal management exposes no delete endpoint.
Creation, identity update, and permitted reassignment produce controlled audit
events with safe values only.
