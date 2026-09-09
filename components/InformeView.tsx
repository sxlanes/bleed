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
  const [activeTab, setActiveTab] = useState<"fugas" | "prueba" | "dossier">("fugas");
  const [cart, setCart] = useState<AuditProduct[]>([]);
  const [dossierMarkdown, setDossierMarkdown] = useState<string>(() =>
    generateDeterministicDossier(initialReport)
  );
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiSource, setAiSource] = useState<string>("Diagnóstico calibrado");
  const [copied, setCopied] = useState<boolean>(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  // Recalculate report live when simulation params change
  const currentReport = useMemo(() => {
    return calculateLeaks(initialReport.audit, params);
  }, [initialReport.audit, params]);

  const audit = currentReport.audit;
  const leaks = currentReport.leaks;
  const totalLoss = currentReport.totalAnnualLossEuros;
  const recoverable = currentReport.recoverableAnnualEuros;

  const handleParamChange = (field: keyof AuditSimulationParams, value: number) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  const resetParams = () => {
    setParams(initialReport.params);
  };

  const handleAddToCart = (product: AuditProduct) => {
    setCart((prev) => [...prev, product]);
    setOrderNotice(`Añadido: ${product.name}`);
    setTimeout(() => setOrderNotice(null), 2500);
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
          setAiSource(data.modelUsed ? `Generado con Google Gemini (${data.modelUsed})` : "Redactado con Gemini AI");
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
    `Auditoría Bleed para ${audit.name}: tu web está perdiendo ${totalLoss.toLocaleString("es-ES")} €/año en comisiones. Consulta el informe aquí: ${typeof window !== "undefined" ? window.location.href : ""}`
  )}`;

  return (
    <main className={styles.pagina}>
      {/* Cabecera */}
      <header className={styles.cabecera}>
        <Link href="/" className={styles.marca}>
          <span className={styles.nombreMarca}>Bleed</span>
          <span className={styles.selloMarca}>auditoría de fugas</span>
        </Link>
        <Link href="/" className={styles.volver}>
          ← Auditar otra web
        </Link>
      </header>

      {/* Titular y Badges del Negocio */}
      <section className={styles.negocioHero}>
        <div className={styles.subtituloNegocio}>
          Auditoría de presencia y canal directo · {audit.domain}
        </div>
        <h1 className={styles.titular}>
          {audit.name}: tu web pierde{" "}
          <em className={styles.enfasisAcento}>
            -{totalLoss.toLocaleString("es-ES")} € al año
          </em>
        </h1>
        <p className={styles.seccionSubtitulo}>
          Detectadas {leaks.length} fugas operativas y técnicas en `{audit.finalUrl}`.
          Con un canal directo optimizado puedes rescatar{" "}
          <strong className={styles.enfasisVerde}>
            +{recoverable.toLocaleString("es-ES")} € limpios/año
          </strong>{" "}
          en 48 horas sin pagar intermediarios.
        </p>

        {/* Fila de Insignias Técnicas */}
        <div className={styles.etiquetasFila}>
          <span className={`${styles.badge} ${audit.ttfb < 1.0 ? styles.badgeVerde : styles.badgeAcento}`}>
            TTFB: {audit.ttfb} s {audit.ttfb > 1.2 ? "(Lento)" : "(Rápido)"}
          </span>
          <span className={styles.badge}>
            Imágenes: {audit.imgKb.toLocaleString("es-ES")} KB
          </span>
          {audit.wordpress && (
            <span className={styles.badge}>
              WordPress {audit.woocommerce ? "+ WooCommerce" : ""}
            </span>
          )}
          {audit.storeApi && (
            <span className={`${styles.badge} ${styles.badgeVerde}`}>
              Store API abierta ({audit.products.length} productos)
            </span>
          )}
          {audit.aggregators.length > 0 && (
            <span className={`${styles.badge} ${styles.badgeAcento}`}>
              Agregadores: {audit.aggregators.join(", ")}
            </span>
          )}
          {audit.whatsapp ? (
            <span className={`${styles.badge} ${styles.badgeVerde}`}>
              WhatsApp directo detectado
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeAcento}`}>
              Sin botón WhatsApp
            </span>
          )}
          <span className={styles.badge}>
            {audit.https ? "HTTPS Seguro" : "Sin HTTPS"}
          </span>
        </div>
      </section>

      {/* Tarjetas de Resumen Financiero */}
      <section className={styles.bleedGrid}>
        <div className={`${styles.tarjetaTotal} ${styles.tarjetaTotalAcento}`}>
          <div className={styles.etiquetaCifra}>Fuga anual total estimada</div>
          <div className={`${styles.granNumero} ${styles.numeroAcento}`}>
            -{totalLoss.toLocaleString("es-ES")} €
          </div>
          <p className={styles.descripcionCifra}>
            Equivale a <strong>-{Math.round(totalLoss / 12).toLocaleString("es-ES")} € al mes</strong> perdidos
            en comisiones de Glovo/UberEats y rebote de clientes por lentitud en móvil.
          </p>
        </div>

        <div className={`${styles.tarjetaTotal} ${styles.tarjetaTotalVerde}`}>
          <div className={styles.etiquetaCifra}>Margen neto recuperable</div>
          <div className={`${styles.granNumero} ${styles.numeroVerde}`}>
            +{recoverable.toLocaleString("es-ES")} €
          </div>
          <p className={styles.descripcionCifra}>
            Beneficio limpio directo a tu cuenta al convertir el {params.pctRecuperableCanalPropio} % de clientes
            habituales a tu canal propio en 48 horas.
          </p>
        </div>

        <div className={styles.tarjetaTotal}>
          <div className={styles.etiquetaCifra}>Tiempo estimado de arreglo</div>
          <div className={styles.granNumero}>
            48 horas
          </div>
          <p className={styles.descripcionCifra}>
            Sin cambiar de TPV, sin contratar informáticos a nómina y sin alterar la operativa de la cocina.
          </p>
        </div>
      </section>

      {/* Pestañas de Navegación */}
      <nav className={styles.pestanas} aria-label="Secciones del informe">
        <button
          type="button"
          onClick={() => setActiveTab("fugas")}
          className={`${styles.pestanaBoton} ${activeTab === "fugas" ? styles.pestanaBotonActiva : ""}`}
        >
          1. Auditoría y Fugas ({leaks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("prueba")}
          className={`${styles.pestanaBoton} ${activeTab === "prueba" ? styles.pestanaBotonActiva : ""}`}
        >
          2. La Prueba: Fix en 1 Clic
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("dossier")}
          className={`${styles.pestanaBoton} ${activeTab === "dossier" ? styles.pestanaBotonActiva : ""}`}
        >
          3. Dossier Ejecutivo para el Dueño
        </button>
      </nav>

      {/* CONTENIDO PESTAÑA 1: FUGAS Y SIMULADOR */}
      {activeTab === "fugas" && (
        <>
          {/* Calculadora de Simulación */}
          <section className={styles.simuladorCaja}>
            <div className={styles.simuladorHeader}>
              <h2 className={styles.simuladorTitulo}>
                Ajusta los supuestos con los números reales de tu negocio
              </h2>
              <button
                type="button"
                onClick={resetParams}
                className={styles.volver}
              >
                Restablecer supuestos
              </button>
            </div>

            <div className={styles.simuladorControles}>
              <div className={styles.controlItem}>
                <div className={styles.controlEtiqueta}>
                  <label htmlFor="ticketMedio">Ticket medio delivery</label>
                  <span className={styles.controlValor}>{params.ticketMedio.toFixed(2)} €</span>
                </div>
                <input
                  id="ticketMedio"
                  type="range"
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
                  <label htmlFor="pedidosDia">Pedidos a domicilio / día</label>
                  <span className={styles.controlValor}>{params.pedidosDia} pedidos</span>
                </div>
                <input
                  id="pedidosDia"
                  type="range"
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
                  <label htmlFor="comisionAgregador">Comisión agregador</label>
                  <span className={styles.controlValor}>{params.comisionAgregadorPct} %</span>
                </div>
                <input
                  id="comisionAgregador"
                  type="range"
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
                  <label htmlFor="pctRecuperable">% Clientes recuperables</label>
                  <span className={styles.controlValor}>{params.pctRecuperableCanalPropio} %</span>
                </div>
                <input
                  id="pctRecuperable"
                  type="range"
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

          {/* Lista de Fugas Detalladas */}
          <section className={styles.listaFugas}>
            <h2 className={styles.seccionTitulo}>Desglose de fugas detectadas</h2>
            <p className={styles.seccionSubtitulo}>
              Cada cifra enseña el supuesto del que sale. Las fórmulas se calculan en vivo con las métricas medidas de tu web.
            </p>

            {leaks.map((leak) => {
              const borderClass =
                leak.severity === "critica"
                  ? styles.tarjetaFugaCritica
                  : leak.severity === "alta"
                  ? styles.tarjetaFugaAlta
                  : styles.tarjetaFugaMedia;

              return (
                <article key={leak.id} className={`${styles.tarjetaFuga} ${borderClass}`}>
                  <div className={styles.fugaTop}>
                    <h3 className={styles.fugaTitulo}>{leak.title}</h3>
                    <div className={styles.fugaMonto}>
                      -{leak.annualLossEuros.toLocaleString("es-ES")} €/año
                    </div>
                  </div>

                  <p className={styles.fugaExplicacion}>{leak.explanation}</p>

                  <div className={styles.formulaBloque}>
                    <span className={styles.formulaEtiqueta}>Fórmula de cálculo y supuestos:</span>
                    <code>{leak.formula}</code>
                  </div>

                  {leak.assumptions.length > 0 && (
                    <ul className={styles.supuestosLista}>
                      {leak.assumptions.map((ass, i) => (
                        <li key={i} className={styles.supuestoItem}>
                          <strong>{ass.label}:</strong> <span className={styles.supuestoValor}>{ass.value}</span> · <em>{ass.citation}</em>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className={styles.remedioBloque}>
                    <span><strong>Solución recomendada:</strong> {leak.remedy}</span>
                    <span className={styles.remedioHoras}>({leak.remedyHours}h de trabajo)</span>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      {/* CONTENIDO PESTAÑA 2: LA PRUEBA / MOCKUP DEL FIX */}
      {activeTab === "prueba" && (
        <section className={styles.mockupGrid}>
          {/* Columna Izquierda: Teléfono con Mockup Real */}
          <div className={styles.mockupTelefono}>
            <div className={styles.telefonoBarra}>
              <span>{audit.name}</span>
              <span>Canal Directo · 0% comisiones</span>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Pide directo y ahórrate el 10%</div>
              <div style={{ fontSize: "0.75rem", color: "var(--papel-debil)" }}>
                Entrega rápida · Sin intermediarios
              </div>
            </div>

            {orderNotice && (
              <div style={{
                background: "#122a1c",
                border: "1px solid #235c39",
                color: "var(--verde)",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                marginBottom: "0.75rem",
                fontFamily: "var(--mono)"
              }}>
                ✓ {orderNotice}
              </div>
            )}

            <div className={styles.mockupProductos}>
              {audit.products.length > 0 ? (
                audit.products.map((prod) => (
                  <div key={prod.id} className={styles.productoItem}>
                    {prod.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.image} alt={prod.name} className={styles.productoFoto} />
                    ) : (
                      <div className={styles.productoFoto} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>
                        🍽️
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
                      + Añadir
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--papel-debil)", fontSize: "0.875rem" }}>
                  Cargando catálogo optimizado para {audit.name}...
                </div>
              )}
            </div>

            <div className={styles.mockupCarrito}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontFamily: "var(--mono)", fontSize: "0.875rem" }}>
                <span>Total comanda ({cart.length} platos):</span>
                <strong>{cartTotal.toFixed(2)} €</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  alert(`¡Comanda directa generada!\n\nRestaurante: ${audit.name}\nTotal: ${cartTotal.toFixed(2)} €\nComisión pagada a Glovo: 0,00 €\nAhorro directo: ${(cartTotal * (params.comisionAgregadorPct / 100)).toFixed(2)} €\n\nEl pedido se envía directamente al WhatsApp o TPV del local.`);
                }}
                className={styles.botonPedirDirecto}
              >
                Pedir directo por WhatsApp (0 % comisiones)
              </button>
            </div>
          </div>

          {/* Columna Derecha: Comparativa de Margen */}
          <div className={styles.comparativaCaja}>
            <h2 className={styles.seccionTitulo}>La comparativa de caja</h2>
            <p className={styles.seccionSubtitulo}>
              Por qué el canal directo con Store API propia transforma la cuenta de resultados de {audit.name}.
            </p>

            <div className={styles.comparativaFila}>
              <div className={styles.columnaAgregador}>
                <h3 className={styles.columnaTitulo} style={{ color: "var(--acento)" }}>
                  Con Glovo / UberEats
                </h3>
                <ul className={styles.columnaLista}>
                  <li><strong>Comisión:</strong> {params.comisionAgregadorPct} % de cada pedido</li>
                  <li><strong>En un pedido de {params.ticketMedio.toFixed(2)} €:</strong> el restaurante ingresa solo {(params.ticketMedio * (1 - params.comisionAgregadorPct / 100)).toFixed(2)} €</li>
                  <li><strong>Datos del cliente:</strong> Propiedad de Glovo</li>
                  <li><strong>Cobro:</strong> Liquidación quincenal</li>
                  <li><strong>Fidelización:</strong> Cero (la app le ofrece a tu vecino tu competencia)</li>
                </ul>
              </div>

              <div className={styles.columnaDirecto}>
                <h3 className={styles.columnaTitulo} style={{ color: "var(--verde)" }}>
                  Con el Fix de Bleed
                </h3>
                <ul className={styles.columnaLista}>
                  <li><strong>Comisión:</strong> 0 % (margen íntegro en cocina)</li>
                  <li><strong>En un pedido de {params.ticketMedio.toFixed(2)} €:</strong> el restaurante ingresa {params.ticketMedio.toFixed(2)} €</li>
                  <li><strong>Datos del cliente:</strong> Teléfono y comanda en tu WhatsApp</li>
                  <li><strong>Cobro:</strong> Inmediato en tu TPV o Bizum</li>
                  <li><strong>Velocidad de carga:</strong> 0.18 s (sin rebotes)</li>
                </ul>
              </div>
            </div>

            <div className={styles.tarjetaTotal} style={{ marginTop: "1rem" }}>
              <div className={styles.etiquetaCifra}>Impacto acumulado en 100 pedidos</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "1.5rem", fontWeight: 600, color: "var(--verde)", margin: "0.25rem 0" }}>
                +{(100 * params.ticketMedio * (params.comisionAgregadorPct / 100)).toFixed(2)} € más de beneficio neto
              </div>
              <p className={styles.descripcionCifra}>
                Por cada 100 pedidos que tus clientes habituales hacen por tu canal propio en vez de Glovo, te embolsas{" "}
                +{(100 * params.ticketMedio * (params.comisionAgregadorPct / 100)).toFixed(2)} € limpios adicionales.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* CONTENIDO PESTAÑA 3: DOSSIER EJECUTIVO */}
      {activeTab === "dossier" && (
        <section className={styles.dossierContenedor}>
          <div className={styles.dossierAcciones}>
            <button
              type="button"
              onClick={handleGenerateGeminiDossier}
              disabled={isGeneratingAi}
              className={`${styles.botonAccion} ${styles.botonPrimario}`}
            >
              {isGeneratingAi ? "Generando con Gemini..." : "⚡ Redactar propuesta a medida con Gemini AI"}
            </button>
            <button
              type="button"
              onClick={copyDossier}
              className={`${styles.botonAccion} ${styles.botonSecundario}`}
            >
              {copied ? "✓ ¡Copiado!" : "Copiar dossier (Markdown)"}
            </button>
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.botonAccion} ${styles.botonSecundario}`}
            >
              Compartir por WhatsApp
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className={`${styles.botonAccion} ${styles.botonSecundario}`}
            >
              Imprimir / Guardar PDF
            </button>
          </div>

          <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--papel-debil)", marginBottom: "1.5rem" }}>
            Fuente del informe: {aiSource}
          </div>

          <div className={styles.dossierTexto}>
            {dossierMarkdown}
          </div>
        </section>
      )}

      {/* Pie de Página */}
      <footer className={styles.pieDePagina}>
        <span>
          Bleed · Auditoría calibrada sobre el estudio de 132 restaurantes de Málaga.
        </span>
        <span>
          Desarrollado para el AI Builders Hackathon 2026.
        </span>
      </footer>
    </main>
  );
}
