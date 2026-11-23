import { useCallback, useEffect, useState } from "react";
import api from "./api";
import { getError } from "./format";

// Loads the signed-in provider's settings and saves partial updates.
export function useProviderSettings() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/providers/settings")
      .then((response) => {
        if (!cancelled) setSettings(response.data.settings);
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Could not load your settings."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolves to { ok, message }.
  const save = useCallback(async (patch) => {
    setSaving(true);
    try {
      const response = await api.put("/providers/settings", patch);
      setSettings(response.data.settings);
      return { ok: true, message: response.data.message || "Saved" };
    } catch (err) {
      return { ok: false, message: getError(err, "Could not save.") };
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, error, saving, save };
}
