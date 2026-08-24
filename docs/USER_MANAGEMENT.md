# User management

## Capability matrix

| Action | Super administrator | Institution administrator | Issuer | Verifier |
|---|---|---|---|---|
| List/view users and security status | All users | Own institution | No | No |
| Create/edit identity | All permitted roles | Own institution; issuer/verifier only | No | No |
| Change role | All roles except own role; last-admin protection | Issuer/verifier in own institution | No | No |
| Reassign institution | Yes, active institutions only | No | No | No |
| Activate/deactivate | Global; cannot self-deactivate or remove last active super admin | Own institution; cannot self-deactivate | No | No |
| Unlock | Global | Own institution | No | No |
| Require password change | Global | Own institution | No | No |
| Trigger password reset delivery | Global | Own institution | No | No |
| View user audit history | Through scoped audit log | Own-institution audit scope | No | No |

## Lifecycle and controls

Users are retained historically and are activated or deactivated rather than
deleted. Identity updates whitelist only full name and normalized email. Role,
institution, and status changes use dedicated endpoints. Institution scope is
enforced by the API and SQL query path; frontend visibility is only a usability
aid.

Role changes reject self-change and protect the last active super administrator.
Promotion to `super_admin` clears institution membership. Any scoped role needs
an active institution. Only a super administrator may reassign institutions,
and reassignment never silently changes the role. Role changes, institution
reassignment, deactivation, and forced password change invalidate sessions by
incrementing `token_version`.

Unlock clears only `failed_login_attempts` and `locked_until`; it does not alter
the password or issue a session. Administrators may set `must_change_password`,
but only the user's successful password-change/reset workflow clears it. The
operator reset action stores only a token hash and sends the link through the
configured Phase 4 delivery channel. No password or reset token is displayed.

Authorized detail responses expose only bounded state: active, locked,
password-change requirement, institution, and last login. They never expose
password/reset hashes, failure counters, lock timestamps, or token versions.
Every mutation emits a controlled audit event with safe old/new values where
applicable.
