// Fields that are never sent on public (unauthenticated) endpoints.
// Phone and WhatsApp are shared with a customer only after the provider
// accepts their booking (see getMyBookings).
const PUBLIC_HIDDEN_FIELDS =
  "-password -email -phone -whatsapp -isBlocked -verification -passwordChangedAt -__v " +
  "-baseLocation -providerAddress -emergencyContacts -sosNearbyAlerts -emailNotifications " +
  "-blockedCustomers -customerRating -customerRatingCount";

// What a signed-in user may see about themselves: everything except secrets
// and the location of their private ID document.
const SELF_HIDDEN_FIELDS = "-password -verification.document";

module.exports = { PUBLIC_HIDDEN_FIELDS, SELF_HIDDEN_FIELDS };
