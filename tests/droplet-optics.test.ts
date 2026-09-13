import test from "node:test";
import assert from "node:assert/strict";
import { displacementLUT, dropletMapPixels } from "../lib/droplet-optics";

/**
 * The droplet map is physics, so it is checked like physics: the properties
 * the model promises have to hold in the numbers it produces. A map that
 * moves pixels at the rim tears the drop from its surroundings; one that
 * moves them at the centre smears the letter it sits on.
 */

const water = { rx: 40, ry: 40, thickness: 26, bezel: 40, ior: 1.333 };

test("displacement vanishes at the rim and at the centre, and peaks in between", () => {
  const lut = displacementLUT(water);
  const last = lut.length - 1;
  assert.ok(lut[0] < 0.05, `rim should not move pixels, got ${lut[0]}`);
  assert.ok(lut[last] < 0.05, `centre should not move pixels, got ${lut[last]}`);
  const peak = Math.max(...lut);
  assert.equal(peak, 1, "the table is normalised to its own maximum");
  const peakAt = lut.indexOf(peak);
  assert.ok(peakAt > 0 && peakAt < last, "the strongest bending sits inside the bezel");
});

test("the map is neutral outside the drop and at its exact centre", () => {
  const { width, height, data } = dropletMapPixels(water);
  const at = (x: number, y: number) => {
    const o = (y * width + x) * 4;
    return [data[o], data[o + 1]];
  };
  assert.deepEqual(at(0, 0), [128, 128], "a corner is outside the circle");
  const centre = at(Math.floor(width / 2), Math.floor(height / 2));
  assert.ok(Math.abs(centre[0] - 128) <= 2 && Math.abs(centre[1] - 128) <= 2);
});

test("sampling points inward, so a droplet magnifies rather than shrinks", () => {
  const { width, height, data } = dropletMapPixels(water);
  // A pixel in the right half of the band must pull from further right... no:
  // it must pull toward the centre, which is to its left — R below neutral.
  const x = Math.floor(width * 0.8);
  const y = Math.floor(height / 2);
  const r = data[(y * width + x) * 4];
  assert.ok(r < 128, `expected an inward (negative x) offset, got R=${r}`);
});

test("the field has no seam: neighbouring pixels never jump across the interior", () => {
  /* The rounded-rect engine this model comes from mirrors one quadrant, and
     on a circle the branches meet in visible seams. A radial field has no
     branches, so across the inside of the drop — away from the rim, where the
     lens is legitimately steep — no two neighbours may differ sharply. */
  const { width, height, data } = dropletMapPixels(water);
  let worst = 0;
  for (const y of [Math.floor(height * 0.35), Math.floor(height / 2), Math.floor(height * 0.65)]) {
    for (let x = 1; x < width; x++) {
      const u = (x + 0.5) / (width / 2) - 1;
      const v = (y + 0.5) / (height / 2) - 1;
      if (Math.sqrt(u * u + v * v) > 0.8) continue;
      for (const channel of [0, 1]) {
        const a = data[(y * width + x - 1) * 4 + channel];
        const b = data[(y * width + x) * 4 + channel];
        worst = Math.max(worst, Math.abs(a - b));
      }
    }
  }
  assert.ok(worst <= 12, `largest step between interior neighbours was ${worst}`);
});
