"use client";

import { useState, useEffect } from "react";
import styles from "./informe.module.css";

const messages = [
  "Reading the site",
  "Detecting the order path",
  "Weighing the images",
  "Matching leaks to this business",
  "Applying calibrated constants",
  "Writing the brief"
];

export default function Loading() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setVisibleCount(messages.length);
      return;
    }

    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= messages.length) {
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
      <div className={styles.loadingConsole}>
        {messages.slice(0, visibleCount).map((msg, idx) => (
          <div key={idx} className={styles.loadingMessage}>{msg}</div>
        ))}
      </div>
    </main>
  );
}
