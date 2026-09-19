const test =
  require("node:test");

const assert =
  require(
    "node:assert/strict"
  );

const {
  Wallet,
} = require("ethers");

const {
  canonicaliseCredentialPayload,
  createCredentialCommitment,
  signCredentialPayload,
  verifyCredentialPayloadSignature,
} = require(
  "../backend/services/credentialProofService"
);

const basePayload = () => ({
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
  ],

  id:
    "urn:uuid:11111111-1111-4111-8111-111111111111",

  type: [
    "VerifiableCredential",
    "EducationalCredential",
  ],

  issuer:
    "urn:verifyzw:institution:22222222-2222-4222-8222-222222222222",

  credentialSubject: {
    id:
      "urn:verifyzw:student:33333333-3333-4333-8333-333333333333",

    registrationNumber:
      "VZW-STU-001",

    qualification:
      "BSc Computer Systems Engineering",

    programme:
      "BSc Computer Systems Engineering",

    awardDate:
      "2026-07-31",
  },

  validFrom:
    "2026-08-10",

  credentialStatus: {
    type:
      "BitstringStatusListEntry",

    statusPurpose:
      "revocation",

    statusListIndex:
      "0",

    statusListCredential:
      "urn:verifyzw:status:22222222-2222-4222-8222-222222222222",
  },
});

test(
  "RFC 8785 canonicalisation is independent of object key order",
  () => {
    const first =
      basePayload();

    const second = {
      validFrom:
        first.validFrom,

      credentialStatus:
        first.credentialStatus,

      credentialSubject:
        first.credentialSubject,

      issuer:
        first.issuer,

      type:
        first.type,

      id:
        first.id,

      "@context":
        first["@context"],
    };

    assert.equal(
      canonicaliseCredentialPayload(
        first
      ),
      canonicaliseCredentialPayload(
        second
      )
    );

    assert.equal(
      createCredentialCommitment(
        first
      ).commitmentHash,

      createCredentialCommitment(
        second
      ).commitmentHash
    );
  }
);

test(
  "proof value is excluded from its own canonical commitment",
  () => {
    const payload =
      basePayload();

    const withoutProof =
      createCredentialCommitment(
        payload
      );

    const withProof =
      createCredentialCommitment({
        ...payload,

        proof: {
          type:
            "ExampleProof",

          signature:
            "different-value",
        },
      });

    assert.equal(
      withoutProof.commitmentHash,
      withProof.commitmentHash
    );

    assert.equal(
      withoutProof.canonicalPayload,
      withProof.canonicalPayload
    );
  }
);

test(
  "semantic credential modification changes the commitment",
  () => {
    const original =
      basePayload();

    const modified = {
      ...original,

      credentialSubject: {
        ...original
          .credentialSubject,

        qualification:
          "Modified Qualification",
      },
    };

    assert.notEqual(
      createCredentialCommitment(
        original
      ).commitmentHash,

      createCredentialCommitment(
        modified
      ).commitmentHash
    );
  }
);

test(
  "institution wallet can sign and verify the canonical credential",
  async () => {
    const wallet =
      Wallet.createRandom();

    const payload =
      basePayload();

    const signed =
      await signCredentialPayload({
        payload,

        signer:
          wallet,

        expectedIssuerWallet:
          wallet.address,
      });

    const verification =
      verifyCredentialPayloadSignature({
        payload,

        signature:
          signed.proof.signature,

        expectedIssuerWallet:
          wallet.address,
      });

    assert.equal(
      verification.valid,
      true
    );

    assert.equal(
      verification.recoveredWallet,
      wallet.address
    );

    assert.equal(
      verification.commitmentHash,
      signed.commitmentHash
    );
  }
);

test(
  "signature is rejected for a different institution wallet",
  async () => {
    const issuer =
      Wallet.createRandom();

    const otherInstitution =
      Wallet.createRandom();

    const payload =
      basePayload();

    const signed =
      await signCredentialPayload({
        payload,

        signer:
          issuer,

        expectedIssuerWallet:
          issuer.address,
      });

    const verification =
      verifyCredentialPayloadSignature({
        payload,

        signature:
          signed.proof.signature,

        expectedIssuerWallet:
          otherInstitution.address,
      });

    assert.equal(
      verification.valid,
      false
    );
  }
);

test(
  "changing a signed credential invalidates the issuer signature",
  async () => {
    const issuer =
      Wallet.createRandom();

    const original =
      basePayload();

    const signed =
      await signCredentialPayload({
        payload:
          original,

        signer:
          issuer,

        expectedIssuerWallet:
          issuer.address,
      });

    const tampered = {
      ...original,

      credentialSubject: {
        ...original
          .credentialSubject,

        awardDate:
          "2026-08-01",
      },
    };

    const verification =
      verifyCredentialPayloadSignature({
        payload:
          tampered,

        signature:
          signed.proof.signature,

        expectedIssuerWallet:
          issuer.address,
      });

    assert.equal(
      verification.valid,
      false
    );

    assert.notEqual(
      verification.commitmentHash,
      signed.commitmentHash
    );
  }
);

test(
  "non-object credential payload is rejected",
  () => {
    assert.throws(
      () =>
        createCredentialCommitment(
          "not-a-credential"
        ),

      /JSON object/
    );
  }
);