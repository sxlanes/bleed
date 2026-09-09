/**
 * Revision del front en localhost: capturas y las comprobaciones de las reglas
 * duras del proyecto, medidas y no estimadas.
 *   node scripts/revisar.mjs <carpeta-de-salida> [url]
 */
import { chromium } from "playwright";

const salida = process.argv[2] ?? ".";
const url = process.argv[3] ?? "http://localhost:3111";

const navegador = await chromium.launch();

for (const [nombre, ancho, alto] of [
  ["escritorio", 1440, 900],
  ["movil", 390, 844],
]) {
  const pagina = await navegador.newPage({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 2,
  });
  await pagina.goto(url, { waitUntil: "networkidle" });

  // Esperar a que termine toda animacion de entrada, o la captura sale en blanco.
  await pagina.evaluate(() =>
    Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    ),
  );
  await pagina.evaluate(() => document.fonts.ready);

  await pagina.screenshot({ path: `${salida}/bleed-${nombre}.png` });

  const informe = await pagina.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const entrada = document.querySelector("input");
    const pequenos = [...document.querySelectorAll("body *")]
      .filter((e) => e.textContent?.trim() && !e.children.length)
      .map((e) => ({
        texto: e.textContent.trim().slice(0, 28),
        px: parseFloat(getComputedStyle(e).fontSize),
      }))
      .filter((x) => x.px < 12);
    const invisibles = [...document.querySelectorAll("h1, p, label, button")]
      .filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99)
      .map((e) => e.tagName);
    return {
      fondo: cs.backgroundColor,
      fuente: cs.fontFamily.split(",")[0],
      desbordeHorizontal:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      h1: document.querySelectorAll("h1").length,
      entradaTipo: entrada?.type,
      entradaRequerida: entrada?.required,
      textoPorDebajoDe12px: pequenos,
      elementosSinOpacidadPlena: invisibles,
    };
  });
  console.log(` ${nombre} ${ancho}x${alto}:`, JSON.stringify(informe));
  await pagina.close();
}

await navegador.close();
