const fs = require("fs");

const { generateFileHash } = require("../utils/fileHash");
const {
  findCredentialByHashForVerification,
  findCredentialByIdForVerification,
  findCredentialByPublicToken,
  createVerificationLog,
} = require("../models/verificationModel");
const { createAuditLog } = require("../models/auditModel");
const { verifyCredentialState } = require("../services/verificationService");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/i;

const cleanup = async (filePath) => {
  if (!filePath) return;
  await fs.promises.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") console.error("Verification file cleanup failed:", error.message);
  });
};

const hasPdfSignature = async (filePath) => {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const header = Buffer.alloc(4);
    const { bytesRead } = await handle.read(header, 0, 4, 0);
    return bytesRead === 4 && header.toString("ascii") === "%PDF";
  } finally {
    await handle.close();
  }
};

const context = (req) => ({
  verifierName: req.body?.verifierName,
  verifierEmail: req.body?.verifierEmail,
  ipAddress: req.ip,
  userAgent: req.get("user-agent") || null,
});

const logOutcome = async (req, method, hash, credential, result) => {
  await createVerificationLog({
    ...context(req),
    credentialId: credential?.id,
    resultCode: result,
    verificationMethod: method,
    uploadedHash: hash,
  });
  await createAuditLog({
    action: result === "SYSTEM_INCONSISTENCY"
      ? "verification_inconsistency"
      : result === "UNKNOWN"
        ? "unknown_certificate_checked"
        : "verification_completed",
    entityType: "credential",
    entityId: credential?.id,
    details: { method, result },
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || null,
  });
};

const verifyKnownHash = async (req, certificateHash, method, credential) => {
  const verification = await verifyCredentialState({ credential, certificateHash });
  await logOutcome(req, method, certificateHash, credential, verification.result);
  return verification;
};

const verifyFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "A certificate PDF is required.", code: "INVALID_FILE" });
  }
  try {
    if (!(await hasPdfSignature(req.file.path))) {
      await logOutcome(req, "file", null, null, "INVALID_FILE");
      return res.status(422).json({ success: false, message: "The uploaded file is not a valid PDF.", code: "INVALID_FILE" });
    }
    const hash = await generateFileHash(req.file.path);
    const credential = await findCredentialByHashForVerification(hash);
    const verification = await verifyKnownHash(req, hash, "file", credential);
    return res.status(200).json({ success: true, message: "Certificate verification completed.", data: verification });
  } catch (error) {
    console.error("Public file verification error:", error.code || error.name);
    return res.status(error.statusCode || 503).json({ success: false, message: "Certificate verification is temporarily unavailable.", code: error.code || "VERIFICATION_UNAVAILABLE" });
  } finally {
    await cleanup(req.file.path);
  }
};

const verifyHash = async (req, res) => {
  const hash = String(req.params.hash || "").toLowerCase();
  if (!HASH_PATTERN.test(hash)) {
    return res.status(400).json({ success: false, message: "Certificate hash must contain exactly 64 hexadecimal characters.", code: "INVALID_HASH" });
  }
  try {
    const credential = await findCredentialByHashForVerification(hash);
    const verification = await verifyKnownHash(req, hash, "hash", credential);
    return res.status(200).json({ success: true, message: "Certificate verification completed.", data: verification });
  } catch (error) {
    console.error("Public hash verification error:", error.code || error.name);
    return res.status(error.statusCode || 503).json({ success: false, message: "Certificate verification is temporarily unavailable.", code: error.code || "VERIFICATION_UNAVAILABLE" });
  }
};

const verifyLookup = (method, finder, parameterName) => async (req, res) => {
  const value = req.params[parameterName];
  if (!UUID_PATTERN.test(value || "")) {
    return res.status(400).json({ success: false, message: "A valid verification identifier is required.", code: "INVALID_IDENTIFIER" });
  }
  try {
    const credential = await finder(value);
    if (!credential) {
      await logOutcome(req, method, null, null, "UNKNOWN");
      return res.status(200).json({
        success: true,
        message: "Certificate verification completed.",
        data: { result: "UNKNOWN", credential: null, blockchain: { exists: false, revoked: false, confirmed: false }, ipfs: { cidPresent: false, available: null }, verificationTime: new Date().toISOString() },
      });
    }
    const verification = await verifyKnownHash(req, credential.certificate_hash, method, credential);
    return res.status(200).json({ success: true, message: "Certificate verification completed.", data: verification });
  } catch (error) {
    console.error(`Public ${method} verification error:`, error.code || error.name);
    return res.status(error.statusCode || 503).json({ success: false, message: "Certificate verification is temporarily unavailable.", code: error.code || "VERIFICATION_UNAVAILABLE" });
  }
};

const verifyCredentialId = verifyLookup("credential_id", findCredentialByIdForVerification, "id");
const verifyPublicToken = verifyLookup("public_token", findCredentialByPublicToken, "publicToken");

module.exports = {
  verifyFile,
  verifyHash,
  verifyCredentialId,
  verifyPublicToken,
};
