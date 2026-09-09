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

  const topLeaksText = leaks
    .slice(0, 3)
    .map(
      (l, idx) =>
        `### ${idx + 1}. ${l.title} — Pérdida: **-${l.annualLossEuros.toLocaleString("es-ES")} €/año**\n` +
        `- **Por qué ocurre:** ${l.explanation}\n` +
        `- **Supuesto matemático:** \`${l.formula}\`\n` +
        `- **Solución en 48h:** ${l.remedy}`
    )
    .join("\n\n");

  const techNote = audit.wordpress
    ? `Tu web está montada en **WordPress**${audit.woocommerce ? " con **WooCommerce**" : ""}. Ya tienes la infraestructura técnica pagada, lo que significa que solucionar esto no requiere empezar desde cero, sino encender el canal que dejaste apagado.`
    : `Tu web es accesible en \`${audit.finalUrl}\`, pero sufre de fricciones de carga y dependencia externa que alejan al cliente recurrente.`;

  return `
# Dossier de Diagnóstico y Recuperación de Margen
**Para:** Dirección de ${name}  
**Fecha:** ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}  
**Elaborado por:** Bleed · Auditoría Financiera de Presencia Web  

---

## 1. Diagnóstico Ejecutivo: La fuga de dinero en cifras

Tras analizar minuciosamente la presencia digital de **${name}** (\`${audit.domain}\`), hemos detectado que tu operativa digital actual está perdiendo aproximadamente:

> ### **-${totalAnnualLossEuros.toLocaleString("es-ES")} € al año**  
> *(Unos **${Math.round(totalAnnualLossEuros / 12).toLocaleString("es-ES")} € al mes** en comisiones evitables y pedidos no capturados).*

${techNote}

Implementando una corrección directa en tu canal web, tu negocio puede recuperar de inmediato un estimado de **+${recoverableAnnualEuros.toLocaleString("es-ES")} € limpios al año** en caja neta, sin invertir en publicidad adicional ni contratar más personal.

---

## 2. Las fugas detectadas y sus causas

${topLeaksText}

---

## 3. Plan de Acción en 48 Horas: Cómo cortar la fuga

Para cerrar este sangrado sin alterar tu operativa de cocina ni cambiar de TPV:

1. **Paso 1: Activación del Canal Directo (Día 1)**  
   Habilitar una pasarela de pedido directo ultra-rápida (carga en menos de 0.2 segundos) que permita al cliente pedir desde su teléfono en 2 clics o enviar su comanda directamente a tu WhatsApp/TPV con el ticket desglosado. **Comisión: 0 %.**

2. **Paso 2: Retención del Cliente Vecino (Día 1 - 2)**  
   Colocar en cada bolsa de reparto un tarjetón con mensaje directo: *"Pide siempre directo en nuestra web y ahórrate el 10 % para siempre. Código: VECINO"*. Los clientes de tu barrio prefieren apoyarte directamente si el proceso es rápido y más barato.

3. **Paso 3: Optimización de Carga y Fotos (Día 2)**  
   Comprimir los archivos gráficos pesados a formatos modernos (WebP) y configurar aceleración de servidor. Esto reduce el rebote móvil de clientes con hambre en horas punta.

---

## 4. Conclusión

Los agregadores (Glovo, Uber Eats, Just Eat) son útiles para que te descubran clientes nuevos, pero **no para que tus clientes habituales pidan cada fin de semana cobrándote el ${params.comisionAgregadorPct} %**.

Convertir el ${params.pctRecuperableCanalPropio} % de tus pedidos habituales a canal propio significa ingresar **+${recoverableAnnualEuros.toLocaleString("es-ES")} € más este año**.
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
    const { audit, leaks, totalAnnualLossEuros, recoverableAnnualEuros, params } = report;

    const prompt = `
Eres un consultor de estrategia financiera para hostelería y negocios locales en España.
Escribe un dossier ejecutivo, persuasivo, directo y riguroso para el dueño del restaurante: "${audit.name || audit.domain}".
Usa un tono profesional, cercano, de empresario a empresario ("hablamos de margen y de caja, no de código").
El idioma debe ser exclusivamente español peninsular impecable.

DATOS AUDITADOS REALES:
- Nombre: ${audit.name}
- URL: ${audit.finalUrl}
- Plataformas de agregadores detectadas: ${audit.aggregators.join(", ") || "Ninguna"}
- WordPress: ${audit.wordpress} | WooCommerce: ${audit.woocommerce}
- Store API pública abierta: ${audit.storeApi ? "SÍ (" + audit.storeApiItems + " productos encontrados)" : "NO"}
- Tiempo de respuesta (TTFB): ${audit.ttfb} s
- Peso imágenes portada: ${audit.imgKb} KB
- Fuga total anual calculada: ${totalAnnualLossEuros.toLocaleString("es-ES")} €/año
- Margen recuperable anual estimado: +${recoverableAnnualEuros.toLocaleString("es-ES")} €/año
- Supuestos: ${params.pedidosDia} pedidos/día, ticket medio ${params.ticketMedio} €, comisión agregadores ${params.comisionAgregadorPct}%.

FUGAS CONCRETAS:
${leaks.map((l) => `- ${l.title}: -${l.annualLossEuros} €/año. Explicación: ${l.explanation}. Solución: ${l.remedy}`).join("\n")}

ESTRUCTURA OBLIGATORIA DEL DOSSIER:
1. Titular contundente con el nombre del restaurante y la cifra exacta de dinero que pierde al año.
2. Diagnóstico ejecutivo en 2 párrafos: qué está pasando y por qué regalar el ${params.comisionAgregadorPct}% a intermediarios desangra el negocio.
3. Desglose de las 2-3 fugas más graves explicando con números cómo se originan.
4. Plan de rescate en 48 horas (3 pasos accionables).
5. Llamada a la acción: cómo recuperar los ${recoverableAnnualEuros.toLocaleString("es-ES")} € sin tocar el TPV ni cambiar de cocina.

Devuelve SOLO el contenido en formato Markdown limpio, sin preámbulos.
`.trim();

    const genPromise = ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout")), 7000)
    );
    const response = await Promise.race([genPromise, timeoutPromise]);

    const text = response.text?.trim();
    if (text && text.length > 200) {
      return {
        markdown: text,
        source: "gemini",
        modelUsed: "gemini-3.6-flash",
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
