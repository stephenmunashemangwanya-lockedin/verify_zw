const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  analyseSemanticChanges,
} =
  require(
    "../backend/services/tamperAnalysisService"
  );

const credential = {
  student_name:
    "Evaluation Student 001",

  student_number:
    "VZW-EVAL-001",

  institution_name:
    "EVALUATION",

  /*
   * Deliberately identical to qualification.
   * The qualification context must still disambiguate it.
   */
  programme:
    "Computer Systems Engineering",

  qualification:
    "Computer Systems Engineering",

  classification:
    null,

  issue_date:
    "2026-10-16",
};

const baseline = [
  "VERIFYZW",
  "CERTIFICATE OF QUALIFICATION",
  "This is to certify that",
  "Evaluation Student 001",
  "Student Number: VZW-EVAL-001",
  "has been awarded the qualification",
  "Computer Systems Engineering",
  "Issued by EVALUATION on 16 October 2026",
].join("\n");

const altered =
  submittedText =>
    analyseSemanticChanges({
      credential,
      baselineText: baseline,
      submittedText,
    }).alteredFields
      .map(field => field.field)
      .sort();

test(
  "context anchor localises holder-only change",
  () => {
    const submitted =
      baseline.replace(
        "Evaluation Student 001",
        "Evaluation Studnt 001"
      );

    assert.deepEqual(
      altered(submitted),
      ["student_name"]
    );
  }
);

test(
  "label anchor localises student-number-only change",
  () => {
    const submitted =
      baseline.replace(
        "VZW-EVAL-001",
        "VZW-EVAL-002"
      );

    assert.deepEqual(
      altered(submitted),
      ["student_number"]
    );
  }
);

test(
  "qualification context disambiguates identical programme and qualification values",
  () => {
    const submitted =
      baseline.replace(
        "\nhas been awarded the qualification\nComputer Systems Engineering\n",
        "\nhas been awarded the qualification\nComputer Systems Enginering\n"
      );

    assert.deepEqual(
      altered(submitted),
      ["qualification"]
    );
  }
);

test(
  "issued-by context localises institution-only change",
  () => {
    const submitted =
      baseline.replace(
        "Issued by EVALUATION on 16 October 2026",
        "Issued by ALTERED UNIVERSITY on 16 October 2026"
      );

    assert.deepEqual(
      altered(submitted),
      ["institution_name"]
    );
  }
);

test(
  "issued-by context localises date-only change",
  () => {
    const submitted =
      baseline.replace(
        "16 October 2026",
        "17 October 2026"
      );

    assert.deepEqual(
      altered(submitted),
      ["issue_date"]
    );
  }
);

test(
  "unchanged semantic document has no altered field",
  () => {
    assert.deepEqual(
      altered(baseline),
      []
    );
  }
);
