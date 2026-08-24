# Staging Blockchain

Use an explicitly selected public EVM testnet (currently supported: Sepolia), HTTPS RPC, expected chain ID, dedicated newly generated wallet, confirmations, transaction timeout and explorer URL. Chain 31337, localhost/Hardhat networks, zero addresses and local Hardhat keys are rejected in staging.

Operator must supply a protected RPC endpoint, funded testnet wallet private key through runtime secret injection, contract strategy (new deployment or approved existing address), and confirmation policy. Deploy only through an explicit operator-authorized command. Record network, chain ID, contract address, transaction hash, deployer public address, compiler/artifact hash and application image digest as release metadata. Never commit the key or reuse it in production.
