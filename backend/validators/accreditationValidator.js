const {
  z,
  uuid,
  isoDate,
  trimmed,
} = require("./commonValidator");

const accreditationStatus =
  z.enum([
    "accredited",
    "suspended",
    "revoked",
  ]);

const idParams =
  z.object({
    id: uuid,
  }).strict();

const create =
  z.object({
    institutionId:
      uuid,

    programme:
      trimmed(
        "Programme",
        300,
        2
      )
        .nullable()
        .optional(),

    validFrom:
      isoDate,

    validTo:
      isoDate
        .nullable()
        .optional(),

    status:
      accreditationStatus
        .optional()
        .default(
          "accredited"
        ),
  })
    .strict()
    .refine(
      (data) =>
        !data.validTo ||
        data.validTo >=
          data.validFrom,
      {
        path: [
          "validTo",
        ],
        message:
          "validTo must not be before validFrom.",
      }
    );

const status =
  z.object({
    status:
      accreditationStatus,
  }).strict();

const listQuery =
  z.object({
    institutionId:
      uuid.optional(),

    status:
      accreditationStatus.optional(),

    limit:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),

    offset:
      z.coerce
        .number()
        .int()
        .min(0)
        .default(0),
  }).strict();

const metadata = z.object({ sourceLabel: trimmed("Source label", 150, 2) }).strict();
const historyQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().min(0).default(0) }).strict();
module.exports = {
  metadata,
  historyQuery,
  idParams,
  create,
  status,
  listQuery,
};