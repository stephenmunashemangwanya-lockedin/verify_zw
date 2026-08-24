const { verifyCredentialOnChain } = require("./blockchainService");
const { checkPinStatus } = require("./ipfsService");
const { maskStudentNumber } = require("../utils/maskStudentNumber");

const safeIpfsAvailability = async (cid) => {
  if (!cid) return false;
  return checkPinStatus(cid).catch(() => null);
};

const verifyCredentialState = async ({ credential, certificateHash }) => {
  const blockchain = await verifyCredentialOnChain(certificateHash);
  const ipfsAvailable = credential
    ? await safeIpfsAvailability(credential.ipfs_cid)
    : null;

  let result;
  if (!credential) {
    result = blockchain.exists ? "SYSTEM_INCONSISTENCY" : "UNKNOWN";
  } else if (credential.status === "revoked" || blockchain.revoked) {
    result = "REVOKED";
  } else if (credential.status === "failed") {
    result = blockchain.exists ? "SYSTEM_INCONSISTENCY" : "FAILED";
  } else if (["pending", "processing"].includes(credential.status)) {
    result = blockchain.exists ? "SYSTEM_INCONSISTENCY" : "PENDING";
  } else if (
    credential.status === "active" &&
    blockchain.exists &&
    !blockchain.revoked &&
    credential.ipfs_cid &&
    credential.blockchain_tx
  ) {
    result = "VERIFIED";
  } else {
    result = "SYSTEM_INCONSISTENCY";
  }

  return {
    result,
    credential: credential
      ? {
          id: credential.id,
          maskedStudentNumber: maskStudentNumber(credential.student_number),
          institutionName: credential.institution_name,
          qualification: credential.qualification,
          issueDate: credential.issue_date,
          status: credential.status,
          transactionHash: credential.blockchain_tx,
          blockNumber: credential.block_number,
          blockchainNetwork: credential.blockchain_network,
          contractAddress: credential.contract_address,
          revokedAt: credential.revoked_at,
          revocationReason: credential.status === "revoked" ? credential.revocation_reason : null,
        }
      : null,
    blockchain: {
      exists: blockchain.exists,
      revoked: blockchain.revoked,
      confirmed: blockchain.exists,
    },
    ipfs: {
      cidPresent: Boolean(credential?.ipfs_cid),
      available: ipfsAvailable,
    },
    verificationTime: new Date().toISOString(),
  };
};

module.exports = { verifyCredentialState };
