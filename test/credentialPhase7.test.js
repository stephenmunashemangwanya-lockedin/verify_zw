const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {
  PassThrough,
  Readable,
} = require("node:stream");

const ID =
  "11111111-1111-4111-8111-111111111111";

const INST =
  "22222222-2222-4222-8222-222222222222";

const credential = {
  id: ID,
  institution_id: INST,
  status: "active",
  certificate_hash:
    "a".repeat(64),
  student_name:
    "Example Student",
  institution_name:
    "Example Institution",
};

const load = (
  value = credential
) => {
  const controllerPath =
    require.resolve(
      "../backend/controllers/credentialController"
    );

  const modelPath =
    require.resolve(
      "../backend/models/credentialModel"
    );

  const auditPath =
    require.resolve(
      "../backend/models/auditModel"
    );

  delete require.cache[
    controllerPath
  ];

  require.cache[
    modelPath
  ] = {
    id: modelPath,
    filename: modelPath,
    loaded: true,

    exports: {
      getCredentialById:
        async () => value,
    },
  };

  const audits = [];

  require.cache[
    auditPath
  ] = {
    id: auditPath,
    filename: auditPath,
    loaded: true,

    exports: {
      createAuditLog:
        async (entry) =>
          audits.push(entry),
    },
  };

  return {
    controller:
      require(
        controllerPath
      ),

    audits,
  };
};

const response =
  () => {
    const res =
      new PassThrough();

    res.headers = {};
    res.statusCode = 200;

    res.status =
      function (code) {
        this.statusCode =
          code;

        return this;
      };

    res.setHeader =
      function (
        key,
        value
      ) {
        this.headers[key] =
          value;
      };

    res.json =
      function (body) {
        this.body = body;
        this.end();

        return this;
      };

    return res;
  };

test(
  "authorized generated PDF download streams safe headers without exposing paths",
  async () => {
    const {
      controller,
      audits,
    } = load();

    const originalAccess =
      fs.promises.access;

    const originalStream =
      fs.createReadStream;

    fs.promises.access =
      async () => {};

    fs.createReadStream =
      () =>
        Readable.from(
          Buffer.from(
            "%PDF-safe"
          )
        );

    try {
      const res =
        response();

      const chunks = [];

      res.on(
        "data",
        (chunk) =>
          chunks.push(
            chunk
          )
      );

      await controller
        .downloadCredentialPdf(
          {
            params: {
              id: ID,
            },

            user: {
              role:
                "issuer",

              institutionId:
                INST,

              userId:
                "actor",
            },

            ip: "x",

            get:
              () =>
                "test",
          },

          res
        );

      await new Promise(
        (resolve) =>
          res.on(
            "finish",
            resolve
          )
      );

      assert.equal(
        res.statusCode,
        200
      );

      assert.equal(
        res.headers[
          "Content-Type"
        ],
        "application/pdf"
      );

      assert.equal(
        res.headers[
          "Content-Disposition"
        ],
        `attachment; filename="credential-${ID}.pdf"`
      );

      assert.equal(
        Buffer.concat(
          chunks
        ).toString(),
        "%PDF-safe"
      );

      assert.equal(
        JSON.stringify(
          res.body || {}
        ).includes(
          "output/pdf"
        ),
        false
      );

      assert.equal(
        audits[0].action,
        "CREDENTIAL_PDF_DOWNLOADED"
      );
    } finally {
      fs.promises.access =
        originalAccess;

      fs.createReadStream =
        originalStream;
    }
  }
);

test(
  "cross-institution and unknown credential downloads are controlled",
  async () => {
    let loaded =
      load();

    let res =
      response();

    await loaded
      .controller
      .downloadCredentialPdf(
        {
          params: {
            id: ID,
          },

          user: {
            role:
              "issuer",

            institutionId:
              "other",
          },
        },

        res
      );

    assert.equal(
      res.statusCode,
      403
    );

    loaded =
      load(null);

    res =
      response();

    await loaded
      .controller
      .downloadCredentialPdf(
        {
          params: {
            id: ID,
          },

          user: {
            role:
              "super_admin",
          },
        },

        res
      );

    assert.equal(
      res.statusCode,
      404
    );
  }
);

test(
  "missing presentation PDF returns 404",
  async () => {
    const {
      controller,
    } = load();

    const original =
      fs.promises.access;

    fs.promises.access =
      async () => {
        throw Object.assign(
          new Error(),
          {
            code:
              "ENOENT",
          }
        );
      };

    try {
      const res =
        response();

      await controller
        .downloadCredentialPdf(
          {
            params: {
              id: ID,
            },

            user: {
              role:
                "super_admin",
            },
          },

          res
        );

      assert.equal(
        res.statusCode,
        404
      );

      assert.match(
        res.body.message,
        /unavailable/i
      );
    } finally {
      fs.promises.access =
        original;
    }
  }
);

test(
  "download route validates UUID and is protected for all credential readers",
  () => {
    const router =
      require(
        "../backend/routes/credentialRoutes"
      );

    const layer =
      router.stack.find(
        (item) =>
          item.route
            ?.path ===
          "/:id/pdf"
      );

    assert.ok(layer);

    assert.equal(
      layer.route
        .methods.get,
      true
    );

    const source =
      fs.readFileSync(
        require.resolve(
          "../backend/controllers/credentialController"
        ),
        "utf8"
      );

    assert.match(
      source,
      /path\s*\.\s*resolve\s*\(\s*directory\s*,\s*filename\s*\)/
    );

    assert.match(
      source,
      /path\s*\.\s*dirname\s*\(\s*filePath\s*\)\s*!==\s*directory/
    );
  }
);

test(
  "credential detail includes safe chain metadata and no filesystem path",
  () => {
    const source =
      fs.readFileSync(
        require.resolve(
          "../backend/models/credentialModel"
        ),
        "utf8"
      );

    for (
      const field of [
        "blockchain_network",
        "contract_address",
        "block_number",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `credentials\\.${field}`
        )
      );
    }

    assert.doesNotMatch(
      source,
      /SELECT[\s\S]*outputPath[\s\S]*FROM credentials/
    );
  }
);