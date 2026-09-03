/**
 * textures/turf.js — St Augustine turf, mulch beds, bare dirt (T §5, DESIGN §3.7).
 * Owner: E4 world+textures. Writes no state. Turf cover 2 × 2 m; mulch 1 × 1 m.
 */
import { makeCanvas, fbm, paint, hash3, streamFor } from './noise.js';

export function makeTurf(size, key, seed) {
  const S = streamFor(seed, `turf:${key}`);
  const patch = fbm(size, size, { freq: 2, octaves: 3, key });
  const fine = fbm(size, size, { freq: 24, octaves: 2, key: key + 2 });
  const color = makeCanvas(size);
  paint(color, (x, y, i, px) => {
    const p = patch[i];
    const m = 0.8 + 0.4 * fine[i] + 0.25 * (p - 0.5);
    // St Augustine is a coarse blue-green; drier patches go yellow-olive
    const dry = Math.max(0, p - 0.62) * 2.2;
    px[0] = Math.min(255, (68 + 60 * dry) * m); px[1] = Math.min(255, (116 + 10 * dry) * m); px[2] = Math.min(255, (44 - 10 * dry) * m);
  });
  // blades: short strokes
  const ctx = color.getContext('2d');
  ctx.lineWidth = 1;
  const n = Math.round(size * size / 90);
  for (let i = 0; i < n; i++) {
    const x = S.nextFloat() * size, y = S.nextFloat() * size, a = (S.nextFloat() - 0.5) * 1.2 - Math.PI / 2, l = 3 + S.nextFloat() * 8;
    const v = S.nextFloat();
    ctx.strokeStyle = v < 0.5 ? 'rgba(120,170,70,0.35)' : v < 0.85 ? 'rgba(40,80,30,0.35)' : 'rgba(170,160,80,0.3)';
    for (const dx of [0, -size, size]) for (const dy of [0, -size, size]) {
      const xx = x + dx, yy = y + dy;
      if (xx < -12 || xx > size + 12 || yy < -12 || yy > size + 12) continue;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + Math.cos(a) * l, yy + Math.sin(a) * l); ctx.stroke();
    }
  }
  return { color, cover: [2.0, 2.0] };
}

export function makeMulch(size, key) {
  const soft = fbm(size, size, { freq: 6, octaves: 3, key });
  const color = makeCanvas(size);
  paint(color, (x, y, i, px) => {
    const chip = hash3(x >> 2, y >> 1, key + 3);
    const m = (0.6 + 0.8 * chip) * (0.85 + 0.3 * soft[i]);
    px[0] = Math.min(255, 86 * m); px[1] = Math.min(255, 52 * m); px[2] = Math.min(255, 30 * m);
  });
  return { color, cover: [1.0, 1.0] };
}

export function makeDirt(size, key) {
  const soft = fbm(size, size, { freq: 4, octaves: 4, key });
  const color = makeCanvas(size);
  paint(color, (x, y, i, px) => {
    const m = 0.75 + 0.5 * soft[i] + 0.1 * (hash3(x, y, key + 1) - 0.5);
    px[0] = Math.min(255, 128 * m); px[1] = Math.min(255, 104 * m); px[2] = Math.min(255, 78 * m);
  });
  return { color, cover: [2.0, 2.0] };
}
