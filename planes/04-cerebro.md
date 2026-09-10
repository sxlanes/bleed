# Plan del cerebro: deteccion y cuantificacion (apartados 4 y 5)

Escrito el 9-sep-2026. Responsable: frente cerebro.

Este plan describe como Bleed convierte un `Reconocimiento` en una lista de `Fuga` y en su `Cuantificacion` en euros usando el SDK de Anthropic. No hay una sola linea de codigo aqui: es el contrato de diseno del que sale el codigo.

---

## 1. La rubrica de fugas

Catalogo cerrado de las fugas que el sistema sabe detectar en restauracion. Cada fuga tiene un identificador unico, la evidencia del `Reconocimiento` que la dispara, su gravedad por defecto, y si es determinista (codigo puro) o necesita criterio del modelo.

| ID | Titulo | Evidencia en `Reconocimiento` | Gravedad | Tipo |
|---|---|---|---|---|
| `canal-propio-ausente` | Sin canal de pedido propio | `pedidoPropio === false` Y `agregadores.length > 0` | alta | determinista |
| `comision-agregador` | Comision del agregador sin alternativa | `agregadores.length > 0` | alta | determinista |
| `tienda-cerrada` | Tienda WooCommerce fuera de horario | `stack.woocommerce === true` Y `horarioDeclarado` no cubre las 24 h | alta | modelo |
| `imagenes-pesadas` | Imagenes de portada excesivamente pesadas | `pesoImagenesKb > 2048` O `imagenesPesadas` contiene items con `kb > 500` | media | determinista |
| `ttfb-alto` | Tiempo de primera respuesta del servidor alto | `ttfbMs > 1500` | media | determinista |
| `php-obsoleto` | Version de PHP sin soporte activo | `stack.phpDeclarado` contiene version anterior a 8.1 | media | determinista |
| `sin-https` | Sin cifrado HTTPS | `https === false` | alta | determinista |
| `sin-viewport-movil` | Web no adaptada a movil | `viewportMovil === false` | media | determinista |
| `store-api-abierta` | API del catalogo expuesta sin autenticacion | `storeApi !== null` | media | modelo |
| `sin-whatsapp` | Sin canal de comunicacion rapida | `contacto.whatsapp === false` Y `contacto.telefono === null` | baja | determinista |
| `catalogo-sin-precios` | Carta sin precios visibles en la web | `catalogo.length === 0` Y no hay `storeApi` | media | modelo |
| `precio-agregador-vs-propio` | Precio del mismo plato mas alto en el agregador | dato del agregador no disponible por API (requiere Playwright) | alta | modelo |
| `ficha-google-incompleta` | Ficha de Google My Business incompleta o ausente | ningun `schema.org` de tipo `Restaurant` en el HTML | baja | modelo |
| `sin-contacto` | Sin telefono ni email visible | `contacto.telefono === null` Y `contacto.email === null` | baja | determinista |

**Fugas deterministas (9):** `canal-propio-ausente`, `comision-agregador`, `imagenes-pesadas`, `ttfb-alto`, `php-obsoleto`, `sin-https`, `sin-viewport-movil`, `sin-whatsapp`, `sin-contacto`. El codigo las detecta comprobando campos del `Reconocimiento` sin pasar por un modelo.

**Fugas que necesitan criterio del modelo (5):** `tienda-cerrada`, `store-api-abierta`, `catalogo-sin-precios`, `precio-agregador-vs-propio`, `ficha-google-incompleta`. Son ambiguas, dependen de contexto o requieren interpretar texto libre. El modelo decide si la fuga es real en este negocio concreto.

Minimo de fugas devueltas por auditoria: 3. Maximo mostrado en el informe: 7 (ordenadas por impacto economico esperado).

---

## 2. Donde acaba el codigo y empieza el modelo

Esta seccion responde directamente a la critica de "esto es un script con un envoltorio de IA".

### Fugas 100 % deterministas. El codigo las cierra solo.

**`canal-propio-ausente`**
El motor escribe `pedidoPropio: false` y `agregadores: ["JustEat"]`. El codigo lee esos campos, crea la `Fuga` y la pone en la lista. No hay modelo.

**`comision-agregador`**
El motor detecta el enlace al agregador. El codigo crea la `Fuga`. No hay modelo. La cuantificacion tampoco necesita modelo: la formula es aritmetica pura con constantes de calibracion (ver seccion 3).

**`imagenes-pesadas`**
`pesoImagenesKb > 2048` es un booleano. El codigo lista las imagenes de `imagenesPesadas` en la evidencia. No hay modelo.

**`ttfb-alto`**
`ttfbMs > 1500` es un numero. Codigo puro.

**`php-obsoleto`**
El motor pone `phpDeclarado: "PHP/7.4.33"`. El codigo extrae el numero de version y lo compara contra la lista de versiones con soporte activo (PHP 8.1+). Codigo puro.

**`sin-https`**
`https === false`. Codigo puro.

**`sin-viewport-movil`**
`viewportMovil === false`. Codigo puro.

**`sin-whatsapp`** y **`sin-contacto`**
Campos booleanos y nulos. Codigo puro.

### Fugas donde el modelo hace trabajo que el codigo no puede hacer

**`tienda-cerrada`**
El motor devuelve `horarioDeclarado: ["Mo-Fr 12:00-16:00", "Mo-Fr 20:00-23:00"]` tal cual sale del schema.org. El codigo no puede saber si ese horario tiene sentido para un restaurante de delivery en Malaga, si hay inconsistencias entre los horarios en distintos formatos, ni si la tienda WooCommerce esta configurada para cerrar fuera de esas franjas. El modelo recibe el horario, el nombre del negocio, su sector y la ciudad, y decide: (a) si la fuga existe de verdad, (b) cual es el impacto segun el tipo de negocio (una cafeteria que cierra a las 16:00 no tiene la misma fuga que una pizzeria sin horario nocturno), y (c) que frase de evidencia concreta genera para el informe.

**`store-api-abierta`**
El motor detecta que `/wp-json/wc/store/v1/products` responde 200. El codigo marca la fuga como candidata. Pero el modelo decide si es una fuga real o un falso positivo: hay restaurantes que intencionalmente tienen el catalogo publico para integraciones legitimas. El modelo lee el contexto del negocio y determina si hay riesgo de exposicion no deseada de precios o inventario.

**`catalogo-sin-precios`**
El motor no encuentra precios en el HTML ni en la Store API. El codigo puede detectar que `catalogo.length === 0`, pero no puede distinguir entre "la carta esta en PDF", "los precios se consultan en sala" o "la web simplemente esta rota". El modelo lee el HTML completo que paso por Haiku y decide cual de esas tres es mas probable para ese tipo de negocio.

