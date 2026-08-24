const { z, page, limit, sortOrder } = require("./commonValidator");
const pagination = (sortFields) => z.object({ page: page.optional(), limit: limit.optional(), search: z.string().trim().max(200).optional(), sortBy: z.enum(sortFields).optional(), sortOrder: sortOrder.optional() }).strict();
module.exports = { pagination };
