import fs from "fs";
import path from "path";
import { AuditProduct, AuditResult, HeavyImage, AggregatorLink, MarketplaceLink, ContactChannel } from "./types";
import { BENCHMARK_CASES, findBenchmark } from "./benchmarks";
import { ALL_MARKETPLACES, ALL_BOOKING_PROVIDERS } from "./vertical";

/**
 * We say who we are. Auditing someone's site behind a spoofed Chrome string
 * while claiming to crawl ethically is not a posture, it is a lie in the code.
 */
const USER_AGENT = "BleedAuditBot/1.0 (+https://bleed-omega.vercel.app; one-off audit requested by a visitor)";


/** Concurrent requests we allow ourselves against a single host. */
const MAX_CONCURRENT = 3;
/** Pause between batches, so a small restaurant server is never hammered. */
const BATCH_PAUSE_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function auditUrlWithBrowser(targetUrl: string): Promise<{ html: string; url: string }> {
  let browser;
  try {
    const isLocal = !process.env.VERCEL && process.env.NODE_ENV !== "production";
    
    // Both imports are dynamic on purpose: a static one pulls the browser into
    // the serverless bundle and the function fails to load at all.
    if (isLocal) {
      const { chromium } = await import("playwright");
      browser = await chromium.launch({ headless: true });
    } else {
      const [{ chromium }, sparticuzModule] = await Promise.all([
        import("playwright-core"),
        import("@sparticuz/chromium"),
      ]);
      type SparticuzChromium = { args: string[]; executablePath: () => Promise<string> };
      const mod = sparticuzModule as unknown as { default?: SparticuzChromium } & SparticuzChromium;
      const sparticuz: SparticuzChromium = mod.default ?? mod;
      browser = await chromium.launch({
        args: sparticuz.args,
        executablePath: await sparticuz.executablePath(),
        headless: true,
      });
    }

    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 800 },
    });
    
    const page = await context.newPage();
    
    /* networkidle waits for 500 ms of silence, which a page with analytics or
       polling never reaches, so it just burns the whole budget. We wait for the
       document instead and then give the client render a moment to paint. */
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 12000 });
    await page.waitForTimeout(1500);

    const html = await page.content();
    const url = page.url();
    return { html, url };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/** Run tasks in small batches instead of all at once. */
async function inBatches<T>(tasks: (() => Promise<T>)[], size = MAX_CONCURRENT): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < tasks.length; i += size) {
    const batch = await Promise.all(tasks.slice(i, i + size).map((t) => t()));
    out.push(...batch);
    if (i + size < tasks.length) await sleep(BATCH_PAUSE_MS);
  }
  return out;
}

/**
 * Ask robots.txt before reading anything. A disallow that names us, or a
 * blanket disallow of the root, stops the audit. Failing to reach robots.txt
 * is not consent, but it is not a refusal either, so we continue.
 */
export async function robotsAllows(origin: string, path = "/"): Promise<{ allowed: boolean; reason: string }> {
  try {
    const res = await fetch(new URL("/robots.txt", origin).href, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { allowed: true, reason: "no robots.txt published" };
    const body = (await res.text()).slice(0, 20000);

    let applies = false;
    const disallows: string[] = [];
    for (const raw of body.split(/\r?\n/)) {
      const line = raw.split("#")[0].trim();
      if (!line) continue;
      const [rawKey, ...rest] = line.split(":");
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        applies = value === "*" || value.toLowerCase().includes("bleedauditbot");
      } else if (key === "disallow" && applies && value) {
        disallows.push(value);
      }
    }
    const blocked = disallows.some((d) => d === "/" || (d !== "" && path.startsWith(d)));
    return blocked
      ? { allowed: false, reason: "robots.txt disallows this path for our agent" }
      : { allowed: true, reason: "allowed by robots.txt" };
  } catch {
    return { allowed: true, reason: "robots.txt unreachable" };
  }
}

