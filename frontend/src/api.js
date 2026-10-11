// Centralized API client for talking to the AgentBlazer backend.
// Base URL comes from the VITE_API_URL env var (see .env), falling back
// to the local backend dev server so `npm run dev` works out of the box.

const API_BASE = (
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`
).replace(/\/+$/, "");
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
  } catch (networkError) {
    throw new Error(`Cannot reach the server (${API_BASE}). Check VITE_API_URL and CORS settings.`);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Some responses (e.g. plain 204s) may not have a JSON body.
  }

  if (!res.ok) {
    const base = (data && data.message) || `Request failed (${res.status})`;
    throw new Error(data && data.error ? `${base}: ${data.error}` : base);
  }

  return data;
}

/* ---------- public read endpoints ---------- */
export const getEvents = () => request("/events");
export const getTeam = () => request("/team");
export const getSettings = () => request("/settings", { cache: "no-store" });
export const getLeadership = () => request("/leadership", { cache: "no-store" });
export const getThemes = () => request("/settings/themes");
export const getStats = () => request("/stats");

/* ---------- public write endpoints (forms) ---------- */
export const submitMembership = (payload) =>
  request("/members", { method: "POST", body: JSON.stringify(payload) });

export const requestMembershipOtp = (email) =>
  request("/members/request-otp", { method: "POST", body: JSON.stringify({ email }) });

export const verifyMembershipOtp = (email, otp) =>
  request("/members/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });

export const submitContact = (payload) =>
  request("/contact", { method: "POST", body: JSON.stringify(payload) });

export const requestContactOtp = (email) =>
  request("/contact/request-otp", { method: "POST", body: JSON.stringify({ email }) });

export const verifyContactOtp = (email, otp) =>
  request("/contact/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });