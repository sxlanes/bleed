/**
 * Las constantes con las que Bleed convierte una fuga en euros.
 *
 * Regla del proyecto: ninguna constante entra aqui sin fuente citable y fecha.
 * Cuando el jurado o un dueno pregunte de donde sale el 25 %, la respuesta es
 * una URL, no una intuicion. Se usa SIEMPRE el valor conservador: una cifra que
 * el dueno puede desmontar mata la venta entera.
 *
 * Investigado el 9-sep-2026. El detalle largo, con los matices de cada fuente,
 * vive en la nota "Calibracion de la cuantificacion" del vault.
 *
 * Este fichero lo escribe el arquitecto. Ningun worker lo modifica.
 */

export interface Constante {
  id: string;
  descripcion: string;
  valor: number;
  minimo: number;
  maximo: number;
  unidad: "porcentaje" | "euros" | "segundos" | "ratio";
  fuente: string;
  url: string;
  fecha: string;
  /** Dicho en voz alta cuando la fuente es debil o no aplica del todo. */
  advertencia?: string;
  /** true cuando no hay fuente publicada y la cifra es nuestra. La pantalla lo
      dice con estas mismas palabras: nadie se entera por la letra pequena. */
  estimacionPropia?: boolean;
}

export const CONSTANTES: Record<string, Constante> = {
  comisionAgregadorCompleto: {
    id: "comisionAgregadorCompleto",
    descripcion:
      "Commission per order when the platform also handles the delivery",
    valor: 25,
    minimo: 15,
    maximo: 35,
    unidad: "porcentaje",
    fuente: "Qamarero, comparison of delivery platform commissions in Spain",
    url: "https://qamarero.com/blog/comisiones-delivery-cuanto-cobran-realmente-las-plataformas/",
    fecha: "2025-09-30",
    advertencia:
      "No platform publishes its rate on its own partner site; just-eat.es/restaurantes answers 403. The source is secondary out of necessity, and the report says so.",
  },
  comisionAgregadorCaptacion: {
    id: "comisionAgregadorCaptacion",
    descripcion:
      "Just Eat commission when the restaurant delivers with its own fleet",
    valor: 13,
    minimo: 13,
    maximo: 13,
    unidad: "porcentaje",
    fuente: "Qamarero, comparison of delivery platform commissions in Spain",
    url: "https://qamarero.com/blog/comisiones-delivery-cuanto-cobran-realmente-las-plataformas/",
    fecha: "2025-09-30",
  },
  ticketMedioRestauracion: {
    id: "ticketMedioRestauracion",
    descripcion: "Average restaurant transaction in Spain",
    valor: 21,
    minimo: 16.5,
    maximo: 35,
    unidad: "euros",
    fuente: "CaixaBank Research, Tourism Sector Report H1 2025",
    url: "https://caixabanklab-campus.com/cual-es-el-ticket-medio-restauracion-espana/",
    fecha: "2024-12-31",
    advertencia:
      "National average from card data. Replaced by the real make-up of the catalogue when the Store API is open.",
  },
  pesoCanalDigital: {
    id: "pesoCanalDigital",
    descripcion:
      "Share of restaurant spending that goes through delivery and takeaway",
    valor: 20,
    minimo: 18,
    maximo: 22,
    unidad: "porcentaje",
    fuente: "Hosteleria de Espana (the Spanish hospitality federation), annual industry report",
    url: "https://hosteleriadeespana.es/publicaciones-hosteleria.html",
    fecha: "2025-12-01",
    advertencia:
      "National average, not this business's own figure. If the owner has theirs, theirs wins.",
  },
  preferenciaCanalDirecto: {
    id: "preferenciaCanalDirecto",
    descripcion:
      "Consumers who prefer to order from the restaurant's own site or app",
    valor: 58,
    minimo: 58,
    maximo: 70,
    unidad: "porcentaje",
    fuente: "NCR Voyix, 2025 Customer Experience Report",
    url: "https://www.restaurantdive.com/news/majority-customers-prefer-ordering-delivery-direct-restaurant-ncr-voyix/738397/",
    fecha: "2024-11-30",
    advertencia:
      "Survey of United States consumers, 4% margin of error. There is no published Spanish equivalent and the report says so. The 70% figure that circulates comes from direct-ordering software vendors, who are an interested party.",
  },
  caidaConversionPorSegundo: {
    id: "caidaConversionPorSegundo",
    descripcion:
      "Conversion points lost for every extra second of load time",
    valor: 0.3,
    minimo: 0.2,
    maximo: 0.4,
    unidad: "ratio",
    fuente: "Portent, 100M page views across 20 sites and 5.6M sessions",
    url: "https://portent.com/blog/analytics/research-site-speed-hurting-everyones-revenue.htm",
    fecha: "2022-01-01",
    advertencia:
      "Used instead of the Deloitte-for-Google figure, which is flashier but measures a 0.1s improvement at large brands. The case here is a small, slow site.",
  },
  dependenciaAgregadorSector: {
    id: "dependenciaAgregadorSector",
    descripcion:
      "Spanish restaurants with delivery that depend on an aggregator",
    valor: 76.4,
    minimo: 76.4,
    maximo: 76.4,
    unidad: "porcentaje",
    fuente:
      "BCC Innovation and Delectatech, report on Horeca digitalisation in Spain, more than 240,000 venues",
    url: "https://www.infohoreca.com/noticias/20221129/informe-digitalizacion-sector-horeca-espana",
    fecha: "2022-11-29",
    advertencia:
      "2022 data. The picture will have improved since, so it is always cited with its date.",
  },
};

/**
 * Constantes que NO se usan para calcular euros, solo para senalar friccion:
 * sus unicas fuentes son proveedores que venden justo eso.
 */
export const SOLO_CUALITATIVAS = [
  "conversionWebRestaurante",
  "fichaGoogleCompleta",
] as const;

export function constante(id: string): Constante {
  const c = CONSTANTES[id];
  if (!c) throw new Error(`Uncalibrated constant: ${id}`);
  return c;
}
