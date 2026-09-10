"use client";

import { useState, useEffect } from "react";
import styles from "./informe.module.css";

const stages = [
  { label: "Fetching", detail: "Downloading site resources" },
  { label: "Checking mobile signals", detail: "Lighthouse mobile simulation" },
  { label: "Calculating leaks", detail: "Mapping fees and bounces" },
  { label: "Building report", detail: "Generating visual evidence" }
];

export default function Loading() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setActiveIdx(stages.length - 1);
      return;
    }

    const interval = setInterval(() => {
      setActiveIdx((prev) => {
        if (prev >= stages.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className={styles.loadingMain}>
      <h1 className={styles.loadingTitle}>Running diagnostics...</h1>
      <div className={styles.loadingConsole} role="status" aria-live="polite">
        {stages.map((stage, idx) => {
          const isActive = idx === activeIdx;
          const isPast = idx < activeIdx;
          const isFuture = idx > activeIdx;
          
          if (isFuture) return null;

          return (
            <div key={idx} className={`${styles.loadingMessage} ${isActive ? styles.loadingMessageActive : ''}`}>
              <span className={styles.loadingMessageIcon}>{isPast ? "✓" : "⟳"}</span>
              <div className={styles.loadingMessageText}>
                <strong>{stage.label}</strong>
                {isActive && <span className={styles.loadingMessageDetail}>{stage.detail}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
