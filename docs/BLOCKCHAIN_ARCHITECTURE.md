# Blockchain architecture

The EVM registry is an integrity anchor, not an application database. It maps
the original certificate SHA-256 digest (`bytes32`) to an issuer wallet,
issuance timestamp, existence flag, revocation flag, and revocation timestamp.
PDF bytes, IPFS CIDs, student data, qualifications, institution data, and UUIDs
remain off-chain in IPFS/PostgreSQL. This minimizes personal-data exposure and
gas usage while retaining immutable proof.

`DEFAULT_ADMIN_ROLE` authorises/deactivates institution wallets and controls
the emergency pause. `INSTITUTION_ROLE` issues proofs; only the original,
currently authorised issuer can revoke its proof. Read-only verification stays
available while paused.

The certified value is the SHA-256 digest calculated directly from the final
PDF bytes. The backend prefixes that 64-character hexadecimal digest with
`0x`; it does not hash the text representation again.
