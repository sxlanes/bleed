"use client";

import { useState, useEffect } from "react";
import type { AuditResult } from "@/lib/types";

export default function CureEngine({ audit, annualLoss, currency = "€" }: { audit: AuditResult, annualLoss: number, currency?: string }) {
  const needsSchema =
    !audit.schemaTypes ||
    audit.schemaTypes.length === 0 ||
    !audit.address ||
    !audit.telephone;

  const needsViewport = audit.viewport === false;
  const needsHttps = audit.https === false;

  if (!needsSchema && !needsViewport && !needsHttps) {
    return null;
  }

  const [copied, setCopied] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (isUnlocked) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isUnlocked]);

  const copyToClipboard = (text: string, id: string) => {
    if (!isUnlocked) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleUnlock = async () => {
    setIsPaying(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: audit.url || audit.finalUrl }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No URL returned from Stripe");
      }
    } catch (err) {
      console.error(err);
      // Fallback a simulación si no hay API Key de Stripe
      setTimeout(() => {
        setIsPaying(false);
        setIsUnlocked(true);
      }, 1500);
    }
  };

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": audit.name || "Negocio",
    "telephone": audit.telephone || "+34 900 000 000",
    "url": audit.finalUrl || audit.url,
    ...(audit.address
      ? {
          "address": {
            "@type": "PostalAddress",
            "streetAddress": audit.address,
          },
        }
      : {}),
  };

  const schemaStr = `<script type="application/ld+json">\n${JSON.stringify(
    schemaJson,
    null,
    2
  )}\n</script>`;

  const viewportStr = `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
  const htaccessStr = `<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n</IfModule>`;

  const dailyLoss = (annualLoss / 365).toFixed(2);
  const hourlyLoss = (annualLoss / 8760).toFixed(2);
  const lossPerSecond = (annualLoss / 31536000);
  const activeBleed = (elapsedSeconds * lossPerSecond).toFixed(4);

  return (
    <section
      id="cure-engine"
      className="mt-12 rounded-lg overflow-hidden border border-[#1a1e23] relative"
      style={{
        backgroundColor: "#0e1113",
        color: "#d1d5db",
        fontFamily: "var(--font-plex-mono), monospace",
        animation: "entrar 0.5s ease-out",
        textAlign: "left"
      }}
    >
      <div
        className="px-4 py-3 border-b border-[#1a1e23] flex items-center justify-between"
        style={{ backgroundColor: "#090a0c" }}
      >
        <h2
          className="text-sm font-semibold tracking-wide uppercase flex items-center gap-2"
          style={{
            fontFamily: "var(--font-instrument), sans-serif",
            color: "#ffffff",
          }}
        >
          <span>Cure Engine // Auto-Fix</span>
          {!isUnlocked && (
            <span className="bg-[#b3261e] text-white text-[10px] px-2 py-0.5 rounded-sm">LOCKED</span>
          )}
        </h2>
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></div>
        </div>
      </div>

      <div className="p-6 space-y-8 relative">
        {!isUnlocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0e1113]/80 backdrop-blur-md p-4" style={{ paddingTop: '8rem' }}>
            
            <div className="bg-[#0e1113] border border-[#2a2d32] rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden" style={{ marginTop: '-8rem' }}>
              
              {/* Header */}
              <div className="bg-[#ff3b3b]/10 border-b border-[#ff3b3b]/20 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#ff3b3b]/20 flex items-center justify-center animate-pulse flex-shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff3b3b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </div>
                  <div>
                    <h3 className="text-[#ff3b3b] font-bold text-xl tracking-tight">HEMORRAGIA ACTIVA NO DETENIDA</h3>
                    <p className="text-[#9ca3af] text-sm mt-1">Has perdido <span className="text-[#ff3b3b] font-mono font-bold">{currency}{activeBleed}</span> desde que abriste esta página.</p>
                  </div>
                </div>
                <div className="md:text-right">
                  <div className="text-[#e5e7eb] font-bold text-2xl tracking-tight">{currency}{dailyLoss} <span className="text-[#6b7280] text-sm font-normal">/ día</span></div>
                  <div className="text-[#6b7280] text-xs mt-1 font-mono">({currency}{hourlyLoss} / hora)</div>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#2a2d32] bg-[#090a0c]">
                
                {/* Option 1 */}
                <div className="p-8 flex flex-col opacity-60 hover:opacity-100 transition-opacity">
                  <div className="text-[#6b7280] font-bold text-xs tracking-widest mb-4">1. IGNORAR EL PROBLEMA</div>
                  <div className="text-4xl font-light text-white mb-2">0 {currency}</div>
                  <div className="text-xs text-[#6b7280] mb-8 pb-4 border-b border-[#2a2d32]">Desembolso inicial</div>
                  
                  <ul className="text-sm space-y-4 text-[#9ca3af] flex-1">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-[#ff3b3b] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      <span>Pérdida de <strong className="text-white">-{currency}{annualLoss.toLocaleString("en-US")}</strong> al año.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-[#ff3b3b] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      <span>La competencia absorbe tus ventas.</span>
                    </li>
                  </ul>
                  <button className="mt-8 w-full py-3 bg-transparent border border-[#2a2d32] text-[#6b7280] font-bold text-xs rounded-lg hover:bg-[#1a1e23] hover:text-white transition-colors uppercase tracking-wider">
                    Continuar sangrando
                  </button>
                </div>

                {/* Option 2 */}
                <div className="p-8 flex flex-col">
                  <div className="text-[#9ca3af] font-bold text-xs tracking-widest mb-4">2. CONTRATAR AGENCIA</div>
                  <div className="text-4xl font-light text-white mb-2">650 {currency}</div>
                  <div className="text-xs text-[#6b7280] mb-8 pb-4 border-b border-[#2a2d32]">Tarifa media del sector</div>
                  
                  <ul className="text-sm space-y-4 text-[#9ca3af] flex-1">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-[#eab308] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span>Demora de implementación: <strong className="text-white">3 semanas</strong>.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-[#ff3b3b] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      <span>Pierdes <strong className="text-white">{currency}{(annualLoss/365 * 21).toFixed(0)}</strong> mientras esperas la entrega.</span>
                    </li>
                  </ul>
                  <button className="mt-8 w-full py-3 bg-[#1a1e23] border border-[#2a2d32] text-[#e5e7eb] font-bold text-xs rounded-lg hover:bg-[#2a2d32] transition-colors uppercase tracking-wider">
                    Pedir presupuesto
                  </button>
                </div>

                {/* Option 3 */}
                <div className="p-8 flex flex-col bg-[#ff3b3b]/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#ff3b3b]/10 blur-3xl rounded-full"></div>
                  <div className="text-[#ff3b3b] font-bold text-xs tracking-widest mb-4 flex items-center justify-between">
                    <span>3. PARCHE BLEED</span>
                    <span className="bg-[#ff3b3b]/20 px-2 py-0.5 rounded text-[10px]">RECOMENDADO</span>
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">49 {currency}</div>
                  <div className="text-xs text-[#ff3b3b] mb-8 pb-4 border-b border-[#ff3b3b]/20">Pago único, acceso instantáneo</div>
                  
                  <ul className="text-sm space-y-4 text-[#e5e7eb] flex-1 relative z-10">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-[#22c55e] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      <span>Desbloqueo inmediato del código.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-[#22c55e] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      <span>Fuga taponada en menos de <strong className="text-white">60 segundos</strong>.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 mt-0.5 text-[#22c55e] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      <span>Listo para copiar y pegar (Copy-paste).</span>
                    </li>
                  </ul>
                  <button 
                    onClick={handleUnlock}
                    disabled={isPaying}
                    className="mt-8 w-full py-4 bg-[#ff3b3b] text-white font-bold text-sm rounded-lg hover:bg-[#dc2626] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,59,59,0.3)] uppercase tracking-wider relative z-10"
                  >
                    {isPaying ? "Procesando..." : `Comprar Parche por 49 ${currency}`}
                  </button>
                  <div className="text-center mt-4 text-xs text-[#ff3b3b]/70 font-mono relative z-10">
                    Amortizado en {Math.max(1, Math.ceil(49 / (annualLoss / 8760)))} horas.
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {needsSchema && (
          <SnippetBlock
            id="schema"
            title="INJECT STRUCTURED DATA"
            code={schemaStr}
            copied={copied}
            onCopy={copyToClipboard}
            isUnlocked={isUnlocked}
            peekLines={6}
          />
        )}

        {needsViewport && (
          <SnippetBlock
            id="viewport"
            title="FIX MOBILE VIEWPORT"
            code={viewportStr}
            copied={copied}
            onCopy={copyToClipboard}
            isUnlocked={isUnlocked}
            peekLines={1}
          />
        )}

        
        {/* Affiliate / DFY Section */}
        {isUnlocked && (
          <div className="mt-8 border-t border-[#1a1e23] pt-8">
            <h3 className="text-[#e5e7eb] font-bold mb-4 font-instrument flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              SOLUCIONES GESTIONADAS (DONE-FOR-YOU)
            </h3>
            <p className="text-[#9ca3af] text-sm mb-6">¿No tienes equipo técnico? Usa nuestros partners certificados para delegar la implementación con descuentos exclusivos.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a href="#" className="block p-4 border border-[#1a1e23] rounded-lg bg-[#0e1113] hover:border-[#6366f1] transition-colors group">
                <div className="text-xs text-[#6366f1] font-bold mb-1 tracking-widest">HOSTING ULTRA-RÁPIDO</div>
                <div className="text-white font-bold text-lg mb-2">Cloudways / SiteGround</div>
                <p className="text-xs text-[#9ca3af] mb-4">Migración gratuita en 1 clic. Reduce el TTFB por debajo de 0.8s garantizado.</p>
                <div className="text-xs text-white bg-[#6366f1]/20 px-2 py-1 rounded inline-block group-hover:bg-[#6366f1] transition-colors">Aplicar Descuento Partner &rarr;</div>
              </a>

              <a href="#" className="block p-4 border border-[#1a1e23] rounded-lg bg-[#0e1113] hover:border-[#22c55e] transition-colors group">
                <div className="text-xs text-[#22c55e] font-bold mb-1 tracking-widest">DELEGAR EN EXPERTO</div>
                <div className="text-white font-bold text-lg mb-2">Codeable.io Developers</div>
                <p className="text-xs text-[#9ca3af] mb-4">Un experto certificado en WordPress implementa los parches exactos de Bleed en 24h.</p>
                <div className="text-xs text-white bg-[#22c55e]/20 px-2 py-1 rounded inline-block group-hover:bg-[#22c55e] transition-colors">Contratar Experto &rarr;</div>
              </a>
            </div>
            <div className="text-[10px] text-[#4b5563] mt-4">
              * Enlaces de partner verificados. Bleed puede recibir una comisión que financia nuestro motor de cálculo.
            </div>
          </div>
        )}

        {needsHttps && (
          <SnippetBlock
            id="https"
            title="FORCE HTTPS (.htaccess)"
            code={htaccessStr}
            copied={copied}
            onCopy={copyToClipboard}
            isUnlocked={isUnlocked}
            peekLines={2}
          />
        )}
      </div>
    </section>
  );
}

function SnippetBlock({
  id,
  title,
  code,
  copied,
  onCopy,
  isUnlocked,
  peekLines
}: {
  id: string;
  title: string;
  code: string;
  copied: string | null;
  onCopy: (code: string, id: string) => void;
  isUnlocked: boolean;
  peekLines: number;
}) {
  const lines = code.split('\\n');
  const visibleLines = lines.slice(0, peekLines).join('\\n');
  const hiddenLines = lines.slice(peekLines).join('\\n');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div
          className="text-xs font-bold tracking-widest text-[#22c55e]"
          style={{ fontFamily: "var(--font-instrument), sans-serif" }}
        >
          &gt; {title}
        </div>
        <button
          onClick={() => onCopy(code, id)}
          disabled={!isUnlocked}
          className="text-xs px-3 py-1.5 rounded transition-colors"
          style={{
            backgroundColor: !isUnlocked ? "#1a1e23" : copied === id ? "#22c55e" : "#2a2d32",
            color: !isUnlocked ? "#4b5563" : copied === id ? "#0e1113" : "#e5e7eb",
            fontFamily: "var(--font-instrument), sans-serif",
            fontWeight: 600,
            cursor: !isUnlocked ? "not-allowed" : "pointer",
          }}
        >
          {!isUnlocked ? "LOCKED" : copied === id ? "COPIED" : "COPY TO CLIPBOARD"}
        </button>
      </div>
      <div
        className="p-4 rounded overflow-x-auto relative"
        style={{
          backgroundColor: "#090a0c",
          border: "1px solid #1a1e23",
        }}
      >
        <pre className="text-sm m-0 transition-all duration-700 cure-code-block" style={{ userSelect: !isUnlocked ? "none" : "auto" }}>
          {!isUnlocked ? (
            <>
              <code style={{ color: "#a5b4fc", opacity: 0.9 }}>{visibleLines}</code>
              <div className="relative">
                <code style={{ color: "#a5b4fc", filter: "blur(6px)", opacity: 0.4 }}>{hiddenLines || "\\n// [ BLOCKED ]"}</code>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-[#ff3b3b] text-white text-[10px] font-bold px-2 py-1 rounded">
                    [{lines.length - peekLines} LÍNEAS DE RESOLUCIÓN TÉCNICA BLOQUEADAS]
                  </span>
                </div>
              </div>
            </>
          ) : (
            <code style={{ color: "#a5b4fc" }}>{code}</code>
          )}
        </pre>
      </div>
    </div>
  );
}
