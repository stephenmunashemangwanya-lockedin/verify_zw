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
    "const setCredentialSemanticManifest"
  )
) {
  console.log(
    "Semantic manifest persistence already exists."
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
    "setCredentialStructuredProof marker not found."
  );
}

const fn = `
const setCredentialSemanticManifest =
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
          "Invalid semantic manifest persistence input."
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
           AND status = 'processing'
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
  "  createProcessingCredential,";

if (
  !source.includes(
    exportMarker
  )
) {
  throw new Error(
    "credentialModel export marker not found."
  );
}

source =
  source.replace(
    exportMarker,
    `${exportMarker}
  setCredentialSemanticManifest,`
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Credential semantic manifest persistence added."
);
