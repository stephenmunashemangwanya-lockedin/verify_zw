const {
  getAddress,
  isAddress,
} = require("ethers");

const {
  verifyCredentialOnChain,
} = require("./blockchainService");

const {
  checkPinStatus,
} = require("./ipfsService");

const {
  verifyCredentialPayloadSignature,
} = require("./credentialProofService");

const {
  verifyStatusListArtifact,
} = require("./statusListService");

const {
  getLatestStatusList,
} = require("../models/statusListModel");

const {
  findEffectiveAccreditation,
} = require("../models/accreditationModel");

const {
  maskStudentNumber,
} = require("../utils/maskStudentNumber");

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
        checked: false,
        validAtAwardDate: null,
        recordId: null,
      };
    }

    const awardDate =
      credential.award_date ||
      credential.issue_date ||
      null;

    if (
      !credential.institution_id ||
      !credential.programme ||
      !awardDate
    ) {
      return {
        checked: false,
        validAtAwardDate: null,
        recordId: null,
        awardDate,
      };
    }

    const record =
      await findEffectiveAccreditation({
        institutionId:
          credential.institution_id,

        programme:
          credential.programme,

        awardDate,
      });

    return {
      checked: true,

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

const evaluateCredentialProof =
  (credential) => {
    const structured =
      credential?.proof_version ===
      "structured-v2";

    if (!structured) {
      return {
        mode: "legacy-v1",
        structured: false,
        signatureValid: null,
        commitmentMatchesStored: null,
        recomputedCommitment: null,

        anchorHash:
          credential
            ?.certificate_hash ||
          null,
      };
    }

    const signature =
      verifyCredentialPayloadSignature({
        payload:
          credential
            .credential_payload,

        signature:
          credential
            .issuer_signature,

        expectedIssuerWallet:
          credential
            .issuer_wallet,
      });

    const recomputedCommitment =
      signature
        .commitmentHash ||
      null;

    const commitmentMatchesStored =
      Boolean(
        recomputedCommitment &&
        credential
          .credential_commitment &&
        recomputedCommitment
          .toLowerCase() ===
          String(
            credential
              .credential_commitment
          ).toLowerCase()
      );

    return {
      mode:
        "structured-v2",

      structured:
        true,

      signatureValid:
        signature.valid,

      recoveredWallet:
        signature
          .recoveredWallet ||
        null,

      commitmentMatchesStored,

      recomputedCommitment,

      storedCommitment:
        credential
          .credential_commitment ||
        null,

      anchorHash:
        recomputedCommitment ||
        credential
          .credential_commitment ||
        null,

      canonicalisation:
        credential
          .proof_canonicalisation ||
        "RFC8785",

      hashAlgorithm:
        credential
          .proof_hash_algorithm ||
        "SHA-256",

      proofType:
        credential
          .proof_type ||
        null,
    };
  };

const walletsMatch =
  (
    first,
    second
  ) => {
    if (
      !isAddress(
        first || ""
      ) ||
      !isAddress(
        second || ""
      )
    ) {
      return false;
    }

    return (
      getAddress(
        first
      ).toLowerCase() ===
      getAddress(
        second
      ).toLowerCase()
    );
  };

const emptyLifecycle =
  (credential) => ({
    active:
      credential?.status ===
      "active",

    freshnessChecked:
      false,

    fresh:
      null,

    revoked:
      null,

    signatureValid:
      null,

    commitmentMatchesStored:
      null,

    version:
      null,

    issuedAt:
      null,

    nextUpdate:
      null,

    reason:
      null,
  });

const evaluateLifecycleStatus =
  async (
    credential,
    verificationTime
  ) => {
    if (
      credential
        ?.proof_version !==
        "structured-v2"
    ) {
      return emptyLifecycle(
        credential
      );
    }

    const expectedWallet =
      credential
        .institution_wallet ||
      credential
        .issuer_wallet;

    if (
      credential
        .status_list_index ===
        null ||
      credential
        .status_list_index ===
        undefined ||
      !expectedWallet
    ) {
      return {
        ...emptyLifecycle(
          credential
        ),

        freshnessChecked:
          true,

        fresh:
          false,

        reason:
          "STATUS_LIST_REFERENCE_MISSING",
      };
    }

    let statusList;

    try {
      statusList =
        await getLatestStatusList(
          credential
            .institution_id
        );
    } catch (_error) {
      return {
        ...emptyLifecycle(
          credential
        ),

        freshnessChecked:
          true,

        fresh:
          false,

        reason:
          "STATUS_LIST_UNAVAILABLE",
      };
    }

    if (!statusList) {
      return {
        ...emptyLifecycle(
          credential
        ),

        freshnessChecked:
          true,

        fresh:
          false,

        reason:
          "STATUS_LIST_MISSING",
      };
    }

    const evaluated =
      verifyStatusListArtifact({
        payload:
          statusList.payload,

        signature:
          statusList.signature,

        expectedInstitutionWallet:
          expectedWallet,

        statusListIndex:
          credential
            .status_list_index,

        now:
          verificationTime,
      });

    const commitmentMatchesStored =
      Boolean(
        evaluated
          .commitmentHash &&
        statusList
          .commitment &&
        evaluated
          .commitmentHash
          .toLowerCase() ===
          String(
            statusList
              .commitment
          ).toLowerCase()
      );

    let reason =
      null;

    if (
      evaluated
        .signatureValid !==
      true
    ) {
      reason =
        "STATUS_LIST_SIGNATURE_INVALID";
    } else if (
      !commitmentMatchesStored
    ) {
      reason =
        "STATUS_LIST_COMMITMENT_MISMATCH";
    } else if (
      evaluated.fresh !==
      true
    ) {
      reason =
        "STATUS_LIST_STALE";
    }

    return {
      active:
        credential.status ===
        "active",

      freshnessChecked:
        true,

      fresh:
        Boolean(
          evaluated
            .signatureValid &&
          commitmentMatchesStored &&
          evaluated.fresh
        ),

      revoked:
        evaluated.fresh &&
        evaluated
          .signatureValid &&
        commitmentMatchesStored
          ? evaluated.revoked
          : null,

      signatureValid:
        evaluated
          .signatureValid,

      commitmentMatchesStored,

      version:
        statusList.version ??
        evaluated.version ??
        null,

      issuedAt:
        evaluated
          .issuedAt ||
        statusList
          .issued_at ||
        null,

      nextUpdate:
        evaluated
          .nextUpdate ||
        statusList
          .next_update ||
        null,

      reason,
    };
  };

const verifyCredentialState =
  async ({
    credential,
    certificateHash,
    verificationTime =
      new Date(),
  }) => {
    const now =
      verificationTime
        instanceof Date
        ? verificationTime
        : new Date(
            verificationTime
          );

    const proof =
      credential
        ? evaluateCredentialProof(
            credential
          )
        : {
            mode:
              "unknown",

            structured:
              false,

            signatureValid:
              null,

            commitmentMatchesStored:
              null,

            anchorHash:
              certificateHash,
          };

    const anchorHash =
      proof.anchorHash ||
      certificateHash;

    const blockchain =
      await verifyCredentialOnChain(
        anchorHash
      );

    const ipfsAvailable =
      credential
        ? await safeIpfsAvailability(
            credential
              .ipfs_cid
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

    const issuerMatchesAnchor =
      proof.structured
        ? Boolean(
            blockchain.exists &&
            walletsMatch(
              blockchain.issuer,
              credential
                .issuer_wallet
            )
          )
        : null;

    const anchorMatch =
      proof.structured
        ? Boolean(
            proof
              .commitmentMatchesStored &&
            blockchain.exists &&
            issuerMatchesAnchor
          )
        : Boolean(
            blockchain.exists
          );

    let lifecycle =
      emptyLifecycle(
        credential
      );

    /*
     * Only an otherwise valid active structured credential
     * needs a status-list freshness lookup.
     */
    if (
      credential &&
      proof.structured &&
      credential.status ===
        "active" &&
      proof.signatureValid ===
        true &&
      anchorMatch &&
      !(
        accreditation.checked &&
        accreditation
          .validAtAwardDate ===
          false
      )
    ) {
      lifecycle =
        await evaluateLifecycleStatus(
          credential,
          now
        );
    }

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
      proof.structured &&
      proof.signatureValid !==
        true
    ) {
      result =
        "SIGNATURE_INVALID";
    } else if (
      proof.structured &&
      !anchorMatch
    ) {
      result =
        "ANCHOR_MISMATCH";
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
      proof.structured &&
      lifecycle
        .freshnessChecked &&
      lifecycle.fresh !==
        true
    ) {
      result =
        "STATUS_INDETERMINATE";
    } else if (
      proof.structured &&
      lifecycle.revoked ===
        true
    ) {
      result =
        "REVOKED";
    } else if (
      credential.status ===
        "active" &&
      anchorMatch &&
      !blockchain.revoked &&
      credential.ipfs_cid &&
      credential.blockchain_tx &&
      (
        !proof.structured ||
        lifecycle.fresh ===
          true
      )
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

              proofVersion:
                credential
                  .proof_version ||
                "legacy-v1",

              statusListIndex:
                credential
                  .status_list_index ??
                null,

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

        issuer:
          blockchain.issuer ||
          null,

        confirmed:
          blockchain.exists,

        anchorHash,

        anchorMatch,
      },

      proof: {
        version:
          proof.mode,

        signatureValid:
          proof
            .signatureValid,

        commitmentMatchesStored:
          proof
            .commitmentMatchesStored,

        issuerMatchesAnchor,

        storedCommitment:
          proof
            .storedCommitment ||
          null,

        recomputedCommitment:
          proof
            .recomputedCommitment ||
          null,

        canonicalisation:
          proof
            .canonicalisation ||
          null,

        hashAlgorithm:
          proof
            .hashAlgorithm ||
          null,

        proofType:
          proof
            .proofType ||
          null,
      },

      lifecycle,

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
        now.toISOString(),
    };
  };

module.exports = {
  verifyCredentialState,
  evaluateCredentialProof,
  evaluateLifecycleStatus,
};