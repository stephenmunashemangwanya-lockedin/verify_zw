const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(
  __dirname,
  "..",
  "uploads",
  "certificates-temp"
);

// Use a dedicated temporary directory. The repository contains a legacy
// zero-byte file named `certificates`, so treating that path as a directory
// would make real Multer writes fail with ENOTDIR.
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const uniqueName = `${require("crypto").randomUUID()}.pdf`;

    callback(null, uniqueName);
  },
});

const fileFilter = (req, file, callback) => {
  const isPdfMimeType =
    file.mimetype === "application/pdf";

  const isPdfExtension =
    path.extname(file.originalname).toLowerCase() ===
    ".pdf";

  // Reject misleading names such as certificate.exe.pdf and any path-like input.
  const baseName = path.basename(file.originalname);
  const isSafeName = baseName === file.originalname &&
    /^[^\x00-\x1f\x7f/\\]+\.pdf$/i.test(baseName) &&
    baseName.slice(0, -4).indexOf(".") === -1;

  if (!isPdfMimeType || !isPdfExtension || !isSafeName) {
    return callback(
      new Error("Only PDF certificate files are allowed.")
    );
  }

  callback(null, true);
};

const configuredLimit = process.env.CERTIFICATE_MAX_SIZE_MB || process.env.MAX_CERTIFICATE_SIZE_MB || 10;
const certificateFileSizeLimit = Number(configuredLimit) * 1024 * 1024;

const uploadCertificate = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: certificateFileSizeLimit,
  },
});

const verificationFileSizeLimit = Number(process.env.VERIFICATION_FILE_MAX_SIZE_MB || 10) * 1024 * 1024;
const uploadVerification = multer({ storage, fileFilter, limits: { fileSize: verificationFileSizeLimit } });

module.exports = {
  uploadCertificate,
  fileFilter,
  certificateFileSizeLimit,
  uploadDirectory,
  uploadVerification,
  verificationFileSizeLimit,
};
