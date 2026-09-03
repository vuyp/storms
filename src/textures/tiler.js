/**
 * textures/tiler.js — grid-of-tiles generator: colour, roughness and height canvases with grout (T §5 "tiler").
 * Owner: E4 world+textures. Writes no state.
 * The canvas covers an exact integer number of tiles so `texture.repeat = 1/coverMetres` tiles seamlessly
 * with geometry UVs authored in metres.
 */
import { makeCanvas, hash3, css, mixRgb, scaleRgb, fbm } from './noise.js';

/**
 * @param {object} o
 * @param {number} o.size canvas size (square)
 * @param {number} o.tileW tile width in metres @param {number} o.tileH tile height in metres
 * @param {number} o.grout grout width in metres
 * @param {number} [o.coverW] metres the canvas spans horizontally (rounded to whole tiles)
 * @param {number} [o.coverH]
 * @param {number[]} o.base tile colour rgb @param {number[]} o.groutColor
 * @param {number} [o.jitter] ± lightness jitter per tile
 * @param {number} [o.roughTile] @param {number} [o.roughGrout]
 * @param {boolean} [o.stagger] running bond (offset every other row by half a tile)
 * @param {(ctx:CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number, c:number)=>void} [o.decorate] per-tile pass
 * @param {number} o.key seed key
 */
export function tiler(o) {
  const {
    size, tileW, tileH, grout, base, groutColor, key,
    jitter = 0.04, roughTile = 0.35, roughGrout = 0.9, stagger = false, decorate = null, groutDepth = 1,
  } = o;
  const coverW = o.coverW ?? Math.max(tileW, Math.round(1.5 / tileW) * tileW);
  const coverH = o.coverH ?? Math.max(tileH, Math.round(1.5 / tileH) * tileH);
  const cols = Math.max(1, Math.round(coverW / tileW)), rows = Math.max(1, Math.round(coverH / tileH));
  const w = size, h = Math.round(size * (coverH / coverW));
  const pxPerM = w / coverW;
  const tw = w / cols, th = h / rows, gp = Math.max(1, grout * pxPerM);

  const color = makeCanvas(w, h), rough = makeCanvas(w, h), height = makeCanvas(w, h);
  const cc = color.getContext('2d'), rc = rough.getContext('2d'), hc = height.getContext('2d');
  cc.fillStyle = css(groutColor); cc.fillRect(0, 0, w, h);
  const rg = Math.round(roughGrout * 255); rc.fillStyle = `rgb(${rg},${rg},${rg})`; rc.fillRect(0, 0, w, h);
  const hg = Math.round((1 - groutDepth) * 255); hc.fillStyle = `rgb(${hg},${hg},${hg})`; hc.fillRect(0, 0, w, h);
  const rt = Math.round(roughTile * 255);

  // draw with wrap: tiles that overhang the edge are drawn again shifted so the texture tiles seamlessly
  const drawTile = (x, y, r, c) => {
    const j = 1 + (hash3(c, r, key) - 0.5) * 2 * jitter;
    const col = scaleRgb(base, j);
    const x0 = x + gp / 2, y0 = y + gp / 2, ww = tw - gp, hh = th - gp;
    for (const dx of [0, -w, w]) for (const dy of [0, -h, h]) {
      const xx = x0 + dx, yy = y0 + dy;
      if (xx > w || yy > h || xx + ww < 0 || yy + hh < 0) continue;
      cc.fillStyle = css(col); cc.fillRect(xx, yy, ww, hh);
      if (decorate) decorate(cc, xx, yy, ww, hh, r, c);
      rc.fillStyle = `rgb(${rt},${rt},${rt})`; rc.fillRect(xx, yy, ww, hh);
      hc.fillStyle = 'rgb(255,255,255)'; hc.fillRect(xx, yy, ww, hh);
    }
  };
  for (let r = 0; r < rows; r++) {
    const off = stagger && (r % 2 === 1) ? tw / 2 : 0;
    for (let c = -1; c <= cols; c++) drawTile(c * tw + off, r * th, r, ((c % cols) + cols) % cols);
  }
  // a little per-texel grime so tiles are not flat
  const f = fbm(w, h, { freq: 6, octaves: 3, key: key + 17 });
  const img = cc.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0, j = 0; i < f.length; i++, j += 4) {
    const m = 0.96 + 0.08 * f[i];
    d[j] = Math.min(255, d[j] * m); d[j + 1] = Math.min(255, d[j + 1] * m); d[j + 2] = Math.min(255, d[j + 2] * m);
  }
  cc.putImageData(img, 0, 0);
  return { color, rough, height, coverW: cols * tileW, coverH: rows * tileH, w, h };
}

/** Marbled veining pass for porcelain tile: 2–3 faint bezier curves per tile. */
export function veinDecorator(key, veinColor, alpha = 0.10) {
  return (ctx, x, y, w, h, r, c) => {
    const n = 2 + Math.floor(hash3(c, r, key + 3) * 2);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = css(veinColor, alpha);
    for (let v = 0; v < n; v++) {
      const k = key + 11 * v;
      const ax = x + hash3(c, r, k) * w, ay = y + hash3(c, r, k + 1) * h;
      const bx = x + hash3(c, r, k + 2) * w, by = y + hash3(c, r, k + 3) * h;
      const cx = x + hash3(c, r, k + 4) * w, cy = y + hash3(c, r, k + 5) * h;
      const dx = x + hash3(c, r, k + 6) * w, dy = y + hash3(c, r, k + 7) * h;
      ctx.lineWidth = 0.6 + hash3(c, r, k + 8) * 1.4;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(bx, by, cx, cy, dx, dy); ctx.stroke();
      ctx.lineWidth = 0.4; ctx.strokeStyle = css(mixRgb(veinColor, [255, 255, 255], 0.5), alpha * 0.6);
      ctx.beginPath(); ctx.moveTo(ax + 3, ay + 2); ctx.bezierCurveTo(bx + 4, by - 3, cx - 3, cy + 2, dx + 2, dy - 2); ctx.stroke();
    }
    ctx.restore();
  };
}
