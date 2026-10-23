const fs = require("fs/promises");

const {
  fetchOfficialPdf,
} = require("./pdfStructureAnalysisService");

const FIELD_DEFINITIONS = [
  {
    key: "student_name",
    label: "Holder name",
    keys: [
      "student_name",
      "studentName",
      "holder_name",
      "holderName",
    ],
    labels: [
      "holder name",
      "student name",
      "holder",
      "name",
    ],
    contexts: [
      "this is to certify that",
      "this certifies that",
      "awarded to",
      "presented to",
    ],
  },

  {
    key: "student_number",
    label: "Student / registration number",
    keys: [
      "student_number",
      "studentNumber",
      "registration_number",
      "registrationNumber",
    ],
    labels: [
      "student / registration number",
      "registration number",
      "student number",
    ],
  },

  {
    key: "institution_name",
    label: "Institution",
    keys: [
      "institution_name",
      "institutionName",
      "institution",
    ],
    labels: [
      "institution name",
      "institution",
    ],
    issuedBy: true,
  },

  {
    key: "programme",
    label: "Programme",
    keys: [
      "programme",
      "program",
      "programme_name",
      "programName",
    ],
    labels: [
      "programme",
      "program",
    ],
  },

  {
    key: "qualification",
    label: "Qualification",
    keys: [
      "qualification",
      "qualification_name",
    ],
    labels: [
      "qualification",
    ],
    contexts: [
      "has been awarded the qualification",
      "has been awarded qualification",
      "qualification awarded",
    ],
  },

  {
    key: "classification",
    label: "Degree classification",
    keys: [
      "classification",
      "degree_classification",
      "degreeClassification",
    ],
    labels: [
      "degree classification",
      "classification",
    ],
  },

  {
    key: "issue_date",
    label: "Issue date",
    keys: [
      "issue_date",
      "issueDate",
      "award_date",
      "awardDate",
    ],
    labels: [
      "date of issue",
      "date of award",
      "issue date",
      "award date",
    ],
    date: true,
    issuedBy: true,
  },
];

