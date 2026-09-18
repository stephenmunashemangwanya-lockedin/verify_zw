const fs = require("fs");

const {
  getStudentById,
} = require("../models/studentModel");

const {
  findEffectiveAccreditation,
} = require("../models/accreditationModel");

const {
  createAuditLog,
} = require("../models/auditModel");

const cleanup = async (filePath) => {
  if (!filePath) return;

  await fs.promises.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") {
      require("../utils/logger").log(
        "error",
        "accreditation_rejection_file_cleanup_failed",
        {
          errorCode:
            error.code ||
            "CLEANUP_ERROR",
        }
      );
    }
  });
};

const requireAccreditationAtAwardDate =
  async (req, res, next) => {
    const {
      studentId,
      institutionId,
      awardDate,
      issueDate,
    } = req.body || {};

    /*
     * Leave ordinary request validation and existing
     * institution/student error handling to the established
     * validation/controller pipeline.
     */
    if (
      !studentId ||
      !institutionId ||
      !issueDate
    ) {
      return next();
    }

    /*
     * Do not reveal accreditation information for a foreign
     * institution. The existing controller will return the
     * established ACCESS_DENIED response.
     */
    if (
      req.user?.role !== "super_admin" &&
      req.user?.institutionId !== institutionId
    ) {
      return next();
    }

    try {
      const student =
        await getStudentById(studentId);

      if (
        !student ||
        student.institution_id !== institutionId ||
        !student.programme
      ) {
        return next();
      }

      const effectiveAwardDate =
        awardDate || issueDate;

      const accreditation =
        await findEffectiveAccreditation({
          institutionId,
          programme:
            student.programme,
          awardDate:
            effectiveAwardDate,
        });

      if (!accreditation) {
        await cleanup(
          req.file?.path
        );

        await createAuditLog({
          userId:
            req.user?.userId,

          institutionId,

          action:
            "CREDENTIAL_ISSUANCE_BLOCKED_ACCREDITATION",

          entityType:
            "institution_accreditation",

          entityId:
            null,

          details: {
            studentId,
            programme:
              student.programme,
            awardDate:
              effectiveAwardDate,
            decision:
              "ACCREDITATION_INVALID",
          },

          ipAddress:
            req.ip,

          userAgent:
            req.get?.(
              "user-agent"
            ) || null,
        }).catch(() => {});

        return res
          .status(422)
          .json({
            success: false,

            code:
              "ACCREDITATION_INVALID",

            message:
              "Credential issuance is not permitted because no valid accreditation record covers the student's programme on the award date.",
          });
      }

      /*
       * Attach the verified policy evidence to the request.
       * The issuance controller does not have to query the
       * regulator dataset again.
       */
      req.effectiveAwardDate =
        effectiveAwardDate;

      req.accreditationRecord =
        accreditation;

      return next();
    } catch (error) {
      await cleanup(
        req.file?.path
      );

      require("../utils/logger").log(
        "error",
        "credential_accreditation_check_failed",
        {
          errorCode:
            error.code ||
            "DATABASE_ERROR",
        }
      );

      return res
        .status(503)
        .json({
          success: false,

          code:
            "ACCREDITATION_CHECK_UNAVAILABLE",

          message:
            "Accreditation validation is temporarily unavailable.",
        });
    }
  };

module.exports = {
  requireAccreditationAtAwardDate,
};