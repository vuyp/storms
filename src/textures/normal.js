/**
 * textures/normal.js — height field → tangent-space normal map (Sobel, wrap-safe) (T §5 "heightToNormal").
 * Owner: E4 world+textures. Writes no state.
 * Output canvases are NoColorSpace data (never SRGB); +Y up in UV space (three.js/OpenGL convention).
 */
import { makeCanvas } from './noise.js';

/**
 * @param {Float32Array} height 0..1 field, w*h
 * @param {number} w @param {number} h
 * @param {number} strength slope multiplier (0.3 subtle … 3 strong)
 * @returns {HTMLCanvasElement}
 */
export function heightToNormal(height, w, h, strength = 1) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const s = strength * w / 128; // slope per texel scaled so `strength` is resolution independent
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w, yp = ((y + 1) % h) * w, y0 = y * w;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w, xp = (x + 1) % w;
      // Sobel
      const du = (height[ym + xp] + 2 * height[y0 + xp] + height[yp + xp]) - (height[ym + xm] + 2 * height[y0 + xm] + height[yp + xm]);
      const dv = (height[ym + xm] + 2 * height[ym + x] + height[ym + xp]) - (height[yp + xm] + 2 * height[yp + x] + height[yp + xp]);
      let nx = -du * s * 0.25, ny = dv * s * 0.25, nz = 1;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= inv; ny *= inv; nz *= inv;
      const j = (y0 + x) * 4;
      d[j] = Math.round((nx * 0.5 + 0.5) * 255);
      d[j + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      d[j + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      d[j + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** A flat normal canvas (for materials that want a normalMap slot filled). */
export function flatNormal(size = 4) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);
  return c;
}
