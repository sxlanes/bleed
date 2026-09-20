export interface PageSpeedData {
  performanceScore: number | null;   // 0-1
  seoScore: number | null;           // 0-1
  accessibilityScore: number | null; // 0-1
  lcp: number | null;                // ms
  tbt: number | null;                // ms
  cls: number | null;                // score
  ttfb: number | null;               // ms
  speedIndex: number | null;         // ms
  source: "google-psi" | "none";
}

/** Calls Google PageSpeed Insights API (free with a key, 25k/day).
 *  Returns real Lighthouse metrics for any URL on Earth.
 */
export async function getPageSpeedData(url: string): Promise<PageSpeedData> {
  const apiKey = process.env.GOOGLE_PSI_API_KEY;
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
    ...(apiKey ? { key: apiKey } : {}),
  });

  try {
    const res = await fetch(`${endpoint}?${params}`, {
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      console.warn(`[PSI] API returned ${res.status} for ${url}`);
      return emptyPSI();
    }

    const data = await res.json();
    if (data?.error) {
      console.warn(`[PSI] API error: ${data.error.message}`);
      return emptyPSI();
    }

    const cats = data?.lighthouseResult?.categories ?? {};
    const audits = data?.lighthouseResult?.audits ?? {};

    return {
      performanceScore: cats.performance?.score ?? null,
      seoScore: cats.seo?.score ?? null,
      accessibilityScore: cats.accessibility?.score ?? null,
      lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
      tbt: audits["total-blocking-time"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      ttfb: audits["server-response-time"]?.numericValue ?? null,
      speedIndex: audits["speed-index"]?.numericValue ?? null,
      source: "google-psi",
    };
  } catch (e) {
    console.warn(`[PSI] fetch failed for ${url}:`, e);
    return emptyPSI();
  }
}

function emptyPSI(): PageSpeedData {
  return {
    performanceScore: null,
    seoScore: null,
    accessibilityScore: null,
    lcp: null,
    tbt: null,
    cls: null,
    ttfb: null,
    speedIndex: null,
    source: "none",
  };
}

/** Estimates monthly visits using multiple signals with sensible fallbacks.
 *  Priority: SimilarWeb Official → RapidAPI → Smart Heuristic
 */
export async function getTrafficData(domain: string): Promise<{ visits: number; source: string }> {
  // Option 1: Official SimilarWeb API
  const swKey = process.env.SIMILARWEB_API_KEY;
  if (swKey) {
    try {
      const res = await fetch(
        `https://api.similarweb.com/v1/website/${domain}/total-traffic-and-engagement/visits?api_key=${swKey}&start_date=2023-01&end_date=2023-01&main_domain_only=false&granularity=monthly`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const data = await res.json();
        const visits = data?.visits?.[0]?.visits;
        if (visits && !isNaN(visits)) {
          return { visits: Math.round(visits), source: "SimilarWeb" };
        }
      }
    } catch {}
  }

  // Option 2: RapidAPI traffic providers (try multiple hosts)
  const rapidKey = process.env.RAPIDAPI_KEY;
  if (rapidKey) {
    const providers = [
      { host: "website-traffic.p.rapidapi.com", path: `/traffic-data?domain=${domain}` },
      { host: "website-traffic2.p.rapidapi.com", path: `/traffic?domain=${domain}` },
    ];
    for (const p of providers) {
      try {
        const res = await fetch(`https://${p.host}${p.path}`, {
          headers: { "x-rapidapi-key": rapidKey, "x-rapidapi-host": p.host },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const data = await res.json();
          const visits =
            data?.total_visits ??
            data?.visits ??
            data?.data?.total_visits ??
            data?.estimatedMonthlyVisits;
          if (visits && !isNaN(Number(visits))) {
            return { visits: Math.round(Number(visits)), source: "RapidAPI Traffic" };
          }
        }
      } catch {}
    }
  }

  // Option 3: Smart domain-signal heuristic
  return { visits: smartTrafficEstimate(domain), source: "Estimated (domain signals)" };
}

/** Returns a plausible monthly visit estimate based on domain signals.
 *  Uses Alexa-like tiers: global giants → national brands → local SMBs
 */
function smartTrafficEstimate(domain: string): number {
  const d = domain.toLowerCase();

  // Global tech giants & major brands
  const giants = ["apple", "google", "amazon", "meta", "microsoft", "netflix",
    "youtube", "twitter", "x.com", "instagram", "tiktok", "linkedin", "spotify"];
  if (giants.some((g) => d.includes(g))) return 500_000_000;

  // Large national/regional brands (>1M visits)
  const large = ["booking", "airbnb", "glovo", "ubereats", "tripadvisor",
    "idealista", "fotocasa", "el-corte-ingles", "zara", "mango", "elconfidencial",
    "elmundo", "elpais", "marca", "as.com", "rtve", "mediapro"];
  if (large.some((g) => d.includes(g))) return 5_000_000;

  // Medium national companies
  if (d.endsWith(".com") && d.split(".").length === 2) return 80_000;

  // Local SMBs (.es / short domains / local signals)
  const localSignals = [".es", "restaurante", "hotel", "clinica", "farmacia",
    "peluqueria", "bar", "cafeteria", "pizzeria", "horno", "panaderia"];
  if (localSignals.some((s) => d.includes(s))) return 1_800;

  // Default mid-tier
  return 8_000;
}
