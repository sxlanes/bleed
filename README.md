# Bleed

**Paste the URL of a local business. Get back how much money its website is losing, in euros, and the dossier to sell them the fix.**

Built for the AI Builders Hackathon 2026, inside the 21 Aug to 15 Sep build window.

## The problem

Three out of four Spanish restaurants that deliver do it through an aggregator that takes
between 13% and 35% of every order. Most of them already have their own ordering channel,
already paid for, sitting unused. Nobody has ever put a number on what that costs them.

Every figure this project produces is traceable to a cited source. The calibration constants,
their ranges and their provenance live in `investigacion/`.

## What it does

1. **Recon.** Crawls the site, identifies the stack, finds the ordering path, detects plugins,
   reads the store catalogue when the API is open, extracts hours, delivery links and contact.
2. **Detection.** Turns what it sees into concrete leaks, and decides which ones matter for
   this kind of business. A pizzeria and a dentist lose money in different places.
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

## Status

Early. See `investigacion/README.md` for the recon prototype.
