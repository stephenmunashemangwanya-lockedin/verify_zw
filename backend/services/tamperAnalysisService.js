const fs = require("fs/promises");

const {
  analysePdfStructureAgainstOfficial,
} = require("./pdfStructureAnalysisService");

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
    credentialKeys: ["student_name", "studentName"],
  },
  {
    key: "student_number",
    label: "Student / registration number",
    credentialKeys: ["student_number", "studentNumber"],
  },
  {
    key: "institution_name",
    label: "Institution",
    credentialKeys: ["institution_name", "institutionName"],
  },
  {
    key: "programme",
    label: "Programme",
    credentialKeys: ["programme", "program"],
  },
  {
    key: "qualification",
    label: "Qualification",
    credentialKeys: ["qualification"],
  },
  {
    key: "classification",
    label: "Degree classification",
    credentialKeys: [
      "classification",
      "degree_classification",
      "degreeClassification",
    ],
  },
  {
    key: "issue_date",
    label: "Issue date",
    credentialKeys: ["issue_date", "issueDate"],
    date: true,
  },
];

const getPayload = (credential) => {
  const payload =
    credential?.credential_payload;

  if (
    payload &&
    typeof payload === "object"
  ) {
    return payload;
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }

  return {};
};

const firstCredentialValue = (
  credential,
  keys
) => {
  const payload =
    getPayload(credential);

  for (const key of keys) {
    const direct =
      credential?.[key];

    if (
      direct !== undefined &&
      direct !== null &&
      String(direct).trim()
    ) {
      return String(direct);
    }

    const payloadValue =
      payload?.[key];

    if (
      payloadValue !== undefined &&
      payloadValue !== null &&
      String(payloadValue).trim()
    ) {
      return String(payloadValue);
    }
  }

  return null;
};

const dateCandidates = (value) => {
  const candidates =
    new Set([
      normalise(value),
    ]);

  const parsed =
    new Date(value);

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
      parsed.getUTCMonth() + 1
    ).padStart(2, "0");

  const dd =
    String(
      parsed.getUTCDate()
    ).padStart(2, "0");

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
  ];
};

async function extractPdfText(
  filePath
) {
  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const bytes =
    await fs.readFile(
      filePath
    );

  const loadingTask =
    pdfjs.getDocument({
      data: new Uint8Array(
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
      await page.getTextContent();

    const text =
      content.items
        .map((item) =>
          typeof item.str ===
          "string"
            ? item.str
            : ""
        )
        .join(" ");

    pages.push(text);
  }

  return pages.join(" ");
}

function analyseSemanticChanges({
  credential,
  submittedText,
}) {
  const documentText =
    normalise(
      submittedText
    );

  const fields =
    FIELD_DEFINITIONS.map(
      (definition) => {
        const officialValue =
          firstCredentialValue(
            credential,
            definition.credentialKeys
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
          definition.date
            ? dateCandidates(
                officialValue
              )
            : [
                normalise(
                  officialValue
                ),
              ];

        const matched =
          candidates.some(
            (candidate) =>
              candidate &&
              documentText.includes(
                candidate
              )
          );

        return {
          field:
            definition.key,
          label:
            definition.label,
          status:
            matched
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

async function analyseTamperedPdf({
  filePath,
  credential,
}) {
  try {
    const submittedText =
      await extractPdfText(
        filePath
      );

    const semantic =
      analyseSemanticChanges({
        credential,
        submittedText,
      });

    const structuralAnalysis =
      await analysePdfStructureAgainstOfficial({
        filePath,
        credential,
      });

    return {
      analysisAvailable:
        true,

      documentModified:
        true,

      semanticTamperingDetected:
        semantic
          .semanticTamperingDetected,

      alteredFields:
        semantic.alteredFields,

      fields:
        semantic.fields,

      structuralAnalysis,
    };
  } catch {
    return {
      analysisAvailable:
        false,

      documentModified:
        true,

      semanticTamperingDetected:
        null,

      alteredFields: [],

      fields: [],

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
