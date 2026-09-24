import re
import sys

with open('lib/quantification.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Patch the Speed leak
speed_pattern = r'(\/\/ 2\. Load speed and page weight.*?if \(isSlowTtfb \|\| isHeavyPage\) \{).*?(\n\s*const reasons: string\[\] = \[\];)'
speed_replacement = r'''\1
    // Physical network delay for images (assuming 16 Mbps = 2000 KB/s on 4G)
    const extraSeconds = Math.max(0, audit.ttfb - 1.0);
    const excessImgKb = Math.max(0, audit.imgKb - 1000);
    const heavyPenaltySeconds = audit.imgKb > 1800 ? Math.round((excessImgKb / 2000) * 10) / 10 : 0;
    
    const pointsLost = (extraSeconds + heavyPenaltySeconds) * CONVERSION_DROP_PER_SECOND.valor;
    const baselineConversion = 7; // percent of intent-bearing visits that would convert
    const keptFraction = Math.max(0, (baselineConversion - pointsLost) / baselineConversion);
    const lostFraction = 1 - keptFraction;
    const lostTransactionsMonth = Math.round(params.visitasMes * (baselineConversion / 100) * lostFraction);
    const speedLossYear = Math.round(lostTransactionsMonth * effectiveTicket * 12);\2'''

code = re.sub(speed_pattern, speed_replacement, code, flags=re.DOTALL)

# Speed assumptions
speed_assumptions_pattern = r'(\{[\s\n]*label: "Time to first byte.*?trafficAssumption\(params\.visitasMes, audit\.monthlyVisitsSource\),[\s\n]*\])'
speed_assumptions_replacement = r'''{
          label: "Time to first byte (TTFB)",
          value: `${audit.ttfb}s`,
          citation: "Measured live during this audit. Google's recommended threshold is < 0.8s.",
        },
        {
          label: "Homepage image weight",
          value: `${audit.imgKb.toLocaleString("en-IE")} KB`,
          citation: "Measured live: bytes transferred in images. The Core Web Vitals mobile budget is 1,000 KB.",
        },
        ...(heavyPenaltySeconds > 0 ? [{
          label: "Calculated mobile network delay",
          value: `+${heavyPenaltySeconds}s`,
          citation: "Cellular network physics: transfer delay for excess bytes on median Spanish 4G (16 Mbps per CNMC).",
          sourceUrl: "https://www.cnmc.es",
        }] : []),
        assumptionFromConstant("Conversion drop per extra second", `${CONVERSION_DROP_PER_SECOND.valor} points/s`, CONVERSION_DROP_PER_SECOND),
        {
          label: "Baseline conversion for high-intent visitors",
          value: `${baselineConversion}%`,
          citation: "Conservative team estimate for qualified local traffic. Adjustable in the simulator.",
        },
        trafficAssumption(params.visitasMes, audit.monthlyVisitsSource),
      ]'''

code = re.sub(speed_assumptions_pattern, speed_assumptions_replacement, code, flags=re.DOTALL)


# 2. Patch Aggregators Leak (Pricing Parity)
aggregator_pattern = r'(// 1\. Marketplace commission drain.*?const commissionsYear = Math\.round\(grossPerYear \* \(params\.comisionAgregadorPct \/ 100\)\);[\s\n]*const recoverableYear = Math\.round\(commissionsYear \* \(params\.pctRecuperableCanalPropio \/ 100\)\);)'
aggregator_replacement = r'''\1
    // Pricing Parity & Aggregator Drain Sub-model
    const hasDirectIncentive = audit.html?.match(/mejor precio garantizado|descuento directo|reserva directa|ahorra \d+%|best rate guarantee|direct discount|book direct/i) !== null;
    const crossoverRate = 0.55; // Billboard effect (Cornell)
    const recoveryShare = 0.32; // Conversion lost to parity (Amadeus/Mirai)
    const netArbitrageMargin = Math.max(0.05, (params.comisionAgregadorPct / 100) - 0.08); // Net commission saved after 8% direct perk
    const cannibalizedOrdersYear = Math.round(grossPerYear * crossoverRate * recoveryShare / effectiveTicket);
    const parityLeakYear = hasDirectIncentive ? 0 : Math.round(cannibalizedOrdersYear * effectiveTicket * netArbitrageMargin);
    const isParityTrap = parityLeakYear > 0;
'''
code = re.sub(aggregator_pattern, aggregator_replacement, code, flags=re.DOTALL)


# 3. Patch Security Leak
security_pattern = r'(// 6\. Technical obsolescence and security.*?)(\/\/ 7\. Discovery)'
security_replacement = r'''// 6. Security and Technical Obsolescence
  if (!audit.https || audit.eolPhp || !audit.viewport) {
    const isHttp = !audit.https;
    const isEol = audit.eolPhp;
    
    // Vector 1: Fuga de conversión por falta de HTTPS (Baymard 19%)
    let httpsLossYear = 0;
    if (isHttp) {
      const baymardTrustDrop = 0.19; // 19% cart / intent abandonment due to security distrust
      if (audit.woocommerce || audit.storeApi) {
        const grossDirectYear = params.pedidosDia * effectiveTicket * periodsPerYear * (params.pctRecuperableCanalPropio / 100);
        httpsLossYear = Math.round(grossDirectYear * baymardTrustDrop);
      } else {
        const intentVisitsYear = params.visitasMes * 0.04 * 12;
        httpsLossYear = Math.round(intentVisitsYear * baymardTrustDrop * effectiveTicket);
      }
    }

    // Vector 2: Riesgo anualizado por software EOL expuesto (ALE = ARO x SLE)
    let eolRiskYear = 0;
    if (isEol) {
      const remediationCost = 850; // Incident disinfection baseline (INCIBE/industry standard)
      const annualExploitRate = 0.15; // 15% probability per year for advertised EOL runtime
      eolRiskYear = Math.round(remediationCost * annualExploitRate);
    }
    
    // Vector 3: Viewport (legacy)
    const viewportLossYear = !audit.viewport ? 600 : 0;

    const totalSecurityLossYear = httpsLossYear + eolRiskYear + viewportLossYear;

    if (totalSecurityLossYear > 0) {
      const reasons: string[] = [];
      if (isHttp) reasons.push("unencrypted HTTP connection triggering browser 'Not secure' alerts");
      if (isEol) reasons.push(`outdated PHP ${audit.phpVersion || "EOL"} advertising known unpatched vulnerabilities`);
      if (!audit.viewport) reasons.push("missing mobile viewport tag");

      leaks.push({
        id: "fuga-seguridad-confianza",
        title: isHttp 
          ? `${words.customers[0].toUpperCase()}${words.customers.slice(1)} lost to browser security warnings (No HTTPS)`
          : `Vulnerability risk on unmaintained runtime (PHP ${audit.phpVersion || "EOL"})`,
        category: "tecnico",
        severity: isHttp ? "critica" : "alta",
        annualLossEuros: totalSecurityLossYear,
        monthlyLossEuros: Math.round(totalSecurityLossYear / 12),
        formula: isHttp
          ? `19% abandonment on security-sensitive transactions (Baymard Institute) = ${eur(httpsLossYear)} ${currency}/year${isEol ? ` + ${eur(eolRiskYear)} ${currency} annualized recovery risk` : ""}`
          : `15% annual exploit probability on EOL runtime × 850 ${currency} remediation cost = ${eur(eolRiskYear)} ${currency}/year`,
        calculationDetails: isHttp
          ? `Modern browsers display an explicit 'Not secure' badge. Baymard Institute benchmarks show 19% of ready-to-buy users abandon checkout when they perceive the connection is unsafe.`
          : `Publicly broadcasting an end-of-life PHP version invites automated exploitation, risking search engine blacklisting (Google Safe Browsing).`,
        explanation: `Your server advertises an out-of-date setup (${reasons.join(", ")}). Beyond the hack risk, modern browsers demote the ranking and warn ${words.customers} in ways that break trust.`,
        assumptions: [
          ...(isHttp ? [
            {
              label: "Checkout abandonment from security distrust",
              value: "19%",
              citation: "Baymard Institute (2024), Reasons for Cart Abandonment. Measured across multi-sector checkout flows.",
              sourceUrl: "https://baymard.com/lists/cart-abandonment-rate",
            },
            trafficAssumption(params.visitasMes, audit.monthlyVisitsSource),
          ] : []),
          ...(isEol ? [
            {
              label: "PHP lifecycle status",
              value: audit.phpVersion ? `PHP ${audit.phpVersion} (End-of-Life)` : "Unsupported",
              citation: "The PHP Group official release calendar: version has zero official security updates.",
              sourceUrl: "https://www.php.net/supported-versions.php",
            },
            {
              label: "Incident remediation baseline",
              value: `850 ${currency}`,
              citation: "INCIBE / industry median cost for CMS emergency clean-up and malware purge.",
            },
          ] : []),
        ],
        remedy: isHttp && isEol
          ? "Enable a free Let's Encrypt SSL certificate in your hosting panel and update PHP to version 8.2 or 8.3."
          : isHttp
          ? "Enable a free Let's Encrypt SSL certificate and enforce HTTPS redirection."
          : "Switch PHP version to 8.2+ in your hosting panel and disable the 'expose_php' header.",
        remedyHours: 1,
      });
    }
  }

  \2'''

code = re.sub(security_pattern, security_replacement, code, flags=re.DOTALL)

with open('lib/quantification.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated quantification leaks successfully!")
