/**
 * world/props/furniture.js — beds, the sectional, tables, chairs, dressers, desk, shelving, closets, the
 * shutter rack (DESIGN §3.3 contents; T §6). Owner: E4 world+textures. Writes no state.
 * Every factory: origin bottom-centre, +z front; returns { static, group?, size, collider, low, parts }.
 */
import { P, COL, box, rounded, cyl, plane, place, rgb, mulRgb, merge, THREE, hitProxy } from './common.js';

const H = Math.PI / 2;

/** A duvet: a subdivided plane with vertex noise. */
function duvet(w, d, S, color) {
  const g = plane(w, d, 10, 10, { color });
  g.rotateX(-H);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + 0.012 * Math.sin(pos.getX(i) * 7 + pos.getZ(i) * 5) + (S ? (S.nextFloat() - 0.5) * 0.008 : 0));
  g.computeVertexNormals();
  return g;
}

export function bedKing(spec, ctx) { return bed(1.93, 2.03, spec, ctx); }
export function bedFull(spec, ctx) { return bed(1.37, 1.9, spec, ctx); }
function bed(w, len, spec, ctx) {
  const p = new P(), S = ctx.stream;
  const bare = !!spec.bare;
  // frame, headboard (against local −z), mattress, pillows, duvet
  p.at('wood', box(w + 0.06, 0.28, len + 0.06, { color: COL.espresso }), 0, 0.14, 0);
  p.at('wood', box(w + 0.1, 1.15, 0.06, { color: COL.espresso }), 0, 0.575, -len / 2 - 0.02);
  p.at('fabric', rounded(w, 0.24, len, 0.05, 3, { color: bare ? [0.85, 0.83, 0.78] : COL.offWhite }), 0, 0.28 + 0.12, 0);
  if (!bare) {
    const dv = duvet(w + 0.04, len * 0.78, S, spec.duvet || COL.slate); place(dv, 0, 0.525, len * 0.09); p.add('fabric', dv);
    for (const x of w > 1.5 ? [-0.42, 0.42] : [0]) p.at('fabric', rounded(0.66, 0.15, 0.42, 0.06, 3, { color: COL.white }), x, 0.6, -len / 2 + 0.28);
  }
  return { static: p.list, size: [w + 0.1, 1.15, len + 0.1], collider: true, y: 0 };
}

/** A loose mattress (the one that goes to the hall): its own mesh so it can move. */
export function mattress(spec, ctx) {
  const p = new P();
  p.at('fabric', rounded(1.37, 0.22, 1.9, 0.05, 3, { color: [0.9, 0.9, 0.86] }), 0, 0.11, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }));
  return { group: g, size: [1.37, 0.22, 1.9], collider: true, low: true };
}

export function sectional(spec, ctx) {
  const p = new P();
  const c = COL.khaki, cd = mulRgb(rgb(c), 0.85);
  // main seat: 2.6 wide × 0.95 deep facing +z, back along −z; chaise on the left (−x) projecting +z
  p.at('fabric', rounded(2.6, 0.42, 0.95, 0.05, 3, { color: c }), 0.25, 0.21, 0);
  p.at('fabric', rounded(2.6, 0.45, 0.28, 0.05, 3, { color: c }), 0.25, 0.64, -0.36);
  for (const x of [-0.55, 0.25, 1.05]) p.at('fabric', rounded(0.78, 0.16, 0.7, 0.05, 3, { color: cd }), x, 0.49, 0.06);
  p.at('fabric', rounded(0.25, 0.62, 0.95, 0.05, 3, { color: c }), 1.68, 0.31, 0);   // arm
  p.at('fabric', rounded(0.9, 0.42, 1.65, 0.05, 3, { color: c }), -1.3, 0.21, 0.35); // chaise
  p.at('fabric', rounded(0.85, 0.16, 1.5, 0.05, 3, { color: cd }), -1.3, 0.49, 0.4);
  p.at('fabric', rounded(0.25, 0.62, 1.65, 0.05, 3, { color: c }), -1.85, 0.31, 0.35); // chaise arm
  p.at('fabric', rounded(0.9, 0.45, 0.28, 0.05, 3, { color: c }), -1.3, 0.64, -0.36);
  for (const [x, z] of [[-1.6, -0.35], [1.6, -0.35], [-1.6, 1.0], [1.6, 0.35]]) p.at('wood', box(0.06, 0.08, 0.06, { color: COL.espresso }), x, 0.04, z);
  // throw pillows
  p.at('fabric', rounded(0.42, 0.42, 0.12, 0.05, 3, { color: COL.terracotta }), 1.3, 0.7, -0.2, 0, 0, 0.15);
  p.at('fabric', rounded(0.42, 0.42, 0.12, 0.05, 3, { color: COL.sage }), -0.9, 0.7, -0.2, 0, 0, -0.1);
  return { static: p.list, size: [3.9, 0.9, 2.0], collider: true, offset: [-0.2, 0, 0.35] };
}

