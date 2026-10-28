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

if (
  !source.includes(
    'require("./semanticManifestService")'
  )
) {
  source =
    [
      'const {',
      '  validateManifest,',
      '  verifySemanticManifestFromFile,',
      '} = require("./semanticManifestService");',
      '',
      source
    ].join(nl);
}

const functionRegex =
  /async function analyseTamperedPdf\(\{\r?\n  filePath,\r?\n  credential,\r?\n\}\) \{[\s\S]*?\r?\n\}\r?\n\r?\nmodule\.exports = \{/;

if (
  !functionRegex.test(
    source
  )
) {
  throw new Error(
    "analyseTamperedPdf block not found."
  );
}

const replacement =
[
'const normaliseManifestHash = value =>',
'  String(value || "")',
'    .trim()',
'    .toLowerCase();',
'',
'const resolvePersistedSemanticManifest =',
'  credential => {',
'    const hasAnyManifestData =',
'      credential?.semantic_manifest !== null &&',
'        credential?.semantic_manifest !== undefined ||',
'      credential?.semantic_manifest_version !== null &&',
'        credential?.semantic_manifest_version !== undefined ||',
'      credential?.semantic_manifest_source_hash !== null &&',
'        credential?.semantic_manifest_source_hash !== undefined;',
'',
'    if (!hasAnyManifestData) {',
'      return {',
'        present: false,',
'        valid: false,',
'        reason: "SEMANTIC_MANIFEST_NOT_PRESENT",',
'      };',
'    }',
'',
'    let manifest =',
'      credential.semantic_manifest;',
'',
'    if (',
'      typeof manifest === "string"',
'    ) {',
'      try {',
'        manifest =',
'          JSON.parse(manifest);',
'      } catch {',
'        return {',
'          present: true,',
'          valid: false,',
'          reason: "SEMANTIC_MANIFEST_INVALID",',
'        };',
'      }',
'    }',
'',
'    if (',
'      !validateManifest(manifest)',
'    ) {',
'      return {',
'        present: true,',
'        valid: false,',
'        reason: "SEMANTIC_MANIFEST_INVALID",',
'      };',
'    }',
'',
'    const version =',
'      Number(',
'        credential.semantic_manifest_version',
'      );',
'',
'    if (',
'      !Number.isInteger(version) ||',
'      version !== manifest.version',
'    ) {',
'      return {',
'        present: true,',
'        valid: false,',
'        reason: "SEMANTIC_MANIFEST_VERSION_MISMATCH",',
'      };',
'    }',
'',
'    const certificateHash =',
'      normaliseManifestHash(',
'        credential.certificate_hash',
'      );',
'',
'    const storedSourceHash =',
'      normaliseManifestHash(',
'        credential.semantic_manifest_source_hash',
'      );',
'',
'    const manifestSourceHash =',
'      normaliseManifestHash(',
'        manifest.sourceSha256',
'      );',
'',
'    if (',
'      !/^[a-f0-9]{64}$/.test(certificateHash) ||',
'      storedSourceHash !== certificateHash ||',
'      manifestSourceHash !== certificateHash',
'    ) {',
'      return {',
'        present: true,',
'        valid: false,',
'        reason: "SEMANTIC_MANIFEST_SOURCE_HASH_MISMATCH",',
'      };',
'    }',
'',
'    return {',
'      present: true,',
'      valid: true,',
'      reason: null,',
'      manifest,',
'    };',
'  };',
'',
'async function analyseTamperedPdf({',
'  filePath,',
'  credential,',
'}) {',
'  try {',
'    const persistedManifest =',
'      resolvePersistedSemanticManifest(',
'        credential',
'      );',
'',
'    let resolvedSemantic;',
'    let baselineAnalysis;',
'    let semanticSource;',
'',
'    if (persistedManifest.present) {',
'      if (persistedManifest.valid) {',
'        resolvedSemantic =',
'          await verifySemanticManifestFromFile({',
'            manifest:',
'              persistedManifest.manifest,',
'            filePath,',
'          });',
'',
'        baselineAnalysis = {',
'          available: true,',
'          reason: "SEMANTIC_MANIFEST",',
'        };',
'',
'        semanticSource =',
'          "PERSISTED_MANIFEST";',
'      } else {',
'        /*',
'         * A manifest exists but failed integrity validation.',
'         * Fail closed. Never silently downgrade to heuristics.',
'         */',
'        resolvedSemantic = {',
'          analysisAvailable: false,',
'          reason:',
'            persistedManifest.reason,',
'          semanticTamperingDetected: null,',
'          alteredFields: [],',
'          fields: [],',
'        };',
'',
'        baselineAnalysis = {',
'          available: false,',
'          reason:',
'            persistedManifest.reason,',
'        };',
'',
'        semanticSource =',
'          "PERSISTED_MANIFEST_INVALID";',
'      }',
'    } else {',
'      /*',
'       * Legacy credentials issued before migration 013',
'       * retain the existing conservative analyser.',
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
'      const semantic =',
'        analyseSemanticChanges({',
'          credential,',
'          submittedText,',
'',
'          baselineText:',
'            baseline.available',
'              ? baseline.text',
'              : null,',
'        });',
'',
'      const anchoredSemantic =',
'        await analyseAnchoredSemanticChanges({',
'          credential,',
'          filePath,',
'        });',
'',
'      resolvedSemantic =',
'        mergeSemanticResults(',
'          semantic,',
'          anchoredSemantic',
'        );',
'',
'      baselineAnalysis = {',
'        available:',
'          baseline.available,',
'        reason:',
'          baseline.reason,',
'      };',
'',
'      semanticSource =',
'        "LEGACY_BASELINE";',
'    }',
'',
'    const structuralAnalysis =',
'      await analysePdfStructureAgainstOfficial({',
'        filePath,',
'        credential,',
'      });',
'',
'    return {',
'      analysisAvailable: true,',
'',
'      documentModified: true,',
'',
'      baselineAnalysis,',
'',
'      semanticAnalysis: {',
'        source:',
'          semanticSource,',
'',
'        available:',
'          resolvedSemantic.analysisAvailable !== false,',
'',
'        reason:',
'          resolvedSemantic.reason || null,',
'      },',
'',
'      semanticTamperingDetected:',
'        resolvedSemantic.semanticTamperingDetected,',
'',
'      alteredFields:',
'        resolvedSemantic.alteredFields || [],',
'',
'      fields:',
'        resolvedSemantic.fields || [],',
'',
'      structuralAnalysis,',
'    };',
'  } catch {',
'    return {',
'      analysisAvailable: false,',
'',
'      documentModified: true,',
'',
'      semanticTamperingDetected: null,',
'',
'      alteredFields: [],',
'',
'      fields: [],',
'',
'      structuralAnalysis: {',
'        analysisAvailable: false,',
'        reason:',
'          "STRUCTURAL_ANALYSIS_UNAVAILABLE",',
'        structureModified: null,',
'        changes: [],',
'        metadataChanges: [],',
'      },',
'',
'      analysisError:',
'        "Document modification was detected, but field-level localisation could not be completed.",',
'    };',
'  }',
'}',
'',
'module.exports = {'
].join(nl);

source =
  source.replace(
    functionRegex,
    replacement
  );

/*
 * Export the resolver only for deterministic
 * regression testing. It is not an API route.
 */
if (
  !source.includes(
    "  resolvePersistedSemanticManifest,"
  )
) {
  source =
    source.replace(
      "module.exports = {" + nl,
      "module.exports = {" +
        nl +
        "  resolvePersistedSemanticManifest," +
        nl
    );
}

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Persisted semantic manifest is now primary for tamper localisation."
);
