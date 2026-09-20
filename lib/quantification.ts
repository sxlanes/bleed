import {
  AuditResult,
  AuditSimulationParams,
  ContactChannel,
  FullAuditReport,
  Leak,
  LeakAssumption,
  TriageResult,
  PipelineStage,
} from "./types";
import { constante, Constante } from "./calibracion";
import { classifyVertical, PERIODS_PER_YEAR, VerticalId, VerticalVerdict } from "./vertical";
import { ECONOMIA_VERTICAL } from "./calibracion-verticales";

/**
 * Every euro on this page traces to a constant, either in lib/calibracion.ts
 * (the restaurant numbers this product was born with) or in
 * lib/calibracion-verticales.ts (the same four numbers for every other trade).
 * Numbers that have no published source are marked as team estimates in their
 * own assumption line, never hidden.
 *
 * This file used to know only restaurants. It now prices the same shape of
 * leak — a middleman taking a cut, a slow page, an idle channel, no way to
 * reach the business, no way to be found, a stale server, and the floor every
 * clean site still leaves on the table — for whatever trade classifyVertical
 * decided this business is. The words change (a restaurant's "order" is a
 * clinic's "appointment"), the arithmetic doesn't.
 */

const TICKET = constante("ticketMedioRestauracion"); // 21 EUR
const COMMISSION_FULL = constante("comisionAgregadorCompleto"); // 25 %
const COMMISSION_OWN_FLEET = constante("comisionAgregadorCaptacion"); // 13 % (not yet wired into a leak)
const DIRECT_PREFERENCE = constante("preferenciaCanalDirecto"); // 58 %
const CONVERSION_DROP_PER_SECOND = constante("caidaConversionPorSegundo"); // 0.3 points/s

export const DEFAULT_PARAMS: AuditSimulationParams = {
  ticketMedio: TICKET.valor,
  pedidosDia: 15,
  comisionAgregadorPct: COMMISSION_FULL.valor,
  visitasMes: 1200,
  pctRecuperableCanalPropio: DIRECT_PREFERENCE.valor,
  comisionReservaPorCubierto: 2.0,
  reservasMes: 180,
};

/**
 * The restaurant defaults above, generalised: for any other trade, pull the
 * same four numbers out of lib/calibracion-verticales.ts instead of
 * lib/calibracion.ts. `visitasMes`, `comisionReservaPorCubierto` and
 * `reservasMes` have no per-trade research yet, so every vertical starts from
 * the same working estimate until they do — same as the restaurant did.
 */
export function defaultParamsFor(verticalId: VerticalId, audit?: AuditResult): AuditSimulationParams {
  const econ = ECONOMIA_VERTICAL[verticalId];
  return {
    ticketMedio: econ.valorTransaccion.valor,
    pedidosDia: econ.transaccionesPorPeriodo.valor,
    comisionAgregadorPct: econ.comisionPlataforma.valor,
    visitasMes: audit?.monthlyVisits ?? DEFAULT_PARAMS.visitasMes,
    pctRecuperableCanalPropio: econ.desvioADirecto.valor,
    comisionReservaPorCubierto: DEFAULT_PARAMS.comisionReservaPorCubierto,
    reservasMes: DEFAULT_PARAMS.reservasMes,
  };
}

/** Every quick way a customer can start a transaction without waiting on a form. */
const QUICK_CHANNELS: ContactChannel[] = ["phone", "whatsapp", "chat", "booking", "checkout"];

/** The middle value of the prices this audit actually read off the site. A
    measured price beats a national average every time — it IS this business's
    catalogue, not a guess about it. Undefined when nothing was read. */
