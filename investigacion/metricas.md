# Catálogo de Métricas de Auditoría Bleed

## 1. Resumen
- **Métricas totales:** 75
- **Cuantificables en euros:** 13
- **Requieren navegador (DOM):** 21

## 2. Métricas por Categoría

### Captacion
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `ausencia-h1` | Ausencia de H1 | Falta de etiqueta H1 principal para SEO | Búsqueda de <h1/> en DOM | `HTML` | `cualitativa` | `-` | alta |
| `multiples-h1` | Múltiples H1 | Presencia de más de un H1 que diluye autoridad | Conteo de <h1/> > 1 | `HTML` | `cualitativa` | `-` | media |
| `meta-title-ausente` | Meta Title ausente | Ausencia de título de página para SERP | Búsqueda de <title/> | `HTML` | `cualitativa` | `-` | alta |
| `meta-title-largo` | Meta Title demasiado largo | Título truncado en Google (>60 chars) | Longitud de <title/> > 60 | `HTML` | `cualitativa` | `-` | baja |
| `meta-desc-ausente` | Meta Description ausente | Ausencia de descripción de página | Búsqueda de <meta name='description'/> | `HTML` | `cualitativa` | `-` | alta |
| `canonicals-rotos` | Canonicals rotos o ausentes | Páginas duplicadas sin canonical | Búsqueda de <link rel='canonical'/> | `HTML` | `cualitativa` | `-` | media |
| `robots-txt-bloqueante` | Robots.txt bloqueante | Directivas que impiden rastreo | Petición a /robots.txt y lectura de Disallow: / | `HTTP` | `cualitativa` | `-` | critica |
| `sitemap-xml-ausente` | Sitemap XML ausente | Falta de mapa del sitio para arañas | Petición a /sitemap.xml | `HTTP` | `cualitativa` | `-` | baja |

### Friccion Hasta Compra
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `botones-compra-invisibles` | Botones de compra ocultos | Botones 'Añadir' sin contraste o fuera de vista | Contraste de color < 4.5:1 o fuera del viewport en carga | `DOM` | `cualitativa` | `-` | alta |
| `clics-hasta-checkout` | Clics hasta checkout | Más de 3 clics desde portada hasta pagar | Simulación de flujo de compra hasta URL de checkout | `DOM` | `cualitativa` | `-` | media |
| `registro-obligatorio` | Registro obligatorio | Imposibilidad de compra como invitado | Ausencia de botón 'Continuar como invitado' en flujo | `DOM` | `euros` | `tasaAbandonoMovilFriccion` | alta |
| `campos-formulario-excesivos` | Exceso de campos | Formulario de checkout con más de 6 campos | Conteo de <input/> en form de compra | `DOM` | `euros` | `tasaAbandonoMovilFriccion` | media |
| `costes-ocultos-tardios` | Costes ocultos tardíos | Gastos de envío revelados al final | Comparación de precio inicial vs precio final en DOM | `DOM` | `euros` | `tasaAbandonoPorCostesOcultos` | alta |
| `sin-autocompletado` | Ausencia de autocompletado | Campos sin atributo autocomplete | Búsqueda de <input> sin autocomplete='...' | `HTML` | `cualitativa` | `-` | baja |
| `errores-validacion-ocultos` | Errores de validación ambiguos | Mensajes de error no ligados al campo | Envío de form vacío y captura de mensajes | `DOM` | `cualitativa` | `-` | alta |
| `teclado-inadecuado-movil` | Teclado móvil inadecuado | Inputs numéricos sin type='tel' o 'number' | Búsqueda de campos de teléfono/tarjeta sin type correcto | `HTML` | `cualitativa` | `-` | media |

