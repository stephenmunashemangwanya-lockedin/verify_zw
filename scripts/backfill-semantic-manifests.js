require("dotenv").config();

const crypto =
  require("crypto");

const pool =
  require(
    "../backend/config/database"
  );

const {
  fetchOfficialPdf,
} =
  require(
    "../backend/services/pdfStructureAnalysisService"
  );

const {
  buildSemanticManifestFromBytes,
} =
  require(
    "../backend/services/semanticManifestService"
  );

const {
  backfillCredentialSemanticManifest,
} =
  require(
    "../backend/models/credentialModel"
  );

const apply =
  process.argv.includes(
    "--apply"
  );

const idArgument =
  process.argv.find(
    value =>
      value.startsWith(
        "--credential-id="
      )
  );

const credentialId =
  idArgument
    ? idArgument
        .slice(
          "--credential-id="
            .length
        )
        .trim()
    : null;

const sha256 =
  bytes =>
    crypto
      .createHash(
        "sha256"
      )
      .update(
        Buffer.from(bytes)
      )
      .digest(
        "hex"
      );

(async () => {
  const parameters = [];

  let where =
    `WHERE credentials.semantic_manifest IS NULL
       AND credentials.certificate_hash IS NOT NULL
       AND credentials.ipfs_cid IS NOT NULL`;

  if (credentialId) {
    parameters.push(
      credentialId
    );

    where +=
      ` AND credentials.id = $${parameters.length}`;
  }

  const result =
    await pool.query(
      `
      SELECT
        credentials.*,
        students.student_number,
        students.full_name
          AS student_name,
        students.programme,
        institutions.name
          AS institution_name

      FROM credentials

      INNER JOIN students
        ON students.id =
           credentials.student_id

      INNER JOIN institutions
        ON institutions.id =
           credentials.institution_id

      ${where}

      ORDER BY
        credentials.created_at ASC
      `,
      parameters
    );

  const summary = {
    mode:
      apply
        ? "APPLY"
        : "DRY_RUN",

    total:
      result.rows.length,

    backfilled: 0,
    ready: 0,
    partial: 0,
    failed: 0,
    unavailable: 0,
    hashMismatch: 0,
  };

  for (
    const credential of
    result.rows
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
        summary.unavailable += 1;

        console.log(
          credential.id,
          "SOURCE_UNAVAILABLE"
        );

        continue;
      }

      const actualHash =
        sha256(
          official.bytes
        );

      const expectedHash =
        String(
          credential
            .certificate_hash ||
          ""
        ).toLowerCase();

      if (
        actualHash !==
        expectedHash
      ) {
        summary.hashMismatch += 1;

        console.log(
          credential.id,
          "SOURCE_HASH_MISMATCH"
        );

        continue;
      }

      const manifest =
        await buildSemanticManifestFromBytes({
          sourceBytes:
            official.bytes,

          sourceHash:
            expectedHash,

          fields: {
            student_name:
              credential.student_name,

            student_number:
              credential.student_number,

            institution_name:
              credential.institution_name,

            programme:
              credential.programme,

            qualification:
              credential.qualification,

            classification:
              null,

            issue_date:
              credential.issue_date,
          },
        });

      const values =
        Object.values(
          manifest.fields ||
          {}
        );

      const assessable =
        values.filter(
          field =>
            field.status ===
            "ASSESSABLE"
        ).length;

      if (!assessable) {
        summary.failed += 1;

        console.log(
          credential.id,
          "SEMANTIC_ALIGNMENT_FAILED"
        );

        continue;
      }

      if (
        assessable <
        values.filter(
          field =>
            field.status !==
            "NOT_AVAILABLE"
        ).length
      ) {
        summary.partial += 1;
      } else {
        summary.ready += 1;
      }

      if (!apply) {
        console.log(
          credential.id,
          "READY",
          `assessable=${assessable}`
        );

        continue;
      }

      const stored =
        await backfillCredentialSemanticManifest(
          credential.id,
          {
            manifest,

            version:
              manifest.version,

            sourceHash:
              expectedHash,
          }
        );

      if (stored) {
        summary.backfilled += 1;

        console.log(
          credential.id,
          "BACKFILLED",
          `assessable=${assessable}`
        );
      } else {
        console.log(
          credential.id,
          "ALREADY_PRESENT"
        );
      }
    } catch (error) {
      summary.failed += 1;

      console.log(
        credential.id,
        "ERROR",
        error.code ||
          error.message
      );
    }
  }

  console.log(
    JSON.stringify(
      summary,
      null,
      2
    )
  );
})()
.catch(error => {
  console.error(
    "BACKFILL_FAILED:",
    error.code ||
      error.message
  );

  process.exitCode = 1;
})
.finally(() =>
  pool.end()
);
