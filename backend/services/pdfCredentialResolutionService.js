const {
  extractPdfText,
} = require(
  "./tamperAnalysisService"
);

const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

const STUDENT_PATTERNS = [
  /\bVZW-STU-\d{3,10}\b/gi,
  /\bR\d{6}[A-Z]\b/gi,
  /\bST-\d{3,10}\b/gi,
];

const normalise = (
  value
) =>
  String(
    value ?? ""
  )
    .normalize("NFKC")
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .toLowerCase();

const unique =
  (values) => [
    ...new Set(
      values.filter(
        Boolean
      )
    ),
  ];

const extractIdentifiers =
  (text) => {
    const source =
      String(
        text || ""
      );

    const uuids =
      unique(
        source.match(
          UUID_PATTERN
        ) || []
      ).slice(
        0,
        12
      );

    const studentNumbers =
      unique(
        STUDENT_PATTERNS.flatMap(
          (pattern) =>
            source.match(
              pattern
            ) || []
        )
      ).slice(
        0,
        12
      );

    return {
      uuids,
      studentNumbers,
    };
  };

const dateCandidates =
  (value) => {
    if (!value) {
      return [];
    }

    const values =
      new Set([
        normalise(
          value
        ),
      ]);

    const date =
      new Date(
        value
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      const yyyy =
        date
          .getUTCFullYear();

      const mm =
        String(
          date
            .getUTCMonth() +
            1
        ).padStart(
          2,
          "0"
        );

      const dd =
        String(
          date
            .getUTCDate()
        ).padStart(
          2,
          "0"
        );

      values.add(
        `${yyyy}-${mm}-${dd}`
      );

      values.add(
        `${dd}/${mm}/${yyyy}`
      );
    }

    return [
      ...values,
    ];
  };

const contains =
  (
    documentText,
    value
  ) => {
    if (!value) {
      return false;
    }

    return documentText.includes(
      normalise(
        value
      )
    );
  };

const scoreCandidate =
  (
    credential,
    submittedText
  ) => {
    const text =
      normalise(
        submittedText
      );

    let score = 0;

    const evidence =
      [];

    if (
      contains(
        text,
        credential
          ?.student_number
      )
    ) {
      score += 6;

      evidence.push(
        "STUDENT_NUMBER"
      );
    }

    if (
      contains(
        text,
        credential
          ?.student_name
      )
    ) {
      score += 3;

      evidence.push(
        "HOLDER_NAME"
      );
    }

    if (
      contains(
        text,
        credential
          ?.institution_name
      )
    ) {
      score += 3;

      evidence.push(
        "INSTITUTION"
      );
    }

    if (
      contains(
        text,
        credential
          ?.programme
      )
    ) {
      score += 3;

      evidence.push(
        "PROGRAMME"
      );
    }

    if (
      contains(
        text,
        credential
          ?.qualification
      )
    ) {
      score += 3;

      evidence.push(
        "QUALIFICATION"
      );
    }

    const issueDateMatched =
      dateCandidates(
        credential
          ?.issue_date
      ).some(
        (candidate) =>
          text.includes(
            candidate
          )
      );

    if (
      issueDateMatched
    ) {
      score += 1;

      evidence.push(
        "ISSUE_DATE"
      );
    }

    return {
      credential,
      score,
      evidence,
    };
  };

async function resolveCredentialFromText({
  text,
  findById,
  findByPublicToken,
  findByStudentNumber,
}) {
  const identifiers =
    extractIdentifiers(
      text
    );

  for (
    const uuid of
    identifiers.uuids
  ) {
    if (
      typeof findById ===
      "function"
    ) {
      const byId =
        await findById(
          uuid
        );

      if (byId) {
        return {
          credential:
            byId,

          resolutionMethod:
            "CREDENTIAL_ID",

          confidence:
            "HIGH",

          evidence: [
            "CREDENTIAL_ID",
          ],
        };
      }
    }

    if (
      typeof findByPublicToken ===
      "function"
    ) {
      const byToken =
        await findByPublicToken(
          uuid
        );

      if (byToken) {
        return {
          credential:
            byToken,

          resolutionMethod:
            "PUBLIC_TOKEN",

          confidence:
            "HIGH",

          evidence: [
            "PUBLIC_TOKEN",
          ],
        };
      }
    }
  }

  const candidates =
    [];

  if (
    typeof findByStudentNumber ===
    "function"
  ) {
    for (
      const studentNumber of
      identifiers.studentNumbers
    ) {
      const rows =
        await findByStudentNumber(
          studentNumber
        );

      if (
        Array.isArray(
          rows
        )
      ) {
        candidates.push(
          ...rows
        );
      }
    }
  }

  const distinct =
    [
      ...new Map(
        candidates
          .filter(
            (item) =>
              item?.id
          )
          .map(
            (item) => [
              item.id,
              item,
            ]
          )
      ).values(),
    ];

  if (
    distinct.length ===
    0
  ) {
    return {
      credential:
        null,

      resolutionMethod:
        null,

      confidence:
        null,

      evidence: [],
    };
  }

  const ranked =
    distinct
      .map(
        (credential) =>
          scoreCandidate(
            credential,
            text
          )
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  const best =
    ranked[0];

  const second =
    ranked[1];

  /*
   * Student number is strong evidence.
   * Multiple credentials for one student
   * must still be distinguishable using
   * programme/qualification/date/context.
   */
  const uniqueEnough =
    best &&
    best.score >= 6 &&
    (
      !second ||
      best.score -
        second.score >=
        2
    );

  if (
    !uniqueEnough
  ) {
    return {
      credential:
        null,

      resolutionMethod:
        null,

      confidence:
        null,

      evidence: [],
    };
  }

  return {
    credential:
      best.credential,

    resolutionMethod:
      "DOCUMENT_ATTRIBUTES",

    confidence:
      best.score >= 9
        ? "HIGH"
        : "MEDIUM",

    evidence:
      best.evidence,
  };
}

async function resolveCredentialFromPdf({
  filePath,
  ...dependencies
}) {
  try {
    const text =
      await extractPdfText(
        filePath
      );

    const resolution =
      await resolveCredentialFromText({
        text,
        ...dependencies,
      });

    return {
      ...resolution,

      identifiers:
        extractIdentifiers(
          text
        ),
    };
  } catch {
    return {
      credential:
        null,

      resolutionMethod:
        null,

      confidence:
        null,

      evidence: [],

      identifiers: {
        uuids: [],
        studentNumbers:
          [],
      },
    };
  }
}

module.exports = {
  extractIdentifiers,
  scoreCandidate,
  resolveCredentialFromText,
  resolveCredentialFromPdf,
};
