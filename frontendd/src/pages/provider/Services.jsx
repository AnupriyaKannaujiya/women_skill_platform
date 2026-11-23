import { useState } from "react";
import { useToast } from "../../context/ToastContext";
import { Loading } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { useProviderSettings } from "../../lib/useProviderSettings";
import { getLocation, mapsLink } from "../../lib/geo";
import { formatMoney } from "../../lib/format";

const blankSlab = { uptoKm: "", charge: "" };
const blankPackage = { label: "", hours: "", price: "", overnight: false };

// Example travel charge for a few distances, so she can see what customers will pay.
function travelPreview(travel, km) {
  const freeKm = Number(travel.freeKm) || 0;
  const maxKm = Number(travel.maxKm) || 0;
  if (maxKm && km > maxKm) return "out of range";
  if (km <= freeKm) return "free";
  const slabs = travel.slabs
    .filter((slab) => Number(slab.uptoKm) > 0)
    .map((slab) => ({ uptoKm: Number(slab.uptoKm), charge: Number(slab.charge) || 0 }))
    .sort((a, b) => a.uptoKm - b.uptoKm);
  const slab = slabs.find((item) => km <= item.uptoKm);
  if (slab) return formatMoney(slab.charge);
  const last = slabs[slabs.length - 1];
  const base = last ? last.charge : 0;
  const from = last ? last.uptoKm : freeKm;
  return formatMoney(Math.round(base + Math.max(0, km - from) * (Number(travel.perKmBeyond) || 0)));
}

