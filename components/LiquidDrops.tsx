"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dropletMapPixels, DropletGeometry } from "@/lib/droplet-optics";

/**
 * A few droplets of real water on the headline.
 *
 * The condensation behind them is painted on a canvas: cheap, and it can only
 * fake a lens with a gradient. These ones refract the page — the letters of
 * "bleeding" genuinely bend inside them — through an SVG displacement map
 * applied as a backdrop filter. The optics are QuickLiquid's Snell model; the
 * map is our own radial one (see lib/droplet-optics.ts for why).
 *
 * Refraction only reads where there is something behind to bend. Over flat red
 * a lens is a disc with a rim, which is what the first attempt looked like, so
 * the drops are anchored to the headline's own box.
 *
 * Backdrop filters with an SVG url() are a Chromium feature. Elsewhere the
 * drops keep their highlight and rim and simply do not bend what is behind.
 */

interface Drop {
  id: number;
  /** Width in px; the drop is 8% taller, because it hangs. */
  size: number;
  /** Percent of the headline's box. */
  x: number;
  y: number;
}

const DESKTOP_DROPS: Drop[] = [
  { id: 0, size: 78, x: 62, y: 24 },
  { id: 1, size: 54, x: 17, y: 70 },
  { id: 2, size: 36, x: 45, y: 60 },
  { id: 3, size: 46, x: 82, y: 72 },
];

/* On a phone the headline is barely taller than a drop, so a drop parked on
   "IS" hides the word. Smaller, and over letters the sentence survives losing. */
const MOBILE_DROPS: Drop[] = [
  { id: 0, size: 34, x: 13, y: 26 },
  { id: 1, size: 26, x: 70, y: 74 },
];

const geometryFor = (size: number): DropletGeometry => ({
  rx: size / 2,
  ry: (size * 1.08) / 2,
  // A bead of water is close to a hemisphere and curved all the way in.
  thickness: size * 0.34,
  bezel: size / 2,
  ior: 1.333,
});

/* How far, in px, the strongest part of the lens reaches. feDisplacementMap
   samples without interpolation, so past about a fifth of the drop a sharp
   white-on-red letter edge breaks into visible stair steps. */
const strengthFor = (size: number) => Math.round(size * 0.19);

/* CSS.supports() answers yes to backdrop-filter: url() in browsers that then
   ignore it, so ask the computed style of a real element instead. */
function supportsSvgBackdrop(): boolean {
  try {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;width:1px;height:1px;backdrop-filter:url(#__bleed_probe__)";
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).backdropFilter || "";
    probe.remove();
    return value.includes("url(");
  } catch {
    return false;
  }
}

