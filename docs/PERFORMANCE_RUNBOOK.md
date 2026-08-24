# Performance runbook

## Safety prerequisites

Set `TEST_DB_*` credentials in `.env`. `TEST_DB_NAME` must end exactly in `_test` and differ from `DB_NAME` and `PRODUCTION_DB_NAME`. Never run this against production, real users, Pinata, or an external RPC. The script enforces these checks, sets `NODE_ENV=test`, disables external blockchain/IPFS, creates synthetic fixtures, and truncates only its guarded test database in `finally`.

## Commands

```powershell
npm run performance:smoke
npm run performance:load
```

`performance:smoke` uses 1,000 records, clients 1/10/25, sub-second scenarios, and a 15-second sustained check. `performance:load` uses 10,000 records, clients 1/10/25/50/100, three-second scenarios, and a five-minute sustained check. Heavy load is intentionally not part of `npm test`.

Results are written to `test-results/performance/`. Keep `load-sustained-results.json` when comparing a short diagnostic rerun. `PERFORMANCE_SUSTAIN_MS` may shorten a diagnostic run, but a release run must use the default five minutes.

After any interruption, confirm all six table counts in `skill_verification_test` are zero. Do not manually truncate another database. Review status distributions, timeouts, connection errors, pool waiting, RSS/heap deltas, and percentile regression before accepting results.

## Release interpretation

Run on staging-class hardware before launch. Do not silently increase `DB_POOL_MAX`: budget total database connections as `instance count × pool max`, leave PostgreSQL headroom for administration/migrations, and repeat the profile after every sizing change.

