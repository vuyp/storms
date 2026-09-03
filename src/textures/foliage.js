/**
 * textures/foliage.js — palm fronds (sabal fan, queen/foxtail/royal feather), oak/hedge leaf clusters,
 * bark (sabal boot-jack, queen ring trunk, oak) (T §10.4, DESIGN §3.7).
 * Owner: E4 world+textures. Writes no state. Alpha textures use alphaTest; colour maps are SRGB.
 */
import { makeCanvas, fbm, paint, hash3, streamFor, css } from './noise.js';

/** Sabal (cabbage palm) fan frond: leaflets radiating from the hastula, drawn in a 512² card (V-fold is geometry). */
export function makeFrondSabal(size, key, seed) {
  const S = streamFor(seed, `frondSabal:${key}`);
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size * 0.96;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const a = -Math.PI / 2 + (t - 0.5) * Math.PI * 1.15;
    const len = size * (0.72 + 0.2 * Math.sin(t * Math.PI)) * (0.94 + S.nextFloat() * 0.1);
    const g = 96 + S.nextFloat() * 50, r = 40 + S.nextFloat() * 30;
    ctx.strokeStyle = css([r, g, 34 + S.nextFloat() * 20]);
    ctx.lineWidth = 5 + S.nextFloat() * 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len;
    const mx = cx + Math.cos(a) * len * 0.55 + (S.nextFloat() - 0.5) * 12, my = cy + Math.sin(a) * len * 0.55;
    ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    // a lighter midrib
    ctx.strokeStyle = css([r + 40, g + 40, 60], 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  }
  // the petiole / hastula base
  ctx.fillStyle = '#6d6a3f';
  ctx.beginPath(); ctx.moveTo(cx - 14, size); ctx.lineTo(cx + 14, size); ctx.lineTo(cx + 4, cy - 40); ctx.lineTo(cx - 4, cy - 40); ctx.closePath(); ctx.fill();
  return { color: c, cover: [1, 1], alpha: true, repeat: false };
}

/** Feather frond (queen / foxtail / royal): a rachis with paired leaflets, 512 × 256 card; u along the rachis. */
export function makeFrondFeather(size, key, seed, opts = {}) {
  const S = streamFor(seed, `frondFeather:${key}`);
  const { plumose = false, base = [58, 112, 40] } = opts;
  const w = size, h = size / 2;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const y0 = h / 2;
  const n = plumose ? 90 : 54;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = w * (0.06 + 0.92 * t);
    const len = h * 0.46 * Math.sin(Math.min(1, t * 1.15) * Math.PI) * (0.85 + S.nextFloat() * 0.3) + 6;
    for (const side of [-1, 1]) {
      const ang = side * (0.62 + (plumose ? (S.nextFloat() - 0.5) * 0.9 : 0.15 * S.nextFloat())) + (plumose ? 0 : 0) ;
      const g = base[1] + (S.nextFloat() - 0.5) * 40;
      ctx.strokeStyle = css([base[0] + (S.nextFloat() - 0.5) * 20, g, base[2] + (S.nextFloat() - 0.5) * 16]);
      ctx.lineWidth = plumose ? 1.6 : 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y0);
      const ex = x + Math.cos(ang) * len * 0.35 + len * 0.15, ey = y0 + Math.sin(ang) * len;
      ctx.quadraticCurveTo(x + len * 0.12, y0 + Math.sin(ang) * len * 0.5, ex, ey); ctx.stroke();
    }
  }
  // rachis
  ctx.strokeStyle = '#7f8a3a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke();
  ctx.strokeStyle = '#a6ad55'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, y0 - 1); ctx.lineTo(w, y0 - 1); ctx.stroke();
  return { color: c, cover: [1, 1], alpha: true, repeat: false };
}

/** Leaf cluster card for oak canopy / clusia hedge / ficus: overlapping ellipses with holes. */
export function makeLeafCluster(size, key, seed, opts = {}) {
  const S = streamFor(seed, `leaf:${key}`);
  const { base = [46, 84, 36], leaf = 9, count = 260, glossy = false } = opts;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < count; i++) {
    const d = S.nextFloat();
    const r = Math.sqrt(d) * size * 0.46;
    const a = S.nextFloat() * Math.PI * 2;
    const x = size / 2 + Math.cos(a) * r, y = size / 2 + Math.sin(a) * r;
    const rot = S.nextFloat() * Math.PI;
    const m = 0.7 + 0.6 * S.nextFloat();
    const col = [base[0] * m, base[1] * m, base[2] * m];
    ctx.fillStyle = css(col);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, glossy ? 0.55 : 0.45);
    ctx.beginPath(); ctx.arc(0, 0, leaf * (0.8 + 0.5 * S.nextFloat()), 0, Math.PI * 2); ctx.fill();
    if (glossy) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(-leaf * 0.25, -leaf * 0.2, leaf * 0.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  return { color: c, cover: [1, 1], alpha: true, repeat: false };
}

/** Sabal trunk: criss-cross "boots" (old leaf bases). u around, v up; cover 1 m × 1 m. */
export function makeBarkSabal(size, key) {
  const soft = fbm(size, size, { freq: 6, octaves: 3, key });
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6a5a48'; ctx.fillRect(0, 0, size, size);
  const rows = 9, cols = 7;
  for (let r = 0; r < rows; r++) for (let col = -1; col <= cols; col++) {
    const x = (col + (r % 2) * 0.5) * (size / cols), y = r * (size / rows);
    const m = 0.75 + 0.5 * hash3(col, r, key + 1);
    ctx.fillStyle = css([118 * m, 100 * m, 76 * m]);
    ctx.beginPath(); ctx.moveTo(x, y + size / rows); ctx.lineTo(x + size / cols / 2, y - size / rows * 0.4); ctx.lineTo(x + size / cols, y + size / rows); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,10,0.5)'; ctx.lineWidth = 2; ctx.stroke();
  }
  const img = ctx.getImageData(0, 0, size, size); const d = img.data;
  for (let i = 0, j = 0; i < soft.length; i++, j += 4) { const m = 0.85 + 0.3 * soft[i]; d[j] *= m; d[j + 1] *= m; d[j + 2] *= m; }
  ctx.putImageData(img, 0, 0);
  return { color: c, cover: [1, 1] };
}

/** Queen / royal trunk: smooth grey with leaf-scar rings; cover 1 m × 1 m. */
export function makeBarkRing(size, key) {
  const soft = fbm(size, size, { freq: 3, freqY: 12, octaves: 3, key });
  const c = makeCanvas(size);
  paint(c, (x, y, i, px) => {
    const ring = ((y / size) * 6) % 1;
    const rl = ring < 0.08 ? 0.72 : ring < 0.12 ? 1.12 : 1;
    const m = (0.86 + 0.28 * soft[i]) * rl;
    px[0] = Math.min(255, 150 * m); px[1] = Math.min(255, 146 * m); px[2] = Math.min(255, 134 * m);
  });
  return { color: c, cover: [1, 1] };
}

/** Live-oak bark: deep furrows along v. */
export function makeBarkOak(size, key) {
  const furrow = fbm(size, size, { freq: 12, freqY: 3, octaves: 4, gain: 0.6, key });
  const c = makeCanvas(size);
  paint(c, (x, y, i, px) => {
    const m = 0.55 + 0.9 * Math.pow(furrow[i], 1.6);
    px[0] = Math.min(255, 96 * m); px[1] = Math.min(255, 84 * m); px[2] = Math.min(255, 70 * m);
  });
  return { color: c, cover: [1, 1] };
}
