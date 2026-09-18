const {
  createAccreditation,
  getAccreditationById,
  listAccreditations,
  updateAccreditationStatus,
} = require(
  "../models/accreditationModel"
);

const {
  getInstitutionById,
} = require(
  "../models/institutionModel"
);

const {
  createAuditLog,
} = require(
  "../models/auditModel"
);

const auditContext = (
  req
) => ({
  userId:
    req.user?.userId,

  ipAddress:
    req.ip,

  userAgent:
    req.get?.(
      "user-agent"
    ) || null,
});

const create = async (
  req,
  res
) => {
  try {
    const {
      institutionId,
      programme,
      validFrom,
      validTo,
      status = "accredited",
    } = req.body;

    const institution =
      await getInstitutionById(
        institutionId
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

    const accreditation =
      await createAccreditation({
        institutionId,
        programme:
          programme || null,
        validFrom,
        validTo:
          validTo || null,
        status,
        sourceLabel:
          "SIMULATED_REGULATOR",
        createdBy:
          req.user.userId,
      });

    await createAuditLog({
      ...auditContext(req),

      institutionId,

      action:
        "ACCREDITATION_RECORD_CREATED",

      entityType:
        "institution_accreditation",

      entityId:
        accreditation.id,

      details: {
        programme:
          accreditation.programme,

        validFrom:
          accreditation.valid_from,

        validTo:
          accreditation.valid_to,

        status:
          accreditation.status,

        sourceLabel:
          accreditation.source_label,
      },
    });

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Simulated regulator accreditation record created.",

        accreditation,
      });
  } catch (error) {
    require(
      "../utils/logger"
    ).log(
      "error",
      "accreditation_creation_failed",
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
          "Failed to create accreditation record.",
      });
  }
};

const list = async (
  req,
  res
) => {
  try {
    let institutionId =
      req.query.institutionId ||
      null;

    if (
      req.user.role !==
      "super_admin"
    ) {
      if (
        institutionId &&
        institutionId !==
          req.user.institutionId
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "You cannot view accreditation records for another institution.",
          });
      }

      institutionId =
        req.user.institutionId;
    }

    const result =
      await listAccreditations({
        institutionId,

        status:
          req.query.status ||
          null,

        limit:
          Number(
            req.query.limit
          ),

        offset:
          Number(
            req.query.offset
          ),
      });

    return res
      .status(200)
      .json({
        success: true,
        total:
          result.total,
        accreditations:
          result.rows,
      });
  } catch (error) {
    require(
      "../utils/logger"
    ).log(
      "error",
      "accreditation_listing_failed",
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
          "Failed to retrieve accreditation records.",
      });
  }
};

const changeStatus = async (
  req,
  res
) => {
  try {
    const existing =
      await getAccreditationById(
        req.params.id
      );

    if (!existing) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Accreditation record not found.",
        });
    }

    const accreditation =
      await updateAccreditationStatus(
        existing.id,
        req.body.status
      );

    await createAuditLog({
      ...auditContext(req),

      institutionId:
        existing.institution_id,

      action:
        "ACCREDITATION_STATUS_CHANGED",

      entityType:
        "institution_accreditation",

      entityId:
        existing.id,

      details: {
        previousStatus:
          existing.status,

        newStatus:
          accreditation.status,
      },
    });

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Accreditation status updated.",

        accreditation,
      });
  } catch (error) {
    require(
      "../utils/logger"
    ).log(
      "error",
      "accreditation_status_update_failed",
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
          "Failed to update accreditation status.",
      });
  }
};

module.exports = {
  create,
  list,
  changeStatus,
};