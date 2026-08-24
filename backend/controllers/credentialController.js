const fs = require("fs");

const {
  createCredential,
  createProcessingCredential,
  updateCredentialIpfsData,
  markCredentialFailed,
  activateCredential,
  markCredentialRevoked,
  updateCredentialQrCodePath,
  getCredentialById,
  getAllCredentials,
  getCredentialsByInstitution,
  findCredentialByHash,
} = require("../models/credentialModel");

const {
  getStudentById,
} = require("../models/studentModel");

const {
  getInstitutionById,
} = require("../models/institutionModel");

const {
  generateFileHash,
} = require("../utils/fileHash");

const { uploadFileToIPFS } = require("../services/ipfsService");
const { issueCredentialOnChain, revokeCredentialOnChain } = require("../services/blockchainService");
const { createAuditLog } = require("../models/auditModel");
const { generateCredentialQrCode } = require("../services/qrCodeService");
const { generatePresentationCertificate } = require("../services/certificatePdfService");

const removeTemporaryFile = async (filePath) => {
  if (!filePath) return;
  await fs.promises.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") {
      require("../utils/logger").log("error", "certificate_cleanup_failed", { errorCode: error.code || "CLEANUP_ERROR" });
    }
  });
};

const requestAuditContext = (req) => ({
  userId: req.user?.userId,
  ipAddress: req.ip,
  userAgent: req.get?.("user-agent") || null,
});

const safeProcessingError = (error) => {
  const allowedCodes = new Set([
    "IPFS_CONFIGURATION_ERROR",
    "IPFS_TIMEOUT",
    "IPFS_UNAVAILABLE",
    "IPFS_INVALID_CID",
    "IPFS_NOT_PINNED",
    "BLOCKCHAIN_CONFIGURATION_ERROR",
    "BLOCKCHAIN_UNAVAILABLE",
    "BLOCKCHAIN_WRONG_NETWORK",
    "BLOCKCHAIN_PAUSED",
    "BLOCKCHAIN_ISSUER_UNAUTHORISED",
    "BLOCKCHAIN_INSTITUTION_WALLET_MISMATCH",
    "BLOCKCHAIN_DUPLICATE_CREDENTIAL",
    "BLOCKCHAIN_CONFIRMATION_TIMEOUT",
    "BLOCKCHAIN_TRANSACTION_REVERTED",
    "BLOCKCHAIN_TRANSACTION_REJECTED",
    "BLOCKCHAIN_RECONCILIATION_REQUIRED",
  ]);
  return allowedCodes.has(error.code)
    ? error.code
    : "CREDENTIAL_PROCESSING_FAILED";
};

const hasPdfSignature = async (filePath) => {
  const handle = await fs.promises.open(filePath, "r");

  try {
    const signature = Buffer.alloc(4);
    const { bytesRead } = await handle.read(signature, 0, 4, 0);
    return bytesRead === 4 && signature.toString("ascii") === "%PDF";
  } finally {
    await handle.close();
  }
};

