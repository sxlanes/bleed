import { GoogleGenAI } from "@google/genai";
import { FullAuditReport } from "./types";
import { classifyVertical } from "./vertical";

export interface DossierResult {
  markdown: string;
  source: "gemini" | "heuristic";
  modelUsed?: string;
}

export function generateDeterministicDossier(report: FullAuditReport): string {
  const { audit, leaks, totalAnnualLossEuros, recoverableAnnualEuros, params } = report;
  const name = audit.name || audit.domain;
  const eur = (n: number) => Math.round(n).toLocaleString("en-IE");

  /* The dossier is read by the owner, so it speaks the trade's own words: a
     restaurant's order is a clinic's appointment and a hotel's booking. */
  const verdict = report.vertical ?? classifyVertical(audit);
  const w = verdict.definition.words;
  const platformNames = Array.from(
    new Set([...(audit.marketplaces || []).map((m) => m.platform), ...(audit.aggregators || [])])
  );
  const platforms = platformNames.length ? platformNames.join(", ") : w.marketplaceLabel;
  const repairHours = leaks.reduce((acc, l) => acc + l.remedyHours, 0);

  const topLeaksText = leaks
    .slice(0, 3)
    .map(
      (l, idx) =>
        `### ${idx + 1}. ${l.title} — Loss: **-${eur(l.annualLossEuros)} EUR a year**\n` +
        `- **Why it happens:** ${l.explanation}\n` +
        `- **The maths:** \`${l.formula}\`\n` +
        `- **The fix (${l.remedyHours} h):** ${l.remedy}`
    )
    .join("\n\n");

  const planSteps = leaks
    .slice(0, 3)
    .map((l, idx) => `${idx + 1}. **${l.title}** (${l.remedyHours} h)\n   ${l.remedy}`)
    .join("\n\n");

  const techNote = audit.wordpress
    ? `Your site runs on **WordPress**${audit.woocommerce ? " with **WooCommerce**" : ""}. The technical infrastructure is already paid for, which means fixing this does not mean starting from scratch, only switching on the channel you left off.`
    : `Your site is reachable at \`${audit.finalUrl}\`, but load friction and reliance on third parties keep repeat ${w.customers} away.`;

  return `
# Margin Recovery Diagnostic
**For:** the management of ${name}
**Date:** ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
**Prepared by:** Bleed · financial audit of web presence

---

## 1. Executive diagnosis: the leak in figures

${verdict.evidence} After a close look at the digital presence of **${name}** (\`${audit.domain}\`), the current setup is losing roughly:

> ### **-${eur(totalAnnualLossEuros)} EUR a year**
> *(about **${eur(totalAnnualLossEuros / 12)} EUR a month** in avoidable fees and ${w.transactions} never captured).*

${techNote}

With a direct fix on your own channel, the business can recover an estimated **+${eur(recoverableAnnualEuros)} EUR net a year** in cash, with no extra advertising and no extra staff.

---

## 2. The leaks and what causes them

${topLeaksText}

---

## 3. Action plan: ${repairHours} hours of work, biggest leak first

${planSteps}

---

## 4. Conclusion

${platforms} are useful for a ${w.customer} who has never heard of you. They are an expensive way to serve the ones who already have, at ${params.comisionAgregadorPct}% of every ${w.transaction}.

Moving ${params.pctRecuperableCanalPropio}% of your repeat ${w.transactions} to your own channel means **+${eur(recoverableAnnualEuros)} EUR more this year**.
`.trim();
}

