const fs = require("fs");
const { isAddress } = require("ethers");

const LOCAL_NETWORKS = new Set(["localhost", "hardhat"]);

const readDeployment = (deploymentPath) => {
  if (!fs.existsSync(deploymentPath)) return null;
  return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
};

const inspectLocalDeployment = async ({ deployment, networkName, chainId, provider }) => {
  if (!deployment) return { reusable: false, reason: "metadata_absent" };
  if (!LOCAL_NETWORKS.has(networkName)) {
    return { reusable: false, reason: "non_local_metadata" };
  }
  if (Number(deployment.chainId) !== Number(chainId)) {
    return { reusable: false, reason: "wrong_chain" };
  }
  if (!isAddress(deployment.contractAddress || "")) {
    return { reusable: false, reason: "invalid_address" };
  }
  const bytecode = await provider.getCode(deployment.contractAddress);
  return bytecode === "0x"
    ? { reusable: false, reason: "contract_missing" }
    : { reusable: true, reason: "active", deployment };
};

const safeDeploymentRecord = (record) => ({
  network: record.network,
  chainId: Number(record.chainId),
  contractAddress: record.contractAddress,
  deploymentTransaction: record.deploymentTransaction,
  blockNumber: record.blockNumber,
  deployedAt: record.deployedAt,
  deployer: record.deployer,
});

module.exports = { LOCAL_NETWORKS, readDeployment, inspectLocalDeployment, safeDeploymentRecord };
