const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  normalizeText,
  canonicalizeDate,
  canonicalizeFieldValue,
} =
  require(
    "../backend/services/semanticCanonicalisationService"
  );

test(
  "all supported date forms canonicalise identically",
  () => {
    const values = [
      "2026-10-22",
      "22-10-2026",
      "22/10/2026",
      "22 October 2026",
      "October 22, 2026",
      "October 22 2026",
    ];

    for (
      const value of
      values
    ) {
      assert.equal(
        canonicalizeDate(
          value
        ),
        "2026-10-22",
        value
      );
    }
  }
);

test(
  "invalid calendar dates are rejected",
  () => {
    assert.equal(
      canonicalizeDate(
        "31 February 2026"
      ),
      null
    );

    assert.equal(
      canonicalizeDate(
        "2026-13-10"
      ),
      null
    );
  }
);

test(
  "text canonicalisation preserves semantic characters while normalising layout noise",
  () => {
    assert.equal(
      normalizeText(
        "  Evaluation   Student 001 "
      ),
      "evaluation student 001"
    );

    assert.notEqual(
      normalizeText(
        "Altered Evaluation Student 001"
      ),
      normalizeText(
        "Evaluation Student 001"
      )
    );
  }
);

test(
  "issue date uses deterministic semantic date canonicalisation",
  () => {
    assert.equal(
      canonicalizeFieldValue(
        "issue_date",
        "October 22, 2026"
      ),
      "2026-10-22"
    );
  }
);
