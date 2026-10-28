const fs = require("fs");

const path =
  "backend/controllers/credentialController.js";

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
    "buildSemanticManifestFromFile"
  )
) {
  console.log(
    "Semantic manifest issuance integration already exists."
  );

  process.exit(0);
}

/*
 * 1. Add model import.
 * CRLF/LF safe.
 */
const modelImportRegex =
  /(  createProcessingCredential,\r?\n)(  setCredentialStructuredProof,)/;

if (
  !modelImportRegex.test(
    source
  )
) {
  throw new Error(
    "Credential model import location not found."
  );
}

source =
  source.replace(
    modelImportRegex,
    `$1  setCredentialSemanticManifest,${nl}$2`
  );

/*
 * 2. Add semantic manifest service import.
 */
const certificateServiceRegex =
  /const \{\r?\n  generatePresentationCertificate,\r?\n\} = require\("\.\.\/services\/certificatePdfService"\);/;

if (
  !certificateServiceRegex.test(
    source
  )
) {
  throw new Error(
    "Certificate PDF service import location not found."
  );
}

source =
  source.replace(
    certificateServiceRegex,
    match =>
      `${match}${nl}${nl}const {${nl}  buildSemanticManifestFromFile,${nl}} = require("../services/semanticManifestService");`
  );

/*
 * 3. Insert manifest generation directly after
 * createProcessingCredential().
 */
const processingRegex =
  /(      credential =\r?\n        await createProcessingCredential\(\r?\n          processingInput\r?\n        \);\r?\n)/;

if (
  !processingRegex.test(
    source
  )
) {
  throw new Error(
    "Processing credential insertion location not found."
  );
}

const manifestBlock =
[
  "",
  "      const semanticManifest =",
  "        await buildSemanticManifestFromFile({",
  "          filePath:",
  "            req.file.path,",
  "",
  "          sourceHash:",
  "            certificateHash,",
  "",
  "          fields: {",
  "            student_name:",
  "              student.full_name,",
  "",
  "            student_number:",
  "              student.student_number,",
  "",
  "            institution_name:",
  "              institution.name,",
  "",
  "            programme:",
  "              student.programme,",
  "",
  "            qualification,",
  "",
  "            classification:",
  "              null,",
  "",
  "            issue_date:",
  "              issueDate,",
  "          },",
  "        });",
  "",
  "      const storedSemanticManifest =",
  "        await setCredentialSemanticManifest(",
  "          credential.id,",
  "          {",
  "            manifest:",
  "              semanticManifest,",
  "",
  "            version:",
  "              semanticManifest.version,",
  "",
  "            sourceHash:",
  "              certificateHash,",
  "          }",
  "        );",
  "",
  "      if (!storedSemanticManifest) {",
  "        const error =",
  "          new Error(",
  "            \"Semantic manifest could not be persisted for the processing credential.\"",
  "          );",
  "",
  "        error.code =",
  "          \"SEMANTIC_MANIFEST_PERSISTENCE_FAILED\";",
  "",
  "        throw error;",
  "      }",
  ""
].join(nl);

source =
  source.replace(
    processingRegex,
    `$1${manifestBlock}`
  );

/*
 * 4. Add safe processing error codes.
 */
const safeMarker =
  `        "CREDENTIAL_PROOF_PERSISTENCE_FAILED",`;

if (
  !source.includes(
    safeMarker
  )
) {
  throw new Error(
    "Safe processing error marker not found."
  );
}

source =
  source.replace(
    safeMarker,
    `${safeMarker}${nl}        "SEMANTIC_MANIFEST_INVALID",${nl}        "SEMANTIC_MANIFEST_PERSISTENCE_FAILED",`
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Issuance-time semantic manifest integration added successfully."
);