**`precio-agregador-vs-propio`**
Esta fuga requiere comparar el precio del mismo plato en el agregador (raspado con Playwright) y en la web propia. El codigo detecta si los datos estan disponibles. El modelo interpreta las discrepancias: un precio 10 % mayor en el agregador puede ser inflacion de margen o puede ser un error de actualizacion. El modelo redacta la evidencia con la diferencia concreta y explica el impacto.

**`ficha-google-incompleta`**
El motor no tiene acceso a la API de Google My Business (requeriria autenticacion del dueno). El codigo detecta la ausencia de schema.org de tipo `Restaurant`. El modelo interpreta esa ausencia: es posible que la ficha exista y este completa pero que la web no tenga marcado estructurado. El modelo valora la evidencia disponible (capturas, schema detectado, contacto visible) y emite un juicio con el nivel de certeza correspondiente.

---

## 3. La formula de cada fuga cuantificable

Cada formula esta escrita en aritmetica real. Las constantes se referencian por su `id` en `lib/calibracion.ts`. Cuando el dato del dueno no esta disponible, la formula usa la constante nacional y lo declara.

### `comision-agregador`

**Pregunta que responde:** cuanto dinero pierde el negocio al ano por no tener canal de pedido propio y dejar que el agregador se lleve su comision.

**Variables:**
- `P` = pedidos al mes del negocio. **No es publico.** Se pide al dueno (ver seccion 4).
- `T` = ticket medio en euros. Si la Store API esta abierta, se calcula como mediana real del catalogo. Si no, se usa `ticketMedioRestauracion.valor` = 21 euros.
- `C` = comision del agregador. Se usa `comisionAgregadorCompleto.valor` = 25 % si el agregador gestiona el reparto, o `comisionAgregadorCaptacion.valor` = 13 % si el restaurante reparte por cuenta propia.
- `R` = parte de esos pedidos que se recuperaria al tener canal propio. Se usa `preferenciaCanalDirecto.valor` = 58 % como suelo conservador.

**Formula:**

```
euros_anuales = P * T * (C / 100) * R * 12
```

**Ejemplo con el negocio de demostracion (T calculado del catalogo real: mediana de 89 productos es 10,50 euros por articulo; pedido estimado de 2 articulos = 21 euros; coincide con la media nacional):**

```
minimo:   50 pedidos/mes * 21 € * 0,13 * 0,58 * 12 = 953 €/ano
esperado: 150 pedidos/mes * 21 € * 0,25 * 0,58 * 12 = 5.481 €/ano
maximo:   300 pedidos/mes * 21 € * 0,35 * 0,58 * 12 = 15.346 €/ano
```

**Constantes citadas en `Cuantificacion.constantes`:** `["comisionAgregadorCompleto", "comisionAgregadorCaptacion", "ticketMedioRestauracion", "preferenciaCanalDirecto"]`

**Supuestos declarados en `Cuantificacion.supuestos`:**
1. "Pedidos mensuales no conocidos: se presentan tres escenarios (50, 150 y 300 pedidos/mes). El dueno puede ajustar con su dato real."
2. "Ticket medio: 21 euros segun CaixaBank Research 2024, ajustado con el catalogo real cuando la API esta abierta."
3. "Comision del agregador: 25 % para servicio completo (Uber Eats basico, Just Eat completo), 13 % si el restaurante reparte por su cuenta (Just Eat captacion). Ninguna plataforma publica su tarifa oficial; fuente secundaria Qamarero.com."
4. "Recuperacion potencial: 58 % segun NCR Voyix 2024 (dato de EE. UU., sin equivalente espanol publicado)."

---

### `imagenes-pesadas`

**Pregunta que responde:** cuanto dinero cuesta el exceso de peso de imagenes en terminos de pedidos perdidos por lentitud de carga.

**Variables:**
- `V` = visitas mensuales a la web. **No es publico.** Se pide al dueno (ver seccion 4). Sin dato, `eurosAnuales = null`.
- `T` = ticket medio. Igual que en `comision-agregador`.
- `S` = segundos de carga adicionales causados por el exceso de imagenes. Se estima como `(pesoImagenesKb - 500) / 500`, donde 500 KB es el suelo razonable y cada 500 KB adicionales representan aproximadamente 1 segundo extra en una conexion movil 4G media (4 Mbps). La formula es una estimacion conservadora y se declara como tal.
- `D` = caida de conversion por segundo adicional. Se usa `caidaConversionPorSegundo.valor` = 0,3 puntos porcentuales.

**Formula (solo cuando el dueno da sus visitas):**

```
pedidos_perdidos_mes = V * (S * D / 100)
euros_anuales = pedidos_perdidos_mes * T * 12
```

**Si el dueno no da sus visitas:** `eurosAnuales = null`. La fuga se presenta como friccion medida (X KB de imagenes, Y segundos de carga estimados) sin cifra en euros.

**Constantes citadas:** `["caidaConversionPorSegundo", "ticketMedioRestauracion"]`

---

### `ttfb-alto`

**Pregunta que responde:** cuantos visitantes abandona la web antes de ver nada por la lentitud del servidor.

**Variables:**
- `V` = visitas mensuales. **No publico.** Se pide al dueno.
- `T` = ticket medio.
- `S` = segundos de TTFB por encima de 0,8 s (umbral de buena experiencia segun Google). `S = (ttfbMs - 800) / 1000`.
- `D` = `caidaConversionPorSegundo.valor` = 0,3 puntos por segundo.

**Formula (solo cuando el dueno da sus visitas):**

```
euros_anuales = V * (S * D / 100) * T * 12
```

**Si no hay dato de visitas:** `eurosAnuales = null`. Se presenta el TTFB medido y la comparativa con el umbral de Google (0,8 s bueno, 1,8 s necesita mejora, por encima de 3 s critico).

**Constantes citadas:** `["caidaConversionPorSegundo", "ticketMedioRestauracion"]`

---

### `tienda-cerrada`

**Pregunta que responde:** cuanta facturacion potencial se pierde porque la tienda online cierra fuera del horario de sala.

**Variables:**
- `P` = pedidos al mes en plataformas. **No publico.** Se pide al dueno.
- `T` = ticket medio.
- `H` = horas al dia en que la tienda esta cerrada pero el mercado de delivery esta activo. El modelo lo estima a partir del horario declarado y del patron tipico de delivery en Espana (viernes y sabado de 21:00 a 01:00 concentran una parte significativa del delivery; el modelo declara esta estimacion como supuesto sin valor numerico exacto porque no hay fuente citable con desglose horario espanol).
- `F` = fraccion del negocio digital que cae en esas horas. El modelo lo estima y lo declara como supuesto.

**Formula:**

```
euros_anuales = P * T * F * (H / 24) * 365
```

Esta fuga es la mas dependiente del modelo porque `H` y `F` no tienen fuente citada independiente. El modelo declara su estimacion como tal y ofrece al dueno recalcular con sus propios datos del panel de la plataforma.

