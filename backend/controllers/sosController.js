const mongoose = require("mongoose");
const SosAlert = require("../models/SosAlert");
const Booking = require("../models/Booking");
const User = require("../models/User");
const handleError = require("../utils/handleError");
const { notify, formatWhen } = require("../utils/notify");
const { sendMail } = require("../utils/mailer");
const { distanceKm, isLocation } = require("../utils/pricing");

const NEARBY_KM = 5;
const MAX_NEARBY = 20;
const HOUR = 60 * 60 * 1000;

const mapsUrl = (point) => (isLocation(point) ? `https://maps.google.com/?q=${point.lat},${point.lng}` : "");
const digits = (phone) => {
  let value = String(phone || "").replace(/\D/g, "");
  if (value.length === 10) value = `91${value}`;
  return value;
};

// The booking she is most likely on right now: checked in, or due around this time.
const currentBooking = async (providerId, bookingId) => {
  if (bookingId && mongoose.isValidObjectId(bookingId)) {
    const chosen = await Booking.findOne({ _id: bookingId, provider: providerId }).populate(
      "customer",
      "name phone isVerified",
    );
    if (chosen) return chosen;
  }
  const now = Date.now();
  return Booking.findOne({
    provider: providerId,
    status: "accepted",
    bookingDate: { $lte: new Date(now + HOUR) },
    $or: [{ endDate: { $gte: new Date(now - 3 * HOUR) } }, { endDate: { $exists: false }, bookingDate: { $gte: new Date(now - 5 * HOUR) } }],
  })
    .sort({ checkInAt: -1, bookingDate: -1 })
    .populate("customer", "name phone isVerified");
};

