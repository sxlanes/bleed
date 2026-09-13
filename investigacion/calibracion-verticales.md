# Calibracion de la cuantificacion — verticales no-restaurante

Investigado el 13-sep-2026. Este es el rastro de auditoria de `lib/calibracion-verticales.ts`:
para cada una de las 24 constantes (4 por vertical x 6 verticales) dice el valor elegido, la
fuente, la URL, la fecha, que mas se encontro y por que se descarto. Un jurado con un
portatil deberia poder repetir cada busqueda y llegar a la misma conclusion.

Regla seguida en todo el documento: cuando existia un rango publicado, se cogio el extremo
conservador (el que un dueno no puede tumbar a la baja). Cuando no existia fuente publicada,
la constante se marca `estimacionPropia: true`, con `fuente: "Bleed, working estimate"` y
`url: ""` — nunca se inventa una URL.

Todas las URLs no vacias se verificaron con `curl` (cabeceras de navegador real) el
13-sep-2026 y devuelven 200.

---

## Retail

### `valorTransaccion` — ticketMedioRetail: 217 € (min 157, max 250)
- **Fuente:** Flat 101, "Estudio de Conversion eCommerce" (informe anual), tal como lo cubre
  Marketing4eCommerce.
- **URL:** https://marketing4ecommerce.net/el-valor-medio-del-pedido-en-ecommerce-es-de-217-e-un-10-mas-que-hace-un-ano/
- **Fecha del dato:** 2023-12-31.
- **Que mas se encontro:** la misma pagina, viva, muestra ahora la ola mas reciente del
  mismo estudio con un valor medio de pedido de 250 € (dato 2025, un +15% interanual), y
  otro articulo del mismo medio citaba 221 € (+10,65%) para una fecha intermedia. Se
  descartaron ambos por ser mas altos; se uso el dato mas antiguo y bajo de la misma serie
  para quedarse conservador.
- **Por que se descarto lo demas:** un dato de "473,86 €" que circula (ticket medio de
  compras online en 2025) proviene de operaciones que pasaron por procesos de reclamacion y
  mediacion — no representa una compra tipica, asi que se descarto por sesgado al alza.
- **Advertencia en el codigo:** Flat 101 vende consultoria de conversion y su muestra son
  tiendas ya clientes de su propio ecosistema, asi que es un benchmark de sector, no el
  numero de una tienda pequena cualquiera.

### `comisionPlataforma` — comisionAmazonRetail: 8 % (min 8, max 15)
- **Fuente:** Amazon, pagina oficial de precios para vendedores en Espana.
- **URL:** https://sell.amazon.es/en/precios
- **Fecha:** 2026-09-13 (pagina viva, sin fecha propia publicada; se usa la fecha de
  consulta).
- **Que mas se encontro:** la mayoria de categorias caen entre 8% y 15%; electronica e
  informatica estan en la banda baja (7-8%), libros y "todo lo demas" en el 15%. Etsy cobra
  un 6,5% fijo de comision por transaccion (mas 15% adicional en anuncios "offsite" solo
  para quien factura menos de 10.000 $/ano).
- **Por que se eligio el extremo bajo:** la instruccion del proyecto es ser conservador; se
  usa 8% aunque muchas categorias reales pagan 15%, y se dice explicitamente en la
  advertencia para no esconder que la mayoria paga mas.

### `transaccionesPorPeriodo` — ventasDiaRetail: 8/dia (min 2, max 30) — **estimacion propia**
- No se encontro ninguna fuente publicada que mida cuantas ventas online hace al dia una
  tienda pequena tipica (los datos publicos son agregados nacionales de todo el sector, no
  de un negocio individual). Marcado `estimacionPropia`.

### `desvioADirecto` — desvioDirectoRetail: 25 % (min 10, max 40) — **estimacion propia**
- **Que se encontro y se descarto:** varios estudios sobre "comprar directo a la marca en
  vez de en un marketplace" (ChannelEngine Marketplace Shopping Behavior Report 2025: 63%
  prefiere marketplace; Astound Commerce: 55% prefiere directo; PYMNTS: 43% de la Gen Z
  prefiere directo; otro estudio citado sin nombre: 72% preferiria comprar directo "si supiera
  que el 100% del beneficio va al negocio"). Los numeros se contradicen entre si segun como
  se formula la pregunta, y todos describen marcas conocidas eligiendo su propia web D2C
  frente a un gran retailer — no una tienda pequena compitiendo con un anuncio en Amazon o
  Etsy. Usar cualquiera de ellos habria sido elegir el que mas conviene al informe, asi que
  se descartaron todos y se marco como estimacion propia.