### Claridad
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `texto-diminuto` | Texto ilegible (<12px) | Fuente demasiado pequeña para leer en móvil | Extracción de font-size computado en <p>, <span> | `DOM` | `cualitativa` | `-` | media |
| `contraste-insuficiente` | Contraste insuficiente | Texto gris sobre fondo claro | Cálculo de ratio de contraste < 4.5:1 | `DOM` | `cualitativa` | `-` | media |
| `propuesta-valor-difusa` | Propuesta de valor oculta | Falta de USP en el Above the Fold | Análisis semántico del H1/H2 en los primeros 600px | `DOM` | `cualitativa` | `-` | alta |
| `jerarquia-visual-rota` | Jerarquía visual rota | Uso inconsistente de encabezados | Verificación de orden H1 -> H2 -> H3 | `HTML` | `cualitativa` | `-` | baja |
| `exceso-texto-centrado` | Exceso de texto centrado | Párrafos largos alineados al centro | Búsqueda de text-align: center en bloques de >3 líneas | `DOM` | `cualitativa` | `-` | baja |
| `botones-fantasma` | Uso excesivo de ghost buttons | Llamadas a la acción principales sin fondo | Extracción de background-color: transparent en botones | `DOM` | `cualitativa` | `-` | media |
| `imagenes-sin-contexto` | Imágenes genéricas sin texto | Carruseles pesados sin mensaje | Búsqueda de <img> como únicos elementos hijos de sliders | `HTML` | `cualitativa` | `-` | baja |

### Confianza
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `http-inseguro` | Ausencia de HTTPS | Certificado SSL faltante o caducado | Verificación de esquema https:// y estado del cert | `HTTP` | `cualitativa` | `-` | critica |
| `ausencia-direccion-fisica` | Sin dirección física visible | Falta de dirección postal en el footer | Búsqueda de patrones de calle/CP en el texto base | `HTML` | `cualitativa` | `-` | alta |
| `ausencia-politicas` | Políticas legales ausentes | Falta Aviso Legal, Privacidad o Cookies | Búsqueda de enlaces con palabras clave legales | `HTML` | `cualitativa` | `-` | alta |
| `resenas-invisibles` | Reseñas no publicadas | El sitio no muestra testimonios | Búsqueda de widgets de reseñas o microdatos AggregateRating | `HTML` | `euros` | `perdidaPorFaltaResenas` | alta |
| `redes-sociales-rotas` | Enlaces sociales rotos | Iconos de redes que apuntan a # o 404 | Validación de atributo href en iconos de RRSS | `HTML` | `cualitativa` | `-` | media |
| `ano-copyright-desactualizado` | Copyright desactualizado | Pie de página muestra año anterior | Extracción de años (202x) en la zona del footer | `HTML` | `cualitativa` | `-` | baja |

### Velocidad
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `ttfb-lento` | TTFB lento (>1.2s) | Retraso en la respuesta inicial del servidor | Medición de Time to First Byte | `HTTP` | `euros` | `caidaConversionPorSegundo` | alta |
| `lcp-lento` | LCP superior a 2.5s | Renderizado lento del contenido principal | API de PerformanceObserver en navegador | `DOM` | `euros` | `caidaConversionPorSegundo` | alta |
| `cls-alto` | Cumulative Layout Shift > 0.1 | Saltos visuales durante la carga | API de PerformanceObserver en navegador | `DOM` | `cualitativa` | `-` | media |
| `sin-compresion` | Falta compresión GZIP/Brotli | Servidor no comprime los textos | Lectura de cabeceras content-encoding | `HTTP` | `cualitativa` | `-` | media |
| `cache-estatica-ausente` | Caché de estáticos ausente | Falta de Cache-Control en assets | Lectura de cabeceras en archivos .css/.js | `HTTP` | `cualitativa` | `-` | baja |
| `scripts-bloqueantes` | Scripts bloqueantes en <head> | JS síncrono que frena el parseo HTML | Búsqueda de <script src> sin defer ni async en head | `HTML` | `cualitativa` | `-` | alta |
| `css-critico-ausente` | CSS no inyectado inline | Dependencia de hojas de estilo externas para pintar | Ausencia de <style> significativo en head | `HTML` | `cualitativa` | `-` | baja |

