const fs = require("fs");

const path =
  "test/stage8Ipfs.test.js";

let source =
  fs.readFileSync(
    path,
    "utf8"
  );

const nl =
  source.includes("\r\n")
    ? "\r\n"
    : "\n";

if (
  source.includes(
    'semanticManifest: require.resolve("../backend/services/semanticManifestService")'
  )
) {
  console.log(
    "Stage8 semantic-manifest mocks already installed."
  );

  process.exit(0);
}

/*
 * Add the service path used by the controller.
 */
const pathMarker =
  `    blockchain: require.resolve("../backend/services/blockchainService"),`;

if (
  !source.includes(
    pathMarker
  )
) {
  throw new Error(
    "Stage8 path marker not found."
  );
}

source =
  source.replace(
    pathMarker,
    `${pathMarker}${nl}    semanticManifest: require.resolve("../backend/services/semanticManifestService"),`
  );

/*
 * Add persistence mock to credential model.
 */
const credentialMarker =
  `      createProcessingCredential: async (data) => ({ id: "credential-id", ...data, status: "processing" }),`;

if (
  !source.includes(
    credentialMarker
  )
) {
  throw new Error(
    "Stage8 credential mock marker not found."
  );
}

source =
  source.replace(
    credentialMarker,
    `${credentialMarker}${nl}      setCredentialSemanticManifest: async (id, data) => ({${nl}        id,${nl}        semantic_manifest: data.manifest,${nl}        semantic_manifest_version: data.version,${nl}        semantic_manifest_source_hash: data.sourceHash,${nl}        status: "processing",${nl}      }),`
  );

/*
 * Add semantic-manifest service mock.
 *
 * Stage8 is testing issuance state transitions,
 * IPFS failure handling and blockchain handling.
 * Actual PDF semantic parsing has its own dedicated
 * semanticManifest.test.js coverage.
 */
const mocksEndMarker =
  `    blockchain: {
      issueCredentialOnChain: async (hash, options) => {`;

if (
  !source.includes(
    mocksEndMarker
  )
) {
  throw new Error(
    "Stage8 blockchain mock marker not found."
  );
}

/*
 * Insert semanticManifest after the complete blockchain
 * mock by locating the end of the mocks object.
 */
const endRegex =
  /(\s+blockchain:\s*\{[\s\S]*?\.\.\.overrides\.blockchain,\r?\n\s+\},\r?\n)(\s+\};)/;

if (
  !endRegex.test(
    source
  )
) {
  throw new Error(
    "Stage8 mocks-object insertion location not found."
  );
}

source =
  source.replace(
    endRegex,
    `$1    semanticManifest: {${nl}      buildSemanticManifestFromFile: async ({ sourceHash }) => ({${nl}        version: 1,${nl}        sourceSha256: sourceHash,${nl}        fields: {},${nl}      }),${nl}    },${nl}$2`
  );

/*
 * Ensure the semantic service mock is installed in
 * require.cache before credentialController is loaded.
 */
const cacheLoop =
  `  for (const key of ["credential", "student", "institution", "hash", "ipfs", "audit", "blockchain"]) {`;

if (
  !source.includes(
    cacheLoop
  )
) {
  throw new Error(
    "Stage8 require-cache loop marker not found."
  );
}

source =
  source.replace(
    cacheLoop,
    `  for (const key of ["credential", "student", "institution", "hash", "ipfs", "audit", "blockchain", "semanticManifest"]) {`
  );

/*
 * Make the existing student/institution mocks representative
 * of the fields now passed into manifest construction.
 */
source =
  source.replace(
    `student: { getStudentById: async () => ({ id: "student-id", institution_id: "institution-id", student_number: "ST-1" }), ...overrides.student },`,
    `student: { getStudentById: async () => ({ id: "student-id", institution_id: "institution-id", student_number: "ST-1", full_name: "Test Student", programme: "Computer Systems Engineering" }), ...overrides.student },`
  );

source =
  source.replace(
    `institution: { getInstitutionById: async () => ({ id: "institution-id", status: true }), ...overrides.institution },`,
    `institution: { getInstitutionById: async () => ({ id: "institution-id", name: "Test Institution", status: true }), ...overrides.institution },`
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Stage8 semantic-manifest test mocks installed."
);
