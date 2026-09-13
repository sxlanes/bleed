import test from "node:test";
import assert from "node:assert/strict";
import { classifyVertical, VERTICALS, PERIODS_PER_YEAR } from "../lib/vertical";
import type { AuditResult } from "../lib/types";

/**
 * The classifier decides which words the report speaks and which economics
 * price it. Getting it wrong is not a cosmetic mistake: it would price a
 * dentist with a pizzeria's ticket. So the rule it is held to here is the same
 * one the product claims everywhere else — when the evidence is thin it must
 * say "business" and fall back to the leaks that need no assumption, rather
 * than guess a trade to unlock a bigger number.
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
    ownOrder: false,
    ownOrderSignals: [],
    whatsapp: false,
    reserva: false,
    imgKb: 300,
    heavyImgs: [],
    source: "live",
    auditedAt: new Date().toISOString(),
    ...over,
  } as AuditResult;
}

test("a site that declares itself a Dentist is read as a practice", () => {
  const v = classifyVertical(audit({ schemaTypes: ["Dentist", "LocalBusiness"] }));
  assert.equal(v.id, "appointment");
  assert.equal(v.confidence, "high");
  assert.match(v.evidence, /Dentist/);
});

test("a hotel linking to Booking.com is read as lodging, not as a restaurant", () => {
  const v = classifyVertical(
    audit({
      schemaTypes: ["Hotel"],
      marketplaces: [
        { platform: "Booking.com", url: "https://booking.com/hotel/x", vertical: "lodging" },
      ],
    })
  );
  assert.equal(v.id, "lodging");
  assert.match(v.evidence, /Booking\.com/);
});

test("the food path still works from the legacy aggregator field alone", () => {
  const v = classifyVertical(audit({ aggregators: ["Glovo", "JustEat"] }));
  assert.equal(v.id, "restaurant");
});

test("a site that says nothing about its trade is a business, not a guess", () => {
  const v = classifyVertical(audit());
  assert.equal(v.id, "generic");
  assert.equal(v.confidence, "low");
  assert.match(v.evidence, /could not tell/i);
});

test("every vertical carries the vocabulary and the period the report needs", () => {
  for (const [id, def] of Object.entries(VERTICALS)) {
    assert.equal(def.id, id);
    assert.ok(def.label.length > 0, `${id} needs a label`);
    assert.ok(PERIODS_PER_YEAR[def.ratePeriod] > 0, `${id} needs a real period`);
    for (const [key, value] of Object.entries(def.words)) {
      assert.ok(
        typeof value === "string" && value.length > 0,
        `${id} is missing the word for ${key}`
      );
    }
  }
});

test("the evidence line always names something the reader can check", () => {
  const v = classifyVertical(
    audit({ schemaTypes: ["Plumber"], title: "Urgencias 24h — presupuesto sin compromiso" })
  );
  assert.equal(v.id, "trade");
  assert.ok(v.evidence.length > 20);
  assert.ok(!v.evidence.includes("undefined"));
});