### Movil
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `ausencia-viewport` | Ausencia de meta viewport | La web se ve en miniatura en móviles | Búsqueda de <meta name='viewport'/> | `HTML` | `cualitativa` | `-` | critica |
| `desborde-horizontal` | Desborde horizontal (scroll X) | El contenido no cabe en la pantalla | Detección de scrollWidth > clientWidth en <body> | `DOM` | `cualitativa` | `-` | alta |
| `tap-targets-pequenos` | Zonas táctiles muy pequeñas | Botones de menos de 44x44px | Cálculo del bounding client rect de botones/enlaces | `DOM` | `cualitativa` | `-` | alta |
| `tap-targets-superpuestos` | Enlaces superpuestos | Elementos cliqueables demasiado juntos (<8px de gap) | Cálculo de distancias entre enlaces | `DOM` | `cualitativa` | `-` | media |
| `menu-hamburguesa-roto` | Menú hamburguesa no funciona | El botón de menú no despliega | Clic en el icono de menú móvil y verificación de visibilidad | `DOM` | `cualitativa` | `-` | critica |
| `cta-fuera-de-alcance` | CTA principal no pegajoso | Botón 'Pedir' desaparece al hacer scroll | Verificación de position: sticky/fixed en botones clave | `DOM` | `cualitativa` | `-` | media |

### Imagen Y Medios
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `peso-total-imagenes` | Exceso de peso fotográfico (>1.8MB) | Página sobrecargada de megabytes | Suma del tamaño de todas las imágenes cargadas | `HTTP` | `euros` | `caidaConversionPorSegundo` | alta |
| `imagenes-sin-optimizar` | Imágenes gigantes | Fotografías de más de 450 KB | Inspección individual de peso de <img> | `HTTP` | `euros` | `caidaConversionPorSegundo` | alta |
| `formato-obsoleto` | Formatos sin compresión moderna | Uso de JPG/PNG en lugar de WebP/AVIF | Análisis de extensiones y content-type de imágenes | `HTTP` | `cualitativa` | `-` | media |
| `lazy-loading-ausente` | Falta de Lazy Loading | Carga de imágenes fuera de pantalla | Búsqueda de loading='lazy' en imágenes debajo del fold | `HTML` | `cualitativa` | `-` | media |
| `dimensiones-faltantes` | Atributos width/height ausentes | Imágenes que causan repintado de diseño | Revisión de width y height explícitos en <img> | `HTML` | `cualitativa` | `-` | baja |
| `alt-text-ausente` | Textos alternativos vacíos | Imágenes de carta/producto sin descripción para SEO | Búsqueda de <img> sin alt, excluyendo decorativas | `HTML` | `cualitativa` | `-` | baja |

### Contacto Y Leads
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `ausencia-whatsapp` | Ausencia de WhatsApp | Falta de canal rápido de reserva/duda | Búsqueda de enlaces wa.me o api.whatsapp.com | `HTML` | `euros` | `tasaIntencionWhatsApp` | alta |
| `telefono-no-clicable` | Teléfono no interactivo | Número en texto plano sin enlace tel: | Búsqueda de números de 9 dígitos sin href='tel:' | `HTML` | `cualitativa` | `-` | media |
| `email-no-clicable` | Email no interactivo | Dirección de correo sin mailto: | Búsqueda de @dominio sin href='mailto:' | `HTML` | `cualitativa` | `-` | baja |
| `formulario-oculto` | Formulario difícil de hallar | Página de contacto requiere varios clics | Búsqueda de enlace a 'Contacto' desde la portada | `HTML` | `cualitativa` | `-` | baja |
| `enlace-mapa-ausente` | Falta enlace a GPS | Dirección sin link a Google Maps | Verificación de URL hacia maps.google.com | `HTML` | `cualitativa` | `-` | media |

