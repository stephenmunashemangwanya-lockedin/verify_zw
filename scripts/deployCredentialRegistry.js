const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { LOCAL_NETWORKS, readDeployment, inspectLocalDeployment, safeDeploymentRecord } = require("./localDeploymentLifecycle");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;
  const network = await provider.getNetwork();
  const expectedChainId = process.env.BLOCKCHAIN_CHAIN_ID
    ? BigInt(process.env.BLOCKCHAIN_CHAIN_ID)
    : network.chainId;
  if (network.chainId !== expectedChainId) {
    throw new Error(`Chain ID mismatch: expected ${expectedChainId}, received ${network.chainId}.`);
  }

  const networkName = hre.network.name;
  const deploymentDirectory = path.join(__dirname, "..", "deployments", networkName);
  const deploymentPath = path.join(deploymentDirectory, "CredentialRegistry.json");
  const existing = readDeployment(deploymentPath);
  const inspection = await inspectLocalDeployment({ deployment: existing, networkName, chainId: network.chainId, provider });
  if (inspection.reusable) {
    console.log(`CredentialRegistry is already active on ${networkName} (${network.chainId}).`);
    console.log(JSON.stringify(safeDeploymentRecord(inspection.deployment), null, 2));
    return inspection.deployment;
  }
  if (existing && !LOCAL_NETWORKS.has(networkName)) {
    throw new Error("Existing non-local deployment metadata will not be replaced automatically.");
  }

  const balance = await provider.getBalance(deployer.address);
  if (balance === 0n) throw new Error("The deployer wallet has no balance.");

  console.log(`Deploying CredentialRegistry on ${networkName} (${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);

  const registry = await hre.ethers.deployContract("CredentialRegistry", [deployer.address]);
  await registry.waitForDeployment();
  const deploymentTransaction = registry.deploymentTransaction();
  const receipt = await deploymentTransaction.wait(Number(process.env.BLOCK_CONFIRMATIONS || 1));
  const contractAddress = await registry.getAddress();
  const bytecode = await provider.getCode(contractAddress);
  if (bytecode === "0x") throw new Error("Deployment verification failed: no bytecode at contract address.");

  const record = safeDeploymentRecord({
    network: networkName,
    chainId: Number(network.chainId),
    contractAddress,
    deploymentTransaction: deploymentTransaction.hash,
    blockNumber: receipt.blockNumber,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  });
  fs.mkdirSync(deploymentDirectory, { recursive: true });
  fs.writeFileSync(deploymentPath, `${JSON.stringify(record, null, 2)}\n`, { flag: existing ? "w" : "wx" });

  console.log(JSON.stringify(record, null, 2));
}

main().catch((error) => {
  console.error(`Deployment failed: ${error.message}`);
  process.exitCode = 1;
});
