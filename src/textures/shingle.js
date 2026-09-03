/**
 * textures/shingle.js — architectural (laminated) asphalt shingles, 0.14-m rows (T §5, DESIGN §3.6).
 * Owner: E4 world+textures. Writes no state.
 * 1024 × 956: 6 tabs of 0.3 m across, 12 rows of 0.14 m down (cover 1.8 × 1.68 m). u runs along the eave,
 * v up the slope. Two colourways (charcoal / weathered wood) for the two neighbour roof colours.
 */
import { makeCanvas, paint, fbm, hash3, normalizeField, css } from './noise.js';
import { heightToNormal } from './normal.js';

export function makeShingle(size, key, base = [74, 71, 68]) {
  const cols = 6, rows = 12, tabW = 0.3, rowH = 0.14;
  const w = size, h = Math.round(size * (rows * rowH) / (cols * tabW));
  const tw = w / cols, rh = h / rows;
  const color = makeCanvas(w, h);
  const ctx = color.getContext('2d');
  const height = new Float32Array(w * h);
  // draw rows from the top so lower rows overlap the row above (as laid)
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const off = (r % 2) * tw * 0.5 + (hash3(r, 0, key) - 0.5) * tw * 0.15;
    for (let c = -1; c <= cols; c++) {
      const x = c * tw + off;
      const jit = 0.82 + hash3(c, r, key + 1) * 0.36;
      const lam = hash3(c, r, key + 2) < 0.45; // the darker laminated "shadow" tab
      const m = jit * (lam ? 0.72 : 1);
      ctx.fillStyle = css([base[0] * m, base[1] * m, base[2] * m]);
      // the exposed strip of this course; the shingle is wider than the exposed height
      ctx.fillRect(x, y, tw - 1.5, rh + 2);
      // dragon-tooth cut of architectural shingles: a random notch pattern along the bottom
      const notch = 2 + Math.floor(hash3(c, r, key + 3) * 3);
      ctx.fillStyle = css([base[0] * m * 0.85, base[1] * m * 0.85, base[2] * m * 0.85]);
      for (let k = 0; k < notch; k++) {
        const nx = x + hash3(c * 5 + k, r, key + 4) * (tw - 6);
        ctx.fillRect(nx, y + rh - 3 - hash3(k, r + c, key + 5) * 4, 4 + hash3(k, c, key + 6) * 8, 6);
      }
    }
    // bottom edge shadow line of the course
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, y + rh - 1.5, w, 1.5);
  }
  // granule speckle
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  const soft = fbm(w, h, { freq: 4, octaves: 3, key: key + 7 });
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    const g = hash3(x, y, key + 8);
    const m = (0.86 + 0.28 * g) * (0.92 + 0.16 * soft[i]);
    const j = i * 4;
    d[j] = Math.min(255, d[j] * m); d[j + 1] = Math.min(255, d[j + 1] * m); d[j + 2] = Math.min(255, d[j + 2] * m);
    // height: each course steps up at its bottom edge; granules add fine relief
    const inRow = (y % rh) / rh;
    height[i] = 0.55 + 0.25 * (inRow < 0.08 ? 0 : 1) + 0.2 * g * 0.5 + 0.1 * (soft[i] - 0.5);
  }
  ctx.putImageData(img, 0, 0);
  return { color, normal: heightToNormal(normalizeField(height), w, h, 0.7), cover: [cols * tabW, rows * rowH] };
}

/** Roofing felt (exposed after shingle loss): dark grey-black with faint lines every 0.9 m. */
export function makeFelt(size, key) {
  const color = makeCanvas(size);
  const soft = fbm(size, size, { freq: 6, octaves: 3, key });
  paint(color, (x, y, i, px) => {
    const line = (y % Math.round(size / 2)) < 2 ? 0.7 : 1;
    const v = (34 + 22 * soft[i]) * line;
    px[0] = v; px[1] = v; px[2] = v + 2;
  });
  return { color, cover: [1.8, 1.8] };
}
