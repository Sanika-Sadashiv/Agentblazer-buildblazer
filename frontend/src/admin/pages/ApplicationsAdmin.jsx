import React, { useEffect, useMemo, useState } from "react";
import { getApplications, evaluateApplication, resendApplicationEmail, deleteApplications } from "../adminApi.js";

const ROUND_LABEL = { aptitude: "Aptitude Round", interview: "Interview Round" };

const STATUS_LABEL = {
  aptitude_pending: "Aptitude round",
  interview_pending: "Interview round",
  selected: "Selected",
  rejected: "Rejected"
};

const TABS = [
  { id: "all", label: "All" },
  { id: "aptitude_pending", label: "Aptitude round" },
  { id: "interview_pending", label: "Interview round" },
  { id: "selected", label: "Selected" },
  { id: "rejected", label: "Rejected" }
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

// Cell for one recruitment round: action buttons, a result badge, or a locked hint.
function RoundCell({ app, round, busy, onDecide, onResend }) {
  const r = app[round] || { result: "pending" };

  if (r.result === "pending") {
    // Interview only opens once the applicant has cleared the aptitude round.
    const open = round === "aptitude" || (app.aptitude && app.aptitude.result === "selected");
    if (!open) {
      const out = app.status === "rejected";
      return <span className="adm-locked">{out ? "—" : "Locked until aptitude is cleared"}</span>;
    }
    return (
      <div className="adm-round">
        <span className="adm-badge aptitude_pending">Awaiting result</span>
        <div className="adm-round-actions">
          <button className="adm-decide select" disabled={busy} onClick={() => onDecide(app, round, "selected")}>Select</button>
          <button className="adm-decide reject" disabled={busy} onClick={() => onDecide(app, round, "rejected")}>Reject</button>
        </div>
      </div>
    );
  }

  const legacy = !r.decidedAt; // decided before the email workflow existed
  return (
    <div className="adm-round">
      <span className={`adm-badge ${r.result}`}>{r.result === "selected" ? "Selected" : "Rejected"}</span>
      {!legacy && (r.emailSent ? (
        <span className="adm-mail">✉ Emailed {fmtDate(r.decidedAt)}</span>
      ) : (
        <span className="adm-mail fail" title={r.emailError || "Email failed"}>
  ✉ Email not sent{r.emailError ? ` (${r.emailError.slice(0, 60)})` : ""}
  <button disabled={busy} onClick={() => onResend(app, round)}>Resend</button>
</span>
      ))}
    </div>
  );
}

export default function ApplicationsAdmin() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null); // { text, warn }
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState("all");
  const [pending, setPending] = useState(null); // { app, round, result } awaiting confirmation
  const [note, setNote] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getApplications()
      .then(setApplications)
      .catch((err) => setError(err.message || "Could not load applications"))
      .finally(() => setLoading(false));
  }, []);

  const replaceApp = (updated) =>
    setApplications((apps) => apps.map((a) => (a._id === updated._id ? updated : a)));

  const counts = useMemo(() => {
    const c = { all: applications.length, aptitude_pending: 0, interview_pending: 0, selected: 0, rejected: 0 };
    applications.forEach((a) => { if (c[a.status] !== undefined) c[a.status] += 1; });
    return c;
  }, [applications]);

  const visible = tab === "all" ? applications : applications.filter((a) => a.status === tab);

  const toggleSelectMode = () => {
    if (selectMode) {
      // Already in select mode: exit and clear whatever was picked.
      setSelectMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectMode(true);
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visible.length > 0 && visible.every((a) => selectedIds.has(a._id));
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach((a) => next.delete(a._id));
      } else {
        visible.forEach((a) => next.add(a._id));
      }
      return next;
    });
  };

  const runBulkDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const ids = Array.from(selectedIds);
      const data = await deleteApplications(ids);
      setApplications((apps) => apps.filter((a) => !selectedIds.has(a._id)));
      setNotice({ text: data.message, warn: false });
      setSelectedIds(new Set());
      setSelectMode(false);
      setConfirmBulkDelete(false);
    } catch (err) {
      setError(err.message || "Could not delete the selected applications");
      setConfirmBulkDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const openDecision = (app, round, result) => {
    setError("");
    setNote("");
    setPending({ app, round, result });
  };

  const confirmDecision = async () => {
    const { app, round, result } = pending;
    setBusyId(app._id);
    setError("");
    try {
      const data = await evaluateApplication(app._id, round, result, note);
      replaceApp(data.application);
      setNotice({ text: data.message, warn: !data.emailSent });
      setPending(null);
    } catch (err) {
      setError(err.message || "Could not save the result");
      setPending(null);
    } finally {
      setBusyId(null);
    }
  };

  const resend = async (app, round) => {
    setBusyId(app._id);
    setError("");
    try {
      const data = await resendApplicationEmail(app._id, round);
      replaceApp(data.application);
      setNotice({ text: data.message, warn: !data.emailSent });
    } catch (err) {
      setError(err.message || "Could not resend the email");
    } finally {
      setBusyId(null);
    }
  };

  const isSelect = pending && pending.result === "selected";
  const confirmHint = pending && (
    pending.round === "aptitude"
      ? (isSelect ? "They will move on to the Interview Round." : "They will be removed from the recruitment process.")
      : (isSelect ? "They will be marked as a selected club member." : "They will be removed from the recruitment process.")
  );

  return (
    <div className="adm-section">
      <div className="row-head">
        <h2>Recruitment — Membership Applications ({applications.length})</h2>
        {applications.length > 0 && (
          selectMode ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="adm-btn-sm" onClick={toggleSelectMode}>Cancel</button>
              <button
                className="adm-btn-sm danger"
                disabled={selectedIds.size === 0}
                onClick={() => setConfirmBulkDelete(true)}
              >
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </button>
            </div>
          ) : (
            <button className="adm-btn-sm" onClick={toggleSelectMode}>Select</button>
          )
        )}
      </div>

      {notice && (
        <div className={`adm-notice ${notice.warn ? "warn" : ""}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      )}
      {error && <div className="ab-form-msg error" style={{ marginBottom: 14 }}>{error}</div>}

      {loading ? <div className="adm-loading">Loading applications…</div> : applications.length === 0 ? (
        <div className="adm-empty">No membership applications yet.</div>
      ) : (
        <>
          <div className="adm-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`adm-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                {t.label} <span className="count">{counts[t.id]}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? <div className="adm-empty">No applicants in this stage.</div> : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                                <thead>
                  <tr>
                    {selectMode && (
                      <th style={{ width: 34 }}>
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAllVisible}
                          aria-label="Select all"
                        />
                      </th>
                    )}
                    <th>Name</th><th>USN</th><th>College Email</th><th>Phone</th><th>Year / Branch</th><th>Message</th>
                    <th>1 · Aptitude</th><th>2 · Interview</th><th>Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a) => (
                    <tr key={a._id}>
                      {selectMode && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(a._id)}
                            onChange={() => toggleOne(a._id)}
                            aria-label={`Select ${a.name}`}
                          />
                        </td>
                      )}
                      <td>{a.name}</td>
                      <td className="muted">{a.usn || "—"}</td>
                      <td className="muted">{a.email}</td>
                      <td className="muted">{a.phone || "—"}</td>
                      <td className="muted">{[a.year, a.branch].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="muted" style={{ maxWidth: 200 }}>{a.message || "—"}</td>
                      <td><RoundCell app={a} round="aptitude" busy={busyId === a._id} onDecide={openDecision} onResend={resend} /></td>
                      <td><RoundCell app={a} round="interview" busy={busyId === a._id} onDecide={openDecision} onResend={resend} /></td>
                      <td><span className={`adm-badge ${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {confirmBulkDelete && (
        <div className="ab-modal-overlay" onClick={() => deleting || setConfirmBulkDelete(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ab-modal-close" onClick={() => setConfirmBulkDelete(false)} disabled={deleting} aria-label="Close">×</button>
            <h2 style={{ fontFamily: "var(--disp)", fontSize: 20 }}>
              Delete {selectedIds.size} application{selectedIds.size === 1 ? "" : "s"}?
            </h2>
            <p className="ab-modal-sub">
              This permanently removes the selected application{selectedIds.size === 1 ? "" : "s"} and can't be undone. No email is sent.
            </p>
            <div className="adm-modal-actions">
              <button className="adm-btn-sm" onClick={() => setConfirmBulkDelete(false)} disabled={deleting}>Cancel</button>
              <button className="adm-btn-sm primary confirm-reject" onClick={runBulkDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="ab-modal-overlay" onClick={() => busyId || setPending(null)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ab-modal-close" onClick={() => setPending(null)} disabled={Boolean(busyId)} aria-label="Close">×</button>
            <h2 style={{ fontFamily: "var(--disp)", fontSize: 20 }}>
              {ROUND_LABEL[pending.round]}: {isSelect ? "Select" : "Reject"} {pending.app.name}?
            </h2>
            <p className="ab-modal-sub">
              {confirmHint} An email with the result will be sent to <strong>{pending.app.email}</strong> immediately, and this can't be undone.
            </p>
            <div className="ab-form">
              <div className="ab-field">
                <label htmlFor="eval-note">
                  {pending.round === "aptitude" && isSelect ? "Interview details (optional, included in the email)" : "Note to include in the email (optional)"}
                </label>
                <textarea
                  id="eval-note"
                  value={note}
                  maxLength={1000}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={pending.round === "aptitude" && isSelect ? "e.g. Interview on Mon 27 Sep, 10:00 AM, Room CS-204" : "e.g. Feedback or next steps"}
                />
              </div>
              <div className="adm-modal-actions">
                <button className="adm-btn-sm" onClick={() => setPending(null)} disabled={Boolean(busyId)}>Cancel</button>
                <button className={`adm-btn-sm primary ${isSelect ? "" : "confirm-reject"}`} onClick={confirmDecision} disabled={Boolean(busyId)}>
                  {busyId ? "Saving & emailing…" : `Confirm ${isSelect ? "selection" : "rejection"} & send email`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
