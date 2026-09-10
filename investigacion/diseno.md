# Investigación de diseño para Bleed

## Criterio de partida

La identidad existente es una decisión cerrada, no un punto de partida para otra
landing. La portada (`app/page.tsx` y `app/pagina.module.css`) es un campo
arterial `#cb1b22`, con Anton, IBM Plex Mono, un titular único y una barra de
URL. Tiene una línea blanca lateral, grano, una animación de entrada y lluvia
ambiental en canvas. El informe (`components/InformeView.tsx` y
`app/informe/informe.module.css`) es una sala oscura `#0b0d0f`: el rojo
`#ff3b3b` está reservado a la pérdida y la gravedad, y cada fuga ya enseña
fórmula, supuestos y horas de remedio. Las mejoras de abajo amplifican esas
decisiones. No proponen rehacer la portada.

## Inventario

Se revisaron los `package.json` reales bajo `/Users/nico/Code`, excluyendo
artefactos `.next`, `node_modules` y entornos Python. Las versiones son las
declaradas en los manifiestos, por eso conservan `^` o `~` cuando lo tienen.

| Repositorio | Librería ya declarada | Uso relevante | Versión declarada |
|---|---|---|---|
| `go-erasmus` (`apps/go-erasmus`) | `lucide-react` | Iconos | `^0.454.0` |
| `go-erasmus` (`apps/go-erasmus`) | `tailwindcss-animate` | Animación utilitaria | `^1.0.7` |
| `go-erasmus` (`apps/go-erasmus`) | `@radix-ui/react-slot` | Primitiva de composición | `^1.3.0` |
| `openreply` | `recharts` | Gráficos React | `^3.8.1` |
| `DavidLopezWeb/frontend` | `framer-motion` | Animación React | `^12.25.0` |
| `DavidLopezWeb/frontend` | `lucide-react` | Iconos | `^0.562.0` |
| `StyleOS` | `framer-motion` | Animación React | `^12.29.0` |
| `StyleOS` | `lucide-react` | Iconos | `^0.562.0` |
| `open-design/apps/web` | `motion` | Animación React | `12.40.0` |
| `open-design/apps/web` | `@formkit/auto-animate` | Transiciones automáticas | `0.9.0` |
| `open-design/apps/web` | `lucide-react` | Iconos | `1.16.0` |
| `nls-dashboard` | `lucide-react` | Iconos | `^0.454.0` |
| `EasyAide` | `lucide-react` | Iconos | `^0.563.0` |
| `ALPADIA APP/alpadia-scan` | `@vercel/analytics` | Analítica de producto | `^2.0.1` |

No aparece un `EasyLA` independiente con ese nombre en los manifiestos
encontrados. El inventario sí contiene `go-erasmus`, que el vault identifica
como la evolución activa de ese proyecto, y `EasyAide`, que es el manifiesto
real hallado con nombre parecido. No atribuyo una librería a un repositorio que
no tenga un manifiesto verificable.

### CDN y peso de las librerías propuestas explícitamente

La recomendación principal no necesita instalar una librería. Cuando se
considera reutilizar algo que Nico ya conoce, los datos verificables son estos:

| Paquete | ¿Build UMD en cdnjs? | Peso consultado | Decisión |
|---|---|---:|---|
| `recharts@3.8.1` | Sí hay distribución UMD de Recharts en cdnjs, actualmente publicada como `3.10.1` (`Recharts.min.js`) | 137.824 KB gzip para `3.8.1` según Bundlephobia | Solo si un gráfico SVG hecho a mano no basta. Para un informe de tres cifras, no compensa el peso ni el cambio de versión. |
| `motion@12.40.0` | No hay entrada verificable en la API de cdnjs | 43.786 KB gzip según Bundlephobia | No instalar para esta tarea. La entrada de Motion existente está en otro repo, y Bleed ya tiene CSS suficiente. |
| `framer-motion@12.25.0` | No hay entrada verificable en la API de cdnjs | Bundlephobia devuelve error de build para esa consulta | No instalar. Ya existe en otros repos, pero el coste real de este proyecto debe medirse con el build de Bleed. |