**Constantes citadas:** `["ticketMedioRestauracion", "pesoCanalDigital"]`

---

### Fugas sin formula en euros

`sin-https`, `php-obsoleto`, `sin-viewport-movil`, `sin-whatsapp`, `sin-contacto`, `ficha-google-incompleta`, `store-api-abierta`, `catalogo-sin-precios`:

Estas fugas tienen `eurosAnuales = null` de forma permanente, no por falta de dato del dueno sino porque no hay constante citada con la que construir una formula honesta sin una cadena de suposiciones demasiado larga. Se presentan como friccion real con evidencia medida. El campo `desconocido` es null pero `supuestos` explica por que no hay cifra.

---

## 4. El camino del "no lo se"

Datos que solo tiene el dueno, la pregunta exacta que se le hace, y como se presenta la fuga sin cifra.

### Pedidos mensuales

**Que es:** el numero de pedidos que recibe el negocio al mes a traves de agregadores (Glovo, Uber Eats, Just Eat).

**Por que no esta disponible:** las plataformas no publican datos por negocio. El propio sitio no tiene ninguna senal publica de volumen.

**Pregunta exacta al dueno:**
> "Para afinar la estimacion economica, nos ayudaria saber: aproximadamente, cuantos pedidos al mes recibes por Glovo, Uber Eats o Just Eat juntos? No hace falta que sea exacto, un rango del tipo '50 a 100' ya mejora mucho el calculo."

**Como se presenta sin el dato:**
La `Cuantificacion` devuelve tres escenarios (minimo, esperado, maximo) con `eurosAnuales.minimo`, `eurosAnuales.esperado` y `eurosAnuales.maximo` calculados con 50, 150 y 300 pedidos respectivamente. El informe muestra los tres y etiqueta el esperado como "escenario medio conservador". El campo `desconocido` contiene:
```json
{
  "dato": "pedidos mensuales por agregador",
  "pregunta": "Cuantos pedidos al mes recibes por Glovo, Uber Eats o Just Eat juntos?"
}
```

### Visitas mensuales a la web

**Que es:** el numero de sesiones o usuarios unicos al mes que llegan a la web del negocio.

**Por que no esta disponible:** Google Analytics no es publico. No hay senal de visitas en el HTML.

**Pregunta exacta al dueno:**
> "Tienes acceso a Google Analytics o a las estadisticas de tu web? Si me dices cuantas visitas al mes tienes aproximadamente, puedo calcular cuanto te esta costando la lentitud de carga en pedidos perdidos."

**Como se presenta sin el dato:**
Las fugas `imagenes-pesadas` y `ttfb-alto` tienen `eurosAnuales = null`. El informe muestra la medida tecnica concreta ("tus imagenes pesan X MB; el estandar es menos de 500 KB") y el impacto cualitativo ("cada segundo extra de carga reduce la conversion un 0,3 %, segun Portent, estudio de 100 millones de paginas vistas"). No hay numero en euros. El campo `desconocido`:
```json
{
  "dato": "visitas mensuales a la web",
  "pregunta": "Cuantas visitas al mes recibe tu web aproximadamente?"
}
```

### Horario real de pedidos por plataforma

**Que es:** en que franja horaria llegan la mayoria de los pedidos del negocio a traves del agregador.

**Por que no esta disponible:** dato interno de la plataforma, solo visible en el panel del restaurante.

**Pregunta exacta al dueno:**
> "En tu panel de Glovo o Uber Eats, puedes ver a que hora llegan mas pedidos? O de memoria: hay mucho pedido nocturno los fines de semana?"

**Como se presenta sin el dato:**
La fuga `tienda-cerrada` usa la estimacion del modelo basada en el horario declarado y en patrones tipicos del sector. El supuesto se declara explicitamente: "Se estima que una parte significativa del delivery cae en franja nocturna de fines de semana; sin el dato real del negocio, la cifra de horas perdidas es orientativa. Con el dato de tu panel, el calculo se cierra."

---

## 5. Los prompts, en su forma final

La separacion entre sistema cacheado y mensaje de usuario es deliberada: todo lo que es identico entre auditorias va delante con `cache_control`, y solo el HTML del negocio va al final.

### Pasada 1: extraccion con `claude-haiku-4-5`

**Nota tecnica:** Haiku 4.5 no acepta `thinking` ni `budget_tokens` de extended thinking. La llamada es directa.

**System (se cachea; va con `cache_control: {type: "ephemeral"}` al final del bloque):**

```
You are a structured data extractor for audits of Spanish restaurant websites.

Your only task is to read the HTML you are given and fill a JSON with the observed data. You do not interpret, do not opine, do not quantify. You only extract what is in the HTML.

Absolute rules:
- If data does not appear in the HTML, its value is null. Never invent a value.
- If data appears partially, extract what is there and mark the rest as null.
- Prices always in cents (multiply by 100), no currency symbol.
- Hours exactly as they appear in HTML or schema.org, without reformatting or translating.
- The noSeHaPodido field lists literally what you searched for and did not find, in a short sentence per item.
- Aggregator names are normalized to: "JustEat", "Glovo", "UberEats", "Deliveroo". Any other goes as-is.

You return exactly the JSON of the schema passed to you in the message. No comments, no additional text, no code blocks, no markdown. Only valid JSON.
```

**Mensaje de usuario:**

```
Schema de salida (JSON Schema):
{schema_extraccion_json}

HTML del negocio (URL: {url}):
{html_completo}
```

Donde `{schema_extraccion_json}` es el schema de la pasada 1 (ver seccion 6), `{url}` es la URL auditada, y `{html_completo}` es el HTML completo de la pagina principal mas el HTML de las rutas de pedido si las hay, truncado a 100.000 caracteres si supera ese limite.

**Parametros de la llamada:**
```json
{
  "model": "claude-haiku-4-5",
  "max_tokens": 2048,
  "system": [
    {
      "type": "text",
      "text": "<system prompt de arriba>",
      "cache_control": { "type": "ephemeral" }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "<mensaje de usuario de arriba>"
    }
  ]
}
```

**Verificacion de cache:** tras la primera llamada, `response.usage.cache_read_input_tokens` debe ser mayor que cero en la segunda auditoria con el mismo system. Si es cero, hay algo variable en el system que invalida la cache: revisar si hay timestamps, UUIDs o variables de entorno en el texto del system.

---

### Pasada 2: cuantificacion y redaccion con `claude-sonnet-5`

**Nota tecnica:** Sonnet 5 acepta `thinking: {type: "adaptive"}`. Se activa para que el modelo muestre su razonamiento al decidir que fugas incluir y como cuantificarlas. El bloque de thinking no sale en la respuesta final al usuario; se guarda en Supabase para depuracion y auditoria interna.

**System (se cachea):**


You are the analytical brain of Bleed, an auditor of Spanish restaurant businesses.