---

## Lodging

### `valorTransaccion` — valorReservaAlojamiento: 395 € (min 340, max 494)
- **Metodo:** ADR (tarifa media diaria) x estancia media, tal como pide la tarea.
- **ADR:** 127,7 € — INE, Coyuntura Turistica Hotelera, ano completo 2025.
  https://www.ine.es/dyngs/Prensa/CTH1225.htm (fecha del dato: 2025-12-31).
- **Estancia media:** 3,09 noches — INE, encuesta de ocupacion hotelera 2025, tal como lo
  recoge soloagentes.com. https://www.soloagentes.com/ine-pernoctaciones-hoteleras-2025-datos-definitivos/
  (articulo publicado 12-sep-2026, citando datos definitivos de INE para 2025).
- **Calculo:** 127,7 x 3,09 = 394,66 € ≈ 395 €.
- **Que mas se encontro y se descarto:** un barometro privado (STR / Cushman & Wakefield)
  cifra el ADR 2025 en 166,1 €, un 30% mas alto que el dato oficial del INE. Se prefirio el
  dato del INE por ser la fuente neutral/oficial, no una consultora del sector hotelero con
  intereses en el discurso de precios.
- **Rango minimo-maximo:** se construyo con la variacion estacional del ADR observada en
  los datos mensuales del INE (julio 146,5 €, agosto 155,7 €, resto del ano mas bajo,
  aproximando una banda de 110-160 €/noche) multiplicada por la misma estancia media.

### `comisionPlataforma` — comisionBookingAlojamiento: 15 % (min 10, max 25)
- **Fuente:** Wise (fintech neutral, sin intereses en el sector hotelero), guia sobre la
  comision de Booking.com.
- **URL:** https://wise.com/us/blog/booking-com-commission-percentage
- **Fecha:** 2026-06-29.
- **Por que Wise y no un vendedor de software hotelero:** varias fuentes secundarias
  (Lodgify, Guesty, Houst, GetDirecto) publican el mismo rango 10-25% con base ~15%, pero
  todas son empresas que venden software o servicios a hoteles para competir precisamente
  con las OTAs — un conflicto de interes igual al de Qamarero en el fichero de restaurantes.
  Wise no vende nada al sector hotelero, asi que se prefirio como fuente neutral.
- **Nota:** Booking.com no publica una tarifa unica; cada hotel la negocia en su contrato
  (esto lo dice la propia fuente). Airbnb cobra ahora un 15,5% fijo de comision al
  anfitrion desde diciembre 2025 (antes existia un modelo de comision partida, ~3% al
  anfitrion + 14-16% al huesped, para hoteles conectados via PMS).

### `transaccionesPorPeriodo` — reservasDiaAlojamiento: 4/dia (min 1, max 15) — **estimacion propia**
- No existe una fuente publica que mida reservas diarias de un hotel o casa rural pequeno
  concreto (los datos del INE son agregados nacionales de pernoctaciones, no de reservas
  por establecimiento).

### `desvioADirecto` — desvioDirectoAlojamiento: 51 % (min 51, max 65)
- **Fuente:** Koddi, estudio controlado de 2015, tal como lo cita Hotel Speak.
- **URL:** https://www.hotelspeak.com/2020/01/more-than-commission-the-6-hidden-costs-of-ota-bookings/
- **Fecha del dato:** 2015 (mes exacto no publicado).
- **Cifras del estudio:** a precio igual, 65% de los huespedes reservaria directo con el
  hotel; incluso con el hotel un 10% mas caro que la OTA, un 51% seguiria reservando
  directo. Se uso el 51% (el mas conservador de los dos).
- **Limitaciones honestas:** es un estudio de Estados Unidos, de 2015 (once anos), y no se
  pudo localizar el informe original de Koddi — solo su cita en cobertura secundaria del
  sector hotelero (Hotel Speak, 2020; tambien aparece citado en Simpleview y Revenue Hub con
  los mismos numeros). No existe un equivalente espanol o mas reciente publicado. Se decidio
  usarlo igualmente, con la advertencia completa en pantalla, porque la tarea señala
  explicitamente que "para lodging existe investigacion publicada real sobre reserva
  directa" y esta es la que se encontro — el mismo patron que el NCR Voyix de EEUU ya usado
  para el `preferenciaCanalDirecto` de restaurantes.
