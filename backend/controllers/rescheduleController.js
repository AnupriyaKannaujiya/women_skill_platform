const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const User = require("../models/User");
const handleError = require("../utils/handleError");
const { checkSlot } = require("../utils/availability");
const { notify, formatWhen } = require("../utils/notify");

const HOUR = 60 * 60 * 1000;
const MAX_REQUESTS = 3;
// A new time must leave her at least this much notice.
const MIN_NOTICE_MS = 60 * 60 * 1000;

const fail = (res, status, message, code) => res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

// Loads the booking and works out whether the signed-in user is its customer or provider.
const loadForUser = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return { error: [404, "Booking not found"] };
  const booking = await Booking.findById(req.params.id);
  if (!booking) return { error: [404, "Booking not found"] };
  const me = String(req.user._id);
  const side = String(booking.customer) === me ? "customer" : String(booking.provider) === me ? "provider" : null;
  if (!side) return { error: [404, "Booking not found"] };
  return { booking, side };
};

const otherSideId = (booking, side) => (side === "customer" ? booking.provider : booking.customer);
const dashboardFor = (side) => (side === "customer" ? "/customer/dashboard" : "/provider/dashboard");

// The provider document is needed for her calendar rules.
const providerOf = (booking) =>
  User.findById(booking.provider).select("name workingHours blockedDates");

const proposeReschedule = async (req, res) => {
  try {
    const { booking, side, error } = await loadForUser(req);
    if (error) return fail(res, ...error);

    if (!["pending", "accepted"].includes(booking.status)) {
      return fail(res, 400, "Only pending or accepted bookings can be rescheduled");
    }
    // A provider answers a pending request by suggesting another time; a customer may also move it.
    if (booking.reschedule?.status === "pending") {
      return fail(res, 409, "There is already a time change waiting for an answer");
    }
    if ((booking.rescheduleCount || 0) >= MAX_REQUESTS) {
      return fail(res, 400, `This booking already had ${MAX_REQUESTS} time-change requests. Please cancel it and make a new booking instead.`);
    }
    if (booking.checkInAt) return fail(res, 400, "The visit has already started");

    const newStart = new Date(req.body.newStart);
    if (Number.isNaN(newStart.getTime())) return fail(res, 400, "Choose a new date and time");
    if (newStart.getTime() < Date.now() + MIN_NOTICE_MS) {
      return fail(res, 400, "The new time must be at least an hour from now");
    }
    if (newStart.getTime() === booking.bookingDate.getTime()) {
      return fail(res, 400, "That is the same time as now");
    }

    const hours = Number(booking.package?.hours) || 2;
    const provider = await providerOf(booking);
    const slotError = await checkSlot(provider, newStart, hours, Boolean(booking.package?.overnight), booking._id);
    if (slotError) return fail(res, 409, slotError, "SLOT_UNAVAILABLE");

    const note = String(req.body.note || "").trim().slice(0, 300) || undefined;
    booking.reschedule = {
      proposedBy: side,
      newStart,
      newEnd: new Date(newStart.getTime() + hours * HOUR),
      note,
      status: "pending",
      createdAt: new Date(),
    };
    booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;
    await booking.save();

    const who = req.user.name;
    notify({
      to: otherSideId(booking, side),
      type: "reschedule_requested",
      title: `${who} asked to move your ${booking.service} booking`,
      body: `From ${formatWhen(booking.bookingDate)} to ${formatWhen(newStart)}.${note ? ` Note: "${note}".` : ""} Please accept or decline it in your bookings.`,
      link: dashboardFor(side === "customer" ? "provider" : "customer"),
      booking: booking._id,
    });

    res.status(201).json({ success: true, message: "New time sent. You'll be told when they reply.", booking });
  } catch (error) {
    handleError(res, error);
  }
};

const respondReschedule = async (req, res) => {
  try {
    const { booking, side, error } = await loadForUser(req);
    if (error) return fail(res, ...error);

    const request = booking.reschedule;
    if (request?.status !== "pending") return fail(res, 400, "There is no time change waiting for an answer");
    if (request.proposedBy === side) return fail(res, 403, "The other person has to answer this request");
    if (!["accept", "decline"].includes(req.body.decision)) return fail(res, 400, "Choose accept or decline");
    if (!["pending", "accepted"].includes(booking.status)) return fail(res, 400, "This booking can no longer be changed");

    if (req.body.decision === "decline") {
      request.status = "declined";
      request.respondedAt = new Date();
      await booking.save();
      notify({
        to: otherSideId(booking, side),
        type: "reschedule_declined",
        title: `${req.user.name} kept the original time`,
        body: `Your request to move ${booking.service} to ${formatWhen(request.newStart)} was declined. The booking stays at ${formatWhen(booking.bookingDate)}.`,
        link: dashboardFor(side === "customer" ? "provider" : "customer"),
        booking: booking._id,
      });
      return res.status(200).json({ success: true, message: "Declined. The original time stays.", booking });
    }

    if (request.newStart.getTime() < Date.now()) return fail(res, 400, "The suggested time has already passed");

    // Someone else may have booked that slot since it was suggested.
    const provider = await providerOf(booking);
    const hours = Number(booking.package?.hours) || 2;
    const slotError = await checkSlot(provider, request.newStart, hours, Boolean(booking.package?.overnight), booking._id);
    if (slotError) return fail(res, 409, `That time is no longer free: ${slotError}`, "SLOT_UNAVAILABLE");

    const from = booking.bookingDate;
    booking.rescheduleHistory.push({ proposedBy: request.proposedBy, from, to: request.newStart, at: new Date() });
    booking.bookingDate = request.newStart;
    booking.endDate = request.newEnd;
    // Reminders and safety checks follow the new time.
    booking.reminderSentAt = undefined;
    booking.safetyAlertAt = undefined;
    request.status = "accepted";
    request.respondedAt = new Date();
    // Agreeing on a new time also confirms a booking that was still pending.
    const confirmed = booking.status === "pending";
    if (confirmed) booking.status = "accepted";
    await booking.save();

    notify({
      to: otherSideId(booking, side),
      type: "reschedule_accepted",
      title: `${booking.service} moved to ${formatWhen(booking.bookingDate)}`,
      body: `${req.user.name} accepted the new time (was ${formatWhen(from)}).${confirmed ? " The booking is now confirmed." : ""}`,
      link: dashboardFor(side === "customer" ? "provider" : "customer"),
      booking: booking._id,
    });

    res.status(200).json({ success: true, message: `Moved to ${formatWhen(booking.bookingDate)}.`, booking });
  } catch (error) {
    handleError(res, error);
  }
};

const withdrawReschedule = async (req, res) => {
  try {
    const { booking, side, error } = await loadForUser(req);
    if (error) return fail(res, ...error);
    const request = booking.reschedule;
    if (request?.status !== "pending") return fail(res, 400, "There is no open request to withdraw");
    if (request.proposedBy !== side) return fail(res, 403, "Only the person who asked can withdraw it");

    request.status = "withdrawn";
    request.respondedAt = new Date();
    await booking.save();
    notify({
      to: otherSideId(booking, side),
      type: "reschedule_withdrawn",
      title: `${req.user.name} withdrew the time change`,
      body: `${booking.service} stays at ${formatWhen(booking.bookingDate)}.`,
      link: dashboardFor(side === "customer" ? "provider" : "customer"),
      booking: booking._id,
      email: false,
    });
    res.status(200).json({ success: true, message: "Request withdrawn. The original time stays.", booking });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { proposeReschedule, respondReschedule, withdrawReschedule, MAX_REQUESTS };
