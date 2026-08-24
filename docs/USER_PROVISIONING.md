# User provisioning

Accounts are created by authorised administrators; public self-registration is disabled because the project has no neutral public-account role. Public credential verification remains available without login.

The first super administrator is created through the operations-only procedure in [Administrator bootstrap and recovery](ADMIN_BOOTSTRAP.md). An authenticated super administrator may provision institution administrators, issuers, and verifiers and selects an active institution for every institution-scoped role. A super administrator is always global and any submitted institution value is discarded.

Institution administrators can provision only issuers and verifiers. The backend fixes the new account to the actor's own institution and ignores any attempted alternative institution selection. An inactive or unassigned institution administrator cannot perform protected institutional work.

New users receive a cryptographically random unusable initial password plus a single-use password-setup token stored only as a SHA-256 digest. Production delivery requires the configured secure channel. Password hashes and security internals are never returned.

Only a super administrator may reassign an institution, and only for a non-global user to an existing active institution. Role and institution changes increment `token_version`, invalidating existing sessions. Creation, role changes, reassignment, activation, deactivation, and password reset are audited without credentials or tokens.

Forbidden examples include an institution administrator creating a super administrator, selecting another institution, listing or changing another institution's users, changing their own role, assigning a super administrator to an institution, or provisioning into an inactive institution.
The complete administrative lifecycle and capability matrix are documented in
[USER_MANAGEMENT.md](USER_MANAGEMENT.md).