const normalise = value =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const firstValue = (
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

const escapeRegex = value =>
  value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const dateCandidates = value => {
  const values =
    new Set([
      normalise(value),
    ]);

  const iso =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (iso) {
    const year = iso[1];
    const month =
      Number(iso[2]);
    const day =
      Number(iso[3]);

    const monthName =
      MONTHS[
        month - 1
      ];

    if (monthName) {
      [
        `${day} ${monthName} ${year}`,
        `${monthName} ${day} ${year}`,
        `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`,
        `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
        `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
      ].forEach(candidate =>
        values.add(
          normalise(candidate)
        )
      );
    }
  }

  return [
    ...values,
  ].filter(Boolean);
};

const candidatesFor = (
  definition,
  officialValue
) =>
  definition.date
    ? dateCandidates(
        officialValue
      )
    : [
        normalise(
          officialValue
        ),
      ];

const ALL_LABELS =
  FIELD_DEFINITIONS
    .flatMap(
      definition =>
        definition.labels ||
        []
    )
    .sort(
      (a, b) =>
        b.length -
        a.length
    );

const matchLabel = (
  row,
  labels = ALL_LABELS
) => {
  for (
    const label of [
      ...labels,
    ].sort(
      (a, b) =>
        b.length -
        a.length
    )
  ) {
    const expression =
      new RegExp(
        `^${escapeRegex(
          normalise(label)
        )}(?:\\s*[:\\-]\\s*(.*))?$`
      );

    const match =
      row.match(
        expression
      );

    if (match) {
      return {
        label:
          normalise(label),

        value:
          normalise(
            match[1] ?? ""
          ),
      };
    }
  }

  return null;
};

const isAnyLabel = row =>
  Boolean(
    matchLabel(row)
  );

const matchesCandidate = (
  value,
  candidates
) =>
  candidates.includes(
    normalise(value)
  );

const combineRows = (
  rows,
  start,
  span
) =>
  normalise(
    rows
      .slice(
        start,
        start + span
      )
      .map(
        row =>
          row.text
      )
      .join(" ")
  );

async function extractLayout(
  bytes
) {
  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const task =
    pdfjs.getDocument({
      data:
        new Uint8Array(
          bytes
        ),

      disableWorker: true,
    });

  try {
    const pdf =
      await task.promise;

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

      const glyphs =
        content.items
          .filter(
            item =>
              typeof item.str ===
                "string" &&
              item.str.length &&
              Number.isFinite(
                item.transform?.[4]
              ) &&
              Number.isFinite(
                item.transform?.[5]
              )
          )
          .map(
            item => ({
              text:
                item.str,

              x:
                Number(
                  item.transform[4]
                ),

              y:
                Number(
                  item.transform[5]
                ),

              width:
                Number(
                  item.width || 0
                ),

              height:
                Number(
                  item.height || 0
                ),
            })
          );

      glyphs.sort(
        (a, b) =>
          b.y - a.y ||
          a.x - b.x
      );

      const rows = [];

      for (
        const glyph of
        glyphs
      ) {
        let selected =
          null;

        let distance =
          Infinity;

        for (
          const row of
          rows
        ) {
          const current =
            Math.abs(
              row.y -
                glyph.y
            );

          if (
            current <=
              2.5 &&
            current <
              distance
          ) {
            selected =
              row;

            distance =
              current;
          }
        }

        if (!selected) {
          selected = {
            y:
              glyph.y,

            items: [],
          };

          rows.push(
            selected
          );
        }

        selected.items.push(
          glyph
        );
      }

      rows.sort(
        (a, b) =>
          b.y - a.y
      );

      const logicalRows =
        rows
          .map(row => {
            row.items.sort(
              (a, b) =>
                a.x - b.x
            );

            let text = "";
            let previousRight =
              null;

            for (
              const item of
              row.items
            ) {
              const raw =
                String(
                  item.text ||
                    ""
                );

              const right =
                item.x +
                item.width;

              if (
                !raw.trim()
              ) {
                previousRight =
                  right;

                continue;
              }

              const gap =
                previousRight ===
                null
                  ? null
                  : item.x -
                    previousRight;

              const separator =
                text &&
                gap !== null &&
                gap >
                  Math.max(
                    0.5,
                    Number(
                      item.height ||
                        0
                    ) *
                      0.08
                  )
                  ? " "
                  : "";

              text +=
                separator +
                raw;

              previousRight =
                right;
            }

            const useful =
              row.items.filter(
                item =>
                  String(
                    item.text ||
                      ""
                  ).trim()
              );

            return {
              text:
                text.trim(),

              norm:
                normalise(
                  text
                ),

              y:
                row.y,

              height:
                Math.max(
                  1,
                  ...useful.map(
                    item =>
                      item.height ||
                      1
                  )
                ),

              x1:
                useful.length
                  ? Math.min(
                      ...useful.map(
                        item =>
                          item.x
                      )
                    )
                  : 0,

              x2:
                useful.length
                  ? Math.max(
                      ...useful.map(
                        item =>
                          item.x +
                          item.width
                      )
                    )
                  : 0,
            };
          })
          .filter(
            row =>
              row.norm
          );

      pages.push({
        pageNumber,
        rows:
          logicalRows,
      });
    }

    return pages;
  } finally {
    await task.destroy();
  }
}

const uniqueAnchor = anchors => {
  if (
    anchors.length !== 1
  ) {
    return null;
  }

  return anchors[0];
};

