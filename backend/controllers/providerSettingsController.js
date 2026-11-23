const mongoose = require("mongoose");
const User = require("../models/User");
const handleError = require("../utils/handleError");
const { weekOf, buildCalendar } = require("../utils/availability");
const { packagesOf, isLocation, quote } = require("../utils/pricing");
const { localParts, toMinutes, isDateKey } = require("../utils/time");

const SETTINGS_FIELDS =
  "serviceModes providerAddress baseLocation travel packages overtimeRate workingHours " +
  "blockedDates requireVerifiedCustomers emergencyContacts sosNearbyAlerts price";

const settingsView = (user) => ({
  serviceModes: {
    atCustomer: user.serviceModes?.atCustomer !== false,
    atProvider: Boolean(user.serviceModes?.atProvider),
  },
  providerAddress: user.providerAddress || "",
  baseLocation: isLocation(user.baseLocation) ? user.baseLocation : null,
  travel: {
    freeKm: user.travel?.freeKm || 0,
    slabs: user.travel?.slabs || [],
    perKmBeyond: user.travel?.perKmBeyond || 0,
    maxKm: user.travel?.maxKm || 0,
  },
  packages: user.packages || [],
  overtimeRate: user.overtimeRate || 0,
  workingHours: weekOf(user),
  blockedDates: [...(user.blockedDates || [])].sort(),
  requireVerifiedCustomers: Boolean(user.requireVerifiedCustomers),
  emergencyContacts: user.emergencyContacts || [],
  sosNearbyAlerts: user.sosNearbyAlerts !== false,
});

const num = (value) => (value === "" || value === null || value === undefined ? undefined : Number(value));
const fail = (res, message) => res.status(400).json({ success: false, message });

const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(SETTINGS_FIELDS);
    res.status(200).json({ success: true, settings: settingsView(user) });
  } catch (error) {
    handleError(res, error);
  }
};

