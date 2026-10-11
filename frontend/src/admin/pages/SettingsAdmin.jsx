import React, { useEffect, useState } from "react";
import { getAdminSettings, updateAdminSettings } from "../adminApi.js";

const THEME_OPTIONS = [
  { id: "violet", label: "🟣 Violet" },
  { id: "inferno", label: "🔥 Inferno" },
  { id: "frost", label: "❄️ Frost" }
];

export default function SettingsAdmin() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getAdminSettings()
      .then((data) => {
        if (!alive) return;
        setForm({
          
          academicYear: data.academicYear || "",
          defaultTheme: data.defaultTheme || "violet",
          contactEmail: data.contactEmail || "",
          address: data.address || "",
          stats: {
            workshops: data?.stats?.workshops || "",
            studentsReached: data?.stats?.studentsReached || "",
            partner: data?.stats?.partner || ""
          }
        });
      })
      .catch((err) => setError(err.message || "Could not load settings"))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const updateStat = (k) => (e) => setForm((f) => ({ ...f, stats: { ...f.stats, [k]: e.target.value } }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await updateAdminSettings(form);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setError(err.message || "Could not save settings");
      setStatus("error");
    }
  };

  if (loading) return <div className="adm-loading">Loading settings…</div>;
  if (!form) return <div className="ab-form-msg error">{error}</div>;

  return (
    <div className="adm-section">
      <h2>Site Settings</h2>
      <form className="ab-form" onSubmit={submit} style={{ maxWidth: 520 }}>
        <div className="ab-row">
  <div className="ab-field"><label>Academic Year</label><input value={form.academicYear} onChange={update("academicYear")} placeholder="2025-2026" /></div>
  <div className="ab-field"><label>Contact Email</label><input type="email" value={form.contactEmail} onChange={update("contactEmail")} placeholder="agentblazer@sjec.ac.in" /></div>
</div>
        <div className="ab-field"><label>Address</label><textarea rows={2} value={form.address} onChange={update("address")} placeholder="Department of CSE, St Joseph Engineering College..." /></div>
        <div className="ab-field">
          <label>Default Theme</label>
          <select className="adm-select" style={{ width: "100%", height: 44 }} value={form.defaultTheme} onChange={update("defaultTheme")}>
            {THEME_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="ab-row">
          <div className="ab-field"><label>Workshops Count</label><input value={form.stats.workshops} onChange={updateStat("workshops")} placeholder="e.g. 8+" /></div>
          <div className="ab-field"><label>Students Reached</label><input value={form.stats.studentsReached} onChange={updateStat("studentsReached")} placeholder="e.g. 500+" /></div>
        </div>
        <div className="ab-field"><label>Community Partner</label><input value={form.stats.partner} onChange={updateStat("partner")} placeholder="Salesforce" /></div>
        {status === "error" && <div className="ab-form-msg error">{error}</div>}
        {status === "saved" && <div className="ab-success" style={{ margin: 0, fontSize: 14 }}>Settings saved successfully.</div>}
        <button className="btn primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}