export async function generateGeminiDossier(
  report: FullAuditReport
): Promise<DossierResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      markdown: generateDeterministicDossier(report),
      source: "heuristic",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const { audit, leaks, totalAnnualLossEuros, recoverableAnnualEuros, params, triage } = report;
    const eur = (n: number) => Math.round(n).toLocaleString("en-IE");
    
    /* The classifier decides the trade from the site's own structured data and
       the platforms it links to. The model's free-text read is the fallback,
       not the source of truth. */
    const verdict = report.vertical ?? classifyVertical(audit);
    const w = verdict.definition.words;
    const businessType = `${verdict.definition.label}. ${verdict.evidence} ${
      (triage as any)?.businessRead || ""
    }`.trim();
    const platformNames = Array.from(
      new Set([...(audit.marketplaces || []).map((m) => m.platform), ...(audit.aggregators || [])])
    );
    const repairHours = leaks.reduce((acc, l) => acc + l.remedyHours, 0);

    const prompt = `
You are an elite financial strategy consultant and conversion rate expert.
Write an executive dossier for the owner of "${audit.name || audit.domain}".
Crucially, you must adapt your entire language, examples, and metrics to this specific type of business:
[BUSINESS TYPE/CONTEXT]: ${businessType}

Use a highly professional, direct, and rigorous tone, "owner to owner" (we are talking margin and cash flow, not code).
Write exclusively in clear British English.

REAL AUDITED DATA:
- Name: ${audit.name}
- URL: ${audit.finalUrl}
- Platforms it hands customers to: ${platformNames.join(", ") || "None"}
- CMS/Tech: WordPress: ${audit.wordpress} | WooCommerce: ${audit.woocommerce}
- Time to first byte (TTFB): ${audit.ttfb} s
- Homepage image weight: ${audit.imgKb} KB
- Total annual leak calculated: ${eur(totalAnnualLossEuros)} EUR/year
- Estimated recoverable margin: +${eur(recoverableAnnualEuros)} EUR/year
- Assumptions: ${params.pedidosDia} ${w.transactions} per ${verdict.definition.ratePeriod}, ${w.valueLabel.toLowerCase()} ${params.ticketMedio} EUR, platform fee ${params.comisionAgregadorPct}%.
- The words this owner uses: one transaction is a "${w.transaction}", a customer is a "${w.customer}", what they list is their "${w.catalogue}". Use them.

CONCRETE LEAKS DETECTED:
${leaks.map((l) => `- ${l.title}: -${eur(l.annualLossEuros)} EUR/year. Explanation: ${l.explanation}. Fix: ${l.remedy}`).join("\n")}

REQUIRED DOSSIER STRUCTURE (You must include Markdown tables):
1. **Headline**: A hard-hitting headline with the business name and the exact figure it loses per year.
2. **Executive Diagnosis**: What is happening and why paying ${params.comisionAgregadorPct}% to middlemen is bleeding their specific business model. Use the vocabulary of their trade throughout.
3. **The Margin Reality (Comparison Table)**: Create a markdown table comparing the profit of a typical order/booking through a third-party platform vs. a Direct Channel. Use a realistic example ${w.catalogue} item for their specific industry based on the ${params.ticketMedio} EUR ${w.valueLabel.toLowerCase()}.
4. **Breakdown of Leaks**: A detailed analysis of the top leaks, explaining with numbers how they arise and their impact on customer acquisition cost.
5. **Action Plan**: 3 actionable, highly specific steps to stop the bleed without disrupting their daily operations. The total work measured is ${repairHours} hours — use that figure and never promise a deadline we did not measure.
6. **Financial Projection (Table)**: A 12-month projection table showing the cumulative cash recovered if they move ${params.pctRecuperableCanalPropio}% of volume to their direct channel.

Return ONLY the content in clean Markdown, no preamble. Make it visually engaging with bolding and blockquotes.
`.trim();

    const genPromise = ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout")), 25000) // increased timeout for pro model
    );
    const response = await Promise.race([genPromise, timeoutPromise]);

    const text = response.text?.trim();
    if (text && text.length > 200) {
      return {
        markdown: text,
        source: "gemini",
        modelUsed: "gemini-2.5-pro",
      };
    }
    return {
      markdown: generateDeterministicDossier(report),
      source: "heuristic",
    };
  } catch {
    return {
      markdown: generateDeterministicDossier(report),
      source: "heuristic",
    };
  }
}
