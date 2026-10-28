const fs = require("fs");

const path =
  "backend/models/verificationModel.js";

let source =
  fs.readFileSync(
    path,
    "utf8"
  );

const nl =
  source.includes("\r\n")
    ? "\r\n"
    : "\n";

if (
  source.includes(
    "credentials.semantic_manifest,"
  )
) {
  console.log(
    "Verification model already includes semantic manifest."
  );

  process.exit(0);
}

const marker =
  "    credentials.certificate_hash,";

if (
  !source.includes(
    marker
  )
) {
  throw new Error(
    "certificate_hash select marker not found."
  );
}

source =
  source.replace(
    marker,
    [
      marker,
      "    credentials.semantic_manifest,",
      "    credentials.semantic_manifest_version,",
      "    credentials.semantic_manifest_source_hash,",
      "    credentials.semantic_manifest_generated_at,"
    ].join(nl)
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Semantic manifest added to internal verification retrieval."
);
