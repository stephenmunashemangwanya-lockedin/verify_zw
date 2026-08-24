const {
  createInstitution,
  getAllInstitutions,
  getInstitutionById,
  updateInstitutionStatus,
} = require("../models/institutionModel");

const {
  authoriseInstitution,
  deactivateInstitution,
} = require("../services/blockchainService");
const { createAuditLog } = require("../models/auditModel");
const { paginationFromQuery, buildPaginationMetadata } = require("../utils/pagination");
const { normaliseSearchTerm, escapeLikePattern, statusBoolean, validateSortOrder } = require("../utils/queryHelpers");

const create = async (req, res) => {
  try {
    const {
      name,
      walletAddress,
      email,
      phone,
    } = req.body || {};

    if (!name || !walletAddress || !email) {
      return res.status(400).json({
        success: false,
        message:
          "Institution name, wallet address and email are required.",
      });
    }

    const institution = await createInstitution({
      name,
      walletAddress,
      email,
      phone,
    });
    await createAuditLog({ userId: req.user.userId, institutionId: institution.id, action: "INSTITUTION_CREATED", entityType: "institution", entityId: institution.id, details: {}, ipAddress: req.ip, userAgent: req.get?.("user-agent") || null });

    return res.status(201).json({
      success: true,
      message: "Institution created successfully.",
      institution,
    });
  } catch (error) {
    require("../utils/logger").log("error", "institution_creation_failed", { errorCode: error.code || "DATABASE_ERROR" });

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "An institution with that email or wallet address already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create institution.",
    });
  }
};

const list = async (req, res) => {
  try {
    const paging = paginationFromQuery(req.query); const search = normaliseSearchTerm(req.query.search);
    const result = await getAllInstitutions({ ...paging, search: search ? `%${escapeLikePattern(search)}%` : null, status: statusBoolean(req.query.status), sortBy: req.query.sortBy || "created_at", sortOrder: validateSortOrder(req.query.sortOrder) });
    const institutions = Array.isArray(result) ? result : result.rows; const total = Array.isArray(result) ? result.length : result.total;

    return res.status(200).json({
      success: true,
      total,
      institutions,
      pagination: buildPaginationMetadata({ page: paging.page, limit: paging.limit, total }),
    });
  } catch (error) {
    require("../utils/logger").log("error", "institution_listing_failed", { errorCode: error.code || "DATABASE_ERROR" });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve institutions.",
    });
  }
};

const getOne = async (req, res) => {
  try {
    const institution = await getInstitutionById(
      req.params.id
    );

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: "Institution not found.",
      });
    }

    return res.status(200).json({
      success: true,
      institution,
    });
  } catch (error) {
    require("../utils/logger").log("error", "institution_retrieval_failed", { errorCode: error.code || "DATABASE_ERROR" });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve institution.",
    });
  }
};

const changeStatus = async (req, res) => {
  try {
    const { status } = req.body || {};

    if (typeof status !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Status must be true or false.",
      });
    }

    const institution = await updateInstitutionStatus(
      req.params.id,
      status
    );

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: "Institution not found.",
      });
    }
    await createAuditLog({ userId: req.user.userId, institutionId: institution.id, action: status ? "INSTITUTION_ACTIVATED" : "INSTITUTION_DEACTIVATED", entityType: "institution", entityId: institution.id, details: {}, ipAddress: req.ip, userAgent: req.get?.("user-agent") || null });

    return res.status(200).json({
      success: true,
      message: `Institution ${
        status ? "activated" : "deactivated"
      } successfully.`,
      institution,
    });
  } catch (error) {
    require("../utils/logger").log("error", "institution_status_update_failed", { errorCode: error.code || "DATABASE_ERROR" });

    return res.status(500).json({
      success: false,
      message: "Failed to update institution status.",
    });
  }
};

const updateBlockchainAuthorisation = async (req, res, action) => {
  try {
    const institution = await getInstitutionById(req.params.id);
    if (!institution) {
      return res.status(404).json({ success: false, message: "Institution not found." });
    }
    if (action === "authorise" && !institution.status) {
      return res.status(422).json({ success: false, message: "An inactive institution cannot be authorised on-chain." });
    }

    const result = action === "authorise"
      ? await authoriseInstitution(institution.wallet_address)
      : await deactivateInstitution(institution.wallet_address);
    await createAuditLog({
      userId: req.user.userId,
      action: action === "authorise" ? "INSTITUTION_WALLET_AUTHORISED" : "INSTITUTION_WALLET_DEACTIVATED",
      entityType: "institution",
      entityId: institution.id,
      details: {
        walletAddress: institution.wallet_address,
        transactionHash: result.transactionHash || null,
        alreadyApplied: result.alreadyAuthorised || result.alreadyDeactivated || false,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      institutionId: institution.id,
    });
    return res.status(200).json({
      success: true,
      message: action === "authorise"
        ? "Institution blockchain wallet authorised successfully."
        : "Institution blockchain wallet deactivated successfully.",
      blockchain: result,
    });
  } catch (error) {
    console.error("Institution blockchain authorisation error:", error.code || error.name);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 503
        ? "The blockchain network is temporarily unavailable."
        : error.statusCode === 400
          ? "The institution wallet address is invalid."
          : "Institution blockchain authorisation failed.",
    });
  }
};

const authoriseOnBlockchain = (req, res) => updateBlockchainAuthorisation(req, res, "authorise");
const deactivateOnBlockchain = (req, res) => updateBlockchainAuthorisation(req, res, "deactivate");

module.exports = {
  create,
  list,
  getOne,
  changeStatus,
  authoriseOnBlockchain,
  deactivateOnBlockchain,
};
