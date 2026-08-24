require("dotenv").config({ quiet: true });

const pool = require("../backend/config/database");
const { authoriseInstitution } = require("../backend/services/blockchainService");
const { createAuditLog } = require("../backend/models/auditModel");

(async () => {
  const institutionId = process.env.INSTITUTION_ID;
  if (!institutionId) throw new Error("INSTITUTION_ID is required.");
  const result = await pool.query(
    "SELECT id, wallet_address, status FROM institutions WHERE id = $1 LIMIT 1",
    [institutionId]
  );
  const institution = result.rows[0];
  if (!institution) throw new Error("Institution not found.");
  if (!institution.status) throw new Error("Institution is inactive.");

  const blockchain = await authoriseInstitution(institution.wallet_address);
  await createAuditLog({
    action: "institution_blockchain_authorised_script",
    entityType: "institution",
    entityId: institution.id,
    details: {
      walletAddress: institution.wallet_address,
      transactionHash: blockchain.transactionHash || null,
      alreadyAuthorised: blockchain.alreadyAuthorised || false,
    },
  });
  console.log(JSON.stringify(blockchain, null, 2));
})()
  .catch((error) => {
    console.error(`Institution authorisation failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
