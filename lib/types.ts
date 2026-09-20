import type { VerticalVerdict } from "./vertical";

export interface AuditProduct {
  id: number | string;
  name: string;
  price: number | string;
  regularPrice?: number | string;
  image?: string;
  description?: string;
  permalink?: string;
  category?: string;
}

export interface HeavyImage {
  filename: string;
  sizeKb: number;
  url: string;
}

export interface AggregatorLink {
  platform: string; // "Glovo" | "JustEat" | "UberEats" | "Deliveroo"
  url: string;
}

/** A platform that stands between this business and its customer and charges
    for the introduction. Food aggregators are one case of a general shape:
    Booking.com for a hotel, Doctoralia for a clinic, Amazon for a shop. */
export interface MarketplaceLink {
  platform: string;
  url: string;
  /** The kind of business this platform serves, for classification. */
  vertical: string;
}

/** Every way this site offers to start a conversation or a sale. */
export type ContactChannel =
  | "phone"
  | "whatsapp"
  | "email"
  | "form"
  | "chat"
  | "booking"
  | "checkout";

export interface AuditResult {
  url: string;
  finalUrl: string;
  domain: string;
  name: string;
  status: number;
  ttfb: number;
  https: boolean;
  htmlKb: number;
  viewport: boolean;
  wordpress: boolean;
  woocommerce: boolean;
  storeApi?: string;
  storeApiItems?: number;
  products: AuditProduct[];
  aggregators: string[];
  aggregatorLinks: AggregatorLink[];
  ownOrder: boolean;
  ownOrderSignals: string[];
  whatsapp: boolean;
  whatsappNumber?: string;
  whatsappUrl?: string;
  reserva: boolean;
  reservaProvider?: string;
  imgKb: number;
  heavyImgs: HeavyImage[];
  phpVersion?: string;
  eolPhp?: boolean;
  title?: string;
  description?: string;
  cuisine?: string;
  address?: string;
  telephone?: string;
  error?: string;
  notRead?: string[];
  needsJavaScript?: boolean;
  source: "live" | "benchmark" | "fallback" | "cache";
  auditedAt: string;

  /* ── Signals that say what kind of business this is. Optional because a
        benchmark fixture or a degraded crawl may not carry them. ── */

  /** schema.org @type values declared by the site (Restaurant, Dentist, Hotel…). */
  schemaTypes?: string[];
  /** The CMS or shop platform behind it: WordPress, Shopify, Wix, PrestaShop… */
  platform?: string;
  /** Platforms this site links out to that take a cut of the transaction. */
  marketplaces?: MarketplaceLink[];
  /** Booking, appointment or reservation system detected, whatever the trade. */
  bookingProvider?: string;
  /** Ways a customer can reach or buy, in the order they appear on the page. */
  contactChannels?: ContactChannel[];
  /** Prices read from the page or its structured data, in euros. The best
      estimate of what one transaction is worth here is the site's own prices. */
  priceSignals?: number[];
  /** ISO code of the currency this site prices in, when it says so or its
      prices carry a symbol. The report answers in it rather than converting. */
  currency?: string;
  /** The opening of the page's visible text. The classifier reads it: a title
      alone is too thin to tell a dental clinic from a car park. */
  textSample?: string;
  /** Visual capture of the page, base64 JPEG, for LLM visual analysis. */
  screenshotBase64?: string;
  /** Traffic estimation from external APIs (SimilarWeb, Semrush, etc.) */
  monthlyVisits?: number;
  monthlyVisitsSource?: string;
}

export type LeakCategory =
  | "agregadores"
  | "velocidad"
  | "canal_propio"
  | "movil"
  | "reservas"
  | "tecnico";

export interface LeakAssumption {
  label: string;
  value: string;
  citation: string;
  /** Present when a calibrated constant backs this assumption. Claiming a
      source the reader cannot open is not the same as citing one. */
  sourceUrl?: string;
}

export interface Leak {
  id: string;
  title: string;
  category: LeakCategory;
  severity: "critica" | "alta" | "media";
  annualLossEuros: number;
  monthlyLossEuros: number;
  formula: string;
  calculationDetails: string;
  explanation: string;
  assumptions: LeakAssumption[];
  remedy: string;
  remedyHours: number;
}

export interface AuditSimulationParams {
  ticketMedio: number; // default 24.5 (€)
  pedidosDia: number; // default 15 (pedidos/día)
  comisionAgregadorPct: number; // default 28 (%)
  visitasMes: number; // default 1200 (visitas/mes)
  pctRecuperableCanalPropio: number; // default 40 (%)
  comisionReservaPorCubierto: number; // default 2.0 (€)
  reservasMes: number; // default 180 (reservas/mes)
}

export interface FullAuditReport {
  /** What kind of business the engine decided this is, and why. Optional only
      so older fixtures keep compiling; the engine always fills it. */
  vertical?: VerticalVerdict;
  audit: AuditResult;
  params: AuditSimulationParams;
  leaks: Leak[];
  totalAnnualLossEuros: number;
  recoverableAnnualEuros: number;
  /** ISO code every figure in this report is denominated in. The site's own
      currency when its prices were read, euros when a European average had to
      stand in — never a conversion we did not look up. */
  currency?: string;
  generatedAt: string;
  triage?: TriageResult;
  pipeline?: PipelineStage[];
}

export interface TriageVerdict {
  leakId: string;
  rank: number;               // 1 = el que mas importa aqui
  whyItMattersHere: string;   // una frase, especifica de ESTE negocio
  confidence: "high" | "medium" | "low";
}

export interface TriageResult {
  verdicts: TriageVerdict[];
  businessRead: string;       // que tipo de negocio cree que es y por que
  /** The trade the model picked, when the deterministic classifier was blind.
      One of VerticalId; validated before it is trusted. */
  vertical?: string;
  source: "gemini" | "deterministic" | "typesafe-ai";
  modelUsed?: string;
  ms: number;
}

export interface PipelineStage {
  id: "recon" | "triage" | "quantify" | "dossier";
  label: string;
  engine: "deterministic" | "gemini-3.6-flash";
  detail: string;             // una linea de que hizo
  ms?: number;
}

export const DEFAULT_SIMULATION_PARAMS: AuditSimulationParams = {
  ticketMedio: 24.5,
  pedidosDia: 15,
  comisionAgregadorPct: 28,
  visitasMes: 1200,
  pctRecuperableCanalPropio: 40,
  comisionReservaPorCubierto: 2.0,
  reservasMes: 180,
};
