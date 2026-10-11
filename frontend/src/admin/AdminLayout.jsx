import React, { useState } from "react";
import { getAdminProfile, clearSession } from "./adminApi.js";
import AdminBackground from "./AdminBackground.jsx";
import AdminCursorTrail from "./AdminCursorTrail.jsx";
import logoImg from "../assets/logo.png";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "events", label: "Events" },
  { id: "team", label: "Team Members" },
  { id: "leadership", label: "Leadership" },
  { id: "applications", label: "Membership Applications" },
  { id: "settings", label: "Site Settings" }
];

export default function AdminLayout({ page, setPage, title, subtitle, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const admin = getAdminProfile();

  const go = (id) => { setPage(id); setMobileOpen(false); };
  const logout = () => { clearSession(); onLogout(); };

      return (
    <div className="adm-shell">
      <AdminBackground />
      <AdminCursorTrail />
      {mobileOpen && <div className="adm-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`adm-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="adm-brand">
          <div className="logo"><img src={logoImg} alt="AgentBlazer" /></div>
          <div><b>AgentBlazer</b><span>Admin Panel</span></div>
        </div>
        <nav className="adm-nav">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => go(item.id)}>
              <span className="ic">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button className="logout-btn" onClick={logout}>
            <span className="ic"></span>
            Logout
          </button>
        </nav>
      </aside>
      <main className="adm-main">
                <div className="adm-mobile-bar">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button>
          <img src={logoImg} alt="AgentBlazer" className="adm-mobile-logo" />
          <b style={{ fontFamily: "var(--disp)" }}>AgentBlazer Admin</b>
        </div>
        <div className="adm-topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {admin && <div className="who">Signed in as {admin.name || admin.email}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}