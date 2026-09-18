const {
  verifyCredentialOnChain,
} = require(
  "./blockchainService"
);

const {
  checkPinStatus,
} = require(
  "./ipfsService"
);

const {
  findEffectiveAccreditation,
} = require(
  "../models/accreditationModel"
);

const {
  maskStudentNumber,
} = require(
  "../utils/maskStudentNumber"
);

const safeIpfsAvailability =
  async (cid) => {
    if (!cid) {
      return false;
    }

    return checkPinStatus(
      cid
    ).catch(
      () => null
    );
  };

const evaluateAccreditation =
  async (credential) => {
    if (!credential) {
      return {
        checked:
          false,

        validAtAwardDate:
          null,

        recordId:
          null,
      };
    }

    const awardDate =
      credential.award_date ||
      credential.issue_date ||
      null;

    if (
      !credential
        .institution_id ||
      !credential
        .programme ||
      !awardDate
    ) {
      return {
        checked:
          false,

        validAtAwardDate:
          null,

        recordId:
          null,

        awardDate,
      };
    }

    const record =
      await findEffectiveAccreditation({
        institutionId:
          credential
            .institution_id,

        programme:
          credential.programme,

        awardDate,
      });

    return {
      checked:
        true,

      validAtAwardDate:
        Boolean(record),

      recordId:
        record?.id ||
        null,

      awardDate,

      programme:
        credential.programme,

      scope:
        record
          ? record.programme
            ? "programme"
            : "institution"
          : null,

      validFrom:
        record?.valid_from ||
        null,

      validTo:
        record?.valid_to ||
        null,

      sourceLabel:
        record?.source_label ||
        null,
    };
  };

const verifyCredentialState =
  async ({
    credential,
    certificateHash,
  }) => {
    const blockchain =
      await verifyCredentialOnChain(
        certificateHash
      );

    const ipfsAvailable =
      credential
        ? await safeIpfsAvailability(
            credential.ipfs_cid
          )
        : null;

    const accreditation =
      credential
        ? await evaluateAccreditation(
            credential
          )
        : {
            checked:
              false,

            validAtAwardDate:
              null,

            recordId:
              null,
          };

    let result;

    if (!credential) {
      result =
        blockchain.exists
          ? "SYSTEM_INCONSISTENCY"
          : "UNKNOWN";
    } else if (
      credential.status ===
        "revoked" ||
      blockchain.revoked
    ) {
      result =
        "REVOKED";
    } else if (
      credential.status ===
      "superseded"
    ) {
      result =
        "SUPERSEDED";
    } else if (
      credential.status ===
      "failed"
    ) {
      result =
        blockchain.exists
          ? "SYSTEM_INCONSISTENCY"
          : "FAILED";
    } else if (
      [
        "pending",
        "processing",
      ].includes(
        credential.status
      )
    ) {
      result =
        blockchain.exists
          ? "SYSTEM_INCONSISTENCY"
          : "PENDING";
    } else if (
      credential.status ===
        "active" &&
      accreditation.checked &&
      accreditation
        .validAtAwardDate ===
        false
    ) {
      result =
        "ACCREDITATION_INVALID";
    } else if (
      credential.status ===
        "active" &&
      blockchain.exists &&
      !blockchain.revoked &&
      credential.ipfs_cid &&
      credential.blockchain_tx
    ) {
      result =
        "VERIFIED";
    } else {
      result =
        "SYSTEM_INCONSISTENCY";
    }

    return {
      result,

      credential:
        credential
          ? {
              id:
                credential.id,

              studentName:
                credential
                  .student_name,

              maskedStudentNumber:
                maskStudentNumber(
                  credential
                    .student_number
                ),

              institutionName:
                credential
                  .institution_name,

              programme:
                credential
                  .programme,

              qualification:
                credential
                  .qualification,

              awardDate:
                credential
                  .award_date ||
                credential
                  .issue_date,

              issueDate:
                credential
                  .issue_date,

              status:
                credential
                  .status,

              supersededBy:
                credential
                  .superseded_by ||
                null,

              supersededAt:
                credential
                  .superseded_at ||
                null,

              supersessionReason:
                credential
                  .supersession_reason ||
                null,

              transactionHash:
                credential
                  .blockchain_tx,

              blockNumber:
                credential
                  .block_number,

              blockchainNetwork:
                credential
                  .blockchain_network,

              contractAddress:
                credential
                  .contract_address,

              revokedAt:
                credential
                  .revoked_at,

              revocationReason:
                credential.status ===
                "revoked"
                  ? credential
                      .revocation_reason
                  : null,
            }
          : null,

      blockchain: {
        exists:
          blockchain.exists,

        revoked:
          blockchain.revoked,

        confirmed:
          blockchain.exists,
      },

      ipfs: {
        cidPresent:
          Boolean(
            credential
              ?.ipfs_cid
          ),

        available:
          ipfsAvailable,
      },

      accreditation,

      verificationTime:
        new Date()
          .toISOString(),
    };
  };

module.exports = {
  verifyCredentialState,
};