# IPFS integration

## Provider setup

The current supported provider is Pinata. Create a Pinata JWT with only the
pinning permissions needed by this application, store it in `.env`, and never
place it in source control, API responses, URLs, or logs. `.env.example`
contains safe placeholders for every required setting.

Configuration is loaded lazily. Missing or invalid IPFS configuration causes a
controlled `503` during credential issuance while unrelated APIs remain able
to start. Only HTTPS gateway URLs are accepted.

## Issuance workflow

`POST /api/credentials/issue` remains authenticated and limited to
`super_admin`, `institution_admin`, and `issuer` roles. The workflow:

1. Validates metadata, user scope, student ownership, and institution status.
2. Validates PDF extension, MIME type, size, and the `%PDF` byte signature.
3. Calculates SHA-256 from the uploaded bytes and rejects duplicate hashes.
4. Creates a credential in `processing` status with an unpredictable public
   token.
5. Sends the actual PDF bytes and limited metadata to Pinata.
6. Validates the returned CID and confirms it appears in the Pinata pin list.
7. Stores only the CID in `ipfs_cid`, records an audit event, and changes the
   credential to `pending`.
8. Removes the temporary local PDF.

`pending` is intentional: an IPFS pin proves content-addressed storage, but the
credential must not become `active` until the later blockchain transaction is
confirmed and its proof is stored successfully.

If processing fails after record creation, the record changes to `failed`, a
controlled internal error code is stored, failure audit events are attempted,
and the temporary file is removed. Provider response bodies and JWTs are not
returned to clients.

## CID and gateway verification

The service validates CIDv0 and CIDv1 structure, multibase encoding, version,
codec, and multihash length. It rejects whitespace, unsupported encodings, and
suspicious lengths. To verify a successfully issued credential manually:

1. Read its `ipfs_cid` from the safe API response or PostgreSQL.
2. Confirm the value contains no slash or local filesystem prefix.
3. Open `${PINATA_GATEWAY}/${ipfs_cid}` in a browser or request it with an HTTP
   client.
4. Confirm the response is the same PDF and recalculate SHA-256 if integrity
   evidence is required.

## Retry and error behavior

Network errors, timeouts, HTTP 408/429, and provider 5xx responses are retried
with bounded exponential delay. Invalid requests and authentication failures
are not retried. Client responses use controlled 502/503 messages without raw
Pinata bodies or stack traces.

## Tests

Run:

```powershell
npm run test:ipfs
```

The suite uses Node's built-in test runner and mocked HTTP/model dependencies.
It covers configuration, CID validation, provider authentication, retry and
timeout behavior, PDF validation, domain checks, duplicate detection, cleanup,
pending/failed persistence, audit events, route protection, and router loading.

A real manual upload is separate from automated testing and requires a valid
`PINATA_JWT`. Never substitute a fabricated CID when credentials are absent.
