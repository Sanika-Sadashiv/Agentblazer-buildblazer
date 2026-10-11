const API_BASE = (
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`
).replace(/\/+$/, "");
// The admin session lives in memory only (never localStorage/sessionStorage),
// so every page load / refresh / new visit starts at the login page.
let sessionToken = null;
let sessionAdmin = null;

// Remove any session saved by older versions of this panel.
try {
  localStorage.removeItem("ab_admin_token");
  localStorage.removeItem("ab_admin_profile");
} catch (e) {}

export function getToken() { return sessionToken; }
export function setSession(token, admin) {
  sessionToken = token;
  sessionAdmin = admin || null;
}
export function getAdminProfile() { return sessionAdmin; }
export function clearSession() {
  sessionToken = null;
  sessionAdmin = null;
}
export function isLoggedIn() { return Boolean(getToken()); }

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  let data = null;
  try { data = await res.json(); } catch (e) {}

  if (res.status === 401) clearSession();
  if (!res.ok) {
    const base = (data && data.message) || `Request failed (${res.status})`;
    throw new Error(data && data.error ? `${base}: ${data.error}` : base);
  }
  return data;
}

export const adminLogin = (email, password) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const getAdminStats = () => request("/stats/admin");

export const getAdminEvents = () => request("/events");
export const createEvent = (payload) => request("/events", { method: "POST", body: JSON.stringify(payload) });
export const updateEvent = (id, payload) => request(`/events/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteEvent = (id) => request(`/events/${id}`, { method: "DELETE" });

export const getAdminTeam = () => request("/team");
export const createTeamMember = (payload) => request("/team", { method: "POST", body: JSON.stringify(payload) });
export const updateTeamMember = (id, payload) => request(`/team/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteTeamMember = (id) => request(`/team/${id}`, { method: "DELETE" });
export const getAdminLeadership = () => request("/leadership");
export const createLeadershipMember = (payload) => request("/leadership", { method: "POST", body: JSON.stringify(payload) });
export const updateLeadershipMember = (id, payload) => request(`/leadership/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteLeadershipMember = (id) => request(`/leadership/${id}`, { method: "DELETE" });

export const getApplications = () => request("/members");
// Record the result of a recruitment round ("aptitude" | "interview") as
// "selected" | "rejected". The backend emails the applicant automatically.
export const evaluateApplication = (id, round, result, note) =>
  request(`/members/${id}/evaluate`, { method: "PUT", body: JSON.stringify({ round, result, note }) });
export const resendApplicationEmail = (id, round) =>
  request(`/members/${id}/resend-email`, { method: "POST", body: JSON.stringify({ round }) });
export const deleteApplications = (ids) =>
  request(`/members/bulk-delete`, { method: "POST", body: JSON.stringify({ ids }) });

export const getAdminSettings = () => request("/settings");
export const updateAdminSettings = (payload) => request("/settings", { method: "PUT", body: JSON.stringify(payload) });