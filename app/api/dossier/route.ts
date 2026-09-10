import { NextRequest, NextResponse } from "next/server";
import { generateGeminiDossier } from "@/lib/gemini-dossier";
import { FullAuditReport } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const report = body.report as FullAuditReport | undefined;

    if (!report || !report.audit) {
      return NextResponse.json(
        { error: "A complete 'report' audit object is required" },
        { status: 400 }
      );
    }

    const dossier = await generateGeminiDossier(report);
    return NextResponse.json(dossier);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Dossier generation failed: ${msg}` },
      { status: 500 }
    );
  }
}
