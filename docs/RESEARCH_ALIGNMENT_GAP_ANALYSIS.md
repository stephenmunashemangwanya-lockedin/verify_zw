# Research alignment gap analysis

Date: 2026-09-21. Inspected revision: `d3144e85453bf1efcc69e78026b5ed787684fb87`.
Branch: `feature/certificate-security`. This is a pre-implementation inspection, not a Chapter 4 readiness declaration.

The user's attached methodology brief is authoritative. Preserve the architecture, Sepolia registry `0x51B25111Aba69C0cc6759516e11B11d8132ddded`, chain 11155111, applied migrations 000–011, existing data, and unrelated untracked files.

| Area | Classification | Evidence and remaining work |
|---|---|---|
| A. Credential-holder/student login ownership | PARTIALLY COMPLETE | Migration 007, `studentController.linkAccount`, `studentModel.linkStudentToUser`, credential `/me`, detail/PDF ownership and MyCredentials exist. Add account-linking UI, complete direct-route guards, restrict dashboard aggregates, and reciprocal login/detail/download tests. Named A/B accounts have not been inspected or provisioned. |
| B. Regulator/accreditation authority | MISSING | Accreditation CRUD/status services exist, but no dedicated regulator role. Add forward migration 012, institution-independent role provisioning, accreditation-only authority/history, and negative issuer/wallet tests. |
| C. Credential issuance failure state | PARTIALLY COMPLETE | Issuance uses FAILED and preserves stored evidence; existing IPFS tests cover anchor failure. Retain FAILED. Add failure-to-public-verification trials and correct misleading generic IPFS-failure audit labeling. |
| D. Correction/supersession UI | PARTIALLY COMPLETE | Existing PATCH supersession endpoint validates active records, same student/institution, distinct IDs and authorization. No normal UI. Add candidate selection, reason, confirmation, refresh, relationships and frontend tests. |
| E. Lifecycle verification rules | PARTIALLY COMPLETE | Existing revoked/superseded/failed/pending classification and lifecycle guards. Verification can accept legacy proofs without signature/freshness, and missing accreditation metadata. Signed payload is not bound to the row metadata used for accreditation/status. Activation/failure model updates need state guards against races. |
| F. Status freshness | PARTIALLY COMPLETE | Signed artefacts, default 24-hour issuance window and injected clock already exist. Verification trusts arbitrary signed validUntil; enforce a 24-hour maximum age and validate artefact schema, index and issuer/reference binding. |
| G. No-anchor experimental comparator | MISSING | Verification unconditionally reads blockchain. Add an internal evaluation adapter sharing the production evaluator; public entry points must always enforce the full rule. |
| H. Performance instrumentation | PARTIALLY COMPLETE | `backend/utils/performance.js`, metrics and `scripts/performance/runPerformance.js` exist. Existing harness disables blockchain and aggregates timing. Add paired per-request full/no-anchor records, RPC duration, request/run IDs, concurrency, timestamps, errors and summary exports. |
| I. Deterministic synthetic dataset generation | MISSING | Existing synthetic fixtures do not implement seed 20260905, the required distributions or 50 correction pairs. Add dedicated generator with count and repeatability tests. |
| J. Security/lifecycle evaluation harness | PARTIALLY COMPLETE | Extensive unit/route tests and existing performance/recovery scripts are reusable. No unified methodology scenario runner or evidence export exists. |
| K. Failure injection | PARTIALLY COMPLETE | Mocked issuance tests inject anchor failures. Extend through isolated evaluation dependencies and ten repeatable trials, with no public switches. |
| L. Issuer-availability simulation | PARTIALLY COMPLETE | Verification reads cached database status without calling the issuer signer. Missing controlled publisher-available/unavailable and fresh/stale experiments and exports. Keep the API running. |
| M. Privacy evidence extraction | PARTIALLY COMPLETE | Contract stores commitments, wallets and technical lifecycle metadata, not holder profile fields. Missing synthetic ABI/storage/off-chain evidence exporter. A hash is not proof of anonymity. |
| N. Terminology/UI alignment | PARTIALLY COMPLETE | Neutralize two institution-only login labels, clarify PDF-only UNKNOWN versus claimed-PDF TAMPERED, expose lifecycle relationships and role/state gating. Preserve QR, token tools, branding and qrcode. |
| O. Complete regression status | PARTIALLY COMPLETE | Baseline backend 551 passed; contract 36 passed after sandbox retry; migration bootstrap 11 passed (included in backend total); live schema verification passed; docs validation passed for 65 operations. Frontend baseline/build results recorded below when complete. No final regression or research freeze yet. |

