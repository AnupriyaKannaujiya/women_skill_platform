import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Empty, Loading, Modal } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { getError, unwrapUser } from "../../lib/format";

const MAX_FILES = 10;
const MAX_SIZE = 5 * 1024 * 1024;

function Portfolio() {
  usePageTitle("Portfolio");
  const toast = useToast();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(null);
  const [shot, setShot] = useState("");
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState([]);

  const load = () =>
    api.get("/auth/profile").then((response) => {
      setImages(unwrapUser(response.data)?.portfolio || []);
    });

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((error) => {
        if (!cancelled) toast(getError(error), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Each picked photo keeps a preview URL from the moment it is chosen. URLs are freed
  // when a photo is removed, after upload, and when the page closes (via the ref).
  const previewsRef = useRef([]);
  const setPicked = (next) => {
    previewsRef.current = next;
    setPreviews(next);
  };
  useEffect(() => () => previewsRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    const valid = incoming.filter((file) => file.type.startsWith("image/") && file.size <= MAX_SIZE);
    if (valid.length < incoming.length) {
      toast(`${incoming.length - valid.length} file(s) skipped: images only, up to 5 MB each.`, "error");
    }
    const next = [...previews, ...valid.map((file) => ({ file, url: URL.createObjectURL(file) }))];
    if (next.length > MAX_FILES) {
      toast(`Only the first ${MAX_FILES} photos were kept.`, "error");
      next.slice(MAX_FILES).forEach((item) => URL.revokeObjectURL(item.url));
    }
    setPicked(next.slice(0, MAX_FILES));
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index].url);
    setPicked(previews.filter((_, i) => i !== index));
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!previews.length) {
      toast("Choose at least one image.", "error");
      return;
    }
    const body = new FormData();
    previews.forEach((item) => body.append("portfolio", item.file));
    setUploading(true);
    try {
      const response = await api.post("/auth/upload-portfolio", body);
      toast(response.data.message || "Portfolio updated.", "ok");
      previews.forEach((item) => URL.revokeObjectURL(item.url));
      setPicked([]);
      await load();
    } catch (error) {
      toast(getError(error), "error");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    try {
      const response = await api.delete(`/auth/portfolio/${pending}`);
      toast(response.data.message || "Image removed.", "ok");
      setPending(null);
      await load();
    } catch (error) {
      toast(getError(error), "error");
    }
  };

  if (loading) return <Loading label="Loading portfolio" />;

  return (
    <div>
      <p className="eyebrow">Portfolio</p>
      <h1 className="section-title" style={{ margin: "8px 0 8px" }}>Photos of your work</h1>
      <p className="muted">Customers see these on your public profile. Up to 10 images in one upload.</p>

      <form className="card" style={{ marginTop: 16 }} onSubmit={upload}>
        <label
          className={dragging ? "dropzone over" : "dropzone"}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <strong>Drop photos here, or click to choose</strong>
          <span className="help">JPG, PNG or WebP · up to 5 MB each · {MAX_FILES} at a time</span>
        </label>
        {previews.length ? (
          <div className="preview-grid">
            {previews.map((item, index) => (
              <figure key={item.url}>
                <img src={item.url} alt={item.file.name} />
                <button
                  type="button"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => removeFile(index)}
                >
                  ×
                </button>
              </figure>
            ))}
          </div>
        ) : null}
        <button className="btn btn-primary" type="submit" disabled={uploading || !previews.length} style={{ marginTop: 12 }}>
          {uploading
            ? "Uploading…"
            : previews.length
              ? `Upload ${previews.length} photo${previews.length === 1 ? "" : "s"}`
              : "Upload"}
        </button>
      </form>

      <div style={{ marginTop: 18 }}>
        {images.length === 0 ? (
          <Empty title="No photos yet" text="Add a few clear pictures of finished work." />
        ) : (
          <div className="portfolio-grid">
            {images.map((image) => (
              <div className="shot" key={image._id} style={{ position: "relative" }}>
                <button type="button" onClick={() => setShot(image.url)} style={{ width: "100%", height: "100%", padding: 0, border: 0, background: "transparent" }}>
                  <img src={image.url} alt="Portfolio work" />
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  type="button"
                  style={{ position: "absolute", right: 8, bottom: 8 }}
                  onClick={() => setPending(image._id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pending ? (
        <Modal title="Delete this photo?" onClose={() => setPending(null)}>
          <p>It will disappear from your public profile.</p>
          <div className="cluster" style={{ marginTop: 14 }}>
            <button className="btn btn-danger" type="button" onClick={remove}>Delete</button>
            <button className="btn btn-line" type="button" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </Modal>
      ) : null}
      {shot ? (
        <Modal title="Photo" wide onClose={() => setShot("")}>
          <img src={shot} alt="" />
        </Modal>
      ) : null}
    </div>
  );
}

export default Portfolio;
