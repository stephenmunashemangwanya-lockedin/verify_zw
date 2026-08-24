require("dotenv").config({ quiet: true });
require("@nomicfoundation/hardhat-toolbox");

const configuredNetworks = {};
if (process.env.BLOCKCHAIN_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY) {
  configuredNetworks.sepolia = {
    url: process.env.BLOCKCHAIN_RPC_URL,
    chainId: Number(process.env.BLOCKCHAIN_CHAIN_ID || 11155111),
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
  };
}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545", chainId: 31337 },
    ...configuredNetworks,
  },
  paths: {
    sources: "./contracts",
    tests: "./test/contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
