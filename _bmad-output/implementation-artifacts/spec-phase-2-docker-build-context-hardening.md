---
title: 'Harden Docker build context'
type: 'bugfix'
created: '2026-09-02'
status: 'in-progress'
review_loop_iteration: 0
baseline_commit: '61e09bd6dc9521a43699d821da63735aa01a8aa2'
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-Zimbabwe-Skill-Verification-Platform-2026-08-18/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every Docker image uses the repository root as build context, so Docker traverses local agent/tooling directories before selective Dockerfile copies occur. Historical access failures under `_bmad/`, `.agents/`, or `.claude/` can prevent image builds and stop `docker:test` before tests start.

**Approach:** Reproduce the current failure first, classify it from current evidence, then add only verified non-runtime exclusions to `.dockerignore`, protect them with focused semantic assertions, and validate the isolated Docker test workflow, normal local runtime, database invariants, backend regression, migration verification, and frontend build before one Docker-only commit.

## Boundaries & Constraints

**Always:** Start from clean commit `61e09bd6dc9521a43699d821da63735aa01a8aa2`; capture the pre-fix failure and exact offending path; keep the fix to verified build-context exclusions and focused Docker tests; preserve migrations 000–007, ledger, schema fingerprint `b303d47bf62c304ee26f6904c85e6d87`, PostgreSQL volume, and application behavior; report actual test/service/health results.

**Ask First:** Any failure not caused by build-context packaging; any post-fix Docker/application/test failure requiring changes beyond `.dockerignore` and Docker configuration tests; any database ledger/schema drift; any unrelated tracked modification.

**Never:** Modify backend/frontend functionality, contracts, migrations, Dockerfiles/Compose/package scripts without a newly demonstrated need, environment or secret files; print secrets; run `docker compose down -v`; deploy; start dashboard/UI work; hide required application sources, manifests, configuration templates, or migration files from images.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Current context polluted | Root contains unreadable local tooling | Pre-fix `npm run docker:test` reproduces and identifies path/service before edits | Stop if failure class is unrelated |
| Hardened context | Verified tooling directories exist | Docker excludes exact local-only paths while required sources remain available | Focused test fails on missing/overbroad rules |
| Isolated Docker test | Test Compose builds from root | Builds complete, services start, actual backend tests run, exit 0 | Stop and diagnose any new failure |
| Normal runtime | Local profile starts | Expected services stabilize; backend live/ready and frontend return HTTP 200 | Stop without unrelated repair |
| Database safety | Docker validation completes | Ledger remains 000–007; schema fingerprint and volume remain intact | Stop on any drift |

</frozen-after-approval>

## Code Map

- `.dockerignore:1-24` — existing secret/generated exclusions; missing `_bmad/`, `.agents/`, and `.claude/` despite all being local tooling and Git-ignored.
- `.gitignore:40-42` — independent evidence that the three tooling directories are non-runtime project inputs.
- `docker-compose.yml:23-187` — every development image uses repository root context; runtime dependency order is Postgres/migration/blockchain/deploy/backend/frontend.
- `docker-compose.test.yml:18-30` — isolated blockchain and test-runner builds also use root context.
- `docker/test.Dockerfile:5` — broad `COPY . .` means ignored context contents directly determine the test image payload.
- `Dockerfile:1-27`, `frontend/Dockerfile`, `docker/blockchain.Dockerfile`, `docker/backup.Dockerfile` — required build inputs; read-only unless reproduction disproves the diagnosis.
- `test/dockerConfiguration.test.js:5` — existing semantic ignore-rule test; extend without a new framework.
- `package.json:71-79` — focused `test:docker`, official `docker:test`, and local lifecycle scripts.
- `_bmad-output/implementation-artifacts/deferred-work.md:1` — Phase 2 continuity record.
- `backend/database/migrations/000_initial_schema.sql` through `007_student_account_ownership.sql` — immutable migration chain.

## Tasks & Acceptance

**Execution:**
- [ ] Baseline/reproduction — verify clean branch/HEAD and run `npm run docker:test` before edits; record exit, stage, path, service, and whether tests start.
- [ ] `.dockerignore` — add only confirmed local-tooling exclusions required by reproduction; preserve required context and existing secret/generated rules.
- [ ] `test/dockerConfiguration.test.js` — parse effective rules and assert exact exclusions semantically.
- [ ] Focused/official validation — run Docker configuration tests, `docker:test`, `docker:up`, service inspection, live/ready/frontend HTTP checks, backend tests, migration verification, frontend build, and read-only database safety checks.
- [ ] Review/commit — inspect complete diff, confirm scope/secrets, and commit once as `fix: harden Docker build context` only if every gate passes.

**Acceptance Criteria:**
- Given current root-context builds, when the pre-fix workflow runs, then its actual failure or success is captured before `.dockerignore` changes.
- Given verified local tooling exists, when Docker packages the root context, then those paths are excluded and focused tests enforce the exact rules without excluding required source.
- Given the hardened context, when `npm run docker:test` runs, then builds finish, isolated services start, actual backend tests execute, and the command exits zero.
- Given the local profile starts, when health and frontend endpoints are checked, then each returns HTTP 200 and actual service state is recorded.
- Given Phase 2 completes, when database and Git state are checked, then ledger/schema/volume are preserved and only approved Docker-hardening artifacts are committed.

## Spec Change Log

## Review Triage Log

## Design Notes

The minimum likely fix is three directory rules, not Dockerfile changes: all builds send root context before Dockerfile selection, and the directories are development-agent state rather than runtime inputs. Additional secret patterns may be added only if current inspection proves they are necessary and safe.

## Verification

**Commands:**
- `npm run test:docker` — focused Docker configuration tests pass.
- `npm run docker:test` — image builds, isolated services, and backend tests complete with exit 0.
- `npm run docker:up`; `docker compose --env-file .env.docker ps` — local services reach expected states without volume deletion.
- `curl.exe -i http://localhost:3000/health/live`; `curl.exe -i http://localhost:3000/health/ready`; frontend URL — HTTP 200.
- `npm run test:backend`; `npm run test:migration`; `npm run frontend:build` — all regressions pass.
- Read-only PostgreSQL ledger/schema/count query — exactly 000–007 and unchanged fingerprint/counts.
- `git diff --check`; status/diff inspection — narrow, secret-free Phase 2 changes only.
