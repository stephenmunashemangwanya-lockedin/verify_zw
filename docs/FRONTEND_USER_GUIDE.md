# VerifyZW frontend user guide

## Public verification

Open `/verify` and choose certificate hash, credential ID, public token, or PDF. PDF files are checked for type and a 10 MB client limit before upload. Results use controlled states: VERIFIED, REVOKED, UNKNOWN, PENDING, FAILED, or SYSTEM INCONSISTENCY. A QR link opens the public-token flow directly. Provider errors and internal stack traces are never displayed.

Public credential verification requires no account. Account self-registration is disabled; authorised administrators provision institution users. In user creation, super administrators select an active institution while institution administrators are fixed to their own institution and can select only issuer or verifier roles.

Browser sign-in uses a secure HttpOnly session cookie. The frontend does not store or display authentication tokens. Refreshing the page reloads the current profile from the API; expired sessions return to the login flow. Accounts marked for a password change can access only profile, logout, and the password-change workflow until completion.

## Institution workspace

Sign in at `/login`. The navigation adapts to the current backend-confirmed role. Lists provide server-side search, status filtering, sorting, and pagination. Empty, loading, permission, throttling, and error states remain explicit. Creation screens submit to the existing institution, user, student, and multipart credential APIs.

Credential issuance may include validation, upload, hashing, IPFS, and blockchain confirmation time. Keep the page open until the API reports success or failure; the UI never predicts success. Revocation requires explicit confirmation and remains subject to backend role checks.

The credential form uses institution and student names while submitting their internal IDs. Super administrators first select an active institution; institution users are fixed to their own institution. Student search is bounded and scoped to that institution. Credential detail shows the student, institution, lifecycle status, original certificate hash/IPFS evidence, blockchain transaction metadata, public QR verification, and revocation evidence. **Generate PDF** creates or refreshes a presentation copy; **Download presentation PDF** downloads that generated copy through the authenticated API. It is not the authoritative uploaded certificate, and a missing generated copy produces a controlled error instead of exposing a storage path.

Student names in the Students list open a detail page with current identity,
institution name, and related-credential count. Authorized roles can edit the
student number, name, optional email, and programme. Super administrators use an
active-institution selector for creation and credential-free reassignment;
institution roles remain fixed to their own institution and never enter raw IDs.

Use Profile to inspect the current account and change the password. Signing out calls the backend audit endpoint and clears the browser session even if that call is unavailable. A `401` also clears stale session state automatically.

## Development

1. Run `npm install` in `frontend/`.
2. Copy `.env.example` to `.env.local` and set only public origins.
3. Start the backend on port 3000.
4. Run `npm run dev` in `frontend/` and open `http://localhost:5173`.

For release verification, run `npm run lint`, `npm run test`, and `npm run build`
in `frontend/`. From the repository root, use `npm run test:e2e:frontend` and
`npm run test:accessibility`. Install the required browser once with
`npx playwright install chromium` from `frontend/`.
Administrators open **Users**, select a user's name, and use the detail page to
edit identity or perform authorized account actions. Sensitive actions require a
confirmation dialog and show controlled API errors. Super administrators see
all four role choices and active-institution reassignment; institution
administrators see only issuer and verifier choices and no reassignment control.
Locked accounts show an Unlock action. Password reset sends instructions through
the configured delivery channel and never displays a password or token.
