// Fields that are never sent on public (unauthenticated) endpoints.
const PUBLIC_HIDDEN_FIELDS = "-password -email -isBlocked -__v";

module.exports = { PUBLIC_HIDDEN_FIELDS };
