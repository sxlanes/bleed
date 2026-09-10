# Plan maestro de Bleed

**Escrito por el arquitecto el 9-sep-2026, sobre los cuatro planes que redactaron los agentes
de Antigravity.** Este fichero manda sobre los otros cuatro: donde discrepen, gana este.

Quedan seis dias. El cierre es el 15-sep a las 23:00 EDT, que son las 05:00 del 16 en Madrid.

## Los cuatro planes

| Plan | Frente | Estado de la revision |
|---|---|---|
| `01-guion-y-entrega.md` | Guion del video, narracion en ingles y deck | Aceptado |
| `03-motor.md` | Motor de reconocimiento | Aceptado con dos correcciones |
| `04-cerebro.md` | Deteccion y cuantificacion | Aceptado, es el mas solido |
| `05-salida.md` | Informe, dossier y mockup | Aceptado como esqueleto, hay que engordarlo |

El contrato compartido es `lib/tipos.ts` y `lib/calibracion.ts`. Ningun frente los cambia, y
ninguno de los cuatro planes pidio cambiarlos, que es la senal de que el contrato estaba bien
puesto antes de repartir el trabajo.

---

## Revision del arquitecto: lo que se corrige antes de implementar

### 1. No se raspa Uber Eats ni Just Eat. Decision tomada, no abierta

El plan del motor propone abrir Playwright contra el agregador para saltarse su 403, y su
seccion 9 llega a plantear rotar proxies y disimular la geolocalizacion si bloquean por
acumulacion. **Eso no se construye.** Saltarse un bloqueo deliberado y disfrazar el origen
del trafico es incumplir las condiciones de uso de un tercero, y ademas envejece mal en un
producto que se vende como auditoria honesta. Que un dato sea util no lo hace legitimo.

**Lo que se hace en su lugar:**

- La comision no se raspa: se cita. `comisionAgregadorCompleto` ya esta calibrada al 25 %
  con su fuente y su rango, y el informe ensena la fuente.
- La comparacion de precios entre la web propia y el agregador **se hace a mano una sola vez
  para el video**, mirando ambas paginas como cualquier persona, y en el video se presenta
  como lo que es: una comprobacion manual del equipo, no una funcion del producto.
- El campo queda declarado en `noSeHaPodido` cuando no se puede obtener. Es exactamente para
  esto que existe ese campo.

**Lo que se gana admitiendolo:** el producto tiene una politica de recogida de datos escrita
y defendible, y eso es material para el deck, no una debilidad.

### 2. El limite de Vercel que el motor daba por insalvable no existe

La primera version del plan del motor afirmaba que las funciones de Vercel tienen un techo de
50 MB que impide empaquetar Chromium. **Es falso a dia de hoy:** las funciones sobre Fluid
Compute admiten hasta 5 GB de paquete, y la automatizacion de navegador es uno de los casos
que ese limite desbloqueo expresamente. La version final del plan ya no lo dice, pero queda
escrito aqui para que nadie reabra el debate el sabado.

**Consecuencia:** Playwright corre en la funcion, no hace falta ni VPS ni servicio externo de
capturas. El tiempo de ejecucion tampoco bloquea: el limite por defecto son 300 segundos y el
presupuesto del motor es de 60.

### 3. El nonce de la Store API es un caso real, pero no el caso general

El motor avisa de que versiones recientes de WooCommerce piden `X-WC-Store-API-Nonce` para
leer el catalogo. Es cierto y hay que manejarlo. **Pero el estudio de campo del 9-sep lo
acota:** de las 132 webs auditadas, **diez devolvieron el catalogo entero sin nonce ninguno**,
con una peticion pelada. Asi que el camino barato funciona en la mayoria de los casos que nos
importan, y el nonce es la rama de degradacion, no la principal. Se implementa el camino
barato primero y se mide cuantas veces falla antes de escribir la rama cara.

### 4. El plan del motor hay que reescribirlo para que se pueda leer

Su seccion 9 tiene diecisiete frases de mas de sesenta palabras y es, sencillamente,
ilegible. **El fondo es bueno y se conserva:** las tres incognitas que levanta son reales.
La forma se rehace. Un plan que nadie puede leer el sabado a las once de la noche no es un
plan.

### 5. El plan de la salida esta completo pero flaco

