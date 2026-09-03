/**
 * textures/noise.js — seeded, tileable value noise / fBm and canvas helpers (ARCHITECTURE §9, T §5).
 * Owner: E4 world+textures. Writes no state. Pure canvas2D + typed arrays; no THREE.
 * Every generator is a deterministic function of an integer key derived from (meta.seed, recipe name)
 * so screenshots are reproducible for a seed (ARCHITECTURE §11). No Math.random anywhere.
 * Budget: a 512² 4-octave fBm ≈ 20 ms; the complete texture set ≤ 2.5 s (WP-14 acceptance).
 */
import { createStream, fnv1a32 } from '../core/rng.js';

/** @param {number} w @param {number} [h] */
export function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** A named deterministic draw stream for a recipe (uniforms, normals, picks). */
export function streamFor(seed, name) { return createStream(seed >>> 0, `tex:${name}`); }

/** Integer key for a recipe from the scenario seed. */
export function keyFor(seed, name) { return fnv1a32(`${seed >>> 0}:tex:${name}`); }

/** Integer hash of three ints → [0, 1). Fast, stateless, decorrelated in every argument. */
export function hash3(x, y, k) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(k | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const quintic = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Tileable value noise: an integer lattice of `freq` cells across a `w × h` field, quintic interpolation.
 * Returns Float32Array(w*h) in [0,1].
 */
export function valueNoise(w, h, freqX, freqY, k) {
  const fx = Math.max(1, Math.round(freqX)), fy = Math.max(1, Math.round(freqY));
  const out = new Float32Array(w * h);
  const lat = new Float32Array(fx * fy);
  for (let j = 0; j < fy; j++) for (let i = 0; i < fx; i++) lat[j * fx + i] = hash3(i, j, k);
  const cellX = w / fx, cellY = h / fy;
  for (let y = 0; y < h; y++) {
    const gy = y / cellY, jy = Math.floor(gy), sy = quintic(gy - jy);
    const j0 = jy % fy, j1 = (jy + 1) % fy;
    const row0 = j0 * fx, row1 = j1 * fx;
    for (let x = 0; x < w; x++) {
      const gx = x / cellX, ix = Math.floor(gx), sx = quintic(gx - ix);
      const i0 = ix % fx, i1 = (ix + 1) % fx;
      const a = lat[row0 + i0], b = lat[row0 + i1], c = lat[row1 + i0], d = lat[row1 + i1];
      const top = a + (b - a) * sx, bot = c + (d - c) * sx;
      out[y * w + x] = top + (bot - top) * sy;
    }
  }
  return out;
}

/**
 * Fractional Brownian motion of tileable value noise, normalised to [0,1].
 * @param {number} w @param {number} h
 * @param {{freq?:number, freqY?:number, octaves?:number, gain?:number, lacunarity?:number, key?:number}} o
 */
export function fbm(w, h, { freq = 4, freqY = null, octaves = 4, gain = 0.5, lacunarity = 2, key = 1 } = {}) {
  const out = new Float32Array(w * h);
  let amp = 1, fX = freq, fY = freqY ?? freq, total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(w, h, fX, fY, (key * 131 + o * 7919) | 0);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp; amp *= gain; fX *= lacunarity; fY *= lacunarity;
  }
  const inv = 1 / total;
  for (let i = 0; i < out.length; i++) out[i] *= inv;
  return out;
}

/** White (per-texel) noise field in [0,1]. */
export function white(w, h, key) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = hash3(x, y, key);
  return out;
}

/** Rescale a field to [0,1]. */
export function normalizeField(f) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < f.length; i++) { if (f[i] < lo) lo = f[i]; if (f[i] > hi) hi = f[i]; }
  const s = hi > lo ? 1 / (hi - lo) : 1;
  const out = new Float32Array(f.length);
  for (let i = 0; i < f.length; i++) out[i] = (f[i] - lo) * s;
  return out;
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, t) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };

/** Read a canvas back as a Float32 luminance field in [0,1] (for height maps drawn with the 2D API). */
export function luminanceOf(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = (d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114) / 255;
  return out;
}

/**
 * Paint a canvas from a per-texel function. `fn(x, y, i, rgba)` fills rgba[0..3] in 0..255.
 * @param {HTMLCanvasElement} canvas
 */
export function paint(canvas, fn) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const px = [0, 0, 0, 255];
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      px[0] = 0; px[1] = 0; px[2] = 0; px[3] = 255;
      fn(x, y, i, px);
      const j = i * 4;
      d[j] = px[0]; d[j + 1] = px[1]; d[j + 2] = px[2]; d[j + 3] = px[3];
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Paint a field (0..1) as a luminance-tinted canvas: rgb = base * (lo..hi by field). */
export function paintField(canvas, field, base = [255, 255, 255], lo = 0.9, hi = 1.1) {
  return paint(canvas, (x, y, i, px) => {
    const m = lo + (hi - lo) * field[i];
    px[0] = Math.min(255, base[0] * m); px[1] = Math.min(255, base[1] * m); px[2] = Math.min(255, base[2] * m);
  });
}

/** Height field → greyscale canvas (for debugging or as a roughness map). */
export function fieldToCanvas(field, w, h, gamma = 1) {
  const c = makeCanvas(w, h);
  return paint(c, (x, y, i, px) => { const v = Math.round(255 * Math.pow(clamp01(field[i]), gamma)); px[0] = v; px[1] = v; px[2] = v; });
}

/** Hex '#rrggbb' → [r,g,b] 0..255. */
export function hexRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** [r,g,b] → css string. */
export const css = (rgb, a = 1) => `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${a})`;
/** Mix two rgb triples. */
export const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** Multiply an rgb triple by a scalar (clamped). */
export const scaleRgb = (a, s) => [Math.min(255, a[0] * s), Math.min(255, a[1] * s), Math.min(255, a[2] * s)];

/** Wrap-safe blur of a field (box, radius r) — cheap and tileable. */
export function blurField(f, w, h, r = 1) {
  const tmp = new Float32Array(f.length), out = new Float32Array(f.length);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += f[y * w + ((x + k + w) % w)];
    tmp[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += tmp[((y + k + h) % h) * w + x];
    out[y * w + x] = s / n;
  }
  return out;
}
