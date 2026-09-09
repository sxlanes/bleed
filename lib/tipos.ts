/**
 * El contrato compartido de Bleed.
 *
 * Lo escribe el arquitecto y NINGUN worker lo modifica. Los tres frentes
 * (motor, cerebro, salida) se comunican solo a traves de estos tipos, asi que
 * cambiarlos rompe a los otros dos.
 */

/** Paso 1: lo que el motor observa de una web, sin interpretar nada. */
export interface Reconocimiento {
  url: string;
  urlFinal: string;
  estadoHttp: number;
  ttfbMs: number;
  pesoHtmlKb: number;
  pesoImagenesKb: number;
  imagenesPesadas: { nombre: string; kb: number }[];
  stack: {
    wordpress: boolean;
    woocommerce: boolean;
    phpDeclarado: string | null;
    plugins: string[];
  };
  viewportMovil: boolean;
  https: boolean;
  /** Agregadores enlazados desde la propia web: "JustEat", "Glovo", "UberEats"... */
  agregadores: string[];
  /** Si existe un camino de pedido en su propio dominio. */
  pedidoPropio: boolean;
  /** URL de la Store API de WooCommerce si responde abierta. */
  storeApi: string | null;
  catalogo: ArticuloCarta[];
  /** Horario declarado en schema.org, tal cual viene. */
  horarioDeclarado: string[] | null;
  contacto: { telefono: string | null; email: string | null; whatsapp: boolean };
  capturas: { escritorio: string | null; movil: string | null };
  /** Lo que el motor intento y no pudo. Nunca se rellena a ojo. */
  noSeHaPodido: string[];
}

export interface ArticuloCarta {
  nombre: string;
  /** En centimos, para no arrastrar decimales. */
  precioCentimos: number;
  categoria: string | null;
}

/** Paso 2: una fuga concreta y observada, todavia sin euros. */
export interface Fuga {
  id: string;
  titulo: string;
  /** Que se observo exactamente. Cita el dato del reconocimiento. */
  evidencia: string;
  gravedad: "alta" | "media" | "baja";
  /** Por que importa en ESTE tipo de negocio, no en general. */
  porQueImporta: string;
}

/**
 * Paso 3: la fuga con cifra. Regla dura 1 del proyecto: ninguna cifra sin su
 * supuesto a la vista, y "no lo se" explicito cuando falta el dato del dueno.
 */
export interface Cuantificacion {
  fugaId: string;
  /** null cuando no se puede cifrar sin un dato que solo tiene el dueno. */
  eurosAnuales: { minimo: number; esperado: number; maximo: number } | null;
  /** Cada supuesto en una frase, en el idioma del informe. */
  supuestos: string[];
  /** Constantes de lib/calibracion.ts en las que se apoya. */
  constantes: string[];
  /** Que dato falta y que hay que preguntarle al dueno para cerrarlo. */
  desconocido: { dato: string; pregunta: string } | null;
}

/** Lo que consume la pantalla del informe. */
export interface Informe {
  negocio: { nombre: string; sector: string; ciudad: string | null };
  reconocimiento: Reconocimiento;
  fugas: Fuga[];
  cuantificacion: Cuantificacion[];
  /** Suma de los "esperado" que si se pudieron cifrar. */
  totalAnualEsperado: number;
  /** Cuantas fugas quedaron sin cifrar por falta de dato del dueno. */
  fugasSinCifrar: number;
  /** El argumento para el dueno, que no es tecnico. Markdown. */
  dossier: string;
}