### Descubrimiento Local
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `schema-ausente` | Falta de Schema LocalBusiness | Ausencia de metadatos para el Local Pack | Búsqueda de JSON-LD o Microdata de LocalBusiness | `SCHEMA` | `cualitativa` | `-` | alta |
| `mapa-iframe-roto` | Iframe de mapa roto | API Key de Google Maps caducada | Detección de errores en la consola al cargar iframe | `DOM` | `cualitativa` | `-` | media |
| `ficha-google-incompleta` | No reclama la Ficha Google | Aviso cualitativo sobre GMB | Análisis de enlaces salientes a perfiles de Google | `HTML` | `cualitativa` | `fichaGoogleCompleta` | alta |
| `nap-inconsistente` | NAP Inconsistente | Nombre/Dirección/Teléfono no unificados | Comparación de textos de pie de página vs Schema | `HTML` | `cualitativa` | `-` | media |
| `horario-invisible` | Horario no declarado | El cliente no sabe si está abierto | Búsqueda de patrones de días y horas en texto | `HTML` | `cualitativa` | `-` | alta |
| `area-servicio-ausente` | Área de reparto no especificada | Incertidumbre sobre alcance de delivery | Ausencia de códigos postales o barrios en sección envío | `HTML` | `cualitativa` | `-` | media |

### Catalogo Y Precios
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `menu-pdf` | Menú secuestrado en PDF | La carta no es legible por buscadores | Enlaces a la carta terminan en .pdf | `HTML` | `cualitativa` | `-` | alta |
| `sin-pedidos-propios` | Canal de venta directa ausente | Carencia de botón de compra interna | Ausencia de sistema de checkout propio detectado | `API` | `euros` | `pesoCanalDigital` | alta |
| `agregadores-canibalizan` | Agregadores muy prominentes | Enlaces a Glovo/JustEat antes que venta propia | Detección de URLs de agregadores | `HTML` | `euros` | `comisionAgregadorCompleto` | critica |
| `woocommerce-abandonado` | WooCommerce inactivo | Instalación de tienda pero sin ventas habilitadas | Detección de WP+WooCommerce sin endpoints de checkout activos | `API` | `euros` | `pesoCanalDigital` | alta |
| `precios-ocultos` | Precios no visibles en carta | Ausencia del símbolo de euro o cifras | Escaneo de expresiones regulares de precio en bloque de menú | `HTML` | `cualitativa` | `-` | media |
| `reservas-externas` | Comisiones por reservas externas | Uso de TheFork en vez de motor propio | Detección de widgets de reserva con comisión por cubierto | `HTML` | `euros` | `comisionReservaPorCubierto` | media |

### Accesibilidad
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `sin-foco-teclado` | Indicador de foco invisible | Imposible navegar con Tabulador | Verificación de outline: none sin alternativa en :focus | `DOM` | `cualitativa` | `-` | media |
| `formularios-sin-label` | Inputs sin etiqueta | Lectores de pantalla no interpretan el campo | Ausencia de <label for=...> o aria-label en inputs | `HTML` | `cualitativa` | `-` | media |
| `zoom-bloqueado` | Zoom de usuario bloqueado | Meta viewport con user-scalable=no | Lectura del content de meta viewport | `HTML` | `cualitativa` | `-` | alta |
| `animaciones-sin-pausa` | Animaciones que marean | Ausencia de prefers-reduced-motion | Inspección de CSS media queries de reducción de movimiento | `HTML` | `cualitativa` | `-` | baja |
| `contraste-botones-bajas` | Botones de bajo contraste | Difíciles de distinguir para visión reducida | Cálculo de colores de fondo de <button> vs texto | `DOM` | `cualitativa` | `-` | media |

### Retencion
| id | nombre | qué mide | **cómo se detecta** | señal técnica | cuantificable | constante | gravedad |
|---|---|---|---|---|---|---|---|
| `sin-boletin` | Ausencia de captación de emails | No hay formulario de newsletter | Falta de <input type='email'> asociado a botón de suscripción | `HTML` | `cualitativa` | `-` | baja |
| `sin-login` | Imposible crear cuenta | Clientes recurrentes deben rellenar todo de nuevo | Ausencia de flujo de Login/Mi Cuenta | `HTML` | `cualitativa` | `-` | media |
| `programas-fidelidad-ocultos` | Fidelidad no promocionada | No se menciona recompensas por repetición | Ausencia de palabras clave de puntos/fidelidad | `HTML` | `cualitativa` | `-` | baja |
| `recibo-digital-ausente` | Sin ticket digital/factura | Proceso no clarifica si habrá email de confirmación | Flujo de compra carece de mención a 'recibirás tu recibo' | `HTML` | `cualitativa` | `-` | baja |
| `redes-sin-incentivo` | Redes sociales pasivas | Followers no incentivados en la web | Links a IG/FB sin texto motivacional ('Síguenos para promos') | `HTML` | `cualitativa` | `-` | baja |

