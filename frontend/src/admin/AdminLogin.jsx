import React, { useState } from "react";
import { adminLogin, setSession } from "./adminApi.js";
import AdminBackground from "./AdminBackground.jsx";
import AdminCursorTrail from "./AdminCursorTrail.jsx";
import logoImg from "../assets/logo.png";
import eyeBackgroundVideo from "../assets/eye-background.mp4";

export default function AdminLogin({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const data = await adminLogin(email, password);
      setSession(data.token, data.admin);
      onSuccess();
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      setStatus("error");
    }
  };

      return (
    <div className="adm-login-shell">
      <div className="glow-bg" />
      <video
        className="adm-login-video"
        src={eyeBackgroundVideo}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
      />
      <AdminBackground />
      <AdminCursorTrail />
      <div className="adm-login-card">
        <div className="logo"><img src={logoImg} alt="AgentBlazer" /></div>
        <h1>Admin Login</h1>
        <p className="sub">AgentBlazer Club &mdash; content management</p>
        <form className="ab-form" onSubmit={submit}>
          <div className="ab-field">
            <label htmlFor="al-email">Email</label>
            <input id="al-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)}  autoFocus />
          </div>
          <div className="ab-field">
            <label htmlFor="al-password">Password</label>
            <div className="adm-pw-wrap">
              <input id="al-password" required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}  />
              <button
                type="button"
                className="adm-pw-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {status === "error" && <div className="ab-form-msg error">{error}</div>}
          <button className="btn primary" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Signing In…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}