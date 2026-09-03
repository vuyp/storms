/**
 * textures/wood.js — wood grain (cabinets, doors, furniture) and granite counters (T §5).
 * Owner: E4 world+textures. Writes no state.
 * One maple-toned grain map; espresso / shaker-white looks come from vertex-colour tints.
 */
import { makeCanvas, fbm, paint, valueNoise, normalizeField, hash3 } from './noise.js';
import { heightToNormal } from './normal.js';

/** Grain along v (the texture's vertical axis); cover 1 m × 1 m. */
export function makeWood(size, key) {
  const stretched = fbm(size, size, { freq: 2, freqY: 40, octaves: 4, gain: 0.55, key });
  const warp = fbm(size, size, { freq: 3, octaves: 2, key: key + 3 });
  const rings = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const u = x / size + 0.12 * (warp[i] - 0.5);
    const band = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 9 + stretched[i] * 5.0);
    rings[i] = 0.6 * band * band + 0.4 * stretched[i];
  }
  const color = makeCanvas(size);
  const light = [214, 176, 118], dark = [156, 112, 62];
  paint(color, (x, y, i, px) => {
    const t = rings[i];
    const m = 1 + 0.06 * (stretched[i] - 0.5);
    px[0] = Math.min(255, (light[0] + (dark[0] - light[0]) * t) * m);
    px[1] = Math.min(255, (light[1] + (dark[1] - light[1]) * t) * m);
    px[2] = Math.min(255, (light[2] + (dark[2] - light[2]) * t) * m);
  });
  return { color, normal: heightToNormal(normalizeField(rings), size, size, 0.35), cover: [1.0, 1.0] };
}

/** Dark speckled granite; cover 1 m. */
export function makeGranite(size, key) {
  const soft = fbm(size, size, { freq: 3, octaves: 3, key });
  const color = makeCanvas(size);
  const tones = [[62, 58, 54], [96, 92, 88], [140, 132, 122], [40, 38, 36], [178, 172, 160]];
  paint(color, (x, y, i, px) => {
    const r = hash3(x, y, key + 1);
    let c;
    if (r < 0.55) c = tones[0]; else if (r < 0.78) c = tones[1]; else if (r < 0.9) c = tones[2]; else if (r < 0.97) c = tones[3]; else c = tones[4];
    const m = 0.85 + 0.3 * soft[i];
    px[0] = Math.min(255, c[0] * m); px[1] = Math.min(255, c[1] * m); px[2] = Math.min(255, c[2] * m);
  });
  return { color, cover: [1.0, 1.0] };
}