function ServicesForm({ initial, save, saving }) {
  const toast = useToast();
  const [modes, setModes] = useState(initial.serviceModes);
  const [address, setAddress] = useState(initial.providerAddress);
  const [base, setBase] = useState(initial.baseLocation);
  const [locating, setLocating] = useState(false);
  const [travel, setTravel] = useState({
    ...initial.travel,
    slabs: initial.travel.slabs.length ? initial.travel.slabs : [{ uptoKm: 5, charge: 50 }, { uptoKm: 10, charge: 100 }],
  });
  const [packages, setPackages] = useState(
    initial.packages.length
      ? initial.packages
      : [
          { label: "2 hours", hours: 2, price: "", overnight: false },
          { label: "5 hours", hours: 5, price: "", overnight: false },
        ],
  );
  const [overtimeRate, setOvertimeRate] = useState(initial.overtimeRate || "");
  const [error, setError] = useState("");

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const point = await getLocation();
      setBase({ lat: point.lat, lng: point.lng });
      toast("Location set. Remember to save.", "ok");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLocating(false);
    }
  };

  const setSlab = (index, key, value) =>
    setTravel((current) => ({
      ...current,
      slabs: current.slabs.map((slab, i) => (i === index ? { ...slab, [key]: value } : slab)),
    }));

  const setPackage = (index, key, value) =>
    setPackages((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!modes.atCustomer && !modes.atProvider) {
      setError("Choose at least one place where you work.");
      return;
    }
    if (modes.atProvider && !address.trim()) {
      setError("Add the address where customers come to you.");
      return;
    }
    const cleanPackages = packages.filter((item) => item.label || item.hours || item.price);
    if (!cleanPackages.length) {
      setError("Add at least one package with hours and a price.");
      return;
    }
    const result = await save({
      serviceModes: modes,
      providerAddress: address,
      baseLocation: base,
      travel: {
        freeKm: Number(travel.freeKm) || 0,
        slabs: travel.slabs.filter((slab) => slab.uptoKm !== "" || slab.charge !== ""),
        perKmBeyond: Number(travel.perKmBeyond) || 0,
        maxKm: Number(travel.maxKm) || 0,
      },
      packages: cleanPackages,
      overtimeRate: Number(overtimeRate) || 0,
    });
    if (result.ok) toast("Services and prices saved.", "ok");
    else setError(result.message);
  };

  return (
    <form onSubmit={submit} noValidate>
      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Where do you work?</h2>
        <p className="muted" style={{ margin: "4px 0 12px" }}>Customers choose one of these when they book.</p>
        <label className="check-field">
          <input type="checkbox" checked={modes.atCustomer} onChange={(e) => setModes((m) => ({ ...m, atCustomer: e.target.checked }))} />
          <span>🏠 I go to the customer's place</span>
        </label>
        <label className="check-field">
          <input type="checkbox" checked={modes.atProvider} onChange={(e) => setModes((m) => ({ ...m, atProvider: e.target.checked }))} />
          <span>📍 Customers come to my place</span>
        </label>
        {modes.atProvider ? (
          <label className="field">
            <span>Your address for customers <em className="help">shared only after you accept a booking</em></span>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} placeholder="e.g. 12 Hazratganj, near City Mall, Lucknow" style={{ minHeight: 70 }} />
          </label>
        ) : null}
      </section>

      {modes.atCustomer ? (
        <section className="card" style={{ marginBottom: 14 }}>
          <h2>Travel charges</h2>
          <p className="muted" style={{ margin: "4px 0 12px" }}>
            Distance is measured from your base location to the customer (straight line, so roughly). Your exact
            location is never shown to anyone.
          </p>
          <div className="split" style={{ marginBottom: 12 }}>
            <span>
              {base ? (
                <>Base location set · <a href={mapsLink(base)} target="_blank" rel="noreferrer">view on map</a></>
              ) : (
                <span className="error-text">No base location yet — travel will not be charged.</span>
              )}
            </span>
            <button className="btn btn-line btn-sm" type="button" onClick={useMyLocation} disabled={locating}>
              {locating ? "Locating…" : base ? "Update to where I am now" : "Use where I am now"}
            </button>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Free up to (km)</span>
              <input type="number" min="0" step="0.5" value={travel.freeKm} onChange={(e) => setTravel((t) => ({ ...t, freeKm: e.target.value }))} />
            </label>
            <label className="field">
              <span>I travel at most (km) <em className="help">0 = no limit</em></span>
              <input type="number" min="0" value={travel.maxKm} onChange={(e) => setTravel((t) => ({ ...t, maxKm: e.target.value }))} />
            </label>
          </div>

          <p className="help" style={{ marginBottom: 6 }}>Distance slabs</p>
          {travel.slabs.map((slab, index) => (
            <div className="slab-row" key={index}>
              <span>Up to</span>
              <input aria-label="Up to km" type="number" min="0.5" step="0.5" value={slab.uptoKm} onChange={(e) => setSlab(index, "uptoKm", e.target.value)} />
              <span>km →</span>
              <span>₹</span>
              <input aria-label="Charge" type="number" min="0" value={slab.charge} onChange={(e) => setSlab(index, "charge", e.target.value)} />
              <button className="icon-btn" type="button" aria-label="Remove slab" onClick={() => setTravel((t) => ({ ...t, slabs: t.slabs.filter((_, i) => i !== index) }))}>×</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setTravel((t) => ({ ...t, slabs: [...t.slabs, { ...blankSlab }] }))}>
            + Add slab
          </button>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Beyond the last slab, per extra km (₹)</span>
            <input type="number" min="0" value={travel.perKmBeyond} onChange={(e) => setTravel((t) => ({ ...t, perKmBeyond: e.target.value }))} />
          </label>
          <p className="help">
            Customers will pay: 3 km → {travelPreview(travel, 3)} · 7 km → {travelPreview(travel, 7)} · 12 km →{" "}
            {travelPreview(travel, 12)} · 25 km → {travelPreview(travel, 25)}
          </p>
        </section>
      ) : null}

      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Packages by time</h2>
        <p className="muted" style={{ margin: "4px 0 12px" }}>
          e.g. 2 hours ₹500, 5 hours ₹1,000, Overnight ₹2,500. "Overnight" packages may run past your working hours.
        </p>
        <div className="package-row package-head" aria-hidden="true">
          <span>Package name</span>
          <span>Hours</span>
          <span>Price (₹)</span>
        </div>
        {packages.map((item, index) => (
          <div className="package-row" key={item._id || index}>
            <input aria-label="Package name" placeholder="Name, e.g. Half day" value={item.label} onChange={(e) => setPackage(index, "label", e.target.value)} maxLength={40} />
            <input aria-label="Hours" type="number" min="0.5" max="24" step="0.5" placeholder="Hours" value={item.hours} onChange={(e) => setPackage(index, "hours", e.target.value)} />
            <input aria-label="Price" type="number" min="0" placeholder="₹ Price" value={item.price} onChange={(e) => setPackage(index, "price", e.target.value)} />
            <label className="check-field" style={{ margin: 0 }}>
              <input type="checkbox" checked={Boolean(item.overnight)} onChange={(e) => setPackage(index, "overnight", e.target.checked)} />
              <span>Overnight</span>
            </label>
            <button className="icon-btn" type="button" aria-label="Remove package" onClick={() => setPackages((list) => list.filter((_, i) => i !== index))}>×</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPackages((list) => [...list, { ...blankPackage }])} disabled={packages.length >= 8}>
          + Add package
        </button>
        <label className="field" style={{ marginTop: 12 }}>
          <span>Overtime, per extra hour (₹) <em className="help">added when you mark the work completed</em></span>
          <input type="number" min="0" value={overtimeRate} onChange={(e) => setOvertimeRate(e.target.value)} />
        </label>
      </section>

      {error ? <p className="error-text" role="alert" style={{ marginBottom: 12 }}>{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save services & prices"}</button>
    </form>
  );
}

function Services() {
  usePageTitle("Services & prices");
  const { settings, error, saving, save } = useProviderSettings();

  return (
    <div style={{ maxWidth: 760 }}>
      <p className="eyebrow">Provider</p>
      <h1 className="section-title" style={{ margin: "8px 0 8px" }}>Services & prices</h1>
      <p className="muted" style={{ marginBottom: 16 }}>Set where you work, your travel charges and your time packages.</p>
      {error ? <div className="note note-error">{error}</div> : null}
      {settings ? <ServicesForm initial={settings} save={save} saving={saving} /> : !error ? <Loading label="Loading" /> : null}
    </div>
  );
}

export default Services;
