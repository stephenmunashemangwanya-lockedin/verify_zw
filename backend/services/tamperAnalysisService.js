const fs =
  require("fs/promises");

const {
  analysePdfStructureAgainstOfficial,
  fetchOfficialPdf,
} =
  require("./pdfStructureAnalysisService");

const normalise = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const FIELD_DEFINITIONS = [
  {
    key: "student_name",
    label: "Holder name",
    credentialKeys: [
      "student_name",
      "studentName",
    ],
  },
  {
    key: "student_number",
    label:
      "Student / registration number",
    credentialKeys: [
      "student_number",
      "studentNumber",
    ],
  },
  {
    key: "institution_name",
    label: "Institution",
    credentialKeys: [
      "institution_name",
      "institutionName",
    ],
  },
  {
    key: "programme",
    label: "Programme",
    credentialKeys: [
      "programme",
      "program",
    ],
  },
  {
    key: "qualification",
    label: "Qualification",
    credentialKeys: [
      "qualification",
    ],
  },
  {
    key: "classification",
    label:
      "Degree classification",
    credentialKeys: [
      "classification",
      "degree_classification",
      "degreeClassification",
    ],
  },
  {
    key: "issue_date",
    label: "Issue date",
    date: true,
    credentialKeys: [
      "issue_date",
      "issueDate",
      "award_date",
      "awardDate",
    ],
  },
];

const firstCredentialValue = (
  credential,
  keys
) => {
  for (const key of keys) {
    const value =
      credential?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value);
    }
  }

  return null;
};

const dateCandidates = (
  value
) => {
  const candidates =
    new Set();

  const raw =
    String(value ?? "")
      .trim();

  if (!raw) {
    return [];
  }

  candidates.add(
    normalise(raw)
  );

  const parsed =
    new Date(raw);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return [
      ...candidates,
    ];
  }

  const yyyy =
    String(
      parsed.getUTCFullYear()
    );

  const mm =
    String(
      parsed.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const dd =
    String(
      parsed.getUTCDate()
    ).padStart(
      2,
      "0"
    );

  candidates.add(
    `${yyyy}-${mm}-${dd}`
  );

  candidates.add(
    `${dd}/${mm}/${yyyy}`
  );

  candidates.add(
    `${dd}-${mm}-${yyyy}`
  );

  candidates.add(
    normalise(
      parsed.toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }
      )
    )
  );

  candidates.add(
    normalise(
      parsed.toLocaleDateString(
        "en-US",
        {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }
      )
    )
  );

  return [
    ...candidates,
  ].filter(Boolean);
};

const candidatesFor = (
  definition,
  value
) =>
  definition.date
    ? dateCandidates(
        value
      )
    : [
        normalise(
          value
        ),
      ].filter(Boolean);

const containsCandidate = (
  text,
  candidates
) =>
  candidates.some(
    (candidate) =>
      candidate &&
      text.includes(
        candidate
      )
  );

async function extractPdfTextFromBytes(
  bytes
) {
  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const loadingTask =
    pdfjs.getDocument({
      data:
        bytes instanceof
        Uint8Array
          ? bytes
          : new Uint8Array(
              bytes
            ),

      disableWorker: true,
    });

  const pdf =
    await loadingTask.promise;

  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <=
    pdf.numPages;
    pageNumber += 1
  ) {
    const page =
      await pdf.getPage(
        pageNumber
      );

    const content =
      await page
        .getTextContent();

    pages.push(
      content.items
        .map(
          (item) =>
            typeof item.str ===
            "string"
              ? item.str
              : ""
        )
        .join(" ")
    );
  }

  return pages.join(" ");
}

async function extractPdfText(
  filePath
) {
  const bytes =
    await fs.readFile(
      filePath
    );

  return extractPdfTextFromBytes(
    bytes
  );
}

