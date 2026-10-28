const fs = require("fs");

const file =
  "backend/services/tamperAnalysisService.js";

let source =
  fs.readFileSync(file, "utf8");

if (
  source.includes(
    "const reconstructLabelledCandidate ="
  )
) {
  console.log(
    "Wrapped-field repair already present."
  );

  process.exit(0);
}

const marker =
  "const compareFieldValue = (parts, matches) => {";

if (!source.includes(marker)) {
  throw new Error(
    "compareFieldValue marker not found. No file written."
  );
}

const helpers = String.raw`
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

`;

source =
  source.replace(
    marker,
    helpers + marker
  );

const branchPattern =
  /if \(baselineValues\.length\) \{\s*\/\/ Duplicate or inconsistent labels make exact attribution unsafe\.\s*if \(baselineValues\.length !== 1 \|\| !matches\(normalise\(baselineValues\[0\]\.join\(" "\)\)\)\) return field;\s*if \(submittedValues\.length !== 1\) return field;\s*field\.status = compareFieldValue\(submittedValues\[0\], matches\);\s*return field;\s*\}/;

if (!branchPattern.test(source)) {
  throw new Error(
    "Expected labelled baseline comparison block not found. No file written."
  );
}

const newBranch = `
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
    }`;

source =
  source.replace(
    branchPattern,
    newBranch
  );

fs.writeFileSync(
  file,
  source,
  "utf8"
);

console.log(
  "Wrapped labelled-field repair applied."
);
