# API role permissions

`✓` means the route middleware permits the role. Institution-scoped services still restrict records to the current institution. `Admin rules` means the controller applies additional actor/target protections. Public access never requires a token.

| Route group / operation | Public | Verifier | Issuer | Institution admin | Super admin |
|---|:---:|:---:|:---:|:---:|:---:|
| `GET /health` | ✓ | ✓ | ✓ | ✓ | ✓ |
| Detailed health | — | — | — | — | ✓ |
| Register verifier, login | ✓ | ✓ | ✓ | ✓ | ✓ |
| Logout, profile, profile update, password change | — | ✓ | ✓ | ✓ | ✓ |
| Auth admin probe | — | — | — | ✓ | ✓ |
| User list/detail/create/update/status/role/institution/reset | — | — | — | ✓ Admin rules | ✓ Admin rules |
| Institution list/detail | — | ✓ | ✓ | ✓ | ✓ |
| Create/status/blockchain administration for institutions | — | — | — | — | ✓ |
| Student list/detail | — | ✓ | ✓ | ✓ | ✓ |
| Create student | — | — | ✓ | ✓ | ✓ |
| Credential list/detail | — | ✓ | ✓ | ✓ | ✓ |
| Issue credential | — | — | ✓ | ✓ | ✓ |
| Revoke credential | — | — | — | ✓ | ✓ |
| Generate presentation PDF | — | — | ✓ | ✓ | ✓ |
| Public verification by file/hash/ID/token/QR | ✓ | ✓ | ✓ | ✓ | ✓ |
| Verification logs | — | — | — | ✓ | ✓ |
| Audit logs | — | — | — | ✓ | ✓ |
| Dashboard summary and verification trends | — | ✓ | ✓ | ✓ | ✓ |
| Dashboard most-verified credentials | — | ✓ | ✓ | ✓ | ✓ |
| Recent activity, credential trends, failure analytics | — | — | ✓ | ✓ | ✓ |
| Top institutions and system health | — | — | — | — | ✓ |
| Swagger UI in development | Configured | Configured | Configured | Configured | Configured |
| Swagger UI with `SWAGGER_REQUIRE_AUTH=true` | — | — | — | — | ✓ |

Frontend visibility does not grant access. All permissions above are enforced by backend middleware plus current-user reload and controller-level institution rules.
