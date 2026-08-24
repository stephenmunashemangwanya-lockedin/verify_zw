const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { getPublicVerificationUrl } = require("./qrCodeService");

const safeText = (value) => String(value ?? "Not available").replace(/[\r\n\t]+/g, " ").slice(0, 500);

const generatePresentationCertificate = async (credential, { outputDirectory } = {}) => {
  if (!credential?.id || !credential?.public_token) throw Object.assign(new Error("Credential presentation data is incomplete."), { code: "PDF_INVALID_CREDENTIAL" });
  const directory = outputDirectory || path.resolve(__dirname, "../../output/pdf");
  await fs.promises.mkdir(directory, { recursive: true });
  const outputPath = path.join(directory, `credential-${credential.id}.pdf`);
  const verificationUrl = getPublicVerificationUrl(credential.public_token);
  const qrBuffer = await QRCode.toBuffer(verificationUrl, { type: "png", width: 260, margin: 1 });

  await new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", layout: "landscape", margin: 52, info: { Title: "Skill Verification Certificate" } });
    const stream = fs.createWriteStream(outputPath, { flags: "w" });
    stream.on("finish", resolve); stream.on("error", reject); document.on("error", reject); document.pipe(stream);
    document.rect(24, 24, 793, 547).lineWidth(3).stroke("#16324F");
    document.font("Helvetica-Bold").fontSize(27).fillColor("#16324F").text("CERTIFICATE OF QUALIFICATION", { align: "center" });
    document.moveDown(0.7).font("Helvetica").fontSize(13).fillColor("#333333").text("This presentation certificate confirms that", { align: "center" });
    document.moveDown(0.5).font("Helvetica-Bold").fontSize(23).text(safeText(credential.student_name), { align: "center" });
    document.moveDown(0.5).font("Helvetica").fontSize(13).text("was awarded", { align: "center" });
    document.moveDown(0.4).font("Helvetica-Bold").fontSize(20).text(safeText(credential.qualification), { align: "center" });
    document.moveDown(0.7).font("Helvetica").fontSize(12).text(`by ${safeText(credential.institution_name)} on ${safeText(credential.issue_date)}`, { align: "center" });
    document.image(qrBuffer, 650, 345, { width: 105 });
    document.fontSize(8).fillColor("#333333").text("Scan to verify", 650, 455, { width: 105, align: "center" });
    document.fontSize(9).text(`Credential ID: ${safeText(credential.id)}`, 62, 405);
    document.text(`Blockchain transaction: ${safeText(credential.blockchain_tx)}`, 62, 425, { width: 560 });
    document.text(`Verification URL: ${verificationUrl}`, 62, 445, { width: 560 });
    if (credential.status === "revoked") {
      document.save().rotate(-20, { origin: [420, 300] }).font("Helvetica-Bold").fontSize(72).fillColor("#B00020").opacity(0.28).text("REVOKED", 210, 250, { width: 420, align: "center" }).restore();
      document.opacity(1).fontSize(10).fillColor("#B00020").text(`Revoked: ${safeText(credential.revocation_reason)}`, 62, 475, { width: 560 });
    }
    document.end();
  });
  return { outputPath, verificationUrl, status: credential.status };
};

module.exports = { generatePresentationCertificate };