const issueCredential = async (req, res) => {
  let credential;
  try {
    const {
      studentId,
      institutionId,
      qualification,
      issueDate,
    } = req.body || {};

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A certificate PDF is required.",
      });
    }

    if (
      !studentId ||
      !institutionId ||
      !qualification ||
      !issueDate
    ) {
      await removeTemporaryFile(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          "Student ID, institution ID, qualification and issue date are required.",
      });
    }

    const student = await getStudentById(studentId);

    if (!student) {
      await removeTemporaryFile(req.file.path);

      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (
      student.institution_id !== institutionId
    ) {
      await removeTemporaryFile(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          "The selected student does not belong to the selected institution.",
      });
    }

    if (
      req.user.role !== "super_admin" &&
      req.user.institutionId !== institutionId
    ) {
      await removeTemporaryFile(req.file.path);

      return res.status(403).json({
        success: false,
        message:
          "You cannot issue credentials for another institution.",
      });
    }

    const institution = await getInstitutionById(institutionId);

    if (!institution) {
      await removeTemporaryFile(req.file.path);
      return res.status(404).json({
        success: false,
        message: "Institution not found.",
      });
    }

    if (!institution.status) {
      await removeTemporaryFile(req.file.path);
      return res.status(422).json({
        success: false,
        message: "Credentials cannot be issued by an inactive institution.",
      });
    }

    if (!(await hasPdfSignature(req.file.path))) {
      await removeTemporaryFile(req.file.path);
      return res.status(422).json({
        success: false,
        message: "The uploaded file does not contain a valid PDF signature.",
      });
    }

    const certificateHash =
      await generateFileHash(req.file.path);

    const duplicateCredential = await findCredentialByHash(certificateHash);
    if (duplicateCredential) {
      await removeTemporaryFile(req.file.path);
      return res.status(409).json({
        success: false,
        message: "This exact certificate has already been registered.",
      });
    }

    credential = await createProcessingCredential({
      studentId,
      institutionId,
      qualification,
      issueDate,
      certificateHash,
      createdBy: req.user.userId,
    });
    await createAuditLog({ ...requestAuditContext(req), institutionId, action: "CREDENTIAL_PROCESSING_STARTED", entityType: "credential", entityId: credential.id, details: { status: "processing" } });
    await createAuditLog({ ...requestAuditContext(req), institutionId, action: "CERTIFICATE_HASH_GENERATED", entityType: "credential", entityId: credential.id, details: { algorithm: "SHA-256", certificateHash } });

    const ipfsResult = await uploadFileToIPFS(req.file.path, {
      credentialId: credential.id,
      institutionId,
      studentNumber: student.student_number,
      qualification,
      issueDate,
      certificateHash,
    });

    credential = await updateCredentialIpfsData(credential.id, ipfsResult.cid);
    await createAuditLog({
      ...requestAuditContext(req),
      action: "ipfs_upload_success",
      entityType: "credential",
      entityId: credential.id,
      details: {
        provider: ipfsResult.provider,
        cid: ipfsResult.cid,
        certificateHash,
      },
    });

    const blockchainResult = await issueCredentialOnChain(certificateHash, {
      expectedInstitutionWallet: institution.wallet_address,
      onSubmitted: ({ transactionHash }) => createAuditLog({
        ...requestAuditContext(req),
        action: "blockchain_transaction_submitted",
        entityType: "credential",
        entityId: credential.id,
        details: { transactionHash },
      }),
    });

    await createAuditLog({
      ...requestAuditContext(req),
      action: "blockchain_transaction_confirmed",
      entityType: "credential",
      entityId: credential.id,
      details: {
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        network: blockchainResult.network,
      },
    });

    const activeCredential = await activateCredential(credential.id, blockchainResult);
    if (!activeCredential) {
      const recoveryError = new Error("Confirmed blockchain proof requires database reconciliation.");
      recoveryError.code = "BLOCKCHAIN_RECONCILIATION_REQUIRED";
      recoveryError.statusCode = 500;
      recoveryError.transactionHash = blockchainResult.transactionHash;
      throw recoveryError;
    }
    credential = activeCredential;

    let qrCode = null;
    try {
      const generatedQr = await generateCredentialQrCode(credential.public_token);
      const qrCredential = await updateCredentialQrCodePath(credential.id, generatedQr.storedPath);
      credential = { ...credential, ...qrCredential };
      qrCode = { path: generatedQr.storedPath, verificationUrl: generatedQr.verificationUrl };
      await createAuditLog({
        ...requestAuditContext(req), institutionId, action: "QR_GENERATED",
        entityType: "credential", entityId: credential.id,
        details: { path: generatedQr.storedPath },
      });
    } catch (qrError) {
      // The immutable credential proof is already active. A presentation-asset
      // failure must be recoverable and must never downgrade that proof.
      await createAuditLog({
        ...requestAuditContext(req), action: "credential_qr_generation_failed",
        entityType: "credential", entityId: credential.id,
        details: { errorCode: qrError.code || "QR_GENERATION_FAILED" },
      }).catch(() => {});
    }

    await createAuditLog({
      ...requestAuditContext(req),
      action: "credential_activated",
      entityType: "credential",
      entityId: credential.id,
      details: { transactionHash: blockchainResult.transactionHash },
    });
    await removeTemporaryFile(req.file.path);

    return res.status(201).json({
      success: true,
      message:
        "Credential issued successfully with confirmed blockchain proof.",
      credential,
      ipfs: ipfsResult,
      blockchain: blockchainResult,
      qrCode,
      file: {
        originalName: req.file.originalname,
        size: req.file.size,
        hashAlgorithm: "SHA-256",
        certificateHash,
      },
    });
  } catch (error) {
    console.error("Credential issuance error:", error.code || error.name);

    await removeTemporaryFile(req.file?.path);

    if (credential?.id) {
      const processingError = safeProcessingError(error);
      await markCredentialFailed(credential.id, processingError).catch((databaseError) => {
        require("../utils/logger").log("error", "credential_status_update_failed", { errorCode: databaseError.code || "DATABASE_ERROR" });
      });
      const auditContext = requestAuditContext(req);
      await Promise.allSettled([
        createAuditLog({
          ...auditContext,
          action: "ipfs_upload_failure",
          entityType: "credential",
          entityId: credential.id,
          details: { errorCode: processingError },
        }),
        createAuditLog({
          ...auditContext,
          action: "CREDENTIAL_FAILED",
          entityType: "credential",
          entityId: credential.id,
          details: { errorCode: processingError },
        }),
        ...(error.code?.startsWith("BLOCKCHAIN")
          ? [createAuditLog({
              ...auditContext,
              action: error.code === "BLOCKCHAIN_RECONCILIATION_REQUIRED"
                ? "blockchain_reconciliation_required"
                : "blockchain_transaction_failed",
              entityType: "credential",
              entityId: credential.id,
              details: {
                errorCode: processingError,
                transactionHash: error.transactionHash || null,
              },
            })]
          : []),
      ]);
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "This exact certificate has already been registered.",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message:
          "The student, institution or issuing user is invalid.",
      });
    }

    const isBlockchainError = error.code?.startsWith("BLOCKCHAIN");
    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        isBlockchainError && error.statusCode === 403
          ? "The configured institution wallet is not authorised for blockchain issuance."
          : isBlockchainError && error.statusCode === 409
            ? "This credential proof already exists on the blockchain."
            : isBlockchainError && error.statusCode === 504
              ? "Blockchain confirmation timed out; reconciliation is required."
              : isBlockchainError && error.statusCode === 503
                ? "The blockchain network is temporarily unavailable."
                : error.statusCode === 502
          ? "The certificate storage provider rejected the upload."
          : error.statusCode === 503
            ? "Certificate storage is temporarily unavailable."
            : "Failed to issue credential.",
    });
  }
};