You receive structured data from a restaurant website, already extracted and verified, and your job is:
1. Decide which leaks are real and relevant for THIS specific business.
2. Quantify each leak in euros with its visible assumptions.
3. Write the dossier for the owner, who is not technical.

Absolute rules that are not negotiable:

ABOUT LEAKS:
- You only detect leaks from the closed catalog given to you below. Do not invent new leaks.
- A leak appears in the report only if there is concrete evidence in the business data. Do not infer leaks from what "could happen".
- Prioritize by real economic impact on THIS business. A pizzeria with WooCommerce and on Glovo has a more serious aggregator commission leak than the same pizzeria without HTTPS.
- The result must be specific to this business. If your response uses generic phrases like "loading speed is important for any business", automated validation will reject it.
- Between 3 and 7 leaks in the final report. Not one less, not one more.

ABOUT NUMBERS:
- No euro without its assumption declared in the assumptions[] field. A number without an assumption is a contract error, not a presentation detail.
- When a piece of business data is missing, the eurosAnuales field is null. Do not put an "indicative" number without explicitly declaring it in assumptions[].
- The constants you use go in the constants[] field by their exact id as it appears in the table below. Do not write constants that are not in that table.
- When you use a constant with a warning, that warning appears textually in assumptions[].
- The range of eurosAnuales.maximo cannot exceed 44,100 euros. If your calculation gives more, review your assumptions.

ABOUT THE DOSSIER:
- Written in English, in second person, addressed to the business owner.
- No jargon you have not explained earlier in the same paragraph.
- The argument is economic, not technical: how much money, why, what would need to change.
- Mention the business name at least twice.
- Length: between 200 and 400 words. Not longer.

ABOUT HONESTY:
- If you cannot quantify a leak because the business data is missing, say it with these exact words: "To calculate this figure I need to know [specific data]."
- If a source is from the US or from 2022 or earlier, say it in the corresponding assumption.
- If the aggregator commission model is an estimate because platforms do not publish rates, say it in assumptions[].

CATALOG OF LEAKS AND ALLOWED CONSTANTS:

channel-missing: allowed constants = comisionAgregadorCompleto, comisionAgregadorCaptacion, ticketMedioRestauracion, preferenciaCanalDirecto
aggregator-commission: allowed constants = comisionAgregadorCompleto, comisionAgregadorCaptacion, ticketMedioRestauracion, preferenciaCanalDirecto
store-closed: allowed constants = ticketMedioRestauracion, pesoCanalDigital
heavy-images: allowed constants = caidaConversionPorSegundo, ticketMedioRestauracion
high-ttfb: allowed constants = caidaConversionPorSegundo, ticketMedioRestauracion
obsolete-php: allowed constants = none

```
Eres el cerebro analitico de Bleed, un auditor de negocios de restauracion espanola.

Recibes los datos estructurados de una web de restaurante, ya extraidos y verificados, y tu trabajo es:
1. Decidir que fugas son reales y relevantes para ESTE negocio concreto.
2. Cuantificar cada fuga en euros con sus supuestos visibles.
3. Redactar el dossier para el dueno, que no es tecnico.

Reglas absolutas que no se negocian:

SOBRE LAS FUGAS:
- Solo detectas fugas del catalogo cerrado que se te da a continuacion. No inventas fugas nuevas.
- Una fuga aparece en el informe solo si hay evidencia concreta en los datos del negocio. No infieres fugas de lo que "podria pasar".
- Prioriza por impacto economico real en ESTE negocio. Una pizzeria con WooCommerce y en Glovo tiene una fuga de comision de agregador mas grave que la misma pizzeria sin HTTPS.
- El resultado debe ser especifico para este negocio. Si tu respuesta usa frases genericas como "la velocidad de carga es importante para cualquier negocio", la validacion automatica la rechazara.
- Entre 3 y 7 fugas en el informe final. Ni una menos, ni una mas.

SOBRE LOS NUMEROS:
- Ningun euro sin su supuesto declarado en el campo supuestos[]. Un numero sin supuesto es un error de contrato, no un detalle de presentacion.
- Cuando falta un dato del dueno, el campo eurosAnuales es null. No se pone un numero "orientativo" sin declararlo explicitamente en supuestos[].
- Las constantes que uses van en el campo constantes[] por su id exacto tal como aparece en la tabla de abajo. No escribas constantes que no esten en esa tabla.
- Cuando uses una constante con advertencia, esa advertencia aparece textualmente en supuestos[].
- El rango de eurosAnuales.maximo no puede superar 44.100 euros. Si tu calculo da mas, revisa los supuestos.

SOBRE EL DOSSIER:
- Se escribe in English, en segunda persona, dirigido al dueno del negocio.
- Sin tecnicismos que no hayas explicado antes en el mismo parrafo.
- El argumento es economico, no tecnico: cuanto dinero, por que motivo, que habria que cambiar.
- Menciona el nombre del negocio al menos dos veces.
- Longitud: entre 200 y 400 palabras. No mas larga.

SOBRE LA HONESTIDAD:
- Si no puedes cuantificar una fuga porque falta el dato del dueno, lo dices con esas palabras exactas: "Para calcular esta cifra necesito saber [dato concreto]."
- Si una fuente es de EE. UU. o de 2022 o anterior, lo dices en el supuesto correspondiente.
- Si el modelo de comision del agregador es una estimacion porque las plataformas no publican tarifas, lo dices en supuestos[].

CATALOGO DE FUGAS Y CONSTANTES PERMITIDAS:

canal-propio-ausente: constantes permitidas = comisionAgregadorCompleto, comisionAgregadorCaptacion, ticketMedioRestauracion, preferenciaCanalDirecto
comision-agregador: constantes permitidas = comisionAgregadorCompleto, comisionAgregadorCaptacion, ticketMedioRestauracion, preferenciaCanalDirecto
tienda-cerrada: constantes permitidas = ticketMedioRestauracion, pesoCanalDigital
imagenes-pesadas: constantes permitidas = caidaConversionPorSegundo, ticketMedioRestauracion
ttfb-alto: constantes permitidas = caidaConversionPorSegundo, ticketMedioRestauracion
php-obsoleto: constantes permitidas = ninguna
sin-https: constantes permitidas = ninguna
sin-viewport-movil: constantes permitidas = ninguna
store-api-abierta: constantes permitidas = ninguna
sin-whatsapp: constantes permitidas = ninguna
catalogo-sin-precios: constantes permitidas = ninguna
precio-agregador-vs-propio: constantes permitidas = comisionAgregadorCompleto, ticketMedioRestauracion
ficha-google-incompleta: constantes permitidas = ninguna
sin-contacto: constantes permitidas = ninguna

VALORES DE LAS CONSTANTES (usa SIEMPRE el valor conservador, no el maximo):

comisionAgregadorCompleto: 25 % (rango 15-35). Fuente secundaria Qamarero.com; las plataformas no publican tarifa oficial. Advertencia: citar que la fuente es secundaria por necesidad.
comisionAgregadorCaptacion: 13 % (fijo). Misma fuente.
ticketMedioRestauracion: 21 euros (rango 16,5-35). CaixaBank Research 2024. Advertencia: si la Store API esta abierta, usar la mediana real del catalogo en lugar de este valor.
pesoCanalDigital: 20 % (rango 18-22). Anuario Hosteleria Espana 2025. Advertencia: es una media nacional, no el dato del negocio.
preferenciaCanalDirecto: 58 % (rango 58-70). NCR Voyix 2024. Advertencia: dato de EE. UU., sin equivalente espanol publicado.
caidaConversionPorSegundo: 0,3 puntos porcentuales por segundo adicional. Portent, 100 millones de paginas vistas en 20 sitios y 5,6 millones de sesiones.
dependenciaAgregadorSector: 76,4 %. BCC Innovation y Delectatech 2022. Advertencia: datos de 2022, citar con su fecha.
```

