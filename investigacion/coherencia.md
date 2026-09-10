# Auditoría de Coherencia de Bleed

## 1. Las 10 incoherencias que más duelen

1. **El motor real vs el plan:** El plan `03-motor.md` detalla el uso de Playwright y Chromium con 5 módulos en `lib/recon/`, pero la realidad es un solo archivo `lib/recon.ts` usando un simple `fetch()` sin navegador. **Arreglo:** Reescribir el plan para que refleje la arquitectura ligera real basada en red.
2. **El cerebro usa Gemini en lugar de Anthropic:** El plan `04-cerebro.md` especifica Claude Haiku 4.5, pero `lib/gemini-dossier.ts` usa Gemini 3.6 Flash. **Arreglo:** Actualizar el plan `04-cerebro.md` o cambiar el proveedor en el código.
3. **Cálculo de fugas determinista vs LLM:** Según el plan `04-cerebro.md`, un LLM calcula 14 fugas; en la realidad, `lib/quantification.ts` calcula 6 fugas mediante fórmulas matemáticas deterministas (sin LLM). **Arreglo:** Actualizar el plan para reflejar que la cuantificación se hace por código puro y no por IA.
4. **Paleta de colores ignorada en componentes:** `app/globals.css` define las variables obligatorias (`--tinta`, `--acento`, `--verde`), pero los componentes y la landing page usan un sistema de colores diferente y local (`--red`, `--void`, `--panel`, `--bleed`). **Arreglo:** Refactorizar los CSS de los componentes para que usen exclusivamente los colores de `globals.css`.
5. **Dos sistemas de tipos enfrentados:** Existe `lib/tipos.ts` (en español, mencionado en los planes) y `lib/types.ts` (en inglés, usado por el código). `lib/tipos.ts` es código muerto. **Arreglo:** Eliminar `lib/tipos.ts` y actualizar los planes para que apunten a `lib/types.ts`.
6. **Fugas de español hacia el usuario:** Pese a la decisión de que el producto sea en inglés, los errores devueltos por las rutas de API (`app/api/audit/route.ts`, `app/api/dossier/route.ts`) están completamente en español. **Arreglo:** Traducir los mensajes de error devueltos en las respuestas HTTP a inglés.
7. **El "Dentista" del README no existe:** El `README.md` afirma que el sistema detecta fugas distintas para un dentista y una pizzería, pero el motor de cuantificación (`lib/quantification.ts`) está codificado estáticamente para asunciones de restauración (cubiertos, ticket medio, Glovo). **Arreglo:** Eliminar la mención a dentistas del README.
8. **Invento de datos ante la falta de los del dueño:** El `README.md` y `lib/tipos.ts` dicen que si falta el dato del dueño no se inventan números, pero `lib/quantification.ts` aplica sin fallo unos `DEFAULT_PARAMS` prefijados (15 pedidos/día, ticket de 24.5€) en todas las simulaciones. **Arreglo:** Modificar el README para indicar que se usan medias estadísticas nacionales cuando el dueño no provee datos.
9. **Ubicación errónea de constantes en el README:** El README asegura que la calibración y constantes viven en `investigacion/`, pero realmente están codificadas en `lib/calibracion.ts`. **Arreglo:** Corregir la ruta citada en el README.
10. **Variables y constantes muertas en producción:** Ficheros en producción exportan constantes (`DEFAULT_SIMULATION_PARAMS` en `lib/types.ts`, `SOLO_CUALITATIVAS` en `lib/calibracion.ts`) que no son usadas por nadie. **Arreglo:** Borrar los exports sin uso para limpiar el código base.

## 2. Tablas de Hallazgos

### 1. Dos sistemas de tipos duplicados
| hallazgo | ruta:linea | impacto (alto/medio/bajo) | arreglo propuesto | riesgo de romper algo |
|---|---|---|---|---|
| `lib/tipos.ts` es un contrato fantasma no utilizado por el código | `lib/tipos.ts:1` | alto | Borrar el fichero por completo y usar `types.ts` | nulo (nadie lo importa) |
| `lib/types.ts` es el contrato real, usado en el front y el motor | `lib/types.ts:1` | alto | Actualizar los planes .md para referenciar `types.ts` en lugar de `tipos.ts` | nulo |

