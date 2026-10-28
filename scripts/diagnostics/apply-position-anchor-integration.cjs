const fs =
  require("fs");

const path =
  "backend/services/tamperAnalysisService.js";

let source =
  fs.readFileSync(
    path,
    "utf8"
  );

if (
  !source.includes(
    "pdfSemanticAnchorService"
  )
) {
  source =
    `const {
  analyseAnchoredSemanticChanges,
} = require("./pdfSemanticAnchorService");

` + source;
}

if (
  !source.includes(
    "function mergeSemanticResults"
  )
) {
  const marker =
    "async function analyseTamperedPdf(";

  if (
    !source.includes(
      marker
    )
  ) {
    throw new Error(
      "analyseTamperedPdf marker not found."
    );
  }

  const helper = `
function mergeSemanticResults(
  primary,
  anchored
) {
  if (
    !anchored?.analysisAvailable
  ) {
    return primary;
  }

  const anchoredByField =
    new Map(
      anchored.fields.map(
        field => [
          field.field,
          field,
        ]
      )
    );

  const fields =
    primary.fields.map(
      field => {
        const anchor =
          anchoredByField.get(
            field.field
          );

        if (
          !anchor ||
          ![
            "ALTERED",
            "UNCHANGED",
          ].includes(
            anchor.status
          )
        ) {
          return field;
        }

        return {
          field:
            field.field,

          label:
            field.label,

          status:
            anchor.status,
        };
      }
    );

  const alteredFields =
    fields.filter(
      field =>
        field.status ===
        "ALTERED"
    );

  return {
    fields,

    alteredFields,

    semanticTamperingDetected:
      alteredFields.length >
      0,
  };
}

`;

  source =
    source.replace(
      marker,
      helper +
        marker
    );
}

if (
  !source.includes(
    "const anchoredSemantic ="
  )
) {
  const expression =
    /(const semantic\s*=\s*analyseSemanticChanges\(\{[\s\S]*?\n\s*\}\);)(\s*\n\s*const structuralAnalysis\s*=)/;

  if (
    !expression.test(
      source
    )
  ) {
    throw new Error(
      "Could not locate semantic analysis block."
    );
  }

  source =
    source.replace(
      expression,
      `$1

    const anchoredSemantic =
      await analyseAnchoredSemanticChanges({
        credential,
        filePath,
      });

    const resolvedSemantic =
      mergeSemanticResults(
        semantic,
        anchoredSemantic
      );$2`
    );

  source =
    source.replace(
      /semantic\s*\.\s*semanticTamperingDetected/g,
      "resolvedSemantic.semanticTamperingDetected"
    );

  source =
    source.replace(
      /semantic\s*\.\s*alteredFields/g,
      "resolvedSemantic.alteredFields"
    );

  source =
    source.replace(
      /semantic\s*\.\s*fields/g,
      "resolvedSemantic.fields"
    );
}

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Baseline-position semantic anchor integration applied."
);
