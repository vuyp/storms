/**
 * textures/asphalt.js — the swale street: dark aggregate with faint tyre-lane brightening (T §5).
 * Owner: E4 world+textures. Writes no state. Cover 4 × 4 m; v runs along the street.
 */
import { makeCanvas, fbm, paint, hash3 } from './noise.js';

export function makeAsphalt(size, key) {
  const soft = fbm(size, size, { freq: 3, octaves: 4, key });
  const patch = fbm(size, size, { freq: 2, octaves: 2, key: key + 4 });
  const color = makeCanvas(size);
  paint(color, (x, y, i, px) => {
    const u = x / size;
    // two tyre lanes on one 3.65-m half: at u ≈ 0.28 and 0.72 of the 4-m tile (the texture is placed per lane in UV)
    const lane = Math.exp(-Math.pow((u - 0.3) / 0.07, 2)) + Math.exp(-Math.pow((u - 0.7) / 0.07, 2));
    const agg = hash3(x, y, key + 1);
    const g = agg < 0.12 ? 1.45 : agg < 0.3 ? 1.15 : agg > 0.9 ? 0.8 : 1;
    const m = (0.85 + 0.3 * soft[i]) * g * (1 + 0.12 * lane) * (1 - 0.2 * Math.max(0, patch[i] - 0.6));
    px[0] = Math.min(255, 58 * m); px[1] = Math.min(255, 58 * m); px[2] = Math.min(255, 60 * m);
  });
  return { color, cover: [4.0, 4.0] };
}
