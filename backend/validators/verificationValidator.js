const { z, uuid, email, sha256, publicToken } = require("./commonValidator");
const optionalVerifier = z.object({ verifierName: z.string().trim().max(150).optional(), verifierEmail: email.optional() }).strict();
const hashParams = z.object({ hash: sha256 }).strict();
const idParams = z.object({ id: uuid }).strict();
const tokenParams = z.object({ publicToken }).strict();
module.exports = { optionalVerifier, hashParams, idParams, tokenParams };
