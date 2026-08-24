# Pagination, search, filtering, and sorting

Stage 19 adds optional listing query parameters without changing existing route paths or array field names. All list endpoints default to `page=1`, `limit=20`, and `sortOrder=desc`; the maximum limit is 100. Responses retain `success`, `total`, and their existing array field and add:

```json
{"pagination":{"page":1,"limit":20,"total":57,"totalPages":3,"hasNextPage":true,"hasPreviousPage":false}}
```

An empty result has `totalPages: 0`. Search text is trimmed, limited to 200 characters, escaped for SQL `LIKE` wildcards, and passed as a query value. Sort columns and direction come only from server-owned whitelists.

## Endpoints

- `GET /api/institutions`: `page`, `limit`, `search`, `status`, `sortBy`, `sortOrder`. Search covers name, email, wallet address, and phone. Status accepts `active`, `inactive`, `true`, or `false`. Sort: `name`, `email`, `status`, `created_at`.
- `GET /api/students`: `page`, `limit`, `search`, `institutionId`, `programme`, `sortBy`, `sortOrder`. Search covers student number, name, email, and programme. Sort: `student_number`, `full_name`, `programme`, `created_at`.
- `GET /api/users`: `page`, `limit`, `search`, `role`, `status`, `institutionId`, `sortBy`, `sortOrder`. Search covers name and email. Sort: `full_name`, `email`, `role`, `is_active`, `created_at`, `updated_at`. Password, reset, and lockout fields are never selected.
- `GET /api/credentials`: `page`, `limit`, `search`, `status`, `institutionId`, `studentId`, `issueDateFrom`, `issueDateTo`, `sortBy`, `sortOrder`. Search covers qualification, student name/number, institution name, and an exact certificate hash. Sort: `issue_date`, `qualification`, `status`, `created_at`, `updated_at`. Dates are ISO calendar dates with inclusive UTC-independent database date boundaries.
- `GET /api/verification-logs`: `page`, `limit`, `result`, `method`, `credentialId`, `institutionId`, `dateFrom`, `dateTo`, `sortBy`, `sortOrder`. This new administrative listing supports controlled result codes and `file`, `hash`, `credential_id`, `public_token`, and `qr` methods. It does not return verifier names, emails, IP addresses, or user agents.
- `GET /api/audit-logs`: retains its Stage 15 filters and adds the consistent top-level `total`. Returned details are sanitized again before output.

## Institution boundaries

Super administrators may select an institution. Institution administrators are always scoped to their authenticated institution inside SQL. A conflicting `institutionId` receives `403 ACCESS_DENIED`. Issuers and verifiers retain their existing student/credential read access within their institution, while user, verification-log, and audit-log administration remains denied.

Unknown verification attempts have no credential/institution attribution. Institution administrators do not receive those rows; super administrators may review them.

## Database and compatibility

Migration `005_listing_performance_indexes.sql` adds only idempotent filter/order indexes. It was executed twice successfully. Listing models use one count query and one bounded joined result query, avoiding fetch-to-count and N+1 behavior.

Run `npm run test:pagination`. The test suite uses model mocks and performs no persistent writes. Existing clients can continue reading the original array and `total` fields; clients may opt into the added pagination object.
