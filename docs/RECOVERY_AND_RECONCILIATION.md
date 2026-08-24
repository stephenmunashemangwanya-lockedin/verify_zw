# Recovery and reconciliation

Blockchain transactions cannot be rolled back. If IPFS succeeds and blockchain
submission fails, the CID is retained and the credential becomes `failed`. If
a transaction is broadcast but confirmation times out, the service checks its
receipt and on-chain proof before deciding whether it succeeded.

If on-chain issuance succeeds but PostgreSQL activation fails, the controller
records a reconciliation-required audit event where the database is available
and leaves the record failed. Run:

```powershell
npm run reconcile:blockchain
```

The script selects processing, pending, and failed credentials with CIDs,
queries the proof and actual `CredentialIssued` event, recovers the real
transaction hash/block number, updates PostgreSQL, and writes attempted,
succeeded, or failed audit events. It never resubmits issuance blindly.

Back up deployment records and the generated ABI. Reconciliation cannot infer
a transaction if the configured node cannot query historical logs. Provider
log-retention and reorg policies remain operational risks, especially on
public test networks.
