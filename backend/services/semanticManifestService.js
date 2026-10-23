const fs =
  require("fs/promises");

const {
  extractSemanticLayout,
  combineRows,
  mergeBounds,
} =
  require(
    "./pdfSemanticLayoutService"
  );

const {
  normalizeText,
  canonicalizeFieldValue,
} =
  require(
    "./semanticCanonicalisationService"
  );

const MANIFEST_VERSION = 1;

const FIELD_DEFINITIONS = [
  {
    field:
      "student_name",

    label:
      "Holder name",

    semanticType:
      "TEXT",

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
    field:
      "student_number",

    label:
      "Student / registration number",

    semanticType:
      "TEXT",

    labels: [
      "student / registration number",
      "registration number",
      "student number",
    ],
  },

  {
    field:
      "institution_name",

    label:
      "Institution",

    semanticType:
      "TEXT",

    labels: [
      "institution name",
      "institution",
    ],

    issuedBy:
      true,
  },

  {
    field:
      "programme",

    label:
      "Programme",

    semanticType:
      "TEXT",

    labels: [
      "programme",
      "program",
    ],
  },

  {
    field:
      "qualification",

    label:
      "Qualification",

    semanticType:
      "TEXT",

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
    field:
      "classification",

    label:
      "Degree classification",

    semanticType:
      "TEXT",

    labels: [
      "degree classification",
      "classification",
    ],
  },

  {
    field:
      "issue_date",

    label:
      "Issue date",

    semanticType:
      "DATE",

    labels: [
      "date of issue",
      "date of award",
      "issue date",
      "award date",
    ],

    issuedBy:
      true,
  },
];

const escapeRegex =
  value =>
    String(value)
      .replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

const valueEquals =
  (
    field,
    candidate,
    officialValue
  ) => {
    const candidateValue =
      canonicalizeFieldValue(
        field,
        candidate
      );

    const official =
      canonicalizeFieldValue(
        field,
        officialValue
      );

    return Boolean(
      candidateValue &&
      official &&
      candidateValue ===
        official
    );
  };

const normalizedBounds =
  (
    page,
    rows
  ) => {
    const bounds =
      mergeBounds(
        rows
      );

    if (!bounds) {
      return null;
    }

    return {
      x1:
        bounds.x1 /
        Math.max(
          1,
          page.width
        ),

      x2:
        bounds.x2 /
        Math.max(
          1,
          page.width
        ),

      y:
        bounds.y /
        Math.max(
          1,
          page.height
        ),

      height:
        bounds.height /
        Math.max(
          1,
          page.height
        ),
    };
  };

const parseLabel =
  (
    rowText,
    labels
  ) => {
    const normalized =
      normalizeText(
        rowText
      );

    for (
      const label of
      [...labels].sort(
        (a, b) =>
          b.length -
          a.length
      )
    ) {
      const canonicalLabel =
        normalizeText(
          label
        );

      const regex =
        new RegExp(
          `^${escapeRegex(
            canonicalLabel
          )}\\s*(?::|-)?\\s*(.*)$`,
          "i"
        );

      const match =
        normalized.match(
          regex
        );

      if (match) {
        return {
          label:
            canonicalLabel,

          value:
            normalizeText(
              match[1] || ""
            ),
        };
      }
    }

    return null;
  };

const findLabelAnchor =
  (
    layout,
    definition,
    officialValue
  ) => {
    const matches = [];

    for (
      let pageIndex = 0;
      pageIndex <
        layout.length;
      pageIndex += 1
    ) {
      const page =
        layout[
          pageIndex
        ];

      for (
        let rowIndex = 0;
        rowIndex <
          page.rows.length;
        rowIndex += 1
      ) {
        const parsed =
          parseLabel(
            page.rows[
              rowIndex
            ].text,
            definition.labels ||
              []
          );

        if (!parsed) {
          continue;
        }

        if (
          parsed.value &&
          valueEquals(
            definition.field,
            parsed.value,
            officialValue
          )
        ) {
          matches.push({
            type:
              "LABEL_INLINE",

            page:
              page.pageNumber,

            label:
              parsed.label,

            span: 1,

            bounds:
              normalizedBounds(
                page,
                [
                  page.rows[
                    rowIndex
                  ],
                ]
              ),
          });

          continue;
        }

        for (
          let span = 1;
          span <= 2;
          span += 1
        ) {
          const candidate =
            combineRows(
              page.rows,
              rowIndex + 1,
              span
            );

          if (
            candidate &&
            valueEquals(
              definition.field,
              candidate,
              officialValue
            )
          ) {
            matches.push({
              type:
                "LABEL_NEXT",

              page:
                page.pageNumber,

              label:
                parsed.label,

              span,

              bounds:
                normalizedBounds(
                  page,
                  page.rows.slice(
                    rowIndex + 1,
                    rowIndex +
                      1 +
                      span
                  )
                ),
            });

            break;
          }
        }
      }
    }

    return matches.length === 1
      ? matches[0]
      : null;
  };

