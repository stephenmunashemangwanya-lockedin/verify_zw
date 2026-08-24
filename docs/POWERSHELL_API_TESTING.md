# PowerShell API testing guide

All variables below exist only in the current PowerShell terminal session. Examples use placeholders; never paste production secrets into shared scripts, shell history, screenshots, or source control. Mutating examples are explicitly marked and should be run individually.

```powershell
Set-Location "C:\path\to\Zimbabwe-Skill-Verification-Platform"
npm start
```

Open a second PowerShell terminal for the requests below.

```powershell
$ApiBase = "http://localhost:3000"
$CredentialId = "<CREDENTIAL_UUID>"
$InstitutionId = "<INSTITUTION_UUID>"
$StudentId = "<STUDENT_UUID>"
$UserId = "<USER_UUID>"
$PublicToken = "<PUBLIC_TOKEN_UUID>"
$CertificateHash = "<SHA256_HEX>"
$PdfPath = "C:\path\to\certificate.pdf"
```

## Health, authentication, and profile

```powershell
Invoke-RestMethod "$ApiBase/health"
$LoginBody = @{ email = "admin@example.org"; password = "<PASSWORD>" } | ConvertTo-Json
$Login = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/auth/login" -ContentType "application/json" -Body $LoginBody
$Token = $Login.token
$Headers = @{ Authorization = "Bearer $Token" }
Invoke-RestMethod "$ApiBase/api/auth/profile" -Headers $Headers
```

The bearer variable is memory-local to this terminal. Clear it with `Remove-Variable Token, Headers` and close the terminal after testing.

## Paginated management APIs

```powershell
Invoke-RestMethod "$ApiBase/api/institutions?page=1&limit=20&search=University&sortBy=name&sortOrder=asc" -Headers $Headers
Invoke-RestMethod "$ApiBase/api/users?page=1&limit=20&role=issuer&sortBy=created_at&sortOrder=desc" -Headers $Headers
Invoke-RestMethod "$ApiBase/api/students?page=1&limit=20&institutionId=$InstitutionId&sortBy=full_name&sortOrder=asc" -Headers $Headers
Invoke-RestMethod "$ApiBase/api/credentials?page=1&limit=20&status=active&sortBy=created_at&sortOrder=desc" -Headers $Headers
Invoke-RestMethod "$ApiBase/api/verification-logs?page=1&limit=20&result=VERIFIED&sortBy=verification_time&sortOrder=desc" -Headers $Headers
Invoke-RestMethod "$ApiBase/api/audit-logs?page=1&limit=20&sortBy=created_at&sortOrder=desc" -Headers $Headers
```

Institution users remain scoped by the backend. Supplying another institution UUID does not bypass authorization.

## Create examples — mutating

```powershell
$Institution = @{ name="Example University"; walletAddress="<EVM_WALLET_ADDRESS>"; email="registry@example.org" } | ConvertTo-Json
Invoke-RestMethod -Method Post "$ApiBase/api/institutions" -Headers $Headers -ContentType "application/json" -Body $Institution

$User = @{ fullName="Example Issuer"; email="issuer@example.org"; role="issuer"; institutionId=$InstitutionId } | ConvertTo-Json
Invoke-RestMethod -Method Post "$ApiBase/api/users" -Headers $Headers -ContentType "application/json" -Body $User

$Student = @{ studentNumber="<STUDENT_NUMBER>"; fullName="Example Student"; email="student@example.org"; programme="Example Programme"; institutionId=$InstitutionId } | ConvertTo-Json
Invoke-RestMethod -Method Post "$ApiBase/api/students" -Headers $Headers -ContentType "application/json" -Body $Student
```

## Credential issuance — mutating

The required file field is `certificate`; only a structurally valid PDF with MIME type `application/pdf` is accepted. The default maximum is 10 MB. `curl.exe` works consistently across Windows PowerShell versions.

```powershell
curl.exe --fail-with-body -X POST "$ApiBase/api/credentials/issue" `
  -H "Authorization: Bearer $Token" `
  -F "certificate=@$PdfPath;type=application/pdf" `
  -F "studentId=$StudentId" -F "institutionId=$InstitutionId" `
  -F "qualification=Example Qualification" -F "issueDate=2026-01-01"
```

Do not report success until the response is `201`. Duplicate hashes normally return `409`; invalid files return `400` or `422`; size limits return `413`; provider failures use a controlled `503`/`504` response and failed-processing state.

## Public verification

```powershell
Invoke-RestMethod "$ApiBase/api/verify/hash/$CertificateHash"
Invoke-RestMethod "$ApiBase/api/verify/credential/$CredentialId"
Invoke-RestMethod "$ApiBase/api/verify/token/$PublicToken" # QR destination
$VerifyForm = @{ certificate = Get-Item -LiteralPath $PdfPath; verifierName="Example Employer"; verifierEmail="verifier@example.org" }
Invoke-RestMethod -Method Post "$ApiBase/api/verify/file" -Form $VerifyForm
curl.exe --fail-with-body -X POST "$ApiBase/api/verify/file" -F "certificate=@$PdfPath;type=application/pdf"
```

The implemented API returns QR verification through the public-token URL; it does not expose a separate QR-image download endpoint. QR metadata is part of credential issuance/detail responses.

## Revocation and generated certificate — mutating

```powershell
$Reason = @{ reason="Credential revoked for an approved administrative reason." } | ConvertTo-Json
Invoke-RestMethod -Method Patch "$ApiBase/api/credentials/$CredentialId/revoke" -Headers $Headers -ContentType "application/json" -Body $Reason
$Presentation = Invoke-RestMethod -Method Post "$ApiBase/api/credentials/$CredentialId/generate-pdf" -Headers $Headers
$Presentation.pdf
```

The generated endpoint returns presentation-certificate metadata. There is currently no separate authenticated binary-download route, so documentation does not invent one.

## Dashboard and errors

```powershell
Invoke-RestMethod "$ApiBase/api/dashboard/summary" -Headers $Headers
Invoke-RestMethod "$ApiBase/api/dashboard/credential-trends?period=30days&groupBy=day" -Headers $Headers
Invoke-RestMethod "$ApiBase/api/dashboard/verification-trends?period=30days&groupBy=week" -Headers $Headers

try { Invoke-RestMethod "$ApiBase/api/credentials?page=0" -Headers $Headers } catch {
  $_.Exception.Response.StatusCode.value__
  $_.ErrorDetails.Message | ConvertFrom-Json
}
try { Invoke-RestMethod "$ApiBase/api/users" } catch { $_.Exception.Response.StatusCode.value__ } # expected 401
```
