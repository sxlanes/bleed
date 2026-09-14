import { chromium } from "playwright";
import path from "path";

async function generatePDF() {
  console.log("Iniciando Playwright para generar el PDF...");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const filePath = "file://" + path.resolve(process.cwd(), "entrega/deck.html");
  console.log(`Cargando archivo: ${filePath}`);
  
  await page.goto(filePath, { waitUntil: "networkidle" });
  
  // Emular media print
  await page.emulateMedia({ media: 'print' });
  
  const outputPath = path.resolve(process.cwd(), "entrega/deck.pdf");
  await page.pdf({
    path: outputPath,
    format: "A4", // or custom based on the print css @page { size: 1200px 675px; }
    width: "1200px",
    height: "675px",
    printBackground: true,
  });
  
  console.log(`PDF generado exitosamente en: ${outputPath}`);
  await browser.close();
}

generatePDF().catch(console.error);
