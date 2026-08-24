# Flaky test policy

A flaky test is one that changes result without a relevant code, fixture, or dependency change. Record its suite, date, environment, seed, failure signature, and rerun result in the release report.

- Do not delete, skip, or add unlimited retries to hide instability.
- Unit, API, contract, and coverage tests use zero retries.
- Browser tests may retry once in CI only for known browser/network startup transients.
- Use deterministic fake UUIDs, hashes, clocks, and local Hardhat state.
- Prefer readiness probes and bounded condition waits; avoid arbitrary sleeps.
- Preserve Playwright trace and screenshot only on failure.
- Quarantine requires an owner, issue, reason, and removal date; quarantined critical-path tests block release.

No flaky tests were observed in the Stage 23 non-browser suites. Browser flakiness could not be assessed because the browser binary was unavailable.
