const crypto = require("crypto");
const canonicalize = require("canonicalize");

const {
  getAddress,
  isAddress,
  verifyMessage,
} = require("ethers");

class CredentialProofError extends Error {
  constructor(
    message,
    {
      code = "CREDENTIAL_PROOF_ERROR",
      statusCode = 422,
    } = {}
  ) {
    super(message);

    this.name =
      "CredentialProofError";

    this.code = code;

    this.statusCode =
      statusCode;
  }
}

/*
 * The issuer proof is deliberately excluded from the
 * payload that it signs/hashes. This follows the
 * Chapter 3 rule that a signature must not recursively
 * include itself in the canonical commitment.
 */
const unsignedCredentialPayload = (
  payload
) => {
  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(payload)
  ) {
    throw new CredentialProofError(
      "Credential payload must be a JSON object.",
      {
        code:
          "INVALID_CREDENTIAL_PAYLOAD",
        statusCode: 400,
      }
    );
  }

  const {
    proof: _proof,
    signature: _signature,
    issuerSignature:
      _issuerSignature,
    ...unsigned
  } = payload;

  return unsigned;
};

const canonicaliseCredentialPayload = (
  payload
) => {
  const unsigned =
    unsignedCredentialPayload(
      payload
    );

  let canonicalText;

  try {
    canonicalText =
      canonicalize(unsigned);
  } catch (_error) {
    throw new CredentialProofError(
      "Credential payload could not be canonicalised.",
      {
        code:
          "CREDENTIAL_CANONICALISATION_FAILED",
        statusCode: 422,
      }
    );
  }

  if (
    typeof canonicalText !==
    "string"
  ) {
    throw new CredentialProofError(
      "Credential payload could not be canonicalised.",
      {
        code:
          "CREDENTIAL_CANONICALISATION_FAILED",
        statusCode: 422,
      }
    );
  }

  return canonicalText;
};

const createCredentialCommitment = (
  payload
) => {
  const canonicalPayload =
    canonicaliseCredentialPayload(
      payload
    );

  const canonicalBytes =
    Buffer.from(
      canonicalPayload,
      "utf8"
    );

  const commitmentHash =
    crypto
      .createHash("sha256")
      .update(canonicalBytes)
      .digest("hex");

  return {
    canonicalPayload,
    canonicalBytes,
    commitmentHash,
    algorithm: "SHA-256",
    canonicalisation:
      "RFC8785",
  };
};

const signCredentialPayload = async ({
  payload,
  signer,
  expectedIssuerWallet = null,
}) => {
  if (
    !signer ||
    typeof signer.getAddress !==
      "function" ||
    typeof signer.signMessage !==
      "function"
  ) {
    throw new CredentialProofError(
      "A valid institution signer is required.",
      {
        code:
          "CREDENTIAL_SIGNER_REQUIRED",
        statusCode: 500,
      }
    );
  }

  const {
    canonicalPayload,
    canonicalBytes,
    commitmentHash,
  } =
    createCredentialCommitment(
      payload
    );

  const signerWallet =
    getAddress(
      await signer.getAddress()
    );

  if (
    expectedIssuerWallet
  ) {
    if (
      !isAddress(
        expectedIssuerWallet
      )
    ) {
      throw new CredentialProofError(
        "Expected institution wallet is invalid.",
        {
          code:
            "INVALID_ISSUER_WALLET",
          statusCode: 400,
        }
      );
    }

    const expected =
      getAddress(
        expectedIssuerWallet
      );

    if (
      signerWallet.toLowerCase() !==
      expected.toLowerCase()
    ) {
      throw new CredentialProofError(
        "Credential signer does not match the issuing institution wallet.",
        {
          code:
            "CREDENTIAL_SIGNER_MISMATCH",
          statusCode: 403,
        }
      );
    }
  }

  /*
   * ethers signMessage applies the standard Ethereum
   * signed-message domain prefix (EIP-191) before the
   * secp256k1 signature. The canonical credential bytes
   * themselves remain the signed application message.
   */
  const signature =
    await signer.signMessage(
      canonicalBytes
    );

  return {
    canonicalPayload,
    commitmentHash,

    proof: {
      type:
        "Eip191Secp256k1Signature",

      canonicalisation:
        "RFC8785",

      hashAlgorithm:
        "SHA-256",

      issuerWallet:
        signerWallet,

      signature,
    },
  };
};

const verifyCredentialPayloadSignature =
  ({
    payload,
    signature,
    expectedIssuerWallet,
  }) => {
    if (
      !signature ||
      typeof signature !==
        "string" ||
      !expectedIssuerWallet ||
      !isAddress(
        expectedIssuerWallet
      )
    ) {
      return {
        valid: false,
        recoveredWallet:
          null,
        commitmentHash:
          null,
      };
    }

    let commitment;

    try {
      commitment =
        createCredentialCommitment(
          payload
        );
    } catch (_error) {
      return {
        valid: false,
        recoveredWallet:
          null,
        commitmentHash:
          null,
      };
    }

    try {
      const recoveredWallet =
        getAddress(
          verifyMessage(
            commitment
              .canonicalBytes,
            signature
          )
        );

      const expected =
        getAddress(
          expectedIssuerWallet
        );

      return {
        valid:
          recoveredWallet.toLowerCase() ===
          expected.toLowerCase(),

        recoveredWallet,

        commitmentHash:
          commitment.commitmentHash,

        canonicalisation:
          "RFC8785",

        hashAlgorithm:
          "SHA-256",
      };
    } catch (_error) {
      return {
        valid: false,
        recoveredWallet:
          null,

        commitmentHash:
          commitment.commitmentHash,

        canonicalisation:
          "RFC8785",

        hashAlgorithm:
          "SHA-256",
      };
    }
  };

module.exports = {
  canonicaliseCredentialPayload,
  createCredentialCommitment,
  signCredentialPayload,
  verifyCredentialPayloadSignature,
  CredentialProofError,
};