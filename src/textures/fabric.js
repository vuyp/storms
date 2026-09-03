/**
 * textures/fabric.js — upholstery weave (sofa, beds, chairs) and bedroom carpet (T §5).
 * Owner: E4 world+textures. Writes no state. Neutral maps; colour by vertex tint.
 */
import { makeCanvas, fbm, paint, hash3, normalizeField } from './noise.js';
import { heightToNormal } from './normal.js';

export function makeFabric(size, key) {
  const soft = fbm(size, size, { freq: 3, octaves: 3, key });
  const color = makeCanvas(size);
  const height = new Float32Array(size * size);
  const period = Math.max(2, Math.round(size / 128)); // ≈ 3.9-mm weave at 0.5 m cover
  paint(color, (x, y, i, px) => {
    const wx = (x % period) / period, wy = (y % period) / period;
    const weave = ((Math.floor(x / period) + Math.floor(y / period)) % 2) ? Math.sin(wx * Math.PI) : Math.sin(wy * Math.PI);
    const m = 0.82 + 0.14 * weave + 0.1 * (soft[i] - 0.5) + 0.06 * (hash3(x, y, key + 1) - 0.5);
    const v = Math.round(200 * m);
    px[0] = v; px[1] = v; px[2] = v;
    height[i] = weave;
  });
  return { color, normal: heightToNormal(normalizeField(height), size, size, 0.25), cover: [0.5, 0.5] };
}

/** Beige plush carpet: dense fine noise with faint vacuum tracks. */
export function makeCarpet(size, key) {
  const soft = fbm(size, size, { freq: 4, octaves: 3, key });
  const color = makeCanvas(size);
  paint(color, (x, y, i, px) => {
    const track = 0.5 + 0.5 * Math.sin((x / size) * Math.PI * 2 * 3);
    const m = 0.86 + 0.22 * hash3(x, y, key + 2) + 0.08 * (soft[i] - 0.5) + 0.03 * track;
    px[0] = Math.min(255, 196 * m); px[1] = Math.min(255, 184 * m); px[2] = Math.min(255, 164 * m);
  });
  return { color, cover: [0.8, 0.8] };
}
