const fs = require('fs');
let code = fs.readFileSync('lib/quantification.ts', 'utf8');

const oldCode = `  // 7. Discovery — no address, no phone, no local-business structured data,
  // so local search and maps have nothing to place on a map. New leak: it
  // only fires once the recon pass has actually looked (schemaTypes is an
  // array, even an empty one) — an OLD audit that never checked stays silent
  // rather than accusing a site of a problem nobody measured.
  if (audit.schemaTypes !== undefined && audit.schemaTypes.length === 0 && !audit.address && !audit.telephone) {
    const missShare = 0.03; // team estimate: share of local searches that never arrive at a business invisible to local search
    const lostTransactionsYear = Math.round(params.visitasMes * missShare * 12);
    const lossYear = Math.round(lostTransactionsYear * effectiveTicket);

    leaks.push({
      id: "fuga-descubrimiento-local",
      title: "Invisible to local search (no address, phone or structured data)",
      category: "tecnico",
      severity: "media",
      annualLossEuros: lossYear,
      monthlyLossEuros: Math.round(lossYear / 12),
      formula: \`visits a month (\${params.visitasMes}) × \${missShare * 100}% of local searches that never arrive × 12 months × \${words.valueLabel.toLowerCase()} (\${effectiveTicket.toFixed(
        2
      )} \${currency}) = \${eur(lossYear)} \${currency} a year\`,
      calculationDetails: \`No street address, no phone number and no local-business structured data were found on the page, so a map search or a "near me" query has nothing to place on a map.\`,
      explanation: \`Search engines and maps place a \${words.place} using its address, phone and schema.org markup. With none of the three, a \${words.customer} searching nearby finds a competitor instead.\`,
      assumptions: [
        {
          label: "Local search miss rate",
          value: "3%",
          citation: "Team estimate. No published source; adjustable in the simulator.",
        },
        trafficAssumption(params.visitasMes, audit.monthlyVisitsSource),
      ],
      remedy: \`Publish a full street address and phone number, and add LocalBusiness structured data to the homepage.\`,
      remedyHours: 1,
    });`;

const newCode = `  // 7. Discovery & Local Entity Isolation
  if (audit.schemaTypes !== undefined && audit.schemaTypes.length === 0 && !audit.address && !audit.telephone) {
    const missShare = 0.04; // 4% baseline based on Whitespark/Moz Local 3-Pack CTR
    const lostTransactionsYear = Math.round(params.visitasMes * missShare * 12);
    const lossYear = Math.round(lostTransactionsYear * effectiveTicket);

    leaks.push({
      id: "fuga-descubrimiento-local",
      title: "Invisible to local search (no address, phone or structured data)",
      category: "tecnico",
      severity: "media",
      annualLossEuros: lossYear,
      monthlyLossEuros: Math.round(lossYear / 12),
      formula: \`visits a month (\${params.visitasMes}) × \${missShare * 100}% Local 3-Pack bounce × 12 months × \${words.valueLabel.toLowerCase()} (\${effectiveTicket.toFixed(
        2
      )} \${currency}) = \${eur(lossYear)} \${currency}/year\`,
      calculationDetails: \`No street address, no phone number and no local-business structured data were found on the page, so a map search or a "near me" query has nothing to place on a map.\`,
      explanation: \`Search engines and maps place a \${words.place} using its address, phone and schema.org markup. With none of the three, a \${words.customer} searching nearby finds a competitor instead. The Local 3-Pack captures 44% of all local commercial clicks.\`,
      assumptions: [
        {
          label: "Local 3-Pack exclusion miss rate",
          value: "4%",
          citation: "Whitespark & Moz Local Search Ranking Factors (Conservative 4% slice of the 44% total Local Pack CTR).",
          sourceUrl: "https://whitespark.ca/local-search-ranking-factors/",
        },
        trafficAssumption(params.visitasMes, audit.monthlyVisitsSource),
      ],
      remedy: \`Publish a full street address and phone number, and add LocalBusiness structured data to the homepage.\`,
      remedyHours: 1,
    });`;

if (code.includes('const missShare = 0.03;')) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('lib/quantification.ts', code);
  console.log("Patched discovery");
} else {
  console.log("Could not find discovery block");
}
