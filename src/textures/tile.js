/**
 * textures/tile.js — 18" porcelain floor tile, 12×24 bathroom wall tile, lanai pavers (T §5, DESIGN §3.1).
 * Owner: E4 world+textures. Writes no state.
 * Porcelain: 0.457-m tiles on a 0.461 module (4 mm grout), marbled veining, ±4 % lightness jitter;
 * 1024² covers 4 × 4 tiles = 1.844 m.
 */
import { tiler, veinDecorator } from './tiler.js';
import { luminanceOf, fbm, hash3, css } from './noise.js';
import { heightToNormal } from './normal.js';

export function makePorcelain(size, key) {
  const t = tiler({
    size, tileW: 0.461, tileH: 0.461, grout: 0.004, coverW: 1.844, coverH: 1.844,
    base: [207, 195, 176], groutColor: [168, 160, 148], jitter: 0.04, roughTile: 0.3, roughGrout: 0.9, key,
    decorate: veinDecorator(key, [150, 138, 118], 0.12), groutDepth: 1,
  });
  const h = luminanceOf(t.height);
  return { color: t.color, rough: t.rough, normal: heightToNormal(h, t.w, t.h, 0.6), cover: [t.coverW, t.coverH] };
}

/** 12×24 white/grey ceramic wall tile (tub surrounds, shower). */
export function makeBathTile(size, key) {
  const t = tiler({
    size, tileW: 0.303, tileH: 0.603, grout: 0.003, coverW: 1.212, coverH: 1.206,
    base: [236, 236, 232], groutColor: [190, 190, 186], jitter: 0.02, roughTile: 0.2, roughGrout: 0.85, stagger: true, key,
    decorate: veinDecorator(key + 1, [200, 200, 196], 0.18),
  });
  return { color: t.color, rough: t.rough, normal: heightToNormal(luminanceOf(t.height), t.w, t.h, 0.5), cover: [t.coverW, t.coverH] };
}

/** Concrete pavers, running bond 0.3 × 0.15, sand joints (lanai and pool deck). */
export function makePavers(size, key) {
  const t = tiler({
    size, tileW: 0.3, tileH: 0.15, grout: 0.006, coverW: 1.2, coverH: 1.2,
    base: [186, 170, 148], groutColor: [150, 138, 118], jitter: 0.09, roughTile: 0.8, roughGrout: 0.95, stagger: true, key,
    decorate: (ctx, x, y, w, h, r, c) => {
      // tumbled edge + colour blotch
      const a = hash3(c, r, key + 4);
      ctx.fillStyle = a < 0.33 ? 'rgba(120,90,70,0.18)' : a < 0.66 ? 'rgba(220,210,190,0.14)' : 'rgba(90,90,100,0.10)';
      ctx.fillRect(x + w * 0.1, y + h * 0.15, w * 0.8, h * 0.7);
    },
  });
  const h = luminanceOf(t.height);
  const soft = fbm(t.w, t.h, { freq: 24, octaves: 2, key: key + 8 });
  for (let i = 0; i < h.length; i++) h[i] = 0.8 * h[i] + 0.2 * soft[i];
  return { color: t.color, rough: t.rough, normal: heightToNormal(h, t.w, t.h, 0.7), cover: [t.coverW, t.coverH] };
}

/** Blue glass mosaic waterline tile (pool) — 1" squares. */
export function makeWaterlineTile(size, key) {
  const t = tiler({
    size, tileW: 0.025, tileH: 0.025, grout: 0.002, coverW: 0.3, coverH: 0.3,
    base: [56, 120, 168], groutColor: [220, 224, 228], jitter: 0.18, roughTile: 0.1, roughGrout: 0.8, key,
  });
  return { color: t.color, rough: t.rough, cover: [t.coverW, t.coverH] };
}
