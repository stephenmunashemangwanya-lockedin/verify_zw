const fs =
  require("fs");

const path =
  "backend/services/tamperAnalysisService.js";

let source =
  fs.readFileSync(
    path,
    "utf8"
  );

const nl =
  source.includes("\r\n")
    ? "\r\n"
    : "\n";

/*
 * Add buildSemanticManifestFromBytes
 * to the existing semanticManifestService import.
 */
const oldImport =
[
'const {',
'  validateManifest,',
'  verifySemanticManifestFromFile,',
'} = require("./semanticManifestService");'
].join(nl);

const newImport =
[
'const {',
'  validateManifest,',
'  buildSemanticManifestFromBytes,',
'  verifySemanticManifestFromFile,',
'} = require("./semanticManifestService");'
].join(nl);

if (
  source.includes(
    oldImport
  )
) {
  source =
    source.replace(
      oldImport,
      newImport
    );
}

/*
 * Extend loadOfficialBaseline so the authoritative
 * PDF bytes are retained for transient manifest creation.
 */
const baselineReturnRegex =
  /return \{\r?\n      available: true,\r?\n\r?\n      text:\r?\n        await extractPdfTextFromBytes\(\r?\n          official\.bytes\r?\n        \),\r?\n\r?\n      reason: null,\r?\n    \};/;

if (
  baselineReturnRegex.test(
    source
  )
) {
  source =
    source.replace(
      baselineReturnRegex,
[
'return {',
'      available: true,',
'',
'      bytes:',
'        official.bytes,',
'',
'      text:',
'        await extractPdfTextFromBytes(',
'          official.bytes',
'        ),',
'',
'      reason: null,',
'    };'
].join(nl)
    );
}

/*
 * Add helper mapping the existing credential keys
 * into the semantic-manifest field schema.
 */
if (
  !source.includes(
    "const semanticManifestFieldsFromCredential"
  )
) {
  const marker =
    "const normaliseManifestHash = value =>";

  if (
    !source.includes(
      marker
    )
  ) {
    throw new Error(
      "normaliseManifestHash marker not found."
    );
  }

  const helper =
[
'const semanticManifestFieldsFromCredential =',
'  credential => {',
'    const fields = {};',
'',
'    for (',
'      const definition of',
'      FIELD_DEFINITIONS',
'    ) {',
'      fields[',
'        definition.key',
'      ] =',
'        firstCredentialValue(',
'          credential,',
'          definition.credentialKeys',
'        );',
'    }',
'',
'    return fields;',
'  };',
'',
marker
].join(nl);

  source =
    source.replace(
      marker,
      helper
    );
}

/*
 * Replace only the legacy branch.
 */
const legacyStart =
`    } else {
      /*
       * Legacy credentials issued before migration 013
       * retain the existing conservative analyser.
       */
      const submittedText =`;

const startIndex =
  source.indexOf(
    legacyStart
  );

if (
  startIndex === -1
) {
  throw new Error(
    "Legacy branch start not found."
  );
}

const endMarker =
`      semanticSource =
        "LEGACY_BASELINE";
    }`;

const endIndex =
  source.indexOf(
    endMarker,
    startIndex
  );

if (
  endIndex === -1
) {
  throw new Error(
    "Legacy branch end not found."
  );
}

const replaceEnd =
  endIndex +
  endMarker.length;

const replacement =
[
'    } else {',
'      /*',
'       * Credentials issued before migration 013',
'       * do not have a persisted semantic manifest.',
'       *',
'       * When the authoritative source PDF is',
'       * available, build an ephemeral manifest',
'       * from that exact original and use the same',
'       * deterministic semantic engine as new',
'       * credentials.',
'       */',
'      const baseline =',
'        await loadOfficialBaseline(',
'          credential',
'        );',
'',
'      if (',
'        baseline.available &&',
'        baseline.bytes',
'      ) {',
'        const sourceHash =',
'          normaliseManifestHash(',
'            credential.certificate_hash',
'          );',
'',
'        const transientManifest =',
'          await buildSemanticManifestFromBytes({',
'            sourceBytes:',
'              baseline.bytes,',
'',
'            sourceHash,',
'',
'            fields:',
'              semanticManifestFieldsFromCredential(',
'                credential',
'              ),',
'          });',
'',
'        resolvedSemantic =',
'          await verifySemanticManifestFromFile({',
'            manifest:',
'              transientManifest,',
'',
'            filePath,',
'          });',
'',
'        baselineAnalysis = {',
'          available: true,',
'          reason:',
'            "EPHEMERAL_SEMANTIC_MANIFEST",',
'        };',
'',
'        semanticSource =',
'          "EPHEMERAL_MANIFEST";',
'      } else {',
'        /*',
'         * Authoritative source unavailable:',
'         * retain the conservative legacy behaviour',
'         * and never invent altered fields.',
'         */',
'        const submittedText =',
'          await extractPdfText(',
'            filePath',
'          );',
'',
'        const semantic =',
'          analyseSemanticChanges({',
'            credential,',
'            submittedText,',
'            baselineText: null,',
'          });',
'',
'        resolvedSemantic =',
'          semantic;',
'',
'        baselineAnalysis = {',
'          available: false,',
'          reason:',
'            baseline.reason,',
'        };',
'',
'        semanticSource =',
'          "LEGACY_NO_BASELINE";',
'      }',
'    }'
].join(nl);

source =
  source.slice(
    0,
    startIndex
  ) +
  replacement +
  source.slice(
    replaceEnd
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Legacy credentials now use ephemeral semantic manifests when an authoritative baseline exists."
);