Cumple sus once secciones en 1.300 palabras, frente a las 7.000 del cerebro. Tres cosas suyas
son buenas y se conservan tal cual: el registro secuencial durante el minuto de espera, que
convierte una barra de progreso en prueba de trabajo; imprimir el dossier con `@media print`
en vez de montar un generador de PDF; y ensenar el catalogo bloqueado con una trama en vez de
inventar platos falsos cuando la API esta cerrada. Lo que falta es el detalle de maquetacion,
y se pide en una segunda pasada antes del sabado.

---

## Las decisiones que son de Nico, consolidadas

Los cuatro planes escalaron dieciseis decisiones. Doce las resuelve el arquitecto y estan
resueltas arriba o en los propios planes. **Estas cuatro son suyas y bloquean trabajo:**

1. **El idioma.** La interfaz esta escrita en espanol, el guion y el deck en ingles. Lo piden
   dos planes por separado porque afecta al frontend y al prompt del dossier a la vez.
   Bloquea: el cliente de Sonnet y toda la maquetacion del informe.
2. **El dominio.** `bleed.io` esta libre y cuesta unos treinta euros. Sin el, la entrega va
   con un subdominio de Vercel, que funciona igual pero viste menos. Bloquea: nada tecnico,
   pero cuanto antes se compre antes propaga.
3. **El despliegue en produccion.** Sigue sin hacerse porque es produccion y no se toca sin su
   visto bueno. Bloquea: el criterio de aceptacion del apartado 2, que exige una URL publica.
4. **El limite de la cuenta de Anthropic.** Si el jurado audita webs en vivo entre el 16 y el
   20, hay que saber que limite de tasa tiene la cuenta. Bloquea: la decision de si la demo en
   vivo se ofrece al jurado o se entrega precalentada.

---

## El calendario, con la ruta critica

Diecisiete subtareas salen de los cuatro planes. El orden manda esto:

| Dia | Que se cierra | Frentes vivos |
|---|---|---|
| **Jue 10** | El camino vertical entero, feo pero funcionando: motor ST-01 a ST-04, cerebro ST-01 y ST-03. Una URL entra y sale un JSON con fugas. | motor y cerebro |
| **Vie 11** | Cerebro ST-04, ST-05 y ST-06: la cuantificacion con supuestos y la validacion antialucinacion. Motor ST-05, las capturas. | cerebro y motor |
| **Sab 12** | La salida entera y la pasada de diseno. Es el dia que separa el top 100 del monton. | salida |
| **Dom 13** | Cerebro ST-07, la prueba de diversidad en tres negocios. README con GIF, deck. **Congelacion de funcionalidades y primera entrega completa.** | ninguno nuevo |
| **Lun 14** | Grabar el video. Dia entero, siempre cuesta el triple. | ninguno |
| **Mar 15** | Colchon y pulido. Devpost deja editar hasta el cierre. | ninguno |

**La ruta critica no es el motor, es el cerebro.** El motor es trabajo conocido y ya hay un
prototipo que funciona sobre 132 webs reales. El cerebro es donde se juegan los 25 puntos de
Technical Implementation y donde esta todo lo que no se ha probado nunca: los dos prompts, la
cache, el esquema estructurado y la validacion. **Si algo se cae por tiempo, se cae del motor,
nunca del cerebro.**

**El orden de sacrificio, decidido ahora para no discutirlo el domingo:**

1. La comparacion de precios con el agregador. Ya esta fuera por la decision 1.
2. La pantalla de mockup. Es la ultima pantalla del alcance y la mas prescindible.
3. Las capturas moviles. Basta la de escritorio.
4. **Nunca se cae:** la cuantificacion con supuestos a la vista. Es el producto.

---

## Como se sigue trabajando

Cuatro worktrees en `/Users/nico/orca/workspaces/bleed/`, uno por frente, con su contrato
`TASK.md`. Los agentes son de Antigravity.

**Dos trampas de `agy` verificadas hoy, para no volver a pagarlas:**

- **Ejecutar `agy` en segundo plano lo mata en silencio.** Devuelve codigo cero y deja el log
  vacio. Seis lanzamientos se perdieron asi. En primer plano funciona a la primera.
- **`--effort` no vale con los modelos Claude** de Antigravity y falla tambien devolviendo
  codigo cero. Solo se usa con `gemini-3.1-pro-high`.
- **La verificacion de un worker es que su fichero existe y tiene contenido**, jamas que el
  proceso termino bien.

---

## Decisiones de Nico — 10-sep, mañana

✅ **Idioma:** todo en inglés (interfaz, dossier, prompts)
✅ **Dominio:** `bleed.io` en Namecheap
✅ **API Anthropic:** free tier (build), después upgradeable
⏳ **Despliegue Vercel:** pendiente
