const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  resolvePersistedSemanticManifest,
} =
  require(
    "../backend/services/tamperAnalysisService"
  );

const hash =
  "a".repeat(64);

const manifest = {
  version: 1,
  sourceSha256:
    hash,
  fields: {},
};

test(
  "valid persisted manifest is accepted",
  () => {
    const result =
      resolvePersistedSemanticManifest({
        certificate_hash:
          hash,

        semantic_manifest:
          manifest,

        semantic_manifest_version:
          1,

        semantic_manifest_source_hash:
          hash,
      });

    assert.equal(
      result.present,
      true
    );

    assert.equal(
      result.valid,
      true
    );
  }
);

test(
  "credential without manifest uses legacy fallback",
  () => {
    const result =
      resolvePersistedSemanticManifest({
        certificate_hash:
          hash,
      });

    assert.equal(
      result.present,
      false
    );
  }
);

test(
  "wrong manifest source hash fails closed",
  () => {
    const result =
      resolvePersistedSemanticManifest({
        certificate_hash:
          hash,

        semantic_manifest:
          manifest,

        semantic_manifest_version:
          1,

        semantic_manifest_source_hash:
          "b".repeat(64),
      });

    assert.equal(
      result.present,
      true
    );

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.reason,
      "SEMANTIC_MANIFEST_SOURCE_HASH_MISMATCH"
    );
  }
);

test(
  "unknown manifest version fails closed",
  () => {
    const result =
      resolvePersistedSemanticManifest({
        certificate_hash:
          hash,

        semantic_manifest:
          manifest,

        semantic_manifest_version:
          2,

        semantic_manifest_source_hash:
          hash,
      });

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.reason,
      "SEMANTIC_MANIFEST_VERSION_MISMATCH"
    );
  }
);
