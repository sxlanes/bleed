const fs = require('fs');
let code = fs.readFileSync('lib/quantification.ts', 'utf8');

const oldCode = `  if (isSlowTtfb || isHeavyPage) {
    // Conversion points lost = extra seconds over a 1.0s baseline x the calibrated drop per second
    const extraSeconds = Math.max(0, audit.ttfb - 1.0);
    const heavyPenaltySeconds = audit.imgKb > 2500 ? 1 : audit.imgKb > 1800 ? 0.5 : 0;
    const pointsLost = (extraSeconds + heavyPenaltySeconds) * CONVERSION_DROP_PER_SECOND.valor;
    const baselineConversion = 7; // percent of intent-bearing visits that would convert
    const keptFraction = Math.max(0, (baselineConversion - pointsLost) / baselineConversion);
    const lostFraction = 1 - keptFraction;
    const lostTransactionsMonth = Math.round(params.visitasMes * (baselineConversion / 100) * lostFraction);
    const speedLossYear = Math.round(lostTransactionsMonth * effectiveTicket * 12);

    const reasons: string[] = [];
    if (isSlowTtfb) reasons.push(\`a \${audit.ttfb}s time to first byte (the recommended threshold is under 0.6s)\`);
    if (isHeavyPage) reasons.push(\`\${audit.imgKb.toLocaleString("en-IE")} KB of images on the homepage\`);`;

const newCode = `  if (isSlowTtfb || isHeavyPage) {
    const extraSeconds = Math.max(0, audit.ttfb - 1.0);
    // Cellular network physics (16 Mbps = 2000 KB/s)
    const excessImgKb = Math.max(0, audit.imgKb - 1000);
    const heavyPenaltySeconds = audit.imgKb > 1800 ? Math.round((excessImgKb / 2000) * 10) / 10 : 0;
    
    const pointsLost = (extraSeconds + heavyPenaltySeconds) * CONVERSION_DROP_PER_SECOND.valor;
    const baselineConversion = 7; 
    const keptFraction = Math.max(0, (baselineConversion - pointsLost) / baselineConversion);
    const lostFraction = 1 - keptFraction;
    const lostTransactionsMonth = Math.round(params.visitasMes * (baselineConversion / 100) * lostFraction);
    const speedLossYear = Math.round(lostTransactionsMonth * effectiveTicket * 12);

    const reasons: string[] = [];
    if (isSlowTtfb) reasons.push(\`a \${audit.ttfb}s time to first byte (the recommended threshold is under 0.6s)\`);
    if (isHeavyPage) reasons.push(\`\${audit.imgKb.toLocaleString("en-IE")} KB of images on the homepage\`);`;

if (code.includes('const extraSeconds = Math.max(0, audit.ttfb - 1.0);')) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('lib/quantification.ts', code);
  console.log("Patched speed");
} else {
  console.log("Could not find speed block");
}
