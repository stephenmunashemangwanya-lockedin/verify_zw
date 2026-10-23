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

// Match complete field values, never substrings of another credential attribute.
const FIELD_LABELS = {
  student_name: ["holder", "holder name", "student name", "name"],
  student_number: ["student number", "registration number", "student / registration number"],
  institution_name: ["institution", "institution name"],
  programme: ["programme", "program"],
  qualification: ["qualification"],
  classification: ["classification", "degree classification"],
  issue_date: ["issue date", "award date", "date of issue", "date of award"],
};

const textLines = text => String(text ?? "").split(/\r?\n/).map(normalise).filter(Boolean);
const labelledLine = line => {
  for (const [field, labels] of Object.entries(FIELD_LABELS)) {
    for (const label of labels) {
      if (line === label) return { field, value: "" };
      if (!line.startsWith(label)) continue;
      const suffix = line.slice(label.length).match(/^\s*[:\u2013\u2014-]\s*(.*)$/);
      if (suffix) return { field, value: suffix[1] };
    }
  }
  return null;
};
const parseFields = lines => {
  const fields = {};
  const unclaimed = [];
  let current = null;
  for (const line of lines) {
    const labelled = labelledLine(line);
    if (labelled) {
      current = [];
      (fields[labelled.field] ||= []).push(current);
      if (labelled.value) current.push(labelled.value);
    } else if (current) {
      current.push(line);
    } else {
      unclaimed.push(line);
    }
  }
  return { fields, unclaimed };
};
const compareFieldValue = (parts, matches) => {
  if (matches(normalise(parts.join(" ")))) return "UNCHANGED";
  // Extra lines may be a footer or a continuation. Do not guess that an
  // unchanged complete value followed by unrelated text was altered.
  if (parts.length > 1 && parts.some(matches)) return "NOT_ASSESSABLE";
  return "ALTERED";
};

async function extractPdfTextFromBytes(
  bytes
) {
  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const loadingTask =
    pdfjs.getDocument({
      // PDF.js rejects Node Buffers, although Buffer extends Uint8Array.
      // Copy into a plain Uint8Array without changing the source bytes.
      data: new Uint8Array(bytes),

      disableWorker: true,
    });

  try {
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

    // Preserve logical PDF lines so overlapping values retain their field context.
    const lines = [];
    let line = "";
    let previousY = null;
    let previousRight = null;
    for (const item of content.items) {
      if (typeof item.str !== "string") continue;
      const y = item.transform?.[5];
      if (line && previousY !== null && Number.isFinite(y) && Math.abs(y - previousY) > 2) {
        lines.push(line);
        line = "";
        previousRight = null;
      }
      const x = item.transform?.[4];
      const gap = Number.isFinite(x) && previousRight !== null ? x - previousRight : null;
      const separator = line && item.str && !/\s$/.test(line) && !/^\s/.test(item.str) &&
        (gap === null || gap > Math.max(0.5, Number(item.height || 0) * 0.1)) ? " " : "";
      line += separator + item.str;
      previousRight = Number.isFinite(x) ? x + Number(item.width || 0) : null;
      previousY = Number.isFinite(y) ? y : previousY;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
        previousY = null;
        previousRight = null;
      }
    }
    if (line) lines.push(line);
    pages.push(lines.join("\n"));
  }

  return pages.join("\n");
  } finally {
    await loadingTask.destroy();
  }
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
  const baselineLines = textLines(baselineText);
  const submittedLines = textLines(submittedText);
  const original = parseFields(baselineLines);
  const submitted = parseFields(submittedLines);
  const fields = FIELD_DEFINITIONS.map(definition => {
    const officialValue = firstCredentialValue(credential, definition.credentialKeys);
    const field = { field: definition.key, label: definition.label, status: "NOT_AVAILABLE" };
    if (!officialValue) return field;
    field.status = "NOT_ASSESSABLE";
    if (!baselineLines.length) return field;

    const candidates = candidatesFor(definition, officialValue);
    const matches = value => candidates.includes(value);
    const baselineValues = original.fields[definition.key] || [];
    const submittedValues = submitted.fields[definition.key] || [];
    if (baselineValues.length) {
      // Duplicate or inconsistent labels make exact attribution unsafe.
      if (baselineValues.length !== 1 || !matches(normalise(baselineValues[0].join(" ")))) return field;
      if (submittedValues.length !== 1) return field;
      field.status = compareFieldValue(submittedValues[0], matches);
      return field;
    }

    // Without labels, require a unique complete line and a value belonging to
    // only one credential field. A qualification containing a programme is not
    // evidence that the programme was separately printed.
    const baselineMatches = original.unclaimed.filter(line => matches(line));
    if (baselineMatches.length !== 1) return field;
    const sharedValue = FIELD_DEFINITIONS.some(other => {
      if (other.key === definition.key) return false;
      const value = firstCredentialValue(credential, other.credentialKeys);
      return value && candidatesFor(other, value).some(candidate => candidates.includes(candidate));
    });
    if (sharedValue) return field;
    if (submittedValues.length === 1) {
      field.status = compareFieldValue(submittedValues[0], matches);
      return field;
    }
    if (submittedValues.length > 1) return field;
    const submittedMatches = submitted.unclaimed.filter(line => matches(line));
    if (submittedMatches.length > 1) return field;
    // A value moved beneath a different label cannot be attributed safely.
    if (!submittedMatches.length && Object.values(submitted.fields).flat().some(parts => matches(normalise(parts.join(" "))))) return field;
    // Unlabelled reflow is ambiguous rather than evidence of a changed value.
    if (!submittedMatches.length) {
      for (let start = 0; start < submitted.unclaimed.length; start += 1) {
        let value = submitted.unclaimed[start];
        for (let end = start + 1; end < submitted.unclaimed.length && value.length <= Math.max(...candidates.map(c => c.length)); end += 1) {
          value += ` ${submitted.unclaimed[end]}`;
          if (matches(value)) return field;
        }
      }
    }
    field.status = submittedMatches.length === 1 ? "UNCHANGED" : "ALTERED";
    return field;
  });

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
