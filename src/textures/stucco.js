/**
 * textures/stucco.js — exterior knockdown/sand-finish stucco and painted CBS block (T §5).
 * Owner: E4 world+textures. Writes no state.
 * The stucco colour map is near-neutral (luminance ≈ 0.9); the house colour comes from material.color /
 * vertex colour so the three neighbour stucco colours share one texture and one program.
 */
import { makeCanvas, fbm, paint, hash3, css, streamFor, luminanceOf, normalizeField } from './noise.js';
import { heightToNormal } from './normal.js';
import { tiler } from './tiler.js';

/** @returns {{color:HTMLCanvasElement, normal:HTMLCanvasElement, cover:[number,number]}} */
export function makeStucco(size, key, seed) {
  const S = streamFor(seed, `stucco:${key}`);
  const base = fbm(size, size, { freq: 6, octaves: 5, gain: 0.55, key });
  const fine = fbm(size, size, { freq: 48, octaves: 2, gain: 0.5, key: key + 5 });
  // dabs: the knocked-down splatter — flattened ellipses, slightly darker, raised in the height field
  const dabs = makeCanvas(size);
  const dc = dabs.getContext('2d');
  dc.fillStyle = '#000'; dc.fillRect(0, 0, size, size);
  const n = Math.round(size * size / 240);
  for (let i = 0; i < n; i++) {
    const x = S.nextFloat() * size, y = S.nextFloat() * size;
    const r = 1.5 + S.nextFloat() * 5.5, e = 0.6 + S.nextFloat() * 0.6, a = S.nextFloat() * Math.PI;
    const v = Math.round(150 + S.nextFloat() * 105);
    dc.fillStyle = `rgb(${v},${v},${v})`;
    for (const dx of [0, -size, size]) for (const dy of [0, -size, size]) {
      if (x + dx < -8 || x + dx > size + 8 || y + dy < -8 || y + dy > size + 8) continue;
      dc.save(); dc.translate(x + dx, y + dy); dc.rotate(a); dc.scale(1, e);
      dc.beginPath(); dc.arc(0, 0, r, 0, Math.PI * 2); dc.fill(); dc.restore();
    }
  }
  const dabField = luminanceOf(dabs);
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = 0.45 * base[i] + 0.15 * fine[i] + 0.55 * dabField[i];
  const color = makeCanvas(size);
  paint(color, (x, y, i, px) => {
    const m = 0.90 + 0.10 * base[i] - 0.05 * dabField[i] + 0.03 * (fine[i] - 0.5);
    const v = Math.max(0, Math.min(255, Math.round(255 * m)));
    px[0] = v; px[1] = v; px[2] = Math.round(v * 0.985);
  });
  return { color, normal: heightToNormal(normalizeField(height), size, size, 0.9), cover: [2.0, 2.0] };
}

/** Painted 8×16 block with recessed mortar (garage interior faces, T §5 "painted block"). */
export function makeBlock(size, key, seed) {
  const t = tiler({
    size, tileW: 0.41, tileH: 0.205, grout: 0.01, coverW: 1.64, coverH: 1.64, base: [232, 229, 222], groutColor: [196, 192, 184],
    jitter: 0.03, roughTile: 0.85, roughGrout: 0.95, stagger: true, key, groutDepth: 1,
    decorate: (ctx, x, y, w, h, r, c) => {
      // pitted block face
      for (let k = 0; k < 14; k++) {
        const px = x + hash3(c * 31 + k, r, key + 2) * w, py = y + hash3(c, r * 17 + k, key + 3) * h;
        const v = 200 + Math.round(hash3(k, r + c, key + 4) * 40);
        ctx.fillStyle = `rgba(${v},${v},${v},0.6)`; ctx.fillRect(px, py, 1.5, 1.5);
      }
    },
  });
  const hField = luminanceOf(t.height);
  const soft = fbm(t.w, t.h, { freq: 20, octaves: 3, key: key + 9 });
  for (let i = 0; i < hField.length; i++) hField[i] = 0.8 * hField[i] + 0.2 * soft[i];
  return { color: t.color, normal: heightToNormal(hField, t.w, t.h, 0.8), rough: t.rough, cover: [t.coverW, t.coverH] };
}
