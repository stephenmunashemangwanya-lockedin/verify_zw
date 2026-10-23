const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const PDFDocument =
  require("pdfkit");

const {
  analyseAnchoredSemanticChangesFromBytes,
} =
  require(
    "../backend/services/pdfSemanticAnchorService"
  );

const credential = {
  student_name:
    "VerifyZW Biotechnology Student 016",

  student_number:
    "VZW-STU-016",

  institution_name:
    "VerifyZW Test University",

  programme:
    "Mechanics",

  qualification:
    "Mechanics",

  issue_date:
    "2026-10-16",
};

const makePdf =
  async ({
    name =
      credential.student_name,

    number =
      credential.student_number,

    programme =
      credential.programme,

    qualification =
      credential.qualification,

    date =
      "16 October 2026",
  } = {}) =>
    new Promise(
      (resolve) => {
        const doc =
          new PDFDocument({
            size: "A4",
            margin: 50,
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
          "end",
          () =>
            resolve(
              Buffer.concat(
                chunks
              )
            )
        );

        doc
          .fontSize(12)
          .text(
            "This is to certify that",
            100,
            120,
            {
              lineBreak:
                false,
            }
          );

        /*
         * Deliberately unlabelled holder row:
         * this reproduces the real live certificate pattern.
         */
        doc.text(
          name,
          100,
          145,
          {
            lineBreak:
              false,
          }
        );

        doc.text(
          `Student Number: ${number}`,
          100,
          180,
          {
            lineBreak:
              false,
          }
        );

        doc.text(
          `Programme: ${programme}`,
          100,
          215,
          {
            lineBreak:
              false,
          }
        );

        doc.text(
          "has been awarded the qualification",
          100,
          250,
          {
            lineBreak:
              false,
          }
        );

        doc.text(
          qualification,
          100,
          275,
          {
            lineBreak:
              false,
          }
        );

        doc.text(
          `Issued by VerifyZW Test University on ${date}`,
          100,
          320,
          {
            lineBreak:
              false,
          }
        );

        doc.end();
      }
    );

let baseline;

test.before(
  async () => {
    baseline =
      await makePdf();
  }
);

test(
  "position anchor localises an unlabelled holder-name alteration",
  async () => {
    const submitted =
      await makePdf({
        name:
          "VerifyZW Biotechnology Studnt 016",
      });

    const result =
      await analyseAnchoredSemanticChangesFromBytes({
        credential,

        officialBytes:
          baseline,

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
  "position anchor localises student number",
  async () => {
    const submitted =
      await makePdf({
        number:
          "VZW-STU-999",
      });

    const result =
      await analyseAnchoredSemanticChangesFromBytes({
        credential,

        officialBytes:
          baseline,

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
  "qualification context remains independent when programme and qualification share the same value",
  async () => {
    const submitted =
      await makePdf({
        qualification:
          "Mechanical Engineering",
      });

    const result =
      await analyseAnchoredSemanticChangesFromBytes({
        credential,

        officialBytes:
          baseline,

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
  "issued sentence localises date only",
  async () => {
    const submitted =
      await makePdf({
        date:
          "17 October 2026",
      });

    const result =
      await analyseAnchoredSemanticChangesFromBytes({
        credential,

        officialBytes:
          baseline,

        submittedBytes:
          submitted,
      });

    assert.deepEqual(
      result.alteredFields.map(
        field =>
          field.field
      ),
      [
        "issue_date",
      ]
    );
  }
);

test(
  "unchanged visible semantic fields produce no alterations",
  async () => {
    const submitted =
      await makePdf();

    const result =
      await analyseAnchoredSemanticChangesFromBytes({
        credential,

        officialBytes:
          baseline,

        submittedBytes:
          submitted,
      });

    assert.deepEqual(
      result.alteredFields,
      []
    );
  }
);