const raiseSos = async (req, res) => {
  try {
    const provider = await User.findById(req.user._id).select(
      "name phone city area baseLocation emergencyContacts",
    );
    const body = req.body || {};
    const location = isLocation(body.location)
      ? {
          lat: Number(body.location.lat),
          lng: Number(body.location.lng),
          accuracy: Number(body.location.accuracy) || undefined,
        }
      : undefined;

    const booking = await currentBooking(provider._id, body.bookingId);
    const alert = await SosAlert.create({
      provider: provider._id,
      booking: booking?._id,
      location,
      message: String(body.message || "").trim().slice(0, 300) || undefined,
    });

    const where = mapsUrl(location) || mapsUrl(provider.baseLocation);
    const bookingLine = booking
      ? `She is on a ${booking.service} booking (${booking.serviceMode === "at_provider" ? "at her place" : `at ${booking.address}`}) with ${booking.customer?.name || "a customer"}${booking.customer?.phone ? `, phone ${booking.customer.phone}` : ""}${booking.customer?.isVerified ? " (ID-verified customer)" : " (customer ID not verified)"}, booked for ${formatWhen(booking.bookingDate)}.`
      : "No booking is linked to this alert.";
    const summary =
      `${provider.name} pressed SOS on Women Skill at ${formatWhen(new Date())}.` +
      `${provider.phone ? ` Her phone: ${provider.phone}.` : ""}` +
      `${where ? ` Location: ${where}` : " Location was not shared."}` +
      `${alert.message ? ` Message: "${alert.message}".` : ""} ${bookingLine}`;

    // 1. Admins: in-app + email, always.
    const admins = await User.find({ role: "admin", isBlocked: { $ne: true } }).select("_id");
    await Promise.all(
      admins.map((admin) =>
        notify({
          to: admin._id,
          type: "sos",
          title: `🚨 SOS from ${provider.name}`,
          body: summary,
          link: "/admin/sos",
          booking: booking?._id,
          forceEmail: true,
        }),
      ),
    );

    // 2. Her emergency contacts: email where we have one (phone links are returned to her app).
    const contacts = provider.emergencyContacts || [];
    for (const contact of contacts.filter((item) => item.email)) {
      sendMail({
        to: contact.email,
        subject: `🚨 Emergency: ${provider.name} needs help`,
        text: `Hi ${contact.name},\n\n${summary}\n\nPlease call her now. If you cannot reach her, call 112.\n\nWomen Skill`,
      }).catch((error) => console.error("SOS contact email failed:", error.message));
    }

    // 3. Providers who opted in and are based within NEARBY_KM of where she is.
    const origin = location || (isLocation(provider.baseLocation) ? provider.baseLocation : null);
    let nearby = [];
    if (origin) {
      const candidates = await User.find({
        _id: { $ne: provider._id },
        role: "provider",
        isBlocked: { $ne: true },
        sosNearbyAlerts: { $ne: false },
        "baseLocation.lat": { $exists: true },
      }).select("_id baseLocation");
      nearby = candidates
        .map((item) => ({ id: item._id, km: distanceKm(origin, item.baseLocation) }))
        .filter((item) => item.km <= NEARBY_KM)
        .sort((a, b) => a.km - b.km)
        .slice(0, MAX_NEARBY);
      await Promise.all(
        nearby.map((item) =>
          notify({
            to: item.id,
            type: "sos_nearby",
            title: `🚨 ${provider.name} needs help about ${item.km.toFixed(1)} km from you`,
            body: `${provider.name}${provider.phone ? ` (${provider.phone})` : ""} pressed SOS.${where ? ` Location: ${where}` : ""} If you can, call her or call 112.`,
            link: "/provider/safety",
            forceEmail: true,
          }),
        ),
      );
    }

    alert.notified = { admins: admins.length, contacts: contacts.length, nearby: nearby.length };
    await alert.save();

    // Links her phone can open in one tap (automatic SMS/WhatsApp needs a paid gateway).
    const shareText = `🚨 I need help. ${where ? `My location: ${where}` : ""}${booking ? ` I am at a ${booking.service} booking${booking.serviceMode === "at_customer" ? ` at ${booking.address}` : ""}.` : ""} — ${provider.name} (Women Skill SOS)`;
    const contactLinks = contacts.map((item) => ({
      name: item.name,
      relation: item.relation,
      call: `tel:${String(item.phone).replace(/\s/g, "")}`,
      whatsapp: digits(item.phone) ? `https://wa.me/${digits(item.phone)}?text=${encodeURIComponent(shareText)}` : "",
      sms: `sms:${String(item.phone).replace(/\s/g, "")}?body=${encodeURIComponent(shareText)}`,
    }));

    res.status(201).json({
      success: true,
      message: "Help is being alerted",
      alert,
      mapsUrl: where,
      shareText,
      contactLinks,
      notified: alert.notified,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const resolveSos = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }
    const alert = await SosAlert.findById(req.params.id).populate("provider", "name emergencyContacts");
    const isAdmin = req.user.role === "admin";
    if (!alert || (!isAdmin && String(alert.provider._id) !== String(req.user._id))) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }
    if (alert.status === "resolved") {
      return res.status(200).json({ success: true, message: "Already closed", alert });
    }

    alert.status = "resolved";
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.user._id;
    alert.resolutionNote =
      String(req.body?.note || "").trim().slice(0, 300) || (isAdmin ? "Closed by admin" : "She marked herself safe");
    await alert.save();

    const line = `${alert.provider.name}'s SOS was closed at ${formatWhen(alert.resolvedAt)}: ${alert.resolutionNote}.`;
    const admins = await User.find({ role: "admin", isBlocked: { $ne: true } }).select("_id");
    await Promise.all(
      admins.map((admin) =>
        notify({ to: admin._id, type: "sos_resolved", title: `✅ ${alert.provider.name} is safe`, body: line, link: "/admin/sos" }),
      ),
    );
    if (isAdmin) {
      notify({ to: alert.provider._id, type: "sos_resolved", title: "Your SOS was closed by the team", body: line, link: "/provider/safety" });
    }
    for (const contact of (alert.provider.emergencyContacts || []).filter((item) => item.email)) {
      sendMail({
        to: contact.email,
        subject: `✅ Update: ${alert.provider.name} is safe`,
        text: `Hi ${contact.name},\n\n${line}\n\nWomen Skill`,
      }).catch(() => {});
    }

    res.status(200).json({ success: true, message: "Marked safe", alert });
  } catch (error) {
    handleError(res, error);
  }
};

const mySos = async (req, res) => {
  try {
    const alerts = await SosAlert.find({ provider: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
    res.status(200).json({ success: true, alerts });
  } catch (error) {
    handleError(res, error);
  }
};

const listSos = async (req, res) => {
  try {
    const status = req.query.status === "resolved" ? "resolved" : "active";
    const alerts = await SosAlert.find({ status })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("provider", "name phone city area photo emergencyContacts")
      .populate({
        path: "booking",
        select: "service serviceMode address bookingDate endDate customer checkInAt",
        populate: { path: "customer", select: "name phone isVerified" },
      })
      .populate("resolvedBy", "name")
      .lean();
    const counts = {
      active: await SosAlert.countDocuments({ status: "active" }),
      resolved: await SosAlert.countDocuments({ status: "resolved" }),
    };
    res.status(200).json({ success: true, status, counts, alerts });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { raiseSos, resolveSos, mySos, listSos };
