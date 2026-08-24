require("dotenv").config({ quiet: true });

const {
  validateBlockchainConnection,
  checkContractPaused,
} = require("../backend/services/blockchainService");

(async () => {
  const connection = await validateBlockchainConnection();
  const paused = await checkContractPaused();
  console.log(JSON.stringify({ ...connection, paused }, null, 2));
})().catch((error) => {
  console.error(`Deployment verification failed: ${error.message}`);
  process.exitCode = 1;
});
