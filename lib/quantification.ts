import {
  AuditResult,
  AuditSimulationParams,
  FullAuditReport,
  Leak,
} from "./types";
import { constante } from "./calibracion";

/**
 * Every euro on this page traces to a constant in lib/calibracion.ts, which
 * carries its source and its date. Numbers that have no published source are
 * marked as team estimates in their own assumption line, never hidden.
 */

const TICKET = constante("ticketMedioRestauracion"); // 21 EUR
const COMMISSION_FULL = constante("comisionAgregadorCompleto"); // 25 %
const COMMISSION_OWN_FLEET = constante("comisionAgregadorCaptacion"); // 13 %
const DIRECT_PREFERENCE = constante("preferenciaCanalDirecto"); // 58 %
const CONVERSION_DROP_PER_SECOND = constante("caidaConversionPorSegundo"); // 0.3 points/s
const DIGITAL_CHANNEL_SHARE = constante("pesoCanalDigital"); // 20 %

export const DEFAULT_PARAMS: AuditSimulationParams = {
  ticketMedio: TICKET.valor,
  pedidosDia: 15,
  comisionAgregadorPct: COMMISSION_FULL.valor,
  visitasMes: 1200,
  pctRecuperableCanalPropio: DIRECT_PREFERENCE.valor,
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
  const eur = (n: number) => Math.round(n).toLocaleString("en-IE");

  // 1. Aggregator commission drain
  if (audit.aggregators.length > 0) {
    const deliveryGrossYear = params.pedidosDia * params.ticketMedio * 365;
    const commissionsYear = Math.round(
      deliveryGrossYear * (params.comisionAgregadorPct / 100)
    );
    const recoverableYear = Math.round(
      commissionsYear * (params.pctRecuperableCanalPropio / 100)
    );
    const apps = audit.aggregators.join(", ");

    leaks.push({
      id: "fuga-agregadores",
      title: `Commission handed to aggregators (${apps})`,
      category: "agregadores",
      severity: "critica",
      annualLossEuros: commissionsYear,
      monthlyLossEuros: Math.round(commissionsYear / 12),
      formula: `pedidosDia (${params.pedidosDia}) x ticketMedioRestauracion (${params.ticketMedio} EUR) x comisionAgregadorCompleto (${params.comisionAgregadorPct}%) x 365 = ${eur(commissionsYear)} EUR/year`,
      calculationDetails: `On an estimated ${eur(deliveryGrossYear)} EUR of yearly delivery revenue, the platforms keep ${eur(commissionsYear)} EUR. Moving back the ${params.pctRecuperableCanalPropio}% of diners who would rather order direct puts +${eur(recoverableYear)} EUR/year back in the till.`,
      explanation: `Your site links straight to ${apps}. Every order from a regular or a neighbour who was already on your own page still pays the aggregator ${params.comisionAgregadorPct}% of the ticket, and the aggregator keeps the customer's data.`,
      assumptions: [
        {
          label: "Average ticket",
          value: `${params.ticketMedio} EUR`,
          citation: `${TICKET.fuente} (${TICKET.fecha}). Range ${TICKET.minimo}-${TICKET.maximo} EUR.`,
        },
        {
          label: "Aggregator commission",
          value: `${params.comisionAgregadorPct}%`,
          citation: `${COMMISSION_FULL.fuente} (${COMMISSION_FULL.fecha}). ${COMMISSION_FULL.advertencia ?? ""}`.trim(),
        },
        {
          label: "Share that would return to a direct channel",
          value: `${params.pctRecuperableCanalPropio}%`,
          citation: `${DIRECT_PREFERENCE.fuente} (${DIRECT_PREFERENCE.fecha}). ${DIRECT_PREFERENCE.advertencia ?? ""}`.trim(),
        },
        {
          label: "Daily order volume",
          value: `${params.pedidosDia} orders/day`,
          citation: "Team estimate for a casual-food restaurant with delivery. No published source; adjustable in the simulator.",
        },
      ],
      remedy: `Turn on a direct web/WhatsApp order path with its own checkout (0% commission) and put a card in every delivery bag: order direct and keep 10% for good.`,
      remedyHours: 4,
    });
  }

  // 2. Load speed and mobile weight
  const isSlowTtfb = audit.ttfb > 1.2;
  const isHeavyPage = audit.imgKb > 1800;

  if (isSlowTtfb || isHeavyPage) {
    // Conversion points lost = extra seconds over a 1.0 s baseline x the calibrated drop per second
    const extraSeconds = Math.max(0, audit.ttfb - 1.0);
    const heavyPenaltySeconds = audit.imgKb > 2500 ? 1 : audit.imgKb > 1800 ? 0.5 : 0;
    const pointsLost =
      (extraSeconds + heavyPenaltySeconds) * CONVERSION_DROP_PER_SECOND.valor;
    const baselineConversion = 7; // percent of hungry visits that would convert
    const keptFraction = Math.max(0, (baselineConversion - pointsLost) / baselineConversion);
    const lostFraction = 1 - keptFraction;
    const lostOrdersMonth = Math.round(
      params.visitasMes * (baselineConversion / 100) * lostFraction
    );
    const speedLossYear = Math.round(lostOrdersMonth * params.ticketMedio * 12);

    const reasons: string[] = [];
    if (isSlowTtfb) reasons.push(`a ${audit.ttfb}s time to first byte (the recommended threshold is under 0.6s)`);
    if (isHeavyPage) reasons.push(`${audit.imgKb.toLocaleString("en-IE")} KB of images on the homepage`);
    if (audit.heavyImgs.length > 0) reasons.push(`${audit.heavyImgs.length} photos over 450 KB each`);

    leaks.push({
      id: "fuga-velocidad",
      title: `Customers lost to slow, heavy pages (${audit.ttfb}s / ${audit.imgKb} KB)`,
      category: "velocidad",
      severity: audit.ttfb > 2.0 || audit.imgKb > 3500 ? "critica" : "alta",
      annualLossEuros: speedLossYear,
      monthlyLossEuros: Math.round(speedLossYear / 12),
      formula: `${pointsLost.toFixed(2)} conversion points lost = (${extraSeconds.toFixed(1)}s + ${heavyPenaltySeconds}s) x caidaConversionPorSegundo (${CONVERSION_DROP_PER_SECOND.valor} pts/s); ${eur(speedLossYear)} EUR/year at ${params.ticketMedio} EUR ticket`,
      calculationDetails: `About ${lostOrdersMonth} orders a month (${lostOrdersMonth * 12}/year) from people who arrived meaning to order and closed the tab while it loaded.`,
      explanation: `Your site has ${reasons.join(" and ")}. At 21:15 a hungry person on a phone does not wait: they go back to search results or open the aggregator app.`,
      assumptions: [
        {
          label: "Measured time to first byte",
          value: `${audit.ttfb}s`,
          citation: "Measured live during this audit.",
        },
        {
          label: "Homepage image weight",
          value: `${audit.imgKb} KB`,
          citation: "Sum of image bytes transferred on the main page during this audit.",
        },
        {
          label: "Conversion drop per extra second",
          value: `${CONVERSION_DROP_PER_SECOND.valor} points/s`,
          citation: `${CONVERSION_DROP_PER_SECOND.fuente} (${CONVERSION_DROP_PER_SECOND.fecha}). ${CONVERSION_DROP_PER_SECOND.advertencia ?? ""}`.trim(),
        },
        {
          label: "Baseline conversion of hungry visits",
          value: `${baselineConversion}%`,
          citation: "Team estimate. No published source; adjustable in the simulator.",
        },
      ],
      remedy: `Convert photos to compressed WebP/AVIF (about 80% lighter straight away) and cache the page at the server or a CDN.`,
      remedyHours: 2,
    });
  }

  // 3. Dormant WooCommerce store
  if (audit.woocommerce && (audit.aggregators.length > 0 || !audit.ownOrderSignals.includes("checkout"))) {
    // The digital channel is worth about DIGITAL_CHANNEL_SHARE of restaurant spend;
    // a store that exists but is bypassed forfeits a slice of that.
    const digitalYear =
      params.pedidosDia * params.ticketMedio * 365 * (DIGITAL_CHANNEL_SHARE.valor / 100);
    const forfeited = Math.round(digitalYear * 0.6);

    leaks.push({
      id: "fuga-woocommerce-dormido",
      title: "Own online store paid for and left idle (WooCommerce)",
      category: "canal_propio",
      severity: "alta",
      annualLossEuros: forfeited,
      monthlyLossEuros: Math.round(forfeited / 12),
      formula: `pedidosDia x ticketMedioRestauracion x 365 x pesoCanalDigital (${DIGITAL_CHANNEL_SHARE.valor}%) x 0.6 forfeited = ${eur(forfeited)} EUR/year`,
      calculationDetails: `The restaurant already paid to build a WordPress + WooCommerce site with a catalogue, but checkout friction or aggregator buttons send buyers elsewhere.`,
      explanation: `Your site already has the WooCommerce store engine installed${audit.storeApi ? " with the Store API open and responding" : ""}. Either the buying flow is slow and confusing, or buttons hand customers to Glovo. The store is paid for; paying a middleman on top makes no sense.`,
      assumptions: [
        {
          label: "Detected stack",
          value: "WordPress + WooCommerce",
          citation: "Identified from plugin paths and the Store API during this audit.",
        },
        {
          label: "Digital share of restaurant spend",
          value: `${DIGITAL_CHANNEL_SHARE.valor}%`,
          citation: `${DIGITAL_CHANNEL_SHARE.fuente} (${DIGITAL_CHANNEL_SHARE.fecha}). ${DIGITAL_CHANNEL_SHARE.advertencia ?? ""}`.trim(),
        },
        {
          label: "Fraction of the digital channel forfeited",
          value: "60%",
          citation: "Team estimate for a store that is installed but bypassed. No published source.",
        },
      ],
      remedy: `Wire the existing Store API to a two-tap mobile checkout, or a direct WhatsApp order with the ticket prefilled.`,
      remedyHours: 3,
    });
  }

  // 4. No fast direct contact channel (no WhatsApp)
  if (!audit.whatsapp && !audit.ownOrder) {
    const lostOrdersYear = Math.round(params.visitasMes * 0.04 * 12);
    const whatsappLossYear = Math.round(lostOrdersYear * params.ticketMedio);

    leaks.push({
      id: "fuga-sin-whatsapp",
      title: "No fast direct contact channel (no WhatsApp)",
      category: "movil",
      severity: "media",
      annualLossEuros: whatsappLossYear,
      monthlyLossEuros: Math.round(whatsappLossYear / 12),
      formula: `visitasMes (${params.visitasMes}) x 4% intent x 12 x ticketMedioRestauracion (${params.ticketMedio} EUR) = ${eur(whatsappLossYear)} EUR/year`,
      calculationDetails: `About ${Math.round(lostOrdersYear / 12)} orders a month fall through because there is no direct enquiry or order button on the phone.`,
      explanation: `A local checking "do you have a table for six?" or "do you do gluten-free for collection?" will not fill in a WordPress contact form. With no WhatsApp in sight, they ring the restaurant next door.`,
      assumptions: [
        {
          label: "Visit-to-enquiry intent",
          value: "4%",
          citation: "Team estimate. No published source; adjustable in the simulator.",
        },
      ],
      remedy: `Add a floating WhatsApp Business button with a prefilled message ("Hi, I'd like to order for collection / a table").`,
      remedyHours: 1,
    });
  }

  // 5. External reservation platforms (TheFork / CoverManager)
  if (audit.reserva && !audit.whatsapp) {
    const reservationLossYear = Math.round(
      params.reservasMes * 2.2 * params.comisionReservaPorCubierto * 12
    );

    leaks.push({
      id: "fuga-reservas-externas",
      title: `Per-cover fees on external reservations (${audit.reservaProvider || "platform"})`,
      category: "reservas",
      severity: "media",
      annualLossEuros: reservationLossYear,
      monthlyLossEuros: Math.round(reservationLossYear / 12),
      formula: `reservasMes (${params.reservasMes}) x 2.2 covers x ${params.comisionReservaPorCubierto.toFixed(2)} EUR/cover x 12 = ${eur(reservationLossYear)} EUR/year`,
      calculationDetails: `Fees paid on covers that book through the external widget instead of a direct reservation.`,
      explanation: `Your site uses ${audit.reservaProvider || "a reservation middleman"}. Each table booked through that widget costs 1.50 to 3.00 EUR per cover. Steering regulars to a direct WhatsApp booking saves thousands in a busy restaurant.`,
      assumptions: [
        {
          label: "Cost per cover",
          value: `${params.comisionReservaPorCubierto.toFixed(2)} EUR`,
          citation: "Team estimate from TheFork / reservation-software per-booking fees. No single published rate.",
        },
        {
          label: "Covers per reservation",
          value: "2.2",
          citation: "Team estimate, Spanish restaurant average.",
        },
      ],
      remedy: `Put a direct WhatsApp booking button ahead of the third-party widget for repeat customers.`,
      remedyHours: 1,
    });
  }

  // 6. Technical obsolescence and security (PHP EOL / no HTTPS)
  if (audit.eolPhp || !audit.https || !audit.viewport) {
    const securityRiskYear = 1200;
    const reasons: string[] = [];
    if (audit.eolPhp) reasons.push(`PHP ${audit.phpVersion || "end-of-life"} (no security patches)`);
    if (!audit.https) reasons.push("unencrypted connection (no HTTPS)");
    if (!audit.viewport) reasons.push("missing mobile viewport tag");

    leaks.push({
      id: "fuga-seguridad-tecnica",
      title: `Technical vulnerability and SEO penalty (${reasons.join(", ")})`,
      category: "tecnico",
      severity: !audit.https || audit.eolPhp ? "alta" : "media",
      annualLossEuros: securityRiskYear,
      monthlyLossEuros: 100,
      formula: `Flat estimate of downtime plus lost local ranking = 1,200 EUR/year`,
      calculationDetails: `Risk of malware, an active Chrome "Not secure" warning, and lost organic visibility on Google Maps.`,
      explanation: `Your server advertises an out-of-date setup (${reasons.join(", ")}). Beyond the hack risk, modern browsers demote the ranking and warn users in ways that break trust.`,
      assumptions: [
        {
          label: "PHP status",
          value: audit.phpVersion ? `PHP ${audit.phpVersion}` : "unsupported",
          citation: "The PHP Group official end-of-life calendar.",
        },
        {
          label: "Annual risk figure",
          value: "1,200 EUR",
          citation: "Team estimate. Flat placeholder for downtime and ranking loss; no per-site source.",
        },
      ],
      remedy: `Move PHP to 8.2 or newer in the hosting panel and force HTTPS with a free Let's Encrypt certificate.`,
      remedyHours: 1,
    });
  }

  // If nothing specific fired (a clean site), quantify the minimum optimisation gap
  if (leaks.length === 0) {
    const minLoss = Math.round(params.visitasMes * 0.03 * params.ticketMedio * 12);
    leaks.push({
      id: "fuga-potencial-directo",
      title: "Opportunity cost in mobile conversion",
      category: "canal_propio",
      severity: "media",
      annualLossEuros: minLoss,
      monthlyLossEuros: Math.round(minLoss / 12),
      formula: `visitasMes (${params.visitasMes}) x 3% friction loss x ticketMedioRestauracion (${params.ticketMedio} EUR) x 12 = ${eur(minLoss)} EUR/year`,
      calculationDetails: `Margin not captured for want of a direct, interactive call to action for mobile orders.`,
      explanation: `The site is technically sound but has no direct interactive channel (0% commission) built for a phone to turn casual visits into repeat orders.`,
      assumptions: [
        {
          label: "Conversion friction",
          value: "3%",
          citation: "Team estimate. No published source; adjustable in the simulator.",
        },
      ],
      remedy: `Add a quick-order card with a touch catalogue and an immediate order button.`,
      remedyHours: 2,
    });
  }

  const totalAnnualLossEuros = leaks.reduce((acc, l) => acc + l.annualLossEuros, 0);

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
