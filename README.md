# Bleed

**Paste the URL of a local business. Get back how much money its website is losing, in euros, and the dossier to sell them the fix.**

Built for the AI Builders Hackathon 2026, inside the 21 Aug to 15 Sep build window.

## The problem

Three out of four Spanish restaurants that deliver do it through an aggregator that takes
between 13% and 35% of every order. Most of them already have their own ordering channel,
already paid for, sitting unused. Nobody has ever put a number on what that costs them.

Every figure this project produces is traceable to a cited source. The calibration constants,
their ranges, their provenance and the warnings on the weak ones live in `lib/calibracion.ts`.
Numbers with no published source are labelled `team estimate` on screen rather than dressed up.

## What it does

1. **Recon.** Crawls the site, identifies the stack, finds the ordering path, detects plugins,
   reads the store catalogue when the API is open, extracts hours, delivery links and contact.
2. **Detection.** Turns what it sees into concrete leaks and ranks them by what they cost.
   Calibrated for restaurants with delivery; other trades are on the roadmap, not in the build.
3. **Quantification.** Each leak becomes euros per year **with its assumption on screen**.
   When the owner's data is missing, it says so instead of inventing a number.
4. **Dossier.** Writes the case for that specific owner, who is not technical, in their language.
5. **Proof.** One mockup screen of the fix, built from their real catalogue when available.

## Field study

The quantification is calibrated against real businesses, not assumptions. 163 restaurant
websites in Málaga were sampled from OpenStreetMap and 132 audited one by one.

| Finding | Result |
|---|---|
| Time to first byte over 1.5 s | 59 of 132 |
| Over 2 MB of images on the homepage | 35 of 132 |
| End-of-life PHP announced in headers | 8 |
| Open WooCommerce Store API | 10 |

The engine is public. The raw harvest is not: those are real businesses with their faults
listed, and publishing that list would be a different product than this one.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
BLEED_DEMOS=1 npm run dev   # also serves the pre-audited field cases
```

Live at **https://bleed-omega.vercel.app**. Next.js 16, TypeScript, deployed on Vercel.
The dossier writer uses Gemini and falls back to a deterministic template when no key is set.

The pre-audited field cases are real Málaga businesses that never agreed to have their
figures published, so they only resolve behind `BLEED_DEMOS=1` and never in production.
