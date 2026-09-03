/**
 * textures/soffit.js — vented aluminium soffit panels + plain white band for fascia/gutters (T §5, DESIGN §3.6).
 * Owner: E4 world+textures. Writes no state.
 * Atlas layout (cover 0.6 × 0.6 m): v ∈ [0, 0.25) is plain white (fascia, gutters, trim map their UVs there);
 * v ∈ [0.25, 1] is two 0.3-m soffit panels with a centre vent strip of slots every 0.01 m (the #1 water path).
 */
import { makeCanvas, fbm, paint, normalizeField } from './noise.js';
import { heightToNormal } from './normal.js';

export function makeSoffit(size, key) {
  const w = size, h = size;
  const color = makeCanvas(w, h);
  const ctx = color.getContext('2d');
  ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, 0, w, h);
  const height = new Float32Array(w * h).fill(0.8);
  const bandY = h * 0.25;
  const panelW = w / 2; // two 0.3-m panels across 0.6 m
  const pxPerM = w / 0.6;
  // panel seams (vertical) and the folded edge ribs
  for (let p = 0; p < 2; p++) {
    const x0 = p * panelW;
    ctx.fillStyle = '#d8d8d2'; ctx.fillRect(x0, bandY, 2, h - bandY);
    ctx.fillStyle = '#fafaf6'; ctx.fillRect(x0 + 2, bandY, 2, h - bandY);
    // vent strip: 0.1 m wide down the panel centre with slots 0.01 m apart
    const vx0 = x0 + panelW * 0.5 - 0.05 * pxPerM, vw = 0.1 * pxPerM;
    const slotPitch = 0.01 * pxPerM;
    for (let y = bandY + 4; y < h - 4; y += slotPitch) {
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(vx0 + 3, y, vw - 6, Math.max(1, slotPitch * 0.35));
      for (let yy = Math.floor(y); yy < y + slotPitch * 0.35 && yy < h; yy++)
        for (let xx = Math.floor(vx0 + 3); xx < vx0 + vw - 3; xx++) height[yy * w + xx] = 0.1;
    }
    // the ribs either side of the vent strip
    ctx.fillStyle = '#e4e4de'; ctx.fillRect(vx0 - 2, bandY, 2, h - bandY); ctx.fillRect(vx0 + vw, bandY, 2, h - bandY);
    for (let yy = Math.floor(bandY); yy < h; yy++) { height[yy * w + Math.floor(x0)] = 0.4; height[yy * w + Math.floor(x0) + 1] = 0.4; }
  }
  // faint oxidation / dirt streaks on everything
  const soft = fbm(w, h, { freq: 5, octaves: 3, key });
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0, j = 0; i < soft.length; i++, j += 4) {
    const m = 0.96 + 0.06 * soft[i];
    d[j] = Math.min(255, d[j] * m); d[j + 1] = Math.min(255, d[j + 1] * m); d[j + 2] = Math.min(255, d[j + 2] * m);
  }
  ctx.putImageData(img, 0, 0);
  return { color, normal: heightToNormal(normalizeField(height), w, h, 0.5), cover: [0.6, 0.6] };
}
