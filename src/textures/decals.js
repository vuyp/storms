/**
 * textures/decals.js — water-stain rings, thin-film puddle, felt strip, contact shadow, scuff, the 256² RGB
 * noise texture for the sky/water shaders (T §5 decals, §10.1). Owner: E4 world+textures. Writes no state.
 * The render module (E5) owns the decal *meshes*; these are the maps it draws them with.
 */
import { makeCanvas, fbm, paint, hash3, css } from './noise.js';

/** Ceiling stain: concentric yellow-brown rings, transparent outside. */
export function makeStain(size, key) {
  const c = makeCanvas(size);
  const soft = fbm(size, size, { freq: 5, octaves: 3, key });
  paint(c, (x, y, i, px) => {
    const dx = x / size - 0.5, dy = y / size - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2 * (0.9 + 0.25 * (soft[i] - 0.5));
    const edge = Math.max(0, 1 - Math.abs(r - 0.92) / 0.06);
    const inner = Math.max(0, 1 - r) * 0.35;
    const ring2 = Math.max(0, 1 - Math.abs(r - 0.6) / 0.05) * 0.4;
    const a = r < 1 ? Math.min(1, inner + edge * 0.9 + ring2) : 0;
    px[0] = 150; px[1] = 112; px[2] = 58; px[3] = Math.round(255 * a * 0.85);
  });
  return { color: c, cover: [1, 1], alpha: true, repeat: false };
}

/** Thin-film puddle: soft-edged disc, alpha for coverage. */
export function makePuddle(size, key) {
  const c = makeCanvas(size);
  const soft = fbm(size, size, { freq: 4, octaves: 3, key });
  paint(c, (x, y, i, px) => {
    const dx = x / size - 0.5, dy = y / size - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2 * (0.85 + 0.4 * (soft[i] - 0.5));
    const a = Math.max(0, Math.min(1, (1 - r) / 0.25));
    px[0] = 60; px[1] = 66; px[2] = 70; px[3] = Math.round(255 * a);
  });
  return { color: c, cover: [1, 1], alpha: true, repeat: false };
}

/** Contact-shadow card (under furniture): radial dark gradient, alpha. */
export function makeContactShadow(size) {
  const c = makeCanvas(size);
  paint(c, (x, y, i, px) => {
    const dx = (x / size - 0.5) * 2, dy = (y / size - 0.5) * 2;
    const r = Math.max(Math.abs(dx), Math.abs(dy));
    const a = Math.max(0, Math.min(1, (1 - r) / 0.5));
    px[0] = 0; px[1] = 0; px[2] = 0; px[3] = Math.round(255 * a * a * 0.55);
  });
  return { color: c, cover: [1, 1], alpha: true, repeat: false };
}

/** Debris scuff on stucco. */
export function makeScuff(size, key) {
  const c = makeCanvas(size);
  const soft = fbm(size, size, { freq: 6, octaves: 3, key });
  paint(c, (x, y, i, px) => {
    const dx = x / size - 0.5, dy = y / size - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2.2;
    const a = Math.max(0, 1 - r) * (0.4 + 0.8 * soft[i]);
    px[0] = 70; px[1] = 62; px[2] = 55; px[3] = Math.round(255 * Math.min(1, a) * 0.6);
  });
  return { color: c, cover: [1, 1], alpha: true, repeat: false };
}

/** 256² tileable RGB noise (three independent fBm fields) for shaders. NoColorSpace. */
export function makeNoise256(key) {
  const size = 256;
  const r = fbm(size, size, { freq: 4, octaves: 4, key }), g = fbm(size, size, { freq: 6, octaves: 4, key: key + 1 }), b = fbm(size, size, { freq: 3, octaves: 5, key: key + 2 });
  const c = makeCanvas(size);
  paint(c, (x, y, i, px) => { px[0] = Math.round(255 * r[i]); px[1] = Math.round(255 * g[i]); px[2] = Math.round(255 * b[i]); });
  return { color: c, cover: [1, 1], data: true };
}

/** Grime map for matte props: faint dirt/wear, near-white. */
export function makeGrime(size, key) {
  const soft = fbm(size, size, { freq: 5, octaves: 3, key });
  const c = makeCanvas(size);
  paint(c, (x, y, i, px) => {
    const v = Math.round(255 * (0.93 + 0.07 * soft[i] + 0.02 * (hash3(x, y, key + 1) - 0.5)));
    px[0] = v; px[1] = v; px[2] = v;
  });
  return { color: c, cover: [1, 1] };
}

/** Soft ring cookie for the render flashlight (kept here so E5 can `textures.get('cookie')`). */
export function makeCookie(size) {
  const c = makeCanvas(size);
  paint(c, (x, y, i, px) => {
    const dx = (x / size - 0.5) * 2, dy = (y / size - 0.5) * 2;
    const r = Math.sqrt(dx * dx + dy * dy);
    const hot = Math.exp(-r * r * 3.5), ring = Math.max(0, 1 - Math.abs(r - 0.72) / 0.12) * 0.35;
    const v = Math.round(255 * Math.min(1, hot + ring) * (r < 0.97 ? 1 : 0));
    px[0] = v; px[1] = v; px[2] = v;
  });
  return { color: c, cover: [1, 1], repeat: false };
}

export { css };
