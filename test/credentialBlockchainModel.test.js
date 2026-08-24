const test = require("node:test");
const assert = require("node:assert/strict");

const databasePath = require.resolve("../backend/config/database");
const modelPath = require.resolve("../backend/models/credentialModel");

test("credential activation stores confirmed blockchain metadata and active status", async () => {
  let captured;
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: {
      query: async (sql, values) => {
        captured = { sql, values };
        return { rows: [{ id: values[0], status: "active", blockchain_tx: values[1], block_number: values[4] }] };
      },
    },
  };
  delete require.cache[modelPath];
  const { activateCredential } = require(modelPath);
  const result = await activateCredential("credential-id", {
    transactionHash: `0x${"1".repeat(64)}`,
    network: "localhost",
    contractAddress: "0x0000000000000000000000000000000000000001",
    blockNumber: 7,
  });
  assert.match(captured.sql, /status = 'active'/);
  assert.match(captured.sql, /ipfs_cid IS NOT NULL/);
  assert.deepEqual(captured.values.slice(1), [
    `0x${"1".repeat(64)}`,
    "localhost",
    "0x0000000000000000000000000000000000000001",
    7,
  ]);
  assert.equal(result.status, "active");
  assert.equal(result.block_number, 7);
});

test("failed credential update stores only a controlled processing code", async () => {
  let captured;
  require.cache[databasePath].exports.query = async (sql, values) => {
    captured = { sql, values };
    return { rows: [{ id: values[0], status: "failed" }] };
  };
  delete require.cache[modelPath];
  const { markCredentialFailed } = require(modelPath);
  await markCredentialFailed("credential-id", "BLOCKCHAIN_UNAVAILABLE");
  assert.match(captured.sql, /status = 'failed'/);
  assert.equal(captured.values[1], "BLOCKCHAIN_UNAVAILABLE");
});
