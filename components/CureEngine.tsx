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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const [copied, setCopied] = useState<string | null>(null);

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
      className="mt-12 rounded-lg overflow-hidden border border-[#1a1e23]"
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
          className="text-sm font-semibold tracking-wide uppercase"
          style={{
            fontFamily: "var(--font-instrument), sans-serif",
            color: "#ffffff",
          }}
        >
          Cure Engine // Auto-Fix
        </h2>
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {needsSchema && (
          <SnippetBlock
            id="schema"
            title="INJECT STRUCTURED DATA"
            code={schemaStr}
            copied={copied}
            onCopy={copyToClipboard}
          />
        )}

        {needsViewport && (
          <SnippetBlock
            id="viewport"
            title="FIX MOBILE VIEWPORT"
            code={viewportStr}
            copied={copied}
            onCopy={copyToClipboard}
          />
        )}

        {needsHttps && (
          <SnippetBlock
            id="https"
            title="FORCE HTTPS (.htaccess)"
            code={htaccessStr}
            copied={copied}
            onCopy={copyToClipboard}
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
}: {
  id: string;
  title: string;
  code: string;
  copied: string | null;
  onCopy: (code: string, id: string) => void;
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
          className="text-xs px-3 py-1.5 rounded transition-colors"
          style={{
            backgroundColor: copied === id ? "#22c55e" : "#1a1e23",
            color: copied === id ? "#0e1113" : "#e5e7eb",
            fontFamily: "var(--font-instrument), sans-serif",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied === id ? "COPIED" : "COPY TO CLIPBOARD"}
        </button>
      </div>
      <div
        className="p-4 rounded overflow-x-auto"
        style={{
          backgroundColor: "#090a0c",
          border: "1px solid #1a1e23",
        }}
      >
        <pre className="text-sm m-0">
          <code style={{ color: "#a5b4fc" }}>{code}</code>
        </pre>
      </div>
    </div>
  );
}
