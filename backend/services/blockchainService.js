const {
  Contract,
  JsonRpcProvider,
  Wallet,
  getAddress,
  isAddress,
  isHexString,
} = require("ethers");

const registryAbi = require("../blockchain/CredentialRegistry.abi.json");
const { getBlockchainConfig } = require("../config/blockchain");

class BlockchainServiceError extends Error {
  constructor(message, { code = "BLOCKCHAIN_ERROR", statusCode = 502, retryable = false, transactionHash = null } = {}) {
    super(message);
    this.name = "BlockchainServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.transactionHash = transactionHash;
  }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Retry read-only RPC operations. State-changing transactions are never
 * automatically resubmitted because a prior attempt may already be mined. */
const withReadRetries = async (operation) => {
  const config = getBlockchainConfig({ requireSigner: false });
  let lastError;
  for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof BlockchainServiceError && !error.retryable) throw error;
      lastError = error;
      if (attempt < config.maxRetries) {
        await delay(Math.min(250 * 2 ** (attempt - 1), 2000));
      }
    }
  }
  throw lastError;
};

const waitWithTimeout = async (promise, timeoutMs, transactionHash) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new BlockchainServiceError(
          "Blockchain confirmation timed out.",
          { code: "BLOCKCHAIN_CONFIRMATION_TIMEOUT", statusCode: 504, transactionHash }
        )), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const convertSha256HashToBytes32 = (certificateHash) => {
  if (typeof certificateHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(certificateHash)) {
    throw new BlockchainServiceError("Certificate hash must be exactly 64 hexadecimal characters.", {
      code: "INVALID_CERTIFICATE_HASH",
      statusCode: 400,
    });
  }
  return `0x${certificateHash.toLowerCase()}`;
};

const getProvider = () => {
  const config = getBlockchainConfig({ requireSigner: false });
  return new JsonRpcProvider(config.rpcUrl);
};

const getSigner = () => {
  const config = getBlockchainConfig({ requireSigner: true });
  return new Wallet(config.privateKey, new JsonRpcProvider(config.rpcUrl));
};

const getCredentialRegistryContract = ({ readOnly = false } = {}) => {
  const config = getBlockchainConfig({ requireSigner: !readOnly });
  const runner = readOnly
    ? new JsonRpcProvider(config.rpcUrl)
    : new Wallet(config.privateKey, new JsonRpcProvider(config.rpcUrl));
  return new Contract(config.contractAddress, registryAbi, runner);
};

const validateExpectedNetwork = async () => {
  const config = getBlockchainConfig({ requireSigner: false });
  try {
    const network = await withReadRetries(() => getProvider().getNetwork());
    if (Number(network.chainId) !== config.chainId) {
      throw new BlockchainServiceError("Connected blockchain chain ID does not match configuration.", {
        code: "BLOCKCHAIN_WRONG_NETWORK",
        statusCode: 503,
      });
    }
    return { network: config.network, chainId: Number(network.chainId) };
  } catch (error) {
    if (error instanceof BlockchainServiceError) throw error;
    throw new BlockchainServiceError("Blockchain network is unavailable.", {
      code: "BLOCKCHAIN_UNAVAILABLE",
      statusCode: 503,
      retryable: true,
    });
  }
};

const validateBlockchainConnection = async () => {
  const config = getBlockchainConfig({ requireSigner: false });
  const network = await validateExpectedNetwork();
  const bytecode = await getProvider().getCode(config.contractAddress);
  if (bytecode === "0x") {
    throw new BlockchainServiceError("Credential registry is not deployed at the configured address.", {
      code: "BLOCKCHAIN_CONTRACT_NOT_FOUND",
      statusCode: 503,
    });
  }
  return { ...network, contractAddress: config.contractAddress, connected: true };
};

const checkContractPaused = async () => withReadRetries(
  () => getCredentialRegistryContract({ readOnly: true }).paused()
);

const isInstitutionAuthorised = async (walletAddress) => {
  if (!isAddress(walletAddress || "")) {
    throw new BlockchainServiceError("Institution wallet is invalid.", { code: "INVALID_WALLET", statusCode: 400 });
  }
  return withReadRetries(
    () => getCredentialRegistryContract({ readOnly: true }).isAuthorisedInstitution(getAddress(walletAddress))
  );
};

const waitForSuccessfulTransaction = async (transaction, config) => {
  const receipt = await waitWithTimeout(
    transaction.wait(config.confirmations),
    config.timeoutMs,
    transaction.hash
  );
  if (!receipt || receipt.status !== 1) {
    throw new BlockchainServiceError("Blockchain transaction was not successful.", {
      code: "BLOCKCHAIN_TRANSACTION_REVERTED",
      statusCode: 422,
      transactionHash: transaction.hash,
    });
  }
  return receipt;
};