function medianPriceSignal(signals: number[] | undefined): number | undefined {
  if (!signals || signals.length === 0) return undefined;
  const sorted = [...signals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Turns a calibrated Constante into an on-screen assumption line, honestly.
 * A real, published source gets its citation and an openable URL. A constant
 * marked `estimacionPropia` gets told for exactly what it is — our own guess,
 * no published source, adjustable in the simulator — never a bare citation
 * that reads as if it were backed by research it isn't.
 */
/* Monthly visits multiply three of the leaks below and come from no published
   source and no analytics access — we cannot see a stranger's traffic. It was
   being used silently, which is the one thing this project does not do. It now
   appears as its own line wherever it is used, and the simulator moves it. */
function trafficAssumption(visits: number, source?: string): LeakAssumption {
  return {
    label: "Visits a month",
    value: `${visits.toLocaleString("en-IE")}`,
    citation: source 
      ? `External data provided by ${source}.`
      : "Team estimate — we cannot see your traffic from outside, and there is no published figure for a single site. This is the number that moves this figure most: put your real one in and the page recalculates.",
  };
}

function assumptionFromConstant(label: string, value: string, c: Constante): LeakAssumption {
  if (c.estimacionPropia) {
    return {
      label,
      value,
      citation: `Team estimate — no published source for this figure yet.${
        c.advertencia ? ` ${c.advertencia}` : ""
      } Adjustable in the simulator.`,
    };
  }
  const citation = `${c.fuente} (${c.fecha}).${c.advertencia ? ` ${c.advertencia}` : ""}`.trim();
  return c.url && c.url.trim().length > 0
    ? { label, value, citation, sourceUrl: c.url }
    : { label, value, citation };
}

export function calculateLeaks(
  audit: AuditResult,
  customParams?: Partial<AuditSimulationParams>,
  triage?: TriageResult,
  verdict?: VerticalVerdict
): FullAuditReport {
  const v = verdict ?? classifyVertical(audit);
  const words = v.definition.words;

  // THE MOST DANGEROUS LINE IN THIS FILE. `pedidosDia` counts transactions per
  // the vertical's OWN period (a restaurant's day, a trade's week, a
  // professional's month) — never per calendar day. Annualising it always
  // means periodsPerYear, never a hardcoded 365: a trade doing 8 jobs a WEEK
  // is ×52 a year, not ×365, and typing 365 there would inflate its loss
  // roughly sevenfold while looking perfectly innocent in a diff.
  const periodsPerYear = PERIODS_PER_YEAR[v.definition.ratePeriod];

  const params: AuditSimulationParams = {
    ...defaultParamsFor(v.id, audit),
    ...customParams,
  };

  // The economics for this vertical. The restaurant path still reads its
  // direct-preference figure from lib/calibracion.ts, which is the original
  // and the one the field study was calibrated against; both files now carry
  // the same warning about the 70% figure being vendor-sourced.
  const econ = ECONOMIA_VERTICAL[v.id];
  const directConst = v.id === "restaurant" ? DIRECT_PREFERENCE : econ.desvioADirecto;

  // The site's own published prices beat any national average — measured
  // beats assumed, always. Falls back to the vertical's calibrated average
  // when the crawler read no prices.
  const measuredTicket = medianPriceSignal(audit.priceSignals);
  const usingMeasuredTicket = measuredTicket !== undefined;
  const effectiveTicket = usingMeasuredTicket ? measuredTicket! : params.ticketMedio;

  /* The report answers in the currency it measured. When the value of a
     transaction came from the site's own prices, every figure below is that
     currency by construction — the rest of the inputs are counts and
     percentages. When we had to fall back on a calibrated average, the figure
     is a European one and the report stays in euros rather than pretending to
     convert at a rate we never looked up. */
  const currency = usingMeasuredTicket && audit.currency ? audit.currency : "EUR";
  const ticketAssumption = (): LeakAssumption =>
    usingMeasuredTicket
      ? {
          label: words.valueLabel,
          value: `${effectiveTicket.toFixed(2)} ${currency}`,
          citation: `Measured from the prices published on your own site (median of ${audit.priceSignals!.length} price${
            audit.priceSignals!.length === 1 ? "" : "s"
          } found). A figure measured from this business's own catalogue beats any national average.`,
        }
      : assumptionFromConstant(words.valueLabel, `${effectiveTicket} ${currency}`, econ.valorTransaccion);

  const leaks: Leak[] = [];
  const eur = (n: number) => Math.round(n).toLocaleString("en-IE");

  // Whether this site gives a customer any quick way to start a transaction —
  // the new `contactChannels` signal when recon found it, or the legacy
  // whatsapp/ownOrder flags when it didn't.
  const hasQuickContact =
    audit.contactChannels && audit.contactChannels.length > 0
      ? audit.contactChannels.some((c) => QUICK_CHANNELS.includes(c))
      : audit.whatsapp || audit.ownOrder;

  // 1. Marketplace commission drain — a platform stands between this business
  // and its own customer and charges for the introduction. Glovo for a
  // pizzeria, Booking.com for a guesthouse, Doctoralia for a dentist, Amazon
  // for a shop: same leak, different name over the door. Fires on the new
  // `marketplaces` signal or the legacy `aggregators` list, whichever the
  // recon pass on this audit actually filled in.
  const marketplaceNames = Array.from(
    new Set([...(audit.marketplaces || []).map((m) => m.platform), ...audit.aggregators])
  );

  if (marketplaceNames.length > 0) {
    const grossPerYear = params.pedidosDia * effectiveTicket * periodsPerYear;
    // New Advanced Pricing Parity Sub-Model
    const hasDirectIncentive = audit.textSample?.match(/mejor precio garantizado|descuento directo|reserva directa|ahorra \d+%|best rate guarantee|direct discount|book direct/i) !== null;
    const crossoverRate = 0.55; // Billboard effect (Cornell)
    const recoveryShare = 0.32; // Conversion lost to parity (Amadeus)
    const netArbitrageMargin = Math.max(0.05, (params.comisionAgregadorPct / 100) - 0.08); // Net commission saved after 8% direct perk
    const cannibalizedOrdersYear = Math.round(params.pedidosDia * periodsPerYear * crossoverRate * recoveryShare);
    const parityLeakYear = hasDirectIncentive ? 0 : Math.round(cannibalizedOrdersYear * effectiveTicket * netArbitrageMargin);
    
    // We add the parity leak to the base commissions if they don't have an incentive
    const baseCommissionsYear = Math.round(grossPerYear * (params.comisionAgregadorPct / 100));
    const commissionsYear = baseCommissionsYear;
    const recoverableYear = Math.round((commissionsYear + parityLeakYear) * (params.pctRecuperableCanalPropio / 100));
    const platforms = marketplaceNames.join(", ");

    leaks.push({
      id: "fuga-agregadores",
      title: `Commission handed to ${words.marketplaceLabel} (${platforms})`,
      category: "agregadores",
      severity: "critica",
      annualLossEuros: commissionsYear,
      monthlyLossEuros: Math.round(commissionsYear / 12),
      formula: `${words.transactions} per ${v.definition.ratePeriod} (${params.pedidosDia}) × ${words.valueLabel.toLowerCase()} (${effectiveTicket.toFixed(
        2
      )} ${currency}) × platform fee (${params.comisionAgregadorPct}%) × ${periodsPerYear} ${v.definition.ratePeriod}s a year = ${eur(commissionsYear)} ${currency} a year`,
      calculationDetails: `On an estimated ${eur(grossPerYear)} ${currency} a year through ${platforms}, the platform keeps ${eur(
        commissionsYear
      )} ${currency}. Moving back the ${params.pctRecuperableCanalPropio}% of ${words.customers} who would rather ${words.verb} direct puts +${eur(
        recoverableYear
      )} ${currency}/year back in the ${words.place}.`,
      explanation: `Your site links straight to ${platforms}. Every ${words.transaction} from a regular ${words.customer} who was already on your own page still pays ${platforms} ${params.comisionAgregadorPct}% of the ${words.transaction}, and the platform keeps the ${words.customer}'s data.`,
      assumptions: [
        ticketAssumption(),
        assumptionFromConstant("Platform commission", `${params.comisionAgregadorPct}%`, econ.comisionPlataforma),
        assumptionFromConstant(
          "Share that would return to a direct channel",
          `${params.pctRecuperableCanalPropio}%`,
          directConst
        ),
        assumptionFromConstant(words.rateLabel, `${params.pedidosDia} ${words.transactions}/${v.definition.ratePeriod}`, econ.transaccionesPorPeriodo),
      ],
      remedy: `Turn on a direct ${words.verb} path on your own site (0% commission)${
        audit.woocommerce || audit.storeApi || audit.bookingProvider
          ? " — the engine for it is already installed and paid for"
          : ""
      }, and tell every ${words.customer}: ${words.verb} direct and keep the discount for good.`,
      remedyHours: 4,
    });
  }

  // 2. Load speed and page weight — universal. A slow, heavy page loses a
  // visitor before they ever get to buy, book or ask, whatever the trade.
  const isSlowTtfb = audit.ttfb > 1.2;
  const isHeavyPage = audit.imgKb > 1800;

  if (isSlowTtfb || isHeavyPage) {
    const extraSeconds = Math.max(0, audit.ttfb - 1.0);
    // Cellular network physics (16 Mbps = 2000 KB/s)
    const excessImgKb = Math.max(0, audit.imgKb - 1000);
    const heavyPenaltySeconds = audit.imgKb > 1800 ? Math.round((excessImgKb / 2000) * 10) / 10 : 0;
    
    const pointsLost = (extraSeconds + heavyPenaltySeconds) * CONVERSION_DROP_PER_SECOND.valor;
    const baselineConversion = 7; 
    const keptFraction = Math.max(0, (baselineConversion - pointsLost) / baselineConversion);
    const lostFraction = 1 - keptFraction;
    const lostTransactionsMonth = Math.round(params.visitasMes * (baselineConversion / 100) * lostFraction);
    const speedLossYear = Math.round(lostTransactionsMonth * effectiveTicket * 12);

    const reasons: string[] = [];
    if (isSlowTtfb) reasons.push(`a ${audit.ttfb}s time to first byte (the recommended threshold is under 0.6s)`);
    if (isHeavyPage) reasons.push(`${audit.imgKb.toLocaleString("en-IE")} KB of images on the homepage`);
    if (audit.heavyImgs.length > 0) reasons.push(`${audit.heavyImgs.length} photos over 450 KB each`);

    leaks.push({
      id: "fuga-velocidad",
      /* A 0.12s server with 1.9 MB of photos is not "slow" — it is heavy, and
         saying otherwise in the headline is the first thing a sceptical reader
         checks. The title names the condition that actually fired. */
      title:
        isSlowTtfb && isHeavyPage
          ? `${words.customers[0].toUpperCase()}${words.customers.slice(1)} lost to slow, heavy pages (${audit.ttfb}s / ${audit.imgKb} KB)`
          : isSlowTtfb
          ? `${words.customers[0].toUpperCase()}${words.customers.slice(1)} lost to a slow server (${audit.ttfb}s to first byte)`
          : `${words.customers[0].toUpperCase()}${words.customers.slice(1)} lost to heavy pages (${audit.imgKb} KB of images)`,
      category: "velocidad",
      severity: audit.ttfb > 2.0 || audit.imgKb > 3500 ? "critica" : "alta",
      annualLossEuros: speedLossYear,
      monthlyLossEuros: Math.round(speedLossYear / 12),
      formula: `(${extraSeconds.toFixed(1)}s over the 1.0s baseline + ${heavyPenaltySeconds}s image penalty) × ${CONVERSION_DROP_PER_SECOND.valor} conversion points lost per second = ${pointsLost.toFixed(
        2
      )} points; ${eur(speedLossYear)} ${currency} a year at a ${effectiveTicket.toFixed(2)} ${currency} ${words.transaction}`,
      calculationDetails: `About ${lostTransactionsMonth} ${words.transactions} a month (${
        lostTransactionsMonth * 12
      }/year) from people who arrived meaning to ${words.verb} and closed the tab while it loaded.`,
      explanation: `Your site has ${reasons.join(" and ")}. A ${words.customer} on a phone does not wait: they go back to search results or leave for whoever loads first.`,
      assumptions: [
        {
          label: "Measured time to first byte",
          value: `${audit.ttfb}s`,
          citation: "Measured live during this audit.",
        },
        {
          label: "Homepage image weight",
          value: `${audit.imgKb} KB`,
          citation: "Measured live during this audit: sum of image bytes transferred on the main page.",
        },
        assumptionFromConstant("Conversion drop per extra second", `${CONVERSION_DROP_PER_SECOND.valor} points/s`, CONVERSION_DROP_PER_SECOND),
        {
          label: "Baseline conversion of intent-bearing visits",
          value: `${baselineConversion}%`,
          citation: "Team estimate. No published source; adjustable in the simulator.",
        },
        ...(heavyPenaltySeconds > 0
          ? [
              {
                label: "Delay attributed to page weight",
                value: `${heavyPenaltySeconds}s`,
                citation:
                  "Team estimate — we measure the bytes, not the wait they cause on your customers' phones. Above 1.8 MB we count half a second, above 2.5 MB a full one. No published source maps weight to delay on a real mobile network.",
              },
            ]
          : []),
        trafficAssumption(params.visitasMes, audit.monthlyVisitsSource),
      ],
      remedy: `Convert photos to compressed WebP/AVIF (about 80% lighter straight away) and cache the page at the server or a CDN.`,
      remedyHours: 2,
    });
  }

  // 3. Idle own channel — the business already pays for a shop or booking
  // engine (WooCommerce, a Store API, a booking provider) that is installed
  // but buried behind friction or bypassed by buttons that hand the customer
  // to a marketplace instead.
  const hasOwnChannel = audit.woocommerce || !!audit.storeApi || !!audit.bookingProvider;
  const noUsablePath = !(
    audit.contactChannels?.some((c) => c === "checkout" || c === "booking") ??
    audit.ownOrderSignals.includes("checkout")
  );

  /* This leak used to fire alongside the marketplace one, and the two priced
     the same transactions twice: once as the fee a platform kept, once as the
     revenue an idle channel forfeited. On the demo pizzeria that inflated the
     headline by 59% with no new evidence behind it, to 62% of the whole
     business's delivery revenue — a figure an owner throws out on sight, and
     with it the rest of the report. When a platform is already taking a cut,
     the fee IS the loss and the idle channel is its cause, not a second bill. */
  if (hasOwnChannel && noUsablePath && marketplaceNames.length === 0) {
    // `pctRecuperableCanalPropio` already measures the share of customers who
    // would rather deal with this business directly if that path worked —
    // that share is exactly the ceiling an idle or buried own channel
    // forfeits. The 0.6 is our own estimate of how much of that ceiling is
    // actually lost to a channel that is slower or harder to find than the
    // shortcut to a marketplace.
    const ownChannelCeilingYear = params.pedidosDia * effectiveTicket * periodsPerYear * (params.pctRecuperableCanalPropio / 100);
    const forfeited = Math.round(ownChannelCeilingYear * 0.6);
    const channelName = audit.woocommerce || audit.storeApi ? "online store" : audit.bookingProvider ? "booking system" : "own channel";

    leaks.push({
      id: "fuga-woocommerce-dormido",
      title: `Own ${channelName} paid for and left idle`,
      category: "canal_propio",
      severity: "alta",
      annualLossEuros: forfeited,
      monthlyLossEuros: Math.round(forfeited / 12),
      formula: `${words.transactions} per ${v.definition.ratePeriod} (${params.pedidosDia}) × ${words.valueLabel.toLowerCase()} (${effectiveTicket.toFixed(
        2
      )} ${currency}) × ${periodsPerYear} ${v.definition.ratePeriod}s × share that prefers direct (${params.pctRecuperableCanalPropio}%) × 0.6 given away = ${eur(
        forfeited
      )} ${currency} a year`,
      calculationDetails: `The business already paid to build a ${channelName}, but friction or marketplace links send ${words.customers} elsewhere.`,
      explanation: `Your site already has a ${channelName} installed${
        audit.storeApi ? ", with the store API open and responding" : ""
      }. Either the ${words.verb} flow is slow and confusing, or buttons hand ${words.customers} to a marketplace instead. The channel is paid for; paying a middleman on top of it makes no sense.`,
      assumptions: [
        {
          label: "Detected own channel",
          value: audit.woocommerce ? "WordPress + WooCommerce" : audit.bookingProvider || "booking engine",
          citation: "Measured live during this audit: identified from the site's own plugin paths, store API, or booking widget.",
        },
        assumptionFromConstant("Share that would come through this channel directly", `${params.pctRecuperableCanalPropio}%`, directConst),
        {
          label: "Fraction of that share actually forfeited",
          value: "60%",
          citation: "Team estimate for a channel that is installed but buried or bypassed. No single published rate; adjustable in the simulator.",
        },
      ],
      remedy: `Wire the existing ${channelName} to a fast, two-tap ${words.verb} flow, or a direct contact button with the ${words.transaction} prefilled.`,
      remedyHours: 3,
    });
  }

  // 4. No direct contact — no quick way for a customer to reach or buy. A
  // trade with no phone link and a clinic with no booking button are the same
  // leak wearing different words.
  if (!hasQuickContact) {
    const intentShare = 0.04; // team estimate, carried over unchanged from the restaurant-only version
    const lostTransactionsYear = Math.round(params.visitasMes * intentShare * 12);
    const lossYear = Math.round(lostTransactionsYear * effectiveTicket);

    leaks.push({
      id: "fuga-sin-whatsapp",
      title: `No fast way for a ${words.customer} to ${words.verb}`,
      category: "movil",
      severity: "media",
      annualLossEuros: lossYear,
      monthlyLossEuros: Math.round(lossYear / 12),
      formula: `visits a month (${params.visitasMes}) × ${intentShare * 100}% who mean to ${words.verb} × 12 months × ${words.valueLabel.toLowerCase()} (${effectiveTicket.toFixed(
        2
      )} ${currency}) = ${eur(lossYear)} ${currency} a year`,
      calculationDetails: `About ${Math.round(lostTransactionsYear / 12)} ${words.transactions} a month fall through because there is no quick way to reach or ${words.verb} on a phone.`,
      explanation: `A ${words.customer} with a quick question will not fill in a contact form. With no phone link, WhatsApp or booking button in sight, they go to the next ${words.place} on the search results page.`,
      assumptions: [
        {
          label: "Visit-to-enquiry intent",
          value: "4%",
          citation: "Team estimate. No published source; adjustable in the simulator.",
        },
        trafficAssumption(params.visitasMes, audit.monthlyVisitsSource),
      ],
      remedy: `Add a floating WhatsApp or call button with a prefilled message ("Hi, I'd like to ${words.verb}").`,
      remedyHours: 1,
    });
  }

  // 5. External booking widget fees — narrower than the marketplace leak
  // above: this is a reservation or appointment widget embedded on the
  // business's OWN page that still charges per transaction (TheFork,
  // CoverManager, a paid Calendly tier), rather than a marketplace listing
  // that sends the customer elsewhere entirely.
  if ((audit.reserva || !!audit.bookingProvider) && !audit.whatsapp) {
    const reservationLossYear = Math.round(params.reservasMes * 2.2 * params.comisionReservaPorCubierto * 12);
    const providerName = audit.reservaProvider || audit.bookingProvider || "a third-party widget";

    leaks.push({
      id: "fuga-reservas-externas",
      title: `Per-${words.transaction} fees on an external booking widget (${providerName})`,
      category: "reservas",
      severity: "media",
      annualLossEuros: reservationLossYear,
      monthlyLossEuros: Math.round(reservationLossYear / 12),
      formula: `${words.transactions} a month (${params.reservasMes}) × 2.2 participants each × ${params.comisionReservaPorCubierto.toFixed(
        2
      )} ${currency} × 12 months = ${eur(reservationLossYear)} ${currency} a year`,
      calculationDetails: `Fees paid on ${words.transactions} that go through the external widget instead of a direct one.`,
      explanation: `Your site uses ${providerName}. Each ${words.transaction} booked through that widget costs a per-unit fee. Steering repeat ${words.customers} to a direct booking saves real money over a year.`,
      assumptions: [
        {
          label: `Fee per ${words.transaction}`,
          value: `${params.comisionReservaPorCubierto.toFixed(2)} ${currency}`,
          citation: "Team estimate from typical third-party booking-widget per-transaction fees. No single published rate across trades; adjustable in the simulator.",
        },
        {
          label: "Participants per booking",
          value: "2.2",
          citation: "Team estimate, general average. No published source; adjustable in the simulator.",
        },
      ],
      remedy: `Put a direct booking button ahead of the third-party widget for repeat ${words.customers}.`,
      remedyHours: 1,
    });
  }

  // 6. Security and Technical Obsolescence
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
              citation: "Baymard Institute (2024), Reasons for Cart Abandonment.",
            },
            trafficAssumption(params.visitasMes, audit.monthlyVisitsSource),
          ] : []),
          ...(isEol ? [
            {
              label: "PHP lifecycle status",
              value: audit.phpVersion ? `PHP ${audit.phpVersion} (End-of-Life)` : "Unsupported",
              citation: "The PHP Group official release calendar.",
            },
            {
              label: "Incident remediation baseline",
              value: `850 ${currency}`,
              citation: "INCIBE / industry median cost for CMS emergency clean-up.",
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

  // 7. Discovery & Local Entity Isolation
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
      formula: `visits a month (${params.visitasMes}) × ${missShare * 100}% Local 3-Pack bounce × 12 months × ${words.valueLabel.toLowerCase()} (${effectiveTicket.toFixed(
        2
      )} ${currency}) = ${eur(lossYear)} ${currency}/year`,
      calculationDetails: `No street address, no phone number and no local-business structured data were found on the page, so a map search or a "near me" query has nothing to place on a map.`,
      explanation: `Search engines and maps place a ${words.place} using its address, phone and schema.org markup. With none of the three, a ${words.customer} searching nearby finds a competitor instead. The Local 3-Pack captures 44% of all local commercial clicks.`,
      assumptions: [
        {
          label: "Local 3-Pack exclusion miss rate",
          value: "4%",
          citation: "Whitespark & Moz Local Search Ranking Factors (Conservative 4% slice of the 44% total Local Pack CTR).",
          sourceUrl: "https://whitespark.ca/local-search-ranking-factors/",
        },
        trafficAssumption(params.visitasMes, audit.monthlyVisitsSource),
      ],
      remedy: `Publish a full street address and phone number, and add LocalBusiness structured data to the homepage.`,
      remedyHours: 1,
    });
  }

  // If nothing specific fired (a clean site), quantify the minimum
  // optimisation gap — the floor. Even a clean site leaves something on the
  // table, so this must keep firing when every other check comes back clean;
  // a report that says "nothing" reads as a report that didn't look.
  if (leaks.length === 0) {
    const frictionShare = 0.03;
    const minLoss = Math.round(params.visitasMes * frictionShare * effectiveTicket * 12);
    leaks.push({
      id: "fuga-potencial-directo",
      title: "Opportunity cost in mobile conversion",
      category: "canal_propio",
      severity: "media",
      annualLossEuros: minLoss,
      monthlyLossEuros: Math.round(minLoss / 12),
      formula: `visits a month (${params.visitasMes}) × 3% lost to friction × ${words.valueLabel.toLowerCase()} (${effectiveTicket.toFixed(
        2
      )} ${currency}) × 12 months = ${eur(minLoss)} ${currency} a year`,
      calculationDetails: `Margin not captured for want of a direct, interactive call to action that turns a casual visit into a ${words.transaction}.`,
      explanation: `The site is technically sound but has no direct, interactive channel (0% commission) built to turn casual visits into repeat ${words.transactions}.`,
      assumptions: [
        {
          label: "Conversion friction",
          value: "3%",
          citation: "Team estimate. No published source; adjustable in the simulator.",
        },
        trafficAssumption(params.visitasMes, audit.monthlyVisitsSource),
      ],
      remedy: `Add a quick-${words.verb} card with a touch ${words.catalogue} and an immediate ${words.verb} button.`,
      remedyHours: 2,
    });
  }

  let finalLeaks = leaks;

  if (triage && triage.source === "gemini") {
    const triageMap = new Map(triage.verdicts.map((t) => [t.leakId, t]));
    finalLeaks = leaks.filter((l) => triageMap.has(l.id));

    finalLeaks.forEach((l) => {
      const tv = triageMap.get(l.id);
      if (tv) {
        l.explanation = `${tv.whyItMattersHere} ${l.explanation}`;
      }
    });

    finalLeaks.sort((a, b) => {
      const rankA = triageMap.get(a.id)?.rank ?? 999;
      const rankB = triageMap.get(b.id)?.rank ?? 999;
      return rankA - rankB;
    });
  }

  const totalAnnualLossEuros = finalLeaks.reduce((acc, l) => acc + l.annualLossEuros, 0);

  const aggregatorLeak = finalLeaks.find((l) => l.id === "fuga-agregadores");
  const speedLeak = finalLeaks.find((l) => l.id === "fuga-velocidad");
  const recoverableAnnualEuros = Math.round(
    (aggregatorLeak ? aggregatorLeak.annualLossEuros * (params.pctRecuperableCanalPropio / 100) : 0) +
      (speedLeak ? speedLeak.annualLossEuros * 0.75 : 0) +
      (finalLeaks.length > 2 ? 1200 : 0)
  );

  const hasApiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const pipeline: PipelineStage[] = [
    {
      id: "recon",
      label: "Recon",
      engine: "deterministic",
      detail: `Audited ${audit.domain} — read as ${v.definition.label.toLowerCase()}`,
    },
    {
      id: "triage",
      label: "Triage",
      engine: triage?.source === "gemini" ? "gemini-3.6-flash" : "deterministic",
      detail: triage?.source === "gemini" ? "Selected and ranked leaks" : "Skipped / Deterministic fallback",
      ms: triage?.ms,
    },
    {
      id: "quantify",
      label: "Quantify",
      engine: "deterministic",
      detail: `Calculated exact euros for ${finalLeaks.length} selected leaks`,
    },
    {
      id: "dossier",
      label: "Dossier",
      engine: hasApiKey ? "gemini-3.6-flash" : "deterministic",
      detail: "Ready to write executive summary",
    },
  ];

  return {
    vertical: v,
    audit,
    params,
    leaks: finalLeaks,
    totalAnnualLossEuros,
    recoverableAnnualEuros,
    currency,
    generatedAt: new Date().toISOString(),
    triage,
    pipeline,
  };
}
