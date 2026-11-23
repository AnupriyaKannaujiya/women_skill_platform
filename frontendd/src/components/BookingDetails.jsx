import { formatDate, formatMoney } from "../lib/format";
import { dayLabel, localParts, timeRange } from "../lib/calendar";

// The booking facts both sides need: what, when (start–end), where, package and price.
function BookingDetails({ booking, viewer, providerAddress }) {
  const hasEnd = Boolean(booking.endDate);
  const when = hasEnd
    ? `${dayLabel(localParts(booking.bookingDate).dateKey)}, ${timeRange(booking.bookingDate, booking.endDate)}`
    : formatDate(booking.bookingDate);
  const atProvider = booking.serviceMode === "at_provider";
  const charges = booking.charges || {};

  let where;
  if (atProvider) {
    where =
      viewer === "provider"
        ? "📍 At your place"
        : providerAddress
          ? `📍 At her place: ${providerAddress}`
          : "📍 At her place (address shown after she accepts)";
  } else {
    where = `🏠 ${booking.address}${booking.distanceKm !== undefined && booking.distanceKm !== null ? ` · ~${booking.distanceKm} km` : ""}`;
  }

  return (
    <dl className="meta-grid">
      <div><dt>Service</dt><dd>{booking.service}{booking.package?.label ? ` · ${booking.package.label}` : ""}</dd></div>
      <div><dt>When</dt><dd>{when}{booking.package?.overnight ? " · overnight" : ""}</dd></div>
      <div><dt>Where</dt><dd>{where}</dd></div>
      <div>
        <dt>Price</dt>
        <dd>
          {charges.total ? (
            <>
              <strong>{formatMoney(charges.total)}</strong>
              <span className="help" style={{ display: "block" }}>
                {formatMoney(charges.service)} service
                {charges.travel ? ` + ${formatMoney(charges.travel)} travel` : ""}
                {charges.overtime ? ` + ${formatMoney(charges.overtime)} overtime (${booking.overtimeHours} h)` : ""}
              </span>
            </>
          ) : (
            "—"
          )}
        </dd>
      </div>
      {booking.message ? <div><dt>Note</dt><dd>{booking.message}</dd></div> : null}
      {booking.checkInAt ? (
        <div>
          <dt>Safety check</dt>
          <dd>
            Arrived {formatDate(booking.checkInAt)}
            {booking.checkOutAt ? ` · left ${formatDate(booking.checkOutAt)}` : " · not checked out yet"}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

export default BookingDetails;
