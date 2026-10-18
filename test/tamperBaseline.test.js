const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  analyseSemanticChanges,
} =
  require("../backend/services/tamperAnalysisService");

const credential = {
  student_name:
    "VerifyZW Mechanics Student 025",

  student_number:
    "VZW-STU-025",

  institution_name:
    "Midlands State University",

  programme:
    "Mechanics",

  qualification:
    "Mechanics",

  issue_date:
    "2026-10-02",
};

test(
  "name-only tamper does not falsely report an institution absent from the official PDF",
  () => {
    const result =
      analyseSemanticChanges({
        credential,

        baselineText:
          "VerifyZW Mechanics Student 025 VZW-STU-025 Mechanics 2026-10-02",

        submittedText:
          "VerifyZW Mechanic Student 025 VZW-STU-025 Mechanics 2026-10-02",
      });

    assert.deepEqual(
      result.alteredFields.map(
        (field) =>
          field.field
      ),
      [
        "student_name",
      ]
    );

    const institution =
      result.fields.find(
        (field) =>
          field.field ===
          "institution_name"
      );

    assert.equal(
      institution.status,
      "NOT_ASSESSABLE"
    );
  }
);

test(
  "institution is ALTERED when it existed in the official PDF and is removed from the submitted PDF",
  () => {
    const result =
      analyseSemanticChanges({
        credential,

        baselineText:
          "VerifyZW Mechanics Student 025 VZW-STU-025 Midlands State University Mechanics 2026-10-02",

        submittedText:
          "VerifyZW Mechanics Student 025 VZW-STU-025 Mechanics 2026-10-02",
      });

    const institution =
      result.fields.find(
        (field) =>
          field.field ===
          "institution_name"
      );

    assert.equal(
      institution.status,
      "ALTERED"
    );
  }
);

test(
  "unchanged baseline fields remain unchanged",
  () => {
    const text =
      "VerifyZW Mechanics Student 025 VZW-STU-025 Midlands State University Mechanics 2026-10-02";

    const result =
      analyseSemanticChanges({
        credential,
        baselineText:
          text,
        submittedText:
          text,
      });

    assert.equal(
      result.alteredFields.length,
      0
    );
  }
);
