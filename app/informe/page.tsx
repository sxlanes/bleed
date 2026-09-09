import { auditUrl } from "@/lib/recon";
import { calculateLeaks } from "@/lib/quantification";
import { findBenchmark, BENCHMARK_CASES } from "@/lib/benchmarks";
import InformeView from "@/components/InformeView";
import type { Metadata } from "next";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolved = await searchParams;
  const rawTarget = resolved.url || resolved.demo || "pizzerianenina";
  const target = Array.isArray(rawTarget) ? rawTarget[0] : rawTarget;
  const benchmark = findBenchmark(target);
  const name = benchmark?.name || target;

  return {
    title: `Bleed · Auditoría financiera de ${name}`,
    description: `Descubre cuánto dinero pierde la web de ${name} al año y la solución en 48 horas con el supuesto de cada cifra a la vista.`,
  };
}

export default async function InformePage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const rawTarget = resolved.url || resolved.demo || "pizzerianenina";
  const target = Array.isArray(rawTarget) ? rawTarget[0] : rawTarget;

  // Realizar auditoría o cargar benchmark
  const audit = await auditUrl(target);
  const report = calculateLeaks(audit);

  return <InformeView initialReport={report} />;
}
