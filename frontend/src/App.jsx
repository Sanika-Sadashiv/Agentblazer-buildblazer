import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import introVideo from "./assets/agentanimation.mp4";
import eyeBackgroundVideo from "./assets/eye-background.mp4";
import { PHOTOS, GUESTS, FACULTY, COMMITTEE, FALLBACK_EVENTS, FALLBACK_TEAM, NAV, CORE_TEAM_PHOTO_KEYS } from "./data.js";
import {
  getEvents,
  getTeam,
  getSettings,
  getLeadership,
  submitMembership,
  submitContact,
  requestMembershipOtp,
  verifyMembershipOtp,
  requestContactOtp,
  verifyContactOtp
} from "./api.js";

/* ---------- site settings (managed from Admin → Site Settings) ---------- */
const THEMES = ["violet", "inferno", "frost"];

const DEFAULT_SETTINGS = {
  clubName: "AgentBlazer Club",
  academicYear: "2025–2026",
  defaultTheme: "violet",
  contactEmail: "agentblazer@sjec.ac.in",
  address: "Department of Computer Science & Engineering, St Joseph Engineering College, Mangaluru, Karnataka – 575028, India",
  stats: { workshops: "8+", studentsReached: "500+", partner: "Salesforce" }
};

function mergeSettings(data) {
  const d = data || {};
  const pick = (v, fb) => (typeof v === "string" && v.trim() ? v.trim() : fb);
  const s = d.stats || {};
  return {
    clubName: DEFAULT_SETTINGS.clubName,
    academicYear: pick(d.academicYear, DEFAULT_SETTINGS.academicYear),
    defaultTheme: THEMES.includes(d.defaultTheme) ? d.defaultTheme : DEFAULT_SETTINGS.defaultTheme,
    contactEmail: pick(d.contactEmail, DEFAULT_SETTINGS.contactEmail),
    address: pick(d.address, DEFAULT_SETTINGS.address),
    stats: {
      workshops: pick(s.workshops, DEFAULT_SETTINGS.stats.workshops),
      studentsReached: pick(s.studentsReached, DEFAULT_SETTINGS.stats.studentsReached),
      partner: pick(s.partner, DEFAULT_SETTINGS.stats.partner)
    }
  };
}

/* ---------- map backend data shapes to the shapes this UI expects ---------- */
const EVENT_TAG_COLORS = ["c1", "c2", "c3", "c4"];
function teamPhotoFor(name) {
  return CORE_TEAM_PHOTO_KEYS[(name || "").trim().toLowerCase()];
}


function initialsFor(name) {
  return (name || "Team Member")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function findFallbackGallery(title) {
  const norm = (s) => (s || "").trim().toLowerCase();
  const match = FALLBACK_EVENTS.find((fe) => fe.gal && norm(fe.title) === norm(title));
  return match ? match.gal : undefined;
}

function mapBackendEvent(e, idx) {
  const gal =
    Array.isArray(e.gallery) && e.gallery.length > 0
      ? {
          head: e.speaker ? `SPEAKER: ${e.speaker.toUpperCase()}` : (e.category || "GALLERY").toUpperCase(),
          title: e.title,
          sub: e.speaker || e.venue || "",
          date: e.date,
          hue: (200 + idx * 45) % 360,
          n: e.gallery.length,
          start: 0,
          real: Object.fromEntries(e.gallery.map((url, i) => [i, url]))
        }
      : findFallbackGallery(e.title);

  return {
    id: e._id,
    date: e.date,
    tag: e.category || "Event",
    tc: EVENT_TAG_COLORS[idx % EVENT_TAG_COLORS.length],
    title: e.title,
    desc: e.description,
    fl: gal ? "Tap to view gallery" : e.venue || e.track || "Event Details",    fr: e.shortlistedStudents
      ? `${e.shortlistedStudents} Shortlisted Students`
      : e.galleryCount
      ? `${e.galleryCount} Photos`
      : gal
      ? `${gal.n} Photos`
      : e.venue || "",
    gal
  };
}

function mapBackendMember(m) {
  return {
    id: m._id,
        photo: teamPhotoFor(m.name),
    image: m.image || "",
    ini: initialsFor(m.name),
    hue: 210,
    tag: m.department || m.category || "Team Member",
    name: m.name,
    badge: m.role,
    bc: "",
    desc: m.description || ""
  };
}

function mapBackendCommittee(m) {
  return {
    ini: initialsFor(m.name),
    name: m.name,
    role: m.role
  };
}

function mapBackendGuest(g) {
  return {
    ini: initialsFor(g.name),
    name: g.name,
    org: g.org,
    l: g.label,
    r: g.highlight,
    rc: g.highlightColor || "c-gold",
    ac: g.accentColor || "c-cy"
  };
}

function mapBackendFaculty(f) {
  return {
    ini: initialsFor(f.name),
    photo: f.photo || "",
    hue: 260,
    name: f.name,
    role: f.role,
    pop: f.bio && f.bio.trim() ? f.bio : `${f.role} • AgentBlazer Club`
  };
}

// A "photo" value is either a known static image key (from data.js fallbacks)
// or an actual usable image (a base64 data URL from the admin upload). Try the
// static lookup first, and fall back to using the value directly.
function resolvePhoto(photo) {
  if (!photo) return undefined;
  return PHOTOS[photo] || photo;
}
/* ---------- placeholder image helpers ---------- */
const avatar = (ini, hue, w = 290, h = 360) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,32%)"/><stop offset="1" stop-color="hsl(${hue + 50},50%,14%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w / 2}" cy="${h * 0.4}" r="${h * 0.14}" fill="rgba(255,255,255,.22)"/><ellipse cx="${w / 2}" cy="${h * 0.85}" rx="${w * 0.3}" ry="${h * 0.24}" fill="rgba(255,255,255,.22)"/><text x="50%" y="${h * 0.42}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${h * 0.12}" font-weight="700" fill="#fff">${ini}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};
const scene = (n, hue) => {
  const w = 400, h = 288;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,36%)"/><stop offset="1" stop-color="hsl(${hue + 60},55%,16%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect x="90" y="50" width="220" height="90" rx="6" fill="rgba(255,255,255,.18)"/><g fill="rgba(0,0,0,.35)">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${50 + i * 75}" cy="${200 + (i % 2) * 14}" r="20"/>`).join("")}</g><text x="50%" y="30" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="14" opacity=".8">Photo ${n}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};

/* ---------- small pieces ---------- */
const Logo = ({ className = "" }) => <span className={`lg ${className}`} />;

const ThemeIcon = ({ t }) =>
  t === "violet" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
  ) : t === "inferno" ? (
    <svg viewBox="0 0 24 24" fill="#f97316"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-6 1 2 2 2 3 0 0-2 0-4 0-6z" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="#4aa3ff" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M3.5 7l17 10M3.5 17l17-10" /></svg>
  );

