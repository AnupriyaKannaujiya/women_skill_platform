import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import { Loading } from "../components/ui";
import { usePageTitle } from "../lib/usePageTitle";
import { formatMoney, getError, skillList, unwrapUser } from "../lib/format";
import { dayLabel, freeStarts, fromLocal, minutesLabel, timeRange } from "../lib/calendar";
import { getLocation } from "../lib/geo";

const MODE_LABELS = {
  at_customer: { icon: "🏠", title: "At my place", text: "She comes to your address" },
  at_provider: { icon: "📍", title: "At her place", text: "You go to her (address shared after she accepts)" },
};

function Booking() {
  usePageTitle("Request a booking");
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [provider, setProvider] = useState(null);
  const [me, setMe] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loadError, setLoadError] = useState("");

  const [service, setService] = useState("");
  const [customService, setCustomService] = useState("");
  const [mode, setMode] = useState("");
  const [packageId, setPackageId] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState(null);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  const [rawQuote, setQuote] = useState(null);
  const [rawQuoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/users/${id}`),
      api.get(`/providers/${id}/availability`, { params: { days: 30 } }),
      api.get("/auth/profile"),
    ])
      .then(([profile, availability, mine]) => {
        if (cancelled) return;
        const p = profile.data.user;
        setProvider(p);
        setCalendar(availability.data.calendar || []);
        setPackages(availability.data.packages || []);
        setMe(unwrapUser(mine.data));
        const modes = p.serviceModes || { atCustomer: true };
        setMode(modes.atCustomer !== false ? "at_customer" : "at_provider");
        setPackageId(String(availability.data.packages?.[0]?._id || ""));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getError(err, "This provider could not be loaded."));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pkg = packages.find((item) => String(item._id) === packageId);
  const hours = Number(pkg?.hours) || 2;
  const day = calendar.find((item) => item.date === date);
  const starts = useMemo(() => freeStarts(day, hours, Boolean(pkg?.overnight), now), [day, hours, pkg, now]);
  const needsLocation = mode === "at_customer" && provider?.distanceBasedTravel;
  // Until she shares her location the travel part is unknown, so no price is shown.
  const waitingForLocation = Boolean(needsLocation && !location);
  const quote = waitingForLocation ? null : rawQuote;
  const quoteError = waitingForLocation ? "" : rawQuoteError;

  // Price from the server (travel uses her private base location).
  useEffect(() => {
    if (!provider || !packageId || !mode) return undefined;
    if (waitingForLocation) return undefined;
    let cancelled = false;
    api
      .post(`/providers/${id}/quote`, { serviceMode: mode, packageId, location })
      .then((response) => {
        if (cancelled) return;
        setQuote(response.data);
        setQuoteError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(getError(err, "Could not work out the price."));
      });
    return () => {
      cancelled = true;
    };
  }, [id, provider, packageId, mode, location, waitingForLocation]);

  const shareLocation = async () => {
    setLocating(true);
    try {
      const point = await getLocation();
      setLocation({ lat: point.lat, lng: point.lng });
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLocating(false);
    }
  };

  if (loadError) return <div className="note note-error">{loadError}</div>;
  if (!provider || !me) return <Loading label="Loading her calendar" />;

  const skills = skillList(provider.skill);
  const modes = provider.serviceModes || { atCustomer: true, atProvider: false };
  const offered = ["at_customer", "at_provider"].filter((key) =>
    key === "at_customer" ? modes.atCustomer !== false : modes.atProvider,
  );
  const missingPhone = !String(me.phone || "").trim();
  const needsVerification = provider.requireVerifiedCustomers && !me.isVerified;
  const chosenService = service === "other" ? customService.trim() : service.trim();
  const startDate = date && start !== null ? fromLocal(date, start) : null;
  const endDate = startDate ? new Date(startDate.getTime() + hours * 3600000) : null;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!chosenService) return setError("Choose what you need.");
    if (!pkg) return setError("Choose a package.");
    if (!startDate) return setError("Choose a date and a start time.");
    if (mode === "at_customer" && !address.trim()) return setError("Add your full address.");
    if (needsLocation && !location) return setError("Share your location so the travel charge can be worked out.");
    if (quoteError) return setError(quoteError);

    setSending(true);
    try {
      const response = await api.post("/bookings", {
        provider: id,
        service: chosenService,
        serviceMode: mode,
        packageId,
        bookingDate: startDate.toISOString(),
        address: mode === "at_customer" ? address.trim() : "",
        location: mode === "at_customer" ? location : undefined,
        message: message.trim(),
      });
      toast("Request sent.", "ok");
      setDone(response.data.booking);
    } catch (err) {
      const code = err?.response?.data?.code;
      setError(getError(err));
      if (code === "SLOT_UNAVAILABLE") {
        // Someone else may have just taken it: refresh her calendar.
        api.get(`/providers/${id}/availability`, { params: { days: 30 } }).then((r) => setCalendar(r.data.calendar || []));
        setStart(null);
      }
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="card" style={{ maxWidth: 680 }}>
        <p className="eyebrow">Request sent</p>
        <h1 className="section-title" style={{ margin: "8px 0 10px" }}>{provider.name} has your request.</h1>
        <p className="lead">
          {done.service} · {done.package?.label} · {dayLabel(date)}, {timeRange(done.bookingDate, done.endDate)} ·{" "}
          {done.serviceMode === "at_provider" ? "at her place" : "at your place"} · <strong>{formatMoney(done.charges?.total)}</strong>
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          It stays pending until she accepts. If she does not reply before the start time, it expires automatically.
        </p>
        <Link className="btn btn-primary" style={{ marginTop: 16 }} to="/customer/dashboard">Go to my bookings</Link>
      </div>
    );
  }

  return (
    <form className="card booking-form" onSubmit={submit} noValidate style={{ maxWidth: 760 }}>
      <p className="eyebrow">Booking</p>
      <h1 className="section-title" style={{ margin: "8px 0 4px" }}>
        Request {provider.name}
        {provider.isVerified ? <span className="verified-badge" style={{ marginLeft: 8 }}>✓ Verified</span> : null}
      </h1>
      <p className="muted" style={{ marginBottom: 16 }}>{[provider.area, provider.city].filter(Boolean).join(", ")}</p>

      {missingPhone ? (
        <div className="note note-warn" style={{ marginBottom: 14 }}>
          <strong>Add your phone number first.</strong> For everyone's safety she must be able to reach you.{" "}
          <Link to="/account/profile">Add it in your profile</Link>
        </div>
      ) : null}
      {needsVerification ? (
        <div className="note note-warn" style={{ marginBottom: 14 }}>
          <strong>She only accepts verified customers.</strong> Upload your ID once and the team will check it.{" "}
          <Link to="/account/verification">Verify my ID</Link>
        </div>
      ) : null}

      <fieldset className="step-block">
        <legend>1. What do you need?</legend>
        {skills.length ? (
          <select aria-label="Service" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Choose a skill</option>
            {skills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
            <option value="other">Something else</option>
          </select>
        ) : (
          <input aria-label="Service" value={service} onChange={(e) => setService(e.target.value)} placeholder="What do you need?" />
        )}
        {service === "other" ? (
          <input aria-label="Describe the service" style={{ marginTop: 8 }} value={customService} onChange={(e) => setCustomService(e.target.value)} placeholder="Describe the service" />
        ) : null}
      </fieldset>

      <fieldset className="step-block">
        <legend>2. Where?</legend>
        <div className="choice-grid">
          {offered.map((key) => (
            <label key={key} className={mode === key ? "choice selected" : "choice"}>
              <input type="radio" name="mode" value={key} checked={mode === key} onChange={() => setMode(key)} />
              <span className="choice-title">{MODE_LABELS[key].icon} {MODE_LABELS[key].title}</span>
              <span className="help">{MODE_LABELS[key].text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="step-block">
        <legend>3. How long?</legend>
        <div className="choice-grid">
          {packages.map((item) => (
            <label key={item._id} className={packageId === String(item._id) ? "choice selected" : "choice"}>
              <input type="radio" name="package" checked={packageId === String(item._id)} onChange={() => { setPackageId(String(item._id)); setStart(null); }} />
              <span className="choice-title">{item.label}</span>
              <span className="help">{item.hours} h{item.overnight ? " · overnight" : ""}</span>
              <strong>{formatMoney(item.price)}</strong>
            </label>
          ))}
        </div>
        {provider.overtimeRate ? (
          <p className="help" style={{ marginTop: 6 }}>Extra time beyond the package: {formatMoney(provider.overtimeRate)} per hour.</p>
        ) : null}
      </fieldset>

      <fieldset className="step-block">
        <legend>4. When?</legend>
        <div className="day-strip" role="listbox" aria-label="Choose a date">
          {calendar.map((item) => {
            const count = freeStarts(item, hours, Boolean(pkg?.overnight), now).length;
            const disabled = item.status !== "open" || count === 0;
            const reason = item.status === "blocked" ? "Day off" : item.status === "off" ? "Closed" : count === 0 ? "Full" : `${count} slots`;
            return (
              <button
                key={item.date}
                type="button"
                role="option"
                aria-selected={date === item.date}
                className={["day-pill", date === item.date ? "selected" : "", disabled ? "disabled" : ""].join(" ")}
                disabled={disabled}
                onClick={() => { setDate(item.date); setStart(null); }}
              >
                <span>{dayLabel(item.date)}</span>
                <span className="help">{reason}</span>
              </button>
            );
          })}
        </div>
        {day ? (
          <>
            <p className="help" style={{ margin: "10px 0 6px" }}>
              She works {day.start}–{day.end} on this day. Start times where {pkg?.label || "this package"} fits:
            </p>
            <div className="chip-row">
              {starts.map((minutes) => (
                <button key={minutes} type="button" className={start === minutes ? "chip active" : "chip"} onClick={() => setStart(minutes)}>
                  {minutesLabel(minutes)}
                </button>
              ))}
              {!starts.length ? <span className="muted">No free time left on this day.</span> : null}
            </div>
          </>
        ) : null}
        {startDate ? (
          <p className="note" style={{ marginTop: 10 }}>
            🕑 {dayLabel(date)}, <strong>{timeRange(startDate, endDate)}</strong> ({hours} h). Extra time is charged as overtime.
          </p>
        ) : null}
      </fieldset>

      {mode === "at_customer" ? (
        <fieldset className="step-block">
          <legend>5. Your address</legend>
          <textarea aria-label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / flat, street, area, landmark" maxLength={300} />
          {provider.distanceBasedTravel ? (
            <div className="split" style={{ marginTop: 8 }}>
              <span className="help">
                {location ? `Location shared${quote?.distanceKm !== null && quote?.distanceKm !== undefined ? ` · about ${quote.distanceKm} km from her` : ""}.` : "Share your location so her travel charge can be worked out."}
              </span>
              <button className="btn btn-line btn-sm" type="button" onClick={shareLocation} disabled={locating}>
                {locating ? "Locating…" : location ? "Update location" : "📍 Use my current location"}
              </button>
            </div>
          ) : (
            <p className="help" style={{ marginTop: 6 }}>No travel charge for this provider.</p>
          )}
        </fieldset>
      ) : (
        <fieldset className="step-block">
          <legend>5. Her place</legend>
          <p className="muted">You will see her address and phone in My bookings as soon as she accepts.</p>
        </fieldset>
      )}

      <fieldset className="step-block">
        <legend>6. Note for her <em className="help">optional</em></legend>
        <textarea aria-label="Message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder="e.g. Bridal mehndi for both hands and feet" />
      </fieldset>

      <section className="price-box" aria-live="polite">
        <h2>Price</h2>
        {quote ? (
          <dl>
            <div><dt>{quote.package?.label} ({quote.package?.hours} h)</dt><dd>{formatMoney(quote.charges.service)}</dd></div>
            {mode === "at_customer" ? (
              <div><dt>Travel{quote.distanceKm !== null && quote.distanceKm !== undefined ? ` (~${quote.distanceKm} km)` : ""}</dt><dd>{quote.charges.travel ? formatMoney(quote.charges.travel) : "Free"}</dd></div>
            ) : null}
            <div className="total"><dt>Total to pay her</dt><dd>{formatMoney(quote.charges.total)}</dd></div>
          </dl>
        ) : quoteError ? (
          <p className="error-text">{quoteError}</p>
        ) : (
          <p className="muted">{needsLocation ? "Share your location to see the full price." : "Choose a package to see the price."}</p>
        )}
        <p className="help">Pay her directly after the work. Overtime, if any, is added when she marks it completed.</p>
      </section>

      {error ? <p className="error-text" role="alert" style={{ margin: "12px 0" }}>{error}</p> : null}
      <div className="cluster" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" type="submit" disabled={sending || missingPhone || needsVerification}>
          {sending ? "Sending…" : quote ? `Send request · ${formatMoney(quote.charges.total)}` : "Send request"}
        </button>
        <button className="btn btn-line" type="button" onClick={() => navigate(`/providers/${id}`)}>Back to profile</button>
      </div>
    </form>
  );
}

export default Booking;
