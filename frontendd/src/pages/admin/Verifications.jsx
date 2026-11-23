import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Avatar, ConfirmModal, Empty, Loading, Modal } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, getError, skillLabel } from "../../lib/format";

const TABS = ["pending", "verified", "rejected"];
const ID_LABELS = {
  aadhaar: "Aadhaar card",
  pan: "PAN card",
  voter: "Voter ID",
  driving: "Driving licence",
  passport: "Passport",
  other: "Other ID",
};

function AdminVerifications() {
  usePageTitle("Verifications");
  const toast = useToast();
  const [tab, setTab] = useState("pending");
  const [data, setData] = useState({ providers: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [viewing, setViewing] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/verifications", { params: { status: tab } })
      .then((response) => {
        if (!cancelled) setData({ providers: response.data.providers || [], counts: response.data.counts || {} });
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Could not load verification requests."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, version]);

  const openDocument = async (provider) => {
    setViewing({ provider, url: "", loading: true });
    try {
      const response = await api.get(`/admin/verifications/${provider._id}/document`);
      setViewing({ provider, url: response.data.url, expiresAt: response.data.expiresAt, loading: false });
    } catch (err) {
      toast(getError(err, "Could not open the ID."), "error");
      setViewing(null);
    }
  };

  const decide = async (provider, decision, reason = "") => {
    setBusy(true);
    try {
      const response = await api.put(`/admin/verifications/${provider._id}`, { decision, note: reason });
      toast(response.data.message, "ok");
      setApproving(null);
      setRejecting(null);
      setViewing(null);
      setNote("");
      setVersion((value) => value + 1);
    } catch (err) {
      toast(getError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Loading verifications" />;

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="section-title" style={{ margin: "8px 0 6px" }}>ID verification</h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        Providers and customers. Check that the ID matches the account name (and photo for providers). ID photos are deleted once you decide.
      </p>
      {error ? <div className="note note-error">{error}</div> : null}

      <div className="chip-row" role="tablist" aria-label="Filter verifications" style={{ marginBottom: 14 }}>
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? "chip active" : "chip"}
            onClick={() => {
              setLoading(true);
              setTab(item);
            }}
          >
            {item}
            <span className="count">{data.counts[item] ?? 0}</span>
          </button>
        ))}
      </div>

      {data.providers.length === 0 ? (
        <Empty
          title={tab === "pending" ? "Nothing to review" : `No ${tab} providers`}
          text={tab === "pending" ? "New ID uploads from providers will show here." : "Pick another tab."}
        />
      ) : (
        data.providers.map((provider) => {
          const v = provider.verification || {};
          return (
            <article className="booking" key={provider._id}>
              <div className="booking-head">
                <div className="person">
                  <Avatar name={provider.name} src={provider.photo} />
                  <div>
                    <h3>
                      {provider.role === "provider" ? (
                        <Link to={`/providers/${provider._id}`}>{provider.name}</Link>
                      ) : (
                        provider.name
                      )}{" "}
                      <span className="chip">{provider.role}</span>
                    </h3>
                    <p className="muted">{[provider.area, provider.city].filter(Boolean).join(", ") || "City not added"}</p>
                  </div>
                </div>
                <span className={`badge badge-${tab === "verified" ? "accepted" : tab === "rejected" ? "rejected" : "pending"}`}>
                  {tab === "pending" ? "waiting" : tab}
                </span>
              </div>
              <dl className="meta-grid">
                <div><dt>ID type</dt><dd>{ID_LABELS[v.idType] || "—"}</dd></div>
                <div><dt>Sent</dt><dd>{formatDate(v.submittedAt)}</dd></div>
                <div><dt>Email</dt><dd>{provider.email}</dd></div>
                <div><dt>Skills</dt><dd>{skillLabel(provider.skill)}</dd></div>
                {tab !== "pending" ? (
                  <div><dt>Decided</dt><dd>{formatDate(v.reviewedAt)}{v.reviewedBy?.name ? ` by ${v.reviewedBy.name}` : ""}</dd></div>
                ) : null}
                {tab === "rejected" && v.note ? <div><dt>Reason</dt><dd>{v.note}</dd></div> : null}
              </dl>
              {tab === "pending" ? (
                <div className="cluster">
                  <button className="btn btn-line btn-sm" type="button" disabled={!v.hasDocument} onClick={() => openDocument(provider)}>
                    View ID
                  </button>
                  <button className="btn btn-sage btn-sm" type="button" onClick={() => setApproving(provider)}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => { setNote(""); setRejecting(provider); }}>
                    Reject
                  </button>
                </div>
              ) : null}
            </article>
          );
        })
      )}

      {viewing ? (
        <Modal title={`${viewing.provider.name} · ${ID_LABELS[viewing.provider.verification?.idType] || "ID"}`} wide onClose={() => setViewing(null)}>
          {viewing.loading ? (
            <Loading label="Opening ID" />
          ) : (
            <>
              <img src={viewing.url} alt={`ID document of ${viewing.provider.name}`} style={{ maxHeight: "65vh", objectFit: "contain", width: "100%" }} />
              <p className="help" style={{ marginTop: 8 }}>
                This private link stops working at {formatDate(viewing.expiresAt)}. Compare the name and photo with the profile.
              </p>
              <div className="cluster" style={{ marginTop: 12 }}>
                <button className="btn btn-sage" type="button" onClick={() => setApproving(viewing.provider)}>Approve</button>
                <button className="btn btn-danger" type="button" onClick={() => { setNote(""); setRejecting(viewing.provider); }}>Reject</button>
              </div>
            </>
          )}
        </Modal>
      ) : null}

      {approving ? (
        <ConfirmModal
          title={`Verify ${approving.name}?`}
          text="She gets the Verified badge, an email is sent to her, and the ID photo is deleted."
          confirmLabel="Approve"
          busy={busy}
          onCancel={() => setApproving(null)}
          onConfirm={() => decide(approving, "approve")}
        />
      ) : null}

      {rejecting ? (
        <Modal title={`Reject ${rejecting.name}'s ID?`} onClose={() => setRejecting(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (note.trim()) decide(rejecting, "reject", note.trim());
            }}
          >
            <label className="field">
              <span>Reason she will see</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
                placeholder="e.g. The photo is blurry. Please upload a clear photo with all four corners visible."
                autoFocus
              />
            </label>
            <div className="cluster" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-line" type="button" onClick={() => setRejecting(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-danger" type="submit" disabled={busy || !note.trim()}>
                {busy ? "Please wait…" : "Reject"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

export default AdminVerifications;