**Mensaje de usuario:**

```
Datos del negocio auditado:

Nombre: {nombre_negocio}
Ciudad: {ciudad}
Sector: restauracion

Reconocimiento estructurado:
{reconocimiento_json}

Fugas detectadas deterministicamente por codigo (ya estan en el conjunto; debes cuantificarlas y decidir si las incluyes en el informe final segun su relevancia para este negocio):
{fugas_deterministas_json}

Fugas candidatas que necesitan tu criterio (decide cuales son reales para este negocio):
{fugas_candidatas_json}

Devuelve exactamente el JSON del schema de salida. Sin texto adicional, sin bloques de codigo, sin markdown. Solo el JSON valido.

Schema de salida:
{schema_cuantificacion_json}
```

**Parametros de la llamada:**
```json
{
  "model": "claude-sonnet-5",
  "max_tokens": 4096,
  "thinking": { "type": "adaptive" },
  "system": [
    {
      "type": "text",
      "text": "<system prompt de arriba>",
      "cache_control": { "type": "ephemeral" }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "<mensaje de usuario de arriba>"
    }
  ]
}
```

---

## 6. El esquema de salida estructurada

Cada pasada devuelve un JSON estricto. Los campos estan casados uno a uno con `lib/tipos.ts`.

### Schema de pasada 1 (Haiku, extraccion)

Este schema produce la parte del `Reconocimiento` que requiere leer texto. El motor de reconocimiento (Playwright, peticiones HTTP) ya ha rellenado los campos tecnicos (`ttfbMs`, `pesoImagenesKb`, `https`, `viewportMovil`, `imagenesPesadas`, `storeApi`, `capturas`, `url`, `urlFinal`, `estadoHttp`). Haiku solo rellena: `stack.wordpress`, `stack.woocommerce`, `stack.phpDeclarado`, `stack.plugins`, `horarioDeclarado`, `agregadores`, `pedidoPropio`, `catalogo`, `contacto`, `noSeHaPodido`.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["stack", "agregadores", "pedidoPropio", "catalogo", "horarioDeclarado", "contacto", "noSeHaPodido"],
  "properties": {
    "stack": {
      "type": "object",
      "required": ["wordpress", "woocommerce", "phpDeclarado", "plugins"],
      "properties": {
        "wordpress": { "type": "boolean" },
        "woocommerce": { "type": "boolean" },
        "phpDeclarado": { "type": ["string", "null"] },
        "plugins": { "type": "array", "items": { "type": "string" } }
      }
    },
    "agregadores": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["JustEat", "Glovo", "UberEats", "Deliveroo"]
      }
    },
    "pedidoPropio": { "type": "boolean" },
    "catalogo": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["nombre", "precioCentimos", "categoria"],
        "properties": {
          "nombre": { "type": "string" },
          "precioCentimos": {
            "type": "integer",
            "minimum": 0,
            "description": "Precio en centimos enteros. 12,50 euros = 1250"
          },
          "categoria": { "type": ["string", "null"] }
        }
      }
    },
    "horarioDeclarado": {
      "type": ["array", "null"],
      "items": { "type": "string" }
    },
    "contacto": {
      "type": "object",
      "required": ["telefono", "email", "whatsapp"],
      "properties": {
        "telefono": { "type": ["string", "null"] },
        "email": { "type": ["string", "null"] },
        "whatsapp": { "type": "boolean" }
      }
    },
    "noSeHaPodido": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

### Schema de pasada 2 (Sonnet, cuantificacion)

