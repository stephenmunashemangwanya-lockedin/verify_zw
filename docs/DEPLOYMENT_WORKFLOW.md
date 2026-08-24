# Deployment workflow preparation

Stage 27 does not deploy. `Deployment Preparation` is manual-only and defaults to dry-run. Select `staging` or `production`, an immutable `sha-*` or `vX.Y.Z` image tag, an immutable rollback tag, confirm a verified backup, and confirm that the migration plan is reviewed.

The selected GitHub environment must require reviewer approval. The job validates image-tag shape, backup and migration prerequisites, liveness/readiness/frontend health-check definitions, and rollback preparation. It emits a short non-secret preparation report and deliberately fails if `dry_run` is disabled. A future Stage 28 implementation must add a real target, credential retrieval from the protected environment, image-digest verification, migration execution, health monitoring, rollback execution, and truthful outcome reporting.

Rollback preparation means preserving the prior immutable image tag, confirming database backup compatibility, and documenting the reverse traffic switch. Database migrations are not automatically reversed. Never claim success from this preparation workflow.
