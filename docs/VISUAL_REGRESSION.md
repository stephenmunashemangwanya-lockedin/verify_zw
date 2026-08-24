# Visual regression testing

Phase 10 uses Playwright's `expect(page).toHaveScreenshot()` with deterministic synthetic API fixtures. Baselines live beside the specification in `frontend/e2e/visual-regression.spec.ts-snapshots/`. They contain no real personal data, credentials, secrets, tokens, or production hashes.

## Commands

Build the frontend first, then run the normal comparison gate:

```powershell
npm --prefix frontend run build
npm --prefix frontend run test:visual
```

Normal tests never update screenshots and fail on unexpected differences.

After intentionally reviewing an approved UI or accessibility correction, update explicitly:

```powershell
npm --prefix frontend run test:visual:update
```

Review every changed PNG before committing it. CI and normal local testing must never use the update command.

## Baseline matrix

Public baselines:

- Home: 1440×900, 768×1024, and 375×667
- Login: 1280×720
- Forgot password, reset password, and public verification: 1440×900

Authenticated 1440×900 baselines:

- Dashboard
- Institutions
- Users and user detail
- Students and student detail
- Credentials and credential detail
- Verification logs
- Audit logs
- Profile

This produces 18 approved screenshots. Separate browser checks cover 320×568, 1024×768, and 1280×720 reflow/overflow behavior.

## Determinism and diff policy

- Chromium's desktop project is the canonical baseline platform.
- API calls are intercepted with fixed synthetic records, dates, IDs, hashes, and counts.
- Screenshots wait for the route's existing H1, disable animations, hide the caret, and capture the full page.
- The maximum differing-pixel ratio is 0.5%. This small tolerance addresses rendering noise without accepting layout changes.
- Dynamic timestamps are fixture-controlled; no broad masking or high threshold is used.
- Dashboard chart fixtures intentionally use stable empty-series states while summary figures remain deterministic.

Unexpected differences require inspection of Playwright's expected, actual, and diff artifacts. Do not approve a change solely to make CI green. Confirm the change is intended, accessible, responsive, and consistent with the established green/gold/cream identity before running the explicit update command.

Platform-rendering differences can require a separately reviewed Linux baseline in CI. The current committed baselines are Windows Chromium baselines generated in the project environment; they should not be silently reused as approval for another rendering platform.
