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

const functionStart =
  source.indexOf(
    "async function analyseTamperedPdf"
  );

if (functionStart === -1) {
  throw new Error(
    "analyseTamperedPdf not found."
  );
}

const ephemeralMarker =
  source.indexOf(
    '"EPHEMERAL_MANIFEST"',
    functionStart
  );

if (ephemeralMarker === -1) {
  throw new Error(
    "EPHEMERAL_MANIFEST branch not found."
  );
}

/*
 * The OUTER else begins before the ephemeral marker.
 */
const legacyStart =
  source.lastIndexOf(
    "} else {",
    ephemeralMarker
  );

if (legacyStart === -1) {
  throw new Error(
    "Legacy fallback start not found."
  );
}

/*
 * Structural analysis follows the entire semantic branch.
 */
const structuralStart =
  source.indexOf(
    "    const structuralAnalysis =",
    ephemeralMarker
  );

if (structuralStart === -1) {
  throw new Error(
    "Structural analysis marker not found."
  );
}

const replacement =
[
'    } else {',
'      /*',
'       * Legacy credential without a persisted manifest.',
'       *',
'       * Preserve the proven conservative baseline-aware',
'       * analyser. Existing credentials should receive',
'       * manifests through the explicit backfill process;',
'       * runtime verification must not create or guess',
'       * permanent semantic ownership.',
'       */',
'      const submittedText =',
'        await extractPdfText(',
'          filePath',
'        );',
'',
'      const baseline =',
'        await loadOfficialBaseline(',
'          credential',
'        );',
'',
'      resolvedSemantic =',
'        analyseSemanticChanges({',
'          credential,',
'',
'          submittedText,',
'',
'          baselineText:',
'            baseline.available',
'              ? baseline.text',
'              : null,',
'        });',
'',
'      baselineAnalysis = {',
'        available:',
'          Boolean(',
'            baseline.available',
'          ),',
'',
'        reason:',
'          baseline.reason ||',
'          (baseline.available',
'            ? null',
'            : "AUTHORITATIVE_PDF_UNAVAILABLE"),',
'      };',
'',
'      semanticSource =',
'        baseline.available',
'          ? "LEGACY_BASELINE"',
'          : "LEGACY_NO_BASELINE";',
'    }',
'',
].join(nl);

source =
  source.slice(
    0,
    legacyStart
  ) +
  replacement +
  source.slice(
    structuralStart
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Legacy fallback restored to conservative baseline-aware analysis."
);