const labelAnchors = (
  layout,
  definition,
  candidates
) => {
  const anchors = [];

  for (
    let pageIndex = 0;
    pageIndex <
      layout.length;
    pageIndex += 1
  ) {
    const rows =
      layout[
        pageIndex
      ].rows;

    for (
      let rowIndex = 0;
      rowIndex <
        rows.length;
      rowIndex += 1
    ) {
      const labelled =
        matchLabel(
          rows[
            rowIndex
          ].norm,
          definition.labels ||
            []
        );

      if (!labelled) {
        continue;
      }

      if (
        labelled.value &&
        matchesCandidate(
          labelled.value,
          candidates
        )
      ) {
        anchors.push({
          type:
            "LABEL",

          pageIndex,
          rowIndex,
          span: 1,

          label:
            labelled.label,

          y:
            rows[
              rowIndex
            ].y,

          x1:
            rows[
              rowIndex
            ].x1,

          x2:
            rows[
              rowIndex
            ].x2,
        });

        continue;
      }

      for (
        let span = 1;
        span <= 2;
        span += 1
      ) {
        const value =
          combineRows(
            rows,
            rowIndex + 1,
            span
          );

        if (
          value &&
          matchesCandidate(
            value,
            candidates
          )
        ) {
          anchors.push({
            type:
              "LABEL_NEXT",

            pageIndex,
            rowIndex,
            valueRowIndex:
              rowIndex + 1,

            span,

            label:
              labelled.label,

            y:
              rows[
                rowIndex +
                  1
              ]?.y ??
              rows[
                rowIndex
              ].y,

            x1:
              rows[
                rowIndex +
                  1
              ]?.x1 ??
              rows[
                rowIndex
              ].x1,

            x2:
              rows[
                rowIndex +
                  1
              ]?.x2 ??
              rows[
                rowIndex
              ].x2,
          });

          break;
        }

        if (
          isAnyLabel(
            rows[
              rowIndex +
                span
            ]?.norm ||
              ""
          )
        ) {
          break;
        }
      }
    }
  }

  return uniqueAnchor(
    anchors
  );
};

const contextAnchors = (
  layout,
  definition,
  candidates
) => {
  const contexts =
    (
      definition.contexts ||
      []
    ).map(
      normalise
    );

  if (!contexts.length) {
    return null;
  }

  const anchors = [];

  for (
    let pageIndex = 0;
    pageIndex <
      layout.length;
    pageIndex += 1
  ) {
    const rows =
      layout[
        pageIndex
      ].rows;

    for (
      let rowIndex = 0;
      rowIndex <
        rows.length;
      rowIndex += 1
    ) {
      if (
        !contexts.includes(
          rows[
            rowIndex
          ].norm
        )
      ) {
        continue;
      }

      for (
        let span = 1;
        span <= 2;
        span += 1
      ) {
        const value =
          combineRows(
            rows,
            rowIndex + 1,
            span
          );

        if (
          value &&
          matchesCandidate(
            value,
            candidates
          )
        ) {
          anchors.push({
            type:
              "CONTEXT_NEXT",

            pageIndex,
            rowIndex,

            valueRowIndex:
              rowIndex + 1,

            span,

            context:
              rows[
                rowIndex
              ].norm,

            y:
              rows[
                rowIndex +
                  1
              ]?.y ??
              rows[
                rowIndex
              ].y,

            x1:
              rows[
                rowIndex +
                  1
              ]?.x1 ??
              0,

            x2:
              rows[
                rowIndex +
                  1
              ]?.x2 ??
              0,
          });

          break;
        }
      }
    }
  }

  return uniqueAnchor(
    anchors
  );
};

const issuedAnchor = (
  layout,
  definition,
  candidates
) => {
  if (
    !definition.issuedBy
  ) {
    return null;
  }

  const anchors = [];

  for (
    let pageIndex = 0;
    pageIndex <
      layout.length;
    pageIndex += 1
  ) {
    const rows =
      layout[
        pageIndex
      ].rows;

    for (
      let rowIndex = 0;
      rowIndex <
        rows.length;
      rowIndex += 1
    ) {
      const match =
        rows[
          rowIndex
        ].norm.match(
          /^issued by\s+(.+?)\s+on\s+(.+)$/
        );

      if (!match) {
        continue;
      }

      const value =
        definition.key ===
        "institution_name"
          ? match[1]
          : match[2];

      if (
        matchesCandidate(
          value,
          candidates
        )
      ) {
        anchors.push({
          type:
            "ISSUED_SENTENCE",

          pageIndex,
          rowIndex,

          y:
            rows[
              rowIndex
            ].y,

          x1:
            rows[
              rowIndex
            ].x1,

          x2:
            rows[
              rowIndex
            ].x2,
        });
      }
    }
  }

  return uniqueAnchor(
    anchors
  );
};

