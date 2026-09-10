# Devpost submission — copy and paste

Everything below is ready to paste into the Devpost form. Written in English.

---

## Project name

**Bleed**

## Tagline (one line)

Paste a local restaurant's URL and find out, in euros a year, what its website is costing it.

## Links

| Field | Value |
|---|---|
| Try it out | https://bleed-omega.vercel.app |
| GitHub repository | https://github.com/sxlanes/bleed |
| Demo video | *(paste the YouTube unlisted link once recorded)* |
| Presentation deck | *(paste link, or upload the PDF exported from `entrega/deck.html`)* |

## Built with

`next.js` `typescript` `react` `google-gemini` `vercel` `node.js` `openstreetmap` `playwright`

---

## Inspiration

Three out of four Spanish restaurants that deliver do it through an aggregator that takes
between 13 and 35 percent of every order. Almost all of them already have their own
ordering channel, already paid for, sitting unused.

The owners are not unaware that this hurts. They are unable to size it. There is no tool
that says "this specific decision costs you this specific amount per year". Without a
number, nothing changes.

We wanted to build the thing that produces that number, and produces it honestly.

## What it does

You paste the URL of a local restaurant. In about a minute Bleed:

1. **Crawls the site** and measures what is actually there: the stack, the ordering path,
   time to first byte, image weight, links out to aggregators, opening hours from
   schema.org, and the full product catalogue when the WooCommerce Store API is open.
2. **Triages the leaks with a model.** A structured-output pass over Gemini reads the
   facts, decides which leaks from a closed catalogue actually apply to this business,
   ranks them, and explains why each one matters *here* rather than in general.
3. **Prices each leak deterministically** against seven calibrated constants, each of
   which carries its source, its date, its range, and a written warning when the source
   is weak.
4. **Writes the dossier** for the owner, who is not technical, in the language of margin
   and cash rather than code.
5. **Lets the owner correct us.** Every assumption is a live slider. Their real numbers
   beat our national averages, and the report recalculates as they move.

The rule that governs the whole product: **no figure appears without the assumption
behind it visible on screen.** When a number needs data only the owner has, the report
says so instead of inventing it.

## How we built it

**Next.js 16 and TypeScript, deployed on Vercel. Google Gemini for the two model stages.**

The architecture is four stages across two engines, and the split between them is the
main design decision:

| Stage | Engine | What it does |
|---|---|---|
| recon | deterministic | Fetch, parse, measure. Facts only. |
| triage | gemini-3.6-flash | Structured output. Picks and ranks leaks from a closed catalogue. Returns judgement, never euros. |
| quantify | deterministic | Arithmetic over cited constants. Auditable and repeatable. |
| dossier | gemini-3.6-flash | Writes the owner's case, with a deterministic template as fallback. |

**The model judges, the code calculates.** Letting a language model produce revenue
figures for a real business is a hallucination waiting to be quoted back at someone who
will act on it. Letting it decide what matters for a particular venue is exactly what it
is good at. Every model output is validated against the closed catalogue before it is
used, and any leak the model invents is discarded.

The calibration is not guesswork. We sampled 163 restaurant websites in Málaga from
OpenStreetMap and audited 132 of them one by one to check our constants against reality.

## Challenges we ran into

**Sourcing the constants honestly was harder than building the product.** The obvious
figures for this domain come from companies selling the fix. Two constants proposed
during development were rejected outright once we checked: one cited a restaurant
ordering software vendor, the other cited Meta on the value of WhatsApp Business. Both
were vendors quantifying the value of their own product. They now live in the codebase as
qualitative signals that flag friction but compute no euros.

**Aggregators block automated access.** Comparing the same dish's price on the
restaurant's own site against the aggregator would have been the most persuasive single
moment in the product. Doing it would have meant defeating a deliberate block and
disguising our traffic. We decided not to build it. The commission figure is cited from
published sector rates instead, and the report says where it comes from.

**Sites built as client-rendered single-page apps return an empty document.** Our recon
reads HTML and headers, so those sites currently produce a thin report. Rather than
paper over it, the report declares what it could not read.

## Accomplishments we are proud of

- **Every euro traces to a source with a date**, and the weak sources carry their warning
  in the codebase, not in a footnote nobody reads.
- **A real field study**, 132 sites audited by hand, rather than assumed benchmarks.
- **We said no to the two things that would have made the demo better and the product
  worse**: scraping the aggregators, and using vendor-funded statistics to compute money.
- **The businesses we audited are never named publicly.** They never agreed to have their
  figures published, so the pre-audited cases only resolve behind an environment flag and
  never in production.

## What we learned

That the hard part of putting a number on something is not the arithmetic, it is earning
the right to state it. The moment you show a real business owner a figure, you own it.
That pressure changed most of our engineering decisions: the closed catalogue, the
structured-output validation, the visible assumptions, the refusal to let the model
anywhere near a euro.

We also learned that "the AI does everything" is the wrong instinct. The best version of
this product uses a model for exactly the two things a model is better at than code, and
nothing else.

## What's next for Bleed

- **A browser tier in the recon** so that JavaScript-rendered sites return a full report
  rather than an honest but thin one.
- **Other trades.** Dentists, gyms and salons lose money in different places than
  restaurants. Each one needs its own calibrated constants, which means its own field
  study. No claims until that work is done.
- **Batch mode for agencies.** A postcode in from OpenStreetMap, a ranked list of leads
  out, each with its own dossier.
- **The standing rule.** Every new constant carries a citable source and a date, or it
  does not compute euros.
