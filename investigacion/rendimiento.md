# Auditoría de Rendimiento y Accesibilidad

## Veredicto en tres líneas
El sitio web carga rápido y la seguridad de transporte es robusta, pero la portada consume demasiada CPU por el sistema de partículas no optimizado y presenta severos fallos de accesibilidad. Faltan cabeceras clave de mitigación de ataques y la política de recolección de datos es agresiva y opaca. No cumple con las normativas mínimas de contraste, ni de legibilidad para usuarios con discapacidad visual, ni respeta el estándar de rastreo web.

## 1. Rendimiento
| Métrica | Medida | Método de obtención |
| --- | --- | --- |
| TTFB (Time to First Byte) | 0.59s | `curl -w "%{time_starttransfer}s"` en Vercel |
| Peso total descargado | 218 KiB | Reporte de Lighthouse (`total-byte-weight`) |
| Peso de las fuentes | 63 KiB | Reporte de Lighthouse (`network-requests` agrupando `Font`) |
| Largest Contentful Paint (LCP) | 2.2 s | Reporte de Lighthouse (`largest-contentful-paint`) |
| Cumulative Layout Shift (CLS) | 0 | Reporte de Lighthouse (`cumulative-layout-shift`) |
| Canvas CPU Usage | Excesivo (>20,000 gradientes/s) | Inspección de `app/page.tsx` (dibuja múltiples gradientes por gota en un array de ~110 gotas a 60 fps sin cachear). |

## 2. Accesibilidad
| Criterio | Portada (`pagina.module.css`) | Informe (`informe.module.css`) | Método de obtención |
| --- | --- | --- | --- |
| Contraste texto/fondo | FALLA (`.line2` es 2.78:1 sobre el fondo rojo `#cb1b22`) | PASA (Mínimo de 5.09:1 medido en CSS) | Cálculo matemático de luminancia relativa sRGB |
| Foco visible | PASA (`:focus-visible` con outline explícito) | PASA (`:focus-visible` delineado) | Revisión manual de código CSS |
| Orden de tabulación | PASA | PASA | Lighthouse Audits (`tabindex` > 0 no detectado) |
| Tamaño de fuente mínimo | FALLA (`.lab` es 0.68rem, `.foot` es 0.70rem) | PASA (Ningún texto menor a 0.75rem) | Revisión de código CSS (`< 12px` prohibido explícitamente) |
| Roles ARIA y alt text | FALLA (El formulario carece de asociación de etiquetas completa para algunos estados) | PASA | Reporte de Lighthouse |
| Operable por teclado | PASA (El foco fluye correctamente) | PASA | Reporte de Lighthouse |

## 3. Móvil (390 px de ancho)
| Pantalla | Desborde horizontal (Overflow) | Método de obtención |
| --- | --- | --- |
| Portada | No | Simulación automatizada Playwright (iPhone 12 / 390px) |
| Informe (Pestaña Fugas) | No | Simulación automatizada Playwright (iPhone 12 / 390px) |
| Informe (Simulador/Dossier)| No | Revisión de CSS en `informe.module.css` (uso correcto de `overflow-x: auto`) |

## 4. Cabeceras de seguridad
| Cabecera | Estado devuelto por el servidor |
| --- | --- |
| Content-Security-Policy | ❌ Ausente |
| X-Content-Type-Options | ❌ Ausente |
| Referrer-Policy | ❌ Ausente |
| Strict-Transport-Security | ✅ Presente (`max-age=63072000; includeSubDomains; preload`) |

*Método: Petición real usando `curl -I https://bleed-omega.vercel.app`.*

## 5. Política de datos
Análisis del rastreador implementado en `lib/recon.ts`:
| Criterio | Estado real | Descripción |
| --- | --- | --- |
| Respetar `robots.txt` | ❌ No se cumple | El código fuente no consulta, ni parsea, ni respeta las directivas del archivo `robots.txt` del dominio escaneado. |
| User-Agent honesto | ❌ No se cumple | Se falsifica deliberadamente haciéndose pasar por un usuario regular: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36`. |
| Límite de cadencia | ❌ No se cumple | Carece de temporizadores o esperas. Realiza hasta 15 peticiones concurrentes (`Promise.all`) con método HEAD por dominio escaneado para auditar imágenes sin un mecanismo de limitación (rate limiting). |

## Los arreglos ordenados por impacto/esfuerzo
1. **Transparencia legal del Crawler** (Alto impacto / Bajo esfuerzo)
   - **Fichero**: `lib/recon.ts`
   - **Acción**: Ajustar el bot para que use un `User-Agent` honesto (ej. `BleedAuditBot/1.0`) y añada promesas secuenciales (delays) en la revisión de imágenes. Implementar la lectura de `robots.txt`.
2. **Mitigación del consumo de CPU del Canvas** (Alto impacto / Medio esfuerzo)
   - **Fichero**: `app/page.tsx`
   - **Acción**: Pre-renderizar o cachear los gradientes circulares y lineales complejos de las partículas (`drops` y `runners`) a un offscreen canvas en lugar de redibujarlos miles de veces por fotograma.
3. **Corregir contraste en Portada** (Alto impacto / Mínimo esfuerzo)
   - **Fichero**: `app/pagina.module.css`
   - **Acción**: Eliminar las transparencias (`rgba`) de los textos `.line2`, `.rate` y `.foot` utilizando colores sólidos que superen el ratio 4.5:1 requerido (ej. `var(--white)` o `var(--white-2)`).
4. **Respetar fuentes de tamaño mínimo** (Impacto medio / Mínimo esfuerzo)
   - **Fichero**: `app/pagina.module.css`
   - **Acción**: Incrementar el `font-size` de `.lab` y `.foot` a al menos `0.75rem` (12px), tal como ordenan las directrices.
5. **Cabeceras HTTP de Seguridad** (Impacto medio / Mínimo esfuerzo)
   - **Fichero**: `next.config.js`
   - **Acción**: Añadir configuración global en los headers de Next.js para enviar `Content-Security-Policy`, `X-Content-Type-Options` y `Referrer-Policy`.

## Lo que no sé
- No pude certificar al 100% el desborde (overflow) automático con Playwright en las últimas dos pestañas del informe (Simulador y Dossier) porque la navegación por clics falló por esperas asíncronas de la SPA. Las di por buenas basándome en una estricta revisión manual del CSS.
- No medí métricas simulando redes lentas (3G throttled) ya que las mediciones en crudo se hicieron en la red actual del bot usando Curl y la versión headless de Chrome.
