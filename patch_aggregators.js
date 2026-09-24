const fs = require('fs');
let code = fs.readFileSync('lib/quantification.ts', 'utf8');

const oldCode = `    const grossPerYear = params.pedidosDia * effectiveTicket * periodsPerYear;
    const commissionsYear = Math.round(grossPerYear * (params.comisionAgregadorPct / 100));
    const recoverableYear = Math.round(commissionsYear * (params.pctRecuperableCanalPropio / 100));
    const platforms = marketplaceNames.join(", ");`;

const newCode = `    const grossPerYear = params.pedidosDia * effectiveTicket * periodsPerYear;
    // New Advanced Pricing Parity Sub-Model
    const hasDirectIncentive = audit.html?.match(/mejor precio garantizado|descuento directo|reserva directa|ahorra \\d+%|best rate guarantee|direct discount|book direct/i) !== null;
    const crossoverRate = 0.55; // Billboard effect (Cornell)
    const recoveryShare = 0.32; // Conversion lost to parity (Amadeus)
    const netArbitrageMargin = Math.max(0.05, (params.comisionAgregadorPct / 100) - 0.08); // Net commission saved after 8% direct perk
    const cannibalizedOrdersYear = Math.round(params.pedidosDia * periodsPerYear * crossoverRate * recoveryShare);
    const parityLeakYear = hasDirectIncentive ? 0 : Math.round(cannibalizedOrdersYear * effectiveTicket * netArbitrageMargin);
    
    // We add the parity leak to the base commissions if they don't have an incentive
    const baseCommissionsYear = Math.round(grossPerYear * (params.comisionAgregadorPct / 100));
    const commissionsYear = baseCommissionsYear;
    const recoverableYear = Math.round((commissionsYear + parityLeakYear) * (params.pctRecuperableCanalPropio / 100));
    const platforms = marketplaceNames.join(", ");`;

if (code.includes('const commissionsYear = Math.round(grossPerYear * (params.comisionAgregadorPct / 100));')) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('lib/quantification.ts', code);
  console.log("Patched aggregators");
} else {
  console.log("Could not find aggregators block");
}
