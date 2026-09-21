"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FullAuditReport, AuditSimulationParams, Leak } from "@/lib/types";
import { calculateLeaks } from "@/lib/quantification";
import { classifyVertical } from "@/lib/vertical";
import { ECONOMIA_VERTICAL } from "@/lib/calibracion-verticales";
import styles from "@/app/informe/informe.module.css";
import CureEngine from "./CureEngine";

interface Props {
  initialReport: FullAuditReport;
}

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0e1113",
  surface: "#111518",
  border: "#1c2127",
  text: "#e6edf3",
  muted: "#7d8590",
  faint: "#30363d",
  red: "#f85149",
  redDim: "#3d1a1a",
  green: "#3fb950",
  yellow: "#d29922",
  blue: "#58a6ff",
};

function fmt(currency: string, n: number, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(Math.round(n));
}

const SEVERITY_ORDER = { critica: 0, alta: 1, media: 2 } as const;

// Live counter: shows how much money has been lost since page load
function LiveLoss({ perDay }: { perDay: number }) {
  const [lost, setLost] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - start.current) / 1000; // seconds
      setLost((perDay / 86400) * elapsed);
    }, 50);
    return () => clearInterval(id);
  }, [perDay]);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {lost.toFixed(4)}
    </span>
  );
}

// Animated count-up hook
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const ran = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (ran.current) { setValue(target); return; }
    ran.current = true;
    setValue(0);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// Leak category icons (SVG paths)
const LEAK_ICONS: Record<string, string> = {
  agregadores:  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
  velocidad:    "M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.72 7.72L13 17v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95zM11 2.05C5.95 2.55 2 6.82 2 12c0 3.76 2.09 7.07 5.22 8.78L6 22h5V2.05z",
  movil:        "M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5S10.67 19 11.5 19s1.5.67 1.5 1.5S12.33 22 11.5 22zm4.5-4H7V4h9v14z",
  tecnico:      "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
  canal_propio: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  reservas:     "M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z",
};
const DEFAULT_ICON = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z";

function LeakIcon({ category, color }: { category: string; color: string }) {
  const d = LEAK_ICONS[category] ?? DEFAULT_ICON;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0, marginTop: 2 }}>
      <path d={d} />
    </svg>
  );
}

// Currency helpers
function currencyTools(currency: string) {
  const whole = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  const sym = whole.formatToParts(1).find((p) => p.type === "currency")?.value ?? currency;
  return { eur: (n: number) => whole.format(Math.round(n)), sym };
}

function stepperRange(min: number, max: number, current: number) {
  const low = Math.min(min, current);
  const high = Math.max(max, current);
  const span = high - low;
  const step = span > 400 ? 25 : span > 120 ? 10 : span > 40 ? 5 : 1;
  return { low, high, step };
}