function CountUp({ to }) {
  const raw = String(to ?? "").trim();
  const m = raw.match(/^(\D*)(\d[\d,]*)(.*)$/);
  const target = m ? parseInt(m[2].replace(/,/g, ""), 10) : 0;
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!m) return;
    let raf;
    const t0 = performance.now(), d = 1400;
    const f = (t) => {
      const p = Math.min(1, (t - t0) / d);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  if (!m) return <>{raw}</>;
  return <>{m[1]}{v}{m[3]}</>;
}

/* ---------- canvases ---------- */
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function NetworkBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, cx = cv.getContext("2d");
    let W, H, pts = [], raf;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = Array.from({ length: Math.round((W * H) / 22000) }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, r: Math.random() * 1.6 + 0.6,
      }));
    };
    size();
    window.addEventListener("resize", size);
    const still = reduceMotion();
    const loop = () => {
      cx.clearRect(0, 0, W, H);
      const dot = cssVar("--dot"), line = cssVar("--line");
      pts.forEach((p) => {
        if (!still) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
        }
        cx.fillStyle = dot; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
      });
      cx.strokeStyle = line; cx.lineWidth = 0.6;
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          if (dx * dx + dy * dy < 16900) {
            cx.globalAlpha = 1 - Math.hypot(dx, dy) / 130;
            cx.beginPath(); cx.moveTo(pts[i].x, pts[i].y); cx.lineTo(pts[j].x, pts[j].y); cx.stroke();
          }
        }
      cx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); };
  }, []);
  return <canvas id="bg" ref={ref} />;
}

function CursorTrail() {
  const ref = useRef(null);
  useEffect(() => {
    if (reduceMotion() || !window.matchMedia("(pointer:fine)").matches) return;
    document.documentElement.classList.add("custom-cursor");
    const tc = ref.current, tx = tc.getContext("2d");
    let mx = -99, my = -99, parts = [], raf;
    const rs = () => { tc.width = window.innerWidth; tc.height = window.innerHeight; };
    rs();
    const move = (e) => {
      mx = e.clientX; my = e.clientY;
      for (let i = 0; i < 2; i++) parts.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8 + 0.2, life: 1, r: Math.random() * 2 + 1 });
    };
    window.addEventListener("resize", rs);
    window.addEventListener("mousemove", move);
    const tick = () => {
      tx.clearRect(0, 0, tc.width, tc.height);
      const a1 = cssVar("--accent"), a2 = cssVar("--accent2");
      parts = parts.filter((p) => p.life > 0);
      parts.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        tx.globalAlpha = Math.max(0, p.life);
        tx.fillStyle = i % 2 ? a2 : a1;
        tx.beginPath(); tx.arc(p.x, p.y, p.r * p.life + 0.3, 0, 7); tx.fill();
      });
      tx.globalAlpha = 1;
      const g = tx.createRadialGradient(mx, my, 0, mx, my, 16);
      g.addColorStop(0, cssVar("--cursor-core")); g.addColorStop(0.3, cssVar("--cursor-glow")); g.addColorStop(1, cssVar("--cursor-fade"));
      tx.fillStyle = g; tx.beginPath(); tx.arc(mx, my, 16, 0, 7); tx.fill();
      tx.fillStyle = cssVar("--cursor-core"); tx.beginPath(); tx.arc(mx, my, 3.5, 0, 7); tx.fill();
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rs); window.removeEventListener("mousemove", move); document.documentElement.classList.remove("custom-cursor"); };
  }, []);
  return <canvas id="trail" ref={ref} />;
}