## Priority findings

1. `verificationService.js` currently permits VERIFIED without every required trust condition. Require explicit valid signature, bound payload/schema, matching anchor, explicitly active/fresh status and valid accreditation at award date. Legacy records remain viewable but cannot claim complete research trust without evidence.
2. `statusListService.js` defaults missing revoked indices to an empty list and can return an indeterminate index without failing freshness. Malformed signed status must fail closed; exact W3C Bitstring compliance is not established.
3. `/dashboard/summary` allows students to obtain institution-wide aggregates, and potentially global aggregates when institution scope is absent. Frontend route guards also leave issuance/list routes accessible to students, although backend issuance rejects them.
4. `credentialModel.activateCredential` and `markCredentialFailed` lack lifecycle-state predicates. Reconciliation uses certificate_hash even for structured proofs; inspect and test the structured commitment recovery path before changing it.

## Implementation boundaries and reuse

- Use the existing account-linking endpoint; never create duplicate student records. Provision or link the named synthetic accounts only after checking exact existing identities. Do not commit passwords.
- Widen the role constraint through additive 012 only. Regulator manages simulated accreditation; super admin retains technical/account administration. Accreditation amendments must retain history and remain separate from general audit access.
- Retain FAILED as the canonical issuance failure state because the schema and existing tests already support it. Do not introduce PENDING_ANCHOR merely to match prose.
- Supersession uses the existing endpoint with `{ replacementCredentialId, reason }`; reason is 5–1000 characters. Fetch active candidates using studentId/institutionId filters and pagination. Preserve all original proofs/history.
- Keep ordinary API timeout 20000 ms and existing issuance/revocation timeout 120000 ms. Add bounded timeout to supersession and institution authorization.
- Reuse existing injected verification time. Keep no-anchor/failure/issuer controls exclusively in research tooling, never request bodies, query parameters or public UI.
- Generate 1000 base records: 800 ordinary ACTIVE, 100 REVOKED, 50 SUPERSEDED originals and 50 ACTIVE replacements (850 active in total). Generate 200 derived cases in the exact requested 40/30/30/30/20/20/10/10/10 distribution, five institutions and ten programme codes.
- Performance smoke must use genuine measured durations with explicit dependency/environment labels. Mock timings are not Sepolia performance evidence. Do not run the full experiment before freeze.
- Recovery tooling captures before/after state without stopping services or deleting volumes automatically. Reset may affect only explicitly identified dedicated synthetic fixtures.

## Baseline and scope limits

Inspection and baseline tests do not prove that the live named holder accounts exist or can log in. The full research evaluation harness is not implemented. No production application files or migrations were modified during this analysis. No secrets were printed. Existing untracked materials were left intact.

Frontend sandbox execution initially failed because esbuild could not read an ancestor directory. Retried outside the sandbox. Contract sandbox execution timed out during the deployment hook; isolated retry passed all 36 tests without code changes.

Baseline completed 2026-09-22: frontend production build passed. Single-worker frontend regression produced 88 passed and 3 failed (91 tests): two literal source-string assertions in `contracts.test.ts`, and one lazy-route timeout. The independent lazy-route rerun passed all 5 tests without changes. The two source assertions expect formatting/text that no longer matches Management.tsx; replacement coverage must still prove the intended role selector and controlled provisioning-error behavior.

A read-only query of the configured database found no students with the two requested student numbers or synthetic email addresses. This does not establish their absence in another staging database. Provisioning must check identities in its actual target and avoid duplicates; no accounts were created during inspection.

## Dissertation wording to align after implementation

- FAILED rather than PENDING_ANCHOR for unsuccessful issuance.
- W3C-compatible signed status artefact/status-list prototype; not proven exact Bitstring Status List conformance.
- Database distinguishes SUPERSEDED; the custom signed revoked-index list represents non-current status and does not independently encode the replacement relationship.
- PDF-only unmatched input is UNKNOWN; a modified PDF presented against a known credential is TAMPERED.
- No-anchor is an internal comparator, never the production definition of VALID.
- Cached issuer-status availability is bounded by freshness, not availability of the whole API.
- Separate synthetic correctness evidence, measured smoke timing and later frozen-revision research results.
