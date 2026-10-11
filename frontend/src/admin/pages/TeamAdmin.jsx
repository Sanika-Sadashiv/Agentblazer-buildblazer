import React, { useEffect, useRef, useState } from "react";
import { getAdminTeam, createTeamMember, updateTeamMember, deleteTeamMember } from "../adminApi.js";
import { PHOTOS, CORE_TEAM_PHOTO_KEYS } from "../../data.js";
const EMPTY_CORE_FORM = { name: "", role: "", category: "", department: "", description: "", image: "", order: "", section: "core" };
const EMPTY_COMMITTEE_FORM = { name: "", role: "", order: "", section: "committee" };

function staticPhotoFor(name) {
  const key = CORE_TEAM_PHOTO_KEYS[(name || "").trim().toLowerCase()];
  return key ? PHOTOS[key] : "";
}
// ---------- single-photo upload (from the device's own gallery/files) ----------
// The photo never leaves the browser as a raw file — it's downscaled on a
// <canvas> and turned into a base64 data URL, which is exactly what the
// `image` field already stores (same approach the event gallery uploader uses).
const MAX_IMAGE_DIMENSION = 480; // longest side, in px, after resizing
const IMAGE_QUALITY = 0.85; // JPEG quality
const MAX_ORIGINAL_FILE_MB = 8; // reject anything absurdly large before we even try to read it

function readAndResizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file (JPG, PNG, WEBP…)."));
      return;
    }
    if (file.size > MAX_ORIGINAL_FILE_MB * 1024 * 1024) {
      reject(new Error(`That photo is too large. Please choose one under ${MAX_ORIGINAL_FILE_MB}MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_IMAGE_DIMENSION) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else if (height > MAX_IMAGE_DIMENSION) {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Reusable "upload one photo from your device" field with a live preview
// and a placeholder shown whenever there's no photo yet.
function ImageUploadField({ value, onChange, name, fallbackSrc, compact }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = () => inputRef.current && inputRef.current.click();
    const displaySrc = value || fallbackSrc;

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // reset so choosing the same file again still fires onChange
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const dataUrl = await readAndResizeImage(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err.message || "Could not use that photo.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    onChange("");
    setError("");
  };

  return (
    <div className={compact ? "ab-image-upload row" : "ab-image-upload"}>
      <div
        className="ab-image-preview"
        onClick={pick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
        aria-label={value ? "Change photo" : "Upload photo"}
      >
                {displaySrc ? (
          <img src={displaySrc} alt={name || "Preview"} />
        ) : (
          <div className="ab-image-placeholder">
            <span className="ab-image-placeholder-icon" aria-hidden="true">🖼️</span>
            <span>No photo</span>
          </div>
        )}
      </div>
      <div className="ab-image-actions">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <button type="button" className="adm-btn-sm" onClick={pick} disabled={busy}>
          {busy ? "Processing…" : value ? "Change Photo" : fallbackSrc ? "Replace Photo" : "Upload Photo"}
        </button>
        {value && (
          <button type="button" className="adm-btn-sm danger" onClick={remove} disabled={busy}>
            Remove
          </button>
        )}
      </div>
      {error && <div className="ab-form-msg error">{error}</div>}
      <small className="ab-image-hint">Choose one photo from your device. It's resized automatically.</small>
    </div>
  );
}

function CoreMemberFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(initial ? { ...EMPTY_CORE_FORM, ...initial } : EMPTY_CORE_FORM);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const payload = { ...form, section: "core", order: form.order ? Number(form.order) : undefined };
      if (isEdit) await updateTeamMember(initial._id, payload);
      else await createTeamMember(payload);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save team member.");
      setStatus("error");
    }
  };

  return (
    <div className="ab-modal-overlay" onClick={onClose}>
      <div className="ab-modal wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="ab-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3>{isEdit ? "Edit Team Member" : "Add Team Member"}</h3>
        <form className="ab-form" onSubmit={submit}>
          <div className="ab-row">
            <div className="ab-field"><label>Name *</label><input required value={form.name} onChange={update("name")} placeholder="Full name" /></div>
            <div className="ab-field"><label>Role *</label><input required value={form.role} onChange={update("role")} placeholder="e.g. Tech Lead" /></div>
          </div>
          <div className="ab-row">
            <div className="ab-field"><label>Category</label><input value={form.category} onChange={update("category")} placeholder="e.g. Tech Lead" /></div>
            <div className="ab-field"><label>Department / Focus Area</label><input value={form.department} onChange={update("department")} placeholder="e.g. Technical Direction" /></div>
          </div>
          <div className="ab-field"><label>Description</label><textarea rows={2} value={form.description} onChange={update("description")} placeholder="What do they do for the club?" /></div>
          <div className="ab-row">
            <div className="ab-field">
              <label>Photo</label>
              <ImageUploadField compact value={form.image} name={form.name} onChange={(dataUrl) => setForm((f) => ({ ...f, image: dataUrl }))} />
            </div>
          </div>
          {status === "error" && <div className="ab-form-msg error">{error}</div>}
          <button className="btn primary" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Saving…" : isEdit ? "Save Changes" : "Add Member"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CommitteeFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(initial ? { ...EMPTY_COMMITTEE_FORM, ...initial } : EMPTY_COMMITTEE_FORM);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const payload = { name: form.name, role: form.role, section: "committee", order: form.order ? Number(form.order) : undefined };
      if (isEdit) await updateTeamMember(initial._id, payload);
      else await createTeamMember(payload);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save committee member.");
      setStatus("error");
    }
  };

  return (
    <div className="ab-modal-overlay" onClick={onClose}>
      <div className="ab-modal wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="ab-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3>{isEdit ? "Edit Committee Member" : "Add Committee Member"}</h3>
        <form className="ab-form" onSubmit={submit}>
          <div className="ab-row">
            <div className="ab-field"><label>Name *</label><input required value={form.name} onChange={update("name")} placeholder="Full name" /></div>
            <div className="ab-field"><label>Role *</label><input required value={form.role} onChange={update("role")} placeholder="e.g. Project Operations & Labs" /></div>
          </div>
          {status === "error" && <div className="ab-form-msg error">{error}</div>}
          <button className="btn primary" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Saving…" : isEdit ? "Save Changes" : "Add Member"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ name, busy, onCancel, onConfirm }) {
  return (
    <div className="ab-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="ab-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="ab-modal-close" onClick={onCancel} disabled={busy} aria-label="Close">×</button>
        <h3>Remove member?</h3>
        <p className="ab-modal-sub">
          "<strong>{name}</strong>" will be removed and no longer shown on the About page. This can't be undone.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button type="button" className="btn primary" style={{ flex: 1 }} disabled={busy} onClick={onConfirm}>
            {busy ? "Removing…" : "Remove"}
          </button>
          <button type="button" className="btn" style={{ flex: 1 }} disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamAdmin() {
  const [coreTeam, setCoreTeam] = useState([]);
  const [committee, setCommittee] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coreModal, setCoreModal] = useState(null);
  const [committeeModal, setCommitteeModal] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // { id, name, what }
  const [deleting, setDeleting] = useState(false);

    const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(String(b.name));

  const load = () => {
    setLoading(true);
    getAdminTeam()
      .then((data) => {
        setCoreTeam(data.filter((m) => m.section !== "committee").sort(byOrder));
        setCommittee(data.filter((m) => m.section === "committee").sort(byOrder));
      })
      .catch((err) => setError(err.message || "Could not load team members"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTeamMember(pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err.message || `Could not remove ${pendingDelete.what}`);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="adm-section">
      {error && <div className="ab-form-msg error" style={{ marginBottom: 14 }}>{error}</div>}

      {/* ---------- Student Core Team ---------- */}
      <div className="row-head">
        <h2>Student Core Team ({coreTeam.length})</h2>
        <button className="adm-btn-sm primary" onClick={() => setCoreModal("new")}>+ Add Member</button>
      </div>
      {loading ? <div className="adm-loading">Loading…</div> : coreTeam.length === 0 ? (
        <div className="adm-empty">No team members yet. Click "Add Member" to create one.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
                        <thead><tr><th>Name</th><th>Role</th><th>Department</th><th></th></tr></thead>
            <tbody>
              {coreTeam.map((m) => (
                <tr key={m._id}>
                  <td>{m.name}</td><td className="muted">{m.role}</td><td className="muted">{m.department}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="adm-icon-btn" title="Edit" onClick={() => setCoreModal(m)}>✎</button>
                    <button className="adm-icon-btn danger" title="Remove"
                      onClick={() => setPendingDelete({ id: m._id, name: m.name, what: "member" })}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Core Working Committee ---------- */}
      <div className="row-head" style={{ marginTop: 32 }}>
        <h2>Core Working Committee ({committee.length})</h2>
        <button className="adm-btn-sm primary" onClick={() => setCommitteeModal("new")}>+ Add Member</button>
      </div>
      {loading ? <div className="adm-loading">Loading…</div> : committee.length === 0 ? (
        <div className="adm-empty">No committee members yet. Click "Add Member" to create one.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
                        <thead><tr><th>Name</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {committee.map((m) => (
                <tr key={m._id}>
                  <td>{m.name}</td><td className="muted">{m.role}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="adm-icon-btn" title="Edit" onClick={() => setCommitteeModal(m)}>✎</button>
                    <button className="adm-icon-btn danger" title="Remove"
                      onClick={() => setPendingDelete({ id: m._id, name: m.name, what: "committee member" })}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {coreModal && (
        <CoreMemberFormModal
          initial={coreModal === "new" ? null : coreModal}
          onClose={() => setCoreModal(null)}
          onSaved={() => { setCoreModal(null); load(); }}
        />
      )}
      {committeeModal && (
        <CommitteeFormModal
          initial={committeeModal === "new" ? null : committeeModal}
          onClose={() => setCommitteeModal(null)}
          onSaved={() => { setCommitteeModal(null); load(); }}
        />
      )}
      {pendingDelete && (
        <ConfirmDeleteModal
          name={pendingDelete.name}
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}