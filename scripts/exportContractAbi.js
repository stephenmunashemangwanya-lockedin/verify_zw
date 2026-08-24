const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "CredentialRegistry.sol",
  "CredentialRegistry.json"
);
const outputDirectory = path.join(__dirname, "..", "backend", "blockchain");
const outputPath = path.join(outputDirectory, "CredentialRegistry.abi.json");

if (!fs.existsSync(artifactPath)) {
  throw new Error("Compile CredentialRegistry before exporting its ABI.");
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(artifact.abi, null, 2)}\n`);
console.log(`Generated deployment-safe ABI: ${path.relative(process.cwd(), outputPath)}`);