Este schema produce `Fuga[]`, `Cuantificacion[]` y el `dossier`. Los tipos estan casados con `lib/tipos.ts` campo a campo.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["fugas", "cuantificacion", "dossier"],
  "properties": {
    "fugas": {
      "type": "array",
      "minItems": 3,
      "maxItems": 7,
      "items": {
        "type": "object",
        "required": ["id", "titulo", "evidencia", "gravedad", "porQueImporta"],
        "properties": {
          "id": {
            "type": "string",
            "enum": [
              "canal-propio-ausente", "comision-agregador", "tienda-cerrada",
              "imagenes-pesadas", "ttfb-alto", "php-obsoleto", "sin-https",
              "sin-viewport-movil", "store-api-abierta", "sin-whatsapp",
              "catalogo-sin-precios", "precio-agregador-vs-propio",
              "ficha-google-incompleta", "sin-contacto"
            ]
          },
          "titulo": { "type": "string" },
          "evidencia": {
            "type": "string",
            "description": "Cita el dato concreto del reconocimiento. No puede ser una frase generica."
          },
          "gravedad": { "type": "string", "enum": ["alta", "media", "baja"] },
          "porQueImporta": {
            "type": "string",
            "description": "Por que importa en ESTE negocio concreto. No puede mencionar 'cualquier negocio' ni 'en general'."
          }
        }
      }
    },
    "cuantificacion": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["fugaId", "eurosAnuales", "supuestos", "constantes", "desconocido"],
        "properties": {
          "fugaId": { "type": "string" },
          "eurosAnuales": {
            "oneOf": [
              {
                "type": "object",
                "required": ["minimo", "esperado", "maximo"],
                "properties": {
                  "minimo": { "type": "number", "minimum": 0 },
                  "esperado": { "type": "number", "minimum": 0 },
                  "maximo": { "type": "number", "minimum": 0, "maximum": 44100 }
                }
              },
              { "type": "null" }
            ]
          },
          "supuestos": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 1
          },
          "constantes": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "comisionAgregadorCompleto", "comisionAgregadorCaptacion",
                "ticketMedioRestauracion", "pesoCanalDigital",
                "preferenciaCanalDirecto", "caidaConversionPorSegundo",
                "dependenciaAgregadorSector"
              ]
            }
          },
          "desconocido": {
            "oneOf": [
              {
                "type": "object",
                "required": ["dato", "pregunta"],
                "properties": {
                  "dato": { "type": "string" },
                  "pregunta": { "type": "string" }
                }
              },
              { "type": "null" }
            ]
          }
        }
      }
    },
    "dossier": {
      "type": "string",
      "minLength": 200,
      "description": "Argumento para el dueno in English, sin tecnicismos, entre 200 y 400 palabras. Markdown permitido solo para negritas y saltos de parrafo."
    }
  }
}
```

**Casado con `lib/tipos.ts`:**
- `fugas[n]` es exactamente `Fuga` de `lib/tipos.ts`.
- `cuantificacion[n]` es exactamente `Cuantificacion` de `lib/tipos.ts`.
- `dossier` va al campo `Informe.dossier`.
- `Informe.totalAnualEsperado` lo calcula el codigo sumando los `eurosAnuales.esperado` no nulos: el modelo no lo calcula.
- `Informe.fugasSinCifrar` lo calcula el codigo contando los `eurosAnuales === null`.
- `Informe.negocio` y `Informe.reconocimiento` los rellena el despachador de ST-01, no el modelo.

---

## 7. Como se evita que dos negocios distintos den las mismas cinco fugas

El criterio de aceptacion del apartado 4 dice literalmente que tiene que funcionar en tres negocios distintos sin repetirse.

**El problema real:** si el system prompt no lo impide, Sonnet tiende a devolver las fugas mas graves del catalogo independientemente del negocio. Una pizzeria y un bar de tapas recibirian ambas `comision-agregador` e `imagenes-pesadas` aunque una no use agregador y la otra tenga imagenes ligeras.

**La solucion tiene tres patas:**

Primera pata: las fugas deterministas ya filtran por evidencia concreta antes de llegar al modelo. Si el `Reconocimiento` de un negocio tiene `agregadores: []`, la fuga `comision-agregador` no entra en `{fugas_deterministas_json}` ni en `{fugas_candidatas_json}`. El modelo no puede incluir una fuga que no esta en su entrada. El codigo que construye `{fugas_candidatas_json}` solo pone en esa lista las fugas cuya condicion de activacion se cumple en el `Reconocimiento`.

Segunda pata: el system prompt incluye la instruccion "El resultado debe ser especifico para este negocio. Si tu respuesta usa frases genericas como 'la velocidad de carga es importante para cualquier negocio', la validacion automatica la rechazara." El campo `porQueImporta` de cada `Fuga` fuerza al modelo a justificar la relevancia en este negocio concreto. Si la frase es generica, la validacion programatica la marca como sospechosa (ver seccion 8, paso 5).

Tercera pata: la verificacion automatica de diversidad. Al terminar cada auditoria, el codigo calcula la similitud de Jaccard entre el conjunto de IDs de fugas del negocio actual y el de las ultimas tres auditorias guardadas en Supabase. Formula: `J = |A ∩ B| / |A ∪ B|`. Si `J > 0,8` (mas de cuatro fugas en comun en un informe de cinco), el sistema lanza una advertencia en el log (`console.warn("SIMILITUD_ALTA: revisar diversidad de fugas, J=" + J)`) y registra el evento en Supabase con los IDs de ambos negocios para revision manual. No bloquea la auditoria porque dos negocios muy parecidos pueden tener legitimamente las mismas fugas graves, pero queda registrado.

**Comando de verificacion del criterio de aceptacion (ST-07):**
`node scripts/verificar-diversidad.mjs` con los `Reconocimientos` precalentados de el negocio de demostracion (tiene `comision-agregador`, `imagenes-pesadas`, `ttfb-alto`, `php-obsoleto`), Terra Mia (tiene `canal-propio-ausente`, `catalogo-sin-precios`, sin API abierta) y Golden Curry (tiene `catalogo-sin-precios` con API abierta, `sin-whatsapp`). El script falla con codigo de salida 1 si cualquier par tiene `J > 0,8`.

---

## 8. Antialucinacion

Lo que se hace cuando el modelo se inventa una cifra o cita una fuente que no esta en la calibracion. Validacion programatica, no confianza.

### Paso 1: validacion del schema antes de usar la respuesta

El JSON devuelto por cada pasada se valida contra su schema (seccion 6) con `ajv` antes de pasarlo al siguiente paso. Si la validacion falla, se lanza y el error va a Supabase con el JSON crudo del modelo. No se usa una respuesta que no valida el schema.

### Paso 2: lista blanca de constantes

El campo `constantes[]` de cada `Cuantificacion` solo puede contener IDs que existan en `CONSTANTES` de `lib/calibracion.ts`. La funcion `constante(id)` de ese mismo fichero ya lanza si el ID no existe. El codigo recorre `cuantificacion[n].constantes` y llama a `constante(id)` en cada uno antes de ensamblar el `Informe`. Si alguno lanza, la cuantificacion de esa fuga se rechaza: su `eurosAnuales` se pone a `null` y su `desconocido` dice `{ dato: "constante no reconocida", pregunta: "El sistema cito una fuente que no esta en su calibracion: {id}" }`.

### Paso 3: comprobacion de rango en los euros

Cada cifra de `eurosAnuales` se verifica contra el rango maximo razonable calculado de forma determinista:
```
maxRazonable = 300 * ticketMedioRestauracion.maximo * comisionAgregadorCompleto.maximo / 100 * 12
             = 300 * 35 * 0,35 * 12
             = 44.100 euros
```
Si `eurosAnuales.maximo` supera ese techo, la cuantificacion se rechaza y el evento se registra en Supabase con la cifra que produjo el modelo. El schema de la pasada 2 ya incluye `"maximum": 44100` en `eurosAnuales.maximo` para que `ajv` lo valide antes de llegar a este paso.

### Paso 4: verificacion de que supuestos no esta vacio

Si `eurosAnuales !== null` y `supuestos.length === 0`, la cuantificacion se rechaza con el mismo mecanismo del paso 2. Un numero sin supuesto es un fallo de contrato.

### Paso 5: verificacion de que `porQueImporta` es especifico

El campo `porQueImporta` de cada `Fuga` se compara contra una lista de cadenas prohibidas: `["es importante", "puede afectar", "en general", "para cualquier negocio", "todo negocio", "como cualquier"]`. Si alguna de esas cadenas aparece (comparacion insensible a mayusculas), la fuga se marca como `sospechosa: true` en el log de Supabase. No bloquea el informe pero queda registrado para revision.

### Paso 6: reintentos y fallback

Si la pasada 2 falla la validacion del schema tres veces seguidas, el informe se genera sin cuantificacion del modelo: se usan solo las fugas deterministas con `eurosAnuales = null` en todas. El `dossier` lo escribe el codigo con una plantilla fija que lista las fugas tecnicas sin euros y explica: "Por un problema en el analisis automatico, no hemos podido generar las estimaciones economicas en esta auditoria. Los datos tecnicos son correctos y estan verificados."

---

## 9. Coste por auditoria

Precios consultados el 9-sep-2026 para el SDK de Anthropic. Referencia: `https://www.anthropic.com/pricing`.