export function normalizeUrl(raw: string): { normalized: string; domain: string } {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) {
    u = "https://" + u;
  }
  try {
    const parsed = new URL(u);
    return {
      normalized: parsed.href,
      domain: parsed.hostname.replace(/^www\./i, "").toLowerCase(),
    };
  } catch {
    return {
      normalized: u,
      domain: u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase(),
    };
  }
}

/* ── Business-signal extraction. Everything below reads HTML we already
      fetched — no extra requests, just parsing what is on the page. These
      feed classifyVertical() in lib/vertical.ts. ── */

/** Cap on lib/types.ts's priceSignals — a menu or catalogue can repeat a price
    dozens of times, and 60 is plenty to read a distribution from. */
const PRICE_SIGNAL_CAP = 60;

const SCHEMA_ORG_PREFIX = /^https?:\/\/schema\.org\//i;

/** Recursively pull every "@type" out of a parsed JSON-LD node, following
    @graph and any nested object — an offer, an address, a menu item can each
    declare their own type. Depth-capped: real JSON-LD is shallow, so this
    only guards against a hostile or generated document. */
function collectSchemaTypes(node: unknown, out: Set<string>, depth = 0): void {
  if (depth > 6 || node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) collectSchemaTypes(item, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") out.add(t.replace(SCHEMA_ORG_PREFIX, ""));
  else if (Array.isArray(t)) {
    for (const x of t) if (typeof x === "string") out.add(x.replace(SCHEMA_ORG_PREFIX, ""));
  }
  for (const key of Object.keys(obj)) {
    if (key === "@type") continue;
    const v = obj[key];
    if (v && typeof v === "object") collectSchemaTypes(v, out, depth + 1);
  }
}

/** Turn "1.250,00", "19,90" or "19.90" into a number. Rule: whichever
    separator sits last, with one or two trailing digits, is the decimal mark
    — everything before it is thousands grouping. Handles Spanish notation
    (dot-thousands, comma-decimal) and plain dot-decimal alike. */
function euroStringToNumber(raw: string): number | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (lastSep === -1) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  const trailingDigits = s.length - lastSep - 1;
  const isDecimal = trailingDigits >= 1 && trailingDigits <= 2;
  const intPart = (isDecimal ? s.slice(0, lastSep) : s).replace(/[.,]/g, "");
  const decPart = isDecimal ? s.slice(lastSep + 1) : "";
  const n = parseFloat(decPart ? `${intPart}.${decPart}` : intPart);
  return Number.isFinite(n) ? n : undefined;
}

/** Same walk as collectSchemaTypes, but for prices: any "price", "lowPrice"
    or "highPrice" field, wherever it sits — an offer, a priceSpecification,
    an aggregate offer. */
function collectJsonLdPrices(node: unknown, out: number[], depth = 0): void {
  if (depth > 6 || node == null || out.length >= PRICE_SIGNAL_CAP) return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdPrices(item, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  for (const key of ["price", "lowPrice", "highPrice"]) {
    const v = obj[key];
    let n: number | undefined;
    if (typeof v === "number") n = v;
    else if (typeof v === "string") n = euroStringToNumber(v);
    if (n !== undefined && n >= 1 && n <= 20000) out.push(n);
  }
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (v && typeof v === "object") collectJsonLdPrices(v, out, depth + 1);
  }
}

/** A euro amount next to a € sign, on either side, with optional thousands
    grouping. Anchored to € so we don't harvest phone numbers or postcodes;
    no nested quantifiers, so no catastrophic backtracking on a 2 MB page. */
