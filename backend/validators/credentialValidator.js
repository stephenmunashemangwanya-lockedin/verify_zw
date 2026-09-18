const {
  z,
  uuid,
  trimmed,
  isoDate,
  credentialStatus,
} = require("./commonValidator");

const {
  pagination,
} = require("./paginationValidator");

const idParams =
  z.object({
    id: uuid,
  }).strict();

const issue =
  z.object({
    studentId:
      uuid,

    institutionId:
      uuid,

    qualification:
      trimmed(
        "Qualification",
        300,
        2
      ),

    issueDate:
      isoDate,

    awardDate:
      isoDate.optional(),
  })
    .strict()
    .refine(
      (data) =>
        !data.awardDate ||
        data.awardDate <=
          data.issueDate,
      {
        path: [
          "awardDate",
        ],

        message:
          "awardDate must not be after issueDate.",
      }
    );

const revoke =
  z.object({
    reason:
      trimmed(
        "Revocation reason",
        1000,
        5
      ),
  }).strict();

const listQuery =
  pagination([
    "created_at",
    "updated_at",
    "issue_date",
    "award_date",
    "qualification",
    "status",
  ])
    .extend({
      status:
        credentialStatus.optional(),

      institutionId:
        uuid.optional(),

      studentId:
        uuid.optional(),

      issueDateFrom:
        isoDate.optional(),

      issueDateTo:
        isoDate.optional(),

      awardDateFrom:
        isoDate.optional(),

      awardDateTo:
        isoDate.optional(),
    })
    .strict()
    .refine(
      (data) =>
        !data.issueDateFrom ||
        !data.issueDateTo ||
        data.issueDateFrom <=
          data.issueDateTo,
      {
        path: [
          "issueDateTo",
        ],

        message:
          "issueDateTo must not be before issueDateFrom.",
      }
    )
    .refine(
      (data) =>
        !data.awardDateFrom ||
        !data.awardDateTo ||
        data.awardDateFrom <=
          data.awardDateTo,
      {
        path: [
          "awardDateTo",
        ],

        message:
          "awardDateTo must not be before awardDateFrom.",
      }
    );

module.exports = {
  idParams,
  issue,
  revoke,
  listQuery,
};