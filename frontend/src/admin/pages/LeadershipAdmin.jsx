import React, { useEffect, useRef, useState } from "react";
import { getAdminLeadership, createLeadershipMember, updateLeadershipMember, deleteLeadershipMember } from "../adminApi.js";

const EMPTY_GUEST_FORM = { name: "", org: "", label: "", highlight: "", highlightColor: "c-gold", accentColor: "c-cy", order: "", kind: "guest" };
const EMPTY_FACULTY_FORM = { name: "", role: "", bio: "", photo: "", order: "", kind: "faculty" };

// ---------- single-photo upload (from the device's own gallery/files) ----------
// Matches the pattern used for event photos and team member photos: downscale
// on a <canvas> and store as a base64 data URL in the `photo` field.
const MAX_IMAGE_DIMENSION = 480;
const IMAGE_QUALITY = 0.85;
const MAX_ORIGINAL_FILE_MB = 8;

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
function ImageUploadField({ value, onChange, name, compact }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = () => inputRef.current && inputRef.current.click();

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
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
        {value ? (
          <img src={value} alt={name || "Preview"} />
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
          {busy ? "Processing…" : value ? "Change Photo" : "Upload Photo"}
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

function GuestFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(initial ? { ...EMPTY_GUEST_FORM, ...initial } : EMPTY_GUEST_FORM);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const payload = { ...form, kind: "guest", order: form.order ? Number(form.order) : undefined };
      if (isEdit) await updateLeadershipMember(initial._id, payload);
      else await createLeadershipMember(payload);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save guest.");
      setStatus("error");
    }
  };

  return (
    <div className="ab-modal-overlay" onClick={onClose}>
      <div className="ab-modal wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="ab-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3>{isEdit ? "Edit Guest" : "Add Guest"}</h3>
        <form className="ab-form" onSubmit={submit}>
          <div className="ab-row">
            <div className="ab-field"><label>Name *</label><input required value={form.name} onChange={update("name")} placeholder="e.g. Mr. Santosh Rebello" /></div>
            <div className="ab-field"><label>Organization *</label><input required value={form.org} onChange={update("org")} placeholder="e.g. Salesforce" /></div>
          </div>
          <div className="ab-row">
            <div className="ab-field"><label>Left Tag *</label><input required value={form.label} onChange={update("label")} placeholder="e.g. Guest of Honor" /></div>
            <div className="ab-field"><label>Right Tag *</label><input required value={form.highlight} onChange={update("highlight")} placeholder="e.g. Keynote Speaker" /></div>
          </div>
          <div className="ab-row">
            <div className="ab-field">
              <label>Right Tag Color</label>
              <select value={form.highlightColor} onChange={update("highlightColor")}>
                <option value="c-gold">Gold</option>
                <option value="c-cy">Cyan</option>
                <option value="c-pu">Purple</option>
              </select>
            </div>
            <div className="ab-field">
              <label>Avatar Accent</label>
              <select value={form.accentColor} onChange={update("accentColor")}>
                <option value="c-cy">Cyan</option>
                <option value="p">Purple</option>
              </select>
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

function FacultyFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(initial ? { ...EMPTY_FACULTY_FORM, ...initial } : EMPTY_FACULTY_FORM);
  const [preview, setPreview] = useState(initial?.photo || "");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 1.5 * 1024 * 1024) { setError("Please choose an image under 1.5MB."); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, photo: reader.result }));
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const payload = { ...form, kind: "faculty", order: form.order ? Number(form.order) : undefined };
      if (isEdit) await updateLeadershipMember(initial._id, payload);
      else await createLeadershipMember(payload);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save faculty member.");
      setStatus("error");
    }
  };

  return (
    <div className="ab-modal-overlay" onClick={onClose}>
      <div className="ab-modal wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="ab-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3>{isEdit ? "Edit Faculty Member" : "Add Faculty Member"}</h3>
        <form className="ab-form" onSubmit={submit}>
          <div className="ab-row">
            <div className="ab-field"><label>Name *</label><input required value={form.name} onChange={update("name")} placeholder="e.g. Ms. Nisha Roche" /></div>
            <div className="ab-field"><label>Role *</label><input required value={form.role} onChange={update("role")} placeholder="e.g. Assistant Professor, CSE • Faculty Coordinator" /></div>
          </div>
          <div className="ab-field"><label>Short Bio (shown on hover)</label><input value={form.bio} onChange={update("bio")} placeholder="Optional, e.g. Faculty Coordinator • AgentBlazer Club" /></div>
          <div className="ab-row">
            <div className="ab-field">
              <label>Photo</label>
              <ImageUploadField compact value={form.photo} name={form.name} onChange={(dataUrl) => setForm((f) => ({ ...f, photo: dataUrl }))} />
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

export default function LeadershipAdmin() {
  const [guests, setGuests] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guestModal, setGuestModal] = useState(null);
  const [facultyModal, setFacultyModal] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    getAdminLeadership()
      .then((data) => {
        setGuests(data.filter((m) => m.kind === "guest"));
        setFaculty(data.filter((m) => m.kind === "faculty"));
      })
      .catch((err) => setError(err.message || "Could not load leadership"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteLeadershipMember(pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err.message || "Could not remove member");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="adm-section">
      {error && <div className="ab-form-msg error" style={{ marginBottom: 14 }}>{error}</div>}

      {/* ---------- Honored Guests & College Leadership ---------- */}
      <div className="row-head">
        <h2>Honored Guests &amp; College Leadership ({guests.length})</h2>
        <button className="adm-btn-sm primary" onClick={() => setGuestModal("new")}>+ Add Member</button>
      </div>
      {loading ? <div className="adm-loading">Loading…</div> : guests.length === 0 ? (
        <div className="adm-empty">No guests yet. Click "Add Member" to create one.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Organization</th><th>Tags</th><th>Order</th><th></th></tr></thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g._id}>
                  <td>{g.name}</td>
                  <td className="muted">{g.org}</td>
                  <td className="muted">{g.label} / {g.highlight}</td>
                  <td className="muted">{g.order}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="adm-icon-btn" title="Edit" onClick={() => setGuestModal(g)}>✎</button>
                    <button className="adm-icon-btn danger" title="Remove"
                      onClick={() => setPendingDelete({ id: g._id, name: g.name })}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Faculty Advisory Council ---------- */}
      <div className="row-head" style={{ marginTop: 32 }}>
        <h2>Faculty Advisory Council ({faculty.length})</h2>
        <button className="adm-btn-sm primary" onClick={() => setFacultyModal("new")}>+ Add Member</button>
      </div>
      {loading ? <div className="adm-loading">Loading…</div> : faculty.length === 0 ? (
        <div className="adm-empty">No faculty members yet. Click "Add Member" to create one.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Photo</th><th>Name</th><th>Role</th><th>Order</th><th></th></tr></thead>
            <tbody>
              {faculty.map((f) => (
                <tr key={f._id}>
                  <td>
                    {f.photo ? (
                      <img src={f.photo} alt={f.name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{f.name}</td>
                  <td className="muted">{f.role}</td>
                  <td className="muted">{f.order}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="adm-icon-btn" title="Edit" onClick={() => setFacultyModal(f)}>✎</button>
                    <button className="adm-icon-btn danger" title="Remove"
                      onClick={() => setPendingDelete({ id: f._id, name: f.name })}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {guestModal && (
        <GuestFormModal
          initial={guestModal === "new" ? null : guestModal}
          onClose={() => setGuestModal(null)}
          onSaved={() => { setGuestModal(null); load(); }}
        />
      )}
      {facultyModal && (
        <FacultyFormModal
          initial={facultyModal === "new" ? null : facultyModal}
          onClose={() => setFacultyModal(null)}
          onSaved={() => { setFacultyModal(null); load(); }}
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