import { GoogleGenAI } from "@google/genai";
import { FullAuditReport } from "./types";

export interface DossierResult {
  markdown: string;
  source: "gemini" | "heuristic";
  modelUsed?: string;
}

export function generateDeterministicDossier(report: FullAuditReport): string {
  const { audit, leaks, totalAnnualLossEuros, recoverableAnnualEuros, params } = report;
  const name = audit.name || audit.domain;
  const eur = (n: number) => Math.round(n).toLocaleString("en-IE");

  const topLeaksText = leaks
    .slice(0, 3)
    .map(
      (l, idx) =>
        `### ${idx + 1}. ${l.title} — Loss: **-${eur(l.annualLossEuros)} EUR/year**\n` +
        `- **Why it happens:** ${l.explanation}\n` +
        `- **The maths:** \`${l.formula}\`\n` +
        `- **Fix in 48h:** ${l.remedy}`
    )
    .join("\n\n");

  const techNote = audit.wordpress
    ? `Your site runs on **WordPress**${audit.woocommerce ? " with **WooCommerce**" : ""}. The technical infrastructure is already paid for, which means fixing this does not mean starting from scratch, only switching on the channel you left off.`
    : `Your site is reachable at \`${audit.finalUrl}\`, but load friction and reliance on third parties keep repeat customers away.`;

  return `
# Margin Recovery Diagnostic
**For:** the management of ${name}
**Date:** ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
**Prepared by:** Bleed · financial audit of web presence

---

## 1. Executive diagnosis: the leak in figures

After a close look at the digital presence of **${name}** (\`${audit.domain}\`), the current setup is losing roughly:

> ### **-${eur(totalAnnualLossEuros)} EUR a year**
> *(about **${eur(totalAnnualLossEuros / 12)} EUR a month** in avoidable commission and orders not captured).*

${techNote}

With a direct fix on your own channel, the business can recover an estimated **+${eur(recoverableAnnualEuros)} EUR net a year** in cash, with no extra advertising and no extra staff.

---

## 2. The leaks and what causes them

${topLeaksText}

---

## 3. 48-hour action plan: how to stop the bleed

To close this without touching your kitchen or changing your till:

1. **Step 1: switch on the direct channel (day 1)**
   Stand up a fast direct-order path that lets a customer order from their phone in two taps, or send the order straight to your WhatsApp/till with the ticket itemised. **Commission: 0%.**

2. **Step 2: keep the local customer (day 1-2)**
   Put a card in every delivery bag: *"Order direct on our site and keep 10% for good. Code: LOCAL"*. Neighbours will back you directly if the process is fast and cheaper.

3. **Step 3: fix load speed and photos (day 2)**
   Compress the heavy image files to modern formats (WebP) and set up server or CDN caching. This cuts the mobile bounce from hungry customers at peak hours.

---

## 4. Conclusion

Aggregators (Glovo, Uber Eats, Just Eat) are useful for new customers discovering you, but **not for your regulars ordering every weekend at ${params.comisionAgregadorPct}%**.

Moving ${params.pctRecuperableCanalPropio}% of your repeat orders to your own channel means **+${eur(recoverableAnnualEuros)} EUR more this year**.
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
    
    // Fallback to "local business" if triage didn't detect it clearly
    const businessType = (triage as any)?.businessRead || "local business";

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
- Aggregator/Third-party platforms detected: ${audit.aggregators.join(", ") || "None"}
- CMS/Tech: WordPress: ${audit.wordpress} | WooCommerce: ${audit.woocommerce}
- Time to first byte (TTFB): ${audit.ttfb} s
- Homepage image weight: ${audit.imgKb} KB
- Total annual leak calculated: ${eur(totalAnnualLossEuros)} EUR/year
- Estimated recoverable margin: +${eur(recoverableAnnualEuros)} EUR/year
- Assumptions: ${params.pedidosDia} transactions/day, average ticket ${params.ticketMedio} EUR, third-party commission ${params.comisionAgregadorPct}%.

CONCRETE LEAKS DETECTED:
${leaks.map((l) => `- ${l.title}: -${eur(l.annualLossEuros)} EUR/year. Explanation: ${l.explanation}. Fix: ${l.remedy}`).join("\n")}

REQUIRED DOSSIER STRUCTURE (You must include Markdown tables):
1. **Headline**: A hard-hitting headline with the business name and the exact figure it loses per year.
2. **Executive Diagnosis**: What is happening and why paying ${params.comisionAgregadorPct}% to middlemen is bleeding their specific business model. Use terms relevant to their industry (e.g., if restaurant, talk about tables/kitchen; if clinic, talk about patients/appointments; if retail, talk about inventory/basket size).
3. **The Margin Reality (Comparison Table)**: Create a markdown table comparing the profit of a typical order/booking through a third-party platform vs. a Direct Channel. Use a realistic example product/service for their specific industry based on the ${params.ticketMedio} EUR average ticket.
4. **Breakdown of Leaks**: A detailed analysis of the top leaks, explaining with numbers how they arise and their impact on customer acquisition cost.
5. **48-Hour Action Plan**: 3 actionable, highly specific steps to stop the bleed without disrupting their daily operations.
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
