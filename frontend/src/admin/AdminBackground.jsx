import React, { useEffect, useRef } from "react";

// Self-contained so the admin section never imports anything from the
// public App.jsx - same visual idea (drifting connected dots) as the
// public site's background, but its own independent copy.
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function AdminBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const cx = cv.getContext("2d");
    let W, H, pts = [], raf;

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = Array.from({ length: Math.round((W * H) / 24000) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.6 + 0.6
      }));
    };
    size();
    window.addEventListener("resize", size);

    const still = reduceMotion();
    const loop = () => {
      cx.clearRect(0, 0, W, H);
      const dot = cssVar("--dot") || "rgba(120,110,255,.7)";
      const line = cssVar("--line") || "rgba(80,200,220,.16)";

      pts.forEach((p) => {
        if (!still) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
        }
        cx.fillStyle = dot;
        cx.beginPath();
        cx.arc(p.x, p.y, p.r, 0, 7);
        cx.fill();
      });

      cx.strokeStyle = line;
      cx.lineWidth = 0.6;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          if (dx * dx + dy * dy < 16900) {
            cx.globalAlpha = 1 - Math.hypot(dx, dy) / 130;
            cx.beginPath();
            cx.moveTo(pts[i].x, pts[i].y);
            cx.lineTo(pts[j].x, pts[j].y);
            cx.stroke();
          }
        }
      }
      cx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas className="adm-bg-canvas" ref={ref} />;
}