const findContextAnchor =
  (
    layout,
    definition,
    officialValue
  ) => {
    const contexts =
      (
        definition.contexts ||
        []
      ).map(
        normalizeText
      );

    if (!contexts.length) {
      return null;
    }

    const matches = [];

    for (
      const page of
      layout
    ) {
      for (
        let rowIndex = 0;
        rowIndex <
          page.rows.length;
        rowIndex += 1
      ) {
        const row =
          page.rows[
            rowIndex
          ];

        const context =
          contexts.find(
            candidate =>
              row.norm ===
                candidate ||
              row.norm.startsWith(
                candidate
              )
          );

        if (!context) {
          continue;
        }

        for (
          let span = 1;
          span <= 2;
          span += 1
        ) {
          const candidate =
            combineRows(
              page.rows,
              rowIndex + 1,
              span
            );

          if (
            candidate &&
            valueEquals(
              definition.field,
              candidate,
              officialValue
            )
          ) {
            matches.push({
              type:
                "CONTEXT_NEXT",

              page:
                page.pageNumber,

              context,

              span,

              bounds:
                normalizedBounds(
                  page,
                  page.rows.slice(
                    rowIndex + 1,
                    rowIndex +
                      1 +
                      span
                  )
                ),
            });

            break;
          }
        }
      }
    }

    return matches.length === 1
      ? matches[0]
      : null;
  };

const findIssuedByAnchor =
  (
    layout,
    definition,
    officialValue
  ) => {
    if (
      !definition.issuedBy
    ) {
      return null;
    }

    const matches = [];

    for (
      const page of
      layout
    ) {
      for (
        const row of
        page.rows
      ) {
        const match =
          row.text.match(
            /^issued\s+by\s+(.+?)\s+on\s+(.+)$/i
          );

        if (!match) {
          continue;
        }

        const candidate =
          definition.field ===
            "institution_name"
            ? match[1]
            : match[2];

        if (
          valueEquals(
            definition.field,
            candidate,
            officialValue
          )
        ) {
          matches.push({
            type:
              "ISSUED_BY",

            page:
              page.pageNumber,

            part:
              definition.field ===
                "institution_name"
                ? "institution"
                : "date",

            span: 1,

            bounds:
              normalizedBounds(
                page,
                [row]
              ),
          });
        }
      }
    }

    return matches.length === 1
      ? matches[0]
      : null;
  };

const findUniqueValueAnchor =
  (
    layout,
    definition,
    officialValue,
    allValues
  ) => {
    const canonicalOfficial =
      canonicalizeFieldValue(
        definition.field,
        officialValue
      );

    /*
     * One unlabelled occurrence must not
     * become ownership evidence for two
     * semantic fields containing the same
     * official value.
     */
    const duplicateSemanticValue =
      Object.entries(
        allValues
      ).some(
        ([field, value]) => {
          if (
            field ===
              definition.field ||
            value === null ||
            value === undefined ||
            String(value).trim() ===
              ""
          ) {
            return false;
          }

          return (
            canonicalizeFieldValue(
              field,
              value
            ) ===
            canonicalOfficial
          );
        }
      );

    if (
      duplicateSemanticValue
    ) {
      return null;
    }

    const matches = [];

    for (
      const page of
      layout
    ) {
      for (
        let rowIndex = 0;
        rowIndex <
          page.rows.length;
        rowIndex += 1
      ) {
        for (
          let span = 1;
          span <= 2;
          span += 1
        ) {
          const candidate =
            combineRows(
              page.rows,
              rowIndex,
              span
            );

          if (
            candidate &&
            valueEquals(
              definition.field,
              candidate,
              officialValue
            )
          ) {
            matches.push({
              type:
                "POSITION",

              page:
                page.pageNumber,

              span,

              bounds:
                normalizedBounds(
                  page,
                  page.rows.slice(
                    rowIndex,
                    rowIndex +
                      span
                  )
                ),
            });
          }
        }
      }
    }

    return matches.length === 1
      ? matches[0]
      : null;
  };

