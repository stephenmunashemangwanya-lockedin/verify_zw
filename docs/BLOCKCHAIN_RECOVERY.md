# Blockchain recovery

Recover the chain ID and contract address from reviewed deployment metadata and the deployment transaction, and use `backend/blockchain/CredentialRegistry.abi.json` as the deployment-safe ABI. Verify deployed bytecode with `scripts/verifyDeployment.js` before enabling mutations.

After backend redeployment or RPC changes, confirm chain ID, bytecode, pause state, signer address, authorization, and balance. A local-chain restart normally invalidates local deployment addresses and requires a new isolated deployment. Network outages must not trigger blind resubmission. Signer rotation requires secure custody procedures and on-chain role changes; never store keys in recovery records.

For a confirmed transaction followed by database failure, run the reconciliation script and compare contract events/proof with pending records. Event reconstruction is limited by provider retention, reorgs, start block knowledge, and off-chain student/institution context.
