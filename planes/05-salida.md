# Plan de la salida, informe, dossier y mockup

## 1. El mapa de pantallas

El alcance esta cerrado a una entrada y un resultado. Por lo tanto, solo existen dos pantallas bajo `app/`:

1. `/` (Entrada): `app/page.tsx`. Ya construida. Recibe la URL del negocio y lanza el proceso.
2. `/informe` (Resultado): `app/informe/page.tsx`. Engloba toda la experiencia de salida. Se encarga de mostrar la espera activa mientras el motor trabaja, y una vez finalizado, renderiza en una sola vista vertical el informe de fugas, el dossier descargable y la pantalla unica de mockup.

## 2. La espera

El motor tarda cerca de un minuto. Durante ese minuto, el usuario ve la misma pagina `/informe` pero en su estado de carga, disenada para combatir el abandono sin usar barras de porcentaje falsas.

- Fondo: `--tinta` (se mantiene el fondo unico del proyecto).
- Que se ve: Una cabecera que indica "Auditando..." y una consola de texto secuencial que muestra los pasos reales del motor (ej. "Midiendo peso de imagenes", "Buscando Store API", "Calculando comisiones").
- Estilo: El texto de la consola usa tipografia `--mono` y color `--papel-debil`.
- Movimiento: La aparicion de cada nueva linea emplea estrictamente la animacion `@keyframes entrar` (`.entra`). Nada de animaciones decorativas de carga (spinners).

## 3. La anatomia del informe

El informe se renderiza jerarquicamente cuando el objeto `Informe` esta disponible:

1. **Cabecera del negocio**: Nombre, sector y ciudad en tamano secundario y color `--papel-tenue`.
2. **La gran cifra**: El `totalAnualEsperado`, que es el numero que manda. Usa la fuente `--fuente`, el mayor tamano tipografico de la jerarquia (equivalente al `h1`) y color `--acento`. Debajo, su supuesto principal.
3. **El listado de fugas**: Iteracion del array de `cuantificacion` con sus respectivas `fugas`. Cada bloque contiene:
   - Titulo y gravedad de la fuga.
   - El importe esperado dentro del rango (minimo a maximo).
   - El supuesto de donde sale la cifra.
4. **Fuga sin cifrar (estado limite)**: Cuando `eurosAnuales` es nulo, el diseno retira el color de acento. La cifra se sustituye por una caja con borde `--linea-control` (contraste 3,22:1 garantizado) que indica "Dato desconocido" y exhibe la `pregunta` exacta que debe hacersela al dueno del negocio.

## 4. Como se ensena un supuesto sin romper la lectura

Tres opciones concretas evaluadas:
1. **Tooltip interactivo (hover)**: Ocultar el supuesto tras un icono de informacion. Rechazada porque falla en dispositivos moviles (no hay hover) y rompe la regla de tener el supuesto a la vista.
2. **Bloque descriptivo completo (parrafo de texto largo)**: Colocar la formula desarrollada a tamano normal bajo la cifra. Rechazada porque rompe el ritmo de lectura y abruma visualmente.
3. **Frase subordinada en texto tecnico**: Mostrar la cifra en grande (fuente `--fuente`, color principal o acento) e inmediatamente debajo, en bloque de bloque, una sola linea en fuente `--mono`, cuerpo de 12px (minimo del proyecto) y color `--papel-debil` que liste las constantes y suposiciones.

**Recomendacion: Opcion 3.** Respeta la regla dura de "ninguna cifra sin su supuesto a la vista", preserva la lectura jerarquica (el ojo ve la cifra primero) y distingue semanticamente el dato final del supuesto tecnico mediante la variacion de tipografia y contraste.

## 5. El dossier

- **Que formato**: Un documento PDF de dos paginas maximo, en formato A4, diseno limpio y alto contraste (blanco y negro).
- **Como se genera**: Se recurre a la impresion nativa del navegador sobre la ruta actual (o una vista oculta habilitada para impresion), utilizando una hoja de estilos dedicada (`@media print`) que oculta la navegacion y formatea los contenedores para el folio.
- **Por que ese y no otro**: El criterio de aceptacion exige que se le pueda ensenar a un dueno de bar. Un PDF impreso fisico que muestra un diagnostico claro, sin interacciones web, es la herramienta de venta en frio por excelencia. Ademas, evitamos introducir dependencias pesadas de servidor (como Puppeteer) que desbordan el alcance y el tiempo del hackathon.

## 6. La pantalla de mockup

Es una sola pantalla, incrustada al final del informe en `/informe`.

- **Store API abierta**: Se construye utilizando el array `catalogo`. Se renderiza una tarjeta de la "nueva tienda" inyectando los `nombre` y `precioCentimos` leidos del negocio real, demostrando el reemplazo inmediato.
- **Store API cerrada**: Cuando no hay datos del catalogo (`catalogo` vacio o API inaccesible), se renderiza la misma interfaz de la tienda, pero con textos marcadores (esqueletos) explicitos ("Producto de tu carta", "Precio original") acompanados del mensaje "Catalogo listo para sincronizar con tu sistema". Nunca se inventan nombres de platos. En ningun caso se reproducen imagenes graficas reales del negocio.

