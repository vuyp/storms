/**
 * textures/drywall.js — interior knockdown drywall / ceiling texture (T §5).
 * Owner: E4 world+textures. Writes no state.
 * Near-white map; the paint colour (greige walls, white ceilings, white trim) is a vertex colour so one
 * material covers walls, ceilings, baseboards and casings of every room.
 */
import { makeCanvas, fbm, paint, streamFor, luminanceOf, normalizeField, blurField } from './noise.js';
import { heightToNormal } from './normal.js';

export function makeDrywall(size, key, seed) {
  const S = streamFor(seed, `drywall:${key}`);
  // knockdown: splatter blobs troweled flat — irregular polygons, low relief
  const blobs = makeCanvas(size);
  const bc = blobs.getContext('2d');
  bc.fillStyle = '#000'; bc.fillRect(0, 0, size, size);
  const n = Math.round(size * size / 700);
  for (let i = 0; i < n; i++) {
    const x = S.nextFloat() * size, y = S.nextFloat() * size, r = 3 + S.nextFloat() * 9;
    const v = Math.round(120 + S.nextFloat() * 135);
    bc.fillStyle = `rgb(${v},${v},${v})`;
    const pts = 5 + Math.floor(S.nextFloat() * 4);
    const rad = [];
    for (let k = 0; k < pts; k++) rad.push(r * (0.55 + S.nextFloat() * 0.6));
    for (const dx of [0, -size, size]) for (const dy of [0, -size, size]) {
      if (x + dx < -14 || x + dx > size + 14 || y + dy < -14 || y + dy > size + 14) continue;
      bc.beginPath();
      for (let k = 0; k < pts; k++) {
        const a = (k / pts) * Math.PI * 2;
        const px = x + dx + Math.cos(a) * rad[k], py = y + dy + Math.sin(a) * rad[k] * 0.8;
        if (k === 0) bc.moveTo(px, py); else bc.lineTo(px, py);
      }
      bc.closePath(); bc.fill();
    }
  }
  const blob = blurField(luminanceOf(blobs), size, size, 1);
  const soft = fbm(size, size, { freq: 5, octaves: 3, key });
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = 0.75 * blob[i] + 0.25 * soft[i];
  const color = makeCanvas(size);
  paint(color, (x, y, i, px) => {
    const m = 0.955 + 0.03 * soft[i] - 0.025 * blob[i];
    const v = Math.round(255 * Math.min(1, m));
    px[0] = v; px[1] = v; px[2] = v;
  });
  return { color, normal: heightToNormal(normalizeField(height), size, size, 0.35), cover: [1.5, 1.5] };
}
