const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const fs =
  require("fs");

const path =
  require("path");

const {
  migrationFiles,
  checksum,
  transactionalBody,
  assertSafeInitialSchema,
  inspectCoreSchema,
  CORE_TABLES,
} = require(
  "../backend/database/runMigrations"
);

const directory =
  path.resolve(
    __dirname,
    "../backend/database/migrations"
  );

const initial =
  fs.readFileSync(
    path.join(
      directory,
      "000_initial_schema.sql"
    ),
    "utf8"
  );

const approvedMigrations = [
  "000_initial_schema.sql",
  "001_extend_credential_verification_audit.sql",
  "002_public_verification_support.sql",
  "003_audit_scope_and_user_security.sql",
  "004_user_password_reset_security.sql",
  "005_listing_performance_indexes.sql",
  "006_dashboard_analytics_indexes.sql",
  "007_student_account_ownership.sql",
  "008_research_trust_lifecycle.sql",
   "009_verification_trust_results.sql",
];

test(
  "production migration discovery returns only the approved chain",
  () =>
    assert.deepEqual(
      migrationFiles(
        directory
      ),
      approvedMigrations
    )
);

test(
  "API E2E migration discovery returns only the approved chain",
  () => {
    const files =
      fs.readdirSync(
        directory
      )
        .filter((name) =>
          name.endsWith(
            ".sql"
          )
        )
        .sort();

    assert.deepEqual(
      files,
      approvedMigrations
    );
  }
);

test(
  "initial schema is non-destructive and contains every core table",
  () => {
    assert.doesNotThrow(
      () =>
        assertSafeInitialSchema(
          initial
        )
    );

    for (
      const table
      of CORE_TABLES
    ) {
      assert.match(
        initial,
        new RegExp(
          `CREATE TABLE IF NOT EXISTS ${table}`
        )
      );
    }
  }
);

test(
  "pgcrypto precedes UUID defaults",
  () =>
    assert.ok(
      initial.indexOf(
        "CREATE EXTENSION"
      ) <
        initial.indexOf(
          "gen_random_uuid()"
        )
    )
);

test(
  "initial schema contains required foreign keys and uniqueness",
  () => {
    for (
      const target
      of [
        "institutions(id)",
        "students(id)",
        "credentials(id)",
        "users(id)",
      ]
    ) {
      assert.ok(
        initial.includes(
          `REFERENCES ${target}`
        )
      );
    }

    assert.match(
      initial,
      /UNIQUE \(institution_id, student_number\)/
    );

    assert.match(
      initial,
      /certificate_hash TEXT UNIQUE/
    );
  }
);

test(
  "destructive initial SQL is rejected",
  () =>
    assert.throws(
      () =>
        assertSafeInitialSchema(
          `${initial}\nDROP TABLE users;`
        ),
      /destructive/i
    )
);

test(
  "transaction wrappers are removed for runner-owned transaction",
  () => {
    const body =
      transactionalBody(
        "BEGIN;\nSELECT 1;\nCOMMIT;"
      );

    assert.equal(
      body.trim(),
      "SELECT 1;"
    );
  }
);

test(
  "migration checksums are stable SHA-256",
  () => {
    assert.match(
      checksum(
        initial
      ),
      /^[a-f0-9]{64}$/
    );

    assert.equal(
      checksum(
        initial
      ),
      checksum(
        initial
      )
    );
  }
);

test(
  "partial core schema fails closed",
  async () => {
    const client = {
      async query(sql) {
        if (
          sql.includes(
            "ANY"
          )
        ) {
          return {
            rows: [
              {
                table_name:
                  "institutions",
              },
            ],
          };
        }

        throw new Error(
          "unexpected"
        );
      },
    };

    await assert.rejects(
      () =>
        inspectCoreSchema(
          client
        ),
      {
        code:
          "PARTIAL_SCHEMA",
      }
    );
  }
);

test(
  "empty and complete schemas are distinguished",
  async () => {
    const empty = {
      async query(sql) {
        return sql.includes(
          "ANY"
        )
          ? {
              rows: [],
            }
          : {
              rows: [],
              rowCount: 0,
            };
      },
    };

    assert.equal(
      await inspectCoreSchema(
        empty
      ),
      "empty"
    );

    const complete = {
      async query() {
        return {
          rows:
            CORE_TABLES.map(
              (
                table_name
              ) => ({
                table_name,
              })
            ),
        };
      },
    };

    assert.equal(
      await inspectCoreSchema(
        complete
      ),
      "complete"
    );
  }
);

test(
  "runner never references seed.sql",
  () =>
    assert.equal(
      fs.readFileSync(
        require.resolve(
          "../backend/database/runMigrations"
        ),
        "utf8"
      ).includes(
        "seed.sql"
      ),
      false
    )
);