### 2. Idioma: restos de español visible
| hallazgo | ruta:linea | impacto (alto/medio/bajo) | arreglo propuesto | riesgo de romper algo |
|---|---|---|---|---|
| Mensaje de error de la API `dossier` en español | `app/api/dossier/route.ts:12` | medio | Traducir a inglés | bajo (solo afecta a clientes de API que lean el string de error) |
| Captura de excepciones en `dossier` devuelta en español al frontend | `app/api/dossier/route.ts:22` | medio | Traducir a inglés | bajo |
| Mensaje de validación de parámetro en API `audit` en español | `app/api/audit/route.ts:13` | medio | Traducir a inglés | bajo |
| Mensajes genéricos de error en `audit` en español | `app/api/audit/route.ts:25` y `50` | medio | Traducir a inglés | bajo |
| Mensaje de error interno del motor `recon` propagado en español | `lib/recon.ts:161` | medio | Traducir a inglés | bajo |
| Comentarios con español en campos de variables | `lib/types.ts:91` al `98` | bajo | Traducir a inglés los comentarios `(pedidos/día)`, `(€)`, etc. | nulo (es un comentario) |

### 3. Paleta: globals.css vs módulos
| hallazgo | ruta:linea | impacto (alto/medio/bajo) | arreglo propuesto | riesgo de romper algo |
|---|---|---|---|---|
| Variables `--acento` y `--verde` declaradas pero no usadas nunca | `app/globals.css:12` | bajo | Borrarlas del CSS global | nulo |
| La portada usa `--red` en vez de la paleta oficial `--tinta` | `app/pagina.module.css:6` | alto | Refactorizar portada para usar `--tinta` e integrar la nueva paleta | alto (cambiará por completo la identidad visual de la portada roja) |
| El informe usa colores propios (`--void`, `--panel`) en vez de `--tinta` | `app/informe/informe.module.css:2` | alto | Reemplazar uso de `--void` por `var(--tinta)` en el CSS module | alto (puede alterar contrastes visuales de las gráficas) |

### 4. Los planes contra la realidad
| hallazgo | ruta:linea | impacto (alto/medio/bajo) | arreglo propuesto | riesgo de romper algo |
|---|---|---|---|---|
| Plan asume uso de Playwright y 5 módulos; la app usa un `fetch` nativo | `planes/03-motor.md:14` | alto | Modificar el plan para que refleje que el scraping es mediante HTTP puro | nulo (documentación) |
| Plan exige Claude Haiku 4.5; el sistema usa `gemini-3.6-flash` | `planes/04-cerebro.md:21` | medio | Documentar en el plan la decisión de usar Gemini | nulo (documentación) |
| Plan enumera 14 fugas complejas a detectar por LLM; el sistema detecta 6 estáticamente | `planes/04-cerebro.md:14` | alto | Replantear el `04-cerebro.md` para reflejar el motor determinista de `lib/quantification.ts` | nulo (documentación) |

### 5. Código muerto
| hallazgo | ruta:linea | impacto (alto/medio/bajo) | arreglo propuesto | riesgo de romper algo |
|---|---|---|---|---|
| Exportación `DEFAULT_SIMULATION_PARAMS` sin invocaciones en todo el proyecto | `lib/types.ts:109` | bajo | Borrar bloque exportado | nulo |
| Fichero entero `tipos.ts` muerto | `lib/tipos.ts:1` | alto | Eliminar archivo del sistema de ficheros | nulo |
| Constante `SOLO_CUALITATIVAS` no se usa | `lib/calibracion.ts:74` | bajo | Eliminar variable exportada | nulo |

### 6. README.md desactualizado
| hallazgo | ruta:linea | impacto (alto/medio/bajo) | arreglo propuesto | riesgo de romper algo |
|---|---|---|---|---|
| Ubicación errónea del listado de constantes (`investigacion/` en vez de `lib/`) | `README.md:14` | bajo | Editar README apuntando a `lib/calibracion.ts` | nulo |
| Promesa falsa de adaptación a diferentes verticales (ej. dentistas) | `README.md:21` | alto | Quitar la mención a dentistas y recalcar que es solo Horeca/Delivery | nulo |
| Afirma no inventar números, pero el motor rellena estimaciones (15 pedidos/día) en cada métrica | `README.md:23` | alto | Explicar que el sistema usa medias estadísticas calibradas en vez de abortar el cálculo | nulo |
| Remite a un estado de "prototipo temprano" falso | `README.md:44` | bajo | Eliminar la línea de "Early. See investigacion..." | nulo |

## 3. Orden de arreglo recomendado

