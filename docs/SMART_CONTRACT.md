# CredentialRegistry smart contract

`contracts/CredentialRegistry.sol` uses OpenZeppelin `AccessControl` and
`Pausable`. Solidity compiler 0.8.24 is configured with optimizer runs of 200.

Administrative functions authorise and deactivate institution wallets, pause,
and unpause. Institution functions issue and revoke credential hashes. Public
views report authorisation, existence, and credential state. Custom errors
reject zero values, duplicate proofs, unknown/repeated revocation, incorrect
issuer revocation, and invalid role use. Events provide institution, issuance,
and revocation audit evidence without personal data.

Run `npm run test:contract`. Tests cover deployment, roles, institution
management, issuance, duplicate prevention, revocation, pause behavior,
events, timestamps, and verification states.
