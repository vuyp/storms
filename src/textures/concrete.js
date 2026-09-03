/**
 * textures/concrete.js — broom-finish slab/driveway concrete with control joints every 3 m (T §5, DESIGN §3.7).
 * Owner: E4 world+textures. Writes no state.
 * Cover 3 × 3 m: one transverse and one longitudinal joint per repeat, broom lines across (along u).
 */
import { makeCanvas, fbm, paint, hash3, normalizeField } from './noise.js';
import { heightToNormal } from './normal.js';

export function makeConcrete(size, key, base = [168, 164, 156]) {
  const soft = fbm(size, size, { freq: 3, octaves: 4, key });
  const fine = fbm(size, size, { freq: 40, octaves: 2, key: key + 2 });
  const jointPx = Math.max(2, size / 200);
  const color = makeCanvas(size);
  const height = new Float32Array(size * size);
  paint(color, (x, y, i, px) => {
    const broom = 0.5 + 0.5 * Math.sin((y / size) * 3.0 * Math.PI * 2 * 220 + fine[i] * 3); // ≈ 220 grooves per 3 m
    const joint = (x < jointPx || y < jointPx) ? 0.55 : 1;
    const stain = 1 - 0.18 * Math.max(0, soft[i] - 0.55);
    const m = (0.9 + 0.14 * soft[i] + 0.05 * (fine[i] - 0.5) + 0.03 * (broom - 0.5)) * joint * stain;
    px[0] = Math.min(255, base[0] * m); px[1] = Math.min(255, base[1] * m); px[2] = Math.min(255, base[2] * m);
    height[i] = joint < 1 ? 0 : 0.55 + 0.25 * broom * 0.5 + 0.2 * fine[i];
  });
  return { color, normal: heightToNormal(normalizeField(height), size, size, 0.35), cover: [3.0, 3.0] };
}

/** Sealed garage-floor concrete: smoother, greyer, oil spots. */
export function makeGarageFloor(size, key) {
  const soft = fbm(size, size, { freq: 3, octaves: 4, key });
  const color = makeCanvas(size);
  paint(color, (x, y, i, px) => {
    const cx = x / size - 0.62, cy = y / size - 0.4;
    const spot = Math.max(0, 1 - Math.sqrt(cx * cx + cy * cy) / 0.13);
    const m = (0.92 + 0.1 * soft[i]) * (1 - 0.35 * spot * spot) * (1 - 0.15 * Math.max(0, soft[i] - 0.6));
    const tint = hash3(x, y, key + 1) * 6;
    px[0] = Math.min(255, 150 * m + tint); px[1] = Math.min(255, 148 * m + tint); px[2] = Math.min(255, 144 * m + tint);
  });
  return { color, cover: [3.0, 3.0] };
}
