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
}

export const CONSTANTES: Record<string, Constante> = {
  comisionAgregadorCompleto: {
    id: "comisionAgregadorCompleto",
    descripcion:
      "Comision por pedido cuando la plataforma tambien gestiona el reparto",
    valor: 25,
    minimo: 15,
    maximo: 35,
    unidad: "porcentaje",
    fuente: "Qamarero, comparativa de comisiones de delivery en Espana",
    url: "https://qamarero.com/blog/comisiones-delivery-cuanto-cobran-realmente-las-plataformas/",
    fecha: "2025-09-30",
    advertencia:
      "Ninguna plataforma publica su tarifa en su propia web de partners; just-eat.es/restaurantes responde 403. La fuente es secundaria por necesidad y el informe debe decirlo.",
  },
  comisionAgregadorCaptacion: {
    id: "comisionAgregadorCaptacion",
    descripcion:
      "Comision de Just Eat cuando el restaurante reparte con su propia flota",
    valor: 13,
    minimo: 13,
    maximo: 13,
    unidad: "porcentaje",
    fuente: "Qamarero, comparativa de comisiones de delivery en Espana",
    url: "https://qamarero.com/blog/comisiones-delivery-cuanto-cobran-realmente-las-plataformas/",
    fecha: "2025-09-30",
  },
  ticketMedioRestauracion: {
    id: "ticketMedioRestauracion",
    descripcion: "Ticket medio de restauracion en Espana por transaccion",
    valor: 21,
    minimo: 16.5,
    maximo: 35,
    unidad: "euros",
    fuente: "CaixaBank Research, Informe Sectorial Turismo 1S 2025",
    url: "https://caixabanklab-campus.com/cual-es-el-ticket-medio-restauracion-espana/",
    fecha: "2024-12-31",
    advertencia:
      "Media nacional sobre datos de tarjeta. Se sustituye por la composicion real del catalogo cuando la Store API esta abierta.",
  },
  pesoCanalDigital: {
    id: "pesoCanalDigital",
    descripcion:
      "Parte del gasto en restauracion que se va por delivery y take away",
    valor: 20,
    minimo: 18,
    maximo: 22,
    unidad: "porcentaje",
    fuente: "Anuario de la Hosteleria de Espana",
    url: "https://hosteleriadeespana.es/publicaciones-hosteleria.html",
    fecha: "2025-12-01",
    advertencia:
      "Media nacional, no el dato del negocio. Si el dueno da el suyo, manda el suyo.",
  },
  preferenciaCanalDirecto: {
    id: "preferenciaCanalDirecto",
    descripcion:
      "Consumidores que prefieren pedir por la web o la app del propio restaurante",
    valor: 58,
    minimo: 58,
    maximo: 70,
    unidad: "porcentaje",
    fuente: "NCR Voyix, 2025 Customer Experience Report",
    url: "https://www.restaurantdive.com/news/majority-customers-prefer-ordering-delivery-direct-restaurant-ncr-voyix/738397/",
    fecha: "2024-11-30",
    advertencia:
      "Encuesta a consumidores de Estados Unidos, margen de error 4 %. No hay equivalente espanol publicado y el informe lo dice. El 70 % que circula sale de proveedores de software de pedido propio, que son parte interesada.",
  },
  caidaConversionPorSegundo: {
    id: "caidaConversionPorSegundo",
    descripcion:
      "Puntos de conversion que se pierden por cada segundo adicional de carga",
    valor: 0.3,
    minimo: 0.2,
    maximo: 0.4,
    unidad: "ratio",
    fuente: "Portent, 100 M de paginas vistas en 20 sitios y 5,6 M de sesiones",
    url: "https://portent.com/blog/analytics/research-site-speed-hurting-everyones-revenue.htm",
    fecha: "2022-01-01",
    advertencia:
      "Se usa esta y no la de Deloitte para Google, que es mas vistosa pero mide una mejora de 0,1 s en marcas grandes. Aqui el caso real es un sitio pequeno y lento.",
  },
  dependenciaAgregadorSector: {
    id: "dependenciaAgregadorSector",
    descripcion:
      "Restaurantes espanoles con reparto que dependen de un agregador",
    valor: 76.4,
    minimo: 76.4,
    maximo: 76.4,
    unidad: "porcentaje",
    fuente:
      "BCC Innovation y Delectatech, Informe de digitalizacion del sector Horeca en Espana, mas de 240.000 establecimientos",
    url: "https://www.infohoreca.com/noticias/20221129/informe-digitalizacion-sector-horeca-espana",
    fecha: "2022-11-29",
    advertencia:
      "Datos de 2022. La foto habra mejorado desde entonces y se cita siempre con su fecha.",
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
  if (!c) throw new Error(`Constante no calibrada: ${id}`);
  return c;
}
