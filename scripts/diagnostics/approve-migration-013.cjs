const fs =
  require("fs");

const path =
  "test/migrationBootstrap.test.js";

let source =
  fs.readFileSync(
    path,
    "utf8"
  );

if (
  source.includes(
    "'013_semantic_credential_manifest.sql'"
  )
) {
  console.log(
    "Migration 013 already approved in bootstrap test."
  );

  process.exit(0);
}

const marker =
  "'012_regulator_role.sql'";

if (
  !source.includes(
    marker
  )
) {
  throw new Error(
    "Migration 012 approval marker not found."
  );
}

source =
  source.replace(
    marker,
    `${marker},
  '013_semantic_credential_manifest.sql'`
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Migration 013 added to approved migration chain."
);
