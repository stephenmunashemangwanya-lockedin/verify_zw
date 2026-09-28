require("dotenv").config({ quiet: true });

const pool = require("../backend/config/database");
const {
  getCredentialsRequiringReconciliation,
  activateCredential,
  markCredentialFailed,
} = require("../backend/models/credentialModel");
const { createAuditLog } = require("../backend/models/auditModel");
const {
  verifyCredentialOnChain,
  findCredentialIssuanceEvent,
} = require("../backend/services/blockchainService");
const { getBlockchainConfig } = require("../backend/config/blockchain");

(async () => {
  const config = getBlockchainConfig({ requireSigner: false });
  const credentials = await getCredentialsRequiringReconciliation();
  const summary = { examined: credentials.length, recovered: 0, unresolved: 0 };

  for (const credential of credentials) {
    await createAuditLog({
      action: "blockchain_reconciliation_attempted",
      entityType: "credential",
      entityId: credential.id,
      details: { previousStatus: credential.status },
    });
    try {
      // FAILED evidence is terminal; reconciliation reports it without reactivation.
      if (credential.status === "failed") {
        summary.unresolved += 1;
        continue;
      }
      const anchorHash = credential.proof_version === "structured-v2"
        ? credential.credential_commitment : credential.certificate_hash;
      if (!anchorHash) throw Object.assign(new Error("Missing commitment"), { code: "COMMITMENT_MISSING" });
      const proof = await verifyCredentialOnChain(anchorHash);
      const event = proof.exists
        ? await findCredentialIssuanceEvent(anchorHash)
        : null;
      if (!proof.exists || proof.revoked || !event) {
        summary.unresolved += 1;
        await markCredentialFailed(credential.id, "BLOCKCHAIN_RECONCILIATION_NOT_FOUND");
        await createAuditLog({
          action: "blockchain_reconciliation_failed",
          entityType: "credential",
          entityId: credential.id,
          details: { reason: "ACTIVE_ISSUANCE_PROOF_NOT_FOUND" },
        });
        continue;
      }

      const activated = await activateCredential(credential.id, {
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        network: config.network,
        contractAddress: config.contractAddress,
      });
      if (!activated) throw Object.assign(new Error("Lifecycle changed"), { code: "LIFECYCLE_CONFLICT" });
      summary.recovered += 1;
      await createAuditLog({
        action: "blockchain_reconciliation_succeeded",
        entityType: "credential",
        entityId: credential.id,
        details: {
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        },
      });
    } catch (error) {
      summary.unresolved += 1;
      await createAuditLog({
        action: "blockchain_reconciliation_failed",
        entityType: "credential",
        entityId: credential.id,
        details: { errorCode: error.code || "RECONCILIATION_ERROR" },
      }).catch(() => {});
    }
  }
  console.log(JSON.stringify(summary, null, 2));
})()
  .catch((error) => {
    console.error(`Blockchain reconciliation failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
