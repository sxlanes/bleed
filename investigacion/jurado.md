# El jurado, y Bleed puntuado como lo puntuarian ellos

Fuente: la pagina oficial del hackathon en Devpost, leida el 11-sep-2026.
https://ai-builders-hackathon-2026.devpost.com/

## Composicion del panel: 19 jueces

Lo importante no son los nombres, es el reparto de perfiles, porque determina que
mirara cada uno.

| Perfil | Cuantos | Empresas | Que puntuan de verdad |
|---|---|---|---|
| Product Manager | 7 | Microsoft, Fidelity, Omnissa, CareerPlug, TechCareers, Global Chamber | Problem Solving & Impact (25 %) y UX (15 %). **El 40 % de la nota.** |
| Ingenieria de plataforma | 6 | Apple, PayPal, Visa, Microsoft, ServiceNow, Pointer | Technical Implementation (25 %) |
| Especialistas en IA | 3 | IBM (Sr AI Solution Architect), NYU Tandon, Themachinist.org | Technical Implementation, y **son los que preguntan donde esta la IA** |
| Cloud y seguridad | 2 | AWS (Solutions Architect), Corteva (Sr Security Analyst) | Arquitectura, y la politica de datos |
| Fundador | 1 | GraphicNote | Si esto es un producto o una demo |

Tres consecuencias que cambian la estrategia:

1. **El panel esta dominado por producto, no por ingenieria.** Siete PMs. Su pregunta
   no es "que elegante es tu codigo", es "quien es el usuario, que gana, y como lo se".
2. **Hay un ingeniero de rendimiento (ServiceNow) y un analista de seguridad (Corteva).**
   Uno mirara los tiempos de carga de nuestra propia web. El otro preguntara con que
   permiso rastreamos webs ajenas. Para lo segundo tenemos respuesta escrita; para lo
   primero, hay que medirlo.
3. **Tres especialistas en IA puntuan el 25 % tecnico.** Es exactamente el punto flaco
   conocido de Bleed: hoy la IA solo redacta el dossier. Un Sr AI Solution Architect de
   IBM lo va a ver en treinta segundos.

El premio gordo se llama **Best SaaS Product** (4.000 $). No "mejor demo": producto.

## La rubrica, literal

| Criterio | Peso | Que dice la convocatoria |
|---|---|---|
| Technical Implementation | 25 % | Calidad de la ejecucion tecnica, incluido el diseno e implementacion de **modelos de IA, agentes, flujos de trabajo y arquitectura de sistema** |
| Problem Solving & Impact | 25 % | Como resuelve la necesidad del usuario, aplicabilidad practica, impacto real y **la claridad con la que se demuestran beneficios y resultados** |
| Innovation & Creativity | 20 % | Originalidad de la idea y **como de creativamente se aplica la IA** |
| User Experience & Design | 15 % | Interfaz, facilidad de uso, flujo, **accesibilidad** y acabado |
| Presentation & Demo | 15 % | Como de bien se comunica la vision, la solucion y las decisiones tecnicas |

## Entregables obligatorios y su estado

| Requisito | Estado a 11-sep |
|---|---|
| Formulario de Devpost | **NO** |
| Producto funcionando | SI, `bleed-omega.vercel.app` |
| Codigo fuente publico y documentado | SI, `github.com/sxlanes/bleed` |
| Video de demo, maximo 5 min | **NO** |
| Deck, maximo 10 diapositivas | **NO** |

Tres de los cinco entregables no existen. Cierre: **15-sep, 23:00 EDT** (05:00 del 16 en Madrid).

---

## Puntuacion simulada

Puntuo de 0 a 10 por criterio, desde cada perfil, y pondero. Es una estimacion
conservadora hecha contra lo que hay desplegado hoy, no contra lo que esta planeado.

### Innovation & Creativity — 6,5 / 10 (peso 20 %)

- **A favor:** el angulo es fresco. No es otro chatbot. Poner cifra en euros a la fuga
  de una web local, con el supuesto a la vista, es una idea que se entiende en una frase.
  El contador de perdida por sesion en la portada es memorable.
- **En contra:** el especialista en IA vera una herramienta de auditoria, y las
  herramientas de auditoria existen. La originalidad esta en la cuantificacion calibrada,
  no en la IA. Y la convocatoria pregunta explicitamente por **la aplicacion creativa de la IA**.
- PM: 8. Ingenieria: 7. **Especialista IA: 5.**

### Technical Implementation — 6,0 / 10 (peso 25 %)

- **A favor:** aplicacion Next.js real, desplegada, tipada, build limpio. Reconocimiento
  real por HTTP. Estudio de campo propio sobre 132 webs. Cuantificacion cableada a
  constantes con fuente y fecha.
- **En contra, y duele:** la rubrica pide **modelos, agentes, flujos y arquitectura**.
  Bleed hace **una** llamada a Gemini para redactar prosa. No hay agentes, ni flujo
  multi-modelo, ni salidas estructuradas, ni cache de prompt. El plan maestro describia
  una arquitectura de dos modelos con rubrica cacheada; no esta construida.
