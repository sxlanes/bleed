"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./pagina.module.css";

const PER_SECOND = 4800 / (365.25 * 24 * 3600);

export default function Portada() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loss, setLoss] = useState("€0.0000");

  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const v = ((Date.now() - t0) / 1000) * PER_SECOND;
      setLoss("€" + v.toFixed(4));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    let lines: { x: number; y: number; len: number; v: number; a: number }[] = [];

    const seed = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.width = canvas.offsetWidth * dpr;
      h = canvas.height = canvas.offsetHeight * dpr;
      const n = Math.round(Math.min(24, w / 74));
      lines = Array.from({ length: n }, () => ({
        x: Math.pow(Math.random(), 1.7) * w,
        y: Math.random() * h,
        len: 24 + Math.random() * 92,
        v: 0.1 + Math.random() * 0.6,
        a: 0.04 + Math.random() * 0.1,
      }));
    };

    const draw = (move: boolean) => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (const s of lines) {
        const g = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.len);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, `rgba(255,255,255,${s.a})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, s.y + s.len);
        ctx.stroke();
        if (move) {
          s.y += s.v;
          if (s.y > h + s.len) {
            s.y = -s.len;
            s.x = Math.pow(Math.random(), 1.7) * w;
          }
        }
      }
    };

    seed();
    draw(false);
    if (!reduce) {
      const anim = () => {
        draw(true);
        raf = window.requestAnimationFrame(anim);
      };
      anim();
    }

    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => {
        seed();
        draw(!reduce);
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
            <form className={styles.form} action="/informe">
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
              />
              <button type="submit" className={styles.run}>
                Run
              </button>
            </form>
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