export default function InformeView({ initialReport }: Props) {
  const [params, setParams] = useState<AuditSimulationParams>(initialReport.params);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentReport = useMemo(
    () => calculateLeaks(initialReport.audit, params, initialReport.triage, initialReport.vertical),
    [initialReport.audit, params, initialReport.triage, initialReport.vertical]
  );

  const audit = currentReport.audit;
  const leaks = [...currentReport.leaks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
  const totalLoss = currentReport.totalAnnualLossEuros;
  const recoverable = currentReport.recoverableAnnualEuros;
  const perDay = totalLoss / 365;
  const animatedTotal = useCountUp(totalLoss);

  const verdict = useMemo(() => currentReport.vertical ?? classifyVertical(audit), [currentReport.vertical, audit]);
  const econ = ECONOMIA_VERTICAL[verdict.id];
  const { eur, sym } = currencyTools(currentReport.currency || "EUR");

  const maxLoss = Math.max(...leaks.map((l) => l.annualLossEuros), 1);

  const SCOLOR: Record<Leak["severity"], string> = {
    critica: T.red,
    alta: T.yellow,
    media: T.muted,
  };
  const SLABEL: Record<Leak["severity"], string> = {
    critica: "Critical",
    alta: "High",
    media: "Medium",
  };

  const valueRange = stepperRange(Math.floor(econ.valorTransaccion.minimo * 0.5), Math.ceil(econ.valorTransaccion.maximo * 1.5), params.ticketMedio);
  const rateRange = stepperRange(Math.max(1, Math.floor(econ.transaccionesPorPeriodo.minimo)), Math.ceil(econ.transaccionesPorPeriodo.maximo * 2), params.pedidosDia);
  const trafficRange = stepperRange(100, 20000, params.visitasMes);
  const feeRange = stepperRange(Math.max(1, Math.floor(econ.comisionPlataforma.minimo * 0.5)), Math.ceil(econ.comisionPlataforma.maximo * 1.4), params.comisionAgregadorPct);

  const auditedOn = new Date(audit.auditedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  // Performance score from Google PSI
  const perfScore = audit.performanceScore != null ? Math.round(audit.performanceScore * 100) : null;
  const lcpSec = audit.lcpMs != null ? (audit.lcpMs / 1000).toFixed(1) : null;

  return (
    <main style={{ background: T.bg, minHeight: "100vh", fontFamily: "var(--font-instrument, system-ui, sans-serif)", overflowX: "hidden" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem 6rem" }}>

        {/* ── TOP META ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2.5rem" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.red, animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "0.75rem", color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Revenue audit · {auditedOn}
          </span>
        </div>

        {/* ── TITLE ────────────────────────────────────────────────────── */}
        <h1 style={{ fontSize: "clamp(1.75rem, 5vw, 2.75rem)", fontWeight: 700, color: T.text, lineHeight: 1.2, letterSpacing: "-0.025em", margin: "0 0 0.5rem" }}>
          {audit.name}
        </h1>
        <p style={{ fontSize: "1rem", color: T.muted, margin: "0 0 3rem" }}>
          {audit.domain} · {verdict.id}
        </p>

        {/* ── THE MAIN BLEEDING NUMBER ─────────────────────────────────── */}
        <div style={{ background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 12, padding: "2rem", marginBottom: "1px" }}>
          <div style={{ fontSize: "0.7rem", color: T.red, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "1rem", fontWeight: 600 }}>
            Estimated annual revenue loss
          </div>
          <div style={{ fontSize: "clamp(3rem, 10vw, 5rem)", fontWeight: 800, color: T.red, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {sym}{useCountUp(animatedTotal).toLocaleString("en-US")}
          </div>
          <div style={{ marginTop: "1.25rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.7rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Per day</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 600, color: T.text }}>{eur(perDay)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Recoverable</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 600, color: T.green }}>{eur(recoverable)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Lost since page load</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 600, color: T.red, fontVariantNumeric: "tabular-nums" }}>
                {sym}<LiveLoss perDay={perDay} />
              </div>
            </div>
          </div>
        </div>

        {/* ── WHERE THE MONEY GOES ─────────────────────────────────────── */}
        <div style={{ border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden", marginBottom: "3rem" }}>
          {leaks.map((leak, i) => {
            const isOpen = expandedId === leak.id;
            const pct = (leak.annualLossEuros / maxLoss) * 100;
            const color = SCOLOR[leak.severity];

            return (
              <div
                key={leak.id}
                style={{
                  borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                  cursor: "pointer",
                  background: isOpen ? T.surface : "transparent",
                  transition: "background 0.15s",
                }}
                onClick={() => setExpandedId(isOpen ? null : leak.id)}
              >
                {/* ── LEAK ROW ─────────────────────────────────────────── */}
                <div style={{ padding: "1.125rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                    <LeakIcon category={leak.category} color={color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title + badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: T.text }}>{leak.title}</span>
                        <span style={{ fontSize: "0.65rem", fontWeight: 600, color, background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {SLABEL[leak.severity]}
                        </span>
                      </div>
                      {/* One-line plain explanation */}
                      <div style={{ fontSize: "0.8125rem", color: T.muted, marginBottom: "0.75rem", lineHeight: 1.5 }}>
                        {leak.explanation}
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease-out" }} />
                      </div>
                    </div>
                    {/* Right: amount */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: T.red }}>{eur(leak.annualLossEuros)}</div>
                      <div style={{ fontSize: "0.7rem", color: T.muted, marginTop: 2 }}>{eur(leak.annualLossEuros / 365)}/day</div>
                    </div>
                  </div>
                </div>

                {/* ── EXPANDED ─────────────────────────────────────────── */}
                {isOpen && (
                  <div style={{ padding: "0 1.5rem 1.5rem 3.125rem", borderTop: `1px solid ${T.border}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginTop: "1.25rem" }}>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>How to fix it</div>
                        <div style={{ fontSize: "0.825rem", color: T.text, lineHeight: 1.65 }}>{leak.remedy}</div>
                        <div style={{ fontSize: "0.75rem", color: T.muted, marginTop: "0.5rem" }}>{leak.remedyHours}h estimated</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>Calculation</div>
                        <div style={{ fontSize: "0.775rem", color: T.muted, fontFamily: "var(--font-plex-mono, monospace)", background: T.bg, padding: "0.75rem", borderRadius: 6, border: `1px solid ${T.border}`, lineHeight: 1.6 }}>
                          {leak.formula}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── GOOGLE PSI SCORES (if available) ─────────────────────────── */}
        {perfScore !== null && (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "3rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.65rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>Performance (Google)</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: perfScore >= 90 ? T.green : perfScore >= 50 ? T.yellow : T.red }}>
                {perfScore}<span style={{ fontSize: "0.875rem", color: T.muted, fontWeight: 400 }}>/100</span>
              </div>
            </div>
            {lcpSec && (
              <div>
                <div style={{ fontSize: "0.65rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>LCP (mobile)</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: parseFloat(lcpSec) <= 2.5 ? T.green : parseFloat(lcpSec) <= 4 ? T.yellow : T.red }}>
                  {lcpSec}s
                </div>
              </div>
            )}
            {audit.seoScore != null && (
              <div>
                <div style={{ fontSize: "0.65rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>SEO Score</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: Math.round(audit.seoScore * 100) >= 90 ? T.green : T.yellow }}>
                  {Math.round(audit.seoScore * 100)}<span style={{ fontSize: "0.875rem", color: T.muted, fontWeight: 400 }}>/100</span>
                </div>
              </div>
            )}
            <div style={{ alignSelf: "center", marginLeft: "auto" }}>
              <div style={{ fontSize: "0.7rem", color: T.muted }}>Source: Google PageSpeed Insights (mobile, live)</div>
            </div>
          </div>
        )}

        {/* ── ASSUMPTIONS ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: "3rem" }}>
          <button
            onClick={() => setShowAssumptions((v) => !v)}
            style={{ background: "none", border: "none", color: T.muted, fontSize: "0.8125rem", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.375rem", fontFamily: "inherit" }}
          >
            <span style={{ transform: showAssumptions ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.2s", fontSize: "0.6rem" }}>▶</span>
            Calculation assumptions
          </button>

          {showAssumptions && (
            <div style={{ marginTop: "1rem", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              {[
                { label: "Avg transaction", field: "ticketMedio" as const, value: params.ticketMedio, range: valueRange, prefix: sym, suffix: "" },
                { label: "Transactions / day", field: "pedidosDia" as const, value: params.pedidosDia, range: rateRange, prefix: "", suffix: "/day" },
                { label: "Monthly visits", field: "visitasMes" as const, value: params.visitasMes, range: trafficRange, prefix: "", suffix: " visits/mo" },
                { label: "Platform fee", field: "comisionAgregadorPct" as const, value: params.comisionAgregadorPct, range: feeRange, prefix: "", suffix: "%" },
              ].map(({ label, field, value, range, prefix, suffix }, i, arr) => (
                <div key={field} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.5rem", borderTop: i === 0 ? "none" : `1px solid ${T.border}`, background: T.surface }}>
                  <div style={{ width: 160, fontSize: "0.8125rem", color: T.muted, flexShrink: 0 }}>{label}</div>
                  <input
                    type="range"
                    min={range.low} max={range.high} step={range.step} value={value}
                    onChange={(e) => setParams((p) => ({ ...p, [field]: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: T.blue, cursor: "pointer" }}
                  />
                  <div style={{ width: 100, fontSize: "0.875rem", fontWeight: 600, color: T.text, textAlign: "right", flexShrink: 0 }}>
                    {prefix}{value.toLocaleString("en-US")}{suffix}
                  </div>
                </div>
              ))}
              <div style={{ padding: "0.875rem 1.5rem", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", background: T.bg }}>
                <span style={{ fontSize: "0.75rem", color: T.muted }}>Recalculated total</span>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: T.red }}>{eur(totalLoss)}/yr</span>
              </div>
            </div>
          )}
        </div>

        {/* ── CURE ENGINE ──────────────────────────────────────────────── */}
        <CureEngine audit={audit} annualLoss={totalLoss} currency={sym} />

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: `1px solid ${T.border}`, fontSize: "0.7rem", color: T.faint, fontFamily: "var(--font-plex-mono, monospace)", lineHeight: 1.8 }}>
          <div>Bleed · Revenue Audit Engine · calibrated on 132 businesses in Málaga</div>
          <div>Figures are estimates based on {sym}{params.ticketMedio} avg transaction, {params.pedidosDia} tx/day, {params.visitasMes.toLocaleString("en-US")} visits/mo, {params.comisionAgregadorPct}% platform fee.</div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes entrar {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