- **Dato de contexto que se descarto como sustituto (no es la misma pregunta):**
  Phocuswright: en Europa las OTAs generan el 69% de las reservas de hotel online frente al
  31% directo. Esto mide cuota de mercado actual, no "cuantos cambiarian si el canal propio
  funcionara" (que es lo que pide la constante), asi que no se uso como el numero principal.

---

## Appointment

### `valorTransaccion` — precioCitaConsulta: 25 € (min 17, max 55)
- **Fuente:** Selectra, guia de precios de sanidad privada en Espana.
- **URL:** https://selectra.es/seguros/seguros-salud/precio-consulta-privada
- **Fecha:** actualizado 08-05-2025.
- **Cifras:** consulta de medicina general entre 17-50 € (Madrid) y 25-55 € (Sevilla) segun
  ciudad; primera visita con especialista 60-120 € de media (pediatria 50-90 €, psiquiatria
  90-180 €).
- **Por que este numero y no una peluqueria o un dentista:** el vertical `appointment`
  encabeza su lista de `schemaTypes` con Dentist, MedicalClinic y Physician antes que los
  salones de belleza, asi que se prioriza un dato medico. Se descarto un estudio de FACUA
  (asociacion de consumidores, neutral) sobre limpiezas dentales — tarifa media 49,80 €,
  con maximo en Valladolid (69,72 €) y minimo en Badajoz (41,50 €) — por tener 11 anos
  (encuesta de 2014); se cita igualmente en la advertencia como referencia de contexto.
  Tambien se descarto un articulo sobre precios de peluqueria (diariodepontevedra.es,
  19-40 €) porque la URL devolvia 403 al verificarla.
- **Por que el extremo bajo:** se usa la consulta general (la mas barata de las opciones
  medicas) para que el numero no sobreestime lo que cuesta una cita en un salon de belleza.

### `comisionPlataforma` — comisionTreatwellCita: 25 % (fijo)
- **Fuente:** Treatwell, pagina oficial de precios para socios.
- **URL:** https://www.treatwell.es/partners/precios/
- **Fecha:** 2026-09-13 (pagina viva, sin fecha propia).
- **Cifras exactas de la pagina:** "25% de comision por cada nuevo cliente" / "0% de
  comision por reservas repetidas" / +2% si el cliente paga online por adelantado.
- **Que mas se encontro y se descarto:**
  - **Doctoralia:** modelo de suscripcion mensual fija, no cobra comision por cita — no
    convierte limpiamente a un porcentaje, asi que no se uso como fuente principal (se
    menciona en la advertencia).
  - **Fresha:** varias fuentes secundarias citan un 20% sobre la primera cita de un cliente
    nuevo (minimo 6 $), pero al verificar una de ellas (rzrv.ai, actualizada julio 2026) la
    propia pagina de Fresha se contradice entre su web de precios ("gratis") y su centro de
    ayuda (menciona una tarifa variable) — el articulo explicitamente dice que no pudo
    verificar el numero en la pagina viva de Fresha. Se descarto por esa razon y se uso
    Treatwell, cuya pagina oficial si confirma la cifra sin ambiguedad.
- **Advertencia:** el 25% solo aplica a la primera reserva de un cliente nuevo captado por
  el marketplace; las visitas recurrentes no pagan comision.

### `transaccionesPorPeriodo` — citasSemanaCita: 25/semana (min 8, max 60) — **estimacion propia**
- No existe fuente publicada para el volumen de citas semanales de una clinica o salon
  pequeno concreto.

### `desvioADirecto` — desvioDirectoCita: 35 % (min 20, max 50) — **estimacion propia**
- No se encontro investigacion publicada sobre cuantos pacientes o clientes de salon
  reservarian directo en vez de via marketplace.

---

## Trade

### `valorTransaccion` — precioMedioTrabajoOficio: 175 € (min 120, max 500)
- **Fuente:** Habitissimo, guia de precios de fontaneros en Espana (su propia cifra
  destacada de "Precio medio").
- **URL:** https://www.habitissimo.es/presupuestos/fontaneros
- **Fecha:** modificada 10-06-2026 (`dateModified` en los datos estructurados de la
  pagina).
