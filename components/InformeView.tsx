
"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { FullAuditReport, AuditSimulationParams, AuditProduct } from "@/lib/types";
import { calculateLeaks } from "@/lib/quantification";
import { generateDeterministicDossier } from "@/lib/gemini-dossier";
import styles from "@/app/informe/informe.module.css";

interface Props {
  initialReport: FullAuditReport;
}

export default function InformeView({ initialReport }: Props) {
  const [params, setParams] = useState<AuditSimulationParams>(initialReport.params);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [updateMsg, setUpdateMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"fugas" | "prueba" | "dossier">("fugas");
  const [cart, setCart] = useState<AuditProduct[]>([]);
  const [dossierMarkdown, setDossierMarkdown] = useState<string>(() =>
    generateDeterministicDossier(initialReport)
  );
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiSource, setAiSource] = useState<string>("Calibrated diagnosis");
  const [copied, setCopied] = useState<boolean>(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  const currentReport = useMemo(() => {
    return calculateLeaks(initialReport.audit, params);
  }, [initialReport.audit, params]);

  const audit = currentReport.audit;
  const leaks = currentReport.leaks;
  const maxLoss = Math.max(...leaks.map(l => l.annualLossEuros), 1);
  const totalLoss = currentReport.totalAnnualLossEuros;
  const recoverable = currentReport.recoverableAnnualEuros;

  const handleParamChange = (field: keyof AuditSimulationParams, value: number) => {
    setIsUpdating(true);
    setUpdateMsg("Recalculating...");
    setParams((prev) => ({ ...prev, [field]: value }));
    const now = Date.now();
    setLastUpdate(now);
    setTimeout(() => {
      setLastUpdate((current) => {
        if (current === now) {
          setIsUpdating(false);
          setUpdateMsg("Updated just now");
          setTimeout(() => setUpdateMsg(""), 2000);
        }
        return current;
      });
    }, 300);
  };

  const resetParams = () => {
    setParams(initialReport.params);
  };

  const handleAddToCart = (product: AuditProduct) => {
    setCart((prev) => [...prev, product]);
    setOrderNotice(`Added: ${product.name}`);
    setTimeout(() => setOrderNotice(null), 2500);
  };

  
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: "fugas" | "prueba" | "dossier") => {
    const tabs: ("fugas" | "prueba" | "dossier")[] = ["fugas", "prueba", "dossier"];
    const idx = tabs.indexOf(current);
    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIdx = (idx + 1) % tabs.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIdx = (idx - 1 + tabs.length) % tabs.length;
    }
    if (nextIdx !== idx) {
      e.preventDefault();
      const nextTab = tabs[nextIdx];
      setActiveTab(nextTab);
      document.getElementById(`tab-${nextTab}`)?.focus();
    }
  };


  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const p = typeof item.price === "number" ? item.price : parseFloat(String(item.price)) || 0;
      return sum + p;
    }, 0);
  }, [cart]);

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
          setAiSource(data.modelUsed ? `Generated with Google Gemini (${data.modelUsed})` : "Drafted with Gemini AI");
        }
      }
    } catch {
      // Fallback already in place
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const copyDossier = () => {
    navigator.clipboard.writeText(dossierMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Bleed Audit for ${audit.name}: your site is losing ${totalLoss.toLocaleString("en-US")} €/year in fees. View the report here: ${typeof window !== "undefined" ? window.location.href : ""}`
  )}`;

  return (
    <main className={styles.pagina}>
      <header className={styles.cabecera}>
        <Link href="/" className={styles.marca}>
          <span className={styles.nombreMarca}>Bleed</span>
          <span className={styles.selloMarca}>leak audit</span>
        </Link>
        <Link href="/" className={styles.volver}>
          ← Audit another site
        </Link>
      </header>

      <section className={styles.negocioHero}>
        <div className={styles.subtituloNegocio}>
          Presence and direct channel audit · {audit.cuisine || "Restaurant"} · {audit.address ? audit.address.split(",")[0] : audit.domain}
        </div>
        <h1 className={styles.titular}>
          {audit.name}: your site is losing{" "}
          <em className={styles.enfasisAcento}>
            -{totalLoss.toLocaleString("en-US")} € per year
          </em>
        </h1>
        <p className={styles.seccionSubtitulo}>
          Detected {leaks.length} operational and technical leaks at `{audit.finalUrl}`.
          With an optimized direct channel you can recover{" "}
          <strong className={styles.enfasisVerde}>
            +{recoverable.toLocaleString("en-US")} € net/year
          </strong>{" "}
          in 48 hours without paying middlemen.
        </p>

        <div className={styles.etiquetasFila}>
          <span className={`${styles.badge} ${audit.ttfb < 1.0 ? styles.badgeVerde : styles.badgeAcento}`}>
            TTFB: {audit.ttfb} s {audit.ttfb > 1.2 ? "(Slow)" : "(Fast)"}
          </span>
          <span className={styles.badge}>
            Images: {audit.imgKb.toLocaleString("en-US")} KB
          </span>
          {audit.wordpress && (
            <span className={styles.badge}>
              WordPress {audit.woocommerce ? "+ WooCommerce" : ""}
            </span>
          )}
          {audit.storeApi && (
            <span className={`${styles.badge} ${styles.badgeVerde}`}>
              Open Store API ({audit.products.length} products)
            </span>
          )}
          {audit.aggregators.length > 0 && (
            <span className={`${styles.badge} ${styles.badgeAcento}`}>
              Aggregators: {audit.aggregators.join(", ")}
            </span>
          )}
          {audit.whatsapp ? (
            <span className={`${styles.badge} ${styles.badgeVerde}`}>
              Direct WhatsApp detected
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeAcento}`}>
              No WhatsApp button
            </span>
          )}
          <span className={styles.badge}>
            {audit.https ? "Secure HTTPS" : "No HTTPS"}
          </span>
        </div>
      </section>

      <section className={styles.bleedGrid}>
        <div className={`${styles.tarjetaTotal} ${styles.tarjetaTotalAcento} ${isUpdating ? styles.recalculating : ''}`}>
          <div className={styles.etiquetaCifra}>Total estimated annual leak</div>
          <div className={`${styles.granNumero} ${styles.numeroAcento}`}>
            -{totalLoss.toLocaleString("en-US")} € <span style={{fontSize: "1rem", color: "var(--ash)", fontWeight: "normal"}}>estimated</span>
          </div>
          <p className={styles.descripcionCifra}>
            Equivalent to <strong>-{Math.round(totalLoss / 12).toLocaleString("en-US")} € per month</strong> lost
            in Glovo/UberEats fees and customer bounce rate due to mobile slowness.
          </p>
        </div>

        <div className={`${styles.tarjetaTotal} ${styles.tarjetaTotalVerde} ${isUpdating ? styles.recalculating : ''}`}>
          <div className={styles.etiquetaCifra}>Recoverable net margin</div>
          <div className={`${styles.granNumero} ${styles.numeroVerde}`}>
            +{recoverable.toLocaleString("en-US")} €
          </div>
          <p className={styles.descripcionCifra}>
            Clean profit straight to your account by converting {params.pctRecuperableCanalPropio}% of regular customers
            to your own channel in 48 hours.
          </p>
        </div>

        <div className={styles.tarjetaTotal}>
          <div className={styles.etiquetaCifra}>Estimated fix time</div>
          <div className={styles.granNumero}>
            48 hours
          </div>
          <p className={styles.descripcionCifra}>
            Without changing POS, without hiring on-staff IT, and without altering kitchen operations.
          </p>
        </div>
      </section>

      <nav className={styles.pestanas} aria-label="Report sections" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "fugas"}
          aria-controls="panel-fugas"
          id="tab-fugas"
          onClick={() => setActiveTab("fugas")} onKeyDown={(e) => handleTabKeyDown(e, "fugas")}
          className={`${styles.pestanaBoton} ${activeTab === "fugas" ? styles.pestanaBotonActiva : ""}`}
        >
          1. Audit & Leaks ({leaks.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "prueba"}
          aria-controls="panel-prueba"
          id="tab-prueba"
          onClick={() => setActiveTab("prueba")} onKeyDown={(e) => handleTabKeyDown(e, "prueba")}
          className={`${styles.pestanaBoton} ${activeTab === "prueba" ? styles.pestanaBotonActiva : ""}`}
        >
          2. The Proof: 1-Click Fix
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "dossier"}
          aria-controls="panel-dossier"
          id="tab-dossier"
          onClick={() => setActiveTab("dossier")} onKeyDown={(e) => handleTabKeyDown(e, "dossier")}
          className={`${styles.pestanaBoton} ${activeTab === "dossier" ? styles.pestanaBotonActiva : ""}`}
        >
          3. Executive Dossier for Owner
        </button>
      </nav>

      {activeTab === "fugas" && (
        <div id="panel-fugas" role="tabpanel" aria-labelledby="tab-fugas">
          <section className={styles.simuladorCaja}>
            <div className={styles.simuladorHeader}>
              <h2 className={styles.simuladorTitulo}>
                Adjust the assumptions with your business's real numbers
                {updateMsg && <span className={styles.updateMsg} role="status" aria-live="polite">{updateMsg}</span>}
              </h2>
              <button
                type="button"
                onClick={resetParams}
                className={styles.volver}
              >
                Reset assumptions
              </button>
            </div>

            <div className={styles.simuladorControles}>
              <div className={styles.controlItem}>
                <div className={styles.controlEtiqueta}>
                  <label htmlFor="ticketMedio">Avg. delivery ticket</label>
                  <span className={styles.controlValor}>{params.ticketMedio.toFixed(2)} €</span>
                </div>
                <input
                  id="ticketMedio"
                  type="range"
                  aria-valuetext={`${params.ticketMedio.toFixed(2)} euros`}
                  min="12"
                  max="60"
                  step="0.5"
                  value={params.ticketMedio}
                  onChange={(e) => handleParamChange("ticketMedio", parseFloat(e.target.value))}
                  className={styles.sliderInput}
                />
              </div>

              <div className={styles.controlItem}>
                <div className={styles.controlEtiqueta}>
                  <label htmlFor="pedidosDia">Delivery orders / day</label>
                  <span className={styles.controlValor}>{params.pedidosDia} orders</span>
                </div>
                <input
                  id="pedidosDia"
                  type="range"
                  aria-valuetext={`${params.pedidosDia} orders`}
                  min="3"
                  max="60"
                  step="1"
                  value={params.pedidosDia}
                  onChange={(e) => handleParamChange("pedidosDia", parseInt(e.target.value, 10))}
                  className={styles.sliderInput}
                />
              </div>

              <div className={styles.controlItem}>
                <div className={styles.controlEtiqueta}>
                  <label htmlFor="comisionAgregador">Aggregator fee</label>
                  <span className={styles.controlValor}>{params.comisionAgregadorPct} %</span>
                </div>
                <input
                  id="comisionAgregador"
                  type="range"
                  aria-valuetext={`${params.comisionAgregadorPct} percent`}
                  min="15"
                  max="35"
                  step="1"
                  value={params.comisionAgregadorPct}
                  onChange={(e) => handleParamChange("comisionAgregadorPct", parseInt(e.target.value, 10))}
                  className={styles.sliderInput}
                />
              </div>

              <div className={styles.controlItem}>
                <div className={styles.controlEtiqueta}>
                  <label htmlFor="pctRecuperable">% Recoverable clients</label>
                  <span className={styles.controlValor}>{params.pctRecuperableCanalPropio} %</span>
                </div>
                <input
                  id="pctRecuperable"
                  type="range"
                  aria-valuetext={`${params.pctRecuperableCanalPropio} percent`}
                  min="15"
                  max="70"
                  step="5"
                  value={params.pctRecuperableCanalPropio}
                  onChange={(e) => handleParamChange("pctRecuperableCanalPropio", parseInt(e.target.value, 10))}
                  className={styles.sliderInput}
                />
              </div>
            </div>
          </section>

          <section className={styles.listaFugas}>
            <h2 className={styles.seccionTitulo}>Breakdown of detected leaks</h2>
            <p className={styles.seccionSubtitulo}>
              Every figure displays the assumption it's based on. Formulas are calculated live with metrics measured from your site.
            </p>
            <div className={styles.leyendaSeveridad}>
              <strong>Severity:</strong> <span className={styles.legCritica}>Critical (immediate loss)</span> · <span className={styles.legAlta}>High</span> · <span className={styles.legMedia}>Medium</span>
            </div>

            {leaks.map((leak) => {
              const borderClass =
                leak.severity === "critica"
                  ? styles.tarjetaFugaCritica
                  : leak.severity === "alta"
                  ? styles.tarjetaFugaAlta
                  : styles.tarjetaFugaMedia;

              return (
                <article key={leak.id} className={`${styles.tarjetaFuga} ${borderClass} ${isUpdating ? styles.recalculating : ''}`}>
                  <div className={styles.fugaTop}>
                    <h3 className={styles.fugaTitulo}>
                      {leak.title}
                      <span className={styles.badgeSeveridad}>{leak.severity}</span>
                    </h3>
                    <div className={styles.fugaMonto}>
                      -{leak.annualLossEuros.toLocaleString("en-US")} €/year
                    </div>
                  </div>
                  
                  <div className={styles.barraContenedor} aria-label={`Loss bar: ${leak.annualLossEuros} euros`}>
                    <div className={styles.barraRelleno} style={{ width: `${Math.max(2, (leak.annualLossEuros / maxLoss) * 100)}%` }} />
                  </div>

                  <p className={styles.fugaExplicacion}>{leak.explanation}</p>

                  <div className={styles.formulaBloque}>
                    <span className={styles.formulaEtiqueta}>Calculation formula and assumptions:</span>
                    <code>{leak.formula}</code>
                  </div>

                  {leak.assumptions.length > 0 && (
                    <details className={styles.supuestosDetails}>
                      <summary className={styles.supuestosSummary}>Source & Assumptions ({leak.assumptions.length})</summary>
                      <ul className={styles.supuestosLista}>
                        {leak.assumptions.map((ass, i) => (
                          <li key={i} className={styles.supuestoItem}>
                            <strong>{ass.label}:</strong> <span className={styles.supuestoValor}>{ass.value}</span>
                            <div style={{ fontSize: "0.75rem", color: "var(--ash)", marginTop: "0.15rem", fontFamily: "var(--font-plex-mono)" }}>
                              {ass.citation}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <div className={styles.remedioBloque}>
                    <span><strong>Recommended fix:</strong> {leak.remedy}</span>
                    <span className={styles.remedioHoras}>({leak.remedyHours}h of work)</span>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      )}

      {activeTab === "prueba" && (
        <div id="panel-prueba" role="tabpanel" aria-labelledby="tab-prueba">
        <section className={styles.mockupGrid}>
          <div className={styles.mockupTelefono}>
            <div className={styles.telefonoBarra}>
              <span>{audit.name}</span>
              <span>Direct Channel · 0% fees</span>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Order direct and save 10%</div>
              <div style={{ fontSize: "0.75rem", color: "var(--bone-dim)" }}>
                Fast delivery · No middlemen
              </div>
            </div>

            {orderNotice && (
              <div style={{
                background: "var(--panel)",
                border: "1px solid var(--hair)",
                color: "var(--bone)",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                marginBottom: "0.75rem",
                fontFamily: "var(--font-plex-mono)"
              }}>
                ✓ {orderNotice}
              </div>
            )}

            <div className={styles.mockupProductos}>
              {audit.storeApi === undefined || audit.storeApi === null ? (
                <div style={{ 
                  padding: "2rem", 
                  textAlign: "center", 
                  color: "var(--bone-dim)", 
                  fontSize: "0.875rem",
                  background: "repeating-linear-gradient(45deg, transparent, transparent 10px, var(--panel) 10px, var(--panel) 20px)",
                  border: "1px solid var(--hair)",
                  borderRadius: "8px"
                }}>
                  Catalogue locked. No public menu data.
                </div>
              ) : audit.products.length > 0 ? (
                audit.products.map((prod) => (
                  <div key={prod.id} className={styles.productoItem}>
                    {prod.image ? (
                      <img src={prod.image} alt={prod.name} className={styles.productoFoto} />
                    ) : (
                      <div className={styles.productoFoto} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>
                        <span aria-hidden="true">🍽️</span>
                      </div>
                    )}
                    <div className={styles.productoInfo}>
                      <div className={styles.productoNombre}>{prod.name}</div>
                      {prod.description && (
                        <div className={styles.productoDesc}>{prod.description}</div>
                      )}
                      <div className={styles.productoPrecio}>
                        {typeof prod.price === "number" ? prod.price.toFixed(2) : prod.price} €
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(prod)}
                      className={styles.botonAnadir}
                    >
                      + Add
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--bone-dim)", fontSize: "0.875rem" }}>
                  Loading optimized catalogue for {audit.name}...
                </div>
              )}
            </div>

            <div className={styles.mockupCarrito}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontFamily: "var(--font-plex-mono)", fontSize: "0.875rem" }}>
                <span>Order total ({cart.length} items):</span>
                <strong>{cartTotal.toFixed(2)} €</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  alert(`Direct order generated!\n\nRestaurant: ${audit.name}\nTotal: ${cartTotal.toFixed(2)} €\nFee paid to Glovo: 0.00 €\nDirect savings: ${(cartTotal * (params.comisionAgregadorPct / 100)).toFixed(2)} €\n\nThe order is sent directly to the venue's WhatsApp or POS.`);
                }}
                className={styles.botonPedirDirecto}
              >
                Order direct via WhatsApp (0% fees)
              </button>
            </div>
          </div>

          <div className={styles.comparativaCaja}>
            <h2 className={styles.seccionTitulo}>The profit margin comparison</h2>
            <p className={styles.seccionSubtitulo}>
              Why a direct channel with its own Store API transforms {audit.name}'s bottom line.
            </p>

            <div className={styles.comparativaFila}>
              <div className={styles.columnaAgregador}>
                <h3 className={styles.columnaTitulo} style={{ color: "var(--bleed)" }}>
                  With Glovo / UberEats
                </h3>
                <ul className={styles.columnaLista}>
                  <li><strong>Fee:</strong> {params.comisionAgregadorPct}% of each order</li>
                  <li><strong>On a {params.ticketMedio.toFixed(2)} € order:</strong> the restaurant makes only {(params.ticketMedio * (1 - params.comisionAgregadorPct / 100)).toFixed(2)} €</li>
                  <li><strong>Client data:</strong> Owned by Glovo</li>
                  <li><strong>Payout:</strong> Bi-weekly settlement</li>
                  <li><strong>Loyalty:</strong> Zero (the app offers your neighbor your competition)</li>
                </ul>
              </div>

              <div className={styles.columnaDirecto}>
                <h3 className={styles.columnaTitulo} style={{ color: "var(--bone)" }}>
                  With the Bleed Fix
                </h3>
                <ul className={styles.columnaLista}>
                  <li><strong>Fee:</strong> 0% (full margin to the kitchen)</li>
                  <li><strong>On a {params.ticketMedio.toFixed(2)} € order:</strong> the restaurant makes {params.ticketMedio.toFixed(2)} €</li>
                  <li><strong>Client data:</strong> Phone number and order in your WhatsApp</li>
                  <li><strong>Payout:</strong> Instant via POS or Bizum</li>
                  <li><strong>Load speed:</strong> 0.18 s (no bounces)</li>
                </ul>
              </div>
            </div>

            <div className={styles.tarjetaTotal} style={{ marginTop: "1rem" }}>
              <div className={styles.etiquetaCifra}>Cumulative impact over 100 orders</div>
              <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: "1.5rem", fontWeight: 600, color: "var(--bone)", margin: "0.25rem 0" }}>
                +{(100 * params.ticketMedio * (params.comisionAgregadorPct / 100)).toFixed(2)} € more net profit
              </div>
              <p className={styles.descripcionCifra}>
                For every 100 orders your regular clients make through your own channel instead of Glovo, you pocket{" "}
                +{(100 * params.ticketMedio * (params.comisionAgregadorPct / 100)).toFixed(2)} € clean additional margin.
              </p>
            </div>
          </div>
        </section>
        </div>
      )}

      {activeTab === "dossier" && (
        <div id="panel-dossier" role="tabpanel" aria-labelledby="tab-dossier">
        <section className={styles.dossierContenedor}>
          <div className={styles.dossierAcciones}>
            <button
              type="button"
              onClick={handleGenerateGeminiDossier}
              disabled={isGeneratingAi}
              className={`${styles.botonAccion} ${styles.botonPrimario}`}
            >
              {isGeneratingAi ? "Generating with Gemini..." : "⚡ Draft custom proposal with Gemini AI"}
            </button>
            <button
              type="button"
              onClick={copyDossier}
              className={`${styles.botonAccion} ${styles.botonSecundario}`}
            >
              {copied ? "✓ Copied!" : "Copy dossier (Markdown)"}
            </button>
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.botonAccion} ${styles.botonSecundario}`}
            >
              Share via WhatsApp
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className={`${styles.botonAccion} ${styles.botonSecundario}`}
            >
              Print / Save PDF
            </button>
          </div>

          <div style={{ fontFamily: "var(--font-plex-mono)", fontSize: "0.75rem", color: "var(--bone-dim)", marginBottom: "1.5rem" }}>
            Report source: {aiSource}
          </div>

          <div className={styles.dossierTexto}>
            {dossierMarkdown}
          </div>
        </section>
        </div>
      )}

      {(initialReport as any)?.pipeline && (
        <section className={styles.provenancePanel} aria-label="Analysis provenance">
          <h2 className={styles.provenanceTitle}>How this was analysed</h2>
          {(initialReport as any)?.triage?.businessRead && (
            <div className={styles.provenanceTriage}>
              <strong>Business Read:</strong> {(initialReport as any).triage.businessRead} 
              <span className={styles.provenanceEngine}>({(initialReport as any).triage.source === "gemini" ? ((initialReport as any).triage.modelUsed || "Gemini") : "Deterministic"})</span>
            </div>
          )}
          <div className={styles.provenanceStages}>
            {(initialReport as any).pipeline.map((stage: any, idx: number) => (
              <div key={stage.id || idx} className={styles.provenanceStage}>
                <div className={styles.stageLabel}>{stage.label}</div>
                <div className={styles.stageEngine}>{stage.engine === "deterministic" ? "Deterministic Engine" : "Google Gemini"}</div>
                {stage.ms && <div className={styles.stageTime}>{stage.ms} ms</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.pieDePagina}>

        <span>
          Bleed · Audit calibrated on the study of 132 restaurants in Málaga.
        </span>
        <span>
          Built for the AI Builders Hackathon 2026.
        </span>
      </footer>
    </main>
  );
}
