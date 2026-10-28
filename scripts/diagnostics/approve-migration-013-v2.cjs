const fs = require("fs");

const path =
  "test/migrationBootstrap.test.js";

let source =
  fs.readFileSync(
    path,
    "utf8"
  );

if (
  source.includes(
    "013_semantic_credential_manifest.sql"
  )
) {
  console.log(
    "Migration 013 already present in migrationBootstrap test."
  );

  process.exit(0);
}

const pattern =
  /^([ \t]*)(["'])012_regulator_role\.sql\2,?/m;

const match =
  source.match(pattern);

if (!match) {
  throw new Error(
    "Could not locate migration 012 in migrationBootstrap.test.js."
  );
}

const indent =
  match[1];

const quote =
  match[2];

source =
  source.replace(
    pattern,
    `${indent}${quote}012_regulator_role.sql${quote},\n` +
    `${indent}${quote}013_semantic_credential_manifest.sql${quote},`
  );

fs.writeFileSync(
  path,
  source,
  "utf8"
);

console.log(
  "Migration 013 approved successfully."
);