Fuentes de peso y distribución: [Bundlephobia, Motion
12.40.0](https://bundlephobia.com/package/motion@12.40.0),
[Bundlephobia, Recharts
3.8.1](https://bundlephobia.com/package/recharts@3.8.1), [API de
cdnjs](https://api.cdnjs.com/libraries/recharts) y [cdnjs
Recharts](https://cdnjs.com/libraries/recharts). Un CDN no es motivo para
cargar un bundle externo en Bleed: Next debe empaquetar el código que se use.

## Qué está ganando ahora

### Micro-interacciones que parecen producto, no plantilla

La pauta profesional no es animar más, sino hacer que el movimiento explique
un cambio. Nielsen Norman Group clasifica como objetivos válidos llamar la
atención, enseñar continuidad entre estados y mostrar relación entre elementos,
y advierte que el movimiento periférico roba atención. La guía de Motion
documenta entradas, `whileHover`, `whileTap`, variantes y secuencias, pero esas
capacidades solo son útiles si el estado cambia de verdad.

Para Bleed eso significa:

- Una entrada única y corta al cargar, ya alineada con `@keyframes entrar`.
- Respuesta inmediata al mover un supuesto: cambiar el número y marcar el
  resultado actualizado, no hacer un espectáculo de tarjetas.
- Hover y focus que aclaren el control, no que levanten botones o hagan pulsar
  toda la pantalla.
- `prefers-reduced-motion` para quitar la lluvia del canvas y transiciones no
  esenciales. WCAG explica que la animación de interacción debe poder
  desactivarse si no es esencial.
- Animar `transform` y `opacity` cuando sea necesario, evitando recalcular
  layout en cada frame. El CSS de web.dev documenta keyframes, easing Bézier y
  `steps()` como primitivas suficientes para este caso.

Fuentes: [NN/g, Animation and
Usability](https://www.nngroup.com/articles/animation-usability/),
[Motion for React](https://motion.dev/docs/react-animation), [web.dev, CSS
Animation](https://web.dev/learn/css/animations) y [W3C, Animation from
Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

### Widgets para un informe financiero denso

El widget adecuado para Bleed no es un dashboard de doce gráficas. Es una
jerarquía de lectura:

1. cifra total anual perdida, con unidad y palabra `estimated`;
2. cifra recuperable, visualmente secundaria;
3. desglose ordenado por pérdida anual;
4. fórmula y supuesto inmediatamente junto a cada fila;
5. simulador que cambia el resultado sin perder el contexto;
6. fuente o cita del supuesto, y una nota de incertidumbre.

La visualización más eficiente es un **bar mark horizontal de pérdida por fuga**
dibujado como SVG accesible: una escala común permite comparar, el rojo solo
marca pérdida y el texto conserva el dato exacto. Un segundo widget pequeño
puede ser un **waterfall de comisión agregador versus margen directo**, pero
solo si el modelo ya entrega los valores necesarios. Si no existe un dato,
debe aparecer `no medido`, nunca una barra inventada.

Recharts tiene componentes útiles para barras y tooltips, y ya está en
`openreply`, pero su paquete consultado pesa 137.824 KB gzip. Para las tres
fugas de Bleed, SVG/CSS mantiene el control de la escala, evita instalar otra
dependencia y respeta mejor la sala de diagnóstico. Las heurísticas de Nielsen
respaldan reducir elementos que compiten con la información principal y hacer
visible el estado del sistema.

Fuentes: [Recharts en
GitHub](https://github.com/recharts/recharts), [Bundlephobia Recharts
3.8.1](https://bundlephobia.com/package/recharts@3.8.1) y [NN/g, 10 Usability
Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

### Landing de producto que convierte sin parecer generada

Una landing creíble hace una promesa concreta, enseña el mecanismo y deja una
acción principal. No necesita una cuadrícula de features. En Bleed el recorrido
correcto ya está insinuado:

- titular incómodo y específico: el sitio está perdiendo dinero;
- una sola acción: pegar la URL;
- evidencia del trabajo: medición, fórmula y supuestos;
- resultado con lenguaje de negocio, no jerga de IA;
- salida clara para corregir o auditar otro sitio.

La mejora está en hacer ese recorrido más legible, no en añadir testimonios
falsos, logos o una segunda llamada a la acción. La heurística de visibilidad
del estado exige feedback en un tiempo razonable, y la de prevención de errores
justifica validar la URL y explicar qué ocurre mientras se audita.

Fuente: [NN/g, 10 Usability
Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

## Las 10 mejoras concretas para Bleed

Ordenadas por impacto esperado en la lectura del jurado dividido entre horas.
Todas caben en menos de cuatro horas y conservan la identidad. Ninguna rehace
la portada.

| # | Mejora concreta | Qué se toca | Por qué sube la nota | Esfuerzo | Dependencia |
|---:|---|---|---|---:|---|
| 1 | **Barra de pérdida por fuga con SVG accesible**. Añadir una escala horizontal proporcional al mayor `annualLossEuros`, con etiqueta de euros y `aria-label`. | `components/InformeView.tsx`, `app/informe/informe.module.css` | Convierte una lista densa en una comparación instantánea sin robar protagonismo a la cifra. El jurado entiende en cinco segundos dónde está el dinero. | 2 h | Ya tiene `leaks`; no instalar. |
| 2 | **Actualización de supuestos con feedback de estado**. Al mover un slider, mostrar `Recalculating` durante el frame y `Updated just now` después, con el total y barras actualizados en el mismo bloque visual. | `components/InformeView.tsx`, `app/informe/informe.module.css` | Hace visible que el simulador es real, no una maqueta estática. Cumple visibilidad del estado y refuerza confianza. | 1.5 h | CSS y estado React ya disponibles; no instalar. |
| 3 | **Cifra principal con rango, no falsa precisión**. Mostrar junto al total un rango calibrado por el modelo, la fórmula resumida y `estimated`, dejando el valor actual editable. Si el modelo no entrega rango, mostrar solo la incertidumbre que sí existe. | `components/InformeView.tsx`, `lib/quantification.ts`, `lib/types.ts` | Un informe financiero honesto resulta más defendible que un número exacto aparentemente inventado. | 2.5 h | Reutiliza los tipos y cálculos existentes; no instalar. |
| 4 | **Estado de auditoría con etapas visibles**. En `loading.tsx`, secuenciar `Fetching`, `Checking mobile signals`, `Calculating leaks` y `Building report`, con una etapa activa y una explicación breve. | `app/informe/loading.tsx`, `app/informe/informe.module.css` | Reduce la sensación de espera arbitraria y demuestra el trabajo técnico detrás del resultado. | 1.5 h | Animación CSS existente; no instalar. |
| 5 | **Jerarquía de severidad consistente**. Mantener rojo únicamente en crítica/pérdida, usar grosor de borde y etiquetas de texto para alta/media, y añadir una leyenda de una línea. | `components/InformeView.tsx`, `app/informe/informe.module.css` | Refuerza el código visual sin depender solo del color y hace que la gravedad sea escaneable. | 1.5 h | Paleta existente; no instalar. |
| 6 | **Panel de fuentes colapsable por fuga**. Convertir las citas de cada supuesto en `details/summary`, cerrado por defecto pero accesible y visible como `Source`. | `components/InformeView.tsx`, `app/informe/informe.module.css` | Conserva la densidad para quien quiere auditar y evita que la primera lectura sea un bloque de letra pequeña. | 1.5 h | HTML nativo; no instalar. |
| 7 | **Transición de pestañas sin salto de scroll**. Al cambiar `Fugas`, `Prueba` o `Dossier`, mantener el ancla del encabezado de sección, actualizar `aria-selected` y devolver focus al tab activo. | `components/InformeView.tsx`, `app/informe/informe.module.css` | Hace el flujo de demo controlable y evita que el jurado pierda el punto de lectura. | 2 h | React y CSS actuales; no instalar. |
| 8 | **Input de portada con estados de error y ejemplo**. Mantener el campo único, añadir validación visible para URL inválida, `aria-describedby` y un ejemplo de formato debajo sin convertirlo en otra CTA. | `app/page.tsx`, `app/pagina.module.css` | Reduce el primer fallo de conversión y hace que la interacción parezca una herramienta acabada, no un prompt decorado. | 1.5 h | HTML/CSS; no instalar. |
| 9 | **Motion budget explícito**. Pausar canvas cuando la pestaña no está visible, limitar el número de líneas por DPR, y desactivar también la animación ambiental con `prefers-reduced-motion`. | `app/page.tsx`, `app/pagina.module.css`, `app/globals.css` | Conserva el gesto arterial sin gastar CPU ni distraer; muestra criterio técnico y accesibilidad. | 2 h | APIs web nativas; no instalar. |
| 10 | **Dossier con exportación legible y evidencia de procedencia**. Encabezar el dossier con nombre, fecha de auditoría, URL, versión de supuestos y una tabla compacta de pérdidas, sin añadir gráficos decorativos. | `components/InformeView.tsx`, `lib/gemini-dossier.ts`, `app/informe/informe.module.css` | El resultado sale del navegador con contexto suficiente para un dueño real y da al jurado una salida tangible. | 3 h | Código existente y Markdown actual; no instalar. |

El orden supone una demo en la que el jurado llega al informe sin tiempo para
leerlo entero. Las mejoras 1, 2, 4 y 5 son las primeras cuatro horas de mayor
retorno visual. Ninguna debe introducir morado, degradados de producto SaaS ni
una tarjeta adicional con borde de acento.

## Lo que NO hay que hacer

- No añadir gradientes morados, azul eléctrico, glassmorphism ni una paleta
  paralela. La portada es rojo arterial y el informe es void, papel y rojo de
  pérdida.
- No cambiar Anton, IBM Plex Mono o Instrument Sans por Inter, Geist genérico o
  una fuente de plantilla.
- No llenar secciones con emojis. La jerarquía ya la hacen el tipo, la escala,
  el borde y el rojo.
- No centrar todo. La portada tiene su eje lateral y el informe necesita lectura
  alineada y comparación horizontal.
- No envolver cada dato en una card con borde de acento. El borde rojo significa
  pérdida o gravedad y perdería su semántica si se usa como decoración.
- No convertir el canvas en una demo de partículas, añadir parallax o mantener
  loops de movimiento después de que el usuario haya entendido la pantalla.
- No usar un donut 3D, gauge ornamental o porcentajes sin denominador. Para
  pérdidas, una escala común y el euro exacto son más honestos.
- No esconder fórmula, supuesto o fuente detrás de una animación. El informe
  promete que cada cifra se puede explicar.
- No inventar testimonios, logos de clientes, métricas de conversión ni datos
  de Málaga que el repositorio no proporcione.
- No instalar Recharts, Motion o un kit de componentes solo para parecer
  sofisticado. El coste de bundle y de aprendizaje no aporta tanto como un SVG
  accesible y una interacción terminada.

## Claude Design y Google Flow

### Claude Design

**Uso concreto, limitado a prototipo**: generar una variante HTML estática del
widget de barras y del estado de auditoría, con la especificación textual
`#0b0d0f`, `#ff3b3b`, Anton, Plex Mono, un solo fondo y sin componentes
genéricos. Sirve para comparar rápidamente la composición del informe y enseñar
una alternativa en la revisión, no para producir el código final. La URL
publicada no es la fuente de verdad, no debe recibir datos reales de clientes y
no justifica importar su CSS o sus componentes en Next.

**No lo usaría para la portada**: esa identidad ya está implementada con
intención clara en `page.tsx` y `pagina.module.css`; delegarla perdería control
sobre el detalle que diferencia a Bleed.

### Google Flow

**Uso concreto para la entrega**: generar un B-roll abstracto de 6 a 10
segundos para el vídeo de demo o pitch, basado en una superficie roja arterial
que pierde densidad hacia negro, sin texto legible, logos ni datos falsos. El
vídeo se monta fuera del producto y acompaña la explicación de la fuga; no se
usa como fondo de la app ni como interacción del informe.

**No lo usaría para UI**: no puede sustituir el input de URL, la visualización
de fórmulas ni el simulador verificable. Si no hay un vídeo de entrega que
necesite B-roll, se descarta: el producto gana más con las diez mejoras
anteriores que con una animación decorativa.

## Lo que no sé

- No se ha verificado el rubric completo del AI Builders Hackathon 2026 ni el
  peso de cada subcriterio dentro del 15 % de diseño. El 15 % y la fecha
  proceden de `TASK.md`.
- No hay datos de analítica de la portada que permitan afirmar qué versión
  convierte mejor. Las prioridades de conversión son heurísticas de UX, no un
  A/B test.
- No se ha confirmado que cada auditoría real tenga suficientes métricas para
  un rango estadístico. La mejora 3 debe mostrar incertidumbre solo si
  `lib/quantification.ts` la puede calcular.
- No se ha medido el bundle final de Bleed con las diez mejoras. Los pesos de
  Bundlephobia son referencias del paquete, no el tamaño de producción de esta
  app.
- La API de cdnjs confirma una build UMD para Recharts `3.10.1`, no para la
  versión declarada `3.8.1`. No asumiría compatibilidad ni cargaría ese CDN.
- No se ha probado el comportamiento del canvas en todos los móviles ni con
  todos los niveles de `devicePixelRatio`. La pausa por visibilidad y el límite
  de partículas deben probarse en el dispositivo de la demo.
- No se conoce el formato, duración ni canal final del vídeo de entrega, así
  que el valor de Google Flow depende de que exista esa pieza.

