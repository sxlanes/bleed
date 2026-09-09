import {
  AuditResult,
  AuditSimulationParams,
  FullAuditReport,
  Leak,
} from "./types";

export const DEFAULT_PARAMS: AuditSimulationParams = {
  ticketMedio: 24.5,
  pedidosDia: 15,
  comisionAgregadorPct: 28,
  visitasMes: 1200,
  pctRecuperableCanalPropio: 40,
  comisionReservaPorCubierto: 2.0,
  reservasMes: 180,
};

export function calculateLeaks(
  audit: AuditResult,
  customParams?: Partial<AuditSimulationParams>
): FullAuditReport {
  const params: AuditSimulationParams = {
    ...DEFAULT_PARAMS,
    ...customParams,
  };

  const leaks: Leak[] = [];

  // 1. FUGA DE AGREGADORES (Aggregator Commission Drain)
  if (audit.aggregators.length > 0) {
    const totalDeliveryAnnualGross = params.pedidosDia * params.ticketMedio * 365;
    const totalAggregatorCommissions = Math.round(
      totalDeliveryAnnualGross * (params.comisionAgregadorPct / 100)
    );
    const recoverableAnnual = Math.round(
      totalAggregatorCommissions * (params.pctRecuperableCanalPropio / 100)
    );

    const appsList = audit.aggregators.join(", ");

    leaks.push({
      id: "fuga-agregadores",
      title: `Comisiones cedidas a agregadores (${appsList})`,
      category: "agregadores",
      severity: "critica",
      annualLossEuros: totalAggregatorCommissions,
      monthlyLossEuros: Math.round(totalAggregatorCommissions / 12),
      formula: `${params.pedidosDia} pedidos/día × ${params.ticketMedio.toFixed(2)} € × ${params.comisionAgregadorPct} % com. × 365 días = ${totalAggregatorCommissions.toLocaleString("es-ES")} €/año`,
      calculationDetails: `Sobre una facturación anual de delivery estimada de ${totalDeliveryAnnualGross.toLocaleString("es-ES")} €, las plataformas se quedan ${totalAggregatorCommissions.toLocaleString("es-ES")} €. Recuperando solo el ${params.pctRecuperableCanalPropio} % de clientes recurrentes mediante canal propio, el restaurante retiene +${recoverableAnnual.toLocaleString("es-ES")} € limpios en su cuenta.`,
      explanation: `Tu web enlaza directamente a ${appsList}. Estás regalando entre el 25 % y el 35 % de cada ticket a un tercero por pedidos de clientes que ya estaban en tu propia web o que son vecinos de tu barrio. Además, el agregador se queda con los datos del cliente para venderle al día siguiente la comida de tu competencia.`,
      assumptions: [
        {
          label: "Ticket medio",
          value: `${params.ticketMedio.toFixed(2)} €`,
          citation: "Estudio Hostelería de España & KPMG: Ticket medio delivery en España 2024-2026",
        },
        {
          label: "Volumen diario",
          value: `${params.pedidosDia} pedidos/día`,
          citation: "Mediana en restaurantes urbanos de comida casual / pizzerías con reparto",
        },
        {
          label: "Comisión agregador",
          value: `${params.comisionAgregadorPct} %`,
          citation: "Tarifas comerciales estándar de Glovo (30%), Just Eat (25-28%) y Uber Eats (30-33%)",
        },
        {
          label: "Tasa de recuperación",
          value: `${params.pctRecuperableCanalPropio} %`,
          citation: "Porcentaje de clientes habituales que prefieren pedir directo con incentivo (10% descuento o bebida)",
        },
      ],
      remedy: `Activar canal propio de pedido web/WhatsApp con checkout directo (0 % comisión) y colocar flyer en cada bolsa: "Pide directo en nuestra web y ahórrate el 10 % para siempre".`,
      remedyHours: 4,
    });
  }

  // 2. FUGA POR VELOCIDAD Y PESO MÓVIL (TTFB & Heavy Images)
  const isSlowTtfb = audit.ttfb > 1.2;
  const isHeavyPage = audit.imgKb > 1800;

  if (isSlowTtfb || isHeavyPage) {
    // Estimación de rebote: 5% base + 12% por cada segundo sobre 1.0s + 8% si imágenes > 2MB
    const extraTime = Math.max(0, audit.ttfb - 1.0);
    const bouncePct = Math.min(
      45,
      Math.round(15 + extraTime * 12 + (audit.imgKb > 2500 ? 12 : 0))
    );
    const conversionRate = 0.07; // 7% de visitas con hambre convierten
    const lostOrdersPerMonth = Math.round(
      params.visitasMes * (bouncePct / 100) * conversionRate
    );
    const annualSpeedLoss = Math.round(
      lostOrdersPerMonth * params.ticketMedio * 12
    );

    const reasons: string[] = [];
    if (isSlowTtfb) reasons.push(`TTFB de ${audit.ttfb} s (el umbral recomendado es < 0.6 s)`);
    if (isHeavyPage) reasons.push(`${audit.imgKb.toLocaleString("es-ES")} KB en imágenes en la portada`);
    if (audit.heavyImgs.length > 0) {
      reasons.push(`${audit.heavyImgs.length} fotos superan los 450 KB cada una`);
    }

    leaks.push({
      id: "fuga-velocidad",
      title: `Pérdida de clientes por lentitud y peso móvil (${audit.ttfb}s / ${audit.imgKb} KB)`,
      category: "velocidad",
      severity: audit.ttfb > 2.0 || audit.imgKb > 3500 ? "critica" : "alta",
      annualLossEuros: annualSpeedLoss,
      monthlyLossEuros: Math.round(annualSpeedLoss / 12),
      formula: `${params.visitasMes} visitas/mes × ${bouncePct} % rebote móvil × 7 % conv. × ${params.ticketMedio.toFixed(2)} € × 12 m = ${annualSpeedLoss.toLocaleString("es-ES")} €/año`,
      calculationDetails: `Se pierden aproximadamente ${lostOrdersPerMonth} pedidos al mes (${lostOrdersPerMonth * 12} pedidos/año) de personas que entraron con intención de pedir pero cerraron la pestaña ante la lentitud de carga.`,
      explanation: `Tu web tiene ${reasons.join(" y ")}. Según los estudios de Google y Akamai, en móvil más del 53 % de los usuarios abandonan si la carga tarda más de 3 segundos. A las 21:15 de la noche, un usuario con hambre en el móvil no espera: vuelve a Google o abre la app de Glovo.`,
      assumptions: [
        {
          label: "TTFB medido",
          value: `${audit.ttfb} s`,
          citation: "Medición en tiempo real realizada durante la auditoría con navegador headless",
        },
        {
          label: "Peso imágenes portada",
          value: `${audit.imgKb} KB`,
          citation: "Suma del peso transferido de imágenes detectadas en la página principal",
        },
        {
          label: "Tasa de rebote inducido",
          value: `${bouncePct} %`,
          citation: "Deloitte Digital / Google: 'Milliseconds Make Millions' (estudio de conversión en hostelería)",
        },
      ],
      remedy: `Convertir fotos a formato WebP/AVIF comprimido (reducción inmediata del 80 % de peso) y habilitar caché de página en servidor o Cloudflare CDN.`,
      remedyHours: 2,
    });
  }

  // 3. TIENDA WOOCOMMERCE DESAPROVECHADA (Dormant WooCommerce Store)
  if (audit.woocommerce && (audit.aggregators.length > 0 || !audit.ownOrderSignals.includes("checkout"))) {
    const directEfficiencyLoss = Math.round(
      params.pedidosDia * params.ticketMedio * 365 * 0.12
    );

    leaks.push({
      id: "fuga-woocommerce-dormido",
      title: "Tienda online propia pagada pero sin explotar (WooCommerce)",
      category: "canal_propio",
      severity: "alta",
      annualLossEuros: directEfficiencyLoss,
      monthlyLossEuros: Math.round(directEfficiencyLoss / 12),
      formula: `Estimación de coste de oportunidad sobre pedidos propios = ${directEfficiencyLoss.toLocaleString("es-ES")} €/año`,
      calculationDetails: `El restaurante ya pagó el desarrollo de un WordPress con WooCommerce y catálogo, pero sufre fricción en checkout o deriva usuarios a agregadores.`,
      explanation: `Tu web ya cuenta con el motor de tienda online de WooCommerce instalado ${audit.storeApi ? "(e incluso la Store API está abierta y funcionando)" : ""}. Sin embargo, o bien la experiencia de compra es lenta y confusa, o bien tienes botones que mandan a tus clientes a Glovo. Ya pagaste la tienda; no tiene sentido pagar comisiones a un intermediario.`,
      assumptions: [
        {
          label: "Stack detectado",
          value: "WordPress + WooCommerce",
          citation: "Identificado en rutas de plugins y Store API",
        },
        {
          label: "Pérdida de eficiencia",
          value: "12 % sobre ventas potenciales",
          citation: "Coste de oportunidad de mantener e-commerce desatendido mientras se pagan comisiones externas",
        },
      ],
      remedy: `Conectar la Store API existente con un flujo de checkout ultra-rápido en 2 toques adaptado a pantalla de smartphone o pedido directo por WhatsApp con ticket preparado.`,
      remedyHours: 3,
    });
  }

  // 4. FALTA DE CANAL WHATSAPP / RETENCIÓN DIRECTA
  if (!audit.whatsapp && !audit.ownOrder) {
    const lostDirectOrders = Math.round(params.visitasMes * 0.04 * 12);
    const annualLossWhatsapp = Math.round(lostDirectOrders * params.ticketMedio);

    leaks.push({
      id: "fuga-sin-whatsapp",
      title: "Cero canales de contacto directo rápido (Sin WhatsApp)",
      category: "movil",
      severity: "media",
      annualLossEuros: annualLossWhatsapp,
      monthlyLossEuros: Math.round(annualLossWhatsapp / 12),
      formula: `${params.visitasMes} visitas × 4 % intención × 12 m × ${params.ticketMedio.toFixed(2)} € = ${annualLossWhatsapp.toLocaleString("es-ES")} €/año`,
      calculationDetails: `Aproximadamente ${Math.round(lostDirectOrders / 12)} pedidos al mes se frustran al no encontrar un botón de consulta o pedido directo en su móvil.`,
      explanation: `En España, más del 90 % de los consumidores tienen WhatsApp abierto en su móvil. Un usuario local que busca "¿tenéis mesa para 6?" o "¿hacéis pizzas sin gluten para recoger?" no quiere rellenar un formulario de contacto de WordPress; si no ve WhatsApp, llama al restaurante de al lado.`,
      assumptions: [
        {
          label: "Uso de WhatsApp en España",
          value: "> 91 % usuarios móviles",
          citation: "Informe IAB Spain Redes Sociales y Hábitos Digitales",
        },
      ],
      remedy: `Añadir botón flotante de WhatsApp Business con mensaje predefinido ("Hola, quiero pedir para recoger / mesa").`,
      remedyHours: 1,
    });
  }

  // 5. PLATAFORMAS DE RESERVA EXTERNAS (TheFork / CoverManager)
  if (audit.reserva && !audit.whatsapp) {
    const annualReservationLoss = Math.round(
      params.reservasMes * 2.2 * params.comisionReservaPorCubierto * 12
    );

    leaks.push({
      id: "fuga-reservas-externas",
      title: `Comisiones por comensal en reservas externas (${audit.reservaProvider || "Plataforma"})`,
      category: "reservas",
      severity: "media",
      annualLossEuros: annualReservationLoss,
      monthlyLossEuros: Math.round(annualReservationLoss / 12),
      formula: `${params.reservasMes} reservas/mes × 2,2 comensales × ${params.comisionReservaPorCubierto.toFixed(2)} €/cubierto × 12 m = ${annualReservationLoss.toLocaleString("es-ES")} €/año`,
      calculationDetails: `Comisiones pagadas por comensales que reservan a través del widget externo en vez de gestionar la reserva directa.`,
      explanation: `Tu web utiliza ${audit.reservaProvider || "un intermediario de reservas"}. Cada vez que un cliente reserva mesa por este widget, el intermediario cobra entre 1,50 € y 3,00 € por cada comensal. Fomentar la reserva directa por WhatsApp ahorra miles de euros en restaurantes concurridos.`,
      assumptions: [
        {
          label: "Coste por cubierto",
          value: `${params.comisionReservaPorCubierto.toFixed(2)} €`,
          citation: "Comisión estándar TheFork / ElTenedor y software de reservas con fee por reserva",
        },
        {
          label: "Comensales por reserva",
          value: "2,2 comensales",
          citation: "Media del sector de restauración en España",
        },
      ],
      remedy: `Priorizar botón de reserva propia por WhatsApp antes del widget de terceros para fidelizar al cliente recurrente.`,
      remedyHours: 1,
    });
  }

  // 6. OBSOLESCENCIA TÉCNICA Y SEGURIDAD (PHP EOL / Sin HTTPS)
  if (audit.eolPhp || !audit.https || !audit.viewport) {
    const annualSecurityRisk = 1200;
    const reasons: string[] = [];
    if (audit.eolPhp) reasons.push(`PHP ${audit.phpVersion || "antiguo"} (sin parches de seguridad)`);
    if (!audit.https) reasons.push("Conexión no cifrada (sin HTTPS)");
    if (!audit.viewport) reasons.push("Falta etiqueta viewport móvil");

    leaks.push({
      id: "fuga-seguridad-tecnica",
      title: `Vulnerabilidad técnica y penalización SEO (${reasons.join(", ")})`,
      category: "tecnico",
      severity: !audit.https || audit.eolPhp ? "alta" : "media",
      annualLossEuros: annualSecurityRisk,
      monthlyLossEuros: 100,
      formula: `Coste estimado de parada de servicio y caída de posicionamiento local = 1.200 €/año`,
      calculationDetails: `Riesgo de infección por malware, penalización activa de Google Chrome con advertencia de 'Sitio no seguro' y pérdida de visibilidad orgánica en Google Maps.`,
      explanation: `Tu servidor anuncia una versión obsoleta (${reasons.join(", ")}). Esto no solo es un riesgo crítico de hackeo o pérdida de la web, sino que los navegadores modernos penalizan el ranking y alertan a los usuarios con avisos de seguridad que destruyen la confianza.`,
      assumptions: [
        {
          label: "Estado de PHP",
          value: audit.phpVersion ? `PHP ${audit.phpVersion}` : "Sin soporte",
          citation: "The PHP Group: calendario oficial de fin de vida de versiones (EOL)",
        },
      ],
      remedy: `Actualizar PHP a versión 8.2 o superior en el panel de hosting y forzar HTTPS con certificado SSL gratuito Let's Encrypt.`,
      remedyHours: 1,
    });
  }

  // Si no se detectó ninguna fuga específica (web muy limpia), cuantificamos la fuga mínima de optimización
  if (leaks.length === 0) {
    const minLoss = Math.round(params.visitasMes * 0.03 * params.ticketMedio * 12);
    leaks.push({
      id: "fuga-potencial-directo",
      title: "Coste de oportunidad en conversión móvil",
      category: "canal_propio",
      severity: "media",
      annualLossEuros: minLoss,
      monthlyLossEuros: Math.round(minLoss / 12),
      formula: `${params.visitasMes} visitas/mes × 3 % pérdida fricción × ${params.ticketMedio.toFixed(2)} € × 12 m = ${minLoss.toLocaleString("es-ES")} €/año`,
      calculationDetails: `Margen no capturado por falta de llamado a la acción directo e interactivo para pedidos móviles.`,
      explanation: `Aunque la web responde bien técnicamente, carece de un canal directo interactivo (0 % comisiones) optimizado para smartphone que convierta visitas casuales en pedidos recurrentes.`,
      assumptions: [
        {
          label: "Fricción de conversión",
          value: "3 %",
          citation: "Benchmark de hostelería digital",
        },
      ],
      remedy: `Instalar una tarjeta de pedido rápido con catálogo táctil y botón de pedido inmediato.`,
      remedyHours: 2,
    });
  }

  const totalAnnualLossEuros = leaks.reduce((acc, l) => acc + l.annualLossEuros, 0);

  // Cantidad recuperable en 48 horas mediante la solución
  const aggregatorLeak = leaks.find((l) => l.id === "fuga-agregadores");
  const speedLeak = leaks.find((l) => l.id === "fuga-velocidad");
  const recoverableAnnualEuros = Math.round(
    (aggregatorLeak ? aggregatorLeak.annualLossEuros * (params.pctRecuperableCanalPropio / 100) : 0) +
      (speedLeak ? speedLeak.annualLossEuros * 0.75 : 0) +
      (leaks.length > 2 ? 1200 : 0)
  );

  return {
    audit,
    params,
    leaks,
    totalAnnualLossEuros,
    recoverableAnnualEuros,
    generatedAt: new Date().toISOString(),
  };
}
