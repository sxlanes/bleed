const fs = require('fs');
let code = fs.readFileSync('lib/gemini-dossier.ts', 'utf8');

const oldCode = `    const prompt = \`
You are an elite financial strategy consultant and conversion rate expert.
Write an executive dossier for the owner of "\${audit.name || audit.domain}".
Crucially, you must adapt your entire language, examples, and metrics to this specific type of business:
[BUSINESS TYPE/CONTEXT]: \${businessType}

Use a highly professional, direct, and rigorous tone, "owner to owner" (we are talking margin and cash flow, not code).
Write exclusively in clear British English.
Every figure in this report is in \${cur}. Use that currency and no other; never convert.

REAL AUDITED DATA:
- Name: \${audit.name}
- URL: \${audit.finalUrl}
- Platforms it hands customers to: \${platformNames.join(", ") || "None"}
- CMS/Tech: WordPress: \${audit.wordpress} | WooCommerce: \${audit.woocommerce}
- Time to first byte (TTFB): \${audit.ttfb} s
- Homepage image weight: \${audit.imgKb} KB
- Total annual leak calculated: \${eur(totalAnnualLossEuros)} a year
- Estimated recoverable margin: +\${eur(recoverableAnnualEuros)} a year
- Assumptions: \${params.pedidosDia} \${w.transactions} per \${verdict.definition.ratePeriod}, \${w.valueLabel.toLowerCase()} \${params.ticketMedio} \${cur}, platform fee \${params.comisionAgregadorPct}%.
- The words this owner uses: one transaction is a "\${w.transaction}", a customer is a "\${w.customer}", what they list is their "\${w.catalogue}". Use them.

CONCRETE LEAKS DETECTED:
\${leaks.map((l) => \`- \${l.title}: -\${eur(l.annualLossEuros)} a year. Explanation: \${l.explanation}. Fix: \${l.remedy}\`).join("\\n")}

REQUIRED DOSSIER STRUCTURE (You must include Markdown tables):
1. **Headline**: A hard-hitting headline with the business name and the exact figure it loses per year.
2. **Executive Diagnosis**: What is happening and why paying \${params.comisionAgregadorPct}% to middlemen is bleeding their specific business model. Use the vocabulary of their trade throughout.
3. **The Margin Reality (Comparison Table)**: Create a markdown table comparing the profit of a typical order/booking through a third-party platform vs. a Direct Channel. Use a realistic example \${w.catalogue} item for their specific industry based on the \${params.ticketMedio} EUR \${w.valueLabel.toLowerCase()}.
4. **Breakdown of Leaks**: A detailed analysis of the top leaks, explaining with numbers how they arise and their impact on customer acquisition cost.
5. **Action Plan**: 3 actionable, highly specific steps to stop the bleed without disrupting their daily operations. The total work measured is \${repairHours} hours — use that figure and never promise a deadline we did not measure.
6. **Financial Projection (Table)**: A 12-month projection table showing the cumulative cash recovered if they move \${params.pctRecuperableCanalPropio}% of volume to their direct channel.

Return ONLY the content in clean Markdown, no preamble. Make it visually engaging with bolding and blockquotes.
\`.trim();
    let finalPrompt = prompt;
    const contents: any[] = [];
    if (audit.screenshotBase64) {
      finalPrompt += \`
7. **Visual UX Assessment**: Analyze the provided screenshot of their homepage. Point out 1 or 2 specific visual friction points (e.g., poor contrast, unclear call-to-action, cluttered design) that cost them \${w.customers}. Mention exactly what you see in the screenshot so they know it is real.\`;
      
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: audit.screenshotBase64,
        }
      });
    }
    contents.push(finalPrompt);

    const genPromise = ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: contents,
    });`;