const listCredentials = async (req, res) => {
  try {
    let result;
    const { paginationFromQuery, buildPaginationMetadata } = require("../utils/pagination"); const { normaliseSearchTerm, escapeLikePattern, validateSortOrder } = require("../utils/queryHelpers");
    const paging = paginationFromQuery(req.query); const search = normaliseSearchTerm(req.query.search); const requestedInstitution = req.query.institutionId || null;
    if (req.user.role !== "super_admin" && requestedInstitution && requestedInstitution !== req.user.institutionId) return res.status(403).json({ success: false, message: "You cannot query credentials from another institution.", code: "ACCESS_DENIED" });
    const options = { ...paging, studentId: req.query.studentId || null, search: search ? `%${escapeLikePattern(search)}%` : null, status: req.query.status || null, issueDateFrom: req.query.issueDateFrom || null, issueDateTo: req.query.issueDateTo || null, sortBy: req.query.sortBy || "created_at", sortOrder: validateSortOrder(req.query.sortOrder) };

    if (req.user.role === "super_admin") {
      result = requestedInstitution ? await getCredentialsByInstitution(requestedInstitution, options) : await getAllCredentials(options);
    } else {
      result =
        await getCredentialsByInstitution(
          req.user.institutionId, options
        );
    }
    const credentials = Array.isArray(result) ? result : result.rows; const total = Array.isArray(result) ? result.length : result.total;

    return res.status(200).json({
      success: true,
      total,
      credentials,
      pagination: buildPaginationMetadata({ page: paging.page, limit: paging.limit, total }),
    });
  } catch (error) {
    require("../utils/logger").log("error", "credential_listing_failed", { errorCode: error.code || "DATABASE_ERROR" });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve credentials.",
    });
  }
};

const getOneCredential = async (req, res) => {
  try {
    const credential = await getCredentialById(
      req.params.id
    );

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "Credential not found.",
      });
    }

    if (
      req.user.role !== "super_admin" &&
      req.user.institutionId !==
        credential.institution_id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot view credentials from another institution.",
      });
    }

    return res.status(200).json({
      success: true,
      credential,
    });
  } catch (error) {
    require("../utils/logger").log("error", "credential_retrieval_failed", { errorCode: error.code || "DATABASE_ERROR" });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve credential.",
    });
  }
};

