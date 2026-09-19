const pool =
  require("../config/database");

const getLatestStatusList =
  async (
    institutionId
  ) => {
    const result =
      await pool.query(
        `SELECT
           id,
           institution_id,
           version,
           revoked_indices,
           issued_at,
           next_update,
           payload,
           signature,
           issuer_wallet,
           commitment,
           blockchain_tx,
           blockchain_network,
           contract_address,
           block_number,
           created_at
         FROM status_lists
         WHERE institution_id = $1
         ORDER BY version DESC
         LIMIT 1`,
        [
          institutionId,
        ]
      );

    return result.rows[0];
  };

const createStatusList =
  async ({
    institutionId,
    version,
    revokedIndices,
    issuedAt,
    nextUpdate,
    payload,
    signature,
    issuerWallet,
    commitment,
    blockchainResult,
  }) => {
    const result =
      await pool.query(
        `INSERT INTO status_lists (
           institution_id,
           version,
           revoked_indices,
           issued_at,
           next_update,
           payload,
           signature,
           issuer_wallet,
           commitment,
           blockchain_tx,
           blockchain_network,
           contract_address,
           block_number
         )
         VALUES (
           $1,
           $2,
           $3::jsonb,
           $4,
           $5,
           $6::jsonb,
           $7,
           $8,
           $9,
           $10,
           $11,
           $12,
           $13
         )
         RETURNING
           id,
           institution_id,
           version,
           revoked_indices,
           issued_at,
           next_update,
           payload,
           signature,
           issuer_wallet,
           commitment,
           blockchain_tx,
           blockchain_network,
           contract_address,
           block_number,
           created_at`,
        [
          institutionId,
          version,
          JSON.stringify(
            revokedIndices
          ),
          issuedAt,
          nextUpdate,
          JSON.stringify(
            payload
          ),
          signature,
          issuerWallet,
          commitment,
          blockchainResult
            ?.transactionHash ||
            null,
          blockchainResult
            ?.network ||
            null,
          blockchainResult
            ?.contractAddress ||
            null,
          blockchainResult
            ?.blockNumber ||
            null,
        ]
      );

    return result.rows[0];
  };

module.exports = {
  getLatestStatusList,
  createStatusList,
};