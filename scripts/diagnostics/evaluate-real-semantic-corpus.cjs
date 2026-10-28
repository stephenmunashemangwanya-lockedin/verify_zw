const fs = require("fs");
const path = require("path");

const {
  analyseSemanticChanges,
} = require("../../backend/services/tamperAnalysisService");

const root = process.cwd();

const originals = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "original-index.json"),
    "utf8"
  ).replace(/^\uFEFF/, "")
);

const tampered = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "tampered-index.json"),
    "utf8"
  ).replace(/^\uFEFF/, "")
);

const diagnostic = JSON.parse(
  fs.readFileSync(
    path.join(root, "semantic-real-corpus-diagnostic.json"),
    "utf8"
  )
);

const originalByName =
  new Map(
    originals.map(row => [
      row.filename,
      row,
    ])
  );

const diagnosticByName =
  new Map(
    diagnostic.map(row => [
      row.originalName,
      row,
    ])
  );

const FIELD_MAP = {
  holder_name: "student_name",
  student_name: "student_name",

  student_number: "student_number",

  institution: "institution_name",
  institution_name: "institution_name",

  programme: "programme",
  program: "programme",

  qualification: "qualification",

  classification: "classification",

  issue_date: "issue_date",
  award_date: "issue_date",
};

const results = [];

for (const change of tampered) {

  const original =
    originalByName.get(
      change.original_filename
    );

  const pair =
    diagnosticByName.get(
      change.original_filename
    );

  const expected =
    FIELD_MAP[
      String(change.field_changed)
        .trim()
        .toLowerCase()
    ];

  if (
    !original ||
    !pair ||
    !pair.paired ||
    !expected
  ) {
    results.push({
      filename:
        change.original_filename,

      expected:
        expected || null,

      observed: [],

      pass: false,

      reason:
        !original
          ? "ORIGINAL_INDEX_MISSING"
          : !pair
          ? "DIAGNOSTIC_PAIR_MISSING"
          : !expected
          ? "UNKNOWN_FIELD_MAPPING"
          : "PAIR_NOT_AVAILABLE",
    });

    continue;
  }

  const credential = {
    student_name:
      original.student_name || null,

    student_number:
      original.student_number || null,

    institution_name:
      original.institution || null,

    programme:
      change.programme ||
      original.programme ||
      null,

    qualification:
      original.qualification || null,

    classification:
      original.classification || null,

    issue_date:
      original.issue_date || null,
  };

  const analysis =
    analyseSemanticChanges({
      credential,

      baselineText:
        pair.originalText,

      submittedText:
        pair.tamperedText,
    });

  const observed =
    analysis.alteredFields
      .map(field => field.field)
      .sort();

  const exact =
    observed.length === 1 &&
    observed[0] === expected;

  results.push({
    filename:
      change.original_filename,

    tamperedFilename:
      change.tampered_filename,

    expected,

    sourceField:
      change.field_changed,

    originalValue:
      change.original_value,

    tamperedValue:
      change.tampered_value,

    observed,

    fields:
      analysis.fields,

    semanticTamperingDetected:
      analysis.semanticTamperingDetected,

    pass: exact,
  });
}

const passed =
  results.filter(x => x.pass);

const failed =
  results.filter(x => !x.pass);

const expectedDetected =
  results.filter(
    x =>
      x.expected &&
      x.observed?.includes(x.expected)
  );

const falsePositiveCount =
  results.reduce(
    (total, row) =>
      total +
      (row.observed || [])
        .filter(
          field =>
            field !== row.expected
        ).length,
    0
  );

const summary = {
  totalCases:
    results.length,

  exactCases:
    passed.length,

  failedCases:
    failed.length,

  fieldLocalisationAccuracy:
    results.length
      ? Number(
          (
            expectedDetected.length /
            results.length *
            100
          ).toFixed(2)
        )
      : 0,

  exactSetAccuracy:
    results.length
      ? Number(
          (
            passed.length /
            results.length *
            100
          ).toFixed(2)
        )
      : 0,

  falsePositiveFields:
    falsePositiveCount,
};

console.log(
  "\n===== CURRENT REAL-CORPUS RESULT ====="
);

console.table(summary);

console.log(
  "\n===== FAILURES ====="
);

for (const row of failed) {
  console.log(
    "\n" +
    row.filename
  );

  console.log(
    "Expected:",
    row.expected
  );

  console.log(
    "Observed:",
    row.observed
  );

  if (row.fields) {
    console.log(
      "Field statuses:",
      row.fields
        .map(
          f =>
            `${f.field}=${f.status}`
        )
        .join(", ")
    );
  }
}

const output =
  path.join(
    root,
    "semantic-real-corpus-current-results.json"
  );

fs.writeFileSync(
  output,
  JSON.stringify(
    {
      summary,
      results,
    },
    null,
    2
  )
);

console.log(
  "\nResults written to:"
);

console.log(output);