const transactionResult = async (transaction, receipt) => {
  const config = getBlockchainConfig({ requireSigner: true });
  const signer = getSigner();
  return {
    transactionHash: transaction.hash,
    blockNumber: receipt.blockNumber,
    network: config.network,
    chainId: config.chainId,
    contractAddress: config.contractAddress,
    issuerWallet: await signer.getAddress(),
    confirmed: true,
    confirmations: config.confirmations,
    explorerUrl: config.explorerUrl ? `${config.explorerUrl}/tx/${transaction.hash}` : null,
  };
};

const authoriseInstitution = async (walletAddress) => {
  if (!isAddress(walletAddress || "")) throw new BlockchainServiceError("Institution wallet is invalid.", { code: "INVALID_WALLET", statusCode: 400 });
  if (await isInstitutionAuthorised(walletAddress)) return { alreadyAuthorised: true, walletAddress: getAddress(walletAddress) };
  const config = getBlockchainConfig({ requireSigner: true });
  const transaction = await getCredentialRegistryContract().authoriseInstitution(getAddress(walletAddress));
  const receipt = await waitForSuccessfulTransaction(transaction, config);
  return { ...(await transactionResult(transaction, receipt)), walletAddress: getAddress(walletAddress), alreadyAuthorised: false };
};

const deactivateInstitution = async (walletAddress) => {
  if (!isAddress(walletAddress || "")) throw new BlockchainServiceError("Institution wallet is invalid.", { code: "INVALID_WALLET", statusCode: 400 });
  if (!(await isInstitutionAuthorised(walletAddress))) return { alreadyDeactivated: true, walletAddress: getAddress(walletAddress) };
  const config = getBlockchainConfig({ requireSigner: true });
  const transaction = await getCredentialRegistryContract().deactivateInstitution(getAddress(walletAddress));
  const receipt = await waitForSuccessfulTransaction(transaction, config);
  return { ...(await transactionResult(transaction, receipt)), walletAddress: getAddress(walletAddress), alreadyDeactivated: false };
};

const verifyCredentialOnChain = async (certificateHash) => {
  const bytes32Hash = convertSha256HashToBytes32(certificateHash);
  const result = await withReadRetries(
    () => getCredentialRegistryContract({ readOnly: true }).verifyCredential(bytes32Hash)
  );
  return {
    exists: result.exists,
    revoked: result.revoked,
    issuer: result.issuer,
    issuedAt: Number(result.issuedAt),
    revokedAt: Number(result.revokedAt),
  };
};

const issueCredentialOnChainInternal = async (certificateHash, { expectedInstitutionWallet, onSubmitted } = {}) => {
  const bytes32Hash = convertSha256HashToBytes32(certificateHash);
  await validateExpectedNetwork();
  if (await checkContractPaused()) throw new BlockchainServiceError("Credential registry is paused.", { code: "BLOCKCHAIN_PAUSED", statusCode: 503 });
  const signerAddress = await getSigner().getAddress();
  if (expectedInstitutionWallet) {
    if (!isAddress(expectedInstitutionWallet) || getAddress(expectedInstitutionWallet) !== signerAddress) {
      throw new BlockchainServiceError("Configured issuer does not match the institution wallet.", {
        code: "BLOCKCHAIN_INSTITUTION_WALLET_MISMATCH",
        statusCode: 403,
      });
    }
  }
  if (!(await isInstitutionAuthorised(signerAddress))) {
    throw new BlockchainServiceError("Configured issuer wallet is not authorised.", { code: "BLOCKCHAIN_ISSUER_UNAUTHORISED", statusCode: 403 });
  }
  const existing = await verifyCredentialOnChain(certificateHash);
  if (existing.exists) throw new BlockchainServiceError("Credential hash already exists on-chain.", { code: "BLOCKCHAIN_DUPLICATE_CREDENTIAL", statusCode: 409 });

  const config = getBlockchainConfig({ requireSigner: true });
  const transaction = await getCredentialRegistryContract().issueCredential(bytes32Hash);
  if (onSubmitted) {
    await Promise.resolve(onSubmitted({ transactionHash: transaction.hash })).catch((error) => {
      console.error("Blockchain submission audit failed:", error.message);
    });
  }
  let receipt;
  try {
    receipt = await waitForSuccessfulTransaction(transaction, config);
  } catch (error) {
    if (error.code !== "BLOCKCHAIN_CONFIRMATION_TIMEOUT") throw error;
    const recoveredReceipt = await getProvider().getTransactionReceipt(transaction.hash);
    const recoveredProof = await verifyCredentialOnChain(certificateHash).catch(() => ({ exists: false }));
    if (!recoveredReceipt || recoveredReceipt.status !== 1 || !recoveredProof.exists) throw error;
    receipt = recoveredReceipt;
  }
  return transactionResult(transaction, receipt);
};

