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
  source: "live" | "benchmark" | "fallback" | "cache";
  auditedAt: string;
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
  audit: AuditResult;
  params: AuditSimulationParams;
  leaks: Leak[];
  totalAnnualLossEuros: number;
  recoverableAnnualEuros: number;
  generatedAt: string;
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
