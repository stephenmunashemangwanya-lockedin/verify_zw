const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const crypto =
  require("node:crypto");

const PDFDocument =
  require("pdfkit");

const {
  buildSemanticManifestFromBytes,
  verifySemanticManifestAgainstBytes,
  validateManifest,
} =
  require(
    "../backend/services/semanticManifestService"
  );

const credential = {
  student_name:
    "Evaluation Student 001",

  student_number:
    "VZW-EVAL-001",

  institution_name:
    "EVALUATION",

  programme:
    "Computer Systems Engineering",

  qualification:
    "BSc Computer Systems Engineering",

  classification:
    "First Class",

  issue_date:
    "2026-10-22",
};

const visibleLines =
  ({
    student_name =
      credential.student_name,

    student_number =
      credential.student_number,

    institution_name =
      credential.institution_name,

    programme =
      credential.programme,

    qualification =
      credential.qualification,

    classification =
      credential.classification,

    issue_date =
      "22 October 2026",
  } = {}) => [
    `Holder: ${student_name}`,
    `Student number: ${student_number}`,
    `Institution: ${institution_name}`,
    `Programme: ${programme}`,
    `Qualification: ${qualification}`,
    `Classification: ${classification}`,
    `Issue date: ${issue_date}`,
  ];

const makePdf =
  async (
    changes = {},
    separateGlyphs = false
  ) =>
    new Promise(
      (resolve, reject) => {
        const doc =
          new PDFDocument({
            compress: false,
          });

        const chunks = [];

        doc.on(
          "data",
          chunk =>
            chunks.push(
              chunk
            )
        );

        doc.on(
          "error",
          reject
        );

        doc.on(
          "end",
          () =>
            resolve(
              Buffer.concat(
                chunks
              )
            )
        );

        doc.fontSize(10);

        const lines =
          visibleLines(
            changes
          );

        if (!separateGlyphs) {
          let y = 72;

          for (
            const line of lines
          ) {
            doc.text(
              line,
              72,
              y,
              {
                lineBreak:
                  false,
              }
            );

            y += 18;
          }
        } else {
          let y = 72;

          for (
            const line of lines
          ) {
            let x = 72;

            for (
              const glyph of
              line
            ) {
              doc.text(
                glyph,
                x,
                y,
                {
                  lineBreak:
                    false,
                }
              );

              x +=
                doc.widthOfString(
                  glyph
                );
            }

            y += 18;
          }
        }

        doc.end();
      }
    );

let baseline;
let manifest;

test.before(
  async () => {
    baseline =
      await makePdf();

    const sourceHash =
      crypto
        .createHash(
          "sha256"
        )
        .update(
          baseline
        )
        .digest(
          "hex"
        );

    manifest =
      await buildSemanticManifestFromBytes({
        sourceBytes:
          baseline,

        sourceHash,

        fields:
          credential,
      });
  }
);

test(
  "manifest is versioned and source-hash bound",
  () => {
    assert.equal(
      manifest.version,
      1
    );

    assert.match(
      manifest.sourceSha256,
      /^[a-f0-9]{64}$/
    );

    assert.equal(
      validateManifest(
        manifest
      ),
      true
    );
  }
);

test(
  "unchanged certificate has no semantic alterations",
  async () => {
    const result =
      await verifySemanticManifestAgainstBytes({
        manifest,

        submittedBytes:
          baseline,
      });

    assert.equal(
      result
        .semanticTamperingDetected,
      false
    );

    assert.deepEqual(
      result.alteredFields,
      []
    );
  }
);

test(
  "holder-name-only change is localised exactly",
  async () => {
    const submitted =
      await makePdf({
        student_name:
          "Altered Evaluation Student 001",
      });

    const result =
      await verifySemanticManifestAgainstBytes({
        manifest,
        submittedBytes:
          submitted,
      });

    assert.deepEqual(
      result.alteredFields.map(
        field =>
          field.field
      ),
      [
        "student_name",
      ]
    );
  }
);

test(
  "student-number-only change is localised exactly",
  async () => {
    const submitted =
      await makePdf({
        student_number:
          "VZW-EVAL-999",
      });

    const result =
      await verifySemanticManifestAgainstBytes({
        manifest,
        submittedBytes:
          submitted,
      });

    assert.deepEqual(
      result.alteredFields.map(
        field =>
          field.field
      ),
      [
        "student_number",
      ]
    );
  }
);

test(
  "qualification-only change is localised exactly",
  async () => {
    const submitted =
      await makePdf({
        qualification:
          "BSc Computer Engineering",
      });

    const result =
      await verifySemanticManifestAgainstBytes({
        manifest,
        submittedBytes:
          submitted,
      });

    assert.deepEqual(
      result.alteredFields.map(
        field =>
          field.field
      ),
      [
        "qualification",
      ]
    );
  }
);

test(
  "equivalent comma-form date is unchanged",
  async () => {
    const submitted =
      await makePdf({
        issue_date:
          "October 22, 2026",
      });

    const result =
      await verifySemanticManifestAgainstBytes({
        manifest,
        submittedBytes:
          submitted,
      });

    const date =
      result.fields.find(
        field =>
          field.field ===
          "issue_date"
      );

    assert.equal(
      date.status,
      "UNCHANGED"
    );

    assert.equal(
      result.alteredFields.some(
        field =>
          field.field ===
          "issue_date"
      ),
      false
    );
  }
);

test(
  "separate glyph runs do not create false semantic alterations",
  async () => {
    const submitted =
      await makePdf(
        {},
        true
      );

    const result =
      await verifySemanticManifestAgainstBytes({
        manifest,
        submittedBytes:
          submitted,
      });

    assert.deepEqual(
      result.alteredFields,
      []
    );
  }
);

test(
  "multiple changes return exact changed set",
  async () => {
    const submitted =
      await makePdf({
        student_name:
          "Altered Evaluation Student 001",

        programme:
          "Information Technology",

        issue_date:
          "23 October 2026",
      });

    const result =
      await verifySemanticManifestAgainstBytes({
        manifest,
        submittedBytes:
          submitted,
      });

    assert.deepEqual(
      result.alteredFields
        .map(
          field =>
            field.field
        )
        .sort(),
      [
        "issue_date",
        "programme",
        "student_name",
      ]
    );
  }
);
