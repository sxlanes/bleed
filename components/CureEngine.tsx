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

  const handleUnlock = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setIsUnlocked(true);
    }, 1500);
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
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0e1113]/90 backdrop-blur-md cure-blocked-overlay" style={{ paddingTop: '10rem' }}>
            <div className="bg-[#090a0c] border border-[#ff3b3b]/30 p-8 rounded-xl shadow-2xl max-w-3xl w-full text-center flex flex-col gap-6" style={{ marginTop: '-10rem' }}>
              
              <div className="text-left border-l-2 border-[#ff3b3b] pl-4 mb-4">
                <div className="text-[#ff3b3b] font-bold text-lg mb-1">[!] HEMORRAGIA ACTIVA NO DETENIDA</div>
                <div className="text-[#e5e7eb] text-sm">Esta fuga le cuesta a tu negocio: <strong className="text-white">{currency}{dailyLoss} / día</strong> ({currency}{hourlyLoss} cada hora)</div>
                <div className="text-[#9ca3af] text-sm mt-1">Desde que abriste esta auditoría has perdido: <strong className="text-[#ff3b3b] font-mono">{currency}{activeBleed}</strong></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {/* Option 1 */}
                <div className="border border-[#1a1e23] rounded-lg p-4 bg-[#0e1113]/50 opacity-60">
                  <h4 className="text-[#9ca3af] font-bold mb-2">1. INACCIÓN (HOY)</h4>
                  <div className="text-xl text-white mb-2">0 {currency} <span className="text-xs text-[#9ca3af]">desembolso</span></div>
                  <ul className="text-xs space-y-1 mb-4 text-[#9ca3af]">
                    <li>Pérdida: -{currency}{annualLoss.toLocaleString()}/año</li>
                    <li>Tu competencia gana</li>
                  </ul>
                  <button className="w-full py-2 bg-transparent border border-[#1a1e23] text-[#4b5563] text-xs rounded hover:bg-[#1a1e23] transition-colors">
                    Continuar sangrando
                  </button>
                </div>

                {/* Option 2 */}
                <div className="border border-[#1a1e23] rounded-lg p-4 bg-[#0e1113]">
                  <h4 className="text-[#e5e7eb] font-bold mb-2">2. AGENCIA / DEV</h4>
                  <div className="text-xl text-white mb-2">650 {currency} <span className="text-xs text-[#9ca3af]">tarifa media</span></div>
                  <ul className="text-xs space-y-1 mb-4 text-[#d1d5db]">
                    <li>Demora: 3 semanas</li>
                    <li>+{currency}{(annualLoss/365 * 21).toFixed(0)} perdidos en espera</li>
                  </ul>
                  <button className="w-full py-2 bg-[#1a1e23] text-[#e5e7eb] text-xs rounded hover:bg-[#2a2d32] transition-colors">
                    Pedir presupuesto
                  </button>
                </div>

                {/* Option 3 */}
                <div className="border border-[#ff3b3b] rounded-lg p-4 bg-[#ff3b3b]/5 transform scale-105 shadow-[0_0_15px_rgba(255,59,59,0.15)]">
                  <h4 className="text-[#ff3b3b] font-bold mb-2">3. PARCHE BLEED</h4>
                  <div className="text-xl text-white mb-2">49,00 {currency} <span className="text-xs text-[#9ca3af]">pago único</span></div>
                  <ul className="text-xs space-y-1 mb-4 text-[#e5e7eb]">
                    <li>Desbloqueo inmediato</li>
                    <li>Taponado en 60 seg</li>
                  </ul>
                  <button 
                    onClick={handleUnlock}
                    disabled={isPaying}
                    className="w-full py-2 bg-[#ff3b3b] text-white font-bold text-xs rounded hover:bg-[#dc2626] transition-colors"
                  >
                    {isPaying ? "Procesando..." : `Taponar por 49 ${currency}`}
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-[#4b5563] flex items-center justify-center gap-1 mt-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Amortizado en {Math.max(1, Math.ceil(49 / (annualLoss / 8760)))} horas de tráfico.
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