- **Cifras encontradas en la misma pagina:** precio medio nacional 175 €; en Madrid
  especificamente 500 €; reparaciones simples 70-200 €; instalaciones completas hasta
  2.000 €; tarifa por hora 20-80 €/hora segun ciudad (25-40 €/hora lo mas tipico).
- **Por que 175 € y no 500 €:** 175 € es la cifra nacional que la propia pagina destaca
  como "precio medio"; 500 € es especifico de Madrid, un mercado caro. Se uso el numero mas
  conservador y mas amplio geograficamente.

### `comisionPlataforma` — comisionLeadOficio: 15 % (min 8, max 25) — **estimacion propia,
  derivada de datos publicados**
- Habitissimo y Cronoshare, los dos marketplaces de leads dominantes para oficios en
  Espana, **no cobran un porcentaje de la obra**: cobran por contacto/lead.
  - Habitissimo: modelo "pay for performance", sin cuota fija obligatoria, pero fuentes
    describen una suscripcion tipica de ~60 €/mes mas 200-400 €/mes en leads variables,
    total ~3.000-5.500 €/ano para un profesional activo
    (https://www.habitissimo.es/presupuestos/fontaneros y contexto de mercado).
  - Cronoshare: cobra por cada contacto desbloqueado ("cronos"), con un precio dinamico
    segun presupuesto estimado y un "indice CS"; del total, 55% es comision (recuperable via
    garantia Cronoshare si no hay acuerdo) y 45% son gastos de gestion (no recuperables).
    https://soporte.cronoshare.com/hc/es/articles/360019653700-Precios-de-las-solicitudes
- **Por que se convirtio a un porcentaje igualmente:** el resto del motor de Bleed necesita
  una comision expresada en % para calcular la fuga en euros de forma comparable entre
  verticales. Se estimo un porcentaje equivalente asumiendo que un lead se convierte en obra
  pagada aproximadamente 1 de cada 3-4 veces — una tasa de conversion que **nadie publica**.
  Por eso, aunque el precio del lead en si esta bien documentado, el porcentaje final que
  aparece en el codigo esta marcado `estimacionPropia: true` y la advertencia lo explica
  con las dos fuentes reales citadas dentro del texto.

### `transaccionesPorPeriodo` — trabajosSemanaOficio: 8/semana (min 3, max 20) — **estimacion propia**
- No existe fuente publicada sobre el volumen semanal de trabajos de un autonomo de
  fontaneria/electricidad concreto.

### `desvioADirecto` — desvioDirectoOficio: 40 % (min 20, max 55) — **estimacion propia**
- No se encontro investigacion publicada sobre cuantos clientes de un oficio llamarian
  directo en vez de via Habitissimo/Cronoshare.

---

## Professional

### `valorTransaccion` — valorClienteNuevoProfesional: 60 € (min 60, max 150)
- **Fuente:** Trustlocal, precios agregados de servicios legales en Espana.
- **URL:** https://trustlocal.es/coste/abogado-coste/
- **Fecha:** actualizada 03-09-2026 ("La primera consulta suele costar entre 60 € y 150 €").
- **Que se descarto:** la literatura sobre "customer lifetime value" de un despacho de
  abogados (Attorney Marketing Center, Clio, Bloomberg Law) habla de cifras de 3.000 € a
  150.000 € segun el tipo de practica, pero son ejemplos anecdoticos de mercado
  estadounidense sin cifra unica citable ni aplicable a un despacho pequeno espanol. Se
  prefirio una cifra observable y conservadora — el precio de la primera consulta — en vez
  de estimar un valor de vida del cliente que nadie puede verificar.
- **Advertencia:** esto es solo la primera reunion, no el valor real de un cliente a lo
  largo del tiempo (normalmente mucho mayor); ademas Trustlocal agrega presupuestos
  autoinformados de su propio directorio de leads, no es una encuesta auditada.

### `comisionPlataforma` — comisionMaltProfesional: 10 % (min 5, max 10)
- **Fuente:** Trabajo y Personal, guia sobre las comisiones de Malt.
- **URL:** https://trabajoypersonal.com/malt-espana-plataforma-freelance-europea/
- **Fecha:** 04-08-2025.
- **Cifras:** "Malt cobra 10% los primeros 3 meses de relacion con cada cliente, y 5% a
  partir del cuarto mes."
- **Por que se uso el 10% y no el 5%:** la constante representa la comision aplicable a un
  cliente **nuevo** (que es justo lo que mide `valorTransaccion` en este vertical), y el 10%
  es la tarifa que se aplica durante esos primeros meses.
- **Que se descarto:** se intento verificar directamente en help.malt.com y malt.es/c/pricing
  (las paginas oficiales), pero ambas devuelven 403 a peticiones automatizadas — no se pudo
  confirmar por esa via, asi que se uso una fuente secundaria que si resuelve y cita el
  mismo texto literal de la pagina de ayuda de Malt. Idealista, Fotocasa y los directorios
  legales/contables tipicos cobran suscripcion plana, no porcentaje, y no se pudo convertir
  limpiamente — se menciona en la advertencia en vez de forzar una cifra.
- **Dato de contexto (no usado como cifra principal):** el coste por lead en Google Ads
  para abogados en Espana ronda 6-30 € por consulta segun casos reales citados por agencias
  de marketing (arimetrics, bierzoseo); no se uso porque mezclar coste de adquisicion
  publicitaria con comision de un directorio habria sido comparar dos cosas distintas.

### `transaccionesPorPeriodo` — clientesMesProfesional: 4/mes (min 1, max 15) — **estimacion propia**
- No existe fuente publicada sobre cuantos clientes nuevos capta al mes un despacho
  pequeno concreto.

### `desvioADirecto` — desvioDirectoProfesional: 30 % (min 15, max 45) — **estimacion propia**
- No se encontro investigacion publicada sobre cuantos clientes de un profesional
  contactarian directo en vez de via un directorio.

---

## Generic

Los cuatro numeros de este vertical son, por definicion, para cuando Bleed **no sabe** a
que se dedica el negocio — no existe ni puede existir una fuente publicada sobre "la
transaccion media de cualquier negocio". Los cuatro estan marcados `estimacionPropia: true`.

- **`valorTransaccion` (40 €, min 20, max 80):** deliberadamente bajo; los verticales ya
  calibrados van desde 25 € (una cita) hasta 395 € (una reserva de hotel), asi que 40 € es
  un piso conservador cuando no hay pista de que vende el sitio.
- **`comisionPlataforma` (15 %, min 8, max 25):** no es una cifra independiente; es el
  rango que resulta de mirar a ojo las comisiones ya sourceadas arriba (Amazon 8-15%,
  Booking.com 10-25%, Treatwell 25%, Malt 5-10%). Se documenta como derivada, no como una
  fuente publicada propia para "cualquier negocio".
- **`transaccionesPorPeriodo` (15/mes, min 5, max 50)** y **`desvioADirecto` (25%, min 10,
  max 40):** sin fuente posible dado que el rubro es desconocido; son el primer numero que
  el dueno deberia sustituir en cuanto Bleed identifique su negocio real.

---

## Resumen de verificacion de URLs (13-sep-2026, `curl` con cabeceras de navegador)

| URL | Estado |
|---|---|
| marketing4ecommerce.net/.../217-e-un-10-mas-que-hace-un-ano | 200 |
| sell.amazon.es/en/precios | 200 |
| ine.es/dyngs/Prensa/CTH1225.htm | 200 |
| soloagentes.com/ine-pernoctaciones-hoteleras-2025-datos-definitivos | 200 |
| wise.com/us/blog/booking-com-commission-percentage | 200 |
| hotelspeak.com/.../more-than-commission-the-6-hidden-costs-of-ota-bookings | 200 |
| selectra.es/seguros/seguros-salud/precio-consulta-privada | 200 |
| treatwell.es/partners/precios | 200 |
| habitissimo.es/presupuestos/fontaneros | 200 |
| soporte.cronoshare.com/.../Precios-de-las-solicitudes | 200 |
| trustlocal.es/coste/abogado-coste | 200 |
| trabajoypersonal.com/malt-espana-plataforma-freelance-europea | 200 |

URLs descartadas porque no resolvian o no se pudieron verificar de forma fiable:
`help.malt.com/.../Los-gastos-de-servicios-de-Malt` (403), `www.malt.es/c/pricing` (403),
`www.diariodepontevedra.es/.../cuanto-cobra-peluquero-profesional-espana-2025` (403). Ninguna
se uso como `url` final en el codigo.
