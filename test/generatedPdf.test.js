const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  public_token:
    "123e4567-e89b-42d3-a456-426614174000",
  student_name: "Test Student",
  qualification: "Diploma in Safe Testing",
  institution_name: "Test Institution",
  issue_date: "2026-08-03",
  blockchain_tx: `0x${"a".repeat(64)}`,
  status: "active",
};

test(
  "presentation PDF is separate and leaves original bytes unchanged",
  async () => {
    process.env.FRONTEND_PUBLIC_URL =
      "http://localhost:5173";

    const root = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "presentation-pdf-")
    );

    const original = path.join(
      root,
      "original.pdf"
    );

    await fs.promises.writeFile(
      original,
      Buffer.from(
        "%PDF-1.4\nORIGINAL-CERTIFICATE-BYTES\n"
      )
    );

    const before = crypto
      .createHash("sha256")
      .update(
        await fs.promises.readFile(original)
      )
      .digest("hex");

    try {
      const {
        generatePresentationCertificate,
      } = require(
        "../backend/services/certificatePdfService"
      );

      const result =
        await generatePresentationCertificate(
          base,
          { outputDirectory: root }
        );

      const generated =
        await fs.promises.readFile(
          result.outputPath
        );

      assert.equal(
        generated.subarray(0, 4).toString("ascii"),
        "%PDF"
      );

      assert.ok(generated.length > 2000);

      assert.notEqual(
        path.resolve(result.outputPath),
        path.resolve(original)
      );

      const after = crypto
        .createHash("sha256")
        .update(
          await fs.promises.readFile(original)
        )
        .digest("hex");

      assert.equal(after, before);

      assert.equal(
        result.verificationUrl,
        `http://localhost:5173/verify/token/${base.public_token}`
      );
    } finally {
      await fs.promises.rm(root, {
        recursive: true,
        force: true,
      });
    }
  }
);

test(
  "revoked presentation generation retains verification URL and revoked state",
  async () => {
    process.env.FRONTEND_PUBLIC_URL =
      "http://localhost:5173";

    const root = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "revoked-pdf-")
    );

    try {
      const {
        generatePresentationCertificate,
      } = require(
        "../backend/services/certificatePdfService"
      );

      const result =
        await generatePresentationCertificate(
          {
            ...base,
            status: "revoked",
            revocation_reason:
              "Issued in error",
          },
          { outputDirectory: root }
        );

      assert.equal(
        result.status,
        "revoked"
      );

      assert.equal(
        result.verificationUrl.endsWith(
          `/verify/token/${base.public_token}`
        ),
        true
      );

      assert.ok(
        (
          await fs.promises.stat(
            result.outputPath
          )
        ).size > 2000
      );
    } finally {
      await fs.promises.rm(root, {
        recursive: true,
        force: true,
      });
    }
  }
);

test(
  "generated PDF route is authenticated",
  async () => {
    const router =
      require(
        "../backend/routes/credentialRoutes"
      );

    const layer = router.stack.find(
      (item) =>
        item.route?.path ===
        "/:id/generate-pdf"
    );

    assert.ok(layer);
    assert.equal(
      layer.route.methods.post,
      true
    );

    const response = {
      statusCode: 200,
    };

    const res = {
      status(code) {
        response.statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    await layer.route.stack[0].handle(
      { headers: {} },
      res,
      () => {}
    );

    assert.equal(
      response.statusCode,
      401
    );
  }
);