const fs = require("fs");

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
 * Ensure semanticManifestService exposes the
 * transient-manifest builder to this service.
 */
if (
  !source.includes(
    "buildSemanticManifestFromBytes,"
  )
) {
  const marker =
    "  verifySemanticManifestFromFile,";

  if (
    !source.includes(
      marker
    )
  ) {
    throw new Error(
      "semanticManifestService import marker not found."
    );
  }

  source =
    source.replace(
      marker,
      `  buildSemanticManifestFromBytes,${nl}${marker}`
    );
}

/*
 * Find analyseTamperedPdf only.
 */
const functionStart =
  source.indexOf(
    "async function analyseTamperedPdf"
  );

if (
  functionStart === -1
) {
  throw new Error(
    "analyseTamperedPdf function not found."
  );
}

/*
 * Locate the current legacy semantic source marker.
 */
const legacyMarkerIndex =
  source.indexOf(
    '"LEGACY_BASELINE"',
    functionStart
  );

if (
  legacyMarkerIndex === -1
) {
  /*
   * Safe idempotency.
   */
  if (
    source.indexOf(
      '"EPHEMERAL_MANIFEST"',
      functionStart
    ) !== -1
  ) {
    console.log(
      "Ephemeral manifest fallback already installed."
    );

    fs.writeFileSync(
      path,
      source,
      "utf8"
    );

    process.exit(0);
  }

  throw new Error(
    "LEGACY_BASELINE marker not found."
  );
}

/*
 * Walk backwards from LEGACY_BASELINE to find
 * the outer `} else {` belonging to
 * persistedManifest.present.
 */
const beforeLegacy =
  source.slice(
    functionStart,
    legacyMarkerIndex
  );

const relativeElse =
  beforeLegacy.lastIndexOf(
    "} else {"
  );

if (
  relativeElse === -1
) {
  throw new Error(
    "Legacy else block start not found."
  );
}

const legacyStart =
  functionStart +
  relativeElse;

/*
 * Find end of:
 *
 * semanticSource =
 *   "LEGACY_BASELINE";
 * }
 */
const markerEnd =
  source.indexOf(
    ";",
    legacyMarkerIndex
  );

if (
  markerEnd === -1
) {
  throw new Error(
    "LEGACY_BASELINE statement end not found."
  );
}

const afterMarker =
  source.slice(
    markerEnd + 1
  );

const closeMatch =
  afterMarker.match(
    /^\s*\}/
  );

if (!closeMatch) {
  throw new Error(
    "Legacy branch closing brace not found."
  );
}

const legacyEnd =
  markerEnd +
  1 +
  closeMatch[0].length;

const replacement =
[
'    } else {',
'      /*',
'       * Legacy credential:',
'       * no persisted semantic manifest.',
'       *',
'       * Build a temporary manifest from the',
'       * exact authoritative source PDF so old',
'       * credentials use the same deterministic',
'       * field-localisation engine as new ones.',
'       */',
'      const official =',
'        await fetchOfficialPdf(',
'          credential',
'        );',
'',
'      if (',
'        official?.available &&',
'        official?.bytes',
'      ) {',
'        const sourceHash =',
'          normaliseManifestHash(',
'            credential.certificate_hash',
'          );',
'',
'        const transientManifest =',
'          await buildSemanticManifestFromBytes({',
'            sourceBytes:',
'              official.bytes,',
'',
'            sourceHash,',
'',
'            fields: {',
'              student_name:',
'                credential.student_name,',
'',
'              student_number:',
'                credential.student_number,',
'',
'              institution_name:',
'                credential.institution_name,',
'',
'              programme:',
'                credential.programme,',
'',
'              qualification:',
'                credential.qualification,',
'',
'              classification:',
'                credential.classification,',
'',
'              issue_date:',
'                credential.issue_date,',
'            },',
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
'         * Source PDF unavailable.',
'         * Preserve conservative behaviour.',
'         */',
'        const submittedText =',
'          await extractPdfText(',
'            filePath',
'          );',
'',
'        resolvedSemantic =',
'          analyseSemanticChanges({',
'            credential,',
'            submittedText,',
'            baselineText: null,',
'          });',
'',
'        baselineAnalysis = {',
'          available: false,',
'          reason:',
'            official?.reason ||',
'            "AUTHORITATIVE_PDF_UNAVAILABLE",',
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
    legacyStart
  ) +
  replacement +
  source.slice(
    legacyEnd
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Legacy verification now uses an ephemeral semantic manifest."
);
