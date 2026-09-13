"use client";

import { useEffect, useState } from "react";
import styles from "./informe.module.css";

/* The wait is the audit running. Naming each step is the only honest way to
   fill it: the reader learns what the report is made of before it arrives. */
const steps = [
  "Resolving the domain",
  "Asking robots.txt for permission",
  "Reading the homepage and its assets",
  "Measuring time to first byte and image weight",
  "Looking for an ordering path",
  "Checking links to delivery platforms",
  "Reading the menu, if it is published",
  "Ranking what it finds",
  "Pricing each leak in euros",
  "Writing the dossier",
];

export default function Loading() {
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(steps.length);
      return;
    }
    const id = setInterval(() => {
      setDone((n) => (n >= steps.length ? n : n + 1));
    }, 520);
    return () => clearInterval(id);
  }, []);

  return (
    <main className={styles.loading}>
      <div className={styles.loadingShell}>
        <h1 className={styles.loadingTitle}>Auditing the site</h1>
        <p className={styles.loadingSub}>
          We read the live site, so this takes a few seconds. We go slowly on purpose: three
          requests at a time, with a pause between them.
        </p>

        <div className={styles.loadingTrack}>
          <div
            className={styles.loadingFill}
            style={{ width: `${Math.round(((done + 1) / steps.length) * 100)}%` }}
          />
        </div>

        <ol className={styles.loadingList} role="status" aria-live="polite">
          {steps.map((step, i) => (
            <li
              key={step}
              className={`${styles.loadingLine} ${
                i === done ? styles.loadingLineActive : ""
              } ${i > done ? styles.loadingLinePending : ""}`}
            >
              <span
                className={`${styles.loadingMark} ${i < done ? styles.loadingMarkDone : ""}`}
                aria-hidden
              >
                {i < done ? "✓" : i === done ? "›" : "·"}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
