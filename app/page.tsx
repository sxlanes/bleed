"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./pagina.module.css";

const PER_SECOND = 4800 / (365.25 * 24 * 3600);

type Drop = { x: number; y: number; r: number; a: number };
type Runner = Drop & { v: number; life: number };

export default function Portada() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loss, setLoss] = useState("€0.0000");
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const url = fd.get("url") as string;
    if (!url) {
      setUrlError("Please enter a URL.");
      return;
    }
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
      window.location.href = `/informe?url=${encodeURIComponent(url)}`;
    } catch {
      setUrlError("Invalid URL format.");
    }
  };

  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const v = ((Date.now() - t0) / 1000) * PER_SECOND;
      setLoss("€" + v.toFixed(4));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  /* Condensation on the red field. Droplets hold, then one gets heavy enough to
     run, swallowing what it passes and leaving a thinning trail behind it. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let drops: Drop[] = [];
    let runners: Runner[] = [];
    let sinceSpawn = 0;

    const seed = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = canvas.offsetWidth * dpr;
      h = canvas.height = canvas.offsetHeight * dpr;
      const density = (w * h) / (52000 * dpr);
      const n = Math.round(Math.min(110, density));
      drops = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (2.8 + Math.pow(Math.random(), 1.8) * 9.5) * dpr,
        a: 0.5 + Math.random() * 0.5,
      }));
      runners = [];
      if (!sprite) sprite = bakeSprite();
    };

    /* A droplet is a lens: light bends through it, so it lifts the ground it
       sits on and throws one small specular. Building those four gradients per
       droplet per frame cost about 26,000 gradient objects a second, so the
       droplet is baked once into an offscreen sprite and blitted from there. */
    const SPRITE = 128;
    const SPRITE_R = 40;
    const SPRITE_CY = 60;
    let sprite: HTMLCanvasElement | null = null;

    const bakeSprite = () => {
      const c = document.createElement("canvas");
      c.width = SPRITE;
      c.height = SPRITE;
      const g2 = c.getContext("2d");
      if (!g2) return null;
      const x = SPRITE / 2;
      const y = SPRITE_CY;
      const r = SPRITE_R;

      const sh = g2.createRadialGradient(x, y + r * 0.42, r * 0.2, x, y + r * 0.42, r * 1.24);
      sh.addColorStop(0, "rgba(74,4,7,0.3)");
      sh.addColorStop(1, "rgba(74,4,7,0)");
      g2.fillStyle = sh;
      g2.beginPath();
      g2.arc(x, y + r * 0.42, r * 1.24, 0, Math.PI * 2);
      g2.fill();

      const g = g2.createRadialGradient(x - r * 0.32, y - r * 0.32, r * 0.06, x, y, r);
      g.addColorStop(0, "rgba(255,236,232,0.34)");
      g.addColorStop(0.4, "rgba(255,190,186,0.12)");
      g.addColorStop(0.72, "rgba(255,255,255,0.04)");
      g.addColorStop(0.93, "rgba(120,10,14,0.2)");
      g.addColorStop(1, "rgba(255,255,255,0.16)");
      g2.fillStyle = g;
      g2.beginPath();
      g2.arc(x, y, r, 0, Math.PI * 2);
      g2.fill();

      const hx = x - r * 0.33;
      const hy = y - r * 0.37;
      const hr = r * 0.3;
      const hg = g2.createRadialGradient(hx, hy, 0, hx, hy, hr);
      hg.addColorStop(0, "rgba(255,255,255,0.82)");
      hg.addColorStop(1, "rgba(255,255,255,0)");
      g2.fillStyle = hg;
      g2.beginPath();
      g2.arc(hx, hy, hr, 0, Math.PI * 2);
      g2.fill();
      return c;
    };

    const drawDrop = (d: Drop, stretch = 0) => {
      if (!sprite) return;
      const { x, y, r, a } = d;
      ctx.globalAlpha = a;
      if (stretch > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.05 * a})`;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.34, y);
        ctx.quadraticCurveTo(x, y - r - stretch, x + r * 0.34, y);
        ctx.closePath();
        ctx.fill();
      }
      const k = r / SPRITE_R;
      ctx.drawImage(sprite, x - (SPRITE / 2) * k, y - SPRITE_CY * k, SPRITE * k, SPRITE * k);
      ctx.globalAlpha = 1;
    };

    const step = (dt: number) => {
      sinceSpawn += dt;
      if (sinceSpawn > 1500 + Math.random() * 2600 && runners.length < 3) {
        sinceSpawn = 0;
        runners.push({
          x: Math.random() * w,
          y: -10 * dpr,
          r: (6 + Math.random() * 5) * dpr,
          a: 0.8 + Math.random() * 0.2,
          v: 0.02 * dpr,
          life: 1,
        });
      }

      for (let i = runners.length - 1; i >= 0; i--) {
        const rn = runners[i];
        rn.v = Math.min(rn.v + 0.0016 * dt * dpr, 0.42 * dpr);
        rn.y += rn.v * dt * 0.06;

        // swallow the condensation it runs over, and get heavier for it
        for (let j = drops.length - 1; j >= 0; j--) {
          const d = drops[j];
          if (Math.abs(d.x - rn.x) < rn.r && Math.abs(d.y - rn.y) < rn.r * 1.5) {
            rn.r = Math.min(rn.r + d.r * 0.14, 15 * dpr);
            drops.splice(j, 1);
          }
        }

        // residue: the trail it leaves is what did not come with it
        if (Math.random() < 0.13) {
          drops.push({
            x: rn.x + (Math.random() - 0.5) * rn.r * 1.1,
            y: rn.y - rn.r,
            r: (1.6 + Math.random() * 3.2) * dpr,
            a: 0.3 + Math.random() * 0.4,
          });
        }

        if (rn.y - rn.r > h) runners.splice(i, 1);
      }

      // the field slowly reforms so it never empties out
      if (drops.length < 110 && Math.random() < 0.25) {
        drops.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (2.6 + Math.pow(Math.random(), 1.8) * 7.5) * dpr,
          a: 0.45 + Math.random() * 0.45,
        });
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of drops) drawDrop(d);
      for (const rn of runners) drawDrop(rn, rn.r * 3.4);
    };

    seed();
    render();

    if (!reduce) {
      let last = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(now - last, 48);
        last = now;
        if (!document.hidden) {
          step(dt);
          render();
        }
        raf = window.requestAnimationFrame(loop);
      };
      raf = window.requestAnimationFrame(loop);
    }

    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => {
        seed();
        render();
      }, 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(rt);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.grain} aria-hidden />
      <div className={styles.rail} aria-hidden />
      <canvas ref={canvasRef} className={styles.ambient} aria-hidden />

      <div className={styles.shell}>
        <span className={styles.mark}>Bleed</span>

        <main className={styles.mid}>
          <h1 className={styles.title}>
            <span className={styles.line1}>Your site is</span>
            <span className={styles.line2}>bleeding.</span>
          </h1>

          <div className={styles.field}>
            <form
              className={`${styles.form} ${urlError ? styles.formError : ""}`}
              onSubmit={handleSubmit}
              noValidate
            >
              <span className={styles.cue} aria-hidden>
                <i className={styles.caret} />
              </span>
              <label
                htmlFor="url"
                style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}
              >
                Restaurant website
              </label>
              <input
                id="url"
                name="url"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                required
                placeholder="Paste the URL of your website"
                className={styles.input}
                aria-describedby="url-hint"
                aria-invalid={urlError ? "true" : "false"}
                onChange={() => setUrlError(null)}
              />
              <button type="submit" className={styles.run}>
                Run
              </button>
            </form>
            {urlError && (
              <div className={styles.errorText} role="alert">
                {urlError}
              </div>
            )}
            <div id="url-hint" className={styles.hint}>
              e.g. https://your-restaurant.com
            </div>
            <p className={styles.tally}>
              <span className={styles.lab}>Session loss</span>
              <span className={styles.val}>{loss}</span>
              <span className={styles.rate}>€0.000152 / s</span>
            </p>
          </div>
        </main>

        <footer className={styles.foot}>leak audit · Málaga</footer>
      </div>
    </div>
  );
}