| Modelo | Precio entrada (por M tokens) | Precio salida (por M tokens) | Cache escritura (por M) | Cache lectura (por M) |
|---|---|---|---|---|
| `claude-haiku-4-5` | 1 $ | 5 $ | 1,25 $ | 0,10 $ |
| `claude-sonnet-5` | 2 $ | 10 $ | 2,50 $ | 0,20 $ |

### Estimacion de tokens por pasada

**Pasada 1 (Haiku, extraccion):**
- System prompt: ~500 tokens. Se cachea tras la primera auditoria del dia (TTL de cache de Anthropic: 5 minutos para `ephemeral`; en produccion, el sistema hace una auditoria de calentamiento al arrancar para poblar la cache).
- HTML del negocio: entre 5.000 y 40.000 tokens segun tamano. Estimacion conservadora para un restaurante mediano: 15.000 tokens.
- Salida (JSON estructurado): ~800 tokens.

Coste pasada 1 sin cache activa (primera auditoria del dia):
```
entrada: (500 + 15.000) / 1.000.000 * 1 = 0,0155 $
salida:  800 / 1.000.000 * 5 = 0,0040 $
total: 0,0195 $
```

Coste pasada 1 con cache activa (auditorias siguientes):
```
cache lectura system: 500 / 1.000.000 * 0,10 = 0,00005 $
entrada HTML: 15.000 / 1.000.000 * 1 = 0,0150 $
salida: 800 / 1.000.000 * 5 = 0,0040 $
total: 0,0191 $
```
La diferencia en esta pasada es minima porque el system es corto; el HTML cambia por auditoria y no se cachea.

**Pasada 2 (Sonnet, cuantificacion):**
- System prompt: ~2.000 tokens. Se cachea.
- Reconocimiento JSON + fugas candidatas: ~2.000 tokens.
- Tokens de thinking (adaptive): ~500-1.500 tokens de entrada adicionales; el modelo los genera internamente.
- Salida (JSON de fugas + cuantificacion + dossier): ~2.500 tokens.

Coste pasada 2 sin cache activa:
```
entrada: (2.000 + 2.000 + 1.000 thinking) / 1.000.000 * 2 = 0,0100 $
salida:  2.500 / 1.000.000 * 10 = 0,0250 $
total: 0,0350 $
```

Coste pasada 2 con cache activa (system cacheado):
```
cache lectura system: 2.000 / 1.000.000 * 0,20 = 0,0004 $
entrada variable: (2.000 + 1.000) / 1.000.000 * 2 = 0,0060 $
salida: 2.500 / 1.000.000 * 10 = 0,0250 $
total: 0,0314 $
```

**Coste total por auditoria:**
- Sin cache (primera del dia): 0,0195 + 0,0350 = **~0,055 $ = ~0,050 euros** (a 0,91 $/euro el 9-sep-2026).
- Con cache activa: 0,0191 + 0,0314 = **~0,051 $ = ~0,046 euros**.

**Peor caso (web muy pesada, 40.000 tokens de HTML):**
```
pasada 1: (500 + 40.000) / 1.000.000 * 1 + 800 / 1.000.000 * 5 = 0,0405 + 0,0040 = 0,0445 $
pasada 2: sin cambio
total: 0,0445 + 0,0350 = 0,0795 $ = ~0,072 euros
```

**Conclusion:** cada auditoria cuesta entre 5 y 8 centimos de euro. Con el modelo de negocio de Bleed (la auditoria es gratuita y se cobra la visita de consultoria), el coste de IA es irrelevante frente al margen de la venta.

---

## 10. Plan de trabajo en subtareas de 1-2 ficheros

Ruta critica marcada con [RC]. Una subtarea bloqueada en la ruta critica detiene todo lo que viene despues. El orden propuesto permite paralelizar ST-02 y ST-05.

### ST-01: el despachador del cerebro [RC]

**Fichero:** `lib/cerebro.ts`

**Funcion principal:** `auditarNegocio(reconocimiento: Reconocimiento): Promise<{ fugas: Fuga[]; cuantificacion: Cuantificacion[]; dossier: string }>`. Es el punto de entrada unico del frente cerebro. Orquesta: recibe el `Reconocimiento` del motor, llama a `extraerConHaiku` (ST-03) para completar los campos de texto, llama a `detectarFugasDeterministas` (ST-02), decide que fugas candidatas pasan al modelo, llama a `cuantificarConSonnet` (ST-04), valida con `validarRespuesta` (ST-05), y devuelve el resultado.

**Comando de verificacion:** `npx tsc --noEmit` sin errores.

**Dependencias:** necesita que ST-02, ST-03, ST-04, ST-05 esten firmados (aunque no implementados del todo) para que los tipos compilen.

---

### ST-02: las detecciones deterministas

**Fichero:** `lib/detecciones.ts`

**Funcion principal:** `detectarFugasDeterministas(r: Reconocimiento): Fuga[]`. Lee campos del `Reconocimiento` y genera fugas deterministamente segun la rubrica de la seccion 1. Sin llamadas a modelos ni efectos secundarios.

**Comando de verificacion:** `npx tsc --noEmit` pasa. Ademas: `node scripts/test-detecciones.mjs` pasa un `Reconocimiento` con los datos reales de el negocio de demostracion y verifica que `canal-propio-ausente` y `comision-agregador` aparecen en la salida, y que `sin-https` no aparece (porque `https: true`).

**Dependencias:** ninguna. Puede implementarse en paralelo con ST-01.

---

### ST-03: el cliente de Haiku [RC]

**Fichero:** `lib/haiku.ts`

**Funcion principal:** `extraerConHaiku(url: string, html: string): Promise<Partial<Reconocimiento>>`. Llama a Haiku 4.5 con el system prompt cacheado de la seccion 5 y el HTML como entrada. Valida el JSON devuelto contra el schema de la seccion 6 con `ajv`. Lanza un error tipado si el schema falla. Devuelve el `Reconocimiento` parcial.

**Comando de verificacion:** `npx tsc --noEmit` pasa. Ademas: `node scripts/test-haiku.mjs <url>` llama a la funcion con el HTML real de el negocio de demostracion, imprime el JSON resultante y verifica que `usage.cache_read_input_tokens > 0` en la segunda llamada (confirmacion de cache activa).

**Dependencias:** ST-01 (para saber que campos rellena Haiku y cuales ya tiene el motor).

---

### ST-04: el cliente de Sonnet [RC]

**Fichero:** `lib/sonnet.ts`

