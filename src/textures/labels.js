/**
 * textures/labels.js — small canvas labels that make props read as real things: the fridge notepad with the
 * coffee ring (DESIGN §6.1), the water-case wrap, the printed tracking chart, the HOA letter, moving boxes,
 * canned goods, the flag, an "off" device screen, the pool-toy print. Owner: E4 world+textures. Writes no state.
 */
import { makeCanvas, streamFor, css } from './noise.js';

const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive, sans-serif';

/** The fridge notepad: 14 items in handwriting, a coffee ring, a magnet. 256 × 384. */
export function makeNotepad(key, seed) {
  const S = streamFor(seed, `notepad:${key}`);
  const w = 256, h = 384;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f3e6'; ctx.fillRect(0, 0, w, h);
  // faint rules
  ctx.strokeStyle = 'rgba(120,150,200,0.35)'; ctx.lineWidth = 1;
  for (let y = 44; y < h; y += 22) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(w - 12, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(220,90,90,0.45)'; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(30, h); ctx.stroke();
  // coffee ring
  ctx.strokeStyle = 'rgba(120,72,30,0.35)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(178, 300, 34, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(120,72,30,0.18)'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(178, 300, 34, 0.4, 2.6); ctx.stroke();
  // header + items
  ctx.fillStyle = '#243a6b';
  ctx.font = `bold 17px ${HAND}`; ctx.textBaseline = 'middle';
  ctx.save(); ctx.translate(38, 22); ctx.rotate(-0.02); ctx.fillText('LEAH — do today', 0, 0); ctx.restore();
  const items = ['shutters (all + sliders!)', 'fill both tubs, jugs', 'lanai in / chairs → pool', 'cars in', 'brace garage door', 'sandbags 2 doors', 'towels @ doors', 'fridge coldest, ice OFF', 'charge everything, AAs', 'gas + cans', 'safe room: mattress', 'photos + documents', 'pool down 6", pump brkr', 'text Mom'];
  ctx.font = `15px ${HAND}`;
  items.forEach((t, i) => {
    const y = 55 + i * 22;
    ctx.fillStyle = '#1f2a44';
    ctx.strokeStyle = '#1f2a44'; ctx.lineWidth = 1.4;
    ctx.strokeRect(38, y - 6, 11, 11);
    ctx.save(); ctx.translate(56, y); ctx.rotate((S.nextFloat() - 0.5) * 0.03); ctx.fillText(t, 0, 0); ctx.restore();
  });
  return { color: c, cover: [1, 1], repeat: false };
}

/** Bottled-water case wrap: blue/white with a mountain and "SPRING WATER 24 × 500 mL". 256 × 128. */
export function makeWaterCase() {
  const w = 256, h = 128;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#dff1ff'); g.addColorStop(1, '#8cc4ec');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2b6db1';
  ctx.beginPath(); ctx.moveTo(20, 96); ctx.lineTo(70, 40); ctx.lineTo(100, 70); ctx.lineTo(130, 30); ctx.lineTo(190, 96); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(122, 42); ctx.lineTo(130, 30); ctx.lineTo(140, 44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#123e73'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SPRING WATER', 128, 112);
  ctx.font = '11px sans-serif'; ctx.fillText('24 × 500 mL (16.9 FL OZ)', 128, 22);
  // bottle silhouettes through the wrap
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 6; i++) ctx.fillRect(12 + i * 40, 50, 22, 46);
  return { color: c, cover: [1, 1], repeat: false };
}

/** The grocery-store hurricane tracking chart with a pencilled track. 512 × 384. */
export function makeChart(key, seed) {
  const S = streamFor(seed, `chart:${key}`);
  const w = 512, h = 384;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, w, h);
  // grid
  ctx.strokeStyle = 'rgba(80,110,140,0.35)'; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  // Florida + the Gulf
  ctx.fillStyle = '#d9e6c9';
  ctx.beginPath(); ctx.moveTo(330, 60); ctx.lineTo(420, 60); ctx.lineTo(440, 120); ctx.lineTo(470, 200); ctx.lineTo(455, 300); ctx.lineTo(420, 330); ctx.lineTo(400, 300); ctx.lineTo(390, 200); ctx.lineTo(340, 120); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#5b7a4a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#334'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('2026 ATLANTIC HURRICANE TRACKING CHART', 20, 24);
  ctx.font = '11px sans-serif'; ctx.fillText('Publix · Know your zone · scgov.net/hurricane', 20, 40);
  // pencilled track with dated Xs
  ctx.strokeStyle = 'rgba(60,60,70,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 340);
  const pts = [[60, 340], [120, 320], [190, 300], [260, 275], [320, 245], [372, 215], [405, 190]];
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x + (S.nextFloat() - 0.5) * 4, y + (S.nextFloat() - 0.5) * 4);
  ctx.stroke();
  ctx.font = `11px ${HAND}`; ctx.fillStyle = '#333';
  ['8/30 5p', '8/31 5a', '8/31 5p', '9/1 5a', '9/1 5p', '9/2 5a'].forEach((t, i) => { const [x, y] = pts[i]; ctx.fillText('×', x - 4, y + 4); ctx.fillText(t, x + 6, y - 6); });
  ctx.strokeStyle = 'rgba(200,40,40,0.8)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(405, 190); ctx.lineTo(432, 172); ctx.stroke(); ctx.setLineDash([]);
  return { color: c, cover: [1, 1], repeat: false };
}

