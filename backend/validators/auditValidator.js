const { z, uuid, isoDate } = require("./commonValidator");
const { pagination } = require("./paginationValidator");
const idParams = z.object({ id: uuid }).strict();
const listQuery = pagination(["action", "entity_type", "created_at"]).extend({ action: z.string().trim().max(100).optional(), entityType: z.string().trim().max(100).optional(), entityId: uuid.optional(), userId: uuid.optional(), institutionId: uuid.optional(), dateFrom: isoDate.optional(), dateTo: isoDate.optional() }).strict().refine((data) => !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo, { path: ["dateTo"], message: "dateTo must not be before dateFrom." });
module.exports = { idParams, listQuery };
