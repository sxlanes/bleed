import { redirect } from "next/navigation";
import { auditUrl } from "@/lib/recon";
import { calculateLeaks } from "@/lib/quantification";
import { findBenchmark, DEMOS_ENABLED } from "@/lib/benchmarks";
import InformeView from "@/components/InformeView";
import type { Metadata } from "next";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function resolveTarget(resolved: Record<string, string | string[] | undefined>) {
  const raw = resolved.url || (DEMOS_ENABLED ? resolved.demo : undefined);
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const target = resolveTarget(await searchParams);
  if (!target) return { title: "Bleed" };
  const benchmark = findBenchmark(target);
  const name = benchmark?.name || target;
  return {
    title: `Bleed · ${name}`,
    description: `How much the website of ${name} is losing per year, with the assumption behind every figure in plain sight.`,
  };
}

export default async function InformePage({ searchParams }: PageProps) {
  const target = resolveTarget(await searchParams);
  if (!target) redirect("/");

  const audit = await auditUrl(target);
  const report = calculateLeaks(audit);

  return <InformeView initialReport={report} />;
}
