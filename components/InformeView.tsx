"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FullAuditReport, AuditSimulationParams, AuditProduct, Leak } from "@/lib/types";
import { calculateLeaks } from "@/lib/quantification";
import { generateDeterministicDossier } from "@/lib/gemini-dossier";
import { renderMarkdown } from "@/lib/markdown";
import { classifyVertical, Words } from "@/lib/vertical";
import { ECONOMIA_VERTICAL } from "@/lib/calibracion-verticales";
import styles from "@/app/informe/informe.module.css";
import FluidBackground from "./FluidBackground";
import CureEngine from "./CureEngine";
import GravitySimulator from "./GravitySimulator";
interface Props {
  initialReport: FullAuditReport;
}

type TabId = "leaks" | "channel" | "dossier" | "plan";

const TABS: { id: TabId; label: string }[] = [
  { id: "leaks", label: "Leaks" },
  { id: "channel", label: "Direct channel" },
  { id: "dossier", label: "Dossier" },
  { id: "plan", label: "Plan" },
];

const SEVERITY_LABEL: Record<Leak["severity"], string> = {
  critica: "Critical",
  alta: "High",
  media: "Medium",
};

/* One tactic per category, so two leaks in the plan never repeat the same
   advice — and written in the words of whatever trade this turned out to be. */
const tacticsFor = (w: Words, marketplaces: string): Record<string, string> => ({
  agregadores: `Give every ${w.customer} who arrives through ${marketplaces} a reason to come straight to you next time: a card, a code, 10% off their next ${w.transaction}. Their ${w.customers} become yours.`,
  canal_propio: `Put the link where people already look for you: the top of the site, the Instagram bio, the Google profile.`,
  reservas: `Look after the ${w.customers} who come direct better than the platform does. That is the only loyalty that is yours.`,
  velocidad: `Once it is patched, keep the site under a second to load. Local search rewards it.`,
  movil: `Answer the first message within the hour. Speed is what makes a ${w.customer} use that channel again.`,
  tecnico: `Set the update to run itself, so the same hole does not reopen in six months.`,
});

const DEFAULT_TACTIC =
  "Fix it once and check it again in a month: leaks reopen quietly when nobody is looking.";

/* The owner is not going to read a formula. Each leak gets one plain phrase,
   so the summary can name what is happening without a single technical word. */
const plainCauseFor = (w: Words, marketplaceLabel: string): Record<string, string> => ({
  agregadores: `the cut ${marketplaceLabel} take on every ${w.transaction}`,
  canal_propio: "a channel you already pay for and nobody uses",
  velocidad: `pages so slow and heavy that people give up before they see the ${w.catalogue}`,
  movil: `having no quick way for a ${w.customer} to reach you from their phone`,
  reservas: `a fee on every ${w.transaction} that someone else takes for you`,
  tecnico: "software old enough that Google and browsers push you down the page",
});

const DEFAULT_CAUSE = "money leaving through the site itself";

const listNames = (names: string[]) =>
  names.length <= 1
    ? names[0] || ""
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;


/* The simulator used to clamp the ticket between 12 and 60 euros, which is a
   restaurant's world. A hotel booking is 395 and an Amazon fee is 8%: the
   bounds have to come from the same calibrated range the default came from,
   or the first click on "+" snaps the owner's real figure to a wrong one. */
function stepperRange(min: number, max: number, current: number) {
  const low = Math.min(min, current);
  const high = Math.max(max, current);
  const span = high - low;
  const step = span > 400 ? 25 : span > 120 ? 10 : span > 40 ? 5 : 1;
  return { low, high, step };
}

/* The audit reads whatever currency the site prices in, so the report cannot
   hardcode a euro sign. When the figure came from a European average instead
   of the site's own prices, the currency is EUR and nothing changes. */
function currencyTools(currency: string) {
  const whole = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const exact = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol =
    whole.formatToParts(1).find((part) => part.type === "currency")?.value ?? currency;
  return {
    money: (n: number) => whole.format(Math.round(n)),
    exact: (n: number) => exact.format(n),
    symbol,
    /** The hero sets the symbol in its own type size, so it needs the pieces. */
    heroNumber: (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n)),
  };
}

/* Leak titles carry their measurement in parentheses — right for a headline,
   too long for an axis label. The chart keeps the claim, the row keeps the proof. */
const shortLabel = (title: string) => title.split(" (")[0];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* The report is rendered on the server, so the first paint has to carry the
   real figure. The count-up then has to start before the browser paints again,
   or the number visibly jumps back to zero. */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(target);
  const hasRun = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (hasRun.current) {
      setValue(target);
      return;
    }
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

