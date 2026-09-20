"use client";

import { useState } from "react";

export default function GravitySimulator() {
  const [revenue] = useState(100000); // Base revenue €100k
  const [commission, setCommission] = useState(15); // %
  const [ttfb, setTtfb] = useState(2.0); // seconds

  const aggregatorLoss = revenue * (commission / 100);
  const ttfbLoss = revenue * (ttfb * 0.10); // 10% loss per second
  const totalLoss = aggregatorLoss + ttfbLoss;

  const maxLoss = revenue; // worst case
  const lossRatio = Math.min(totalLoss / maxLoss, 1);

  // Color calculation: From Golden/Clean (#D4AF37) to Dark Red/High Loss (#7A1212)
  // Golden RGB: 212, 175, 55
  // Dark Red RGB: 122, 18, 18
  
  const r = Math.round(212 + lossRatio * (122 - 212));
  const g = Math.round(175 + lossRatio * (18 - 175));
  const b = Math.round(55 + lossRatio * (18 - 55));
  const cardColor = `rgb(${r}, ${g}, ${b})`;
  const cardColorBg = `rgba(${r}, ${g}, ${b}, 0.1)`;

  return (
    <div 
      id="gravity-simulator" className="p-6 rounded-2xl shadow-2xl transition-colors duration-500 max-w-md w-full mx-auto flex flex-col gap-6"
      style={{
        backgroundColor: "var(--tinta, #0e1113)",
        border: `1px solid ${cardColor}`,
        boxShadow: `0 8px 32px 0 rgba(${r},${g},${b},0.15)`,
        fontFamily: "var(--font-instrument, system-ui, sans-serif)",
        animation: "entrar 0.5s ease-out"
      }}
    >
      <style>{`
        @keyframes entrar {
          from { opacity: 0.99; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl text-[#f3f4f6] font-medium m-0 leading-tight">Gravedad Económica</h2>
          <p className="text-sm text-[#9ca3af] m-0">Simulador calibrado (132 negocios, Málaga)</p>
        </div>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={cardColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-500">
          <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="2" y1="10" x2="22" y2="10"></line>
        </svg>
      </div>

      <div 
        className="p-4 rounded-xl border flex flex-col gap-2 transition-colors duration-500"
        style={{ borderColor: cardColor, backgroundColor: cardColorBg }}
      >
        <span className="text-xs uppercase tracking-widest text-[#d1d5db] font-semibold">Pérdida Anual Estimada</span>
        <span 
          className="text-4xl font-bold tracking-tight transition-colors duration-500" 
          style={{ fontFamily: "var(--font-plex-mono, monospace)", color: cardColor }}
        >
          -€{totalLoss.toLocaleString("es-ES")}
        </span>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-sm text-[#e5e7eb] font-medium">Comisión de Agregadores (%)</label>
            <span className="text-sm font-bold text-[#f3f4f6]" style={{ fontFamily: "var(--font-plex-mono, monospace)" }}>{commission}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="35" 
            step="1" 
            value={commission} 
            onChange={(e) => setCommission(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none transition-colors duration-500"
            style={{ accentColor: cardColor, backgroundColor: "#1f2225" }}
          />
          <div className="text-[12px] text-[#9ca3af] leading-tight" style={{ fontFamily: "var(--font-plex-mono, monospace)" }}>
            Fórmula: {revenue.toLocaleString("es-ES")}€ × ({commission}/100) = €{aggregatorLoss.toLocaleString("es-ES")}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-sm text-[#e5e7eb] font-medium">Tiempo de Carga (TTFB en seg)</label>
            <span className="text-sm font-bold text-[#f3f4f6]" style={{ fontFamily: "var(--font-plex-mono, monospace)" }}>{ttfb}s</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.1" 
            value={ttfb} 
            onChange={(e) => setTtfb(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none transition-colors duration-500"
            style={{ accentColor: cardColor, backgroundColor: "#1f2225" }}
          />
          <div className="text-[12px] text-[#9ca3af] leading-tight" style={{ fontFamily: "var(--font-plex-mono, monospace)" }}>
            Supuesto: 10% pérdida/seg. <br/>
            Fórmula: {revenue.toLocaleString("es-ES")}€ × ({ttfb}s × 0.10) = €{ttfbLoss.toLocaleString("es-ES")}
          </div>
        </div>
      </div>
      
      <div className="mt-2 pt-4 border-t border-[#1f2225] flex justify-between items-center">
         <span className="text-[12px] text-[#9ca3af]">Base de facturación asumida:</span>
         <span className="text-[12px] text-[#d1d5db] font-semibold" style={{ fontFamily: "var(--font-plex-mono, monospace)" }}>
           €{revenue.toLocaleString("es-ES")}
         </span>
      </div>
    </div>
  );
}
