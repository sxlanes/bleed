import { GoogleGenAI, Type } from "@google/genai";
import { AuditResult, TriageResult } from "./types";
import { VERTICAL_IDS } from "./vertical";

export async function triageLeaks(audit: AuditResult): Promise<TriageResult> {
  const t0 = performance.now();
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      verdicts: [],
      businessRead: "No API key available.",
      source: "deterministic",
      ms: Math.round(performance.now() - t0),
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const validLeakIds = [
      "fuga-agregadores",
      "fuga-velocidad",
      "fuga-woocommerce-dormido",
      "fuga-sin-whatsapp",
      "fuga-reservas-externas",
      "fuga-seguridad-tecnica",
      "fuga-descubrimiento-local",
      "fuga-potencial-directo",
    ];

    const marketplacesSeen = Array.from(
      new Set([...(audit.marketplaces || []).map((m) => m.platform), ...audit.aggregators])
    );
    const contactChannels =
      audit.contactChannels && audit.contactChannels.length > 0
        ? audit.contactChannels.join(", ")
        : audit.whatsapp
        ? "whatsapp"
        : "none detected";

    const prompt = `
You are a triage system for a site-audit tool that prices what a LOCAL BUSINESS OF ANY TRADE is losing online —
a restaurant, a shop, a clinic, a hotel, a tradesperson, a professional practice, or anything else with a
website. Analyze the following facts and determine which leaks apply to THIS business.
Order them by expected impact (1 = most important).
DO NOT return ANY monetary values or euros. You judge only what matters.
You can ONLY select from the following valid leak IDs: ${validLeakIds.join(", ")}.
If there is no evidence in the facts for a leak, do not select it.

Also name the trade. Pick exactly one of: ${VERTICAL_IDS.join(", ")}.
restaurant = food service; retail = sells goods; lodging = hotel or holiday rental;
appointment = books time slots (clinic, salon, gym); trade = works on site (plumber,
electrician, builder); professional = a practice selling expertise (lawyer, accountant,
agency); generic = you genuinely cannot tell. Answer "generic" rather than guess: a wrong
trade prices this business with somebody else's numbers.

FACTS:
- Name: ${audit.name}
- Domain: ${audit.domain}
- URL: ${audit.finalUrl}
- Platform/CMS: ${audit.platform || (audit.wordpress ? "WordPress" : "unknown")}
- Has its own shop or booking engine (WooCommerce, a store API, a booking provider): ${
      audit.woocommerce || !!audit.storeApi || !!audit.bookingProvider
    }
- Time to first byte: ${audit.ttfb}s
- Homepage image weight: ${audit.imgKb}KB
- Marketplaces or platforms linked to (delivery apps, booking sites, directories, lead marketplaces...): ${
      marketplacesSeen.join(", ") || "none detected"
    }
- Has its own order/checkout path: ${audit.ownOrder}
- Direct contact channels found on the site: ${contactChannels}
- Uses a third-party booking/reservation widget: ${audit.reserva || !!audit.bookingProvider}
- PHP EOL: ${audit.eolPhp}
- HTTPS: ${audit.https}
- Declared structured-data type(s): ${(audit.schemaTypes || []).join(", ") || "none declared"}
- Street address on file: ${!!audit.address}
- Phone number on file: ${!!audit.telephone}
`.trim();

    const genPromise = ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            businessRead: {
              type: Type.STRING,
              description: "What kind of business you believe this is and why.",
            },
            vertical: {
              type: Type.STRING,
              description: `One of: ${VERTICAL_IDS.join(", ")}. Use generic when unsure.`,
            },
            verdicts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  leakId: {
                    type: Type.STRING,
                    description: "Must be one of the valid leak IDs.",
                  },
                  rank: {
                    type: Type.INTEGER,
                    description: "Rank of importance, 1 being most important.",
                  },
                  whyItMattersHere: {
                    type: Type.STRING,
                    description: "One sentence explaining why it matters for this specific business.",
                  },
                  confidence: {
                    type: Type.STRING,
                    description: "high, medium, or low",
                  },
                },
                required: ["leakId", "rank", "whyItMattersHere", "confidence"],
              },
            },
          },
          required: ["businessRead", "vertical", "verdicts"],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout")), 7000)
    );
    const response = await Promise.race([genPromise, timeoutPromise]);

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response");

    const parsed = JSON.parse(text);
    
    const verdicts = (parsed.verdicts || []).filter((v: any) => 
      validLeakIds.includes(v.leakId)
    );

    return {
      verdicts,
      businessRead: parsed.businessRead || "",
      vertical: VERTICAL_IDS.includes(parsed.vertical) ? parsed.vertical : undefined,
      source: "gemini",
      modelUsed: "gemini-3.6-flash",
      ms: Math.round(performance.now() - t0),
    };
  } catch (error) {
    return {
      verdicts: [],
      businessRead: "Fallback due to error or timeout.",
      source: "deterministic",
      ms: Math.round(performance.now() - t0),
    };
  }
}
