# IPFS recovery

An IPFS CID is content-addressed evidence: downloaded bytes must reproduce the expected CID/hash. A gateway outage does not invalidate the CID; change the configured gateway only after validation. During a Pinata outage, pause affected issuance or retain the pending local evidence under approved custody—never claim it was pinned.

If a CID remains in PostgreSQL, verify it through another trusted gateway/provider and re-pin the same content. If local bytes remain but the CID is missing, hash and pin them through a controlled reconciliation process; do not silently replace the CID with a local path. If a CID exists without a database record, reconstruct only with institution/student evidence and audit approval. Provider migration must preserve and validate every CID before decommissioning the old provider.
