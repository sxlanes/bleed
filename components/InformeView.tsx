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
    <main className={styles.page}>
      <FluidBackground totalLoss={totalLoss} />
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandName}>Bleed</span>
            <span className={styles.brandNote}>leak audit</span>
          </Link>
          <Link href="/" className={styles.newAudit}>
            Audit another site
          </Link>
        </header>

        <section className={styles.masthead}>
          <h1 className={styles.business}>
            {audit.name}
            <span className={styles.businessHost}>{audit.domain}</span>
          </h1>
          <p className={styles.context}>
            Audited {auditedOn}. {verdict.evidence} We read the live site, the path a {w.customer}{" "}
            takes to {w.verb}, and where it hands them to somebody else, then priced {leaks.length}{" "}
            {leaks.length === 1 ? "leak" : "leaks"} against figures measured on {audit.domain}.
            {audit.notRead && audit.notRead.length > 0 && (
              <> What we could not read: {audit.notRead.join(", ")}.</>
            )}
          </p>
          {audit.error && (
            <p className={styles.partial} role="status">
              {audit.error}
            </p>
          )}

          <div className={styles.heroRow}>
            <div>
              <p className={styles.heroLead}>This site is losing</p>
              <p className={styles.heroFigure}>
                <span className={styles.heroUnit}>{sym}</span>
                {heroNumber(heroValue)}
                <span className={styles.heroPer}>a year</span>
              </p>
            </div>

            <div className={styles.recover}>
              <div className={styles.recoverLabel}>Recoverable on your own channel</div>
              <div className={styles.recoverValue}>+{eur(recoverable)}</div>
              <div className={styles.recoverTrack}>
                <div className={styles.recoverFill} style={{ ["--w" as string]: `${recoverShare}%` }} />
              </div>
              <div className={styles.recoverFoot}>
                {Math.round(recoverShare)}% of what the site loses every year
              </div>
            </div>
          </div>

          <div className={styles.ledger}>
            <div className={styles.ledgerCell}>
              <div className={styles.ledgerLabel}>Every month</div>
              <div className={`${styles.ledgerValue} ${styles.ledgerLoss}`}>−{eur(totalLoss / 12)}</div>
            </div>
            <div className={styles.ledgerCell}>
              <div className={styles.ledgerLabel}>
                Saved on a {money2(params.ticketMedio)} {w.transaction}
              </div>
              <div className={`${styles.ledgerValue} ${styles.ledgerKeep}`}>+{money2(feePerOrder)}</div>
              <div className={styles.ledgerNote}>the platform&rsquo;s cut</div>
            </div>
            <div className={styles.ledgerCell}>
              <div className={styles.ledgerLabel}>Leaks found</div>
              <div className={styles.ledgerValue}>{leaks.length}</div>
            </div>
            <div className={styles.ledgerCell}>
              <div className={styles.ledgerLabel}>Work to fix them</div>
              <div className={styles.ledgerValue}>{repairHours} h</div>
              <div className={styles.ledgerNote}>our own estimate</div>
            </div>
          </div>
        </section>

        <section className={styles.summary} aria-label="Summary">
          <div className={styles.summaryText}>
            <h2 className={styles.summaryTitle}>In plain words</h2>
            <p>{opening}</p>
            {topLeak && (
              <p>
                Across {leaks.length} {leaks.length === 1 ? "finding" : "findings"} that comes to{" "}
                {eur(totalLoss)} a year. The biggest single one is {causes[topLeak.category] || DEFAULT_CAUSE}:{" "}
                {eur(topLeak.annualLossEuros)} a year on its own.
              </p>
            )}
            <p>
              None of this needs a new website. About {repairHours} hours of work on the one you
              have would keep roughly {eur(recoverable)} a year in your {w.place} instead.
            </p>
            <p className={styles.summaryFine}>
              Every figure below shows how it was measured and where the rate was published. If one
              does not match your business, change it and the whole page recalculates.
            </p>
          </div>

          <aside className={styles.next}>
            <div className={styles.nextLabel}>Start here</div>
            {topLeak && <p className={styles.nextText}>{topLeak.remedy}</p>}
            <button type="button" className={styles.nextButton} onClick={() => goToTab("plan")}>
              See the {repairHours}-hour plan
            </button>
          </aside>
        </section>

        <nav className={styles.tabs} id="report-tabs" aria-label="Report sections" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "leaks" && (
          <div id="panel-leaks" role="tabpanel" aria-labelledby="tab-leaks" className={styles.panel}>
            <div style={{ marginBottom: "3rem" }}>
              <GravitySimulator />
            </div>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>What each leak costs a year</h2>
                <p className={styles.sectionSub}>
                  Sorted by size. Select a bar to read the measurement, the formula and the source
                  behind it.
                </p>
              </div>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setShowTable((v) => !v)}
                aria-pressed={showTable}
              >
                {showTable ? "Show chart" : "Show table"}
              </button>
            </div>

            <div className={styles.chart}>
              {showTable ? (
                <table className={styles.table}>
                  <caption className="sr-only">Annual loss per leak</caption>
                  <thead>
                    <tr>
                      <th scope="col">Leak</th>
                      <th scope="col">Severity</th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Annual loss
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((leak) => (
                      <tr key={leak.id}>
                        <td>{leak.title}</td>
                        <td>{SEVERITY_LABEL[leak.severity]}</td>
                        <td className={styles.tableNum}>{eur(leak.annualLossEuros)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <>
                  <div className={`${styles.chartBody} ${isUpdating ? styles.chartStale : ""}`}>
                    {ranked.map((leak, i) => (
                      <button
                        key={leak.id}
                        type="button"
                        className={styles.rankRow}
                        onClick={() => openLeak(leak.id)}
                        title={`${leak.title}: ${eur(leak.annualLossEuros)} a year`}
                      >
                        <span className={styles.rankLabel}>
                          <span className={styles.rankName}>{shortLabel(leak.title)}</span>
                        </span>
                        <span className={styles.rankTrack}>
                          <span
                            className={styles.rankBar}
                            style={{
                              ["--w" as string]: `${Math.max(1.5, (leak.annualLossEuros / maxLoss) * 100)}%`,
                              ["--d" as string]: `${i * 70}ms`,
                            }}
                          />
                          <span className={styles.rankValue}>{eur(leak.annualLossEuros)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.axis}>
                    <span>{eur(0)}</span>
                    <span>{eur(maxLoss)} a year</span>
                  </div>
                </>
              )}
            </div>

            <section className={styles.assumeBar}>
              <button
                type="button"
                className={styles.assumeToggle}
                onClick={() => setShowAssumptions((v) => !v)}
                aria-expanded={showAssumptions}
              >
                <span>Assumptions behind these figures</span>
                <span className={styles.assumeHint}>
                  {money2(params.ticketMedio)} a {w.transaction}, {params.pedidosDia}{" "}
                  {w.rateLabel.toLowerCase()}, {params.visitasMes.toLocaleString("en-US")} visits a
                  month, {params.comisionAgregadorPct}% fee
                  <span
                    className={`${styles.chevron} ${showAssumptions ? styles.chevronOpen : ""}`}
                    aria-hidden
                  >
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path
                        d="M1 1.5 6 6.5l5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </button>

              {showAssumptions && (
                <div className={styles.assumeBody}>
                  <div className={styles.assumeIntro}>
                    <span>
                      These are sector defaults. Change them to your real numbers and every figure
                      on the page follows.
                      {updateMsg && (
                        <span className={styles.updateFlag} role="status" aria-live="polite">
                          {" "}
                          {updateMsg}
                        </span>
                      )}
                    </span>
                    <button type="button" onClick={resetParams} className={styles.ghostButton}>
                      Reset
                    </button>
                  </div>

                  <div className={styles.controls}>
                    <div className={styles.control}>
                      <div className={styles.controlLabel}>{w.valueLabel}</div>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          aria-label={`Lower the ${w.valueLabel.toLowerCase()}`}
                          onClick={() =>
                            handleParamChange(
                              "ticketMedio",
                              Math.max(valueRange.low, params.ticketMedio - valueRange.step)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          −
                        </button>
                        <span className={styles.stepperValue}>{money2(params.ticketMedio)}</span>
                        <button
                          type="button"
                          aria-label={`Raise the ${w.valueLabel.toLowerCase()}`}
                          onClick={() =>
                            handleParamChange(
                              "ticketMedio",
                              Math.min(valueRange.high, params.ticketMedio + valueRange.step)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className={styles.control}>
                      <div className={styles.controlLabel}>{w.rateLabel}</div>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          aria-label={`Fewer ${w.transactions}`}
                          onClick={() =>
                            handleParamChange(
                              "pedidosDia",
                              Math.max(rateRange.low, params.pedidosDia - rateRange.step)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          −
                        </button>
                        <span className={styles.stepperValue}>{params.pedidosDia}</span>
                        <button
                          type="button"
                          aria-label={`More ${w.transactions}`}
                          onClick={() =>
                            handleParamChange(
                              "pedidosDia",
                              Math.min(rateRange.high, params.pedidosDia + rateRange.step)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className={styles.control}>
                      <div className={styles.controlLabel}>Visits a month</div>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          aria-label="Fewer visits a month"
                          onClick={() =>
                            handleParamChange(
                              "visitasMes",
                              Math.max(trafficRange.low, params.visitasMes - 100)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          −
                        </button>
                        <span className={styles.stepperValue}>
                          {params.visitasMes.toLocaleString("en-US")}
                        </span>
                        <button
                          type="button"
                          aria-label="More visits a month"
                          onClick={() =>
                            handleParamChange(
                              "visitasMes",
                              Math.min(trafficRange.high, params.visitasMes + 100)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className={styles.control}>
                      <div className={styles.controlLabel}>Platform fee</div>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          aria-label="Lower the platform fee"
                          onClick={() =>
                            handleParamChange(
                              "comisionAgregadorPct",
                              Math.max(feeRange.low, params.comisionAgregadorPct - 1)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          −
                        </button>
                        <span className={styles.stepperValue}>{params.comisionAgregadorPct} %</span>
                        <button
                          type="button"
                          aria-label="Raise the platform fee"
                          onClick={() =>
                            handleParamChange(
                              "comisionAgregadorPct",
                              Math.min(feeRange.high, params.comisionAgregadorPct + 1)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className={styles.control}>
                      <div className={styles.controlLabel}>
                        {w.customers[0].toUpperCase() + w.customers.slice(1)} who would come direct
                      </div>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          aria-label={`Fewer ${w.customers} coming direct`}
                          onClick={() =>
                            handleParamChange(
                              "pctRecuperableCanalPropio",
                              Math.max(15, params.pctRecuperableCanalPropio - 5)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          −
                        </button>
                        <span className={styles.stepperValue}>{params.pctRecuperableCanalPropio} %</span>
                        <button
                          type="button"
                          aria-label={`More ${w.customers} coming direct`}
                          onClick={() =>
                            handleParamChange(
                              "pctRecuperableCanalPropio",
                              Math.min(70, params.pctRecuperableCanalPropio + 5)
                            )
                          }
                          className={styles.stepperButton}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className={styles.details}>
              <button
                type="button"
                className={styles.detailsToggle}
                onClick={() => setShowDetails((v) => !v)}
                aria-expanded={showDetails}
                aria-controls="leak-details"
              >
                <span className={styles.detailsTitle}>
                  Leak by leak, with the measurement and the source
                </span>
                <span className={styles.assumeHint}>
                  {showDetails ? "Hide" : "Show"} {leaks.length}{" "}
                  {leaks.length === 1 ? "finding" : "findings"}
                  <span
                    className={`${styles.chevron} ${showDetails ? styles.chevronOpen : ""}`}
                    aria-hidden
                  >
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path
                        d="M1 1.5 6 6.5l5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </button>
            </section>

            <section className={styles.leaks} id="leak-details" hidden={!showDetails}>
              {leaks.map((leak) => {
                const isExpanded = expandedLeakId === leak.id;
                const sevClass =
                  leak.severity === "critica"
                    ? styles.sevCritical
                    : leak.severity === "alta"
                    ? styles.sevHigh
                    : styles.sevMedium;

                return (
                  <article key={leak.id} id={`leak-${leak.id}`} className={styles.leak}>
                    <button
                      type="button"
                      className={styles.leakHead}
                      aria-expanded={isExpanded}
                      aria-controls={`leak-body-${leak.id}`}
                      onClick={() => setExpandedLeakId(isExpanded ? null : leak.id)}
                    >
                      <span className={styles.leakTitleWrap}>
                        <span className={styles.sev}>
                          <span className={`${styles.sevDot} ${sevClass}`} aria-hidden />
                          {SEVERITY_LABEL[leak.severity]}
                        </span>
                        <h3 className={styles.leakTitle}>{leak.title}</h3>
                      </span>
                      <span className={styles.leakAmounts}>
                        <span className={styles.leakAmount}>−{eur(leak.annualLossEuros)}</span>
                        <span
                          className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
                          aria-hidden
                        >
                          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                            <path
                              d="M1 1.5 6 6.5l5-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </span>
                    </button>

                    {isExpanded && (
                      <div className={styles.leakBody} id={`leak-body-${leak.id}`}>
                        <div>
                          <p className={styles.leakText}>{leak.explanation}</p>
                          <div className={styles.formula}>
                            <span className={styles.formulaLabel}>How the figure is built</span>
                            <code>{leak.formula}</code>
                          </div>

                          <div className={styles.remedy}>
                            <div className={styles.remedyHead}>
                              <span>The fix</span>
                              <span>{leak.remedyHours} h of work</span>
                            </div>
                            <div className={styles.remedyText}>{leak.remedy}</div>
                          </div>
                        </div>

                        <div>
                          {leak.assumptions.length > 0 && (
                            <>
                              <h4 className={styles.evidenceTitle}>
                                Evidence and sources ({leak.assumptions.length})
                              </h4>
                              <ul className={styles.evidence}>
                                {leak.assumptions.map((ass, i) => (
                                  <li key={i} className={styles.evidenceItem}>
                                    <div>
                                      {ass.label}: <span className={styles.evidenceValue}>{ass.value}</span>
                                    </div>
                                    <div className={styles.evidenceMeta}>
                                      {ass.citation}
                                      {ass.sourceUrl && (
                                        <>
                                          {" — "}
                                          <a
                                            href={ass.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.sourceLink}
                                          >
                                            source
                                          </a>
                                        </>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          </div>
        )}

        {activeTab === "channel" && (
          <div id="panel-channel" role="tabpanel" aria-labelledby="tab-channel" className={styles.panel}>
            <div className={styles.proofGrid}>
              <div className={styles.phone}>
                <div className={styles.phoneBar}>
                  <span>{audit.name}</span>
                  <span className={styles.phoneBarNote}>no fees</span>
                </div>

                <div className={styles.phoneLead}>
                  {w.verb[0].toUpperCase() + w.verb.slice(1)} direct, with nobody in between
                </div>

                {orderNotice && (
                  <div className={styles.notice} role="status" aria-live="polite">
                    {orderNotice}
                  </div>
                )}

                <div className={styles.products}>
                  {audit.storeApi === undefined || audit.storeApi === null ? (
                    <div className={styles.emptyState}>
                      <strong className={styles.emptyStateTitle}>
                        The {w.catalogue} is not readable
                      </strong>
                      This site does not publish its {w.catalogue} through an open endpoint, so we
                      cannot rebuild it here. Ten of the 132 sites in the field study do. We show
                      nothing rather than invent one.
                    </div>
                  ) : audit.products.length > 0 ? (
                    audit.products.map((prod) => (
                      <div key={prod.id} className={styles.product}>
                        {prod.image ? (
                          <img src={prod.image} alt="" className={styles.productImage} />
                        ) : (
                          <div className={styles.productImageEmpty} aria-hidden />
                        )}
                        <div>
                          <div className={styles.productName}>{prod.name}</div>
                          <div className={styles.productPrice}>
                            {typeof prod.price === "number" ? money2(prod.price) : `${prod.price} ${sym}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(prod)}
                          className={styles.addButton}
                          aria-label={`Add ${prod.name}`}
                        >
                          +
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      The catalogue for {audit.name} is still loading.
                    </div>
                  )}
                </div>

                <div className={styles.cart}>
                  <div className={styles.cartLine}>
                    <span>
                      {w.transaction[0].toUpperCase() + w.transaction.slice(1)} total ({cart.length}{" "}
                      {cart.length === 1 ? "item" : "items"})
                    </span>
                    <strong>{money2(cartTotal)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderNotice(
                        cart.length === 0
                          ? `Add something from the ${w.catalogue} first.`
                          : `A ${money2(cartTotal)} ${w.transaction} goes straight to the business. Fee paid: ${money2(0)}. Kept: ${money2(
                              cartTotal * (feePct / 100)
                            )} a platform would have taken.`
                      );
                      setTimeout(() => setOrderNotice(null), 6000);
                    }}
                    className={styles.orderButton}
                  >
                    Send it on WhatsApp
                  </button>
                </div>
              </div>

              <div className={styles.compareCard}>
                <h2 className={styles.sectionTitle}>
                  Where a {money2(params.ticketMedio)} {w.transaction} goes
                </h2>
                <p className={styles.sectionSub}>
                  The same {w.transaction} through a platform and through your own channel, at the
                  published rate of {feePct}%.
                </p>

                <div className={styles.split} role="img" aria-label={`Of every ${money2(params.ticketMedio)} ${w.transaction}, ${money2(feePerOrder)} goes to the platform and ${money2(keptPerOrder)} stays with the business`}>
                  <div className={styles.splitFee} style={{ ["--w" as string]: `${feePct}%` }} />
                  <div className={styles.splitKeep} />
                </div>
                <div className={styles.legend}>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendKey} ${styles.legendFee}`} aria-hidden />
                    Platform fee {money2(feePerOrder)}
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendKey} ${styles.legendKeep}`} aria-hidden />
                    Stays with you {money2(keptPerOrder)}
                  </span>
                </div>

                <div className={styles.compareGrid}>
                  <div className={`${styles.compareColumn} ${styles.compareColumnFee}`}>
                    <h3 className={styles.compareTitle}>
                      Through {platforms || w.marketplaceLabel}
                    </h3>
                    <ul className={styles.compareList}>
                      <li>
                        <strong>Fee</strong> {feePct}% of every {w.transaction}
                      </li>
                      <li>
                        <strong>You keep</strong> {money2(keptPerOrder)} of{" "}
                        {money2(params.ticketMedio)}
                      </li>
                      <li>
                        <strong>The {w.customer}</strong> belongs to the platform
                      </li>
                      <li>
                        <strong>You get paid</strong> every two weeks
                      </li>
                      <li>
                        <strong>Next time</strong> the platform can show them your competitor
                      </li>
                    </ul>
                  </div>

                  <div className={`${styles.compareColumn} ${styles.compareColumnDirect}`}>
                    <h3 className={styles.compareTitle}>Through your own channel</h3>
                    <ul className={styles.compareList}>
                      <li>
                        <strong>Fee</strong> none
                      </li>
                      <li>
                        <strong>You keep</strong> {money2(params.ticketMedio)} of{" "}
                        {money2(params.ticketMedio)}
                      </li>
                      <li>
                        <strong>The {w.customer}</strong> leaves you their phone number
                      </li>
                      <li>
                        <strong>You get paid</strong> at the till or by Bizum
                      </li>
                      <li>
                        <strong>Next time</strong> they come straight to your own domain
                      </li>
                    </ul>
                  </div>
                </div>

                <div className={styles.compareFoot}>
                  <div className={styles.recoverLabel}>
                    Over 100 {w.transactions} moved to your own channel
                  </div>
                  <div className={styles.compareFootValue}>
                    +{money2(100 * feePerOrder)} kept
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dossier" && (
          <div id="panel-dossier" role="tabpanel" aria-labelledby="tab-dossier" className={styles.panel}>
            <div className={styles.dossierActions}>
              <button
                type="button"
                onClick={handleGenerateGeminiDossier}
                disabled={isGeneratingAi}
                className={`${styles.action} ${styles.actionPrimary}`}
              >
                {isGeneratingAi ? "Writing with Gemini" : "Write it for this owner with Gemini"}
              </button>
              <button type="button" onClick={copyDossier} className={styles.action}>
                {copied ? "Copied" : "Copy as Markdown"}
              </button>
              <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer" className={styles.action}>
                Send on WhatsApp
              </a>
              <button type="button" onClick={() => window.print()} className={styles.action}>
                Print or save as PDF
              </button>
            </div>

            <div className={styles.dossierSource}>Source: {aiSource}</div>
            <article className={styles.dossier}>{renderMarkdown(dossierMarkdown)}</article>
            <CureEngine audit={audit} />
          </div>
        )}

        {activeTab === "plan" && (
          <div id="panel-plan" role="tabpanel" aria-labelledby="tab-plan" className={styles.panel}>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>What to do, in order</h2>
                <p className={styles.sectionSub}>
                  {repairHours} hours of work in total, biggest leak first.
                </p>
              </div>
            </div>

            <div className={styles.steps}>
              {leaks.map((leak, idx) => (
                <article key={leak.id} className={styles.step}>
                  <div className={styles.stepNumber}>{idx + 1}</div>
                  <div>
                    <h3 className={styles.stepTitle}>{leak.title}</h3>
                    <p className={styles.stepText}>{leak.remedy}</p>
                    <p className={styles.stepTactic}>{tactics[leak.category] || DEFAULT_TACTIC}</p>
                  </div>
                  <div className={styles.stepHours}>{leak.remedyHours} h</div>
                </article>
              ))}
            </div>
          </div>
        )}

        {initialReport.pipeline && (
          <section className={styles.provenance} aria-label="How this was analysed">
            <h2 className={styles.sectionTitle}>How this was analysed</h2>
            {initialReport.triage?.businessRead && (
              <p className={styles.provenanceRead}>{initialReport.triage.businessRead}</p>
            )}
            <div className={styles.stages}>
              {initialReport.pipeline.map((stage, idx) => (
                <div key={stage.id || idx} className={styles.stage}>
                  <div className={styles.stageLabel}>{stage.label}</div>
                  <div className={styles.stageDetail}>{stage.detail}</div>
                  <div className={styles.stageEngine}>
                    {stage.engine === "deterministic" ? "deterministic" : stage.engine}
                    {stage.ms ? ` · ${stage.ms} ms` : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className={styles.footer}>
          <span>
            Any business with a website, anywhere. Every figure names the source it came from.
          </span>
          <span>Built for the AI Builders Hackathon 2026.</span>
        </footer>
      </div>
    </main>
  );
}
