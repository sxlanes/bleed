"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FullAuditReport, AuditSimulationParams, AuditProduct, Leak } from "@/lib/types";
import { calculateLeaks } from "@/lib/quantification";
import { generateDeterministicDossier } from "@/lib/gemini-dossier";
import { renderMarkdown } from "@/lib/markdown";
import { classifyVertical, Words } from "@/lib/vertical";
import { ECONOMIA_VERTICAL } from "@/lib/calibracion-verticales";
import styles from "@/app/informe/informe.module.css";
import CureEngine from "./CureEngine";
import GravitySimulator from "./GravitySimulator";

interface Props {
  initialReport: FullAuditReport;
}

type TabId = "leaks" | "simulator" | "dossier" | "plan";

const TABS: { id: TabId; label: string }[] = [
  { id: "leaks", label: "Leaks" },
  { id: "simulator", label: "Simulator" },
  { id: "dossier", label: "Dossier" },
  { id: "plan", label: "Plan" },
];

const SEVERITY_COLOR: Record<Leak["severity"], string> = {
  critica: "#ef4444",
  alta: "#f97316",
  media: "#eab308",
};

const SEVERITY_LABEL: Record<Leak["severity"], string> = {
  critica: "Critical",
  alta: "High",
  media: "Medium",
};

const listNames = (names: string[]) =>
  names.length <= 1 ? names[0] || "" : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

function stepperRange(min: number, max: number, current: number) {
  const low = Math.min(min, current);
  const high = Math.max(max, current);
  const span = high - low;
  const step = span > 400 ? 25 : span > 120 ? 10 : span > 40 ? 5 : 1;
  return { low, high, step };
}

function currencyTools(currency: string) {
  const whole = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  const exact = new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = whole.formatToParts(1).find((p) => p.type === "currency")?.value ?? currency;
  return {
    money: (n: number) => whole.format(Math.round(n)),
    exact: (n: number) => exact.format(n),
    symbol,
    heroNumber: (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n)),
  };
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(target);
  const hasRun = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (hasRun.current) { setValue(target); return; }
    hasRun.current = true;
    if (prefersReducedMotion()) return;
    setValue(0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ─── Shared style tokens ───────────────────────────────────────────────────
const C = {
  bg: "#0e1113",
  surface: "#13171b",
  border: "#1f2428",
  borderHover: "#2d3339",
  textPrimary: "#f0f2f4",
  textSecondary: "#8b949e",
  textMuted: "#484f58",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
};

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: "12px",
  ...extra,
});