const issueCredentialOnChain = async (certificateHash, options = {}) => {
  try {
    return await issueCredentialOnChainInternal(certificateHash, options);
  } catch (error) {
    if (error instanceof BlockchainServiceError || error.code === "BLOCKCHAIN_CONFIGURATION_ERROR") {
      throw error;
    }
    if (error.code === "CALL_EXCEPTION" || error.code === "ACTION_REJECTED" || error.code === "INSUFFICIENT_FUNDS") {
      throw new BlockchainServiceError("The credential registry rejected the transaction.", {
        code: "BLOCKCHAIN_TRANSACTION_REJECTED",
        statusCode: 422,
      });
    }
    throw new BlockchainServiceError("The blockchain network is unavailable.", {
      code: "BLOCKCHAIN_UNAVAILABLE",
      statusCode: 503,
      retryable: true,
      transactionHash: error.transactionHash || null,
    });
  }
};

const findCredentialIssuanceEvent = async (certificateHash) => {
  const contract = getCredentialRegistryContract({ readOnly: true });
  const events = await contract.queryFilter(
    contract.filters.CredentialIssued(convertSha256HashToBytes32(certificateHash)),
    0,
    "latest"
  );
  if (events.length === 0) return null;
  const event = events[events.length - 1];
  return {
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    issuerWallet: event.args.issuer,
    issuedAt: Number(event.args.issuedAt),
  };
};

const revokeCredentialOnChain = async (certificateHash, { onSubmitted } = {}) => {
  try {
    await validateExpectedNetwork();
    if (await checkContractPaused()) throw new BlockchainServiceError("Credential registry is paused.", { code: "BLOCKCHAIN_PAUSED", statusCode: 503 });
    const proof = await verifyCredentialOnChain(certificateHash);
    if (!proof.exists) throw new BlockchainServiceError("Credential proof does not exist on-chain.", { code: "BLOCKCHAIN_CREDENTIAL_NOT_FOUND", statusCode: 409 });
    if (proof.revoked) throw new BlockchainServiceError("Credential proof is already revoked.", { code: "BLOCKCHAIN_CREDENTIAL_ALREADY_REVOKED", statusCode: 409 });

    const config = getBlockchainConfig({ requireSigner: true });
    const transaction = await getCredentialRegistryContract().revokeCredential(convertSha256HashToBytes32(certificateHash));
    if (onSubmitted) {
      await Promise.resolve(onSubmitted({ transactionHash: transaction.hash })).catch((error) => {
        console.error("Blockchain revocation submission audit failed:", error.message);
      });
    }
    const receipt = await waitForSuccessfulTransaction(transaction, config);
    return transactionResult(transaction, receipt);
  } catch (error) {
    if (error instanceof BlockchainServiceError || error.code === "BLOCKCHAIN_CONFIGURATION_ERROR") throw error;
    if (["CALL_EXCEPTION", "ACTION_REJECTED", "INSUFFICIENT_FUNDS"].includes(error.code)) {
      throw new BlockchainServiceError("The credential registry rejected the revocation.", { code: "BLOCKCHAIN_TRANSACTION_REJECTED", statusCode: 422, transactionHash: error.transactionHash || null });
    }
    throw new BlockchainServiceError("The blockchain network is unavailable.", { code: "BLOCKCHAIN_UNAVAILABLE", statusCode: 503, retryable: true, transactionHash: error.transactionHash || null });
  }
};

const getTransactionReceipt = async (transactionHash) => {
  if (!isHexString(transactionHash || "", 32)) throw new BlockchainServiceError("Transaction hash is invalid.", { code: "INVALID_TRANSACTION_HASH", statusCode: 400 });
  return withReadRetries(() => getProvider().getTransactionReceipt(transactionHash));
};

const getExplorerTransactionUrl = (transactionHash) => {
  if (!isHexString(transactionHash || "", 32)) throw new BlockchainServiceError("Transaction hash is invalid.", { code: "INVALID_TRANSACTION_HASH", statusCode: 400 });
  const config = getBlockchainConfig({ requireSigner: false });
  return config.explorerUrl ? `${config.explorerUrl}/tx/${transactionHash}` : null;
};

module.exports = {
  getProvider,
  getSigner,
  getCredentialRegistryContract,
  validateBlockchainConnection,
  validateExpectedNetwork,
  isInstitutionAuthorised,
  authoriseInstitution,
  deactivateInstitution,
  issueCredentialOnChain,
  verifyCredentialOnChain,
  revokeCredentialOnChain,
  getTransactionReceipt,
  getExplorerTransactionUrl,
  convertSha256HashToBytes32,
  checkContractPaused,
  findCredentialIssuanceEvent,
  BlockchainServiceError,
};
