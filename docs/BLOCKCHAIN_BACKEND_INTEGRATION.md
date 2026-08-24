# Backend blockchain integration

`backend/config/blockchain.js` lazily validates the selected network, RPC URL,
chain ID, contract address, signer key, confirmations, timeouts, retries, and
explorer URL. Local HTTP is allowed only for localhost; external RPC and
explorer URLs require HTTPS. Missing configuration does not prevent unrelated
routes from starting, but blockchain operations fail safely.

`backend/services/blockchainService.js` loads the ABI generated from the
Hardhat artifact. It validates network and bytecode, wallet/hash formats,
contract pause and institution authorisation, confirms receipts, and returns
safe structured transaction metadata. Raw keys and RPC errors are never added
to API responses.

Issuance transitions `processing → pending` after IPFS, then `active` only
after a successful blockchain receipt and PostgreSQL update. Stored metadata
includes transaction hash, block number, configured network, and contract
address. A blockchain failure retains the valid IPFS CID and marks the record
`failed`.

Super-admin routes:

- `POST /api/institutions/:id/blockchain/authorise`
- `POST /api/institutions/:id/blockchain/deactivate`

The configured signer must match the institution wallet for credential
issuance. A single backend signer therefore supports only its corresponding
institution; multi-institution key custody requires a future secure signer or
HSM integration.
