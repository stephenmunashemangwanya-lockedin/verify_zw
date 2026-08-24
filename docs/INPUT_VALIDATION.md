# Input validation

Stage 17 uses Zod as the single validation library. Zod supports this CommonJS
project, strict object schemas, normalization, and cross-field date/password
checks without adding a competing validation system.

Schemas live under `backend/validators/` for authentication, users,
institutions, students, credentials, verification, audit queries, pagination,
and common primitives. `validationMiddleware.js` validates `params`, `query`,
and `body` before controllers. Strict schemas reject unknown fields to prevent
mass assignment. Multipart credential text fields are validated after Multer;
temporary files are removed when schema validation fails.

Common validators cover canonical UUIDs, email, trimmed strings, booleans, ISO
dates and ranges, non-zero EVM addresses, SHA-256 hashes, public tokens, roles,
credential statuses, bounded pagination, whitelisted sorting, and password
strength. A controlled `0x` SHA-256 prefix is removed without re-hashing.

Validation failures return:

```json
{
  "success": false,
  "message": "Validation failed.",
  "code": "VALIDATION_ERROR",
  "errors": [{ "field": "body.email", "message": "A valid email address is required." }]
}
```

Valid established fields and response names remain compatible. Run
`npm run test:validation`.
