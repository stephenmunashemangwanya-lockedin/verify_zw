const { z, uuid, email, trimmed, wallet, boolean } = require("./commonValidator");
const { pagination } = require("./paginationValidator");
const idParams = z.object({ id: uuid }).strict();
const create = z.object({ name: trimmed("Institution name", 200, 2), walletAddress: wallet, email, phone: z.string().trim().max(30).optional() }).strict();
const status = z.object({ status: boolean }).strict();
const listQuery = pagination(["created_at", "name", "email", "status"]).extend({ status: z.enum(["active", "inactive", "true", "false"]).optional() }).strict();
module.exports = { idParams, create, status, listQuery };