- **En contra, tecnico:** el motor no tiene capa de navegador. Una web hecha con React
  sin renderizado en servidor devuelve HTML vacio y el informe sale hueco. El ingeniero
  de Apple o Visa probara justo eso.
- **En contra, rendimiento:** la auditoria en vivo bloquea el componente de servidor.
  No hay streaming. El ingeniero de rendimiento de ServiceNow lo notara.
- Ingenieria: 6. **Especialista IA: 4.** Cloud: 6.

### Problem Solving & Impact — 7,5 / 10 (peso 25 %)

- **A favor, y es lo mas fuerte que tenemos:** el problema es real y esta medido con
  trabajo de campo propio. 132 webs auditadas una a una. El 76,4 % de los restaurantes
  espanoles que reparten dependen de un agregador. Cada cifra lleva su fuente, y las que
  no tienen fuente publicada van marcadas "team estimate" a la vista. Esa honestidad es
  rara y los PMs la premian.
- **En contra:** cero validacion con usuarios. Ningun dueno de restaurante ha visto esto.
  Siete PMs van a preguntar "has hablado con uno?" y la respuesta hoy es no.
- **En contra:** no hay modelo de negocio articulado. El premio se llama Best SaaS Product
  y no decimos que cuesta ni quien paga.
- PM: 7,5. Fundador: 7.

### User Experience & Design — 7,5 / 10 (peso 15 %)

- **A favor:** la portada es genuinamente distintiva. Campo rojo, Anton condensada,
  contador de sesion. No parece salida de una plantilla, que es justo lo que va a pasarle
  a la mayoria de las entregas. El informe es coherente con ella y los supuestos se ven
  sin interaccion.
- **En contra:** solo dos pantallas. La accesibilidad esta en la rubrica **por escrito**
  y no se ha auditado: ni contraste medido en el informe, ni navegacion por teclado, ni
  lectores de pantalla. Tampoco se ha comprobado en movil.
- PM: 7,5. Ingenieria: 7.

### Presentation & Demo — 0 / 10 (peso 15 %)

No hay video. No hay deck. No hay entrega en Devpost. **Es un cero, y ademas sin el
formulario la entrega directamente no existe.**

### Total ponderado

| Criterio | Peso | Nota | Aporta |
|---|---|---|---|
| Technical Implementation | 25 % | 6,0 | 1,50 |
| Problem Solving & Impact | 25 % | 7,5 | 1,88 |
| Innovation & Creativity | 20 % | 6,5 | 1,30 |
| User Experience & Design | 15 % | 7,5 | 1,13 |
| Presentation & Demo | 15 % | 0,0 | 0,00 |
| **TOTAL** | | | **5,81 / 10** |

**Con esto no se gana.** Y no por el producto: por lo que falta alrededor.

---

## Donde estan los puntos, ordenados por retorno

1. **Entregar (Presentation, 15 % a cero).** Video de 5 minutos, deck de 10 y formulario.
   Pasar de 0 a 8 son **+1,20 puntos**, mas que cualquier otra cosa que podamos hacer.
   Y sin formulario no hay concurso. El guion ya esta escrito en `planes/01-guion-y-entrega.md`.
2. **Meter IA de verdad donde se juzga (Technical, 25 %).** Los tres especialistas en IA
   van a buscar agentes, flujos y arquitectura. Convertir la deteccion y la priorizacion
   de fugas en una pasada de modelo con salida estructurada, y dejar el determinismo solo
   para la medicion, sube de 6,0 a 8,0: **+0,50**. Es lo que ya describe `planes/04-cerebro.md`.
3. **Capa de navegador en el motor.** Que una web moderna no devuelva un informe hueco.
   Es la prueba que hara un ingeniero de plataforma. Dentro del +0,50 anterior.
4. **Accesibilidad medida (UX, 15 %).** Esta escrita en la rubrica y hoy no la miramos.
   Contraste, foco visible, teclado, movil. De 7,5 a 9: **+0,23**.
5. **Una frase de negocio y una validacion (Impact, 25 %).** Ensenarselo a un solo dueno
   de restaurante y grabar su reaccion, aunque sean 20 segundos en el video, contesta la
   pregunta que van a hacer los siete PMs. De 7,5 a 8,5: **+0,25**.

Sumadas: **5,81 → 8,0**. Eso si compite.

## Lo que no se

- Cuantos proyectos compiten y su nivel. El premio se reparte entre 4 categorias, asi que
  hay mas de una via de premio.
- Si los jueces ejecutan el codigo o solo ven el video. La practica habitual es lo segundo,
  lo que refuerza la prioridad 1.
- Si "Best SaaS Product" exige modelo de precios explicito. La convocatoria no lo dice,
  pero el nombre del premio empuja a decirlo igualmente.
