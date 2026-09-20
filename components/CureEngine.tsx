"use client";

import { useState } from "react";
import type { AuditResult } from "@/lib/types";

export default function CureEngine({ audit }: { audit: AuditResult }) {
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

  const copyToClipboard = (text: string, id: string) => {
    if (!isUnlocked) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleUnlock = () => {
    setIsPaying(true);
    // Simular llamada a pasarela de pagos (Stripe)
    setTimeout(() => {
      setIsPaying(false);
      setIsUnlocked(true);
    }, 1500);
  };

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": audit.name || "Negocio",
    "url": audit.finalUrl || audit.url,
    ...(audit.telephone ? { "telephone": audit.telephone } : {}),
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

  return (
    <section
      className="mt-12 rounded-lg overflow-hidden border border-[#1a1e23] relative"
      style={{
        backgroundColor: "#0e1113",
        color: "#d1d5db",
        fontFamily: "var(--font-plex-mono), monospace",
        animation: "entrar 0.5s ease-out",
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
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0e1113]/80 backdrop-blur-sm">
            <div className="bg-[#090a0c] border border-[#1a1e23] p-8 rounded-xl shadow-2xl max-w-sm w-full text-center flex flex-col gap-4">
              <div className="w-12 h-12 bg-[#22c55e]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 className="text-xl text-white m-0" style={{ fontFamily: "var(--font-instrument), sans-serif" }}>
                Desbloquea los Parches
              </h3>
              <p className="text-sm text-[#9ca3af] m-0 mb-2">
                Obtén el código exacto generado por nuestra IA para copiar y pegar en tu web y detener la fuga técnica hoy mismo.
              </p>
              <button
                onClick={handleUnlock}
                disabled={isPaying}
                className="w-full py-3 rounded text-white font-bold transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isPaying ? "#1a1e23" : "#6366f1",
                  fontFamily: "var(--font-instrument), sans-serif",
                }}
              >
                {isPaying ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando Stripe...
                  </>
                ) : (
                  "Desbloquear por 49,00 €"
                )}
              </button>
              <div className="text-[10px] text-[#4b5563] mt-2 flex items-center justify-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Pago seguro garantizado
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
          />
        )}

        {needsHttps && (
          <SnippetBlock
            id="https"
            title="FORCE HTTPS (.htaccess)"
            code={htaccessStr}
            copied={copied}
            onCopy={copyToClipboard}
            isUnlocked={isUnlocked}
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
}: {
  id: string;
  title: string;
  code: string;
  copied: string | null;
  onCopy: (code: string, id: string) => void;
  isUnlocked: boolean;
}) {
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
        <pre 
          className="text-sm m-0 transition-all duration-700"
          style={{ 
            filter: !isUnlocked ? "blur(6px)" : "none",
            userSelect: !isUnlocked ? "none" : "auto",
            opacity: !isUnlocked ? 0.4 : 1
          }}
        >
          <code style={{ color: "#a5b4fc" }}>{code}</code>
        </pre>
      </div>
    </div>
  );
}
