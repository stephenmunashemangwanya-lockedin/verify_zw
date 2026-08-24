# Disaster recovery runbook

Prototype objectives are an RPO of 24 hours and RTO of 4 hours. They are targets, not guarantees, and assume trained database/application operators, PostgreSQL client tools, reachable infrastructure, retained keys, RPC access, and IPFS/provider access.

1. Declare the incident, appoint incident commander, database operator, application operator, and security recorder.
2. Decide whether to stop traffic; preserve operational and immutable audit evidence.
3. Identify the newest verified backup that satisfies incident time and integrity requirements.
4. Re-run manifest, checksum, age, and dump-list verification.
5. Restore PostgreSQL into an isolated `_restore_test` target first and compare schema, indexes, constraints, counts, and selected hashes.
6. Restore evidence files only below `restore-test`; never overwrite live paths without a separate reviewed change.
7. Recreate non-secret configuration and load secrets from the approved secret manager.
8. Restore chain ID, contract address, ABI, and deployment metadata; verify bytecode before use.
9. Verify IPFS CIDs through content hashing and an approved gateway/provider.
10. Start the application and check liveness, readiness, metrics, and error logs.
11. Run blockchain reconciliation without blind transaction resubmission.
12. Validate administrator access, scoped user access, issuance controls, and public verification.
13. Review audit continuity and record any unavoidable evidence gaps.
14. Obtain incident commander approval before production cutover.
15. Close the incident only after monitoring stability, then conduct a post-incident review and update tested procedures.