const revokeCredential = async (req, res) => {
  const credentialId = req.params.id;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(credentialId)) return res.status(400).json({ success: false, message: "Credential ID is invalid." });
  if (reason.length < 5 || reason.length > 1000) return res.status(400).json({ success: false, message: "A revocation reason between 5 and 1000 characters is required." });

  let credential;
  let blockchainResult;
  try {
    credential = await getCredentialById(credentialId);
    if (!credential) return res.status(404).json({ success: false, message: "Credential not found." });
    if (req.user.role !== "super_admin" && req.user.institutionId !== credential.institution_id) {
      return res.status(403).json({ success: false, message: "You cannot revoke credentials from another institution." });
    }
    if (credential.status === "revoked") return res.status(409).json({ success: false, message: "Credential is already revoked." });
    if (credential.status !== "active") return res.status(409).json({ success: false, message: "Only active credentials can be revoked." });

    blockchainResult = await revokeCredentialOnChain(credential.certificate_hash, {
      onSubmitted: ({ transactionHash }) => createAuditLog({
        ...requestAuditContext(req), action: "credential_revocation_submitted",
        entityType: "credential", entityId: credential.id, details: { transactionHash },
      }),
    });
    const revokedCredential = await markCredentialRevoked(credential.id, {
      revokedBy: req.user.userId, reason, transactionHash: blockchainResult.transactionHash,
    });
    if (!revokedCredential) {
      const recoveryError = new Error("Confirmed revocation requires database reconciliation.");
      recoveryError.code = "BLOCKCHAIN_REVOCATION_RECONCILIATION_REQUIRED";
      recoveryError.statusCode = 500;
      throw recoveryError;
    }
    await createAuditLog({
      ...requestAuditContext(req), institutionId: credential.institution_id, action: "CREDENTIAL_REVOKED", entityType: "credential",
      entityId: credential.id, details: { transactionHash: blockchainResult.transactionHash, reason },
    });
    return res.status(200).json({ success: true, message: "Credential revoked successfully with confirmed blockchain proof.", credential: revokedCredential, blockchain: blockchainResult });
  } catch (error) {
    const reconciliationRequired = Boolean(blockchainResult?.confirmed) || error.code === "BLOCKCHAIN_REVOCATION_RECONCILIATION_REQUIRED";
    await createAuditLog({
      ...requestAuditContext(req),
      action: reconciliationRequired ? "credential_revocation_reconciliation_required" : "credential_revocation_failed",
      entityType: "credential", entityId: credential?.id || null,
      details: { errorCode: error.code || "CREDENTIAL_REVOCATION_FAILED", transactionHash: blockchainResult?.transactionHash || error.transactionHash || null },
    }).catch((auditError) => console.error("Revocation audit failed:", auditError.message));
    return res.status(error.statusCode || 500).json({
      success: false,
      message: reconciliationRequired
        ? "Blockchain revocation was confirmed but database reconciliation is required."
        : error.statusCode === 503
          ? "The blockchain network is temporarily unavailable; the credential remains active."
          : error.statusCode === 409
            ? "The on-chain credential cannot be revoked in its current state."
            : "Failed to revoke credential; the database record remains unchanged.",
    });
  }
};

const generateCredentialPdf = async (req, res) => {
  try {
    const credential = await getCredentialById(req.params.id);
    if (!credential) return res.status(404).json({ success: false, message: "Credential not found." });
    if (req.user.role !== "super_admin" && req.user.institutionId !== credential.institution_id) return res.status(403).json({ success: false, message: "You cannot generate certificates for another institution." });
    if (!["active", "revoked"].includes(credential.status)) return res.status(409).json({ success: false, message: "Only active or revoked credentials have presentation certificates." });
    const pdf = await generatePresentationCertificate(credential);
    await createAuditLog({ ...requestAuditContext(req), institutionId: credential.institution_id, action: "CERTIFICATE_PDF_GENERATED", entityType: "credential", entityId: credential.id, details: { status: credential.status } });
    return res.status(200).json({ success: true, message: "Presentation certificate generated.", pdf: { filename: require("path").basename(pdf.outputPath), verificationUrl: pdf.verificationUrl, status: pdf.status } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to generate presentation certificate." });
  }
};

const downloadCredentialPdf = async (req, res) => {
  try {
    const credential = await getCredentialById(req.params.id);
    if (!credential) return res.status(404).json({ success: false, message: "Credential not found." });
    if (req.user.role !== "super_admin" && req.user.institutionId !== credential.institution_id) return res.status(403).json({ success: false, message: "You cannot download certificates from another institution." });
    if (!["active", "revoked"].includes(credential.status)) return res.status(404).json({ success: false, message: "Presentation certificate is unavailable." });
    const path = require("path");
    const directory = path.resolve(__dirname, "../../output/pdf");
    const filename = `credential-${credential.id}.pdf`;
    const filePath = path.resolve(directory, filename);
    if (path.dirname(filePath) !== directory || path.extname(filePath).toLowerCase() !== ".pdf") return res.status(404).json({ success: false, message: "Presentation certificate is unavailable." });
    await fs.promises.access(filePath, fs.constants.R_OK);
    res.status(200); res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await createAuditLog({ ...requestAuditContext(req), institutionId: credential.institution_id, action: "CREDENTIAL_PDF_DOWNLOADED", entityType: "credential", entityId: credential.id, details: { artifact: "generated_presentation_pdf" } });
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ success: false, message: "Presentation certificate is unavailable." });
    require("../utils/logger").log("error", "credential_pdf_download_failed", { errorCode: error.code || "PDF_DOWNLOAD_FAILED" });
    return res.status(500).json({ success: false, message: "Failed to download presentation certificate." });
  }
};

module.exports = {
  issueCredential,
  listCredentials,
  getOneCredential,
  revokeCredential,
  generateCredentialPdf,
  downloadCredentialPdf,
};
