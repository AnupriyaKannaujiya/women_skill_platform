// Fields that are never sent on public (unauthenticated) endpoints.
// Phone and WhatsApp are shared with a customer only after the provider
// accepts their booking (see getMyBookings).
const PUBLIC_HIDDEN_FIELDS = "-password -email -phone -whatsapp -isBlocked -__v";

module.exports = { PUBLIC_HIDDEN_FIELDS };