export function chairNook(spec, ctx) { return chair(spec, ctx, { seatColor: COL.maple, frame: COL.maple, slats: true }); }
export function chairDining(spec, ctx) { return chair(spec, ctx, { seatColor: COL.cream, frame: COL.espresso, upholstered: true }); }
export function chair(spec, ctx, { seatColor, frame, slats = false, upholstered = false }) {
  const p = new P();
  p.at(upholstered ? 'fabric' : 'wood', box(0.44, 0.05, 0.44, { color: seatColor }), 0, 0.45, 0);
  for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) p.at('wood', cyl(0.018, 0.024, 0.43, 8, { color: frame }), x, 0.215, z);
  for (const x of [-0.19, 0.19]) p.at('wood', cyl(0.018, 0.018, 0.5, 8, { color: frame }), x, 0.72, -0.2);
  if (slats) for (const y of [0.62, 0.75, 0.88]) p.at('wood', box(0.4, 0.05, 0.02, { color: frame }), 0, y, -0.2);
  else p.at('fabric', rounded(0.4, 0.4, 0.04, 0.02, 2, { color: seatColor }), 0, 0.77, -0.2);
  p.at('wood', box(0.42, 0.04, 0.03, { color: frame }), 0, 0.96, -0.2);
  return { instanced: spec.factory, size: [0.46, 0.98, 0.46], collider: true, static: p.list };
}
export function patioChair(spec, ctx) {
  const p = new P();
  const c = COL.charcoal;
  p.at('matte', rounded(0.5, 0.05, 0.5, 0.02, 2, { color: [0.35, 0.36, 0.34] }), 0, 0.42, 0);
  p.at('matte', rounded(0.5, 0.45, 0.05, 0.02, 2, { color: [0.35, 0.36, 0.34] }), 0, 0.66, -0.23, 0, -0.15, 0);
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) p.at('alu', cyl(0.012, 0.012, 0.42, 6, { color: c }), x, 0.21, z);
  for (const x of [-0.25, 0.25]) p.at('alu', box(0.02, 0.02, 0.5, { color: c }), x, 0.58, -0.02);
  return { instanced: 'patioChair', size: [0.52, 0.9, 0.52], collider: true, static: p.list };
}
export function chaise(spec, ctx) {
  const p = new P();
  const c = COL.charcoal, s = [0.36, 0.37, 0.35];
  p.at('matte', box(0.62, 0.06, 1.3, { color: s }), 0, 0.36, 0.2);
  p.at('matte', box(0.62, 0.06, 0.7, { color: s }), 0, 0.6, -0.72, 0, -0.9, 0);
  for (const [x, z] of [[-0.28, -0.4], [0.28, -0.4], [-0.28, 0.75], [0.28, 0.75]]) p.at('alu', cyl(0.012, 0.012, 0.33, 6, { color: c }), x, 0.165, z);
  for (const x of [-0.3, 0.3]) p.at('alu', box(0.02, 0.02, 1.35, { color: c }), x, 0.33, 0.2);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }));
  return { group: g, size: [0.64, 0.9, 2.0], collider: true, low: false };
}
export function patioTable(spec, ctx) {
  const p = new P();
  p.at('glass', cyl(0.55, 0.55, 0.012, 24, { color: [0.7, 0.8, 0.78] }), 0, 0.72, 0);
  p.at('alu', cyl(0.5, 0.5, 0.03, 24, { color: COL.charcoal }, true), 0, 0.7, 0);
  p.at('alu', cyl(0.03, 0.03, 0.68, 8, { color: COL.charcoal }), 0, 0.35, 0);
  for (let i = 0; i < 4; i++) p.at('alu', box(0.04, 0.03, 0.42, { color: COL.charcoal }), Math.sin(i * H) * 0.2, 0.02, Math.cos(i * H) * 0.2, i * H);
  // the umbrella hole cap
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }));
  return { group: g, size: [1.1, 0.74, 1.1], collider: true };
}

