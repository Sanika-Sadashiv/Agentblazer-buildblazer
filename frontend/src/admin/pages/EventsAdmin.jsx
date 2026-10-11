import React, { useEffect, useRef, useState } from "react";
import { getAdminEvents, createEvent, updateEvent, deleteEvent } from "../adminApi.js";

const EMPTY_FORM = { date: "", title: "", category: "", description: "", speaker: "", venue: "", track: "", shortlistedStudents: "", galleryCount: "", image: "", gallery: [] };

// Max longest-edge size + quality photos get compressed to before upload.
// Keeps each photo small (~100-300KB) so many photos can be stored per event
// without blowing past the request/document size limits.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

// Reads a File and returns a compressed base64 JPEG data URL, resized so its
// longest edge is at most MAX_DIMENSION. Runs entirely in the browser.
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function PhotoUploader({ photos, setPhotos }) {
  const inputRef = useRef(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setWorking(true);
    setError("");
    try {
      const compressed = await Promise.all(files.map(compressImageFile));
      setPhotos((prev) => [...prev, ...compressed]);
    } catch (err) {
      setError("Could not process one or more photos. Try a different image.");
    } finally {
      setWorking(false);
    }
  };

  const removeAt = (idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="ab-field">
      <label>Event Photos</label>
      <div className="ph-uploader">
        {photos.map((src, idx) => (
          <div className="ph-thumb" key={idx}>
            <img src={src} alt={`Event photo ${idx + 1}`} />
            <button type="button" className="ph-thumb-remove" title="Remove photo" onClick={() => removeAt(idx)}>×</button>
          </div>
        ))}
        <button type="button" className="ph-add-btn" onClick={() => inputRef.current && inputRef.current.click()} disabled={working}>
          {working ? "Adding…" : "+ Add Photos"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
        Upload any number of photos from your device. They'll appear in the event's gallery on the site — a placeholder is shown automatically for any slot without a photo.
      </span>
      {error && <div className="ab-form-msg error">{error}</div>}
    </div>
  );
}

function EventFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(initial ? { ...EMPTY_FORM, ...initial, gallery: Array.isArray(initial.gallery) ? initial.gallery : [] } : EMPTY_FORM);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPhotos = (updater) => setForm((f) => ({ ...f, gallery: typeof updater === "function" ? updater(f.gallery) : updater }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const payload = {
        ...form,
        shortlistedStudents: form.shortlistedStudents ? Number(form.shortlistedStudents) : undefined,
        galleryCount: form.gallery.length || (form.galleryCount ? Number(form.galleryCount) : undefined),
        // Keep the cover image in sync with the first uploaded photo so any
        // older code path that still reads `image` continues to work.
        image: form.gallery[0] || form.image || ""
      };
      if (isEdit) await updateEvent(initial._id, payload);
      else await createEvent(payload);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save event.");
      setStatus("error");
    }
  };

  return (
    <div className="ab-modal-overlay" onClick={onClose}>
      <div className="ab-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="ab-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3>{isEdit ? "Edit Event" : "Add Event"}</h3>
        <form className="ab-form" onSubmit={submit}>
          <div className="ab-row">
            <div className="ab-field"><label>Date *</label><input required value={form.date} onChange={update("date")} placeholder="e.g. February 14, 2026" /></div>
            <div className="ab-field"><label>Category</label><input value={form.category} onChange={update("category")} placeholder="e.g. Flagship Masterclass" /></div>
          </div>
          <div className="ab-field"><label>Title *</label><input required value={form.title} onChange={update("title")} placeholder="Event title" /></div>
          <div className="ab-field"><label>Description</label><textarea rows={3} value={form.description} onChange={update("description")} placeholder="What is this event about?" /></div>
          <div className="ab-row">
            <div className="ab-field"><label>Speaker</label><input value={form.speaker} onChange={update("speaker")} placeholder="Optional" /></div>
            <div className="ab-field"><label>Venue</label><input value={form.venue} onChange={update("venue")} placeholder="e.g. CSE Auditorium" /></div>
          </div>
          <div className="ab-row">
            <div className="ab-field"><label>Track</label><input value={form.track} onChange={update("track")} placeholder="Optional" /></div>
            <div className="ab-field"><label>Shortlisted Students</label><input type="number" min="0" value={form.shortlistedStudents} onChange={update("shortlistedStudents")} placeholder="Optional" /></div>
          </div>
          <PhotoUploader photos={form.gallery} setPhotos={setPhotos} />
          {status === "error" && <div className="ab-form-msg error">{error}</div>}
          <button className="btn primary" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Saving…" : isEdit ? "Save Changes" : "Add Event"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteEventModal({ title, busy, onCancel, onConfirm }) {
  return (
    <div className="ab-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="ab-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="ab-modal-close" onClick={onCancel} disabled={busy} aria-label="Close">×</button>
        <h3>Delete event?</h3>
        <p className="ab-modal-sub">
          "<strong>{title}</strong>" will be permanently deleted. This can't be undone.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button type="button" className="btn primary" style={{ flex: 1 }} disabled={busy} onClick={onConfirm}>
            {busy ? "Deleting…" : "Delete"}
          </button>
          <button type="button" className="btn" style={{ flex: 1 }} disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventsAdmin() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // { id, title }

  const load = () => {
    setLoading(true);
    getAdminEvents().then(setEvents).catch((err) => setError(err.message || "Could not load events")).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSaved = () => { setModal(null); load(); };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await deleteEvent(id); load(); }
    catch (err) { setError(err.message || "Could not delete event"); }
    finally { setDeleting(null); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await handleDelete(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="adm-section">
      <div className="row-head">
        <h2>All Events ({events.length})</h2>
        <button className="adm-btn-sm primary" onClick={() => setModal("new")}>+ Add Event</button>
      </div>
      {error && <div className="ab-form-msg error" style={{ marginBottom: 14 }}>{error}</div>}
      {loading ? <div className="adm-loading">Loading events…</div> : events.length === 0 ? (
        <div className="adm-empty">No events yet. Click "Add Event" to create one.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Title</th><th>Date</th><th>Category</th><th>Venue</th><th></th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e._id}>
                  <td>{e.title}</td><td className="muted">{e.date}</td><td className="muted">{e.category}</td><td className="muted">{e.venue}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="adm-icon-btn" title="Edit" onClick={() => setModal(e)}>✎</button>
                    <button className="adm-icon-btn danger" title="Delete" disabled={deleting === e._id}
                      onClick={() => setPendingDelete({ id: e._id, title: e.title })}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && <EventFormModal initial={modal === "new" ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />}
      {pendingDelete && (
        <ConfirmDeleteEventModal
          title={pendingDelete.title}
          busy={deleting === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}