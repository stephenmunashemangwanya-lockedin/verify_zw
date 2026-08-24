# Staging Email

Password reset retains its non-enumerating response and provider abstraction. Staging requires the HTTPS webhook provider, bearer token, verified staging sender, bounded timeout and secret-safe logging. Provider failure never exposes whether an account exists.

Operator checklist: create a staging API credential; verify a non-production sender/subdomain; provide URL/token/from address; configure bounce/complaint handling and quotas; authorize a test recipient; validate reset expiry and one-time use. No real email is sent during Phase 13.