export default function LiquidDrops() {
  const [drops, setDrops] = useState<Drop[] | null>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [maps, setMaps] = useState<Record<number, string>>({});
  const [refract, setRefract] = useState(false);
  const [still, setStill] = useState(false);
  const nodes = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 48rem)").matches;
    const list = narrow ? MOBILE_DROPS : DESKTOP_DROPS;
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setDrops(list);

    const canRefract = supportsSvgBackdrop();
    setRefract(canRefract);

    if (canRefract) {
      /* Bake one map per drop size. At 2x so the lens stays crisp on a retina
         screen; the filter scales it to the element's box. */
      const baked: Record<number, string> = {};
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      for (const size of new Set(list.map((d) => d.size))) {
        const { width, height, data } = dropletMapPixels(geometryFor(size), 2);
        canvas.width = width;
        canvas.height = height;
        ctx?.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
        baked[size] = canvas.toDataURL("image/png");
      }
      setMaps(baked);
    }

    const measure = () => {
      const headline = document.querySelector("main h1");
      if (!headline) return;
      const r = headline.getBoundingClientRect();
      setBox({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    measure();
    // The headline rises in and its display face swaps late: measure once it has settled.
    const settle = window.setTimeout(measure, 1200);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("resize", measure);
    };
  }, []);

  /* Now and then one drop gets heavy enough to run down through the letters,
     and that is the only motion. The rest hold. The brief for this page is
     that motion is deferential. */
  useEffect(() => {
    if (!drops || !box || still) return;

    const state = drops.map((d) => ({ id: d.id, size: d.size, offset: 0, speed: 0 }));
    let raf = 0;
    let last = performance.now();
    let idle = 0;
    let running = -1;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!document.hidden) {
        idle += dt;
        if (running === -1 && idle > 5.5) {
          idle = 0;
          running = Math.floor(Math.random() * state.length);
          state[running].speed = 6;
        }

        for (const s of state) {
          if (s.speed > 0) {
            s.speed = Math.min(s.speed + 38 * dt, 240);
            s.offset += s.speed * dt;
            if (box.top + s.offset > window.innerHeight + s.size) {
              // Gone off the bottom; it condenses again where it started.
              s.offset = 0;
              s.speed = 0;
              running = -1;
            }
          }
          const node = nodes.current.get(s.id);
          if (node) {
            const sag = s.speed > 0 ? 1 + Math.min(s.speed / 1000, 0.14) : 1;
            node.style.transform = `translate3d(0, ${s.offset.toFixed(1)}px, 0) scaleY(${sag.toFixed(3)})`;
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [drops, box, still]);

  const sizes = useMemo(() => Array.from(new Set((drops || []).map((d) => d.size))), [drops]);

  if (!drops || !box) return null;
  // Chromium needs the url() on the element the moment it is first composited;
  // adding it afterwards leaves the filter inert. So wait for the maps.
  if (refract && Object.keys(maps).length < sizes.length) return null;

  return (
    <div
      aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: 3, pointerEvents: "none", overflow: "hidden" }}
    >
      {refract && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            {sizes.map((size) => {
              const g = geometryFor(size);
              const w = g.rx * 2;
              const h = g.ry * 2;
              return (
                <filter
                  key={size}
                  id={`bleed-drop-${size}`}
                  x="0"
                  y="0"
                  width={w}
                  height={h}
                  filterUnits="userSpaceOnUse"
                  primitiveUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feImage
                    href={maps[size]}
                    x="0"
                    y="0"
                    width={w}
                    height={h}
                    preserveAspectRatio="none"
                    result="map"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="map"
                    scale={strengthFor(size) * 2}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="bent"
                  />
                  {/* Half a pixel of softness: enough to hide the nearest-
                      neighbour stepping, well short of frosting the water. */}
                  <feGaussianBlur in="bent" stdDeviation="0.5" />
                </filter>
              );
            })}
          </defs>
        </svg>
      )}

      {drops.map((d) => {
        const g = geometryFor(d.size);
        const w = g.rx * 2;
        const h = g.ry * 2;
        return (
          <div
            key={d.id}
            ref={(node) => {
              if (node) nodes.current.set(d.id, node);
              else nodes.current.delete(d.id);
            }}
            style={{
              position: "absolute",
              left: box.left + (box.width * d.x) / 100 - w / 2,
              top: box.top + (box.height * d.y) / 100 - h / 2,
              width: w,
              height: h,
              transformOrigin: "50% 0",
              willChange: "transform",
            }}
          >
            {/* The lens. No z-index, no isolation, no opacity on it or its
                parent: any of those makes Chromium cut the page out of what
                the backdrop filter can see, and the refraction silently stops. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                backdropFilter: refract ? `url(#bleed-drop-${d.size})` : undefined,
                WebkitBackdropFilter: refract ? `url(#bleed-drop-${d.size})` : undefined,
              }}
            />
            {/* Light on water: a tight highlight up and to the left, a softer
                caustic glow low on the far side where the drop focuses light
                onto the surface, and a darker meniscus where it meets it. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: [
                  "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.85) 0, rgba(255,255,255,0.35) 7%, rgba(255,255,255,0) 17%)",
                  "radial-gradient(ellipse at 62% 80%, rgba(255,225,220,0.28) 0, rgba(255,225,220,0) 36%)",
                  "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(90,0,6,0.16) 88%, rgba(90,0,6,0.28) 100%)",
                ].join(","),
                boxShadow:
                  "inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -2px 3px rgba(80,0,4,0.22), 0 3px 6px -2px rgba(70,0,4,0.35)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
