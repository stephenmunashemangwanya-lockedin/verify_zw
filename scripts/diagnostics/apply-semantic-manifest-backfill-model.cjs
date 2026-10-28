const fs = require("fs");

const path =
  "backend/models/credentialModel.js";

let source =
  fs.readFileSync(
    path,
    "utf8"
  );

if (
  source.includes(
    "const backfillCredentialSemanticManifest"
  )
) {
  console.log(
    "Backfill persistence already exists."
  );
  process.exit(0);
}

const marker =
  "const setCredentialStructuredProof =";

if (
  !source.includes(
    marker
  )
) {
  throw new Error(
    "Insertion marker not found."
  );
}

const fn = `
const backfillCredentialSemanticManifest =
  async (
    id,
    {
      manifest,
      version,
      sourceHash,
    }
  ) => {
    if (
      !id ||
      !manifest ||
      !Number.isInteger(version) ||
      version < 1 ||
      !/^[a-f0-9]{64}$/i.test(
        String(sourceHash || "")
      )
    ) {
      const error =
        new Error(
          "Invalid semantic manifest backfill input."
        );

      error.code =
        "SEMANTIC_MANIFEST_INVALID";

      throw error;
    }

    const normalizedHash =
      String(sourceHash)
        .toLowerCase();

    const result =
      await pool.query(
        \`UPDATE credentials
         SET
           semantic_manifest = $2::jsonb,
           semantic_manifest_version = $3,
           semantic_manifest_source_hash = $4,
           semantic_manifest_generated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND semantic_manifest IS NULL
           AND LOWER(certificate_hash) = $4
         RETURNING
           id,
           certificate_hash,
           semantic_manifest,
           semantic_manifest_version,
           semantic_manifest_source_hash,
           semantic_manifest_generated_at,
           status,
           updated_at\`,
        [
          id,
          JSON.stringify(
            manifest
          ),
          version,
          normalizedHash,
        ]
      );

    return result.rows[0];
  };

`;

source =
  source.replace(
    marker,
    fn + marker
  );

const exportMarker =
  "  setCredentialSemanticManifest,";

if (
  !source.includes(
    exportMarker
  )
) {
  throw new Error(
    "Manifest export marker not found."
  );
}

source =
  source.replace(
    exportMarker,
    `${exportMarker}
  backfillCredentialSemanticManifest,`
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Semantic manifest backfill persistence added."
);