**Funcion principal:** `cuantificarConSonnet(nombre: string, ciudad: string, reconocimiento: Reconocimiento, fugasDeterministas: Fuga[], fugasCandidatas: string[]): Promise<{ fugas: Fuga[]; cuantificacion: Cuantificacion[]; dossier: string }>`. Llama a Sonnet 5 con `thinking: {type: "adaptive"}`. Valida el JSON. Ejecuta los pasos de antialucinacion de la seccion 8 llamando a las funciones de ST-05. Implementa tres reintentos con fallback al informe parcial.

**Comando de verificacion:** `npx tsc --noEmit` pasa. Ademas: `node scripts/test-sonnet.mjs` con el `Reconocimiento` real de el negocio de demostracion. Verifica que: (a) `cuantificacion[n].constantes` contiene solo IDs de `CONSTANTES`, (b) `supuestos.length >= 1` en todas las cuantificaciones donde `eurosAnuales !== null`, (c) `eurosAnuales.maximo < 44100` en todos.

**Dependencias:** ST-02 (necesita las fugas deterministas), ST-05 (necesita las funciones de validacion).

---

### ST-05: la validacion antialucinacion [RC]

**Fichero:** `lib/validar.ts`

**Funciones:** `validarSchema(json: unknown, schema: object): void`, `validarConstantes(cuantificacion: Cuantificacion[]): void`, `validarRangos(cuantificacion: Cuantificacion[]): void`, `validarSupuestos(cuantificacion: Cuantificacion[]): void`, `validarEspecificidad(fugas: Fuga[]): void`. Cada una lanza un error tipado si la validacion falla. ST-04 las llama en orden antes de devolver el resultado.

**Comando de verificacion:** `npx tsc --noEmit` pasa. Ademas: `node scripts/test-validar.mjs` pasa una cuantificacion con la constante `"ticketMedioFiccion"` y verifica que `validarConstantes` lanza; pasa otra con `eurosAnuales: { minimo: 0, esperado: 0, maximo: 50000 }` y verifica que `validarRangos` lanza.

**Dependencias:** ninguna. Puede implementarse en paralelo con ST-01 y ST-02.

---

### ST-06: el ensamblador del Informe

**Fichero:** `lib/informe.ts`

**Funcion principal:** `ensamblarInforme(negocio: Informe["negocio"], reconocimiento: Reconocimiento, fugas: Fuga[], cuantificacion: Cuantificacion[], dossier: string): Informe`. Calcula `totalAnualEsperado` sumando los `eurosAnuales.esperado` no nulos. Calcula `fugasSinCifrar` contando los `eurosAnuales === null`. Ordena las fugas por impacto (las de `eurosAnuales.esperado` mayor primero; las cualitativas al final por gravedad). Devuelve el `Informe` completo listo para la capa de salida.

**Comando de verificacion:** `npx tsc --noEmit` pasa.

**Dependencias:** ST-04 (tipos de la salida del modelo).

---

### ST-07: test de integracion y verificacion de diversidad [RC]

**Fichero:** `scripts/verificar-diversidad.mjs`

**Que hace:** llama a `auditarNegocio` de ST-01 con los `Reconocimientos` precalentados y verificados de tres negocios distintos (el negocio de demostracion, Terra Mia y Golden Curry). Imprime las fugas de cada uno. Calcula la similitud de Jaccard entre los tres pares posibles. Falla con codigo de salida 1 si alguna similitud supera 0,8. Este script es exactamente el criterio de aceptacion del apartado 4.

**Comando de verificacion:** `node scripts/verificar-diversidad.mjs` sale con codigo 0 y muestra tres listas de fugas distintas con similitudes por debajo de 0,8.

**Dependencias:** ST-01, ST-02, ST-03, ST-04, ST-05, ST-06. Es la ultima tarea del frente cerebro.

**Ruta critica completa:** ST-05 en paralelo con ST-02 -> ST-04 (necesita ST-02 y ST-05) en paralelo con ST-03 -> ST-01 (necesita ST-03 y ST-04) -> ST-06 -> ST-07.

---

## 11. Lo que no se y quien lo decide

**Nico decide.**

1. **El horario de el negocio de demostracion como caso de calibracion.** El `horarioDeclarado` que devuelve su web tiene un formato concreto de schema.org. Si el motor de reconocimiento no lo parsea bien, la fuga `tienda-cerrada` no se dispara aunque la tienda cierre fuera de horario de delivery. Hay que verificarlo con el HTML real antes de considerar ST-07 terminado. Lo comprueba quien implemente ST-03.

2. **El umbral de similitud de Jaccard.** Se propone 0,8. Puede ser demasiado permisivo (cuatro de cinco fugas en comun sigue siendo mucho) o demasiado estricto (dos negocios con las mismas fugas graves pero contextos distintos fallan el test injustamente). Nico decide el umbral definitivo despues de ver los resultados de ST-07 con datos reales.

3. **Los rangos de pedidos por escenario.** Se proponen 50, 150 y 300 pedidos al mes. Son estimaciones del arquitecto sin fuente citable especifica. Un restaurante mediano de Malaga activo en plataformas puede hacer 300 pedidos al dia, no al mes. Nico o quien implemente ST-07 tienen que validar si los rangos son razonables para restauracion en Malaga, o ajustarlos con los datos del estudio de campo de 132 negocios.

4. **Precio de Sonnet 5.** Se usaron 2 $/M tokens de entrada y 10 $/M de salida. Si Anthropic cambia precios antes del 15-sep, el calculo de la seccion 9 cambia. La referencia para comprobar es `https://www.anthropic.com/pricing`.

5. **Que pasa si la pasada 1 (Haiku) devuelve un `Reconocimiento` con muchos campos null.** La propuesta es continuar con lo que hay y que Sonnet trabaje con la informacion parcial, declarando la limitacion en el dossier. Pero si `agregadores`, `pedidoPropio` y `catalogo` son todos null, el informe tiene poco valor. Hay que decidir si en ese caso la auditoria falla con un error explicito o si se entrega un informe parcial con advertencia. Lo decide Nico antes de implementar ST-01.

6. **El idioma del dossier.** El system prompt de Sonnet especifica espanol. Si la interfaz cambia a ingles (decision pendiente en el plan de construccion), el dossier cambia tambien y el system prompt de la seccion 5 cambia con el. Nico decide el idioma antes de que se implemente ST-04.

---

## Cambios que pido al contrato

No se piden cambios a `lib/tipos.ts` ni a `lib/calibracion.ts`. El plan encaja con los tipos existentes.

Una observacion que no es un cambio sino un aviso de implementacion: el tipo `Reconocimiento` incluye `capturas: { escritorio: string | null; movil: string | null }`. Las capturas son rutas de fichero del servidor. El despachador de ST-01 debe borrar el campo `capturas` del JSON antes de pasarlo a Sonnet, porque incluir rutas absolutas del servidor en un prompt expone la estructura interna de ficheros y no anade informacion util para la cuantificacion.