export function tableNook(spec, ctx) {
  const p = new P();
  p.at('wood', cyl(0.6, 0.6, 0.035, 28, { color: COL.maple }), 0, 0.74, 0);
  p.at('wood', cyl(0.05, 0.08, 0.7, 12, { color: COL.maple }), 0, 0.37, 0);
  p.at('wood', cyl(0.28, 0.32, 0.03, 20, { color: COL.maple }), 0, 0.02, 0);
  return { static: p.list, size: [1.2, 0.76, 1.2], collider: true };
}
export function tableDining(spec, ctx) {
  const p = new P();
  p.at('wood', box(1.8, 0.04, 0.9, { color: COL.espresso }), 0, 0.75, 0);
  p.at('wood', box(1.6, 0.08, 0.7, { color: COL.espresso }), 0, 0.69, 0);
  for (const [x, z] of [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]]) p.at('wood', cyl(0.03, 0.045, 0.72, 8, { color: COL.espresso }), x, 0.36, z);
  // the "important stuff" basket + the tablecloth runner
  p.at('fabric', box(1.4, 0.004, 0.36, { color: COL.cream }), 0, 0.773, 0);
  p.at('wood', box(0.42, 0.28, 0.32, { color: COL.wicker }), -0.55, 0.91, -0.15);
  return { static: p.list, size: [1.8, 0.77, 0.9], collider: true };
}
export function coffeeTable(spec, ctx) {
  const p = new P();
  p.at('wood', box(1.1, 0.03, 0.6, { color: COL.espresso }), 0, 0.44, 0);
  p.at('wood', box(1.0, 0.02, 0.5, { color: COL.espresso }), 0, 0.15, 0);
  for (const [x, z] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) p.at('wood', box(0.05, 0.43, 0.05, { color: COL.espresso }), x, 0.215, z);
  // a magazine and a coaster
  p.at('matte', box(0.28, 0.006, 0.21, { color: [0.85, 0.3, 0.3] }), 0.25, 0.462, 0.1, 0.2);
  return { static: p.list, size: [1.1, 0.46, 0.6], collider: true, low: false };
}
export function sideTable(spec, ctx) {
  const p = new P();
  p.at('wood', box(0.5, 0.03, 0.5, { color: COL.espresso }), 0, 0.58, 0);
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) p.at('wood', box(0.04, 0.58, 0.04, { color: COL.espresso }), x, 0.29, z);
  p.at('wood', box(0.46, 0.02, 0.46, { color: COL.espresso }), 0, 0.15, 0);
  return { static: p.list, size: [0.5, 0.6, 0.5], collider: true };
}
export function consoleTable(spec, ctx) {
  const p = new P();
  p.at('wood', box(0.9, 0.03, 0.35, { color: COL.espresso }), 0, 0.8, 0);
  for (const x of [-0.4, 0.4]) p.at('wood', box(0.04, 0.8, 0.3, { color: COL.espresso }), x, 0.4, 0);
  p.at('wood', box(0.8, 0.12, 0.3, { color: COL.espresso }), 0, 0.72, 0);
  // key bowl
  p.at('gloss', cyl(0.1, 0.07, 0.05, 14, { color: [0.3, 0.5, 0.6] }, true), 0.2, 0.845, 0);
  return { static: p.list, size: [0.9, 0.82, 0.35], collider: true };
}
export function nightstand(spec, ctx) {
  const p = new P();
  p.at('wood', box(0.5, 0.6, 0.45, { color: COL.espresso }), 0, 0.3, 0);
  p.at('wood', box(0.44, 0.16, 0.012, { color: mulRgb(rgb(COL.espresso), 1.15) }), 0, 0.42, 0.23);
  p.at('wood', box(0.44, 0.16, 0.012, { color: mulRgb(rgb(COL.espresso), 1.15) }), 0, 0.2, 0.23);
  for (const y of [0.42, 0.2]) p.at('metal', cyl(0.005, 0.005, 0.1, 6, { color: COL.chrome }), 0, y, 0.245, 0, 0, H);
  return { static: p.list, size: [0.5, 0.62, 0.45], collider: true };
}
export function dresser(spec, ctx) {
  const p = new P();
  const w = spec.w || 1.4, h = 0.85, d = 0.5;
  p.at('wood', box(w, h, d, { color: COL.espresso }), 0, h / 2, 0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    p.at('wood', box(w / 2 - 0.08, 0.2, 0.012, { color: mulRgb(rgb(COL.espresso), 1.15) }), (c - 0.5) * (w / 2), 0.16 + r * 0.25, d / 2 + 0.005);
    p.at('metal', cyl(0.005, 0.005, 0.1, 6, { color: COL.chrome }), (c - 0.5) * (w / 2), 0.16 + r * 0.25, d / 2 + 0.02, 0, 0, H);
  }
  return { static: p.list, size: [w, h, d], collider: true };
}
export function desk(spec, ctx) {
  const p = new P();
  const w = 1.5, d = 0.7;
  p.at('wood', box(w, 0.035, d, { color: COL.oak }), 0, 0.74, 0);
  p.at('wood', box(0.42, 0.7, d - 0.05, { color: COL.oak }), w / 2 - 0.23, 0.35, 0);      // pedestal
  for (let r = 0; r < 3; r++) p.at('wood', box(0.36, 0.18, 0.012, { color: mulRgb(rgb(COL.oak), 1.1) }), w / 2 - 0.23, 0.14 + r * 0.22, d / 2 - 0.02);
  p.at('wood', box(0.04, 0.7, d - 0.1, { color: COL.oak }), -w / 2 + 0.03, 0.35, 0);
  p.at('wood', box(w - 0.5, 0.06, 0.03, { color: COL.oak }), -0.2, 0.7, -d / 2 + 0.03);
  // PC tower under, monitor on top, keyboard, mouse, printer sits elsewhere
  p.at('matte', box(0.18, 0.42, 0.42, { color: COL.charcoal }), -w / 2 + 0.2, 0.21, 0.05);
  p.at('matte', box(0.55, 0.32, 0.02, { color: COL.charcoal }), -0.15, 0.98, -0.2);
  p.at('matte', box(0.2, 0.02, 0.18, { color: COL.charcoal }), -0.15, 0.77, -0.2);
  p.at('matte', cyl(0.03, 0.05, 0.2, 8, { color: COL.charcoal }), -0.15, 0.86, -0.2);
  p.at('matte', box(0.44, 0.018, 0.15, { color: COL.lightGrey }), -0.15, 0.77, 0.1);
  p.at('matte', rounded(0.06, 0.03, 0.1, 0.01, 2, { color: COL.lightGrey }), 0.2, 0.775, 0.1);
  return { static: p.list, size: [w, 1.0, d], collider: true, screen: { part: 'monitor', pos: [-0.15, 0.98, -0.19], w: 0.53, h: 0.3 } };
}
export function deskChair(spec, ctx) {
  const p = new P();
  p.at('fabric', rounded(0.48, 0.08, 0.48, 0.03, 2, { color: COL.charcoal }), 0, 0.48, 0);
  p.at('fabric', rounded(0.46, 0.5, 0.08, 0.03, 2, { color: COL.charcoal }), 0, 0.78, -0.22, 0, -0.1, 0);
  p.at('metal', cyl(0.025, 0.025, 0.42, 8, { color: COL.chrome }), 0, 0.23, 0);
  for (let i = 0; i < 5; i++) p.at('matte', box(0.03, 0.03, 0.3, { color: COL.charcoal }), Math.sin(i * 1.2566) * 0.15, 0.03, Math.cos(i * 1.2566) * 0.15, i * 1.2566);
  return { static: p.list, size: [0.5, 1.0, 0.5], collider: true };
}
export function bookshelf(spec, ctx) {
  const p = new P(), S = ctx.stream;
  const w = spec.w || 1.2, h = spec.h || 1.9, d = 0.3;
  p.at('wood', box(w, h, d, { color: COL.espresso }), 0, h / 2, 0);
  const rows = Math.floor(h / 0.36);
  for (let r = 0; r < rows; r++) {
    const y = 0.06 + r * 0.36;
    p.at('wood', box(w - 0.06, 0.32, d - 0.05, { color: mulRgb(rgb(COL.espresso), 0.55) }), 0, y + 0.16, 0.02);
    let x = -w / 2 + 0.05;
    while (x < w / 2 - 0.1) {
      const bw = 0.02 + S.nextFloat() * 0.035, bh = 0.18 + S.nextFloat() * 0.1;
      const c = [[0.6, 0.2, 0.2], [0.2, 0.3, 0.55], [0.85, 0.8, 0.6], [0.2, 0.45, 0.3], [0.9, 0.55, 0.2], [0.3, 0.3, 0.32]][Math.floor(S.nextFloat() * 6)];
      p.at('matte', box(bw, bh, 0.2, { color: c }), x + bw / 2, y + bh / 2 + 0.005, 0.03);
      x += bw + 0.004;
      if (S.nextFloat() < 0.15) x += 0.08;
    }
  }
  return { static: p.list, size: [w, h, d], collider: true };
}
export function filingCabinet(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.4, 0.7, 0.5, { color: [0.45, 0.46, 0.48] }), 0, 0.35, 0);
  for (const y of [0.2, 0.52]) p.at('matte', box(0.34, 0.26, 0.012, { color: [0.5, 0.51, 0.53] }), 0, y, 0.255);
  p.at('matte', box(0.36, 0.08, 0.36, { color: [0.85, 0.85, 0.83] }), 0, 0.74, 0);  // the printer on top
  p.at('matte', box(0.3, 0.03, 0.2, { color: [0.7, 0.7, 0.68] }), 0, 0.795, -0.05);
  return { static: p.list, size: [0.4, 0.82, 0.5], collider: true };
}
/** A reach-in closet front: bifold louvred doors flush with the wall, trimmed. */
export function closetFront(spec, ctx) {
  const p = new P();
  const w = spec.w || 1.5, h = 2.03, d = spec.d || 0.6;
  p.at('drywall', box(w, h + 0.4, d, { color: [0.93, 0.92, 0.89] }), 0, (h + 0.4) / 2, -d / 2);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const x = side * (w / 4) + (k - 0.5) * (w / 4) * side;
      p.at('paint', box(w / 4 - 0.01, h - 0.02, 0.035, { color: COL.white }), x, h / 2, 0.02);
      for (let y = 0.15; y < h - 0.15; y += 0.06) p.at('paint', box(w / 4 - 0.08, 0.012, 0.03, { color: mulRgb(rgb(COL.white), 0.9) }), x, y, 0.035, 0, 0.6, 0);
    }
  }
  p.at('paint', box(w + 0.12, 0.06, 0.02, { color: COL.white }), 0, h + 0.03, 0.02);
  return { static: p.list, size: [w, h, d], collider: true, offset: [0, 0, -d / 2] };
}
/** Closet interior: rods and shelves along a wall (for the walk-in); w along x, on the −z wall. */
export function closetShelves(spec, ctx) {
  const p = new P(), S = ctx.stream;
  const w = spec.w || 3.0;
  p.at('paint', box(w, 0.02, 0.35, { color: COL.white }), 0, 1.75, 0);
  p.at('paint', box(w, 0.02, 0.35, { color: COL.white }), 0, 2.15, 0);
  p.at('metal', cyl(0.015, 0.015, w - 0.05, 8, { color: COL.chrome }), 0, 1.68, 0.12, 0, 0, H);
  // hanging clothes: a run of thin boxes
  for (let x = -w / 2 + 0.1; x < w / 2 - 0.1; x += 0.07 + S.nextFloat() * 0.04) {
    const c = [[0.2, 0.25, 0.4], [0.85, 0.85, 0.82], [0.4, 0.2, 0.2], [0.25, 0.4, 0.3], [0.6, 0.6, 0.62], [0.9, 0.7, 0.5]][Math.floor(S.nextFloat() * 6)];
    p.at('fabric', box(0.05, 0.75 + S.nextFloat() * 0.4, 0.42, { color: c }), x, 1.2, 0.12);
  }
  // folded stacks and shoe boxes on the shelves
  for (let x = -w / 2 + 0.3; x < w / 2 - 0.3; x += 0.5) p.at('fabric', box(0.32, 0.18, 0.28, { color: [0.7 + S.nextFloat() * 0.2, 0.65, 0.6] }), x, 1.85, 0.02);
  return { static: p.list, size: [w, 2.2, 0.45], collider: true, offset: [0, 0, 0] };
}
/** Steel shelving with plastic totes and the garage clutter. */
export function shelvingUnit(spec, ctx) {
  const p = new P(), S = ctx.stream;
  const w = spec.w || 3.5, d = 0.45, h = 1.85;
  const g = [0.55, 0.56, 0.58];
  for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) for (const z of [-d / 2 + 0.02, d / 2 - 0.02]) p.at('alu', box(0.04, h, 0.04, { color: g }), x, h / 2, z);
  if (w > 2) for (const z of [-d / 2 + 0.02, d / 2 - 0.02]) p.at('alu', box(0.04, h, 0.04, { color: g }), 0, h / 2, z);
  for (const y of [0.1, 0.55, 1.0, 1.45, 1.85]) p.at('alu', box(w, 0.03, d, { color: g }), 0, y, 0);
  // totes
  for (let x = -w / 2 + 0.3; x < w / 2 - 0.3; x += 0.62) {
    for (const y of [0.115, 1.015]) {
      const c = S.nextFloat() < 0.5 ? [0.35, 0.38, 0.42] : [0.2, 0.3, 0.5];
      p.at('matte', box(0.55, 0.38, 0.4, { color: c }), x, y + 0.19, 0);
      p.at('matte', box(0.58, 0.03, 0.43, { color: COL.yellow }), x, y + 0.39, 0);
    }
  }
  return { static: p.list, size: [w, h, d], collider: true };
}
/** The shutter rack: vertical dividers along the garage's south wall; the panels themselves are objects. */
export function shutterRack(spec, ctx) {
  const p = new P();
  const w = 3.5, d = 0.4;
  p.at('wood', box(w, 0.09, d, { color: COL.oak }), 0, 0.045, 0);
  p.at('wood', box(w, 0.09, 0.09, { color: COL.oak }), 0, 1.35, -d / 2 + 0.045);
  for (let x = -w / 2; x <= w / 2 + 0.001; x += w / 4) p.at('wood', box(0.05, 1.35, 0.05, { color: COL.oak }), x, 0.675, -d / 2 + 0.025);
  // the wing-nut shelf above
  p.at('wood', box(w, 0.025, 0.3, { color: COL.oak }), 0, 1.6, -d / 2 + 0.15);
  return { static: p.list, size: [w, 1.65, d], collider: true, low: false };
}
export function spot() { return { static: [], size: [0.5, 0.2, 0.5], collider: false, low: true }; }
