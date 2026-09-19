const {
  z,
  uuid,
  trimmed,
} = require("./commonValidator");

const supersede =
  z.object({
    replacementCredentialId:
      uuid,

    reason:
      trimmed(
        "Supersession reason",
        1000,
        5
      ),
  }).strict();

module.exports = {
  supersede,
};