const buildFieldManifest =
  (
    layout,
    definition,
    value,
    allValues
  ) => {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() ===
        ""
    ) {
      return {
        field:
          definition.field,

        label:
          definition.label,

        status:
          "NOT_AVAILABLE",

        semanticType:
          definition.semanticType,
      };
    }

    const canonicalValue =
      canonicalizeFieldValue(
        definition.field,
        value
      );

    if (!canonicalValue) {
      return {
        field:
          definition.field,

        label:
          definition.label,

        status:
          "NOT_ASSESSABLE",

        semanticType:
          definition.semanticType,
      };
    }

    const anchor =
      findLabelAnchor(
        layout,
        definition,
        value
      ) ||
      findContextAnchor(
        layout,
        definition,
        value
      ) ||
      findIssuedByAnchor(
        layout,
        definition,
        value
      ) ||
      findUniqueValueAnchor(
        layout,
        definition,
        value,
        allValues
      );

    if (!anchor) {
      return {
        field:
          definition.field,

        label:
          definition.label,

        status:
          "NOT_ASSESSABLE",

        semanticType:
          definition.semanticType,
      };
    }

    return {
      field:
        definition.field,

      label:
        definition.label,

      status:
        "ASSESSABLE",

      semanticType:
        definition.semanticType,

      canonicalValue,

      anchor,
    };
  };

const validateManifest =
  manifest => {
    if (
      !manifest ||
      manifest.version !==
        MANIFEST_VERSION ||
      !/^[a-f0-9]{64}$/i.test(
        String(
          manifest.sourceSha256 ||
            ""
        )
      ) ||
      !manifest.fields ||
      typeof manifest.fields !==
        "object"
    ) {
      return false;
    }

    return true;
  };

async function buildSemanticManifestFromBytes({
  sourceBytes,
  sourceHash,
  fields,
}) {
  if (
    !/^[a-f0-9]{64}$/i.test(
      String(sourceHash || "")
    )
  ) {
    const error =
      new Error(
        "Semantic manifest source hash is invalid."
      );

    error.code =
      "SEMANTIC_MANIFEST_INVALID";

    throw error;
  }

  const layout =
    await extractSemanticLayout(
      sourceBytes
    );

  const result = {};

  for (
    const definition of
    FIELD_DEFINITIONS
  ) {
    result[
      definition.field
    ] =
      buildFieldManifest(
        layout,
        definition,
        fields?.[
          definition.field
        ],
        fields || {}
      );
  }

  return {
    version:
      MANIFEST_VERSION,

    sourceSha256:
      String(
        sourceHash
      ).toLowerCase(),

    fields:
      result,
  };
}

async function buildSemanticManifestFromFile({
  filePath,
  sourceHash,
  fields,
}) {
  const sourceBytes =
    await fs.readFile(
      filePath
    );

  return buildSemanticManifestFromBytes({
    sourceBytes,
    sourceHash,
    fields,
  });
}

const findPage =
  (
    layout,
    pageNumber
  ) =>
    layout.find(
      page =>
        page.pageNumber ===
        pageNumber
    );

const extractByLabel =
  (
    page,
    fieldManifest
  ) => {
    const anchor =
      fieldManifest.anchor;

    const candidates = [];

    for (
      let rowIndex = 0;
      rowIndex <
        page.rows.length;
      rowIndex += 1
    ) {
      const parsed =
        parseLabel(
          page.rows[
            rowIndex
          ].text,
          [
            anchor.label,
          ]
        );

      if (!parsed) {
        continue;
      }

      if (
        anchor.type ===
        "LABEL_INLINE"
      ) {
        candidates.push(
          parsed.value
        );
      } else {
        candidates.push(
          combineRows(
            page.rows,
            rowIndex + 1,
            anchor.span || 1
          )
        );
      }
    }

    return candidates.length === 1
      ? candidates[0]
      : null;
  };

const extractByContext =
  (
    page,
    fieldManifest
  ) => {
    const anchor =
      fieldManifest.anchor;

    const indexes =
      page.rows
        .map(
          (row, index) =>
            (
              row.norm ===
                anchor.context ||
              row.norm.startsWith(
                anchor.context
              )
            )
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
      anchor.span || 1
    );
  };

const extractIssuedBy =
  (
    page,
    fieldManifest
  ) => {
    const matches =
      page.rows
        .map(
          row =>
            row.text.match(
              /^issued\s+by\s+(.+?)\s+on\s+(.+)$/i
            )
        )
        .filter(Boolean);

    if (
      matches.length !== 1
    ) {
      return null;
    }

    return fieldManifest
      .anchor
      .part ===
      "institution"
        ? matches[0][1]
        : matches[0][2];
  };