function analyseSemanticChanges({
  credential,
  submittedText,
  baselineText,
}) {
  const submitted =
    normalise(
      submittedText
    );

  /*
   * undefined means a direct legacy/unit call.
   * null means production analysis attempted
   * baseline acquisition but it was unavailable.
   */
  const baselineWasRequested =
    baselineText !==
    undefined;

  const baselineAvailable =
    typeof baselineText ===
      "string" &&
    Boolean(
      normalise(
        baselineText
      )
    );

  const baseline =
    baselineAvailable
      ? normalise(
          baselineText
        )
      : "";

  const fields =
    FIELD_DEFINITIONS.map(
      (definition) => {
        const officialValue =
          firstCredentialValue(
            credential,
            definition
              .credentialKeys
          );

        if (!officialValue) {
          return {
            field:
              definition.key,

            label:
              definition.label,

            status:
              "NOT_AVAILABLE",
          };
        }

        const candidates =
          candidatesFor(
            definition,
            officialValue
          );

        const submittedHas =
          containsCandidate(
            submitted,
            candidates
          );

        /*
         * Preserve compatibility for direct
         * analyseSemanticChanges unit calls.
         */
        if (
          !baselineWasRequested
        ) {
          return {
            field:
              definition.key,

            label:
              definition.label,

            status:
              submittedHas
                ? "UNCHANGED"
                : "ALTERED",
          };
        }

        /*
         * If the authoritative PDF baseline
         * could not be obtained, absence of a
         * value must not be called tampering.
         */
        if (
          !baselineAvailable
        ) {
          return {
            field:
              definition.key,

            label:
              definition.label,

            status:
              submittedHas
                ? "UNCHANGED"
                : "NOT_ASSESSABLE",
          };
        }

        const baselineHas =
          containsCandidate(
            baseline,
            candidates
          );

        /*
         * The field was not printed on the
         * authoritative original certificate,
         * therefore it cannot be localised as
         * altered from document text.
         */
        if (!baselineHas) {
          return {
            field:
              definition.key,

            label:
              definition.label,

            status:
              "NOT_ASSESSABLE",
          };
        }

        return {
          field:
            definition.key,

          label:
            definition.label,

          status:
            submittedHas
              ? "UNCHANGED"
              : "ALTERED",
        };
      }
    );

  const alteredFields =
    fields.filter(
      (field) =>
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

async function loadOfficialBaseline(
  credential
) {
  try {
    const official =
      await fetchOfficialPdf(
        credential
      );

    if (
      !official?.available ||
      !official?.bytes
    ) {
      return {
        available: false,
        text: null,
        reason:
          official?.reason ||
          "AUTHORITATIVE_PDF_UNAVAILABLE",
      };
    }

    return {
      available: true,

      text:
        await extractPdfTextFromBytes(
          official.bytes
        ),

      reason: null,
    };
  } catch {
    return {
      available: false,
      text: null,
      reason:
        "AUTHORITATIVE_PDF_UNAVAILABLE",
    };
  }
}

async function analyseTamperedPdf({
  filePath,
  credential,
}) {
  try {
    const submittedText =
      await extractPdfText(
        filePath
      );

    const baseline =
      await loadOfficialBaseline(
        credential
      );

    const semantic =
      analyseSemanticChanges({
        credential,
        submittedText,

        baselineText:
          baseline.available
            ? baseline.text
            : null,
      });

    const structuralAnalysis =
      await analysePdfStructureAgainstOfficial({
        filePath,
        credential,
      });

    return {
      analysisAvailable: true,

      documentModified: true,

      baselineAnalysis: {
        available:
          baseline.available,

        reason:
          baseline.reason,
      },

      semanticTamperingDetected:
        semantic
          .semanticTamperingDetected,

      alteredFields:
        semantic
          .alteredFields,

      fields:
        semantic.fields,

      structuralAnalysis,
    };
  } catch {
    return {
      analysisAvailable: false,

      documentModified: true,

      semanticTamperingDetected:
        null,

      alteredFields: [],

      fields: [],

      structuralAnalysis: {
        analysisAvailable:
          false,

        reason:
          "STRUCTURAL_ANALYSIS_UNAVAILABLE",

        structureModified:
          null,

        changes: [],

        metadataChanges: [],
      },

      analysisError:
        "Document modification was detected, but field-level localisation could not be completed.",
    };
  }
}

module.exports = {
  analyseTamperedPdf,
  analyseSemanticChanges,
  extractPdfText,
};
