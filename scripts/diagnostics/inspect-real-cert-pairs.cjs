const fs = require("fs");
const path = require("path");

const {
  extractPdfText,
} = require("../../backend/services/tamperAnalysisService");

const originalDir = process.argv[2];
const tamperedDir = process.argv[3];

if (!originalDir || !tamperedDir) {
  console.error("Usage: node inspect-real-cert-pairs.cjs <originalDir> <tamperedDir>");
  process.exit(1);
}

const originals = fs.readdirSync(originalDir)
  .filter(name => name.toLowerCase().endsWith(".pdf"))
  .sort();

const results = [];

function tamperedNameFor(originalName) {
  return originalName.replace(/\.pdf$/i, "_TAMPERED.pdf");
}

(async () => {

  for (const originalName of originals) {

    const tamperedName = tamperedNameFor(originalName);

    const originalPath =
      path.join(originalDir, originalName);

    const tamperedPath =
      path.join(tamperedDir, tamperedName);

    if (!fs.existsSync(tamperedPath)) {
      results.push({
        originalName,
        tamperedName,
        paired: false,
      });

      continue;
    }

    const originalText =
      await extractPdfText(originalPath);

    const tamperedText =
      await extractPdfText(tamperedPath);

    const originalLines =
      String(originalText)
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);

    const tamperedLines =
      String(tamperedText)
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);

    const removed =
      originalLines.filter(
        line => !tamperedLines.includes(line)
      );

    const added =
      tamperedLines.filter(
        line => !originalLines.includes(line)
      );

    results.push({
      originalName,
      tamperedName,
      paired: true,
      originalText,
      tamperedText,
      removed,
      added,
    });
  }

  const output =
    path.resolve(
      "semantic-real-corpus-diagnostic.json"
    );

  fs.writeFileSync(
    output,
    JSON.stringify(results, null, 2)
  );

  console.log(
    `Pairs analysed: ${results.filter(x => x.paired).length}`
  );

  console.log(
    `Missing pairs: ${results.filter(x => !x.paired).length}`
  );

  console.log("\n===== FIRST FIVE PAIRS =====");

  for (const result of results.slice(0, 5)) {

    console.log("\n--------------------------------");
    console.log(result.originalName);

    console.log("\nREMOVED / CHANGED FROM ORIGINAL:");
    console.log(result.removed);

    console.log("\nADDED / CHANGED IN TAMPERED:");
    console.log(result.added);
  }

  console.log(
    `\nFull diagnostic written to:\n${output}`
  );

})().catch(error => {
  console.error(error);
  process.exit(1);
});
