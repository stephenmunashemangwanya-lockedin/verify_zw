# Blockchain deployment

## Local

1. Run `npm run node:blockchain` in one terminal.
2. Configure the localhost RPC, chain ID `31337`, a Hardhat development key,
   and `BLOCKCHAIN_NETWORK=localhost` in a temporary local environment.
3. Run `npx hardhat run scripts/deployCredentialRegistry.js --network localhost`.
4. Copy the generated contract address into local `CONTRACT_ADDRESS`.
5. Run `node scripts/verifyDeployment.js`.

The deployment script checks chain ID, deployer balance, receipt, and deployed
bytecode. It records address, transaction, block, chain, timestamp, and
deployer under `deployments/<network>/CredentialRegistry.json`. It refuses to
overwrite a record unless `FORCE_DEPLOYMENT=true` is explicitly supplied.

## Sepolia

Set `BLOCKCHAIN_NETWORK=sepolia`, chain ID `11155111`, an HTTPS Sepolia RPC,
funded deployer key, confirmation count, and explorer URL. Confirm the selected
wallet and balance before deployment. Never paste the private key into a
command, source file, deployment record, or report. After deployment, authorise
an active institution wallet through the super-admin endpoint or
`INSTITUTION_ID=<uuid> node scripts/authoriseInstitution.js`.

Gas is paid for deployment, institution role changes, issuance, and revocation.
Read-only verification consumes no transaction gas.
