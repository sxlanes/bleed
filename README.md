# Bleed

**Paste the URL of any business, anywhere. Get back how much money its website is losing, in its own currency, and the dossier to sell them the fix.**

Built for the AI Builders Hackathon 2026, inside the 21 Aug to 15 Sep build window.

## The problem

Three out of four Spanish restaurants that deliver do it through an aggregator that takes
between 13% and 35% of every order. Most of them already have their own ordering channel,
already paid for, sitting unused. Nobody has ever put a number on what that costs them.

That shape is not about food. A platform standing between a business and its customer and
charging for the introduction is Glovo for a pizzeria, Booking.com for a guesthouse,
Doctoralia for a dentist and Amazon for a shop. A page that takes four seconds to load loses
the customer whatever it sells. So Bleed prices the same leaks for any trade, and the trade
decides three things only: the words on screen, what one transaction is worth, and which
platforms to look for.

The audit reads whatever currency a site prices in — a bakery in London is told what it
loses in pounds — and falls back to euros only when it had to borrow a European average
instead of reading the business's own prices. It never converts at a rate it did not look up.

Every figure this project produces is traceable to a cited source. The calibration constants,
their ranges, their provenance and the warnings on the weak ones live in `lib/calibracion.ts`
(restaurants) and `lib/calibracion-verticales.ts` (every other trade), with the research trail
in `investigacion/calibracion-verticales.md`. Numbers with no published source are labelled
`team estimate` on screen, next to the figure, rather than dressed up.

## What it does

1. **Recon.** Crawls the site, identifies the stack, finds the path to a sale, detects plugins,
   reads the catalogue when the API is open, extracts the structured data the site declares
   about itself, the platforms it links out to, every way it can be contacted, and the prices
   it publishes.
2. **Reading the trade.** Decides what kind of business this is from its own schema.org types,
   the platforms it links to and how it writes — and shows the evidence on screen. When the
   site declares nothing, the model that already reads it for triage may name the trade, and
   the report says which of the two answered. When neither can tell, it says so and prices
   only the leaks that hold for any business. Guessing a trade to unlock a bigger number
   would be the same sin as inventing the number.
3. **Detection.** Turns what it sees into concrete leaks and ranks them by what they cost.
   Seven trades are calibrated: food service, retail, lodging, appointment practices, on-site
   trades, professional practices, and an honest fallback for anything else.
4. **Quantification.** Each leak becomes euros per year **with its assumption on screen**.
   When the owner's data is missing, it says so instead of inventing a number. When the site
   publishes its own prices, the median of those beats any national average, and the report
   says it was measured rather than assumed.
5. **Dossier.** Writes the case for that specific owner, who is not technical, in their language.
6. **Proof.** One mockup screen of the fix, built from their real catalogue when available.

## Field study

The quantification is calibrated against real businesses, not assumptions. The first sample
was local because that is what could be audited by hand in the build window: 163 restaurant
websites in Málaga were pulled from OpenStreetMap and 132 audited one by one. The engine is
not bound to that city or that trade — the sample is where the restaurant constants come
from, and the report says so on the line where each one is used.

| Finding | Result |
|---|---|
| Time to first byte over 1.5 s | 59 of 132 |
| Over 2 MB of images on the homepage | 35 of 132 |
| End-of-life PHP announced in headers | 8 |
| Open WooCommerce Store API | 10 |

The engine is public. The raw harvest is not: those are real businesses with their faults
listed, and publishing that list would be a different product than this one.

The restaurant constants come from that study and from published sector figures. The other
six trades were calibrated afterwards from public sources — INE for hotel rates, Amazon's and
Treatwell's own published fees, Habitissimo's quote data — and where no published figure
exists, the constant is marked as ours and the report says so on screen. Fifteen of the
twenty-eight calibration constants are team estimates today, and every one of them names
itself as such next to the euros it produces. The generic fallback is four estimates out of
four, by construction: there is no publishable average for "some business".

## How it crawls

The audit reads someone else's website, so the rules are in the code, not in a promise:

- **It says who it is.** `BleedAuditBot/1.0` with a contact URL. No spoofed browser string.
- **It asks first.** `robots.txt` is fetched and parsed before anything else. A disallow
  that names our agent, or a blanket disallow of the root, ends the audit and the report
  says why. An unreachable `robots.txt` is not consent, but it is not a refusal either.
- **It goes slowly.** Image checks run in batches of three with a pause between them.
  On the other end is a small restaurant's server.
- **It never touches the aggregators.** Comparing a dish's price against Glovo or Uber
  Eats would be the most persuasive thing this product could show. Getting it would mean
  defeating a deliberate block and disguising our traffic, so we do not. The commission
  rate is cited from published sector figures and the report says where it comes from.

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
