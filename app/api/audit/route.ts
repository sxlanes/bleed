import { NextRequest, NextResponse } from "next/server";
import { auditUrl } from "@/lib/recon";
import { calculateLeaks } from "@/lib/quantification";
import { findBenchmark } from "@/lib/benchmarks";
import { AuditSimulationParams } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = (searchParams.get("url") || searchParams.get("demo") || "").trim();

  if (!target) {
    return NextResponse.json(
      { error: "A 'url' or 'demo' parameter is required" },
      { status: 400 }
    );
  }

  try {
    const audit = await auditUrl(target);
    const report = calculateLeaks(audit);
    return NextResponse.json(report);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Audit failed: ${msg}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const target = (body.url || body.demo || "").trim();
    const customParams = body.params as Partial<AuditSimulationParams> | undefined;

    if (!target && !body.audit) {
      return NextResponse.json(
        { error: "A 'url' or an 'audit' object is required" },
        { status: 400 }
      );
    }

    const audit = body.audit || (await auditUrl(target));
    const report = calculateLeaks(audit, customParams);
    return NextResponse.json(report);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Audit failed: ${msg}` },
      { status: 500 }
    );
  }
}