const newCode = `    const textPrompt = \`
You are an elite financial strategy consultant and conversion rate expert.
Write an executive dossier for the owner of "\${audit.name || audit.domain}".
Crucially, you must adapt your entire language, examples, and metrics to this specific type of business:
[BUSINESS TYPE/CONTEXT]: \${businessType}

Use a highly professional, direct, and rigorous tone, "owner to owner" (we are talking margin and cash flow, not code).
Write exclusively in clear British English.
Every figure in this report is in \${cur}. Use that currency and no other; never convert.

REAL AUDITED DATA:
- Name: \${audit.name}
- URL: \${audit.finalUrl}
- Platforms it hands customers to: \${platformNames.join(", ") || "None"}
- Total annual leak calculated: \${eur(totalAnnualLossEuros)} a year
- Estimated recoverable margin: +\${eur(recoverableAnnualEuros)} a year
- Assumptions: \${params.pedidosDia} \${w.transactions} per \${verdict.definition.ratePeriod}, \${w.valueLabel.toLowerCase()} \${params.ticketMedio} \${cur}, platform fee \${params.comisionAgregadorPct}%.

CONCRETE LEAKS DETECTED:
\${leaks.map((l) => \`- \${l.title}: -\${eur(l.annualLossEuros)} a year. Explanation: \${l.explanation}. Fix: \${l.remedy}\`).join("\\n")}

REQUIRED DOSSIER STRUCTURE (You must include Markdown tables):
1. **Headline**: A hard-hitting headline with the business name and the exact figure it loses per year.
2. **Executive Diagnosis**: What is happening and why paying \${params.comisionAgregadorPct}% to middlemen is bleeding their specific business model. Use the vocabulary of their trade throughout.
3. **The Margin Reality (Comparison Table)**: Create a markdown table comparing the profit of a typical order/booking through a third-party platform vs. a Direct Channel. Use a realistic example \${w.catalogue} item for their specific industry based on the \${params.ticketMedio} EUR \${w.valueLabel.toLowerCase()}.
4. **Breakdown of Leaks**: A detailed analysis of the top leaks, explaining with numbers how they arise and their impact on customer acquisition cost.
5. **Action Plan**: 3 actionable, highly specific steps to stop the bleed without disrupting their daily operations. The total work measured is \${repairHours} hours — use that figure and never promise a deadline we did not measure.
6. **Financial Projection (Table)**: A 12-month projection table showing the cumulative cash recovered if they move \${params.pctRecuperableCanalPropio}% of volume to their direct channel.

Return ONLY the content in clean Markdown, no preamble. Make it visually engaging with bolding and blockquotes.
\`.trim();

    // Vision UX Assessment using Structured Outputs (JSON Schema)
    let uxMarkdown = "";
    if (audit.screenshotBase64) {
      const uxPrompt = \`Analyze this homepage screenshot as an expert in Cognitive UX and Conversion Rate Optimization. 
Evaluate it strictly against these 4 heuristics:
1. WCAG Contrast: Is the text easily readable against the background?
2. Norman Affordances: Do buttons look like buttons? Are links obvious?
3. Hick's Law: Are there too many options competing for attention?
4. Cannibalization: Is there a massive button sending users to Glovo, UberEats, or Booking.com instead of a direct order?

Return a JSON with the evaluation.\`;

      try {
        const uxGenPromise = ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { inlineData: { mimeType: "image/jpeg", data: audit.screenshotBase64 } },
            uxPrompt
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                hasContrastIssues: { type: "BOOLEAN" },
                hasAffordanceIssues: { type: "BOOLEAN" },
                violatesHicksLaw: { type: "BOOLEAN" },
                hasAggregatorCannibalization: { type: "BOOLEAN" },
                executiveSummary: { type: "STRING", description: "A 2-3 sentence brutal assessment of the visual friction" },
                conversionImpact: { type: "STRING", description: "How this specifically loses them money" }
              },
              required: ["hasContrastIssues", "hasAffordanceIssues", "violatesHicksLaw", "hasAggregatorCannibalization", "executiveSummary", "conversionImpact"]
            }
          }
        });
        
        const uxResponse = await Promise.race([
          uxGenPromise, 
          new Promise((_, reject) => setTimeout(() => reject(new Error("UX Vision timeout")), 15000))
        ]) as any;
        
        if (uxResponse.text) {
          const uxData = JSON.parse(uxResponse.text);
          uxMarkdown = \`\n7. **Visual UX Assessment (AI Vision)**: \${uxData.executiveSummary} \${uxData.conversionImpact}\`;
          
          if (uxData.hasAggregatorCannibalization) {
             uxMarkdown += " You are actively sending your own traffic away to third-party aggregators.";
          }
        }
      } catch (e) {
        console.warn("UX Vision analysis failed:", e);
      }
    }

    const genPromise = ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [textPrompt + uxMarkdown],
    });`;

if (code.includes('const genPromise = ai.models.generateContent({')) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('lib/gemini-dossier.ts', code);
  console.log("Patched gemini dossier");
} else {
  console.log("Could not find gemini dossier block");
}
