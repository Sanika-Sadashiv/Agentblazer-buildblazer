import React, { useEffect, useRef } from "react";

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function AdminCursorTrail() {
  const ref = useRef(null);

  useEffect(() => {
    if (reduceMotion() || !window.matchMedia("(pointer:fine)").matches) return;

    document.documentElement.classList.add("adm-custom-cursor");
    const tc = ref.current;
    const tx = tc.getContext("2d");
    let mx = -99, my = -99, parts = [], raf;

    const rs = () => {
      tc.width = window.innerWidth;
      tc.height = window.innerHeight;
    };
    rs();

    const move = (e) => {
      mx = e.clientX;
      my = e.clientY;
      for (let i = 0; i < 2; i++) {
        parts.push({
          x: mx,
          y: my,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8 + 0.2,
          life: 1,
          r: Math.random() * 2 + 1
        });
      }
    };

    window.addEventListener("resize", rs);
    window.addEventListener("mousemove", move);

    const tick = () => {
      tx.clearRect(0, 0, tc.width, tc.height);
      const a1 = cssVar("--accent") || "#22d3ee";
      const a2 = cssVar("--accent2") || "#8b5cf6";

      parts = parts.filter((p) => p.life > 0);
      parts.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        tx.globalAlpha = Math.max(0, p.life);
        tx.fillStyle = i % 2 ? a2 : a1;
        tx.beginPath();
        tx.arc(p.x, p.y, p.r * p.life + 0.3, 0, 7);
        tx.fill();
      });
      tx.globalAlpha = 1;

      const g = tx.createRadialGradient(mx, my, 0, mx, my, 16);
      g.addColorStop(0, "rgba(255,255,255,.95)");
      g.addColorStop(0.3, "rgba(120,210,255,.5)");
      g.addColorStop(1, "rgba(120,210,255,0)");
      tx.fillStyle = g;
      tx.beginPath();
      tx.arc(mx, my, 16, 0, 7);
      tx.fill();

      tx.fillStyle = "#fff";
      tx.beginPath();
      tx.arc(mx, my, 3.5, 0, 7);
      tx.fill();

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", rs);
      window.removeEventListener("mousemove", move);
      document.documentElement.classList.remove("adm-custom-cursor");
    };
  }, []);

  return <canvas className="adm-trail-canvas" ref={ref} />;
}