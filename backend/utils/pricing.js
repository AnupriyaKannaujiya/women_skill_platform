// Distance, travel charge and booking price rules for providers.

// Straight-line distance in km between two { lat, lng } points.
const distanceKm = (a, b) => {
  const R = 6371;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const isLocation = (point) =>
  point &&
  Number.isFinite(Number(point.lat)) &&
  Number.isFinite(Number(point.lng)) &&
  Math.abs(Number(point.lat)) <= 90 &&
  Math.abs(Number(point.lng)) <= 180;

// When a provider has not set up packages yet, a single 2-hour visit at her starting price.
const packagesOf = (provider) => {
  if (Array.isArray(provider.packages) && provider.packages.length) return provider.packages;
  return [{ _id: "standard", label: "Standard visit", hours: 2, price: provider.price || 0, overnight: false }];
};

const findPackage = (provider, packageId) =>
  packagesOf(provider).find((item) => String(item._id) === String(packageId)) || null;

/**
 * Travel charge for going `km` to the customer.
 * travel = { freeKm, slabs: [{ uptoKm, charge }], perKmBeyond, maxKm }
 * Returns { charge } or { error } when the address is outside her range.
 */
const travelCharge = (travel = {}, km) => {
  const freeKm = Number(travel.freeKm) || 0;
  const maxKm = Number(travel.maxKm) || 0;
  if (maxKm && km > maxKm) {
    return { error: `This address is about ${km.toFixed(1)} km away. She travels up to ${maxKm} km.` };
  }
  if (km <= freeKm) return { charge: 0 };

  const slabs = [...(travel.slabs || [])]
    .filter((slab) => Number(slab.uptoKm) > 0)
    .sort((a, b) => a.uptoKm - b.uptoKm);
  const slab = slabs.find((item) => km <= Number(item.uptoKm));
  if (slab) return { charge: Math.round(Number(slab.charge) || 0) };

  const last = slabs[slabs.length - 1];
  const base = last ? Number(last.charge) || 0 : 0;
  const from = last ? Number(last.uptoKm) : freeKm;
  const perKm = Number(travel.perKmBeyond) || 0;
  return { charge: Math.round(base + Math.max(0, km - from) * perKm) };
};

/**
 * Price for one booking. `location` is the customer's { lat, lng } for at-home visits.
 * Returns { pkg, distanceKm, charges: { service, travel, overtime, total } } or { error }.
 */
const quote = (provider, { serviceMode, packageId, location }) => {
  const modes = provider.serviceModes || { atCustomer: true, atProvider: false };
  if (serviceMode === "at_customer" && modes.atCustomer === false) {
    return { error: "She does not visit customers' homes. Choose a visit to her place." };
  }
  if (serviceMode === "at_provider" && !modes.atProvider) {
    return { error: "She only works at the customer's place." };
  }
  if (!["at_customer", "at_provider"].includes(serviceMode)) {
    return { error: "Choose where the service will happen" };
  }

  const pkg = findPackage(provider, packageId);
  if (!pkg) return { error: "Choose one of her packages" };

  let distance = null;
  let travel = 0;

  if (serviceMode === "at_customer" && isLocation(provider.baseLocation) && provider.baseLocation.lat !== undefined) {
    if (!isLocation(location)) {
      return { error: "Share your location so the travel charge can be worked out" };
    }
    // Rounded so the exact base location of the provider cannot be worked out.
    distance = Math.round(distanceKm(provider.baseLocation, { lat: Number(location.lat), lng: Number(location.lng) }) * 2) / 2;
    const result = travelCharge(provider.travel, distance);
    if (result.error) return { error: result.error };
    travel = result.charge;
  }

  const service = Math.round(Number(pkg.price) || 0);
  return {
    pkg,
    distanceKm: distance,
    charges: { service, travel, overtime: 0, total: service + travel },
  };
};

module.exports = { distanceKm, isLocation, packagesOf, findPackage, travelCharge, quote };
