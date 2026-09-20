import React, { SVGProps } from "react";
import type { LeakCategory } from "@/lib/types";

export interface LeakIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  [key: string]: any;
}

/**
 * Icono brutalista para la categoría: Agregadores (Comisiones a plataformas intermediarias)
 * Metáfora: Paquete de entrega seccionado brutalmente por el 30% de peaje de la plataforma,
 * con la cuota sustraída desplazada en fuga con flecha de extracción en negativo.
 */
export function IconAgregadores({ size = 24, className, ...props }: LeakIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Asa superior con ventana en negativo */}
      <path fillRule="evenodd" d="M7 2h10v3h-2V3.5H9V5H7V2z" />
      {/* Base conservada por el negocio (70%) con albarán calado en negativo */}
      <path fillRule="evenodd" d="M3 6h8.5l-5.5 16H3V6zm3 4h3.5v1.5H6V10zm0 3.5h2.5v1.5H6v-1.5z" />
      {/* Trozo sustraído por la plataforma (30%), desplazado en fuga con flecha de extracción */}
      <path
        fillRule="evenodd"
        d="M14.5 4h6.5v14.5H10l4.5-14.5zm4.5 2h-4v1.5h1.7l-3 3 1.1 1.1 3-3V10H19V6z"
      />
    </svg>
  );
}

/**
 * Icono brutalista para la categoría: Velocidad (Tiempo de carga, TTFB, peso y rebote)
 * Metáfora: Cronómetro táctico industrial con aguja de rayo incisivo cruzando el dial
 * y barras de arrastre/resistencia en el borde de fuga.
 */
export function IconVelocidad({ size = 24, className, ...props }: LeakIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Pulsador y vástago superior */}
      <rect x="10" y="1" width="4" height="2" />
      <rect x="11" y="3" width="2" height="2" />
      {/* Pulsador angular táctico */}
      <rect x="17.5" y="3.5" width="2" height="3" transform="rotate(45 18.5 5)" />
      {/* Barras de fricción / arrastre aerodinámico */}
      <rect x="1" y="8" width="4" height="2" />
      <rect x="0" y="11.5" width="5.5" height="2.5" />
      <rect x="2" y="15.5" width="3.5" height="2" />
      {/* Bisel del tacómetro con núcleo hueco en negativo */}
      <path
        fillRule="evenodd"
        d="M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z"
      />
      {/* Aguja rayo sobrepasando el umbral de latencia */}
      <polygon points="14,4.5 9,12 12.5,12 10,18.5 17,11 13.5,11" />
    </svg>
  );
}

/**
 * Icono brutalista para la categoría: Canal Propio (Venta directa, web propia, 0% intermediario)
 * Metáfora: Fachada de comercio soberano con marquesina en voladizo, dentículos,
 * columnas macizas y flecha directa de entrada sin peajes.
 */
export function IconCanalPropio({ size = 24, className, ...props }: LeakIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Marquesina brutalista en voladizo */}
      <rect x="2" y="3" width="20" height="3.5" />
      {/* Dentículos bajo marquesina */}
      <rect x="3" y="6.5" width="3" height="2" />
      <rect x="8" y="6.5" width="3" height="2" />
      <rect x="13" y="6.5" width="3" height="2" />
      <rect x="18" y="6.5" width="3" height="2" />
      {/* Columnas maestras */}
      <rect x="3" y="8.5" width="3" height="11.5" />
      <rect x="18" y="8.5" width="3" height="11.5" />
      {/* Plinto de cimentación */}
      <rect x="1" y="20" width="22" height="2.5" />
      {/* Flecha de conversión directa entrando sin intermediarios */}
      <polygon points="12,9.5 7.5,14 10.5,14 10.5,19 13.5,19 13.5,14 16.5,14" />
    </svg>
  );
}

/**
 * Icono brutalista para la categoría: Móvil / Contacto Rápido (WhatsApp, llamada directa)
 * Metáfora: Terminal smartphone de bloque sólido con calado de pantalla y disparador de acción inmediata.
 */
export function IconMovil({ size = 24, className, ...props }: LeakIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M5 2h14v20H5V2zm2 2.5h10v13H7v-13zm4 14.5h2v1.5h-2V19z"
      />
      <polygon points="13,6.5 9,11.5 12,11.5 11,16 15,11 12,11" />
    </svg>
  );
}

/**
 * Icono brutalista para la categoría: Reservas Externas (Widgets con comisión por cubierto)
 * Metáfora: Libro mayor / calendario de reservas con cuadrante de servicio y agujas de reserva.
 */
export function IconReservas({ size = 24, className, ...props }: LeakIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect x="6" y="1" width="2" height="3" />
      <rect x="16" y="1" width="2" height="3" />
      <path
        fillRule="evenodd"
        d="M4 3h16v18H4V3zm2 5h12v11H6V8zm6 1a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
      />
      <polygon points="11.2,11.5 12.8,11.5 12.8,13.5 14.5,13.5 14.5,15 11.2,15" />
    </svg>
  );
}

/**
 * Icono brutalista para la categoría: Técnico & Descubrimiento (Seguridad, PHP, SEO Local)
 * Metáfora: Consola de servidor y terminal de diagnóstico con prompt y cursor en bloque.
 */
export function IconTecnico({ size = 24, className, ...props }: LeakIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path fillRule="evenodd" d="M3 3h18v18H3V3zm2 4.5h14v11.5H5V7.5z" />
      <rect x="5" y="4.8" width="1.5" height="1.5" />
      <rect x="7.5" y="4.8" width="1.5" height="1.5" />
      <polygon points="7,9.5 10.5,12 7,14.5 8.2,15.7 12.8,12 8.2,8.3" />
      <rect x="13.5" y="13.5" width="3.5" height="2" />
    </svg>
  );
}

/**
 * Componente unificado que resuelve automáticamente el icono brutalista
 * correspondiente a cualquier categoría de fuga tipada en Bleed (`LeakCategory`).
 */
export function LeakCategoryIcon({
  category,
  size = 20,
  className,
  ...props
}: LeakIconProps & { category: LeakCategory | string }) {
  switch (category) {
    case "agregadores":
      return <IconAgregadores size={size} className={className} {...props} />;
    case "velocidad":
      return <IconVelocidad size={size} className={className} {...props} />;
    case "canal_propio":
      return <IconCanalPropio size={size} className={className} {...props} />;
    case "movil":
      return <IconMovil size={size} className={className} {...props} />;
    case "reservas":
      return <IconReservas size={size} className={className} {...props} />;
    case "tecnico":
      return <IconTecnico size={size} className={className} {...props} />;
    default:
      return <IconAgregadores size={size} className={className} {...props} />;
  }
}