/** A letter on HOA letterhead. 256 × 340. */
export function makeLetter() {
  const w = 256, h = 340;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fbfbf7'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2f5d8a'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('OSPREY LANDING HOMEOWNERS', 22, 30);
  ctx.font = '9px sans-serif'; ctx.fillStyle = '#556'; ctx.fillText('Sandpiper Cove · Sarasota County, FL', 22, 44);
  ctx.fillStyle = '#333'; ctx.font = '9px sans-serif';
  const lines = ['Re: Hurricane preparedness — Leah', '', 'Dear neighbor,', '', 'Please secure all lanai furniture,', 'trash and recycle bins, planters and', 'anything that can fly. Do not leave', 'items in the pool cage.', '', 'Debris: vegetative and construction', 'separate at the curb after the storm.', '', 'The board will not be able to respond', 'to calls during the storm.', '', 'Denise Carter, HOA President'];
  lines.forEach((l, i) => ctx.fillText(l, 22, 70 + i * 14));
  return { color: c, cover: [1, 1], repeat: false };
}

/** Moving-box kraft with tape and marker. 256². */
export function makeBoxLabel(key, seed) {
  const S = streamFor(seed, `box:${key}`);
  const c = makeCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c69a5e'; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 40; i++) ctx.fillRect(S.nextFloat() * 256, S.nextFloat() * 256, 40, 1);
  ctx.fillStyle = 'rgba(200,190,170,0.75)'; ctx.fillRect(100, 0, 56, 256); // tape
  ctx.fillStyle = '#222'; ctx.font = `bold 26px ${HAND}`;
  ctx.fillText(S.pick(['XMAS', 'BOOKS', 'KITCHEN', 'BR3 misc', 'FRAGILE']), 26, 150);
  return { color: c, cover: [1, 1], repeat: false };
}

/** Canned-goods label wrap (u around the can). 256 × 128. */
export function makeCanLabel(key, seed) {
  const S = streamFor(seed, `can:${key}`);
  const c = makeCanvas(256, 128);
  const ctx = c.getContext('2d');
  const base = S.pick(['#c93a2f', '#2f7bc9', '#3f9a44', '#d7a22b']);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 34, 256, 60);
  ctx.fillStyle = '#222'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(S.pick(['BLACK BEANS', 'CHILI', 'CHICKEN', 'TUNA', 'SOUP']), 128, 72);
  return { color: c, cover: [1, 1], repeat: false };
}

/** A US flag, 256 × 135. */
export function makeFlag() {
  const w = 256, h = 135;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 13; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#b22234'; ctx.fillRect(0, i * (h / 13), w, h / 13 + 0.5); }
  ctx.fillStyle = '#3c3b6e'; ctx.fillRect(0, 0, w * 0.4, h * 7 / 13);
  ctx.fillStyle = '#fff';
  for (let r = 0; r < 9; r++) for (let k = 0; k < (r % 2 ? 5 : 6); k++) {
    const x = (k + (r % 2 ? 1 : 0.5)) * (w * 0.4 / 6), y = (r + 0.5) * (h * 7 / 13 / 9);
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  return { color: c, cover: [1, 1], repeat: false };
}

/** A dark "off" screen with a faint reflection gradient; devices redraw over it when they own the canvas. */
export function makeScreenOff(w = 512, h = 288) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#16181c'); g.addColorStop(0.5, '#0b0c0f'); g.addColorStop(1, '#141618');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  return { color: c, cover: [1, 1], repeat: false };
}

/** Pool float print: a striped inflatable ring. */
export function makePoolToy() {
  const c = makeCanvas(128, 64);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#ffd54a' : '#ff5a6e'; ctx.fillRect(i * 16, 0, 16, 64); }
  return { color: c, cover: [1, 1], repeat: false };
}

/** House-number plaque "4212". */
export function makeHouseNumber(text = '4212') {
  const c = makeCanvas(128, 64);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2b2b2b'; ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#c9b06a'; ctx.lineWidth = 3; ctx.strokeRect(3, 3, 122, 58);
  ctx.fillStyle = '#e8d9a0'; ctx.font = 'bold 36px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 34);
  return { color: c, cover: [1, 1], repeat: false };
}

/** Stop sign face. */
export function makeStopSign() {
  const c = makeCanvas(128);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#b8161b';
  ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; const x = 64 + 62 * Math.cos(a), y = 64 + 62 * Math.sin(a); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STOP', 64, 66);
  return { color: c, cover: [1, 1], alpha: true, repeat: false };
}

/** A street/HOA sign panel: "Osprey Landing". */
export function makeHoaSign() {
  const c = makeCanvas(256, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e9e2cf'; ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#4a6a3a'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = '#2f4a2a'; ctx.font = 'italic bold 30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Osprey Landing', 128, 54);
  ctx.font = '14px sans-serif'; ctx.fillText('SANDPIPER COVE', 128, 92);
  return { color: c, cover: [1, 1], repeat: false };
}

/** Utility-truck door decal. */
export function makeTruckDecal(text = 'GULF POWER & LIGHT') {
  const c = makeCanvas(256, 64);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#1b4f9c'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  return { color: c, cover: [1, 1], repeat: false };
}

export { css };
