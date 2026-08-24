# Staging Rollback

Record the previously healthy backend/frontend image digests before deployment. Prefer application rollback to those exact digests. Migrations must be reviewed for backward compatibility before release; stop if the old application cannot safely use the new schema. Do not automatically reverse or destructively modify the database.

Smart contracts are immutable: application rollback cannot erase a deployment. Retain the prior contract address/config where compatible, otherwise pause issuance and follow the contract governance/recovery process. Restore a verified backup only as a last resort after explicit approval and impact review. After rollback, validate liveness/readiness, authentication, public verification, DB integrity, Redis limiting, IPFS and blockchain reads, then record cause and evidence.