export default function InformeView({ initialReport }: Props) {
  const [params, setParams] = useState<AuditSimulationParams>(initialReport.params);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [updateMsg, setUpdateMsg] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("leaks");
  const [expandedLeakId, setExpandedLeakId] = useState<string | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [cart, setCart] = useState<AuditProduct[]>([]);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const [dossierMarkdown, setDossierMarkdown] = useState<string>(() =>
    generateDeterministicDossier(initialReport)
  );
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSource, setAiSource] = useState("Calibrated diagnosis");
  const [copied, setCopied] = useState(false);

  // Keep the model's ranking when the owner edits an assumption. Recalculating
  // without it silently threw away the triage that ordered these leaks.
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

  // Ranked by size for the chart; the list below keeps the triage order.
  const ranked = useMemo(
    () => [...leaks].sort((a, b) => b.annualLossEuros - a.annualLossEuros),
    [leaks]
  );
  const maxLoss = Math.max(...leaks.map((l) => l.annualLossEuros), 1);
  const recoverShare = totalLoss > 0 ? Math.min(100, (recoverable / totalLoss) * 100) : 0;

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

  const resetParams = () => setParams(initialReport.params);

  const handleAddToCart = (product: AuditProduct) => {
    setCart((prev) => [...prev, product]);
    setOrderNotice(`Added ${product.name}`);
    setTimeout(() => setOrderNotice(null), 2500);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: TabId) => {
    const idx = TABS.findIndex((t) => t.id === current);
    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIdx = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIdx = (idx - 1 + TABS.length) % TABS.length;
    if (nextIdx !== idx) {
      e.preventDefault();
      const nextTab = TABS[nextIdx].id;
      setActiveTab(nextTab);
      document.getElementById(`tab-${nextTab}`)?.focus();
    }
  };

  /* Switching tab from up in the summary moves content the reader cannot see,
     so bring the tab bar to the top of the screen with it. */
  const goToTab = (id: TabId) => {
    setActiveTab(id);
    requestAnimationFrame(() => {
      document.getElementById("report-tabs")?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  const openLeak = (id: string) => {
    setShowDetails(true);
    setExpandedLeakId(id);
    requestAnimationFrame(() => {
      document.getElementById(`leak-${id}`)?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
    });
  };

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const p = typeof item.price === "number" ? item.price : parseFloat(String(item.price)) || 0;
        return sum + p;
      }, 0),
    [cart]
  );

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
          setAiSource(
            data.modelUsed ? `Written with Google Gemini (${data.modelUsed})` : "Drafted with Gemini"
          );
        }
      }
    } catch {
      // The deterministic dossier is already on screen.
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const copyDossier = () => {
    navigator.clipboard.writeText(dossierMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const auditedOn = new Date(audit.auditedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const feePct = params.comisionAgregadorPct;

  /* What kind of business this is decides the words on screen, nothing else.
     The engine fills it; the fallback keeps an older report rendering. */
  const verdict = useMemo(
    () => currentReport.vertical ?? classifyVertical(audit),
    [currentReport.vertical, audit]
  );
  const w = verdict.definition.words;
  const marketplaceNames = useMemo(() => {
    const fromLinks = (audit.marketplaces || []).map((m) => m.platform);
    return Array.from(new Set([...fromLinks, ...(audit.aggregators || [])]));
  }, [audit.marketplaces, audit.aggregators]);
  const platforms = listNames(marketplaceNames);
  const { money: eur, exact: money2, symbol: sym, heroNumber } = currencyTools(
    currentReport.currency || "EUR"
  );
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Bleed audit for ${audit.name}: the site is losing ${eur(totalLoss)} a year. Report: ${
      typeof window !== "undefined" ? window.location.href : ""
    }`
  )}`;
  const causes = plainCauseFor(w, w.marketplaceLabel);
  const econ = ECONOMIA_VERTICAL[verdict.id];
  const valueRange = stepperRange(
    Math.floor(econ.valorTransaccion.minimo * 0.5),
    Math.ceil(econ.valorTransaccion.maximo * 1.5),
    params.ticketMedio
  );
  const rateRange = stepperRange(
    Math.max(1, Math.floor(econ.transaccionesPorPeriodo.minimo)),
    Math.ceil(econ.transaccionesPorPeriodo.maximo * 2),
    params.pedidosDia
  );
  const trafficRange = stepperRange(100, 20000, params.visitasMes);
  const feeRange = stepperRange(
    Math.max(1, Math.floor(econ.comisionPlataforma.minimo * 0.5)),
    Math.ceil(econ.comisionPlataforma.maximo * 1.4),
    params.comisionAgregadorPct
  );
  const tactics = tacticsFor(w, platforms || w.marketplaceLabel);

  /* Four sentences, all built from what was measured: what is happening, what
     it costs, what it takes to stop it, and why the figures can be trusted. */
  const topLeak = ranked[0];
  const channels = audit.contactChannels || [];
  const canTransact = audit.ownOrder || channels.includes("checkout") || channels.includes("booking");
  const reachable = channels.filter((c) => c !== "checkout" && c !== "booking");
  const opening = platforms
    ? canTransact
      ? `Your site can already take ${w.transactions}, but it also hands ${w.customers} to ${platforms}, who keep ${feePct}% of every ${w.transaction}.`
      : `Your site sends ${w.customers} to ${platforms}, and they charge you ${feePct}% of the ${w.transaction} for the introduction.`
    : canTransact
    ? `Your site can already take ${w.transactions}. What it loses, it loses on the way there.`
    : reachable.length > 0
    ? `Your site can be reached — ${listNames(reachable)} — but we found no way to actually ${w.verb} on it, so a ${w.customer} who is ready has to wait for you to answer.`
    : `We found no way to ${w.verb} on this site and no way to contact you from it, so every ${w.customer} who arrives has to go and find a business that answers.`;
  const keptPerOrder = params.ticketMedio * (1 - feePct / 100);
  const feePerOrder = params.ticketMedio - keptPerOrder;

  return (
    <main className={styles.page} style={{ backgroundColor: "var(--tinta, #0e1113)", fontFamily: "var(--font-instrument, sans-serif)", overflowX: "hidden" }}>
      <FluidBackground totalLoss={totalLoss} />
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", textAlign: "center" }}>
        
        <h1 style={{ fontSize: "clamp(3rem, 8vw, 6rem)", color: "#fff", margin: "0 0 1rem 0", lineHeight: 1.1, letterSpacing: "-0.02em", animation: "entrar 0.6s ease-out" }}>
          {audit.name} is <br/><span style={{ color: "#ff4d4d" }}>Bleeding Money</span>
        </h1>
        
        <div style={{ display: "flex", gap: "2rem", margin: "4rem 0", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: "1200px" }}>
          
          {/* Card 1: Loss */}
          <div style={{ flex: "1 1 400px", background: "rgba(255, 77, 77, 0.1)", padding: "4rem 2rem", borderRadius: "32px", border: "2px solid rgba(255, 77, 77, 0.3)", backdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: "1.5rem", color: "#ff4d4d", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "1rem" }}>
              ⚠️ Annual Loss
            </div>
            <div style={{ fontSize: "clamp(4rem, 10vw, 8rem)", fontWeight: 800, color: "#ff4d4d", lineHeight: 1, letterSpacing: "-0.04em" }}>
              {sym}{heroNumber(heroValue)}
            </div>
            <div style={{ fontSize: "1.5rem", color: "rgba(255,255,255,0.7)", marginTop: "2rem", fontFamily: "var(--font-plex-mono, monospace)" }}>
              Money slipping through the cracks
            </div>
          </div>

          {/* Card 2: Recoverable */}
          <div style={{ flex: "1 1 400px", background: "rgba(0, 255, 136, 0.1)", padding: "4rem 2rem", borderRadius: "32px", border: "2px solid rgba(0, 255, 136, 0.3)", backdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: "1.5rem", color: "#00ff88", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "1rem" }}>
              ✅ Recoverable
            </div>
            <div style={{ fontSize: "clamp(4rem, 10vw, 8rem)", fontWeight: 800, color: "#00ff88", lineHeight: 1, letterSpacing: "-0.04em" }}>
              {eur(recoverable)}
            </div>
            <div style={{ fontSize: "1.5rem", color: "rgba(255,255,255,0.7)", marginTop: "2rem", fontFamily: "var(--font-plex-mono, monospace)" }}>
              Waiting to be claimed back
            </div>
          </div>

        </div>

        <div style={{ display: "flex", gap: "3rem", margin: "2rem 0", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ fontSize: "2.5rem", color: "#fff", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "3rem" }}>🚨</span> 
            <span><strong>{leaks.length}</strong> Leaks Found</span>
          </div>
          <div style={{ fontSize: "2.5rem", color: "#fff", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "3rem" }}>⏱</span> 
            <span><strong>{repairHours}h</strong> to Fix</span>
          </div>
        </div>

        
        <div style={{ width: '100%', maxWidth: '1000px', margin: '4rem auto' }}>
          <GravitySimulator />
        </div>
        
        <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          <CureEngine audit={audit} annualLoss={totalLoss} currency={sym} />
        </div>


        <div style={{ marginTop: "2rem", padding: "2rem", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-plex-mono, monospace)", fontSize: "1.1rem" }}>
          <div><strong>Assumption:</strong> {money2(params.ticketMedio)} avg transaction</div>
          <div><strong>Traffic:</strong> {params.visitasMes} visits/mo</div>
          <div><strong>Fee:</strong> {params.comisionAgregadorPct}% platform cut</div>
        </div>

      </div>
    </main>
  );
}
