"use client";

import { useState, useEffect } from "react";
import styles from "./informe.module.css";

const lines = [
  "Initializing leak diagnostic engine...",
  "Resolving target domain...",
  "Establishing secure connection...",
  "Fetching site resources and assets...",
  "Simulating mobile throttling (Fast 4G)...",
  "Measuring TTFB and paint metrics...",
  "Extracting checkout flows...",
  "Scanning for aggregator links (Glovo, UberEats)...",
  "Checking for direct channel alternatives...",
  "Mapping fees to order volume...",
  "Applying calibrated heuristic (N=132)...",
  "Generating visual evidence...",
  "Compiling executive dossier..."
];

export default function Loading() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setVisibleLines(lines.map((_, i) => i));
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      setVisibleLines(prev => [...prev, i]);
      i++;
      if (i >= lines.length) {
        clearInterval(interval);
      }
    }, 450); // fast paced hacker text

    return () => clearInterval(interval);
  }, []);

  return (
    <main className={styles.loadingMain}>
      <h1 className={styles.loadingTitle}>
        DIAGNOSING
        <span className={styles.blinkingCursor}>_</span>
      </h1>
      
      <div className={styles.loadingConsole} role="status" aria-live="polite">
        {visibleLines.map(idx => (
          <div key={idx} className={`${styles.loadingMessage} ${styles.loadingTerminalLine}`}>
            <span className={styles.loadingMessageIcon}>&gt;</span>
            <span className={styles.loadingTerminalText}>{lines[idx]}</span>
            {idx === visibleLines.length - 1 && idx !== lines.length - 1 && (
              <span className={styles.spinner}>...</span>
            )}
            {idx !== visibleLines.length - 1 && (
              <span className={styles.checkMark}> [OK]</span>
            )}
          </div>
        ))}
      </div>
      
      <div className={styles.loadingProgressBox}>
        <div 
          className={styles.loadingProgressBar} 
          style={{ width: `${Math.min(100, (visibleLines.length / lines.length) * 100)}%` }} 
        />
      </div>
    </main>
  );
}