const horizontalOverlap =
  (
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

    return intersection /
      Math.max(
        0.000001,
        a2 - a1
      );
  };

const extractByPosition =
  (
    page,
    fieldManifest
  ) => {
    const bounds =
      fieldManifest
        .anchor
        .bounds;

    if (!bounds) {
      return null;
    }

    const candidates =
      page.rows
        .map(
          (row, index) => ({
            row,
            index,

            distance:
              Math.abs(
                row.ny -
                  bounds.y
              ),

            overlap:
              horizontalOverlap(
                bounds.x1,
                bounds.x2,
                row.nx1,
                row.nx2
              ),
          })
        )
        .filter(
          candidate =>
            candidate.distance <=
              Math.max(
                0.015,
                bounds.height *
                  2
              ) &&
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

    return combineRows(
      page.rows,
      candidates[0].index,
      fieldManifest
        .anchor
        .span || 1
    );
  };

const extractSubmittedValue =
  (
    layout,
    fieldManifest
  ) => {
    const page =
      findPage(
        layout,
        fieldManifest
          .anchor
          .page
      );

    if (!page) {
      return null;
    }

    switch (
      fieldManifest
        .anchor
        .type
    ) {
      case "LABEL_INLINE":
      case "LABEL_NEXT":
        return extractByLabel(
          page,
          fieldManifest
        );

      case "CONTEXT_NEXT":
        return extractByContext(
          page,
          fieldManifest
        );

      case "ISSUED_BY":
        return extractIssuedBy(
          page,
          fieldManifest
        );

      case "POSITION":
        return extractByPosition(
          page,
          fieldManifest
        );

      default:
        return null;
    }
  };

async function verifySemanticManifestAgainstBytes({
  manifest,
  submittedBytes,
}) {
  if (
    !validateManifest(
      manifest
    )
  ) {
    return {
      analysisAvailable:
        false,

      reason:
        "SEMANTIC_MANIFEST_INVALID",

      fields: [],

      alteredFields: [],

      semanticTamperingDetected:
        false,
    };
  }

  const layout =
    await extractSemanticLayout(
      submittedBytes
    );

  const fields =
    FIELD_DEFINITIONS.map(
      definition => {
        const stored =
          manifest
            .fields?.[
              definition.field
            ];

        if (!stored) {
          return {
            field:
              definition.field,

            label:
              definition.label,

            status:
              "NOT_AVAILABLE",
          };
        }

        if (
          stored.status ===
          "NOT_AVAILABLE"
        ) {
          return {
            field:
              definition.field,

            label:
              stored.label ||
                definition.label,

            status:
              "NOT_AVAILABLE",
          };
        }

        if (
          stored.status !==
          "ASSESSABLE" ||
          !stored.anchor ||
          !stored.canonicalValue
        ) {
          return {
            field:
              definition.field,

            label:
              stored.label ||
                definition.label,

            status:
              "NOT_ASSESSABLE",
          };
        }

        const candidate =
          extractSubmittedValue(
            layout,
            stored
          );

        if (
          candidate === null ||
          candidate === undefined ||
          String(candidate).trim() ===
            ""
        ) {
          return {
            field:
              definition.field,

            label:
              stored.label ||
                definition.label,

            status:
              "NOT_ASSESSABLE",
          };
        }

        const canonicalCandidate =
          canonicalizeFieldValue(
            definition.field,
            candidate
          );

        if (!canonicalCandidate) {
          return {
            field:
              definition.field,

            label:
              stored.label ||
                definition.label,

            status:
              "NOT_ASSESSABLE",
          };
        }

        return {
          field:
            definition.field,

          label:
            stored.label ||
              definition.label,

          status:
            canonicalCandidate ===
              stored.canonicalValue
              ? "UNCHANGED"
              : "ALTERED",
        };
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

async function verifySemanticManifestFromFile({
  manifest,
  filePath,
}) {
  const submittedBytes =
    await fs.readFile(
      filePath
    );

  return verifySemanticManifestAgainstBytes({
    manifest,
    submittedBytes,
  });
}

module.exports = {
  MANIFEST_VERSION,
  FIELD_DEFINITIONS,
  validateManifest,
  buildSemanticManifestFromBytes,
  buildSemanticManifestFromFile,
  verifySemanticManifestAgainstBytes,
  verifySemanticManifestFromFile,
};
