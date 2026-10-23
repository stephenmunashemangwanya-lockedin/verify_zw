const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  analyseSemanticChanges,
} =
  require("../backend/services/tamperAnalysisService");

const credential = {
  student_name:
    "VerifyZW Mechanics Student 025",

  student_number:
    "VZW-STU-025",

  institution_name:
    "Midlands State University",

  programme:
    "Mechanics",

  qualification:
    "Mechanics",

  issue_date:
    "2026-10-02",
};

test('missing authoritative baseline never produces guessed semantic fields', () => {
  for (const baselineText of [undefined, null, '']) {
    const result = analyseSemanticChanges({ credential, baselineText, submittedText: 'Different contents' });
    assert.deepEqual(result.alteredFields, []);
    assert.ok(result.fields.every(f => ['NOT_ASSESSABLE', 'NOT_AVAILABLE'].includes(f.status)));
  }
});

test('overlapping and duplicate unlabelled values are conservatively unassessable', () => {
  const result = analyseSemanticChanges({ credential, baselineText: 'Mechanics\nMechanics', submittedText: 'Changed\nMechanics' });
  assert.deepEqual(result.alteredFields, []);
  assert.equal(result.fields.find(f => f.field === 'programme').status, 'NOT_ASSESSABLE');
  assert.equal(result.fields.find(f => f.field === 'qualification').status, 'NOT_ASSESSABLE');
});

test('duplicate conflicting labels are not guessed', () => {
  const result = analyseSemanticChanges({ credential,
    baselineText: 'Holder: VerifyZW Mechanics Student 025',
    submittedText: 'Holder: VerifyZW Mechanics Student 025\nHolder: Someone Else' });
  assert.deepEqual(result.alteredFields, []);
  assert.equal(result.fields.find(f => f.field === 'student_name').status, 'NOT_ASSESSABLE');
});

test('a single shared unlabelled value cannot establish two altered fields', () => {
  const result = analyseSemanticChanges({ credential, baselineText: 'Mechanics', submittedText: 'Changed' });
  assert.deepEqual(result.alteredFields, []);
  for (const key of ['programme', 'qualification']) {
    assert.equal(result.fields.find(f => f.field === key).status, 'NOT_ASSESSABLE');
  }
});

test('presentation changes and another field ownership never falsely accuse holder name', () => {
  for (const [baselineText, submittedText] of [
    ['Holder: VerifyZW Mechanics Student 025', 'Holder: VerifyZW Mechanics\nStudent 025'],
    ['Holder: VerifyZW Mechanics Student 025', 'Holder : VerifyZW Mechanics Student 025'],
    ['Holder: VerifyZW Mechanics Student 025', 'Holder – VerifyZW Mechanics Student 025'],
    ['Holder: VerifyZW Mechanics Student 025', 'VerifyZW Mechanics Student 025'],
    ['Institution:\nVerifyZW Mechanics Student 025', 'Institution: Another University'],
    ['VerifyZW Mechanics Student 025', 'Holder: VerifyZW Mechanics Student 025'],
    ['VerifyZW Mechanics Student 025', 'VerifyZW Mechanics\nStudent 025'],
  ]) {
    const result = analyseSemanticChanges({ credential, baselineText, submittedText });
    assert.deepEqual(result.alteredFields, [], `${baselineText} -> ${submittedText}`);
  }
});

test('a removed labelled value is altered and a wrapped replacement is localised', () => {
  for (const submittedText of ['Holder:', 'Holder: Altered Evaluation\nStudent 001']) {
    const result = analyseSemanticChanges({ credential: { student_name: 'Evaluation Student 001' },
      baselineText: 'Holder: Evaluation\nStudent 001', submittedText });
    assert.deepEqual(result.alteredFields.map(f => f.field), ['student_name']);
  }
});

test('flattened fields without attributable boundaries stay unassessable', () => {
  const result = analyseSemanticChanges({ credential,
    baselineText: 'VerifyZW Mechanics Student 025 VZW-STU-025 Mechanics 2026-10-02',
    submittedText: 'Changed Name VZW-STU-025 Mechanics 2026-10-02' });
  assert.deepEqual(result.alteredFields, []);
});

test(
  "name-only tamper does not falsely report an institution absent from the official PDF",
  () => {
    const result =
      analyseSemanticChanges({
        credential,

        baselineText:
          "VerifyZW Mechanics Student 025\nVZW-STU-025\nMechanics\n2026-10-02",

        submittedText:
          "VerifyZW Mechanic Student 025\nVZW-STU-025\nMechanics\n2026-10-02",
      });

    assert.deepEqual(
      result.alteredFields.map(
        (field) =>
          field.field
      ),
      [
        "student_name",
      ]
    );

    const institution =
      result.fields.find(
        (field) =>
          field.field ===
          "institution_name"
      );

    assert.equal(
      institution.status,
      "NOT_ASSESSABLE"
    );
  }
);

test(
  "institution is ALTERED when it existed in the official PDF and is removed from the submitted PDF",
  () => {
    const result =
      analyseSemanticChanges({
        credential,

        baselineText:
          "VerifyZW Mechanics Student 025\nVZW-STU-025\nMidlands State University\nMechanics\n2026-10-02",

        submittedText:
          "VerifyZW Mechanics Student 025\nVZW-STU-025\nMechanics\n2026-10-02",
      });

    const institution =
      result.fields.find(
        (field) =>
          field.field ===
          "institution_name"
      );

    assert.equal(
      institution.status,
      "ALTERED"
    );
  }
);

test(
  "unchanged baseline fields remain unchanged",
  () => {
    const text =
      "VerifyZW Mechanics Student 025\nVZW-STU-025\nMidlands State University\nMechanics\n2026-10-02";

    const result =
      analyseSemanticChanges({
        credential,
        baselineText:
          text,
        submittedText:
          text,
      });

    assert.equal(
      result.alteredFields.length,
      0
    );
  }
);
