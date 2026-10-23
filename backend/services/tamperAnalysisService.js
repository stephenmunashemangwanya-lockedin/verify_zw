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

const HOLDER_CONTEXT_CUES = [
  "this is to certify that",
  "this certifies that",
  "awarded to",
  "presented to",
];

const QUALIFICATION_CONTEXT_CUES = [
  "has been awarded the qualification",
  "has been awarded qualification",
  "qualification awarded",
];

const isContextCue = line =>
  HOLDER_CONTEXT_CUES.includes(line) ||
  QUALIFICATION_CONTEXT_CUES.includes(line) ||
  /^issued by\s+/.test(line);

const pushParsedField = (
  fields,
  field,
  parts
) => {
  const existing =
    (fields[field] ||= []);

  const candidate =
    normalise(
      parts.join(" ")
    );

  /*
   * Preserve empty labelled values because:
   *
   *   Student Number:
   *
   * is meaningful evidence that a previously populated field has
   * become blank.
   */
  if (!candidate) {
    existing.push([]);
    return;
  }

  if (
    existing.some(
      current =>
        normalise(
          current.join(" ")
        ) === candidate
    )
  ) {
    return;
  }

  existing.push(parts);
};

/*
 * Parse explicit labels, known certificate context and conservative
 * unlabelled values without allowing one labelled field to swallow
 * every line that follows it.
 */
const parseFields = lines => {
  const fields = {};
  const consumed =
    new Set();

  /*
   * Pass 1:
   * explicit labels.
   *
   * A same-line label owns only its same-line value.
   * A label with no value may consume only the immediately following
   * non-label/non-context line.
   */
  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    const labelled =
      labelledLine(line);

    if (!labelled) continue;

    consumed.add(index);

    if (labelled.value) {
      pushParsedField(
        fields,
        labelled.field,
        [labelled.value]
      );

      continue;
    }

    const next =
      lines[index + 1];

    if (
      next &&
      !labelledLine(next) &&
      !isContextCue(next)
    ) {
      pushParsedField(
        fields,
        labelled.field,
        [next]
      );

      consumed.add(
        index + 1
      );
    } else {
      pushParsedField(
        fields,
        labelled.field,
        []
      );
    }
  }

  /*
   * Pass 2:
   * semantic certificate context.
   *
   * These anchors describe meaning, not a particular filename or
   * student's values.
   */
  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    if (
      HOLDER_CONTEXT_CUES.includes(
        line
      )
    ) {
      consumed.add(index);

      const value =
        lines[index + 1];

      if (
        value &&
        !consumed.has(index + 1) &&
        !labelledLine(value) &&
        !isContextCue(value)
      ) {
        pushParsedField(
          fields,
          "student_name",
          [value]
        );

        consumed.add(
          index + 1
        );
      }

      continue;
    }

    if (
      QUALIFICATION_CONTEXT_CUES.includes(
        line
      )
    ) {
      consumed.add(index);

      const value =
        lines[index + 1];

      if (
        value &&
        !consumed.has(index + 1) &&
        !labelledLine(value) &&
        !isContextCue(value)
      ) {
        pushParsedField(
          fields,
          "qualification",
          [value]
        );

        consumed.add(
          index + 1
        );
      }

      continue;
    }

    /*
     * Common certificate sentence:
     *
     * Issued by <institution> on <date>
     */
    const issued =
      line.match(
        /^issued by\s+(.+?)\s+on\s+(.+)$/
      );

    if (issued) {
      pushParsedField(
        fields,
        "institution_name",
        [issued[1]]
      );

      pushParsedField(
        fields,
        "issue_date",
        [issued[2]]
      );

      consumed.add(index);
    }
  }

  const unclaimed =
    lines.filter(
      (_line, index) =>
        !consumed.has(index)
    );

  return {
    fields,
    unclaimed,
  };
};


/*
 * Find an authoritative value that has been reflowed across adjacent
 * unclaimed lines. A match is accepted only when exactly one candidate
 * occurrence can be reconstructed.
 */
const findUniqueCandidateInLines = (
  lines,
  matches,
  maximumLines = 3
) => {
  const normalised =
    lines
      .map(normalise)
      .filter(Boolean);

  const hits = [];

  for (
    let start = 0;
    start < normalised.length;
    start += 1
  ) {
    let value = "";

    for (
      let end = start;
      end < normalised.length &&
      end < start + maximumLines;
      end += 1
    ) {
      value =
        normalise(
          value
            ? value + " " + normalised[end]
            : normalised[end]
        );

      if (matches(value)) {
        hits.push({
          start,
          end,
          value,
        });
      }
    }
  }

  return hits.length === 1
    ? hits[0].value
    : null;
};

/*
 * An explicitly labelled value may wrap onto following PDF text lines.
 * Reconstruct only when the partial labelled text plus one unique
 * adjacent/unclaimed segment equals an authoritative candidate exactly.
 */
