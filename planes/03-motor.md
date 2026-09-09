# Plan del Motor de Reconocimiento

## 1. Arquitectura en una página

El motor acepta la URL de un restaurante local. Realiza un barrido para extraer datos de rendimiento y oferta. Devuelve un objeto inmutable del tipo `Reconocimiento`.
El trabajo ocurre en el directorio `lib/recon/`. Se organiza en cinco módulos de responsabilidad única. Esto mantiene el flujo predecible.
El punto de entrada es `lib/recon/entrada.ts`. Tiene esta firma exacta:

```typescript
import { Reconocimiento } from "../tipos";

export async function reconocerWeb(urlInicial: string): Promise<Reconocimiento>;
```

Los cinco módulos operan coordinados por `entrada.ts`. Son los siguientes:

1. `lib/recon/http.ts`: Gestiona las peticiones de red. Resuelve las DNS. Sigue hasta tres redirecciones. Calcula el tiempo del primer byte. Descarga el HTML estático con un límite de tamaño. Lee el archivo de robots. Exporta `obtenerDocumentoEstatico(url: string)`.

2. `lib/recon/analisis.ts`: Procesa el HTML crudo. No ejecuta JavaScript. Extrae etiquetas y enlaces mediante expresiones regulares. Localiza correos y configuraciones de WordPress. Exporta `analizarHtml(html: string, urlFinal: string)`.

3. `lib/recon/navegador.ts`: Controla Chromium mediante Playwright. Se invoca solo cuando es necesario. Toma capturas de pantalla. Lee el contenido de aplicaciones vacías. Exporta `renderizarEnNavegador(url: string, objetivo: "propia")`.

4. `lib/recon/catalogo.ts`: Extrae la carta y los precios. Revisa si existe WooCommerce. Intenta leer su API pública. Si falla, busca en el texto. Exporta `extraerCatalogo(url: string, esWooCommerce: boolean)`.

5. `lib/recon/recursos.ts`: Evalúa el peso de las imágenes. Dispara peticiones concurrentes. Usa un límite de ocho hilos. Detecta archivos muy pesados. Exporta `medirPesoImagenes(urlsImagenes: string[])`.

El orquestador inicializa un objeto parcial. Lo puebla paso a paso. Si un módulo falla, registra el evento. El flujo continúa sin detenerse.

## 2. La cascada de lectura

La lectura usa un escalado progresivo. Esto ahorra recursos locales. El navegador completo solo se abre como último recurso.

El orden de los intentos es el siguiente:

**Escalón 1: Comprobación de permisos.** Se solicita el archivo para bots. Si prohíbe el paso, la ejecución termina de inmediato. Se devuelve un reconocimiento truncado.

**Escalón 2: Solicitud inicial.** Se realiza la petición HTTP estándar. Se registra la redirección final. Se contabiliza el tiempo de respuesta. Se descarga el HTML hasta tres megabytes.

**Escalón 3: Análisis rápido.** Se examina el HTML descargado. Si el texto tiene pocos caracteres, se activa el uso del navegador. También se extraen las tecnologías y los enlaces.

**Escalón 4: Evaluación de recursos.** Se lanzan peticiones concurrentes. Revisan hasta veinticinco imágenes localizadas. Se calcula el peso total. Se identifican los archivos más pesados.

**Escalón 5: Extracción del catálogo.** Si existe WooCommerce, se consulta su API. Se piden cincuenta artículos de golpe. Si funciona, la carta queda tabulada rápidamente.

**Escalón 6: Escalado a navegador.** Se abre Chromium mediante Playwright. Se toman las capturas requeridas. Si la web estaba vacía, se extrae el texto renderizado. Se espera a que terminen las animaciones.

## 3. Cada campo de `Reconocimiento`

Aquí se detalla la obtención de cada propiedad. También se explica el impacto de un fallo.

| Campo | Cómo se obtiene | Qué pasa cuando no se puede | Alimenta `noSeHaPodido` |
| :--- | :--- | :--- | :--- |
| `url` | Se asigna desde la entrada. | Nunca falla. | No. |
| `urlFinal` | Se lee de la cadena de redirecciones. | Usa la URL inicial. | Sí. |
| `estadoHttp` | Se extrae de la cabecera. | Registra un 0. | Sí. |
| `ttfbMs` | Se mide el tiempo del primer byte. | Usa el límite máximo. | Sí. |
| `pesoHtmlKb` | Se cuentan los bytes del documento. | Trunca la lectura. | Sí. |
| `pesoImagenesKb` | Suma las cabeceras de tamaño. | Ignora los archivos bloqueados. | Sí. |
| `imagenesPesadas` | Filtra imágenes muy grandes. | Retorna una matriz vacía. | No. |
| `stack.wordpress` | Busca carpetas típicas en el texto. | Marca falso y continúa. | No. |
| `stack.woocommerce` | Busca la clase en el diseño. | Marca falso y continúa. | No. |
| `stack.phpDeclarado` | Busca la versión en la cabecera. | Devuelve nulo. | No. |
| `stack.plugins` | Extrae rutas de los atributos. | Devuelve un conjunto vacío. | No. |
| `viewportMovil` | Busca la etiqueta en el código. | Marca falso. | No. |
| `https` | Comprueba el prefijo del enlace. | Marca falso. | No. |
| `agregadores` | Busca enlaces a plataformas de reparto. | Devuelve una matriz vacía. | No. |
| `pedidoPropio` | Busca enlaces internos de compra. | Marca falso. | No. |
| `storeApi` | Pide el catálogo a la API. | Devuelve nulo. | No. |
| `catalogo` | Lee la API o busca en texto. | Devuelve nulo. | Sí. |
| `horarioDeclarado` | Busca bloques de horas y días. | Devuelve nulo. | Sí. |
| `contacto.telefono` | Busca prefijos en el contenido. | Devuelve nulo. | No. |
| `contacto.email` | Busca enlaces de correo. | Devuelve nulo. | No. |
| `contacto.whatsapp` | Busca el enlace oficial. | Marca falso. | No. |
| `capturas` | Toma fotos en el navegador. | Devuelve matrices vacías. | Sí. |

