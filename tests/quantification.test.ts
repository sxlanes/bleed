import test from "node:test";
import assert from "node:assert/strict";
import { calculateLeaks, DEFAULT_PARAMS } from "../lib/quantification.ts";
import { constante } from "../lib/calibracion.ts";
import type { AuditResult, TriageResult } from "../lib/types.ts";

/**
 * This file exists because calculateLeaks turns a website into a number a real
 * business owner may act on. The arithmetic is checked here, and so are the
 * honesty rules the product claims: every euro-bearing assumption backed by a
 * calibrated constant has to carry an openable source, and anything without a
 * published source has to say so on its own line.
 */

function audit(over: Partial<AuditResult> = {}): AuditResult {
  return {
    url: "https://example.test/",
    finalUrl: "https://example.test/",
    domain: "example.test",
    name: "Example",
    status: 200,
    ttfb: 0.4,
    https: true,
    htmlKb: 50,
    viewport: true,
    wordpress: false,
    woocommerce: false,
    products: [],
    aggregators: [],
    aggregatorLinks: [],
    ownOrder: true,
    ownOrderSignals: ["checkout"],
    whatsapp: true,
    reserva: false,
    imgKb: 300,
    heavyImgs: [],
    source: "live",
    auditedAt: new Date().toISOString(),
    ...over,
  } as AuditResult;
}

test("a clean site still reports the minimum opportunity gap, never nothing", () => {
  const r = calculateLeaks(audit());
  assert.equal(r.leaks.length, 1);
  assert.equal(r.leaks[0].id, "fuga-potencial-directo");
  assert.ok(r.totalAnnualLossEuros > 0);
});

test("aggregator commission is exactly orders x ticket x rate x 365", () => {
  const r = calculateLeaks(audit({ aggregators: ["Glovo"] }));
  const leak = r.leaks.find((l) => l.id === "fuga-agregadores");
  assert.ok(leak, "the aggregator leak must fire when aggregators are linked");

  const p = DEFAULT_PARAMS;
  const expected = Math.round(p.pedidosDia * p.ticketMedio * 365 * (p.comisionAgregadorPct / 100));
  assert.equal(leak!.annualLossEuros, expected);
  assert.equal(leak!.monthlyLossEuros, Math.round(expected / 12));
});

test("no aggregator linked means no aggregator leak invented", () => {
  const r = calculateLeaks(audit({ aggregators: [] }));
  assert.equal(r.leaks.find((l) => l.id === "fuga-agregadores"), undefined);
});

test("the defaults come from the calibrated constants, not from round numbers", () => {
  assert.equal(DEFAULT_PARAMS.ticketMedio, constante("ticketMedioRestauracion").valor);
  assert.equal(DEFAULT_PARAMS.comisionAgregadorPct, constante("comisionAgregadorCompleto").valor);
  assert.equal(DEFAULT_PARAMS.pctRecuperableCanalPropio, constante("preferenciaCanalDirecto").valor);
});

test("every assumption carries either an openable source or an explicit team-estimate label", () => {
  const r = calculateLeaks(
    audit({ aggregators: ["Glovo", "JustEat"], ttfb: 2.4, imgKb: 3800, woocommerce: true, whatsapp: false, ownOrder: false })
  );
  assert.ok(r.leaks.length >= 3, "this audit should surface several leaks");

  for (const leak of r.leaks) {
    assert.ok(leak.assumptions.length > 0, `${leak.id} states a figure with no assumptions`);
    for (const a of leak.assumptions) {
      const openable = typeof a.sourceUrl === "string" && a.sourceUrl.startsWith("http");
      const declared = /team estimate|measured/i.test(a.citation);
      assert.ok(
        openable || declared,
        `${leak.id} / "${a.label}" cites a source that cannot be opened and is not declared a team estimate`
      );
    }
  }
});

test("a constant with a warning carries that warning into the report", () => {
  const c = constante("preferenciaCanalDirecto");
  assert.ok(c.advertencia, "this constant is expected to carry a warning");
  const r = calculateLeaks(audit({ aggregators: ["Glovo"] }));
  const leak = r.leaks.find((l) => l.id === "fuga-agregadores")!;
  const cited = leak.assumptions.some((a) => a.citation.includes(c.advertencia!));
  assert.ok(cited, "the warning on a weak source must reach the reader");
});

test("the total is the sum of the leaks, with nothing added on the way", () => {
  const r = calculateLeaks(audit({ aggregators: ["Glovo"], ttfb: 2.0, imgKb: 3000 }));
  const sum = r.leaks.reduce((acc, l) => acc + l.annualLossEuros, 0);
  assert.equal(r.totalAnnualLossEuros, sum);
});

test("the owner's own numbers override our national averages", () => {
  const base = calculateLeaks(audit({ aggregators: ["Glovo"] }));
  const theirs = calculateLeaks(audit({ aggregators: ["Glovo"] }), { pedidosDia: 40 });
  const a = base.leaks.find((l) => l.id === "fuga-agregadores")!;
  const b = theirs.leaks.find((l) => l.id === "fuga-agregadores")!;
  assert.ok(b.annualLossEuros > a.annualLossEuros);
  assert.equal(theirs.params.pedidosDia, 40);
});

test("triage reorders the leaks and never introduces a euro of its own", () => {
  const withoutTriage = calculateLeaks(audit({ aggregators: ["Glovo"], ttfb: 2.4, imgKb: 3800 }));
  const triage: TriageResult = {
    verdicts: [
      { leakId: "fuga-velocidad", rank: 1, whyItMattersHere: "Peak-hour mobile traffic.", confidence: "high" },
      { leakId: "fuga-agregadores", rank: 2, whyItMattersHere: "Two aggregators linked.", confidence: "high" },
    ],
    businessRead: "Pizzeria with delivery.",
    source: "gemini",
    ms: 120,
  };
  const withTriage = calculateLeaks(audit({ aggregators: ["Glovo"], ttfb: 2.4, imgKb: 3800 }), undefined, triage);

  assert.equal(withTriage.leaks[0].id, "fuga-velocidad", "triage should promote the leak it ranked first");

  const sumOf = (r: typeof withoutTriage) =>
    r.leaks.reduce((acc, l) => acc + l.annualLossEuros, 0);
  assert.equal(sumOf(withTriage), sumOf(withoutTriage), "triage must not change any figure, only the order");
});
