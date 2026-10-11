import React, { useState, useEffect, useCallback } from "react";
import { isLoggedIn } from "./adminApi.js";
import AdminLogin from "./AdminLogin.jsx";
import AdminLayout from "./AdminLayout.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import EventsAdmin from "./pages/EventsAdmin.jsx";
import TeamAdmin from "./pages/TeamAdmin.jsx";
import LeadershipAdmin from "./pages/LeadershipAdmin.jsx";
import ApplicationsAdmin from "./pages/ApplicationsAdmin.jsx";
import SettingsAdmin from "./pages/SettingsAdmin.jsx";
import "./adminStyles.css";

const PAGE_META = {
  dashboard: { title: "Dashboard", subtitle: "Overview of club activity" },
  events: { title: "Events", subtitle: "Manage workshops, contests and sessions" },
    team: { title: "Team Members", subtitle: "Manage who appears on the About page" },
  leadership: { title: "Leadership", subtitle: "Manage Honored Guests and the Faculty Advisory Council" },
  applications: { title: "Membership Applications", subtitle: "Run the aptitude and interview rounds and notify applicants" },
  settings: { title: "Site Settings", subtitle: "Club info, theme and homepage stats" }
};

function pathToPage(pathname) {
  const parts = pathname.replace(/\/+$/, "").split("/");
  const sub = parts[3];
  return PAGE_META[sub] ? sub : "dashboard";
}

export default function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [page, setPageState] = useState(() =>
    window.location.pathname.startsWith("/admin/dashboard") ? pathToPage(window.location.pathname) : "dashboard"
  );

  const setPage = useCallback((id) => {
    setPageState(id);
    const url = `/admin/dashboard/${id}`;
    if (window.location.pathname !== url) window.history.pushState({}, "", url);
  }, []);

  useEffect(() => {
    const onPop = () => {
      setLoggedIn(isLoggedIn());
      setPageState(pathToPage(window.location.pathname));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (loggedIn) {
      if (!path.startsWith("/admin/dashboard")) {
        window.history.replaceState({}, "", "/admin/dashboard");
        setPageState("dashboard");
      }
    } else if (path !== "/admin/login") {
      window.history.replaceState({}, "", "/admin/login");
    }
  }, [loggedIn]);

  const handleLoginSuccess = () => {
    setLoggedIn(true);
    setPageState("dashboard");
    window.history.replaceState({}, "", "/admin/dashboard");
  };

  const handleLogout = () => {
    setLoggedIn(false);
    window.history.replaceState({}, "", "/admin/login");
  };

  if (!loggedIn) return <AdminLogin onSuccess={handleLoginSuccess} />;

  const meta = PAGE_META[page] || PAGE_META.dashboard;

  return (
    <AdminLayout page={page} setPage={setPage} title={meta.title} subtitle={meta.subtitle} onLogout={handleLogout}>
      {page === "dashboard" && <DashboardHome />}
      {page === "events" && <EventsAdmin />}
            {page === "team" && <TeamAdmin />}
      {page === "leadership" && <LeadershipAdmin />}
      {page === "applications" && <ApplicationsAdmin />}
      {page === "settings" && <SettingsAdmin />}
    </AdminLayout>
  );
}