import { GoogleGenAI, Type } from "@google/genai";
import { AuditResult, TriageResult } from "./types";

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
      "fuga-potencial-directo",
    ];

    const prompt = `
You are a triage system. Analyze the following facts about a business and determine which leaks apply to them.
Order them by expected impact (1 = most important).
DO NOT return ANY monetary values or euros. You judge only what matters.
You can ONLY select from the following valid leak IDs: ${validLeakIds.join(", ")}.
If there is no evidence in the facts for a leak, do not select it.

FACTS:
- Name: ${audit.name}
- Domain: ${audit.domain}
- URL: ${audit.finalUrl}
- Has WordPress: ${audit.wordpress}
- Has WooCommerce: ${audit.woocommerce}
- Time to first byte: ${audit.ttfb}s
- Homepage image weight: ${audit.imgKb}KB
- Aggregators detected: ${audit.aggregators.join(", ")}
- Has own order system: ${audit.ownOrder}
- Has WhatsApp: ${audit.whatsapp}
- Has Reservation system: ${audit.reserva}
- PHP EOL: ${audit.eolPhp}
- HTTPS: ${audit.https}
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
          required: ["businessRead", "verdicts"],
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
