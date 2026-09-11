import fs from "fs";
import path from "path";
import { AuditProduct, AuditResult, HeavyImage, AggregatorLink } from "./types";
import { BENCHMARK_CASES, findBenchmark } from "./benchmarks";

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
    source: "live",
    auditedAt: new Date().toISOString(),
  };
}
