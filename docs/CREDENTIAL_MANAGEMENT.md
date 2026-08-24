# Credential management

## Lifecycle and authority

Issuance accepts one PDF and links it permanently to the selected student and institution. The API validates institution scope and student membership before processing. It hashes the original bytes, pins those bytes to IPFS, confirms the registry transaction, and only then marks the record `active`. Intermediate or terminal states are `processing`, `pending`, `failed`, and `revoked`. A failed provider or persistence step returns a controlled response and retains the evidence required for reconciliation.

The uploaded PDF is the authoritative credential. Its SHA-256 certificate hash, IPFS CID, blockchain transaction, network, contract address, block number, public verification token, and issuance metadata are evidence. These values are not replaced when a presentation PDF is generated.

## Issuance selectors

The browser displays human-readable active institutions and students as `full name — student number`, but submits UUIDs to the existing API. A super administrator selects the institution first. Institution administrators and issuers are fixed to their current institution. Student lookup uses bounded server search and institution scoping; the backend remains authoritative even if a browser request is modified.

## Presentation PDFs

`POST /api/credentials/:id/generate-pdf` creates or refreshes a deterministic presentation copy for an active or revoked credential. It includes the stable public verification URL and displays revocation state when applicable. It does not alter the original upload, certificate hash, IPFS CID, or blockchain proof.

`GET /api/credentials/:id/pdf` is authenticated and available to credential readers, subject to institution scope. It resolves the fixed `credential-<uuid>.pdf` name beneath the trusted generated-output directory and streams it as `application/pdf` with a safe attachment filename. It never accepts a client path and never returns an absolute path. An unknown, unauthorized, ineligible, or missing artifact produces a controlled `403` or `404`. Successful downloads are audited.

Browser downloads use the existing credentialed API client and an object URL. Authentication tokens are not placed in URLs or browser storage.

## Detail, evidence, and revocation

Credential detail displays the human-readable student and institution, qualification, issue date, status, original certificate hash and IPFS evidence, safe blockchain metadata, QR/public verification evidence, and revocation reason/time when present. External evidence links are derived only from configured trusted HTTPS bases and use safe new-tab attributes.

Only super administrators and institution administrators can revoke. Institution administrators remain limited to their institution. The UI requires explicit confirmation and a reason, while the API revalidates role, scope, state, and input. Revocation becomes final only after blockchain confirmation; the credential remains publicly verifiable as revoked and its prior evidence is preserved.

## Validation

Run the focused backend lifecycle suite with:

```powershell
node --test --test-concurrency=1 test/credentialPhase7.test.js test/generatedPdf.test.js test/credentialRevocation.test.js test/qrSupport.test.js test/publicVerification.test.js
```

Run the credential UI suite from `frontend/` with `npm test -- --run src/test/credentialManagement.test.tsx`. Validate the API contract with `npm run test:docs`.
