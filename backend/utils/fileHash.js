const crypto = require("crypto");
const fs = require("fs");

const generateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const fileStream = fs.createReadStream(filePath);

    fileStream.on("data", (chunk) => {
      hash.update(chunk);
    });

    fileStream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    fileStream.on("error", (error) => {
      reject(error);
    });
  });
};

module.exports = {
  generateFileHash,
};