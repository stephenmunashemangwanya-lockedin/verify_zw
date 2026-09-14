const { Contract, Wallet, getAddress } = require("ethers");
const { BlockchainConfigurationError } = require("./blockchain");
const abi = require("../blockchain/CredentialRegistry.abi.json");

/** Resolve signing independently of deployment discovery. Never export local keys. */
const resolveBlockchainSigner = async (config, provider) => {
  if (["localhost", "hardhat"].includes(config.network) && Number(config.chainId) === 31337) {
    if (Number((await provider.getNetwork()).chainId) !== 31337) {
      throw new BlockchainConfigurationError("Local signer requires connected chain 31337.");
    }
    const registry = new Contract(config.contractAddress, abi, provider);
    const role = await registry.DEFAULT_ADMIN_ROLE();
    for (const account of await provider.listAccounts()) {
      const address = getAddress(await account.getAddress());
      if (await registry.hasRole(role, address)) {
        const signer = await provider.getSigner(address);
        if (getAddress(await signer.getAddress()) !== address) {
          throw new BlockchainConfigurationError("Local RPC signer address does not match the contract administrator.");
        }
        return signer;
      }
    }
    throw new BlockchainConfigurationError("No unlocked local RPC account holds the contract administrator role.");
  }
  if (!config.privateKey) {
    throw new BlockchainConfigurationError("External blockchain signer requires DEPLOYER_PRIVATE_KEY.");
  }
  return new Wallet(config.privateKey, provider);
};

module.exports = { resolveBlockchainSigner };
