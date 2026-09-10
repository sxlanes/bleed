# Investigacion: Navegador Real en Vercel (Septiembre 2026)

**Recomendacion en una frase:** Conectar mediante WebSocket a un servicio gestionado como Browserbase o Browserless para evitar saturar las funciones locales, o en su defecto usar @sparticuz/chromium con playwright-core ya que hoy en dia entra en los limites nativos de Vercel.

## Comparativa de opciones

| Opcion | Peso del Paquete | Arranque en frio | Coste | Veredicto |
| :--- | :--- | :--- | :--- | :--- |
| **@sparticuz/chromium + playwright-core** | ~145 MB | 2 a 4 segundos | $0 (solo Vercel compute) | Excelente alternativa local. Cabe en los 250 MB actuales. Requiere buena configuracion de memoria. |
| **Browserless** | < 5 MB | 0.5 a 1 segundo | ~$25 / mes | Ideal para escalar de forma estandar. Evita problemas de CPU y memoria local. |
| **Browserbase** | < 5 MB | 0.5 a 1 segundo | ~$20 / mes | La mejor opcion gestionada, optimizada especificamente para agentes e interacciones complejas. |

## Limites de Vercel verificados hoy

Atras quedaron los tiempos de luchar contra el limite de 50 MB. La [documentacion actual de limites de Vercel](https://vercel.com/docs/limits) confirma:
- **Tamano del paquete:** 250 MB sin comprimir para Node.js, ampliable a 5 GB con la beta de Large Functions.
- **Duracion maxima:** 300 segundos por defecto en el plan Hobby, y hasta 1800 segundos en planes superiores.
- **Memoria:** Configurable hasta 3008 MB, escalando la capacidad de CPU proporcionalmente.
- **Espacio temporal (/tmp):** 500 MB.

Esto significa que ya no hace falta recurrir al hack de descargar los binarios comprimidos de Chromium en caliente desde un CDN externo.

## La alternativa sin navegador

En lugar de lanzar un navegador, el codigo actual puede detectar simplemente que el HTML es un cascaron vacio y emitir un mensaje de "JavaScript Requerido". No obstante, si merece la pena usar un navegador. Si un ingeniero tecnico introduce la URL de un sitio moderno (creado en React o Nuxt sin SSR) y recibe un reporte hueco, pensara que el motor falla estrepitosamente. El presupuesto de tiempo es de 1 minuto; consumir entre 5 y 10 segundos extra en arrancar Chromium compensa la inmensa mejora en percepcion y utilidad.

## Plan de implementacion concreto

1. **Dependencias a anadir:** Instalar playwright-core y @sparticuz/chromium en el proyecto.
2. **Ficheros a tocar:** Unicamente lib/recon.ts.
3. **Nueva funcion interna:** Crear auditUrlWithBrowser(targetUrl: string) en lib/recon.ts que encapsule la conexion y extraccion.
4. **Logica de escalado:**
   - Mantener el fetch rapido original.
   - Si el HTML resultante es menor a 15 KB y contiene firmas de SPA, activar una bandera de escalado.
   - Llamar a auditUrlWithBrowser(), lanzar playwright, esperar al evento networkidle y extraer el innerHTML completo.
   - Parsear ese HTML hidratado usando las reglas actuales.
5. **Degradacion elegante:** Envolver la llamada al navegador en un try/catch con AbortSignal de 15 segundos. Si ocurre un error, retornar los datos del fetch original anadiendo en el campo error: "Esta web parece requerir JavaScript y el renderizado avanzado fallo o expiro, mostrando resultados parciales".

## Lo que no se

- No se en que plan de Vercel reside el proyecto (Hobby limita la memoria a 2 GB y no permite ajustes de tamano de funcion mayores sin saltar a Pro, lo que podria causar problemas de recursos si hay procesos paralelos).
- No se si hay presupuesto asignado para invertir en un SaaS externo como Browserbase, el cual simplificaria enormemente la arquitectura.
