# curl API testing guide

Use placeholders only and keep tokens out of committed shell scripts. Linux/macOS examples use `curl`; in PowerShell call `curl.exe` to avoid aliases on older releases.

```bash
BASE_URL='http://localhost:3000'
TOKEN='<BEARER_TOKEN>'
CREDENTIAL_ID='<CREDENTIAL_UUID>'
INSTITUTION_ID='<INSTITUTION_UUID>'
STUDENT_ID='<STUDENT_UUID>'
PUBLIC_TOKEN='<PUBLIC_TOKEN_UUID>'
CERTIFICATE_HASH='<SHA256_HEX>'
PDF_PATH='/absolute/path/to/certificate.pdf'
```

## Health, login, and profile

```bash
curl --fail-with-body "$BASE_URL/health"
curl --fail-with-body -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
  --data '{"email":"admin@example.org","password":"<PASSWORD>"}'
curl --fail-with-body "$BASE_URL/api/auth/profile" -H "Authorization: Bearer $TOKEN"
```

Capture a token safely with `jq` where available, without printing it:

```bash
TOKEN="$(curl -sS -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' --data '{"email":"admin@example.org","password":"<PASSWORD>"}' | jq -r '.token')"
```

## Listings, filters, and pagination

```bash
curl -G "$BASE_URL/api/institutions" -H "Authorization: Bearer $TOKEN" --data-urlencode page=1 --data-urlencode limit=20 --data-urlencode search=University --data-urlencode sortBy=name --data-urlencode sortOrder=asc
curl -G "$BASE_URL/api/users" -H "Authorization: Bearer $TOKEN" --data-urlencode page=1 --data-urlencode role=issuer
curl -G "$BASE_URL/api/students" -H "Authorization: Bearer $TOKEN" --data-urlencode institutionId="$INSTITUTION_ID"
curl -G "$BASE_URL/api/credentials" -H "Authorization: Bearer $TOKEN" --data-urlencode status=active
curl -G "$BASE_URL/api/verification-logs" -H "Authorization: Bearer $TOKEN" --data-urlencode result=VERIFIED
curl -G "$BASE_URL/api/audit-logs" -H "Authorization: Bearer $TOKEN" --data-urlencode sortBy=created_at --data-urlencode sortOrder=desc
```

## Multipart PDF operations

The field name is exactly `certificate`. Do not manually add a multipart boundary; `curl -F` generates it. Files must be PDF and are limited to the configured size, 10 MB by default.

```bash
curl --fail-with-body -X POST "$BASE_URL/api/credentials/issue" -H "Authorization: Bearer $TOKEN" \
  -F "certificate=@$PDF_PATH;type=application/pdf" -F "studentId=$STUDENT_ID" -F "institutionId=$INSTITUTION_ID" \
  -F 'qualification=Example Qualification' -F 'issueDate=2026-01-01'

curl --fail-with-body -X POST "$BASE_URL/api/verify/file" \
  -F "certificate=@$PDF_PATH;type=application/pdf" -F 'verifierName=Example Employer' -F 'verifierEmail=verifier@example.org'
```

## Public verification, revocation, and presentation PDF

```bash
curl "$BASE_URL/api/verify/hash/$CERTIFICATE_HASH"
curl "$BASE_URL/api/verify/credential/$CREDENTIAL_ID"
curl "$BASE_URL/api/verify/token/$PUBLIC_TOKEN"
curl -X PATCH "$BASE_URL/api/credentials/$CREDENTIAL_ID/revoke" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data '{"reason":"Credential revoked for an approved administrative reason."}'
curl -X POST "$BASE_URL/api/credentials/$CREDENTIAL_ID/generate-pdf" -H "Authorization: Bearer $TOKEN"
```

The token URL is the QR destination. No separate QR binary route or generated-PDF binary download route currently exists.

## Dashboard and controlled errors

```bash
curl "$BASE_URL/api/dashboard/summary" -H "Authorization: Bearer $TOKEN"
curl -G "$BASE_URL/api/dashboard/credential-trends" -H "Authorization: Bearer $TOKEN" --data-urlencode period=30days --data-urlencode groupBy=day
curl -i "$BASE_URL/api/credentials?page=0" -H "Authorization: Bearer $TOKEN"  # 400 validation response
curl -i "$BASE_URL/api/users" # 401 authentication response
```
