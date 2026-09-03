/**
 * textures/screen.js — fibreglass insect screen (pool cage, lanai, window screens) (T §5).
 * Owner: E4 world+textures. Writes no state.
 * Transparent canvas with 1-px charcoal threads every 3 px on both axes → alphaTest 0.3 keeps the weave
 * through the mip chain (mean alpha ≈ 0.56). Cover 0.13 m (≈ 1.5-mm openings).
 */
import { makeCanvas } from './noise.js';

export function makeScreen(size = 256) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(28,28,30,1)';
  for (let x = 0; x < size; x += 3) ctx.fillRect(x, 0, 1, size);
  for (let y = 0; y < size; y += 3) ctx.fillRect(0, y, size, 1);
  // a few lighter threads (glint)
  ctx.fillStyle = 'rgba(90,90,96,1)';
  for (let x = 0; x < size; x += 21) ctx.fillRect(x, 0, 1, size);
  return { color: c, cover: [0.13, 0.13], alpha: true };
}