/* ---------- intro splash: looping animation video, tap anywhere to enter ---------- */
function IntroSplash({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(true);
  const videoRef = useRef(null);
  const tapped = useRef(false);

  // Autoplay needs the video muted; some browsers still block it, so retry quietly.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }, []);

  const enter = useCallback(() => {
    if (tapped.current) return;
    tapped.current = true;
    setLeaving(true);
    setTimeout(() => { setVisible(false); onDone(); }, 520);
  }, [onDone]);

  // Enter/Space also work, for keyboard users.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter]);

  if (!visible) return null;

  return (
    <div
      className={`intro intro-video ${leaving ? "out" : ""}`}
      onClick={enter}
      role="button"
      tabIndex={0}
      aria-label="Tap anywhere to enter the AgentBlazer Club site"
    >
            <video
        ref={videoRef}
        className="intro-video-el"
        src={introVideo}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
      />
      <div className="tap-continue" aria-hidden="true">
        <span>Tap to Continue</span>
      </div>
    </div>
  );
}

/* ---------- hover popover (person photo / event gallery) ---------- */
function GalleryBody({ g }) {
  const [i, setI] = useState(g.start);
  useEffect(() => {
    setI(g.start);
    const t = setInterval(() => setI((k) => (k + 1) % g.n), 1800);
    return () => clearInterval(t);
  }, [g]);
  return (
    <>
      <div className="hd"><span>{g.head}</span><span>{i + 1} / {g.n}</span></div>
      <div className="ph"><img alt={g.title} src={(g.real && g.real[i]) || scene(i + 1, g.hue + i * 18)} /></div>
      <div className="bars">{Array.from({ length: g.n }, (_, k) => <i key={k} className={k === i ? "on" : ""} />)}</div>
      <div className="row"><span>{g.title}</span><span>{g.date}</span></div>
      <div className="sub">{g.sub}</div>
    </>
  );
}

function Popover({ hover, onClose }) {
  const ref = useRef(null);
  const last = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  if (hover) last.current = hover;
  const h = hover || last.current;

  useLayoutEffect(() => {
    if (!hover || !ref.current) return;
    const el = ref.current, r = hover.rect, pw = el.offsetWidth, ph = el.offsetHeight;
    const gap = hover.kind === "gal" ? 24 : 20;
    const vw = window.innerWidth;

    const fitsRight = r.right + gap + pw <= vw - 12;
    const fitsLeft = r.left - gap - pw >= 12;

    let x;
    if (fitsRight) {
      x = r.right + gap;
    } else if (fitsLeft) {
      x = r.left - pw - gap;
    } else {
      // Neither side fully fits (narrow viewport / middle column) —
      // still place it to whichever side has more room, just clamped
      // inside the viewport, instead of centering it over the card.
      const roomRight = vw - r.right;
      const roomLeft = r.left;
      x = roomRight >= roomLeft
        ? Math.min(vw - pw - 12, r.right + gap)
        : Math.max(12, r.left - pw - gap);
    }

    let y = r.top + r.height / 2 - ph / 2;
    y = Math.max(8, Math.min(window.innerHeight - ph - 8, y));
    setPos({ x, y });
  }, [hover]);

    const isGal = h && h.kind === "gal";

  return (
    <>
      {isGal && (
        <div
          className={`pop-backdrop ${hover ? "show" : ""}`}
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <div ref={ref} className={`pop ${h ? (h.kind === "person" ? "person" : "gal") : "person"} ${hover ? "show" : ""}`} style={{ left: pos.x, top: pos.y }}>
        {isGal && (
          <button type="button" className="pop-close" aria-label="Close gallery" onClick={onClose}>
            &times;
          </button>
        )}
        {h && h.kind === "person" && (
          <>
            <div className="ph">
                        <img
    alt={h.data.name}
    src={h.data.image || resolvePhoto(h.data.photo) || avatar(h.data.ini, h.data.hue)}
    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatar(h.data.ini, h.data.hue); }}
  />
              <span className="tag">LEADERSHIP</span><span className="sj">SJEC CSE</span>
            </div>
            <h6>{h.data.name}</h6><div className="sub">{h.data.pop}</div>
          </>
        )}
        {h && h.kind === "gal" && <GalleryBody g={h.data} />}
      </div>
    </>
  );
}
/* ---------- mobile-only swipeable team carousel (press & hold to reveal photo) ---------- */
function TeamCarousel({ team }) {
  const [idx, setIdx] = useState(0);
  const [pressed, setPressed] = useState(false);
  const touch = useRef({ x: 0, y: 0, moved: false, timer: null });

  if (!team || team.length === 0) return null;
  const safeIdx = idx % team.length;
  const m = team[safeIdx];

  const go = (dir) => setIdx((i) => (i + dir + team.length) % team.length);
  const clearTimer = () => { clearTimeout(touch.current.timer); touch.current.timer = null; };

  const startPress = (x, y) => {
    touch.current.x = x; touch.current.y = y; touch.current.moved = false;
    clearTimer();
    touch.current.timer = setTimeout(() => setPressed(true), 280);
  };
  const movePress = (x, y) => {
    if (Math.abs(x - touch.current.x) > 10 || Math.abs(y - touch.current.y) > 10) {
      touch.current.moved = true;
      clearTimer();
    }
  };
  const endPress = (x) => {
    clearTimer();
    const dx = x - touch.current.x;
    setPressed(false);
    if (!touch.current.moved) return;
    if (dx < -40) go(1);
    else if (dx > 40) go(-1);
  };

  const photoSrc = m.image || resolvePhoto(m.photo) || avatar(m.ini, m.hue);

  return (
    <div className="team-carousel">
      <p className="tc-hint">Swipe left or right to meet the team &middot; press &amp; hold to see their photo</p>
      <div
        className={`tc-card ${pressed ? "revealed" : ""}`}
        onTouchStart={(e) => startPress(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => movePress(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={(e) => endPress(e.changedTouches[0].clientX)}
        onMouseDown={(e) => startPress(e.clientX, e.clientY)}
        onMouseUp={(e) => endPress(e.clientX)}
        onMouseLeave={() => { clearTimer(); setPressed(false); }}
      >
        <span className="tc-index">#{String(safeIdx + 1).padStart(2, "0")}</span>
        <div className="tc-photo">
          <img
            src={photoSrc}
            alt={m.name}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatar(m.ini, m.hue); }}
          />
        </div>
        <div className="tc-info">
          <span className="role" style={m.tagGold ? { color: "var(--gold)" } : undefined}>{m.tag}</span>
          <h4>{m.name}</h4>
          <span className={`badge ${m.bc}`}>{m.badge}</span>
          <p>{m.desc}</p>
        </div>
        <span className="tc-tap">Hold to view photo</span>
      </div>
      <div className="tc-dots">
        {team.map((_, i) => <i key={i} className={i === safeIdx ? "on" : ""} />)}
      </div>
      <div className="tc-nav">
        <button type="button" onClick={() => go(-1)} aria-label="Previous member">‹</button>
        <span className="tc-count">{safeIdx + 1} / {team.length}</span>
        <button type="button" onClick={() => go(1)} aria-label="Next member">›</button>
      </div>
    </div>
  );
}
/* ---------- header / footer ---------- */
function Header({ page, go, theme, setTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const handleNavClick = (id) => { go(id); setMenuOpen(false); };
  return (
    <header>
      <div className="wrap">
        <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); go("home"); setMenuOpen(false); }}>
          <div className="logo-box"><Logo /></div>
          <div>
            <div className="brand-name">Agent<b>Blazer</b><i>collective</i></div>
            <div className="brand-sub">Department of Computer Science &amp; Engineering</div>
          </div>
        </a>
        <button
          type="button"
          className={`nav-burger ${menuOpen ? "open" : ""}`}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span></span><span></span><span></span>
        </button>
        <nav className="tabs">
          {NAV.map((n) => (
            <button key={n.id} className={page === n.id ? "active" : ""} onClick={() => go(n.id)}>
              {n.id === "home" && <span className="dot" />}{n.label}
            </button>
          ))}
        </nav>
        <div className="themes">
          {THEMES.map((t) => (
            <button key={t} className={theme === t ? "active" : ""} data-t={t} onClick={() => setTheme(t)}>
              <ThemeIcon t={t} />{t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <nav className={`nav-mobile ${menuOpen ? "open" : ""}`}>
        {NAV.map((n) => (
          <button key={n.id} className={page === n.id ? "active" : ""} onClick={() => handleNavClick(n.id)}>
            {n.id === "home" && <span className="dot" />}{n.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function Footer({ go, settings }) {
  return (
    <footer>
      <div className="wrap">
        <div className="fgrid3">
          <div>
            <div className="fbrand"><div className="logo-box"><Logo /></div>{settings.clubName}</div>
            <p className="d">Department of Computer Science &amp; Engineering</p>
            <p className="s">St Joseph Engineering College, Vamanjoor, Mangaluru. A student-led collective for autonomous and agentic AI.</p>
          </div>
          <div className="ql">
            <h6>Quick Links</h6>
            <a onClick={() => go("about")}>About &amp; Charter</a>
            <a onClick={() => go("events")}>Workshops &amp; Contests</a>
            <a href="https://trailhead.salesforce.com" target="_blank" rel="noopener noreferrer">Salesforce Trailhead Community</a>
          </div>
          <div>
            <h6>Affiliations</h6>
            <div className="aff"><span>SJEC CSE</span><span>Agentforce</span><span>Trailblazer</span></div>
            <p>Empowered by faculty guidance and student initiative.</p>
          </div>
        </div>
        <div className="copy">© 2026 {settings.clubName} · Dept. of CSE, SJEC</div>
      </div>
    </footer>
  );
}

/* ---------- pages ---------- */
function Home({ go, settings }) {
  const stats = settings.stats;

  return (
    <section className="page active" id="home">
      <div className="glow-bg" />
      <div className="wrap">
        <div className="hero">
          <div>
            <span className="chip dot">Collegiate AI Initiative • St Joseph Engineering College</span>
            <h1>Pioneering Autonomous <span className="ital">&amp; Agentic AI Systems</span></h1>
            <div className="meta"><i>Department of Computer Science &amp; Engineering</i><span className="sep" /><span>St Joseph Engineering College, Mangaluru</span></div>
            <p className="lead">A dedicated student-led laboratory shaping tomorrow's software engineers through autonomous agent architectures, open-source AI tooling, collaborative workshops, and premier Salesforce Trailblazer community synergy.</p>
            <div className="actions">
              <a className="btn primary" href="#events" onClick={(e) => { e.preventDefault(); go("events"); }}>
                Explore Workshops &amp; Events
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
              <a className="btn" href="#about" onClick={(e) => { e.preventDefault(); go("about"); }}>
                Read Club Charter
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6" /></svg>
              </a>
            </div>
            <div className="stats">
              <div><div className="n"><CountUp to={stats.workshops} /></div><div className="l">Workshops &amp; Challenges</div></div>
              <div><div className="n"><CountUp to={stats.studentsReached} /></div><div className="l">Engineering Students Reached</div></div>
              <div><div className="sf">{stats.partner}</div><span className="tag">Community Partner</span><div className="l">Active Trailblazer Mentorship</div></div>
            </div>
          </div>
          <div className="hero-art">
            <span className="lg hex" />
            <div className="wm">AgentBlazer</div>
            <div className="cl">CLUB</div>
            <svg className="cube" viewBox="0 0 80 80" fill="none" stroke="#f0658a" strokeWidth="1"><path d="M10 20 60 8l14 44-50 16zM10 20l14 48M60 8 38 40M74 52 38 40M24 68l14-28M10 20l28 20" /></svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function About({ hover, setHover, settings }) {
  /* mobile-only: press & hold a faculty box to reveal their photo (desktop hover is untouched) */
  const [facultyPressed, setFacultyPressed] = useState(null);
  const facultyTouch = useRef({ x: 0, y: 0, moved: false, timer: null });
  const clearFacultyTimer = () => { clearTimeout(facultyTouch.current.timer); facultyTouch.current.timer = null; };
  const startFacultyPress = (id, x, y) => {
    facultyTouch.current.x = x; facultyTouch.current.y = y; facultyTouch.current.moved = false;
    clearFacultyTimer();
    facultyTouch.current.timer = setTimeout(() => setFacultyPressed(id), 280);
  };
  const moveFacultyPress = (x, y) => {
    if (Math.abs(x - facultyTouch.current.x) > 10 || Math.abs(y - facultyTouch.current.y) > 10) {
      facultyTouch.current.moved = true;
      clearFacultyTimer();
    }
  };
  const endFacultyPress = () => {
    clearFacultyTimer();
    setFacultyPressed(null);
  };
  const [team, setTeam] = useState(FALLBACK_TEAM);
  const [committee, setCommittee] = useState(COMMITTEE);
  const [guests, setGuests] = useState(GUESTS);
  const [faculty, setFaculty] = useState(FACULTY);

  useEffect(() => {
    let alive = true;
    getTeam()
      .then((data) => {
        if (!alive) return;
        if (!Array.isArray(data) || data.length === 0) return;
        // Always sort by `order` (then name as a tiebreaker) on the client
        // too. The API is expected to already return members sorted this
        // way, but relying on that alone means a stale server, a proxy, or
        // a future change to the query can silently ship an unsorted list
        // straight to the About page. Sorting here guarantees the on-screen
        // order always matches each member's `order` value in the admin
        // panel, no matter what order the API responds in.
        const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(String(b.name));
        const core = data.filter((m) => m.section !== "committee").sort(byOrder).map(mapBackendMember);
        const comm = data.filter((m) => m.section === "committee").sort(byOrder).map(mapBackendCommittee);
        if (core.length > 0) setTeam(core);
        if (comm.length > 0) setCommittee(comm);
      })
      .catch((err) => {
        console.warn("Could not load team from backend, showing fallback data:", err.message);
      });

    getLeadership()
      .then((data) => {
        if (!alive) return;
        if (!Array.isArray(data) || data.length === 0) return;
        const g = data.filter((m) => m.kind === "guest").map(mapBackendGuest);
        const f = data.filter((m) => m.kind === "faculty").map(mapBackendFaculty);
        if (g.length > 0) setGuests(g);
        if (f.length > 0) setFaculty(f);
      })
      .catch((err) => {
        console.warn("Could not load leadership from backend, showing fallback data:", err.message);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="page active" id="about">
      <div className="glow-bg" />
      <div className="wrap">
        <span className="chip dot up">Foundations &amp; Leadership</span>
        <div className="pg-head" style={{ marginTop: 22 }}>
          <h2>Inauguration &amp; <span className="ital">Mentorship Council</span></h2>
          <p>Fostering technical curiosity, genuine mentorship, and bridging classroom theory with autonomous AI engineering practices.</p>
        </div>

        <div className="launch">
          <div>
            <span className="chip">Official Launch &amp; Keynote</span>
            <h3>AgentBlazer Club Launch &amp; <span className="ital">Agentforce Symposium</span></h3>
            <p>The Department of Computer Science &amp; Engineering founded the AgentBlazer Club to build an authentic student collective centered on autonomous intelligence, open agent frameworks, and industry partnership.</p>
          </div>
          <div className="inaug">
            <small>Inaugurated on</small>
            <div className="d">August 25, 2025</div>
            <div className="chips"><span>Academic Year {settings.academicYear}</span><span>SJEC Campus</span></div>
          </div>
        </div>

        <h3 className="sec-title">Honored Guests <span className="ital">&amp; College Leadership</span></h3>
        <div className="guests">
                    {guests.map((g) => (
            <div
              className={`g ${hover && hover.id === g.ini ? "hl" : ""}`}
              key={g.ini}
              onMouseEnter={() => setHover({ id: g.ini, kind: "plain" })}
              onMouseLeave={() => setHover(null)}
            >
              <div className="top">
                <div className={`av ${g.ac}`}>{g.ini}</div>
                <div><h4>{g.name}</h4><small>{g.org}</small></div>
              </div>
              <div className="foot"><b>{g.l}</b><b className={g.rc}>{g.r}</b></div>
            </div>
          ))}
        </div>

                <div className="faculty">
          <h4>Faculty Advisory Council</h4>
          <div className="fgrid">
                        {faculty.map((f) => (
              <div
                className={`f ${hover && hover.id === f.ini ? "hl" : ""} ${facultyPressed === f.ini ? "revealed" : ""}`}
                key={f.ini}
                onMouseEnter={(e) => setHover({ id: f.ini, kind: "person", data: f, rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => setHover(null)}
                onTouchStart={(e) => startFacultyPress(f.ini, e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => moveFacultyPress(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={endFacultyPress}
                onTouchCancel={endFacultyPress}
              >
                 <div className={`av ${f.photo ? "has-photo" : "c-cy"}`}>
                  {f.photo ? <img src={resolvePhoto(f.photo)} alt={f.name} /> : f.ini}
                </div>
                <div><h5>{f.name}</h5><small>{f.role}</small></div>
                <span className="f-hint">Hold to view photo</span>
                <div className="f-reveal">
                  <img
                    src={f.photo ? resolvePhoto(f.photo) : avatar(f.ini, f.hue)}
                    alt={f.name}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = avatar(f.ini, f.hue); }}
                  />
                  <span className="f-reveal-name">{f.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <h3 className="sec-title">Student Core Team <span className="ital">&amp; Officers</span><span className="right">Academic Year {settings.academicYear}</span></h3>
        <div className="team">
          {team.map((m) => (
            <div
              key={m.id}
              className={`m ${hover && hover.id === m.id ? "hl" : ""}`}
              onMouseEnter={(e) => setHover({ id: m.id, kind: "person", data: m, rect: e.currentTarget.getBoundingClientRect() })}
              onMouseLeave={() => setHover(null)}
            >
              <span className="role" style={m.tagGold ? { color: "var(--gold)" } : undefined}>{m.tag}</span>
              <h4>{m.name}</h4>
              <span className={`badge ${m.bc}`}>{m.badge}</span>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
                  <TeamCarousel team={team} />
        <div className="cwc">
          <div className="hd"><b>Core Working Committee</b><span>Departmental Representatives</span></div>
          <div className="cgrid">
                        {committee.map((c) => (
              <div className="f" key={c.ini}>
                <div className="av">{c.ini}</div>
                <div><h5>{c.name}</h5><small>{c.role}</small></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Events({ hover, setHover, settings }) {
  const [events, setEvents] = useState(FALLBACK_EVENTS);

  useEffect(() => {
    let alive = true;
    getEvents()
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data) && data.length > 0) setEvents(data.map(mapBackendEvent));
      })
      .catch((err) => {
        console.warn("Could not load events from backend, showing fallback data:", err.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="page active" id="events">
      <div className="glow-bg" />
      <div className="wrap">
        <div className="ev-head">
          <span className="chip up" style={{ color: "#b9a9ff" }}>Workshops &amp; Live Sessions • Academic Year {settings.academicYear}</span>
          <h2>Workshops, Contests <span className="ital">&amp; Masterclasses</span></h2>
          <p>Hands-on technical deep dives, algorithmic challenges, and real-world system deployments with seasoned engineers.</p>
        </div>
        <div className="evgrid">
          {events.map((e) => (
                        <article
              key={e.id}
              className={`ev ${e.gal ? "has-gal" : ""} ${hover && hover.id === e.id ? "hl" : ""}`}
              onMouseEnter={(ev) => setHover({ id: e.id, kind: e.gal ? "gal" : "plain", data: e.gal, rect: ev.currentTarget.getBoundingClientRect() })}
              onMouseLeave={() => setHover(null)}
              onClick={(ev) => {
                if (!e.gal) return;
                setHover({ id: e.id, kind: "gal", data: e.gal, rect: ev.currentTarget.getBoundingClientRect() });
              }}
            >
              <div className="top"><span>{e.date}</span><span className={e.tc}>{e.tag}</span></div>
              <h3>{e.title}</h3>
              {e.tracks && <div className="tracks">{e.tracks.map((t) => <span key={t}>{t}</span>)}</div>}
              {e.sess && <p className="sess">{e.sess}</p>}
              <p>{e.desc}</p>
              <div className="fi"><div><span>{e.fl}</span><b>{e.fr}</b></div></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- join / contact form modals ---------- */
function FormModal({ title, subtitle, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="ab-modal-overlay" onClick={onClose} role="presentation">
      <div className={`ab-modal${wide ? " wide" : ""}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="ab-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3>{title}</h3>
        {subtitle && <p className="ab-modal-sub">{subtitle}</p>}
        {children}
      </div>
    </div>,
    document.body
  );
}

function MembershipForm({ onClose }) {
  const [stage, setStage] = useState("email"); // email | otp | details | done
  const [form, setForm] = useState({ name: "", email: "", usn: "", phone: "", year: "", branch: "", message: "" });
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const isCollegeEmail = (email) => /@sjec\.ac\.in$/i.test(email.trim());

  const sendCode = async (e) => {
    e.preventDefault();
    if (!isCollegeEmail(form.email)) {
      setError("Please use your official college email ending in @sjec.ac.in");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      await requestMembershipOtp(form.email);
      setStatus("idle");
      setStage("otp");
    } catch (err) {
      setError(err.message || "Could not send verification code. Please try again.");
      setStatus("error");
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await verifyMembershipOtp(form.email, otp);
      setStatus("idle");
      setStage("details");
    } catch (err) {
      setError(err.message || "Incorrect or expired code. Please try again.");
      setStatus("error");
    }
  };

  const submitDetails = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await submitMembership(form);
      setStage("done");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (stage === "done") {
    return (
      <FormModal title="Application Received" onClose={onClose}>
        <p className="ab-success">
          Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}! Your membership request has been submitted. We&apos;ll reach out via email soon.
        </p>
        <button type="button" className="btn primary" onClick={onClose}>
          Close
        </button>
      </FormModal>
    );
  }

  if (stage === "email") {
    return (
      <FormModal title="Become a Member" subtitle="Enter your official SJEC college email to get started." onClose={onClose}>
        <form className="ab-form" onSubmit={sendCode}>
          <div className="ab-field">
            <label htmlFor="mf-email">College Email *</label>
            <input
              id="mf-email"
              required
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="yourname@sjec.ac.in"
            />
          </div>
          {status === "error" && <div className="ab-form-msg error">{error}</div>}
          <button className="btn primary" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending Code…" : "Send Verification Code"}
          </button>
        </form>
      </FormModal>
    );
  }

  if (stage === "otp") {
    return (
      <FormModal title="Verify Your Email" subtitle={`We sent a 6-digit code to ${form.email}.`} onClose={onClose}>
        <form className="ab-form" onSubmit={verifyCode}>
          <div className="ab-field">
            <label htmlFor="mf-otp">Verification Code *</label>
            <input
              id="mf-otp"
              required
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
            />
          </div>
          {status === "error" && <div className="ab-form-msg error">{error}</div>}
          <button className="btn primary" type="submit" disabled={status === "sending" || otp.length !== 6}>
            {status === "sending" ? "Verifying…" : "Verify Code"}
          </button>
          <button
            type="button"
            className="ab-link-btn"
            onClick={() => {
              setStage("email");
              setOtp("");
              setError("");
              setStatus("idle");
            }}
          >
            Use a different email
          </button>
        </form>
      </FormModal>
    );
  }

  // stage === "details"
  return (
    <FormModal title="Become a Member" subtitle="Almost done — tell us a bit more about yourself." onClose={onClose} wide>
      <form className="ab-form" onSubmit={submitDetails}>
        <div className="ab-row">
          <div className="ab-field">
            <label htmlFor="mf-name">Full Name *</label>
            <input id="mf-name" required value={form.name} onChange={update("name")} placeholder="Your full name" />
          </div>
          <div className="ab-field">
            <label htmlFor="mf-usn">USN *</label>
            <input id="mf-usn" required value={form.usn} onChange={update("usn")} placeholder="e.g. 4SJ22CS001" />
          </div>
        </div>
        <div className="ab-row">
          <div className="ab-field">
            <label>College Email</label>
            <input value={form.email} disabled />
          </div>
          <div className="ab-field">
            <label htmlFor="mf-phone">Phone</label>
            <input id="mf-phone" value={form.phone} onChange={update("phone")} placeholder="Optional" />
          </div>
        </div>
        <div className="ab-row">
          <div className="ab-field">
            <label htmlFor="mf-year">Year</label>
            <input id="mf-year" value={form.year} onChange={update("year")} placeholder="e.g. 2nd Year" />
          </div>
          <div className="ab-field">
            <label htmlFor="mf-branch">Branch</label>
            <input id="mf-branch" value={form.branch} onChange={update("branch")} placeholder="e.g. CSE" />
          </div>
        </div>
        <div className="ab-field">
          <label htmlFor="mf-message">Why do you want to join?</label>
          <textarea
            id="mf-message"
            rows={2}
            value={form.message}
            onChange={update("message")}
            placeholder="Tell us a little about your interest in AI agents..."
          />
        </div>
        {status === "error" && <div className="ab-form-msg error">{error}</div>}
        <button className="btn primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Submitting…" : "Submit Application"}
        </button>
      </form>
    </FormModal>
  );
}

function ContactForm({ onClose }) {
  const [stage, setStage] = useState("email"); // email | otp | details | done
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const isCollegeEmail = (email) => /@sjec\.ac\.in$/i.test(email.trim());

  const sendCode = async (e) => {
    e.preventDefault();
    if (!isCollegeEmail(form.email)) {
      setError("Please use your official college email ending in @sjec.ac.in");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      await requestContactOtp(form.email);
      setStatus("idle");
      setStage("otp");
    } catch (err) {
      setError(err.message || "Could not send verification code. Please try again.");
      setStatus("error");
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await verifyContactOtp(form.email, otp);
      setStatus("idle");
      setStage("details");
    } catch (err) {
      setError(err.message || "Incorrect or expired code. Please try again.");
      setStatus("error");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await submitContact(form);
      setStage("done");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (stage === "done") {
    return (
      <FormModal title="Message Sent" onClose={onClose}>
        <p className="ab-success">
          Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}! The CSE department has received your message.
        </p>
        <button type="button" className="btn primary" onClick={onClose}>
          Close
        </button>
      </FormModal>
    );
  }

  if (stage === "email") {
    return (
      <FormModal title="Contact CSE Department" subtitle="Enter your official SJEC college email to get started." onClose={onClose}>
        <form className="ab-form" onSubmit={sendCode}>
          <div className="ab-field">
            <label htmlFor="cf-email">College Email *</label>
            <input
              id="cf-email"
              required
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="yourname@sjec.ac.in"
            />
          </div>
          {status === "error" && <div className="ab-form-msg error">{error}</div>}
          <button className="btn primary" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending Code…" : "Send Verification Code"}
          </button>
        </form>
      </FormModal>
    );
  }

  if (stage === "otp") {
    return (
      <FormModal title="Verify Your Email" subtitle={`We sent a 6-digit code to ${form.email}.`} onClose={onClose}>
        <form className="ab-form" onSubmit={verifyCode}>
          <div className="ab-field">
            <label htmlFor="cf-otp">Verification Code *</label>
            <input
              id="cf-otp"
              required
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
            />
          </div>
          {status === "error" && <div className="ab-form-msg error">{error}</div>}
          <button className="btn primary" type="submit" disabled={status === "sending" || otp.length !== 6}>
            {status === "sending" ? "Verifying…" : "Verify Code"}
          </button>
          <button
            type="button"
            className="ab-link-btn"
            onClick={() => {
              setStage("email");
              setOtp("");
              setError("");
              setStatus("idle");
            }}
          >
            Use a different email
          </button>
        </form>
      </FormModal>
    );
  }

  // stage === "details"
  return (
    <FormModal title="Contact CSE Department" subtitle="Almost done — write your message to the department." onClose={onClose}>
      <form className="ab-form" onSubmit={submit}>
        <div className="ab-field">
          <label htmlFor="cf-name">Full Name *</label>
          <input id="cf-name" required value={form.name} onChange={update("name")} placeholder="Your full name" />
        </div>
        <div className="ab-field">
          <label>College Email</label>
          <input value={form.email} disabled />
        </div>
        <div className="ab-field">
          <label htmlFor="cf-subject">Subject</label>
          <input id="cf-subject" value={form.subject} onChange={update("subject")} placeholder="What's this about?" />
        </div>
        <div className="ab-field">
          <label htmlFor="cf-message">Message *</label>
          <textarea id="cf-message" required rows={4} value={form.message} onChange={update("message")} placeholder="Type your message..." />
        </div>
        {status === "error" && <div className="ab-form-msg error">{error}</div>}
        <button className="btn primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send Message"}
        </button>
      </form>
    </FormModal>
  );
}

function Join({ settings }) {
  const [modal, setModal] = useState(null); // null | "join" | "contact"
  const [addrHead, ...addrRest] = settings.address.split(",");
  const addrTail = addrRest.join(",").trim();
  return (
    <section className="page active" id="join">
      <div className="glow-bg" />
      <video
        className="join-bg-video"
        src={eyeBackgroundVideo}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
      />
      <div className="flames"><i /><i /></div>
      <div className="wrap">
        <div className="jlogo"><Logo /></div>
        <span className="chip dot" style={{ marginTop: 38 }}>Membership Intake • Academic Year {settings.academicYear}</span>
        <h2 style={{ marginTop: 26 }}>Ready to Build with <span className="ital">Autonomous Intelligence?</span></h2>
        <p className="lead">Join the {settings.clubName} at SJEC CSE. Collaborate with peers, gain hands-on access to Salesforce Trailhead developer orgs, and shape real AI agent projects.</p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={() => setModal("join")}>
            Become a Member
          </button>
          <button type="button" className="btn" onClick={() => setModal("contact")}>
            Contact CSE Department
          </button>
        </div>
        <div className="contact">
          <div className="ic">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></svg>
          </div>
          <div>
            <h5>{addrHead.trim()}</h5>
            {addrTail && <small className="m2">{addrTail}</small>}
            <div className="em">Direct Inquiries: <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></div>
          </div>
        </div>
      </div>
      {modal === "join" && <MembershipForm onClose={() => setModal(null)} />}
      {modal === "contact" && <ContactForm onClose={() => setModal(null)} />}
    </section>
  );
}

/* ---------- app ---------- */
const initialPage = () => {
  const h = (window.location.hash || "#home").slice(1);
  return NAV.some((n) => n.id === h) ? h : "home";
};

// A visitor's own theme pick is stored as { theme, base }.
// `base` is the admin Default Theme that was active when they picked.
// The pick is only honoured while the admin default is still the same,
// so when the admin saves a NEW default theme, it takes effect for everyone.
const THEME_STORAGE_KEY = "ab-theme-user";

const getVisitorPick = () => {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY); // clean up very old builds
    const p = JSON.parse(sessionStorage.getItem(THEME_STORAGE_KEY) || "null");
    return p && THEMES.includes(p.theme) ? p : null;
  } catch (e) {
    return null;
  }
};

export default function App() {
  const [page, setPage] = useState(initialPage);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [userPick, setUserPick] = useState(getVisitorPick);
  const [hover, setHover] = useState(null);
  const [introDone, setIntroDone] = useState(false);

  // Visitor's pick is used only if the admin default hasn't changed since;
  // otherwise the admin's Default Theme applies.
  const pickIsCurrent =
    userPick && (!settingsLoaded || userPick.base === settings.defaultTheme);
  const theme = pickIsCurrent ? userPick.theme : settings.defaultTheme;

  const setTheme = (t) => {
    const pick = { theme: t, base: settings.defaultTheme };
    setUserPick(pick);
    try { sessionStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(pick)); } catch (e) {}
  };

  // Admin changed the default -> forget the visitor's old pick
  useEffect(() => {
    if (settingsLoaded && userPick && userPick.base !== settings.defaultTheme) {
      setUserPick(null);
      try { sessionStorage.removeItem(THEME_STORAGE_KEY); } catch (e) {}
    }
  }, [settingsLoaded, settings.defaultTheme, userPick]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.title = `${settings.clubName} | Dept. of CSE, St Joseph Engineering College`;
  }, [settings.clubName]);

  // Load site settings from the backend, and re-check when the tab regains focus
  // and every 60s, so admin changes appear without the visitor reloading.
  const loadSettings = useCallback(() => {
    getSettings()
      .then((data) => {
        setSettings(mergeSettings(data));
        setSettingsLoaded(true);
      })
      .catch((err) => console.warn("Could not load site settings:", err.message));
  }, []);

  useEffect(() => {
    loadSettings();
    const onVisible = () => { if (document.visibilityState === "visible") loadSettings(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", loadSettings);
    const timer = setInterval(loadSettings, 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", loadSettings);
      clearInterval(timer);
    };
  }, [loadSettings]);

  // While the intro video is up, lift the cursor-trail canvas above it
  useEffect(() => {
    document.documentElement.classList.toggle("intro-on", !introDone);
    return () => document.documentElement.classList.remove("intro-on");
  }, [introDone]);

  const go = useCallback((id) => {
    setHover(null);
    setPage(id);
    window.history.replaceState(null, "", "#" + id);
    window.scrollTo({ top: 0 });
  }, []);

  const popHover = hover && hover.kind !== "plain" ? hover : null;

  return (
    <>
      {!introDone && <IntroSplash onDone={() => setIntroDone(true)} />}
      {introDone && <NetworkBackground />}
      <div className={`site ${introDone ? "in" : ""}`}>
        <Header page={page} go={go} theme={theme} setTheme={setTheme} />
        <main>
          {page === "home" && <Home go={go} settings={settings} />}
          {page === "about" && <About hover={hover} setHover={setHover} settings={settings} />}
          {page === "events" && <Events hover={hover} setHover={setHover} settings={settings} />}
          {page === "join" && <Join settings={settings} />}
        </main>
        <Footer go={go} settings={settings} />
        <Popover hover={popHover} onClose={() => setHover(null)} />
      </div>
      <CursorTrail />
    </>
  );
}