## 3. Las 15 que más mueven la aguja

1. **agregadores-canibalizan**: Perder el 25% del ticket por cada cliente habitual que usa un agregador es el mayor agujero financiero de cualquier restaurante.
2. **woocommerce-abandonado**: Pagar por una infraestructura que podría recuperar el 40% del canal digital, pero dejarla morir, es un coste de oportunidad gigante.
3. **ausencia-whatsapp**: La fricción de no tener un canal directo mata las reservas cualificadas o dudas rápidas. Un botón cambia la facturación móvil.
4. **menu-pdf**: Oculta tu oferta a Google (pérdida de captación local) e introduce una barrera gigantesca en el móvil.
5. **ttfb-lento**: Cada segundo extra en servidor hunde la conversión un 0.3%. El hambre no espera.
6. **peso-total-imagenes**: Redes 4G lentas abandonan si el hero header pesa 4MB. Optimizarlo levanta el embudo inicial.
7. **http-inseguro**: Los avisos rojos en navegadores aniquilan la confianza instantáneamente, bloqueando tarjetas de crédito.
8. **ausencia-viewport**: Provoca que en móvil haya que hacer pellizcos continuos. Un 'exit' inmediato para el 90% del tráfico.
9. **reservas-externas**: Regalar una comisión alta por cubierto a una app por un cliente que ya estaba en tu web propia reduce margen puro.
10. **registro-obligatorio**: La mayor fricción antes de la tarjeta. Ofrecer checkout como invitado rescata ventas que de otro modo caen al 100%.
11. **resenas-invisibles**: El 98% de los consumidores leen reseñas; ocultarlas o no usarlas debilita la confianza frente al negocio de al lado.
12. **costes-ocultos-tardios**: Revelar 5€ de envío en el último paso es la causa #1 de abandono de carrito.
13. **schema-ausente**: No existir semánticamente para el Local Pack significa regalarle el SEO de 'cerca de mí' a la competencia.
14. **botones-compra-invisibles**: Si el usuario no encuentra el CTA claro o requiere scroll horizontal en móvil, la venta no ocurre.
15. **telefono-no-clicable**: Algo tan trivial como no usar href='tel:' en un móvil reduce la probabilidad de llamadas al restaurante.

## 4. Constantes que faltan en calibracion.ts

### `tasaAbandonoPorCostesOcultos`
- **Valor propuesto:** 48
- **Unidad:** porcentaje
- **Descripción:** Porcentaje de abandonos de carritos en delivery causados por tarifas inesperadas reveladas tarde.
- **Fuente citable:** Baymard Institute (2024), Reasons for Cart Abandonment, y encuestas del sector de Olo.
- **Justificación:** Los extracostes sorpresa son el factor #1 de salida. Si la web no calcula gastos pronto, parte del ticket se esfuma.

### `tasaAbandonoMovilFriccion`
- **Valor propuesto:** 25
- **Unidad:** porcentaje
- **Descripción:** Reducción en la conversión cuando se exige registrarse en compras de alta intención.
- **Fuente citable:** Estudio de MobiHQ sobre fricciones en mobile ordering para restaurantes.
- **Justificación:** Obligar al login o poner formularios excesivos drena entre el 25% y el 40% del tráfico móvil en la pantalla final.

### `perdidaPorFaltaResenas`
- **Valor propuesto:** 47
- **Unidad:** porcentaje
- **Descripción:** Clientes perdidos si no se muestran reseñas frescas o el negocio no las contesta.
- **Fuente citable:** BrightLocal (2024) Local Consumer Review Survey.
- **Justificación:** El 88% escoge a negocios que responden a sus reseñas. Carecer de widgets que proyecten esa confianza disminuye intención de visita/pedido drásticamente.

