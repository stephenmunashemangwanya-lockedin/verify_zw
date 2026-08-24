# Staging IPFS

The application supports a configurable HTTPS provider API, bearer token, HTTPS gateway, bounded timeout/retries, CIDv0/v1 validation, controlled failures and the existing certificate upload limit. Provider credentials stay in the secret manager.

Operator checklist: create a staging provider project/token with only pin/list/unpin permissions; provide `IPFS_PROVIDER_API_URL`, `PINATA_JWT`, `PINATA_GATEWAY`; set quota and alerts; confirm data residency/retention; authorize a non-sensitive smoke file; verify returned CID and gateway retrieval; document provider incident/revocation steps. No external upload is authorized by Phase 13.
