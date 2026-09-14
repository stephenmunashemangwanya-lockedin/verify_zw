const path = require("path");
const { resolveContractAddress, validateResolvedContract } = require("../backend/config/blockchain");

class StartupDependencyError extends Error {
  constructor(message, code) { super(message); this.name = "StartupDependencyError"; this.code = code; this.dependency = "blockchain"; }
}

const rpc = async (url, method, params = [], { fetchImpl = fetch, timeoutMs = Number(process.env.READINESS_TIMEOUT_MS || 5000) } = {}) => {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new StartupDependencyError(`Local blockchain RPC ${method} failed.`, "BLOCKCHAIN_RPC_ERROR");
    return payload.result;
  } catch (error) {
    if (error instanceof StartupDependencyError) throw error;
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    throw new StartupDependencyError(
      timedOut ? `Local blockchain RPC ${method} timed out.` : `Local blockchain RPC ${method} is unavailable.`,
      timedOut ? "BLOCKCHAIN_RPC_TIMEOUT" : "BLOCKCHAIN_RPC_UNAVAILABLE"
    );
  }
};

const loadActiveLocalDeployment = async ({ deploymentPath, rpcUrl, expectedChainId }) => {
  const contractAddress = resolveContractAddress({ network: "localhost", chainId: expectedChainId, deploymentPath });
  await validateResolvedContract({ contractAddress, chainId: expectedChainId }, {
    getNetwork: async () => ({ chainId: BigInt(await rpc(rpcUrl, "eth_chainId")) }),
    getCode: address => rpc(rpcUrl, "eth_getCode", [address, "latest"]),
  });
  return { network: "localhost", chainId: Number(expectedChainId), contractAddress };
};

const start = async () => {
  if (process.env.BLOCKCHAIN_ENABLED === "true" && process.env.BLOCKCHAIN_NETWORK === "localhost") {
    const deploymentPath = process.env.LOCAL_DEPLOYMENT_PATH || path.resolve("deployments/localhost/CredentialRegistry.json");
    const deployment = await loadActiveLocalDeployment({ deploymentPath, rpcUrl: process.env.BLOCKCHAIN_RPC_URL, expectedChainId: process.env.BLOCKCHAIN_CHAIN_ID });
    console.log(JSON.stringify({ event: "local_blockchain_deployment_verified", chainId: Number(deployment.chainId), contractAddress: deployment.contractAddress }));
  }
  require("../backend/server").startServer();
};

if (require.main === module) start().catch((error) => { console.error(JSON.stringify({ event: "startup_dependency_failed", dependency: error.dependency || "blockchain", errorCode: error.code || "BLOCKCHAIN_STARTUP_ERROR", message: error.message })); process.exitCode = 1; });
module.exports = { rpc, loadActiveLocalDeployment, start, StartupDependencyError };
