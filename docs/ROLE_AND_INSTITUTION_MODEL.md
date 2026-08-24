# Role and institution model

VerifyZW implements exactly four roles. `super_admin` is global and must have no institution. `institution_admin`, `issuer`, and `verifier` are institution-scoped and require an active institution. The backend reloads the current account and institution state on protected requests; inactive or unassigned institutional accounts are denied.

| Capability | super_admin | institution_admin | issuer | verifier |
| --- | --- | --- | --- | --- |
| Scope | Global | Own institution | Own institution | Own institution |
| Create/manage institutions | Yes | No | No | No |
| Create users | All policy-valid roles | Issuer/verifier in own institution | No | No |
| Change roles/status | Global, with invariants | Own issuer/verifier users | No | No |
| Reassign institutions | Yes, scoped users only | No | No | No |
| Read/create students | Yes | Yes | Yes | Read only |
| Read/issue credentials | Yes | Yes | Yes | Read only |
| Revoke credentials | Yes | Own institution | No | No |
| Public credential verification | Yes, and available anonymously | Yes | Yes | Yes |
| Audit logs | Global | Own institution | No | No |

Role changes invalidate existing sessions. Promotion to `super_admin` clears stale institution scope. A scoped role cannot be applied without an active institution. Actors cannot change their own role, the last active super administrator cannot be demoted or deactivated, and global super administrators cannot be assigned to an institution.

Institution deactivation preserves users and historical records but blocks institutional access and new scoped provisioning. Existing credential issuance also rejects inactive institutions.
Administrative mutations preserve the Phase 2 model. Super administrators are
global and have no institution. Every other role requires an active institution.
Only super administrators may reassign institutions. Institution administrators
can manage issuer and verifier accounts only inside their own institution; they
cannot promote either account to an administrative or global role. See the
[user-management capability matrix](USER_MANAGEMENT.md#capability-matrix).