export default function InformeView({ initialReport }: Props) {
  const [params, setParams] = useState<AuditSimulationParams>(initialReport.params);
  const [activeTab, setActiveTab] = useState<TabId>("leaks");
  const [expandedLeakId, setExpandedLeakId] = useState<string | null>(null);
  const [dossierMarkdown, setDossierMarkdown] = useState<string>(() => generateDeterministicDossier(initialReport));
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSource, setAiSource] = useState("Calibrated diagnosis");
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const currentReport = useMemo(
    () => calculateLeaks(initialReport.audit, params, initialReport.triage, initialReport.vertical),
    [initialReport.audit, params, initialReport.triage, initialReport.vertical]
  );

  const audit = currentReport.audit;
  const leaks = currentReport.leaks;
  const totalLoss = currentReport.totalAnnualLossEuros;
  const recoverable = currentReport.recoverableAnnualEuros;
  const repairHours = leaks.reduce((acc, l) => acc + l.remedyHours, 0);
  const heroValue = useCountUp(totalLoss);
  const ranked = useMemo(() => [...leaks].sort((a, b) => b.annualLossEuros - a.annualLossEuros), [leaks]);
  const maxLoss = Math.max(...leaks.map((l) => l.annualLossEuros), 1);

  const verdict = useMemo(() => currentReport.vertical ?? classifyVertical(audit), [currentReport.vertical, audit]);
  const w = verdict.definition.words;
  const { money: eur, exact: money2, symbol: sym, heroNumber } = currencyTools(currentReport.currency || "EUR");

  const econ = ECONOMIA_VERTICAL[verdict.id];
  const valueRange = stepperRange(Math.floor(econ.valorTransaccion.minimo * 0.5), Math.ceil(econ.valorTransaccion.maximo * 1.5), params.ticketMedio);
  const rateRange = stepperRange(Math.max(1, Math.floor(econ.transaccionesPorPeriodo.minimo)), Math.ceil(econ.transaccionesPorPeriodo.maximo * 2), params.pedidosDia);
  const trafficRange = stepperRange(100, 20000, params.visitasMes);
  const feeRange = stepperRange(Math.max(1, Math.floor(econ.comisionPlataforma.minimo * 0.5)), Math.ceil(econ.comisionPlataforma.maximo * 1.4), params.comisionAgregadorPct);

  const handleParamChange = (field: keyof AuditSimulationParams, value: number) => {
    setIsUpdating(true);
    setUpdateMsg("Recalculating");
    setParams((prev) => ({ ...prev, [field]: value }));
    const now = Date.now();
    setLastUpdate(now);
    setTimeout(() => {
      setLastUpdate((current) => {
        if (current === now) {
          setIsUpdating(false);
          setUpdateMsg("Updated");
          setTimeout(() => setUpdateMsg(""), 2000);
        }
        return current;
      });
    }, 300);
  };

  const handleGenerateGeminiDossier = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/dossier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: currentReport }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.markdown) {
          setDossierMarkdown(data.markdown);
          setAiSource(data.modelUsed ? `Written with Google Gemini (${data.modelUsed})` : "Drafted with Gemini");
        }
      }
    } catch { /* deterministic dossier stays */ } finally {
      setIsGeneratingAi(false);
    }
  };

  const copyDossier = () => {
    navigator.clipboard.writeText(dossierMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const auditedOn = new Date(audit.auditedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const topLeak = ranked[0];

  // PSI scores (from audit if available)
  const perfScore = audit.performanceScore != null ? Math.round(audit.performanceScore * 100) : null;
  const seoScore = audit.seoScore != null ? Math.round(audit.seoScore * 100) : null;
  const lcpSec = audit.lcpMs != null ? (audit.lcpMs / 1000).toFixed(1) : null;

  const scoreColor = (s: number) => s >= 90 ? C.green : s >= 50 ? C.yellow : C.red;

  return (
    <main
      className={styles.page}
      style={{ backgroundColor: C.bg, fontFamily: "var(--font-instrument, sans-serif)", overflowX: "hidden", minHeight: "100vh" }}
    >
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "6rem 2rem 4rem" }}>

        {/* Header label */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, boxShadow: `0 0 8px ${C.red}` }} />
          <span style={{ fontSize: "0.8rem", color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500 }}>
            Bleed · Revenue Audit · {auditedOn}
          </span>
        </div>

        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: C.textPrimary, margin: "0 0 3rem 0", lineHeight: 1.1, letterSpacing: "-0.03em", fontWeight: 700, animation: "entrar 0.5s ease-out" }}>
          {audit.name}
          <br />
          <span style={{ color: C.red }}>is bleeding money.</span>
        </h1>

        {/* ── KPI row ─────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1px", background: C.border, borderRadius: 12, overflow: "hidden", marginBottom: "3rem" }}>

          {/* Annual Loss */}
          <div style={{ background: C.surface, padding: "2rem 2rem 1.75rem" }}>
            <div style={{ fontSize: "0.75rem", color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Annual Loss</div>
            <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, color: C.red, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {sym}{heroNumber(heroValue)}
            </div>
            <div style={{ fontSize: "0.8rem", color: C.textMuted, marginTop: "0.5rem" }}>Estimated over 12 months</div>
          </div>

          {/* Recoverable */}
          <div style={{ background: C.surface, padding: "2rem 2rem 1.75rem" }}>
            <div style={{ fontSize: "0.75rem", color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Recoverable</div>
            <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, color: C.green, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {eur(recoverable)}
            </div>
            <div style={{ fontSize: "0.8rem", color: C.textMuted, marginTop: "0.5rem" }}>Can be claimed back today</div>
          </div>

          {/* Leaks */}
          <div style={{ background: C.surface, padding: "2rem 2rem 1.75rem" }}>
            <div style={{ fontSize: "0.75rem", color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Leaks Found</div>
            <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {leaks.length}
            </div>
            <div style={{ fontSize: "0.8rem", color: C.textMuted, marginTop: "0.5rem" }}>{repairHours}h to fix all</div>
          </div>

          {/* Performance Score (PSI) */}
          {perfScore !== null ? (
            <div style={{ background: C.surface, padding: "2rem 2rem 1.75rem" }}>
              <div style={{ fontSize: "0.75rem", color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Performance</div>
              <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, color: scoreColor(perfScore), letterSpacing: "-0.03em", lineHeight: 1 }}>
                {perfScore}<span style={{ fontSize: "1rem", color: C.textSecondary }}>/100</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: C.textMuted, marginTop: "0.5rem" }}>
                {lcpSec ? `LCP ${lcpSec}s · ` : ""}Google PageSpeed (mobile)
              </div>
            </div>
          ) : (
            <div style={{ background: C.surface, padding: "2rem 2rem 1.75rem" }}>
              <div style={{ fontSize: "0.75rem", color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Traffic</div>
              <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {(audit.monthlyVisits ?? params.visitasMes).toLocaleString("en-US")}
              </div>
              <div style={{ fontSize: "0.8rem", color: C.textMuted, marginTop: "0.5rem" }}>Monthly visits · {audit.monthlyVisitsSource ?? "Estimated"}</div>
            </div>
          )}
        </div>

        {/* ── TABS ────────────────────────────────────────────────────────── */}
        <div id="report-tabs" style={{ borderBottom: `1px solid ${C.border}`, display: "flex", gap: 0, marginBottom: "2.5rem" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${C.textPrimary}` : "2px solid transparent",
                padding: "0.75rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? C.textPrimary : C.textSecondary,
                cursor: "pointer",
                transition: "color 0.15s",
                marginBottom: -1,
                fontFamily: "inherit",
              }}
            >
              {tab.label}
            </button>
          ))}
          {updateMsg && (
            <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: "0.75rem", color: C.textMuted }}>
              {updateMsg}
            </span>
          )}
        </div>

        {/* ── TAB: LEAKS ──────────────────────────────────────────────────── */}
        {activeTab === "leaks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: C.border, borderRadius: 12, overflow: "hidden", marginBottom: "3rem" }}>
            {leaks.map((leak) => {
              const isOpen = expandedLeakId === leak.id;
              const barPct = (leak.annualLossEuros / maxLoss) * 100;
              return (
                <div
                  key={leak.id}
                  id={`leak-${leak.id}`}
                  style={{ background: C.surface, cursor: "pointer" }}
                  onClick={() => setExpandedLeakId(isOpen ? null : leak.id)}
                >
                  {/* Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem 1.5rem" }}>
                    {/* Severity dot */}
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEVERITY_COLOR[leak.severity], flexShrink: 0 }} />

                    {/* Title */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.9375rem", fontWeight: 500, color: C.textPrimary, marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {leak.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: C.textSecondary }}>
                        {SEVERITY_LABEL[leak.severity]} · {leak.remedyHours}h to fix
                      </div>
                    </div>

                    {/* Bar */}
                    <div style={{ width: 80, height: 4, background: C.border, borderRadius: 4, flexShrink: 0, overflow: "hidden" }}>
                      <div style={{ width: `${barPct}%`, height: "100%", background: SEVERITY_COLOR[leak.severity], borderRadius: 4 }} />
                    </div>

                    {/* Amount */}
                    <div style={{ fontSize: "1rem", fontWeight: 600, color: C.red, flexShrink: 0, minWidth: 90, textAlign: "right" }}>
                      {eur(leak.annualLossEuros)}/yr
                    </div>

                    {/* Chevron */}
                    <div style={{ color: C.textMuted, fontSize: "0.75rem", flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div style={{ padding: "0 1.5rem 1.5rem", borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.25rem" }}>
                        <div>
                          <div style={{ fontSize: "0.7rem", color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>Explanation</div>
                          <div style={{ fontSize: "0.875rem", color: C.textSecondary, lineHeight: 1.6 }}>{leak.explanation}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.7rem", color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>Remedy</div>
                          <div style={{ fontSize: "0.875rem", color: C.textSecondary, lineHeight: 1.6 }}>{leak.remedy}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: "0.7rem", color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>Formula</div>
                        <div style={{ fontSize: "0.8rem", color: C.textSecondary, fontFamily: "var(--font-plex-mono, monospace)" }}>{leak.formula}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: SIMULATOR ──────────────────────────────────────────────── */}
        {activeTab === "simulator" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "3rem" }}>
            {/* Assumption sliders */}
            {[
              { label: "Avg transaction value", field: "ticketMedio" as const, value: params.ticketMedio, range: valueRange, prefix: sym, suffix: "" },
              { label: "Transactions per day", field: "pedidosDia" as const, value: params.pedidosDia, range: rateRange, prefix: "", suffix: "/day" },
              { label: "Monthly website visits", field: "visitasMes" as const, value: params.visitasMes, range: trafficRange, prefix: "", suffix: " visits/mo" },
              { label: "Aggregator commission", field: "comisionAgregadorPct" as const, value: params.comisionAgregadorPct, range: feeRange, prefix: "", suffix: "%" },
            ].map(({ label, field, value, range, prefix, suffix }) => (
              <div key={field} style={card({ padding: "1.5rem 2rem" })}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.875rem", color: C.textSecondary }}>{label}</div>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: C.textPrimary }}>{prefix}{value.toLocaleString("en-US")}{suffix}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button onClick={() => handleParamChange(field, Math.max(range.low, value - range.step))} style={{ width: 32, height: 32, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <input
                    type="range"
                    min={range.low}
                    max={range.high}
                    step={range.step}
                    value={value}
                    onChange={(e) => handleParamChange(field, Number(e.target.value))}
                    style={{ flex: 1, accentColor: C.blue, cursor: "pointer" }}
                  />
                  <button onClick={() => handleParamChange(field, Math.min(range.high, value + range.step))} style={{ width: 32, height: 32, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>
            ))}

            {/* Recalculated totals */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: C.border, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: C.surface, padding: "1.5rem 2rem" }}>
                <div style={{ fontSize: "0.75rem", color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>Recalculated Annual Loss</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: C.red }}>{eur(totalLoss)}</div>
              </div>
              <div style={{ background: C.surface, padding: "1.5rem 2rem" }}>
                <div style={{ fontSize: "0.75rem", color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>Recoverable Capital</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: C.green }}>{eur(recoverable)}</div>
              </div>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <GravitySimulator />
            </div>
          </div>
        )}

        {/* ── TAB: DOSSIER ────────────────────────────────────────────────── */}
        {activeTab === "dossier" && (
          <div style={{ marginBottom: "3rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.75rem", color: C.textSecondary }}>{aiSource}</div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={copyDossier}
                  style={{ padding: "0.5rem 1rem", borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, color: C.textPrimary, fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handleGenerateGeminiDossier}
                  disabled={isGeneratingAi}
                  style={{ padding: "0.5rem 1rem", borderRadius: 6, background: isGeneratingAi ? C.surface : C.blue, border: "none", color: "#fff", fontSize: "0.8125rem", cursor: isGeneratingAi ? "not-allowed" : "pointer", opacity: isGeneratingAi ? 0.6 : 1, fontFamily: "inherit" }}
                >
                  {isGeneratingAi ? "Generating…" : "Regenerate with Gemini"}
                </button>
              </div>
            </div>
            <div
              style={card({ padding: "2rem 2.5rem", lineHeight: 1.75, color: C.textSecondary, fontSize: "0.9375rem" })}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(dossierMarkdown) }}
            />
          </div>
        )}

        {/* ── TAB: PLAN ───────────────────────────────────────────────────── */}
        {activeTab === "plan" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>
            {leaks.map((leak, idx) => (
              <div key={leak.id} style={card({ padding: "1.5rem 2rem" })}>
                <div style={{ display: "flex", gap: "1.25rem" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.bg, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: C.textSecondary, flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9375rem", fontWeight: 500, color: C.textPrimary, marginBottom: "0.4rem" }}>{leak.title}</div>
                    <div style={{ fontSize: "0.8125rem", color: C.textSecondary, lineHeight: 1.6, marginBottom: "0.75rem" }}>{leak.remedy}</div>
                    <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.75rem", color: C.textMuted }}>
                      <span>Saves <strong style={{ color: C.green }}>{eur(leak.annualLossEuros)}/yr</strong></span>
                      <span>{leak.remedyHours}h estimated</span>
                      <span style={{ color: SEVERITY_COLOR[leak.severity] }}>{SEVERITY_LABEL[leak.severity]}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CURE ENGINE ─────────────────────────────────────────────────── */}
        <div style={{ marginTop: "2rem", marginBottom: "4rem" }}>
          <CureEngine audit={audit} annualLoss={totalLoss} currency={sym} />
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "2rem", display: "flex", gap: "2rem", flexWrap: "wrap", color: C.textMuted, fontSize: "0.75rem", fontFamily: "var(--font-plex-mono, monospace)" }}>
          <span>Avg transaction: {money2(params.ticketMedio)}</span>
          <span>Traffic: {params.visitasMes.toLocaleString("en-US")} visits/mo</span>
          <span>Platform fee: {params.comisionAgregadorPct}%</span>
          {seoScore !== null && <span>SEO score: {seoScore}/100 (Google PSI)</span>}
        </div>
      </div>
    </main>
  );
}