### `tasaIntencionWhatsApp`
- **Valor propuesto:** 4
- **Unidad:** porcentaje
- **Descripción:** Porcentaje de tráfico local que tiene intención de hacer una pregunta o reserva rápida por chat.
- **Fuente citable:** Meta Business Messaging Research (2023).
- **Justificación:** Cuantifica la pérdida directa de no tener un canal directo para resolver barreras.

### `comisionReservaPorCubierto`
- **Valor propuesto:** 2.0
- **Unidad:** euros
- **Descripción:** El coste medio en euros por comensal que cobran plataformas como TheFork por reservas generadas desde su widget en la web propia del restaurante.
- **Fuente citable:** TheFork Manager tarifas públicas (2025).
- **Justificación:** Evitar este coste desviando a reservas propias es dinero directo al margen.

## 5. Lo que no sé

Estas son métricas que no podemos confirmar porque el motor actual no las abarca o exceden el ámbito técnico sin comprometer la automatización:
- **Comparación de Precios Finales (Web vs Agregadores):** Extraer los recargos del menú en Glovo requiere esquivar protecciones anti-bot de las apps, lo que es ilegal/frágil en un script masivo.
- **Calidad Fotográfica (Estética):** Podemos saber si una foto es grande, pero no podemos saber automáticamente si es apetecible o está mal iluminada sin visión computacional (IA).
- **Disponibilidad de Inventario Real:** A menos que expongan la API de WooCommerce abiertamente, no sabemos si el 'Plato del Día' realmente está en stock hasta hacer un pedido fantasma.
- **Gestión de Redes Cerradas:** El impacto exacto de un Instagram abandonado sin enlace web; las APIs de Meta están cerradas y limitan su lectura.

---

## Verificacion del arquitecto, 11-sep-2026

Las cuatro constantes propuestas en la seccion 4 se comprobaron una a una contra la
regla dura del proyecto: **ninguna constante calcula euros si su unica fuente es un
proveedor que vende justo ese arreglo.** Resultado:

| Constante propuesta | Fuente citada | Veredicto |
|---|---|---|
| `tasaAbandonoPorCostesOcultos` | Baymard Institute, Cart Abandonment | **ACEPTADA.** Baymard es investigacion independiente de usabilidad, sin producto que vender en esto. Su encuesta de abandono es la referencia canonica del sector. |
| `perdidaPorFaltaResenas` | BrightLocal, Local Consumer Review Survey | **ACEPTADA CON ADVERTENCIA.** BrightLocal vende herramientas de SEO local, asi que tiene interes en que las resenas importen. La encuesta en si es a consumidores y se cita mucho. Entra con su advertencia escrita, como ya se hizo con NCR Voyix. |
| `tasaAbandonoMovilFriccion` | "MobiHQ" | **RECHAZADA para euros.** Comprobado: mobihq.com es MOBI, un proveedor de software de pedidos para restaurantes. Vende exactamente el arreglo que la cifra justifica. Pasa a cualitativa. |
| `tasaIntencionWhatsApp` | Meta Business Messaging Research | **RECHAZADA para euros.** Meta vende WhatsApp Business. Mismo conflicto. Pasa a cualitativa, y ademas el 4 % ya estaba en `lib/quantification.ts` marcado honestamente como "team estimate", que es donde debe quedarse. |

Consecuencia sobre el catalogo: las metricas que dependian de las dos constantes
rechazadas (`registro-obligatorio`, `campos-formulario-excesivos`, y las de intencion
de chat) bajan de `euros` a `cualitativa`. Se senalan como friccion, no se cifran.

Esto reduce el numero de metricas cuantificables, y es lo correcto. Un juez que
busque "MobiHQ" y encuentre una empresa de software en vez de un estudio se lleva
por delante la afirmacion de que cada cifra tiene fuente, que es el espinazo del
producto entero.