const coordinateAnchor = (
  layout,
  definition,
  candidates,
  credential
) => {
  /*
   * Do not assign one unlabelled physical value to two
   * semantic fields with identical official values.
   */
  const shared =
    FIELD_DEFINITIONS.some(
      other => {
        if (
          other.key ===
          definition.key
        ) {
          return false;
        }

        const value =
          firstValue(
            credential,
            other.keys
          );

        if (!value) {
          return false;
        }

        const otherCandidates =
          candidatesFor(
            other,
            value
          );

        return candidates.some(
          candidate =>
            otherCandidates.includes(
              candidate
            )
        );
      }
    );

  if (shared) {
    return null;
  }

  const anchors = [];

  for (
    let pageIndex = 0;
    pageIndex <
      layout.length;
    pageIndex += 1
  ) {
    const rows =
      layout[
        pageIndex
      ].rows;

    for (
      let rowIndex = 0;
      rowIndex <
        rows.length;
      rowIndex += 1
    ) {
      for (
        let span = 1;
        span <= 2;
        span += 1
      ) {
        const value =
          combineRows(
            rows,
            rowIndex,
            span
          );

        if (
          matchesCandidate(
            value,
            candidates
          )
        ) {
          const selected =
            rows.slice(
              rowIndex,
              rowIndex +
                span
            );

          anchors.push({
            type:
              "COORDINATE",

            pageIndex,
            rowIndex,
            span,

            y:
              rows[
                rowIndex
              ].y,

            height:
              Math.max(
                ...selected.map(
                  row =>
                    row.height
                )
              ),

            x1:
              Math.min(
                ...selected.map(
                  row =>
                    row.x1
                )
              ),

            x2:
              Math.max(
                ...selected.map(
                  row =>
                    row.x2
                )
              ),
          });
        }
      }
    }
  }

  return uniqueAnchor(
    anchors
  );
};

const findAnchor = (
  layout,
  definition,
  candidates,
  credential
) =>
  labelAnchors(
    layout,
    definition,
    candidates
  ) ||
  contextAnchors(
    layout,
    definition,
    candidates
  ) ||
  issuedAnchor(
    layout,
    definition,
    candidates
  ) ||
  coordinateAnchor(
    layout,
    definition,
    candidates,
    credential
  );

const resolveLabel = (
  layout,
  definition,
  anchor
) => {
  const page =
    layout[
      anchor.pageIndex
    ];

  if (!page) {
    return null;
  }

  const matches = [];

  for (
    let rowIndex = 0;
    rowIndex <
      page.rows.length;
    rowIndex += 1
  ) {
    const labelled =
      matchLabel(
        page.rows[
          rowIndex
        ].norm,
        definition.labels ||
          []
      );

    if (
      !labelled ||
      labelled.label !==
        anchor.label
    ) {
      continue;
    }

    if (
      anchor.type ===
      "LABEL"
    ) {
      matches.push(
        labelled.value
      );

      continue;
    }

    matches.push(
      combineRows(
        page.rows,
        rowIndex + 1,
        anchor.span
      )
    );
  }

  return matches.length === 1
    ? matches[0]
    : null;
};

const resolveContext = (
  layout,
  anchor
) => {
  const page =
    layout[
      anchor.pageIndex
    ];

  if (!page) {
    return null;
  }

  const indexes =
    page.rows
      .map(
        (row, index) =>
          row.norm ===
          anchor.context
            ? index
            : -1
      )
      .filter(
        index =>
          index >= 0
      );

  if (
    indexes.length !== 1
  ) {
    return null;
  }

  return combineRows(
    page.rows,
    indexes[0] + 1,
    anchor.span
  );
};

const resolveIssued = (
  layout,
  definition,
  anchor
) => {
  const page =
    layout[
      anchor.pageIndex
    ];

  if (!page) {
    return null;
  }

  const matches =
    page.rows
      .map(
        row =>
          row.norm.match(
            /^issued by\s+(.+?)\s+on\s+(.+)$/
          )
      )
      .filter(Boolean);

  if (
    matches.length !== 1
  ) {
    return null;
  }

  return definition.key ===
    "institution_name"
    ? matches[0][1]
    : matches[0][2];
};

const overlap = (
  a1,
  a2,
  b1,
  b2
) => {
  const intersection =
    Math.max(
      0,
      Math.min(
        a2,
        b2
      ) -
        Math.max(
          a1,
          b1
        )
    );

  const base =
    Math.max(
      1,
      a2 - a1
    );

  return (
    intersection /
    base
  );
};

