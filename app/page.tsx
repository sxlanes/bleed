"use client";

import { useEffect, useState } from "react";
import styles from "./pagina.module.css";

const PER_SECOND = 4800 / (365.25 * 24 * 3600);

export default function Portada() {
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

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <span className={styles.mark}>BLEED</span>
        <span className={styles.status}>SYSTEM_READY</span>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>
            YOUR SITE
            <br />
            IS BLEEDING
          </h1>

          <div className={styles.terminal}>
            <div className={styles.terminalHeader}>
              <span>DIAGNOSTIC_TOOL_v1.0</span>
            </div>
            <form
              className={styles.form}
              onSubmit={handleSubmit}
              noValidate
            >
              <label htmlFor="url" className={styles.srOnly}>Business website URL</label>
              <div className={styles.inputWrapper}>
                <span className={styles.prompt}>{'>'}</span>
                <input
                  id="url"
                  name="url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  placeholder="ENTER TARGET URL..."
                  className={styles.input}
                  onChange={() => setUrlError(null)}
                />
                <button type="submit" className={styles.run}>EXECUTE</button>
              </div>
            </form>
            {urlError ? (
              <div className={styles.errorText} role="alert">ERR: {urlError}</div>
            ) : (
              <div className={styles.hint}>A restaurant, a shop, a clinic. Any business with a site.</div>
            )}
            <div className={styles.tally}>
              <span className={styles.lab}>SESSION_LOSS</span>
              <span className={styles.val}>{loss}</span>
              <span className={styles.rate}>[RATE: €0.000152/s]</span>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <span>LEAK_AUDIT</span>
        <span>2026_DATABANK</span>
      </footer>
    </div>
  );
}
