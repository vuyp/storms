/**
 * textures/metal.js — brushed stainless, the 16-ft steel garage door, the 19 corrugated shutter panels
 * with their Sharpie labels (T §5, DESIGN §3.3 / §16.1 `label`).
 * Owner: E4 world+textures. Writes no state.
 */
import { makeCanvas, fbm, paint, hash3, streamFor, css } from './noise.js';
import { heightToNormal } from './normal.js';
import { PANEL_IDS, PANEL_LABELS } from '../core/ids.js';

/** Horizontal brushing streaks; roughness map = streak contrast (0.28–0.5). Cover 0.5 m. */
export function makeBrushed(size, key) {
  const color = makeCanvas(size), rough = makeCanvas(size);
  const streak = fbm(size, size, { freq: 2, freqY: 96, octaves: 3, gain: 0.6, key });
  paint(color, (x, y, i, px) => {
    const v = Math.round(178 + 46 * (streak[i] - 0.5) + 6 * (hash3(x, y, key + 1) - 0.5));
    px[0] = v; px[1] = v; px[2] = v + 3;
  });
  paint(rough, (x, y, i, px) => { const v = Math.round(255 * (0.3 + 0.22 * streak[i])); px[0] = v; px[1] = v; px[2] = v; });
  return { color, rough, cover: [0.5, 0.5] };
}

/**
 * The roll-up garage door: 4 horizontal sections, each with 4 raised short panels, embossed wood-grain paint,
 * section hinge lines, the bottom weather seal. Drawn to the door's exact aspect (4.9 × 2.13 m), cover = the door.
 */
export function makeGarageDoor(w, h, key) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const doorW = 4.9, doorH = 2.13, px = w / doorW;
  ctx.fillStyle = '#e9e6dc'; ctx.fillRect(0, 0, w, h);
  const height = new Float32Array(w * h).fill(0.6);
  const sections = 4, panels = 4;
  const secH = h / sections, panW = w / panels;
  for (let s = 0; s < sections; s++) {
    const y0 = (sections - 1 - s) * secH;
    // section joint (the hinge line) — a dark line and a light highlight
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(0, y0, w, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, y0 + 2, w, 1.5);
    for (let p = 0; p < panels; p++) {
      const x0 = p * panW;
      const ix = x0 + 0.09 * px, iy = y0 + 0.07 * px, iw = panW - 0.18 * px, ih = secH - 0.14 * px;
      // raised panel: shadow bottom/right, highlight top/left
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(ix + 2, iy + 2, iw, ih);
      ctx.fillStyle = '#eeebe2'; ctx.fillRect(ix, iy, iw, ih);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(ix, iy, iw, 2); ctx.fillRect(ix, iy, 2, ih);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(ix, iy + ih - 2, iw, 2); ctx.fillRect(ix + iw - 2, iy, 2, ih);
      // inner recess
      const rx = ix + 0.05 * px, ry = iy + 0.05 * px, rw = iw - 0.1 * px, rh = ih - 0.1 * px;
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(rx, ry, rw, 2); ctx.fillRect(rx, ry, 2, rh);
      for (let yy = Math.floor(iy); yy < iy + ih; yy++) for (let xx = Math.floor(ix); xx < ix + iw; xx++) height[yy * w + xx] = 0.9;
    }
  }
  // embossed grain
  const grain = fbm(w, h, { freq: 3, freqY: 40, octaves: 3, key });
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0, j = 0; i < grain.length; i++, j += 4) { const m = 0.96 + 0.07 * grain[i]; d[j] *= m; d[j + 1] *= m; d[j + 2] *= m; height[i] += 0.05 * (grain[i] - 0.5); }
  ctx.putImageData(img, 0, 0);
  // bottom seal
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(0, h - 0.03 * px, w, 0.03 * px);
  return { color: c, normal: heightToNormal(height, w, h, 0.5), cover: [doorW, doorH], repeat: false };
}

