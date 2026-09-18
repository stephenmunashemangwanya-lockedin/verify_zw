const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getPublicVerificationUrl = (publicToken) => {
  if (!UUID_PATTERN.test(publicToken || "")) {
    const error = new Error("Public verification token is invalid.");
    error.code = "QR_INVALID_PUBLIC_TOKEN";
    error.statusCode = 400;
    throw error;
  }

  let baseUrl;

  try {
    baseUrl = new URL(process.env.FRONTEND_PUBLIC_URL);
  } catch {
    const error = new Error(
      "FRONTEND_PUBLIC_URL must be a valid HTTP or HTTPS URL."
    );
    error.code = "QR_CONFIGURATION_ERROR";
    error.statusCode = 500;
    throw error;
  }

  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    const error = new Error(
      "FRONTEND_PUBLIC_URL must use HTTP or HTTPS."
    );
    error.code = "QR_CONFIGURATION_ERROR";
    error.statusCode = 500;
    throw error;
  }

  return `${baseUrl.toString().replace(/\/$/, "")}/verify/token/${publicToken}`;
};

const generateCredentialQrCode = async (
  publicToken,
  { outputDirectory } = {}
) => {
  const verificationUrl = getPublicVerificationUrl(publicToken);

  const directory =
    outputDirectory ||
    path.resolve(__dirname, "../../generated/qr");

  await fs.promises.mkdir(directory, { recursive: true });

  const absolutePath = path.join(
    directory,
    `${publicToken}.png`
  );

  await QRCode.toFile(
    absolutePath,
    verificationUrl,
    {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    }
  );

  return {
    verificationUrl,
    absolutePath,
    storedPath: outputDirectory
      ? absolutePath
      : path
          .relative(
            path.resolve(__dirname, "../.."),
            absolutePath
          )
          .replace(/\\/g, "/"),
  };
};

module.exports = {
  getPublicVerificationUrl,
  generateCredentialQrCode,
};