## 7. Tipografia y color

Los unicos tokens permitidos provienen de `app/globals.css`.
- **Fondo unico**: `--tinta` (`#0e1113`).
- **Textos principales (cuerpo, titular)**: `--papel` (`#f4f1ea`). Contraste: 16,8:1.
- **Textos secundarios (entradillas, cabecera)**: `--papel-tenue` (`#cfc9bd`). Contraste: 11,5:1.
- **Textos tecnicos (supuestos, consola monoespaciada)**: `--papel-debil` (`#9a948a`). Contraste: 6,3:1.
- **Cifras destacadas y acentos**: `--acento` (`#d8613c`). Contraste: 5,1:1.
- **Bordes de control (estado sin cifrar, inputs)**: `--linea-control` (`#626b72`) sobre `--tinta-2` (`#161a1d`). Contraste verificado: 3,22:1.
- **Tipografias**: Instrument Sans (`--fuente`) para lectura; IBM Plex Mono (`--mono`) para datos tecnicos.
- **Regla dura**: Ningun elemento textual tiene opacidad menor a 0.99 (se usan los colores solidos atenuados).

## 8. Responsive

- **390 px (Movil)**: Los contenedores se apilan verticalmente. Todo panel asume un ancho del 100%. Se garantiza cero desborde horizontal estableciendo `max-width: 100%` y un ajuste estricto de paddings, cumpliendo que `scrollWidth <= clientWidth`. Los titulares escalan mediante la funcion `clamp` predefinida.
- **1440 px (Escritorio)**: La vista adopta una cuadricula (`grid`) para distribuir los bloques de fuga. Se utiliza el tope de `max-width: 68rem` y margenes automaticos laterales (`margin-inline: auto`) heredado de la portada para no estirar irracionalmente las lineas de lectura.

## 9. La lista de comprobacion de aceptacion

- [ ] Un solo fondo en toda la pagina (`--tinta`), sin blancos planos.
- [ ] No existe texto inferior a 12 px (`0.75rem`).
- [ ] Exactamente un unico `h1` por pagina.
- [ ] Contraste de texto y cifras por encima de 4,5:1.
- [ ] Contraste de los bordes de control minimo 3:1 (`--linea-control` lo cumple).
- [ ] Ningun texto ni boton desciende del 0.99 en su `opacity`.
- [ ] Toda animacion decorativa esta erradicada; la unica admisible es `@keyframes entrar`.
- [ ] Ninguna cifra (euro) carece de su respectivo supuesto legible a simple vista.
- [ ] Fugas imposibles de cifrar ensenan la pregunta explicitamente.
- [ ] La pantalla de mockup no inventa nombres de productos.
- [ ] Cero desborde horizontal (`scrollWidth <= clientWidth`).

## 10. Plan de trabajo en subtareas de 1-2 ficheros

Ordenadas y con la ruta critica (pasos 1 y 2) marcada:

1. **[Ruta critica] Vista base y simulacion de espera.**
   - Ficheros: `app/informe/page.tsx` y `app/informe/informe.module.css`.
   - Comando: `npx tsc --noEmit`
   - Detalle: Esqueleto de `/informe` con logica de recepcion del estado e iteracion de mensajes monoespaciados `.entra`.
2. **[Ruta critica] Componentes de fugas y bloque matematico.**
   - Ficheros: `components/BloqueFuga.tsx` y `components/FugaDesconocida.tsx`.
   - Comando: `npx tsc --noEmit`
   - Detalle: Tarjetas que condicionan el renderizado de acentos o caja de "Dato desconocido" en funcion de `eurosAnuales`.
3. **Mockup visual embebido.**
   - Ficheros: `components/MockupTienda.tsx`.
   - Comando: `npx tsc --noEmit`
   - Detalle: Lectura y mapeo del `catalogo` real usando interfaz `ArticuloCarta`.
4. **Capa de estilo para impresion PDF.**
   - Ficheros: `app/globals.css`.
   - Comando: `npx tsc --noEmit` (y revision visual con `window.print()`).
   - Detalle: Bloque `@media print` para aislar estilos monocromaticos de descarga directa.

## 11. Lo que no se y quien lo decide

- **Naturaleza del despliegue del PDF**: No estoy seguro si el `@media print` sera suficiente en entornos cruzados (iOS, Android) para garantizar el formato del dossier sin estropearlo o si hara falta obligatoriamente incrustar una solucion cliente tipo `@react-pdf/renderer`. **Decision**: Corresponde al arquitecto principal.
- **Origen de eventos de espera**: No se si el motor (Paso 3) emitira actualizaciones incrementales (SSE / WebSockets) para alimentar la consola secuencial o si devolvera la promesa de golpe obligando al frontend a fingir los mensajes. **Decision**: Corresponde al implementador del motor; de su implementacion depende el origen del array de strings de espera.