// Partial update: only the sections sent are changed.
const updateSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const user = await User.findById(req.user._id).select(SETTINGS_FIELDS);

    if (body.serviceModes) {
      const atCustomer = Boolean(body.serviceModes.atCustomer);
      const atProvider = Boolean(body.serviceModes.atProvider);
      if (!atCustomer && !atProvider) return fail(res, "Choose at least one place where you work");
      user.serviceModes = { atCustomer, atProvider };
    }

    if (body.providerAddress !== undefined) {
      user.providerAddress = String(body.providerAddress || "").trim().slice(0, 300);
    }
    if (user.serviceModes?.atProvider && !user.providerAddress) {
      return fail(res, "Add the address where customers come to you");
    }

    if (body.baseLocation !== undefined) {
      if (body.baseLocation === null) {
        user.baseLocation = undefined;
      } else if (isLocation(body.baseLocation)) {
        user.baseLocation = { lat: Number(body.baseLocation.lat), lng: Number(body.baseLocation.lng) };
      } else {
        return fail(res, "That location is not valid");
      }
    }

    if (body.travel) {
      const slabs = (body.travel.slabs || [])
        .map((slab) => ({ uptoKm: num(slab.uptoKm), charge: num(slab.charge) }))
        .filter((slab) => slab.uptoKm !== undefined || slab.charge !== undefined);
      if (slabs.some((slab) => !(slab.uptoKm > 0) || !(slab.charge >= 0))) {
        return fail(res, "Each travel slab needs a distance above 0 km and a charge of ₹0 or more");
      }
      slabs.sort((a, b) => a.uptoKm - b.uptoKm);
      if (new Set(slabs.map((slab) => slab.uptoKm)).size !== slabs.length) {
        return fail(res, "Two travel slabs have the same distance");
      }
      user.travel = {
        freeKm: num(body.travel.freeKm) || 0,
        slabs,
        perKmBeyond: num(body.travel.perKmBeyond) || 0,
        maxKm: num(body.travel.maxKm) || 0,
      };
    }

    if (body.packages) {
      const packages = body.packages.map((item) => ({
        _id: mongoose.isValidObjectId(item._id) ? item._id : undefined,
        label: String(item.label || "").trim().slice(0, 40),
        hours: num(item.hours),
        price: num(item.price),
        overnight: Boolean(item.overnight),
      }));
      if (packages.length > 8) return fail(res, "Add up to 8 packages");
      if (packages.some((item) => !item.label || !(item.hours >= 0.5 && item.hours <= 24) || !(item.price >= 0))) {
        return fail(res, "Each package needs a name, 0.5–24 hours and a price");
      }
      user.packages = packages;
      // Keep the "starting price" on cards in step with the cheapest package.
      if (packages.length) user.price = Math.min(...packages.map((item) => item.price));
    }

    if (body.overtimeRate !== undefined) {
      const rate = num(body.overtimeRate) || 0;
      if (rate < 0) return fail(res, "Overtime rate cannot be negative");
      user.overtimeRate = rate;
    }

    if (body.workingHours) {
      const week = [];
      for (const item of body.workingHours) {
        const day = Number(item.day);
        if (!(day >= 0 && day <= 6)) return fail(res, "Unknown weekday");
        const start = toMinutes(item.start);
        const end = toMinutes(item.end);
        if (item.enabled && (start === null || end === null || end <= start)) {
          return fail(res, "Each working day needs a start time before its end time");
        }
        week.push({ day, enabled: Boolean(item.enabled), start: item.start, end: item.end });
      }
      user.workingHours = week;
    }

    if (body.blockedDates) {
      const today = localParts(new Date()).dateKey;
      const dates = [...new Set(body.blockedDates.filter(isDateKey))].filter((date) => date >= today).sort();
      if (dates.length > 120) return fail(res, "Too many days off at once");
      user.blockedDates = dates;
    }

    if (body.requireVerifiedCustomers !== undefined) {
      user.requireVerifiedCustomers = Boolean(body.requireVerifiedCustomers);
    }

    if (body.emergencyContacts) {
      const contacts = body.emergencyContacts
        .map((item) => ({
          name: String(item.name || "").trim().slice(0, 60),
          phone: String(item.phone || "").trim().slice(0, 20),
          email: String(item.email || "").trim().toLowerCase().slice(0, 120),
          relation: String(item.relation || "").trim().slice(0, 30),
        }))
        .filter((item) => item.name || item.phone || item.email);
      if (contacts.length > 3) return fail(res, "Add up to 3 emergency contacts");
      if (contacts.some((item) => !item.name || !/^[+\d][\d\s-]{7,}$/.test(item.phone))) {
        return fail(res, "Each emergency contact needs a name and a phone number");
      }
      if (contacts.some((item) => item.email && !/^\S+@\S+\.\S+$/.test(item.email))) {
        return fail(res, "One emergency contact email is not valid");
      }
      user.emergencyContacts = contacts;
    }

    if (body.sosNearbyAlerts !== undefined) user.sosNearbyAlerts = Boolean(body.sosNearbyAlerts);

    await user.save();
    res.status(200).json({ success: true, message: "Settings saved", settings: settingsView(user) });
  } catch (error) {
    handleError(res, error);
  }
};

const loadPublicProvider = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return User.findOne({ _id: id, role: "provider", isBlocked: { $ne: true } }).select(
    `${SETTINGS_FIELDS} name`,
  );
};

// Public: which days and times she is free. No customer details are included.
const getAvailability = async (req, res) => {
  try {
    const provider = await loadPublicProvider(req.params.id);
    if (!provider) return res.status(404).json({ success: false, message: "Provider not found" });

    const today = localParts(new Date()).dateKey;
    const from = isDateKey(req.query.from) && req.query.from >= today ? req.query.from : today;
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 62);

    res.status(200).json({
      success: true,
      today,
      calendar: await buildCalendar(provider, from, days),
      packages: packagesOf(provider),
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Public: price for a package (and travel to the customer's location) before booking.
const getQuote = async (req, res) => {
  try {
    const provider = await loadPublicProvider(req.params.id);
    if (!provider) return res.status(404).json({ success: false, message: "Provider not found" });

    const result = quote(provider, {
      serviceMode: req.body.serviceMode,
      packageId: req.body.packageId,
      location: req.body.location,
    });
    if (result.error) return fail(res, result.error);

    res.status(200).json({
      success: true,
      package: result.pkg,
      distanceKm: result.distanceKm,
      charges: result.charges,
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getSettings, updateSettings, getAvailability, getQuote, SETTINGS_FIELDS };