const reconstructLabelledCandidate = (
  parts,
  unclaimed,
  matches
) => {
  const base =
    normalise(
      parts.join(" ")
    );

  if (
    base &&
    matches(base)
  ) {
    return base;
  }

  /*
   * Do not allow a completely empty label to adopt arbitrary distant
   * document text. "Holder:" with nothing after it must remain empty.
   */
  if (!base) {
    return null;
  }

  const lines =
    unclaimed
      .map(normalise)
      .filter(Boolean);

  const hits = [];

  for (
    let start = 0;
    start < lines.length;
    start += 1
  ) {
    let segment = "";

    for (
      let end = start;
      end < lines.length &&
      end < start + 3;
      end += 1
    ) {
      segment =
        normalise(
          segment
            ? segment + " " + lines[end]
            : lines[end]
        );

      const forward =
        normalise(
          base + " " + segment
        );

      const reverse =
        normalise(
          segment + " " + base
        );

      if (matches(forward)) {
        hits.push(forward);
      }

      if (
        reverse !== forward &&
        matches(reverse)
      ) {
        hits.push(reverse);
      }
    }
  }

  return hits.length === 1
    ? hits[0]
    : null;
};

const compareFieldValue = (parts, matches) => {
  if (matches(normalise(parts.join(" ")))) return "UNCHANGED";
  // Extra lines may be a footer or a continuation. Do not guess that an
  // unchanged complete value followed by unrelated text was altered.
  if (parts.length > 1 && parts.some(matches)) return "NOT_ASSESSABLE";
  return "ALTERED";
};


/*
 * Reconstruct text in visual page order rather than PDF content-stream
 * order. PDF editors can append replacement text at the end of the
 * content stream even though it is visually positioned beside the
 * original field.
 */
const spatialTextLines = items => {
  const glyphs = items
    .filter(
      item =>
        typeof item?.str === "string" &&
        item.str.length > 0 &&
        Number.isFinite(item.transform?.[4]) &&
        Number.isFinite(item.transform?.[5])
    )
    .map(item => ({
      text: item.str,
      x: Number(item.transform[4]),
      y: Number(item.transform[5]),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
    }));

  glyphs.sort(
    (a, b) =>
      (b.y - a.y) ||
      (a.x - b.x)
  );

  const rows = [];

  for (const glyph of glyphs) {
    let row = null;
    let bestDistance = Infinity;

    for (const candidate of rows) {
      const distance =
        Math.abs(candidate.y - glyph.y);

      if (
        distance <= 2 &&
        distance < bestDistance
      ) {
        row = candidate;
        bestDistance = distance;
      }
    }

    if (!row) {
      row = {
        y: glyph.y,
        items: [],
      };

      rows.push(row);
    }

    row.items.push(glyph);
  }

  rows.sort(
    (a, b) => b.y - a.y
  );

  return rows
    .map(row => {
      const parts =
        row.items.sort(
          (a, b) => a.x - b.x
        );

      let text = "";
      let previousRight = null;

      for (const item of parts) {
        const raw =
          String(item.text || "");

        if (!raw) continue;

        const right =
          item.x + item.width;

        if (!raw.trim()) {
          previousRight = right;
          continue;
        }

        const gap =
          previousRight === null
            ? null
            : item.x - previousRight;

        const threshold =
          Math.max(
            0.5,
            Number(item.height || 0) * 0.08
          );

        const separator =
          text &&
          !/\s$/.test(text) &&
          !/^\s/.test(raw) &&
          gap !== null &&
          gap > threshold
            ? " "
            : "";

        text +=
          separator + raw;

        previousRight = right;
      }

      return text.trim();
    })
    .filter(Boolean);
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

    // Reconstruct logical lines from visual PDF coordinates.
    // This handles replacement text appended later in the PDF stream.
    const lines =
      spatialTextLines(
        content.items
      );

    pages.push(
      lines.join("\n")
    );
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
      /*
       * The authoritative baseline may wrap a labelled value onto the
       * following visual line. Establish the baseline only through an
       * exact candidate reconstruction.
       */
      if (baselineValues.length !== 1) return field;

      const baselineResolved =
        reconstructLabelledCandidate(
          baselineValues[0],
          original.unclaimed,
          matches
        );

      if (!baselineResolved) return field;

      /*
       * If the official value has moved beneath another semantic label,
       * ownership is ambiguous. Do not accuse this field.
       */
      const ownedElsewhere =
        Object.entries(
          submitted.fields
        ).some(
          ([key, values]) =>
            key !== definition.key &&
            values.some(
              parts =>
                matches(
                  normalise(
                    parts.join(" ")
                  )
                )
            )
        );

      if (ownedElsewhere) return field;

      /*
       * A presentation change may remove the label while leaving the
       * complete authoritative value visible elsewhere.
       */
      if (submittedValues.length === 0) {
        const unlabelledMatch =
          findUniqueCandidateInLines(
            submitted.unclaimed,
            matches
          );

        if (unlabelledMatch) {
          field.status = "UNCHANGED";
        }

        return field;
      }

      if (submittedValues.length !== 1) {
        return field;
      }

      const submittedResolved =
        reconstructLabelledCandidate(
          submittedValues[0],
          submitted.unclaimed,
          matches
        );

      if (submittedResolved) {
        field.status = "UNCHANGED";
        return field;
      }

      /*
       * At this point the baseline is authoritative and assessable but
       * the submitted labelled value no longer resolves to the official
       * value. Empty, replaced or altered values are genuine changes.
       */
      field.status =
        compareFieldValue(
          submittedValues[0],
          matches
        );

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
