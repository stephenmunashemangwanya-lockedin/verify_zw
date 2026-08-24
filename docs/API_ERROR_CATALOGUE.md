# API error catalogue

Responses expose safe messages and may include a request ID. They never expose stack traces, provider credentials, private keys, database errors, or raw internal configuration. Exact status can vary by operation state; use both HTTP status and `code`.

| Code | Typical status | Meaning and common cause | Safe recovery |
|---|---:|---|---|
| `VALIDATION_ERROR` | 400/422 | Body, path, query, date range, UUID, or enum failed validation. | Correct only the listed fields and retry. |
| `AUTHENTICATION_REQUIRED` | 401 | Bearer token missing, invalid, expired, or stale. | Clear the client session and authenticate again. |
| `INVALID_CREDENTIALS` | 401 | Email/password did not authenticate. | Recheck credentials; avoid rapid retries. |
| `ACCESS_DENIED` | 403 | Role or institution scope does not permit the action. | Use an authorized account; do not try to bypass scope. |
| `ACCOUNT_INACTIVE` | 403 | User or institution is inactive. | Contact an authorized administrator. |
| `ACCOUNT_LOCKED` | 423 | Repeated login failures triggered temporary lockout. | Wait for expiry or follow administrator policy. |
| `RESOURCE_NOT_FOUND` | 404 | Resource is absent, inaccessible, or an optional feature is disabled. | Verify the identifier and current role. |
| `DUPLICATE_RESOURCE` | 409 | Email, student number, institution, or certificate hash already exists. | Retrieve the existing record or use unique input. |
| `INVALID_INPUT` | 400 | Input is present but invalid for the requested operation. | Correct the value; retry only after correction. |
| `INVALID_FILE` | 400/422 | Missing, non-PDF, misleading filename, MIME mismatch, or invalid PDF structure. | Select a genuine PDF with a simple `.pdf` filename. |
| `FILE_TOO_LARGE` | 413 | Upload exceeds the configured limit. | Submit a smaller valid PDF; do not split the authoritative document. |
| `INVALID_HASH` | 400 | Hash is not 64 hexadecimal SHA-256 characters. | Recompute SHA-256 over the original PDF bytes. |
| `IPFS_UNAVAILABLE` | 503 | IPFS provider could not accept or retrieve evidence. | Retry later after provider health is restored. Do not claim issuance succeeded. |
| `BLOCKCHAIN_UNAVAILABLE` | 503 | RPC, contract, network, or confirmation is unavailable. | Check authorized health diagnostics and retry deliberately. |
| `TRANSACTION_TIMEOUT` | 504 | Transaction did not confirm within the configured window. | Reconcile transaction state before retrying a mutation. |
| `RATE_LIMIT_EXCEEDED` | 429 | Request threshold exceeded. | Honor `Retry-After` and reduce request frequency. |
| `INTERNAL_ERROR` | 500 | Unexpected internal failure represented safely. | Record the request ID and contact support; do not repeatedly mutate. |
| `DOCUMENTATION_UNAVAILABLE` | 503 | OpenAPI file could not be parsed or read. | Validate `docs/openapi.yaml` and restart the service. |

Additional controlled domain codes may appear. Clients should safely display the message, preserve the request ID for support, and treat unknown codes conservatively.

Retry guidance: validation, authentication, authorization, inactive, locked, duplicate, invalid-input, invalid-file, too-large, invalid-hash, and not-found failures should not be blindly retried. Rate limits may be retried after `Retry-After`. IPFS/blockchain availability and transaction timeouts require health or reconciliation checks before a deliberate retry. Internal errors should be escalated with the request ID.
