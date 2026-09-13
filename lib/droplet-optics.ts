/**
 * The optics of a water droplet, as a displacement field.
 *
 * The model is QuickLiquid's (github.com/amarnath3003/quickLiquid, MIT, see its
 * PHYSICS.md): a slab of index n resting on the backdrop, whose top face rolls
 * off through a convex circular-arc bezel, traced with exact Snell refraction
 * for an orthographic view ray. What changes here is the shape. QuickLiquid
 * builds the field for a rounded rectangle and mirrors one quadrant four times,
 * which is exactly right for a pill or a card — and a perfect circle is that
 * geometry's degenerate case: its edge branches meet the corner branch along
 * lines that show up as seams across a small, strongly-bent lens. A droplet
 * gets a true radial distance field instead, evaluated for every pixel.
 */

export interface DropletGeometry {
  /** Horizontal and vertical radii in CSS px. A clinging drop is a little taller. */
  rx: number;
  ry: number;
  /** Depth of the water dome, in px. */
  thickness: number;
  /** Width of the curved band, in px. A bead of water is curved all the way in. */
  bezel: number;
  /** 1.333 for water. */
  ior: number;
}

const LUT_SIZE = 512;

/** Δ(s): normalised lateral displacement across the bezel, s = 0 at the rim, 1 inside. */
export function displacementLUT({ thickness: T, bezel: B, ior }: DropletGeometry): Float32Array {
  const lut = new Float32Array(LUT_SIZE);
  const eta = 1 / ior;
  let max = 0;

  for (let i = 0; i < LUT_SIZE; i++) {
    // Keep off the exact endpoints, where the slope is infinite or zero.
    const s = Math.min(Math.max(i / (LUT_SIZE - 1), 1e-4), 1 - 1e-4);
    const root = Math.sqrt(s * (2 - s));
    const z = T * root;
    const slope = (T / B) * ((1 - s) / root);

    const cosI = 1 / Math.sqrt(1 + slope * slope);
    const sinI = slope * cosI;
    const sinT = eta * sinI;
    const cosT = Math.sqrt(Math.max(0, 1 - sinT * sinT));
    const k = eta * cosI - cosT;
    const tXY = k * sinI;
    const tZ = -eta + k * cosI;

    const delta = Math.abs(tZ) > 1e-6 ? z * Math.abs(tXY / tZ) : 0;
    lut[i] = delta;
    if (delta > max) max = delta;
  }

  // At the rim itself the depth is zero, so the true limit is no displacement.
  lut[0] = 0;
  if (max > 0) for (let i = 0; i < LUT_SIZE; i++) lut[i] /= max;
  return lut;
}

/**
 * RGBA pixels for an feDisplacementMap: R carries the x offset, G the y offset,
 * 128 is "no movement". Sampling points inward, toward the centre — a droplet
 * is a magnifier, so what sits under its rim is pulled in from further out.
 */
export function dropletMapPixels(geometry: DropletGeometry, dpr = 1): {
  width: number;
  height: number;
  data: Uint8ClampedArray;
} {
  const { rx, ry, bezel } = geometry;
  const width = Math.ceil(rx * 2 * dpr);
  const height = Math.ceil(ry * 2 * dpr);
  const data = new Uint8ClampedArray(width * height * 4);
  const lut = displacementLUT(geometry);
  const minR = Math.min(rx, ry);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const o = (py * width + px) * 4;
      // Pixel centre, in CSS px relative to the drop's centre.
      const x = (px + 0.5) / dpr - rx;
      const y = (py + 0.5) / dpr - ry;

      // Normalised ellipse coordinates. For a circle this is simply |p| / r.
      const u = x / rx;
      const v = y / ry;
      const rho = Math.sqrt(u * u + v * v);

      let dx = 0;
      let dy = 0;
      if (rho > 1e-6 && rho < 1) {
        const inward = (1 - rho) * minR;
        const s = Math.min(inward / bezel, 1);
        /* Δ rises like √s off the rim, so within a pixel and a half it goes
           from nothing to nearly its peak. Left alone that aliases into a
           hard stepped ring; a smoothstep over the outer 1.5 px is the
           anti-aliasing a real edge gets from the lens itself. */
        const edge = Math.min(1, inward / 1.5);
        const feather = edge * edge * (3 - 2 * edge);
        const delta = feather * lut[Math.min(LUT_SIZE - 1, Math.round(s * (LUT_SIZE - 1)))];
        // Outward normal of the ellipse at this point: the gradient of u² + v².
        let nx = u / rx;
        let ny = v / ry;
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        nx /= len;
        ny /= len;
        dx = -nx * delta;
        dy = -ny * delta;
      }

      data[o] = Math.round(128 + dx * 127);
      data[o + 1] = Math.round(128 + dy * 127);
      data[o + 2] = 128;
      data[o + 3] = 255;
    }
  }
  return { width, height, data };
}
