import { auditUrl } from "../lib/recon";
import { calculateLeaks } from "../lib/quantification";
import { triageLeaks } from "../lib/triage";
import { classifyVertical, verdictFromModel } from "../lib/vertical";

const TARGETS = [
  "https://losmellizos.net/",
  "https://www.grupodaniigarcia.com/",
  "https://www.elrincondelmata.com/",
];

async function run() {
  console.log("🚀 Bleed B2B Mass Auditor Iniciado...");
  console.log("-----------------------------------------");

  const results = [];

  for (const url of TARGETS) {
    try {
      console.log(`🔍 Auditando ${url}...`);
      const audit = await auditUrl(url);
      
      let triageResult;
      try {
        triageResult = await triageLeaks(audit);
      } catch (e) {
      }

      const deterministic = classifyVertical(audit);
      const vertical = triageResult?.vertical
        ? verdictFromModel(triageResult.vertical, deterministic, triageResult.businessRead)
        : deterministic;

      const report = calculateLeaks(audit, undefined, triageResult, vertical);
      
      results.push({
        Negocio: audit.name || url,
        URL: url,
        Vertical: vertical.id,
        PerdidaAnualEuros: report.totalAnnualLossEuros,
        FugasDetectadas: report.leaks.map(l => l.id).join(" | ")
      });
      console.log(`✅ ${audit.name || url} procesado. Fuga: €${report.totalAnnualLossEuros}`);
    } catch (error: any) {
      console.log(`❌ Error en ${url}: ${error.message}`);
    }
  }

  results.sort((a, b) => b.PerdidaAnualEuros - a.PerdidaAnualEuros);
  console.log("\n💰 RANKING DE PROSPECTOS B2B (MÁS SANGRANTES PRIMERO):");
  console.table(results);
}

run();