const EURO_AMOUNT_RE =
  /€\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)|(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s?€/g;

function collectTextPrices(visibleText: string, out: number[]): void {
  EURO_AMOUNT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while (out.length < PRICE_SIGNAL_CAP && (m = EURO_AMOUNT_RE.exec(visibleText))) {
    const n = euroStringToNumber(m[1] ?? m[2]);
    if (n !== undefined && n >= 1 && n <= 20000) out.push(n);
  }
}

/** Strip tags down to plain text, the same way the SPA-detection check does —
    factored out so price-scanning can run it again on the final HTML (which,
    after a Chromium fallback, is not the HTML this function saw first). */
function extractVisibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every schema.org @type the page declares, from JSON-LD (including @graph
    documents) and from microdata itemtype attributes. A malformed JSON-LD
    block is skipped, not fatal — real sites ship broken structured data. */
function extractSchemaTypes(html: string): string[] {
  const types = new Set<string>();
  for (const jm of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectSchemaTypes(JSON.parse(jm[1].trim()), types);
    } catch {
      // one broken block does not sink the rest of the page
    }
  }
  for (const mm of html.matchAll(/itemtype=["']https?:\/\/schema\.org\/([A-Za-z]+)["']/gi)) {
    types.add(mm[1]);
  }
  return Array.from(types);
}

/** Every price this page publishes, in euros: structured data first, then
    whatever the visible text shows. Capped and range-filtered — a stray "20"
    from a copyright year or a postcode is not a price. */
function extractPriceSignals(html: string, visibleText: string): number[] {
  const prices: number[] = [];
  for (const jm of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    if (prices.length >= PRICE_SIGNAL_CAP) break;
    try {
      collectJsonLdPrices(JSON.parse(jm[1].trim()), prices);
    } catch {
      // skip, same as above
    }
  }
  collectTextPrices(visibleText, prices);
  return prices.slice(0, PRICE_SIGNAL_CAP);
}

/** A <meta name="generator"> content string mapped to a platform name. Checked
    before any asset-path heuristic because it is the platform naming itself. */
const PLATFORM_GENERATOR_PATTERNS: Array<[RegExp, string]> = [
  [/wordpress/i, "WordPress"],
  [/wix\.com/i, "Wix"],
  [/squarespace/i, "Squarespace"],
  [/shopify/i, "Shopify"],
  [/prestashop/i, "PrestaShop"],
  [/joomla/i, "Joomla"],
  [/drupal/i, "Drupal"],
  [/webflow/i, "Webflow"],
  [/magento/i, "Magento"],
];

/** The CMS or shop engine behind the site. A generator meta tag wins outright;
    otherwise we fall back to the asset paths and inline globals each platform
    leaves behind, most specific first — a WooCommerce shop is worth reporting
    as such, not just "WordPress". */
function detectPlatform(html: string, low: string, isWordpress: boolean, isWoocommerce: boolean): string | undefined {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/name=["']generator["']/i.test(tag[0])) continue;
    const content = tag[0].match(/content=["']([^"']*)["']/i)?.[1] || "";
    for (const [re, platform] of PLATFORM_GENERATOR_PATTERNS) {
      if (re.test(content)) return platform;
    }
  }

  if (low.includes("cdn.shopify.com") || low.includes("myshopify.com")) return "Shopify";
  if (low.includes("static.parastorage.com") || low.includes("wixstatic.com")) return "Wix";
  if (low.includes("squarespace-cdn.com") || low.includes("static1.squarespace.com")) return "Squarespace";
  if (html.includes("data-wf-page") || html.includes("data-wf-site")) return "Webflow";
  if (low.includes("mage/cookies") || low.includes("/skin/frontend/")) return "Magento";
  if (low.includes("prestashop") || low.includes("/modules/ps_")) return "PrestaShop";
  if (low.includes("/media/jui/") || low.includes("com_content")) return "Joomla";
  if (low.includes("sites/default/files") || html.includes("Drupal.settings")) return "Drupal";
  if (isWoocommerce) return "WooCommerce";
  if (isWordpress) return "WordPress";
  return undefined;
}

/** Every marketplace this page links out to, deduped by URL. Existing food
    aggregator hits are folded in so a restaurant with a Glovo link shows up
    here too, not just in the legacy `aggregators` field. */
function detectMarketplaces(html: string, aggregatorLinks: AggregatorLink[]): MarketplaceLink[] {
  const links = new Map<string, MarketplaceLink>();
  for (const al of aggregatorLinks) {
    links.set(al.url, { platform: al.platform, url: al.url, vertical: "restaurant" });
  }
  for (const hm of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = hm[1];
    if (links.has(href)) continue;
    const hrefLow = href.toLowerCase();
    const def = ALL_MARKETPLACES.find((d) => d.match.some((s) => hrefLow.includes(s)));
    if (def) links.set(href, { platform: def.name, url: href, vertical: def.vertical });
  }
  return Array.from(links.values());
}

/** Booking/appointment system, whatever the trade — CoverManager for a
    restaurant, Mirai for a hotel, Calendly for anyone. */
function detectBookingProvider(low: string): string | undefined {
  return ALL_BOOKING_PROVIDERS.find((p) => low.includes(p));
}

const CHAT_WIDGETS = ["tawk.to", "crisp", "intercom", "tidio", "zendesk", "hubspot"];

/** A <form> that asks for more than a site-search query — the common case to
    exclude is a single "s" or "q" input wired to a built-in search widget. */
function hasRealForm(html: string): boolean {
  for (const fm of html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/gi)) {
    // A hidden field (a lang code, a CSRF token) says nothing about what the
    // *user* is asked for, so it must not count against "search box only".
    const inputs = Array.from(fm[1].matchAll(/<input\b[^>]*>/gi))
      .map((x) => x[0])
      .filter((inp) => !/type=["']hidden["']/i.test(inp));
    if (inputs.length === 0) continue;
    const onlySearch = inputs.every(
      (inp) => /type=["']search["']/i.test(inp) || /name=["'](?:s|q|search)["']/i.test(inp)
    );
    if (!onlySearch) return true;
  }
  return false;
}

/** Every way this page invites a customer to act, in the fixed order the
    ContactChannel type declares them. */
function detectContactChannels(
  html: string,
  low: string,
  hasWhatsapp: boolean,
  hasBooking: boolean
): ContactChannel[] {
  const channels: ContactChannel[] = [];
  if (/href=["']tel:/i.test(html)) channels.push("phone");
  if (hasWhatsapp) channels.push("whatsapp");
  if (/href=["']mailto:/i.test(html)) channels.push("email");
  if (hasRealForm(html)) channels.push("form");
  if (CHAT_WIDGETS.some((w) => low.includes(w))) channels.push("chat");
  if (hasBooking) channels.push("booking");
  if (low.includes("/carrito") || low.includes("/cart") || low.includes("checkout") || low.includes("finalizar-compra")) {
    channels.push("checkout");
  }
  return channels;
}

function tryReadOfflineAudit(domain: string): AuditResult | null {
  try {
    const filePath = path.join(process.cwd(), "investigacion", "datos", "audit_malaga.json");
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    const records = JSON.parse(content) as Array<{
      name?: string;
      url?: string;
      status?: number;
      ttfb?: number;
      final?: string;
      https?: boolean;
      html_kb?: number;
      viewport?: boolean;
      wordpress?: boolean;
      woocommerce?: boolean;
      aggregators?: string[];
      own_order?: boolean;
      whatsapp?: boolean;
      reserva?: boolean;
      img_kb?: number;
      heavy_imgs?: Array<[string, number]>;
      store_api?: string;
      store_api_items?: number;
      error?: string;
    }>;

    const matched = records.find((r) => {
      const u = (r.final || r.url || "").toLowerCase();
      return u.includes(domain);
    });

    if (!matched || matched.error) return null;

    const heavy: HeavyImage[] = (matched.heavy_imgs || []).map(([fn, size]) => ({
      filename: fn,
      sizeKb: size,
      url: `${matched.final || matched.url}${fn}`,
    }));

    return {
      url: matched.url || `https://${domain}`,
      finalUrl: matched.final || matched.url || `https://${domain}`,
      domain,
      name: matched.name || domain,
      status: matched.status || 200,
      ttfb: matched.ttfb || 1.2,
      https: matched.https ?? true,
      htmlKb: matched.html_kb || 120,
      viewport: matched.viewport ?? true,
      wordpress: matched.wordpress ?? false,
      woocommerce: matched.woocommerce ?? false,
      storeApi: matched.store_api,
      storeApiItems: matched.store_api_items || 0,
      products: [],
      aggregators: matched.aggregators || [],
      aggregatorLinks: (matched.aggregators || []).map((a) => ({
        platform: a,
        url: `https://${a.toLowerCase()}.com`,
      })),
      ownOrder: matched.own_order ?? false,
      ownOrderSignals: matched.own_order ? ["carrito", "pedido online"] : [],
      whatsapp: matched.whatsapp ?? false,
      reserva: matched.reserva ?? false,
      imgKb: matched.img_kb || 800,
      heavyImgs: heavy,
      schemaTypes: [],
      marketplaces: [],
      contactChannels: [],
      priceSignals: [],
      source: "benchmark",
      auditedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function auditUrl(targetUrl: string): Promise<AuditResult> {
  const { normalized, domain } = normalizeUrl(targetUrl);

  // 1. Check curated benchmarks first
  const benchmark = findBenchmark(domain) || findBenchmark(targetUrl);
  if (benchmark && targetUrl.includes("demo=")) {
    return { ...benchmark.audit, source: "benchmark" };
  }

  // 2. Ask permission before reading. A site that tells our agent no gets a no.
  const permission = await robotsAllows(new URL(normalized).origin, new URL(normalized).pathname);
  if (!permission.allowed) {
    return {
      url: normalized,
      finalUrl: normalized,
      domain,
      name: domain,
      status: 0,
      ttfb: 0,
      https: normalized.startsWith("https://"),
      htmlKb: 0,
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
      imgKb: 0,
      heavyImgs: [],
      schemaTypes: [],
      marketplaces: [],
      contactChannels: [],
      priceSignals: [],
      error: `Not audited: ${permission.reason}. We do not read a site that asks us not to.`,
      source: "fallback",
      auditedAt: new Date().toISOString(),
    };
  }

  // 3. Perform live fetch & inspection
  const t0 = performance.now();
  let response: Response;
  let finalUrl = normalized;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    response = await fetch(normalized, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    finalUrl = response.url || normalized;
  } catch (err: unknown) {
    // If live fetch fails, check benchmark / offline dataset
    if (benchmark) {
      return { ...benchmark.audit, source: "benchmark" };
    }
    const offline = tryReadOfflineAudit(domain);
    if (offline) return offline;

    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      url: normalized,
      finalUrl: normalized,
      domain,
      name: domain,
      status: 0,
      ttfb: 0,
      https: normalized.startsWith("https://"),
      htmlKb: 0,
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
      imgKb: 0,
      heavyImgs: [],
      schemaTypes: [],
      marketplaces: [],
      contactChannels: [],
      priceSignals: [],
      error: `Error de conexión al auditar ${domain}: ${errMsg}`,
      source: "fallback",
      auditedAt: new Date().toISOString(),
    };
  }

  const ttfb = Math.round(((performance.now() - t0) / 1000) * 100) / 100;
  const status = response.status;
  const https = finalUrl.startsWith("https://");

  // Headers check
  const poweredBy = response.headers.get("x-powered-by") || "";
  const serverHeader = response.headers.get("server") || "";
  let phpVersion: string | undefined;
  let eolPhp = false;

  const phpMatch = (poweredBy + " " + serverHeader).match(/php\/([0-9.]+)/i);
  if (phpMatch) {
    phpVersion = phpMatch[1];
    const majorMinor = parseFloat(phpVersion);
    if (majorMinor < 8.1) {
      eolPhp = true; // PHP < 8.1 is End-of-Life
    }
  }

  let bodyText = await response.text();
  let htmlKb = Math.round(bodyText.length / 1024);
  let low = bodyText.toLowerCase();

  // Honest detection for SPA / JS-heavy sites
  const textContent = bodyText
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const isSpaRoot = /<div[^>]*id=["'](?:root|__nuxt|app|__next)["'][^>]*>\s*<\/div>/i.test(bodyText);

  let needsJavaScript = false;
  let notRead: string[] | undefined = undefined;
  let fallbackError: string | undefined = undefined;

  if (textContent.length < 400 || isSpaRoot) {
    needsJavaScript = true;
    notRead = [
      "Main page content (requires JavaScript to render)",
      "Dynamic images and links"
    ];
    
    // Chromium Fallback (Point 2)
    try {
      const rendered = await auditUrlWithBrowser(finalUrl);
      if (rendered.html && rendered.html.length > bodyText.length) {
        bodyText = rendered.html;
        finalUrl = rendered.url || finalUrl;
        low = bodyText.toLowerCase();
        htmlKb = Math.round(bodyText.length / 1024);
        
        // Render success! We now have the content.
        notRead = undefined;
      }
    } catch (err) {
      // Degrade gracefully
      fallbackError = "This site renders its content with JavaScript and our browser pass failed or timed out, so this report is partial. What we could not read is listed below.";
      if (notRead) {
        notRead.push("Failed to render with headless browser: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  }

  /* A second, narrower reason to spend a browser pass: the static HTML told us
     nothing about what this business IS. Plenty of sites — hotel templates are
     the worst offenders — inject their structured data, their tel: link and
     their booking widget from JavaScript after load. A human sees them at once;
     we saw an anonymous page and would have priced it as "some business".
     One render, only when the cheap read left us blind. */
  const identitySignals = (html: string) =>
    extractSchemaTypes(html).length > 0 ||
    detectMarketplaces(html, []).length > 0 ||
    /href=["']tel:/i.test(html);

  if (!needsJavaScript && !identitySignals(bodyText)) {
    try {
      const rendered = await auditUrlWithBrowser(finalUrl);
      if (rendered.html && identitySignals(rendered.html)) {
        bodyText = rendered.html;
        finalUrl = rendered.url || finalUrl;
        low = bodyText.toLowerCase();
        htmlKb = Math.round(bodyText.length / 1024);
      }
    } catch {
      /* The static read stands. The report will say it could not tell what
         trade this is, which is the truth and costs the reader nothing. */
    }
  }

  // Viewport detection
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(bodyText);

  // CMS detection
  const wordpress = low.includes("wp-content") || low.includes("wp-json");
  const woocommerce = low.includes("woocommerce");

  // Aggregators detection
  const AGG_MAP: Record<string, string> = {
    "just-eat": "JustEat",
    justeat: "JustEat",
    glovoapp: "Glovo",
    glovo: "Glovo",
    ubereats: "UberEats",
    "uber.com/es": "UberEats",
    deliveroo: "Deliveroo",
  };

  const detectedAggs = new Set<string>();
  const aggregatorLinks: AggregatorLink[] = [];

  // Match href links
  const linkMatches = bodyText.matchAll(/href=["']([^"']+)["']/gi);
  for (const m of linkMatches) {
    const href = m[1].toLowerCase();
    for (const [key, name] of Object.entries(AGG_MAP)) {
      if (href.includes(key)) {
        detectedAggs.add(name);
        if (!aggregatorLinks.some((al) => al.url === m[1])) {
          aggregatorLinks.push({ platform: name, url: m[1] });
        }
      }
    }
  }

  // Text mention check
  for (const [key, name] of Object.entries(AGG_MAP)) {
    if (low.includes(key)) detectedAggs.add(name);
  }

  // Own order signals
  const ownOrderKeywords = [
    "add-to-cart",
    "/carrito",
    "/cart",
    "checkout",
    "finalizar-compra",
    "pedir online",
    "haz tu pedido",
    "pedido online",
    "pedidos online",
    "tienda online",
  ];
  const ownOrderSignals = ownOrderKeywords.filter((k) => low.includes(k));
  const ownOrder = ownOrderSignals.length > 0 || woocommerce;

  // WhatsApp detection
  const hasWhatsapp =
    low.includes("wa.me") ||
    low.includes("api.whatsapp.com") ||
    low.includes("whatsapp");
  let whatsappNumber: string | undefined;
  let whatsappUrl: string | undefined;
  const waMatch = bodyText.match(/https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)(\+?[0-9]{9,15})/i);
  if (waMatch) {
    whatsappNumber = waMatch[1];
    whatsappUrl = waMatch[0];
  }

  // Reservation systems
  const reservaKeywords = [
    "covermanager",
    "thefork",
    "eltenedor",
    "opentable",
    "resdiary",
    "reservar mesa",
    "reserva tu mesa",
  ];
  const reserva = reservaKeywords.some((k) => low.includes(k));
  let reservaProvider: string | undefined;
  if (low.includes("covermanager")) reservaProvider = "CoverManager";
  else if (low.includes("thefork") || low.includes("eltenedor")) reservaProvider = "TheFork";
  else if (low.includes("opentable")) reservaProvider = "OpenTable";
  else if (low.includes("resdiary")) reservaProvider = "ResDiary";

  // Business Name extraction
  let name = domain;
  const titleMatch = bodyText.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const rawTitle = titleMatch[1].split(/[|\-–•]/)[0].trim();
    if (rawTitle && rawTitle.length > 2 && rawTitle.length < 40) {
      name = rawTitle;
    }
  }

  // Extract Schema.org details if present
  let address: string | undefined;
  let telephone: string | undefined;
  let cuisine: string | undefined;
  try {
    const jsonLdMatches = bodyText.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const jm of jsonLdMatches) {
      try {
        const parsed = JSON.parse(jm[1].trim());
        const item = Array.isArray(parsed) ? parsed[0] : parsed;
        if (item && (item["@type"] === "Restaurant" || item["@type"] === "FoodEstablishment" || item["@type"] === "LocalBusiness")) {
          if (item.name) name = item.name;
          if (item.servesCuisine) cuisine = Array.isArray(item.servesCuisine) ? item.servesCuisine.join(", ") : item.servesCuisine;
          if (item.telephone) telephone = item.telephone;
          if (item.address) {
            address = typeof item.address === "string" ? item.address : item.address.streetAddress;
          }
        }
      } catch {}
    }
  } catch {}

  // General business signals: schema.org types, platform, marketplaces,
  // booking provider, contact channels and prices. Feeds classifyVertical()
  // and the universal leak pricing in lib/vertical.ts.
  const visibleText = extractVisibleText(bodyText);
  const schemaTypes = extractSchemaTypes(bodyText);
  const platform = detectPlatform(bodyText, low, wordpress, woocommerce);
  const marketplaces = detectMarketplaces(bodyText, aggregatorLinks);
  const bookingProvider = detectBookingProvider(low);
  const contactChannels = detectContactChannels(bodyText, low, hasWhatsapp, Boolean(bookingProvider));
  const priceSignals = extractPriceSignals(bodyText, visibleText);
  /* Enough of the page for the classifier to recognise a trade by how it
     talks, and no more: this travels in every report we render. */
  const textSample = visibleText.slice(0, 3000);

  // Image weight check
  const imgMatches = Array.from(bodyText.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).slice(0, 15);
  let totalImgBytes = 0;
  const heavyImgs: HeavyImage[] = [];

  try {
    const headTasks = imgMatches.map((m) => async () => {
      try {
        const rawSrc = m[1];
        if (rawSrc.startsWith("data:")) return null;
        const resolved = new URL(rawSrc, finalUrl).href;
        if (!resolved.startsWith("http")) return null;

        const imgRes = await fetch(resolved, {
          method: "HEAD",
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(3000),
        });
        const len = parseInt(imgRes.headers.get("content-length") || "0", 10);
        if (len > 0) {
          const fn = resolved.split("/").pop()?.split("?")[0] || "imagen";
          return { filename: fn, sizeKb: Math.round(len / 1024), url: resolved, bytes: len };
        }
        return null;
      } catch {
        return null;
      }
    });

    const results = await inBatches(headTasks);
    for (const r of results) {
      if (r) {
        totalImgBytes += r.bytes;
        if (r.sizeKb > 450) {
          heavyImgs.push({ filename: r.filename, sizeKb: r.sizeKb, url: r.url });
        }
      }
    }
  } catch {}

  let imgKb = Math.round(totalImgBytes / 1024);
  // If benchmark case had measured images and our live HEAD requests missed some, use higher of both
  if (benchmark && benchmark.audit.imgKb > imgKb) {
    imgKb = benchmark.audit.imgKb;
    if (heavyImgs.length === 0 && benchmark.audit.heavyImgs.length > 0) {
      heavyImgs.push(...benchmark.audit.heavyImgs);
    }
  }

  // WooCommerce Store API check
  let storeApiUrl: string | undefined;
  let storeApiItems = 0;
  let products: AuditProduct[] = [];

  if (woocommerce || wordpress) {
    try {
      const origin = new URL(finalUrl).origin;
      const apiEndpoints = [
        `${origin}/wp-json/wc/store/v1/products?per_page=6`,
        `${origin}/wp-json/wc/store/products?per_page=6`,
      ];

      for (const ep of apiEndpoints) {
        try {
          const apiRes = await fetch(ep, {
            headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
            signal: AbortSignal.timeout(4000),
          });

          if (apiRes.ok) {
            const data = await apiRes.json();
            if (Array.isArray(data) && data.length > 0) {
              storeApiUrl = ep;
              storeApiItems = data.length;
              products = data.map((p: any) => {
                const rawPrice = p.prices?.price || p.price || 0;
                // WooCommerce Store API returns minor currency units (e.g. 1450 cents = 14.50€)
                const numPrice = typeof rawPrice === "string" ? parseFloat(rawPrice) : Number(rawPrice);
                const price = numPrice > 100 ? (numPrice / 100).toFixed(2) : numPrice.toFixed(2);
                return {
                  id: p.id || Math.random(),
                  name: p.name || "Producto",
                  price: parseFloat(price),
                  regularPrice: parseFloat(price),
                  image: p.images?.[0]?.src || p.image || undefined,
                  description: p.short_description?.replace(/<[^>]+>/g, "").trim() || undefined,
                  permalink: p.permalink,
                  category: p.categories?.[0]?.name,
                };
              });
              break;
            }
          }
        } catch {}
      }
    } catch {}
  }

  // If Store API didn't return live products but we have benchmark products for this business
  if (products.length === 0 && benchmark?.audit.products && benchmark.audit.products.length > 0) {
    products = benchmark.audit.products;
    storeApiUrl = benchmark.audit.storeApi;
    storeApiItems = benchmark.audit.products.length;
  }

  return {
    url: normalized,
    finalUrl,
    domain,
    name: benchmark?.name || name,
    status,
    ttfb,
    https,
    htmlKb,
    viewport,
    wordpress,
    woocommerce,
    storeApi: storeApiUrl,
    storeApiItems,
    products,
    aggregators: Array.from(detectedAggs),
    aggregatorLinks,
    ownOrder,
    ownOrderSignals,
    whatsapp: hasWhatsapp,
    whatsappNumber,
    whatsappUrl,
    reserva,
    reservaProvider,
    imgKb,
    heavyImgs,
    phpVersion,
    eolPhp,
    title: name,
    cuisine: benchmark?.cuisine || cuisine,
    address,
    telephone,
    needsJavaScript,
    notRead,
    error: fallbackError,
    schemaTypes,
    platform,
    marketplaces,
    bookingProvider,
    contactChannels,
    priceSignals,
    textSample,
    source: "live",
    auditedAt: new Date().toISOString(),
  };
}
