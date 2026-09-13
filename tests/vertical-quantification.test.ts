import test from "node:test";
import assert from "node:assert/strict";
import { calculateLeaks, defaultParamsFor } from "../lib/quantification";
import { classifyVertical, PERIODS_PER_YEAR } from "../lib/vertical";
import { ECONOMIA_VERTICAL } from "../lib/calibracion-verticales";
import type { AuditResult } from "../lib/types";

/**
 * Bleed generalised from restaurants to any trade without weakening the
 * honesty rules. This file checks the three things most likely to break
 * quietly in that generalisation: a non-restaurant vertical gets priced with
 * its OWN economics (not the restaurant's), the period arithmetic uses the
 * vertical's own rate (a week-based trade is x52, never x365), a site's own
 * measured prices beat the national average, and a business the classifier
 * cannot place still gets a report instead of a crash.
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

test("a hotel linking to Booking.com fires the marketplace leak, priced with lodging economics", () => {
  const a = audit({
    schemaTypes: ["Hotel"],
    marketplaces: [{ platform: "Booking.com", url: "https://booking.com/hotel/x", vertical: "lodging" }],
    whatsapp: false,
    ownOrder: false,
  });

  const verdict = classifyVertical(a);
  assert.equal(verdict.id, "lodging", "a declared Hotel schema type plus a Booking.com link must read as lodging");

  const r = calculateLeaks(a);
  assert.equal(r.vertical?.id, "lodging");

  const leak = r.leaks.find((l) => l.id === "fuga-agregadores");
  assert.ok(leak, "linking to Booking.com must fire the marketplace leak even though it is not a food aggregator");
  assert.match(leak!.title, /Booking\.com/);
  assert.match(leak!.title, /booking sites/, "the title should speak lodging's own vocabulary, not restaurant's");

  const econ = ECONOMIA_VERTICAL.lodging;
  assert.equal(r.params.ticketMedio, econ.valorTransaccion.valor, "lodging must be priced with lodging's own ticket, not the restaurant default");
  assert.equal(r.params.comisionAgregadorPct, econ.comisionPlataforma.valor);
  assert.equal(r.params.pedidosDia, econ.transaccionesPorPeriodo.valor);
  assert.notEqual(r.params.ticketMedio, 21, "must not silently fall back to the restaurant ticket");
});

test("a week-based vertical annualises orders x 52, never x 365", () => {
  const a = audit({
    schemaTypes: ["Plumber"],
    marketplaces: [{ platform: "Habitissimo", url: "https://habitissimo.es/x", vertical: "trade" }],
  });

  const verdict = classifyVertical(a);
  assert.equal(verdict.id, "trade");
  assert.equal(verdict.definition.ratePeriod, "week");
  assert.equal(PERIODS_PER_YEAR[verdict.definition.ratePeriod], 52);

  const r = calculateLeaks(a, undefined, undefined, verdict);
  const leak = r.leaks.find((l) => l.id === "fuga-agregadores")!;
  assert.ok(leak, "the marketplace leak must fire for a trade linked to a lead marketplace");

  const params = defaultParamsFor("trade");
  const expectedWith52 = Math.round(params.pedidosDia * params.ticketMedio * 52 * (params.comisionAgregadorPct / 100));
  const expectedWith365 = Math.round(params.pedidosDia * params.ticketMedio * 365 * (params.comisionAgregadorPct / 100));

  assert.equal(leak.annualLossEuros, expectedWith52, "a trade's weekly job count must be annualised by 52 weeks");
  assert.notEqual(
    leak.annualLossEuros,
    expectedWith365,
    "multiplying a week-based rate by 365 instead of 52 would inflate the loss roughly sevenfold"
  );
});

test("prices measured from the site's own catalogue override the national average", () => {
  const withoutPrices = audit({ aggregators: ["Amazon"], schemaTypes: ["Store"] });
  const withPrices = audit({ aggregators: ["Amazon"], schemaTypes: ["Store"], priceSignals: [18, 22, 26] });

  const rWithout = calculateLeaks(withoutPrices);
  const rWith = calculateLeaks(withPrices);

  const leakWithout = rWithout.leaks.find((l) => l.id === "fuga-agregadores")!;
  const leakWith = rWith.leaks.find((l) => l.id === "fuga-agregadores")!;

  assert.notEqual(leakWith.annualLossEuros, leakWithout.annualLossEuros, "a measured median price must change the priced figure");

  const measuredAssumption = leakWith.assumptions.find((x) => /measured from the prices published/i.test(x.citation));
  assert.ok(measuredAssumption, "the ticket assumption must say plainly that the figure came from the site's own prices");
  assert.equal(measuredAssumption!.value, "22.00 EUR", "the median of [18, 22, 26] is 22");
});

test("a site with no recognisable trade still produces leaks and never crashes", () => {
  const a = audit({});
  const verdict = classifyVertical(a);
  assert.equal(verdict.id, "generic", "nothing distinctive on this site should read as a generic business, not a guess");

  const r = calculateLeaks(a);
  assert.ok(r.leaks.length >= 1, "a business the classifier cannot place must still get a priced report, never an empty one");
  assert.ok(Number.isFinite(r.totalAnnualLossEuros));
  assert.ok(r.totalAnnualLossEuros >= 0);
});

test("no assumption line claims a source it does not have, across every vertical", () => {
  const fixtures: AuditResult[] = [
    audit({
      schemaTypes: ["Hotel"],
      marketplaces: [{ platform: "Booking.com", url: "https://booking.com/x", vertical: "lodging" }],
      whatsapp: false,
      ownOrder: false,
    }),
    audit({
      schemaTypes: ["Plumber"],
      marketplaces: [{ platform: "Habitissimo", url: "https://habitissimo.es/x", vertical: "trade" }],
      whatsapp: false,
      ownOrder: false,
    }),
    audit({
      schemaTypes: ["Dentist"],
      bookingProvider: "doctoralia",
      contactChannels: [],
      whatsapp: false,
      ownOrder: false,
    }),
    audit({ aggregators: ["Amazon"], schemaTypes: ["Store"], priceSignals: [12, 15] }),
    audit({}), // generic, no signals at all
    audit({ schemaTypes: [] }), // recon ran, found nothing -> should trip the discovery leak
  ];

  for (const fixture of fixtures) {
    const r = calculateLeaks(fixture);
    assert.ok(r.leaks.length >= 1, `${r.vertical?.id} produced no leaks at all`);

    for (const leak of r.leaks) {
      for (const a of leak.assumptions) {
        if (a.sourceUrl !== undefined) {
          assert.ok(a.sourceUrl.length > 0, `${leak.id} / "${a.label}" sets sourceUrl to an empty string instead of omitting it`);
          assert.ok(a.sourceUrl.startsWith("http"), `${leak.id} / "${a.label}" has a sourceUrl that is not an openable link`);
        } else {
          assert.match(
            a.citation,
            /team estimate|measured/i,
            `${leak.id} / "${a.label}" has no source URL and does not admit it is an estimate or a live measurement`
          );
        }
      }
    }
  }
});
