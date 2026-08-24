# Error handling

`ApiError` represents controlled operational failures and `asyncHandler` is
available for incremental controller adoption. `notFoundMiddleware` and
`errorMiddleware` are mounted after all routes. Every request receives an
`x-request-id`; central 404 and error responses include that identifier.

Safe mappings include PostgreSQL `23505` to 409, `23503` to 400, `22P02` to
400, and `23514` to 422. Multer size failures map to 413 and invalid PDF uploads
to 422. IPFS and blockchain unavailable states map to 503, confirmation/storage
timeouts to 504, rejected transactions to 422, and duplicate proofs to 409.
Raw SQL, provider responses, credentials, filesystem paths, and stack traces are
never returned.

JWT middleware maps missing or malformed credentials to controlled 401
responses. Inactive database accounts return 403; stale token versions return
401. Signature, expiry, issuer, audience, and HS256 checks remain enforced.

Middleware order is Helmet/CORS, parsers, request ID/logging, routes, central
404, then central error handling. Development may log controlled classifications
internally; production responses remain generic for unexpected failures and
test mode suppresses expected error noise.

Run `npm run test:errors`.