## 4. Detección de agregadores y pedido propio

Distinguir entre canales de venta es vital. Afecta al cálculo de la fuga económica.
El motor busca enlaces a agregadores conocidos. Usa una lista predefinida con dominios habituales.
Si encuentra el enlace, rellena el campo.
El negocio puede tener ambos canales activos. Para detectar el pedido propio, busca rutas específicas.
Examina enlaces hacia el carrito de compras. También revisa derivaciones a marcas blancas.
La comparación de precios con el agregador no se raspa. Se realiza a mano para el vídeo.
La comisión se cita desde los datos calibrados. El campo queda nulo si falla.

## 5. Modos de fallo y su respuesta

La red es inestable. El motor amortigua estos problemas. Procede y anota los fallos.

- **Servidor inaccesible:** El conector emite un error. El módulo detiene la red. Registra el estado cero. No abre el navegador.
- **Redirecciones circulares:** Se impone un límite de saltos. Si lo supera, asume el destino. Registra el fallo y se rinde.
- **Avisos legales:** Los muros de cookies enturbian las capturas. El motor busca botones de aceptación. Pulsa el botón rápidamente. Si falla, asume el muro.
- **Protección contra ataques:** Algunos sitios bloquean visitas mecánicas. El análisis estático falla. El motor usa el navegador para sortearlas. Si falla de nuevo, aborta.
- **Exclusión explícita:** El archivo de robots prohíbe el paso. El motor acata la norma inmediatamente. Registra el rechazo y se retira.
- **Lentitud extrema:** El motor tiene límites de tiempo. Si se superan, rellena con nulos. Registra el fallo temporal.
- **Archivos colosales:** Algunas páginas pesan demasiado. El motor trunca la descarga. Registra la contingencia y continúa procesando.

## 6. Límites éticos y legales

El motor respeta la red. Sus métodos son moderados. Cumple con estas normas:

- **Obedece a los robots:** Acata las prohibiciones de los archivos estandarizados.
- **Peticiones amables:** El límite es de cinco llamadas simultáneas. Las imágenes usan peticiones ligeras. No consume ancho de banda innecesario.
- **Identidad transparente:** El bot avisa de su presencia. Usa un nombre reconocible. Solo oculta su identidad en el navegador.
- **Consumo legítimo:** Usa las puertas públicas de las tiendas. No usa fuerza bruta. Compila datos públicos para crear métricas.

## 7. Presupuesto de tiempo

El límite es de sesenta segundos. El tiempo se distribuye con precisión.
Los quince segundos liberados de los agregadores van a la captura y al margen.

1. **DNS y conexión inicial:** Un segundo como máximo.
2. **Descarga del HTML estático:** Cuatro segundos.
3. **Procesamiento de texto:** Menos de un segundo.
4. **Extracción del catálogo:** Cuatro segundos.
5. **Peticiones ligeras a imágenes:** Tres segundos.
6. **Arranque de Chromium:** Tres segundos.
7. **Capturas y animaciones:** Veinte segundos.
8. **Empaquetado final:** Dos segundos.

Esto suma treinta y ocho segundos. Queda un amplio margen seguro. Este margen absorbe picos de trabajo y retrasos.

## 8. Plan de trabajo en subtareas

Este es el flujo de las misiones técnicas.

**Tarea 1: Orquestador base.**
- Programar el punto de entrada.
- Inicializar vectores y devolver la variable.
- Validación: Ejecutar el script contra una web.

**Tarea 2: Conector de red.**
- Crear el cliente web.
- Blindar la memoria y evitar bucles.
- Validación: Probar contra servidores lentos.

**Tarea 3: Analizador léxico.**
- Implementar el procesamiento de texto.
- Extraer tecnologías y teléfonos.
- Validación: Ejecutar pruebas locales.

**Tarea 4: Interconector de catálogos.**
- Codificar la lectura de tiendas.
- Evaluar respuestas erróneas.
- Validación: Probar contra un catálogo real.

**Tarea 5: Navegación gráfica.**
- Configurar Playwright.
- Esperar a la red y tomar fotos.
- Validación: Comprobar las capturas visualmente.

**Tarea 6: Peticiones concurrentes.**
- Configurar las llamadas ligeras.
- Lanzar peticiones y calcular el tamaño.
- Validación: Observar los resultados en consola.

## 9. Lo que no sé y quién lo decide

Faltan decisiones clave. No invento soluciones. Expongo las incógnitas:

1. **El nonce de WooCommerce.**
Las versiones recientes piden el token `X-WC-Store-API-Nonce`.
Sin este token, la petición falla.
El plan maestro da la respuesta.
La mayoría de webs no lo pide.
Implementamos el camino barato primero.

2. **El bloqueo de los agregadores.**
La decisión ya está cerrada.
No se raspa Uber Eats ni Just Eat.
La comparación de precios se hace a mano.
La comisión se cita desde la fuente.
No se incumplen condiciones de terceros.

3. **Los negocios exclusivos de Instagram.**
Algunos locales no tienen dominio.
Operan solo en redes sociales.
Estas plataformas bloquean a los robots.
¿Abrimos un cauce especial o los descartamos?
Decide la dirección corporativa.
