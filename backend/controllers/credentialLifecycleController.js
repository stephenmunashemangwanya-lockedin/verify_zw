const {
  getCredentialById,
  markCredentialSuperseded,
} = require("../models/credentialModel");

const {
  getInstitutionById,
} = require("../models/institutionModel");

const {
  publishStatusListForInstitution,
} = require("../services/statusListPublisherService");

const {
  createAuditLog,
} = require("../models/auditModel");

const requestAuditContext =
  (req) => ({
    userId:
      req.user?.userId,

    ipAddress:
      req.ip,

    userAgent:
      req.get?.(
        "user-agent"
      ) || null,
  });

const supersedeCredential =
  async (req, res) => {
    const credentialId =
      req.params.id;

    const {
      replacementCredentialId,
      reason,
    } = req.body;

    try {
      if (
        credentialId ===
        replacementCredentialId
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A credential cannot supersede itself.",
          });
      }

      const original =
        await getCredentialById(
          credentialId
        );

      if (!original) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Original credential not found.",
          });
      }

      if (
        req.user.role !==
          "super_admin" &&
        req.user.institutionId !==
          original.institution_id
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You cannot correct credentials from another institution.",
          });
      }

      if (
        original.status !==
        "active"
      ) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              "Only an active credential can be superseded.",
          });
      }

      const replacement =
        await getCredentialById(
          replacementCredentialId
        );

      if (!replacement) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Replacement credential not found.",
          });
      }

      if (
        replacement.status !==
        "active"
      ) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              "The replacement credential must be active.",
          });
      }

      if (
        replacement.institution_id !==
        original.institution_id
      ) {
        return res
          .status(422)
          .json({
            success: false,

            message:
              "The original and replacement credentials must belong to the same institution.",
          });
      }

      if (
        replacement.student_id !==
        original.student_id
      ) {
        return res
          .status(422)
          .json({
            success: false,

            message:
              "The replacement credential must belong to the same student.",
          });
      }

      const institution =
        await getInstitutionById(
          original.institution_id
        );

      if (!institution) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Institution not found.",
          });
      }

      if (!institution.status) {
        return res
          .status(422)
          .json({
            success: false,

            message:
              "An inactive institution cannot correct credentials.",
          });
      }

      const superseded =
        await markCredentialSuperseded(
          original.id,
          {
            replacementCredentialId:
              replacement.id,

            reason,
          }
        );

      if (!superseded) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              "Credential could not be superseded because its lifecycle state changed.",
          });
      }

      /*
       * A superseded credential must no longer be treated
       * as current. Structured-v2 credentials therefore
       * add the old status-list index to the issuer's
       * signed lifecycle artefact.
       */
      if (
        original.proof_version ===
          "structured-v2" &&
        original.status_list_index !==
          null &&
        original.status_list_index !==
          undefined
      ) {
        try {
          const statusList =
            await publishStatusListForInstitution({
              institutionId:
                original.institution_id,

              institutionWallet:
                institution
                  .wallet_address,

              revokeIndex:
                original
                  .status_list_index,
            });

          await createAuditLog({
            ...requestAuditContext(
              req
            ),

            institutionId:
              original
                .institution_id,

            action:
              "STATUS_LIST_PUBLISHED_ON_SUPERSESSION",

            entityType:
              "credential",

            entityId:
              original.id,

            details: {
              version:
                statusList.version,

              statusListIndex:
                original
                  .status_list_index,

              replacementCredentialId:
                replacement.id,

              commitment:
                statusList
                  .commitment,

              transactionHash:
                statusList
                  .blockchain_tx ||
                null,
            },
          });
        } catch (
          statusListError
        ) {
          await createAuditLog({
            ...requestAuditContext(
              req
            ),

            institutionId:
              original
                .institution_id,

            action:
              "STATUS_LIST_PUBLICATION_FAILED",

            entityType:
              "credential",

            entityId:
              original.id,

            details: {
              phase:
                "supersession",

              replacementCredentialId:
                replacement.id,

              errorCode:
                statusListError
                  .code ||
                "STATUS_LIST_PUBLICATION_FAILED",
            },
          }).catch(
            () => {}
          );
        }
      }

      await createAuditLog({
        ...requestAuditContext(
          req
        ),

        institutionId:
          original
            .institution_id,

        action:
          "CREDENTIAL_SUPERSEDED",

        entityType:
          "credential",

        entityId:
          original.id,

        details: {
          replacementCredentialId:
            replacement.id,

          reason,
        },
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Credential superseded successfully.",

          credential:
            superseded,

          replacement: {
            id:
              replacement.id,

            status:
              replacement.status,

            qualification:
              replacement
                .qualification,

            issueDate:
              replacement
                .issue_date,

            awardDate:
              replacement
                .award_date,
          },
        });
    } catch (error) {
      require(
        "../utils/logger"
      ).log(
        "error",
        "credential_supersession_failed",
        {
          errorCode:
            error.code ||
            "DATABASE_ERROR",
        }
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Failed to supersede credential.",
        });
    }
  };

module.exports = {
  supersedeCredential,
};