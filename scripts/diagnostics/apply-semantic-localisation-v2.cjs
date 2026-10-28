const fs = require("fs");

const file =
  "backend/services/tamperAnalysisService.js";

let source =
  fs.readFileSync(file, "utf8");

if (
  source.includes("const spatialTextLines =") &&
  source.includes("const HOLDER_CONTEXT_CUES =")
) {
  console.log(
    "Semantic spatial/context patch is already present."
  );
  process.exit(0);
}

const helperMarker =
  "async function extractPdfTextFromBytes(";

if (!source.includes(helperMarker)) {
  throw new Error(
    "extractPdfTextFromBytes marker not found. No file written."
  );
}

const spatialHelper = String.raw`
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

`;

source =
  source.replace(
    helperMarker,
    spatialHelper + helperMarker
  );

const parsePattern =
  /const parseFields = lines => \{[\s\S]*?\r?\n\};\r?\nconst compareFieldValue =/;

if (!parsePattern.test(source)) {
  throw new Error(
    "parseFields block not found. No file written."
  );
}

const newParser = String.raw`
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

const compareFieldValue =`;

source =
  source.replace(
    parsePattern,
    newParser
  );

const extractionPattern =
  /\/\/ Preserve logical PDF lines so overlapping values retain their field context\.[\s\S]*?pages\.push\(lines\.join\("\\n"\)\);/;

if (!extractionPattern.test(source)) {
  throw new Error(
    "Existing PDF line reconstruction block not found. No file written."
  );
}

source =
  source.replace(
    extractionPattern,
`// Reconstruct logical lines from visual PDF coordinates.
    // This handles replacement text appended later in the PDF stream.
    const lines =
      spatialTextLines(
        content.items
      );

    pages.push(
      lines.join("\\n")
    );`
  );

fs.writeFileSync(
  file,
  source,
  "utf8"
);

console.log(
  "Semantic localisation v2 patch applied successfully."
);