1. **Eliminación de código muerto:** Borrar `lib/tipos.ts` y las variables sin uso (`DEFAULT_SIMULATION_PARAMS`, `SOLO_CUALITATIVAS`). Esto reduce la huella del proyecto de forma segura.
2. **Corrección de errores API (Traducción):** Reemplazar los strings de error en español de `route.ts` y `lib/recon.ts` a inglés. Así garantizamos que el flujo de datos no sangra idioma incorrecto en el frontal.
3. **Sincronización de planes y README con el código real:** Modificar los Markdowns de la carpeta `planes/` y `README.md` para que asuman la verdad del código: sin navegador `Playwright`, usando estáticos matemáticos (`lib/quantification.ts`), y solo orientado a hostelería. Es un paso puramente documental y no rompe builds.
4. **Refactor de identidad visual (El mayor riesgo):** Remplazar variables estáticas locales (`--red`, `--void`, `--panel`) en las hojas CSS modulares de `app/` e introducir los colores base `var(--tinta)`, `var(--papel)` desde `globals.css`. Este paso se hace al final porque alterará radicalmente toda la estética del proyecto.

## 4. Lo que no sé

- No sé con absoluta certeza si el script `scripts/revisar.mjs` (que usa `playwright`) forma parte integral de una CI automatizada del desarrollador que no esté versionada en el repo. Asumo que se ejecuta localmente a demanda ya que no hay menciones en `package.json`, por lo tanto decidí no catalogar `playwright` como dependencia "muerta".
- No sé el contexto histórico por el cual el motor del plan (con 5 módulos Playwright) fue degradado a un motor puro `fetch` ligero, ni si la intención era realmente volver a construir ese motor de 5 módulos en el futuro (lo cual haría que la documentación estuviese describiendo el *roadmap* en vez de un desfase actual). Asumí desfase como divergencia actual de la realidad.
- No sé si existen ramas secundarias o pruebas con Anthropic Haiku que justifiquen el texto original en los planes y el cambio a Gemini haya sido de última hora, pero el actual código del proyecto funciona enteramente con `gemini-3.6-flash`.

---

## Revision del arquitecto, 11-sep-2026

Siete de los diez hallazgos se aceptan tal cual. Tres se matizan.

**Hallazgo 4, paleta: al reves.** El auditor propone refactorizar la portada y el
informe para que usen los tokens de `app/globals.css` (`--tinta`, `--acento` naranja,
`--verde`). Eso seria volver al tema viejo. Los mundos visuales actuales son
deliberados y estan decididos: la portada es un campo rojo (la alarma) y el informe
una sala de diagnostico oscura. **Lo que sobra es `globals.css`**, que conserva
tokens que ya no usa nadie. El arreglo correcto es limpiar globals, no los componentes.

**Hallazgo 8, "no inventamos numeros": ya corregido a medias.** El auditor cita
`ticketMedio: 24.5`. Ese valor ya no existe: `DEFAULT_PARAMS` toma ahora
`ticketMedioRestauracion` (21 EUR) de `lib/calibracion.ts`, y cada supuesto sin fuente
publicada aparece marcado "team estimate" en su propia linea del informe. Lo que si
sigue siendo cierto es que el README promete mas honestidad de la que el codigo
demostraba cuando se escribio. Se arregla el README.

**Hallazgo 10, exports muertos: `SOLO_CUALITATIVAS` no se borra.** Es la lista de
constantes que tienen fuente interesada y por tanto no pueden calcular euros. Hoy no
la lee ningun modulo, pero es la regla escrita que acaba de evitar que entraran dos
constantes falsas (MobiHQ y Meta, ver `investigacion/metricas.md`). Se queda, y hay
que cablearla de verdad.

### Orden de arreglo, por retorno ante el jurado

| # | Arreglo | Por que ahora | Esfuerzo |
|---|---|---|---|
| 1 | Mensajes de error de `app/api/*` a ingles | Es lo unico de la lista que ve un usuario final | 10 min |
| 2 | README: quitar la afirmacion del dentista | Es una promesa que el codigo no cumple. Un juez que lea el README y luego el codigo nos pilla sobrevendiendo | 15 min |
| 3 | README: corregir la ruta de las constantes y el estado "Early" | "Early" en el README es una senal negativa gratuita el dia de la entrega | 15 min |
| 4 | Borrar `lib/tipos.ts` | Codigo muerto en un repo que se juzga por su documentacion | 20 min |
| 5 | Limpiar los tokens muertos de `globals.css` | Coherencia real, no la que propone el hallazgo 4 | 30 min |
| 6 | Actualizar `planes/` para que describan lo construido | Los planes son publicos y hoy describen otro producto | 1 h |