const resolveCoordinate = (
  layout,
  anchor
) => {
  const page =
    layout[
      anchor.pageIndex
    ];

  if (!page) {
    return null;
  }

  const tolerance =
    Math.max(
      8,
      Number(
        anchor.height ||
          0
      ) *
        1.5
    );

  const candidates =
    page.rows
      .map(
        (row, index) => ({
          row,
          index,
          distance:
            Math.abs(
              row.y -
                anchor.y
            ),

          overlap:
            overlap(
              anchor.x1,
              anchor.x2,
              row.x1,
              row.x2
            ),
        })
      )
      .filter(
        candidate =>
          candidate.distance <=
            tolerance &&
          candidate.overlap >=
            0.15
      )
      .sort(
        (a, b) =>
          a.distance -
          b.distance ||
          b.overlap -
          a.overlap
      );

  if (!candidates.length) {
    return null;
  }

  const selected =
    candidates[0];

  return combineRows(
    page.rows,
    selected.index,
    anchor.span
  );
};

const resolveAnchor = (
  submittedLayout,
  definition,
  anchor
) => {
  switch (
    anchor.type
  ) {
    case "LABEL":
    case "LABEL_NEXT":
      return resolveLabel(
        submittedLayout,
        definition,
        anchor
      );

    case "CONTEXT_NEXT":
      return resolveContext(
        submittedLayout,
        anchor
      );

    case "ISSUED_SENTENCE":
      return resolveIssued(
        submittedLayout,
        definition,
        anchor
      );

    case "COORDINATE":
      return resolveCoordinate(
        submittedLayout,
        anchor
      );

    default:
      return null;
  }
};

async function analyseAnchoredSemanticChangesFromBytes({
  credential,
  officialBytes,
  submittedBytes,
}) {
  const [
    officialLayout,
    submittedLayout,
  ] =
    await Promise.all([
      extractLayout(
        officialBytes
      ),

      extractLayout(
        submittedBytes
      ),
    ]);

  const fields =
    FIELD_DEFINITIONS.map(
      definition => {
        const officialValue =
          firstValue(
            credential,
            definition.keys
          );

        const field = {
          field:
            definition.key,

          label:
            definition.label,

          status:
            "NOT_AVAILABLE",
        };

        if (!officialValue) {
          return field;
        }

        field.status =
          "NOT_ASSESSABLE";

        const candidates =
          candidatesFor(
            definition,
            officialValue
          );

        const anchor =
          findAnchor(
            officialLayout,
            definition,
            candidates,
            credential
          );

        if (!anchor) {
          return field;
        }

        const submittedValue =
          resolveAnchor(
            submittedLayout,
            definition,
            anchor
          );

        if (
          submittedValue ===
          null
        ) {
          return field;
        }

        field.status =
          matchesCandidate(
            submittedValue,
            candidates
          )
            ? "UNCHANGED"
            : "ALTERED";

        return field;
      }
    );

  const alteredFields =
    fields.filter(
      field =>
        field.status ===
        "ALTERED"
    );

  return {
    analysisAvailable:
      true,

    fields,

    alteredFields,

    semanticTamperingDetected:
      alteredFields.length >
      0,
  };
}

async function analyseAnchoredSemanticChanges({
  credential,
  filePath,
}) {
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
        analysisAvailable:
          false,

        reason:
          official?.reason ||
          "AUTHORITATIVE_PDF_UNAVAILABLE",

        fields: [],
        alteredFields: [],
      };
    }

    const submittedBytes =
      new Uint8Array(
        await fs.readFile(
          filePath
        )
      );

    return await analyseAnchoredSemanticChangesFromBytes({
      credential,

      officialBytes:
        official.bytes,

      submittedBytes,
    });
  } catch {
    return {
      analysisAvailable:
        false,

      reason:
        "SEMANTIC_ANCHOR_ANALYSIS_UNAVAILABLE",

      fields: [],
      alteredFields: [],
    };
  }
}

module.exports = {
  analyseAnchoredSemanticChanges,
  analyseAnchoredSemanticChangesFromBytes,
  extractLayout,
};
