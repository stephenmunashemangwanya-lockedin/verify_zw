const {
  Contract,
  Wallet,
  getAddress,
  isAddress,
  isHexString,
} = require("ethers");

const { BlockchainConfigurationError } = require("./blockchain");
const abi = require("../blockchain/CredentialRegistry.abi.json");

/**
 * Resolve the platform administrator signer.
 *
 * This signer is used for administrator-level blockchain actions such as:
 * - authorising institution wallets
 * - deactivating institution wallets
 *
 * External networks use DEPLOYER_PRIVATE_KEY.
 */
const resolveBlockchainSigner = async (config, provider) => {
  if (
    ["localhost", "hardhat"].includes(config.network) &&
    Number(config.chainId) === 31337
  ) {
    if (Number((await provider.getNetwork()).chainId) !== 31337) {
      throw new BlockchainConfigurationError(
        "Local signer requires connected chain 31337."
      );
    }

    const registry = new Contract(
      config.contractAddress,
      abi,
      provider
    );

    const adminRole = await registry.DEFAULT_ADMIN_ROLE();

    for (const account of await provider.listAccounts()) {
      const address = getAddress(
        await account.getAddress()
      );

      if (await registry.hasRole(adminRole, address)) {
        const signer =
          await provider.getSigner(address);

        const signerAddress = getAddress(
          await signer.getAddress()
        );

        if (signerAddress !== address) {
          throw new BlockchainConfigurationError(
            "Local RPC signer address does not match the contract administrator."
          );
        }

        return signer;
      }
    }

    throw new BlockchainConfigurationError(
      "No unlocked local RPC account holds the contract administrator role."
    );
  }

  if (
    !config.privateKey ||
    !isHexString(config.privateKey, 32)
  ) {
    throw new BlockchainConfigurationError(
      "External blockchain administrator signer requires a valid DEPLOYER_PRIVATE_KEY."
    );
  }

  return new Wallet(
    config.privateKey,
    provider
  );
};

/**
 * Resolve the signer belonging to a particular institution.
 *
 * External staging/production uses:
 *
 * INSTITUTION_SIGNER_KEYS_JSON
 *
 * Example structure:
 *
 * {
 *   "0xInstitutionWallet": "0xPrivateKey"
 * }
 *
 * Never commit the actual JSON or private keys to source control.
 */
const resolveInstitutionSigner = async (
  expectedInstitutionWallet,
  config,
  provider
) => {
  if (!isAddress(expectedInstitutionWallet || "")) {
    throw new BlockchainConfigurationError(
      "Institution signer wallet address is invalid."
    );
  }

  const expectedAddress = getAddress(
    expectedInstitutionWallet
  );

  /*
   * Local development.
   *
   * The institution wallet must already exist as an unlocked
   * account on the local Hardhat/localhost node.
   */
  if (
    ["localhost", "hardhat"].includes(config.network) &&
    Number(config.chainId) === 31337
  ) {
    let signer;

    try {
      signer = await provider.getSigner(
        expectedAddress
      );
    } catch {
      throw new BlockchainConfigurationError(
        "The institution wallet is not available as an unlocked local RPC account."
      );
    }

    const signerAddress = getAddress(
      await signer.getAddress()
    );

    if (signerAddress !== expectedAddress) {
      throw new BlockchainConfigurationError(
        "Local institution signer does not match the institution wallet."
      );
    }

    return signer;
  }

  /*
   * External networks.
   *
   * Institution keys are supplied through the deployment
   * secret manager and are never stored in PostgreSQL.
   */
  let keyMap;

  try {
    keyMap = JSON.parse(
      process.env.INSTITUTION_SIGNER_KEYS_JSON ||
        "{}"
    );
  } catch {
    throw new BlockchainConfigurationError(
      "INSTITUTION_SIGNER_KEYS_JSON must contain valid JSON."
    );
  }

  if (
    !keyMap ||
    typeof keyMap !== "object" ||
    Array.isArray(keyMap)
  ) {
    throw new BlockchainConfigurationError(
      "INSTITUTION_SIGNER_KEYS_JSON must contain an object mapping wallet addresses to private keys."
    );
  }

  const entry = Object.entries(keyMap).find(
    ([address]) => {
      if (!isAddress(address)) {
        return false;
      }

      return (
        getAddress(address).toLowerCase() ===
        expectedAddress.toLowerCase()
      );
    }
  );

  if (!entry) {
    throw new BlockchainConfigurationError(
      "No signing key is configured for the institution wallet."
    );
  }

  const [, privateKey] = entry;

  if (
    typeof privateKey !== "string" ||
    !isHexString(privateKey, 32)
  ) {
    throw new BlockchainConfigurationError(
      "Configured institution signing key is invalid."
    );
  }

  const signer = new Wallet(
    privateKey,
    provider
  );

  const signerAddress = getAddress(
    await signer.getAddress()
  );

  if (
    signerAddress.toLowerCase() !==
    expectedAddress.toLowerCase()
  ) {
    throw new BlockchainConfigurationError(
      "Institution signing key does not match the configured institution wallet."
    );
  }

  return signer;
};

module.exports = {
  resolveBlockchainSigner,
  resolveInstitutionSigner,
};