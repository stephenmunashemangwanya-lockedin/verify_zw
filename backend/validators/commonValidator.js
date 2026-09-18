const { z } = require("zod");
const {
  isAddress,
  ZeroAddress,
} = require("ethers");
const {
  ROLE_VALUES,
} = require("../constants/roles");

const uuid =
  z.string().uuid(
    "A valid UUID is required."
  );

const email =
  z.string()
    .trim()
    .email(
      "A valid email address is required."
    )
    .max(254);

const trimmed = (
  name,
  max = 200,
  min = 1
) =>
  z.string()
    .trim()
    .min(
      min,
      `${name} is required.`
    )
    .max(
      max,
      `${name} is too long.`
    );

const isoDate =
  z.string().date(
    "A valid ISO date is required."
  );

const wallet =
  z.string().refine(
    (value) =>
      isAddress(value) &&
      value !== ZeroAddress,
    "A valid non-zero EVM address is required."
  );

const sha256 =
  z.string()
    .regex(
      /^(?:0x)?[a-fA-F0-9]{64}$/,
      "A valid SHA-256 hash is required."
    )
    .transform((value) =>
      value
        .replace(/^0x/i, "")
        .toLowerCase()
    );

const publicToken =
  uuid;

const page =
  z.coerce
    .number()
    .int()
    .min(1)
    .default(1);

const limit =
  z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20);

const sortOrder =
  z.enum([
    "asc",
    "desc",
  ]).default("desc");

const role =
  z.enum(
    ROLE_VALUES
  );

const credentialStatus =
  z.enum([
    "pending",
    "processing",
    "active",
    "failed",
    "revoked",
    "superseded",
  ]);

const boolean =
  z.boolean();

module.exports = {
  z,
  uuid,
  email,
  trimmed,
  isoDate,
  wallet,
  sha256,
  publicToken,
  page,
  limit,
  sortOrder,
  role,
  credentialStatus,
  boolean,
};