/**
 * Shutter-panel atlas: 19 cells (5 × 4 grid) of corrugated 0.05-gauge aluminium with a hand-written
 * Sharpie label ("NOOK 1", "4210", …) near the top. Each panel's geometry maps its UVs to its cell.
 * @returns {{color, normal, cells:Object<string,[u0,v0,u1,v1]>, cover, repeat:false}}
 */
export function makePanelAtlas(size, key, seed) {
  const S = streamFor(seed, `panels:${key}`);
  const cols = 5, rows = 4;
  const w = size, h = size / 2;
  const cw = w / cols, ch = h / rows;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const height = new Float32Array(w * h);
  const corrPeriodPx = cw / 6.5; // ~6.5 corrugations per panel width
  const cells = {};
  PANEL_IDS.forEach((id, k) => {
    const col = k % cols, row = Math.floor(k / cols);
    const x0 = col * cw, y0 = row * ch;
    // mill-finish aluminium with corrugation shading
    const tone = 0.9 + S.nextFloat() * 0.12;
    for (let y = Math.floor(y0); y < y0 + ch; y++) for (let x = Math.floor(x0); x < x0 + cw; x++) {
      const ph = ((x - x0) / corrPeriodPx) * Math.PI * 2;
      const shade = 0.5 + 0.5 * Math.cos(ph);
      const v = Math.round((150 + 55 * shade) * tone * (0.97 + 0.06 * hash3(x, y, key + 3)));
      const j = (y * w + x) * 4;
      // write directly later via image data; store in height now
      height[y * w + x] = shade;
      ctx.fillStyle = `rgb(${v},${v},${v + 4})`;
      ctx.fillRect(x, y, 1, 1);
      void j;
    }
    // scuffs and a scratch
    ctx.strokeStyle = 'rgba(60,60,60,0.35)'; ctx.lineWidth = 1;
    for (let s = 0; s < 6; s++) {
      ctx.beginPath(); const sx = x0 + S.nextFloat() * cw, sy = y0 + S.nextFloat() * ch;
      ctx.moveTo(sx, sy); ctx.lineTo(sx + (S.nextFloat() - 0.5) * 40, sy + (S.nextFloat() - 0.5) * 12); ctx.stroke();
    }
    // the Sharpie label: hand-written, slightly rotated, near the top of the panel (v high = top)
    const label = PANEL_LABELS[id];
    ctx.save();
    ctx.translate(x0 + cw * 0.5, y0 + ch * 0.16);
    ctx.rotate((S.nextFloat() - 0.5) * 0.12);
    ctx.fillStyle = 'rgba(20,20,26,0.92)';
    ctx.font = `italic bold ${Math.round(ch * 0.16)}px "Comic Sans MS", "Segoe Print", "Bradley Hand", cursive, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    // a second, thicker pass so it reads like marker
    ctx.fillText(label, 1, 0.5);
    ctx.restore();
    // wing-nut holes (top and bottom, two each side)
    ctx.fillStyle = '#2a2a2a';
    for (const hy of [0.06, 0.94]) for (const hx of [0.18, 0.82]) { ctx.beginPath(); ctx.arc(x0 + cw * hx, y0 + ch * hy, cw * 0.02, 0, Math.PI * 2); ctx.fill(); }
    cells[id] = [col / cols, 1 - (row + 1) / rows, (col + 1) / cols, 1 - row / rows];
  });
  return { color: c, normal: heightToNormal(height, w, h, 1.2), cells, cover: [1, 1], repeat: false };
}

/** Plain corrugated aluminium (the accordion blades, lanai pan roof): cover 0.32 m × 1 m. */
export function makeCorrugated(size, key) {
  const c = makeCanvas(size);
  const height = new Float32Array(size * size);
  const period = size / 7;
  paint(c, (x, y, i, px) => {
    const shade = 0.5 + 0.5 * Math.cos((x / period) * Math.PI * 2);
    height[i] = shade;
    const v = Math.round((212 + 34 * shade) * (0.97 + 0.05 * hash3(x, y, key)));
    px[0] = v; px[1] = v; px[2] = v;
  });
  return { color: c, normal: heightToNormal(height, size, size, 1.0), cover: [0.32, 1.0] };
}
