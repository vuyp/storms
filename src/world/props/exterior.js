/**
 * world/props/exterior.js — lanai/porch/yard things, vehicles and every neighbourhood dressing prop of
 * DESIGN §4.2 (poses via named parts), plus the street furniture factories used by neighbourhood.js.
 * Owner: E4 world+textures. Writes no state.
 */
import { P, COL, box, rounded, cyl, sphere, torus, cone, plane, lathe, place, rgb, mulRgb, merge, THREE, hitProxy } from './common.js';

const H = Math.PI / 2, PI = Math.PI;
const g0 = (ctx, id, ...children) => { const g = new THREE.Group(); g.name = id; g.add(...children); return g; };

// ---- lanai / porch objects -------------------------------------------------------------------------------------
export function grill(spec, ctx) {
  const p = new P();
  p.at('gloss', rounded(0.7, 0.28, 0.5, 0.04, 3, { color: COL.black }), 0, 0.85, 0);
  p.at('gloss', rounded(0.7, 0.2, 0.5, 0.06, 3, { color: COL.black }), 0, 1.1, -0.05, 0, -0.1, 0);
  p.at('metal', box(0.5, 0.02, 0.02, { color: COL.chrome }), 0, 1.2, 0.2);
  p.at('matte', box(0.75, 0.65, 0.55, { color: COL.charcoal }), 0, 0.4, 0);
  p.at('matte', box(0.3, 0.02, 0.5, { color: COL.charcoal }), 0.52, 0.98, 0);
  for (const s of [-1, 1]) p.at('rubber', cyl(0.07, 0.07, 0.04, 10, { color: COL.rubber }), s * 0.3, 0.07, -0.2, 0, 0, H);
  p.at('gloss', cyl(0.15, 0.15, 0.36, 12, { color: COL.white }), 0, 0.25, 0.0);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.9, 1.25, 0.6, 0, spec.id));
  return { group: g, size: [0.9, 1.25, 0.6], collider: true };
}
export function hoseReel(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.4, 0.5, 0.35, { color: [0.35, 0.4, 0.35] }), 0, 0.3, 0);
  p.at('matte', cyl(0.18, 0.18, 0.28, 14, { color: [0.35, 0.4, 0.35] }), 0, 0.35, 0, 0, 0, H);
  p.at('matte', torus(0.14, 0.03, 8, 16, { color: [0.2, 0.55, 0.25] }), 0, 0.35, 0, 0, H, 0);
  p.at('matte', box(0.02, 0.15, 0.02, { color: COL.black }), 0.22, 0.42, 0);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.45, 0.6, 0.4, 0, spec.id));
  return { group: g, size: [0.45, 0.6, 0.4], collider: true };
}
export function windChimes(spec, ctx) {
  const p = new P();
  p.at('wood', cyl(0.06, 0.06, 0.02, 12, { color: COL.oak }), 0, 0, 0);
  for (let i = 0; i < 6; i++) p.at('metal', cyl(0.008, 0.008, 0.25 + i * 0.05, 6, { color: COL.chrome }), Math.sin(i * 1.05) * 0.045, -0.2 - i * 0.02, Math.cos(i * 1.05) * 0.045);
  p.at('wood', cyl(0.03, 0.03, 0.01, 10, { color: COL.oak }), 0, -0.35, 0);
  p.at('matte', cyl(0.002, 0.002, 0.12, 4, { color: COL.black }), 0, 0.07, 0);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.14, 0.6, 0.14, -0.5, spec.id));
  return { group: g, size: [0.14, 0.6, 0.14], centred: true, low: true };
}
export function poolToys(spec, ctx) {
  const p = new P();
  p.at('poolToy', torus(0.32, 0.1, 10, 22, { color: [1, 1, 1] }), 0, 0.1, 0, 0, H, 0);
  p.at('gloss', rounded(0.5, 0.1, 0.9, 0.05, 3, { color: [0.3, 0.7, 0.85] }), 0.6, 0.05, 0.2, 0.3);
  p.at('gloss', cyl(0.04, 0.04, 1.2, 8, { color: [0.95, 0.4, 0.5] }), -0.5, 0.04, 0.3, 0, 0, H);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(1.2, 0.2, 1.0, 0, spec.id));
  return { group: g, size: [1.2, 0.2, 1.0], low: true };
}
export function outdoorRug(spec, ctx) {
  const p = new P();
  const g = plane(2.4, 1.7, 1, 1, { color: [0.35, 0.42, 0.5] }); g.rotateX(-H); p.add('fabric', g);
  const grp = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id, castShadow: false }), hitProxy(2.4, 0.03, 1.7, 0, spec.id));
  return { group: grp, size: [2.4, 0.03, 1.7], low: true };
}
export function doormat(spec, ctx) {
  const p = new P();
  const g = plane(0.75, 0.45, 1, 1, { color: [0.45, 0.35, 0.22] }); g.rotateX(-H); p.add('fabric', g);
  const b = box(0.4, 0.004, 0.08, { color: COL.black }); place(b, 0, 0.002, 0); p.add('matte', b);
  const grp = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id, castShadow: false }), hitProxy(0.75, 0.03, 0.45, 0, spec.id));
  return { group: grp, size: [0.75, 0.03, 0.45], low: true };
}
export function bench(spec, ctx) {
  const p = new P();
  p.at('wood', box(1.2, 0.05, 0.42, { color: COL.oak }), 0, 0.45, 0);
  p.at('wood', box(1.2, 0.35, 0.04, { color: COL.oak }), 0, 0.7, -0.19, 0, -0.15, 0);
  for (const x of [-0.52, 0.52]) { p.at('wood', box(0.05, 0.45, 0.4, { color: COL.oak }), x, 0.225, 0); p.at('wood', box(0.05, 0.4, 0.05, { color: COL.oak }), x, 0.65, -0.18); }
  return { static: p.list, size: [1.2, 0.9, 0.45], collider: true };
}
export function pot(spec, ctx) {
  const p = new P();
  p.at('matteWet', cyl(0.22, 0.17, 0.45, 14, { color: [0.35, 0.36, 0.4] }, true), 0, 0.225, 0);
  p.at('matteWet', cyl(0.17, 0.17, 0.02, 14, { color: [0.35, 0.36, 0.4] }), 0, 0.01, 0);
  p.at('mulch', cyl(0.21, 0.21, 0.02, 14, { color: [1, 1, 1] }), 0, 0.42, 0);
  for (let i = 0; i < 10; i++) p.at('leafHedge', plane(0.12, 0.4, 1, 2, { color: [1, 1, 1], flex: 0.6 }), Math.sin(i * 0.63) * 0.1, 0.6, Math.cos(i * 0.63) * 0.1, i * 0.63, -0.5 + (i % 3) * 0.25, 0);
  for (let i = 0; i < 4; i++) p.at('matte', sphere(0.03, 6, { color: [0.9, 0.2, 0.4] }), Math.sin(i * 1.6) * 0.14, 0.72, Math.cos(i * 1.6) * 0.14);
  return { static: p.list, size: [0.45, 0.85, 0.45], collider: false };
}
export function condenser(spec, ctx) {
  const p = new P();
  p.at('matte', box(1.0, 0.1, 0.9, { color: [0.6, 0.6, 0.58] }), 0, 0.05, 0);
  p.at('matte', box(0.8, 0.8, 0.8, { color: [0.72, 0.72, 0.7] }), 0, 0.5, 0);
  for (let y = 0.15; y < 0.85; y += 0.05) p.at('matte', box(0.82, 0.01, 0.82, { color: COL.charcoal }), 0, y, 0);
  p.at('matte', cyl(0.36, 0.36, 0.04, 20, { color: COL.charcoal }), 0, 0.92, 0);
  const fan = new THREE.Mesh(merge([0, 1, 2, 3].map(i => place(box(0.3, 0.005, 0.08, { color: [0.3, 0.3, 0.32] }), Math.cos(i * H) * 0.17, 0, Math.sin(i * H) * 0.17, -i * H, 0, 0.3))), ctx.mats.get('matte'));
  fan.position.y = 0.9; fan.name = 'fan';
  p.at('matte', box(0.14, 0.4, 0.14, { color: [0.6, 0.6, 0.58] }), 0.52, 0.5, -0.3);
  p.at('matte', cyl(0.02, 0.02, 1.2, 6, { color: COL.charcoal }), 0.55, 0.3, 0.55, 0, H, 0);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), fan);
  return { group: g, size: [1.0, 1.0, 0.9], collider: true, parts: { fan } };
}
export function poolPumpPad(spec, ctx) {
  const p = new P();
  p.at('concrete', box(1.4, 0.08, 0.9, { color: [1, 1, 1] }), 0, 0.04, 0);
  p.at('matte', cyl(0.14, 0.14, 0.32, 12, { color: COL.charcoal }), -0.45, 0.24, 0.1, 0, 0, H);
  p.at('matte', box(0.24, 0.2, 0.2, { color: COL.charcoal }), -0.45, 0.2, 0.1);
  p.at('matte', cyl(0.24, 0.22, 0.75, 14, { color: [0.85, 0.85, 0.8] }), 0.05, 0.45, 0.0);           // filter canister
  p.at('matte', box(0.5, 0.6, 0.55, { color: [0.4, 0.42, 0.45] }), 0.55, 0.38, 0);                   // heater
  p.at('matte', cyl(0.03, 0.03, 0.8, 8, { color: COL.white }), -0.2, 0.28, 0.35, 0, 0, H);
  p.at('matte', cyl(0.03, 0.03, 0.5, 8, { color: COL.white }), -0.7, 0.28, 0.35);
  return { static: p.list, size: [1.4, 0.9, 0.9], collider: true };
}
export function poolValve(spec, ctx) {
  const p = new P();
  p.at('matte', cyl(0.05, 0.05, 0.12, 10, { color: COL.charcoal }), 0, 0.42, 0);
  p.at('matte', box(0.16, 0.02, 0.03, { color: COL.black }), 0, 0.49, 0);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.2, 0.55, 0.2, 0, spec.id));
  return { group: g, size: [0.2, 0.55, 0.2], low: true };
}
export function mast(spec, ctx) {
  const p = new P();
  p.at('alu', cyl(0.02, 0.025, 4.4, 8, { color: COL.lightGrey }), 0, 2.2, 0);
  for (const y of [1.0, 2.6]) p.at('alu', box(0.06, 0.04, 0.12, { color: COL.lightGrey }), 0.05, y, 0);
  p.at('alu', box(0.3, 0.02, 0.02, { color: COL.lightGrey }), 0, 4.3, 0);
  const cups = new THREE.Group(); cups.name = 'anemometer'; cups.position.set(-0.15, 4.36, 0);
  const cp = new P(); for (let i = 0; i < 3; i++) { cp.at('alu', cyl(0.002, 0.002, 0.08, 4, { color: COL.lightGrey }), Math.sin(i * 2.094) * 0.04, 0, Math.cos(i * 2.094) * 0.04, 0, 0, H); cp.at('matte', sphere(0.02, 8, { color: COL.black }), Math.sin(i * 2.094) * 0.08, 0, Math.cos(i * 2.094) * 0.08); }
  cups.add(...cp.meshes(ctx.mats, { name: 'anemometer', castShadow: false }));
  const vane = new THREE.Group(); vane.name = 'vane'; vane.position.set(0.15, 4.36, 0);
  const vp = new P(); vp.at('alu', box(0.2, 0.005, 0.005, { color: COL.lightGrey }), 0, 0, 0); vp.at('alu', box(0.06, 0.05, 0.005, { color: COL.lightGrey }), 0.09, 0, 0);
  vane.add(...vp.meshes(ctx.mats, { name: 'vane', castShadow: false }));
  p.at('matte', cyl(0.06, 0.06, 0.12, 10, { color: COL.white }), 0, 4.1, 0.1);  // rain gauge
  p.at('matte', box(0.14, 0.2, 0.08, { color: COL.white }), 0, 3.6, 0);          // sensor housing
  const g = g0(ctx, 'mast', ...p.meshes(ctx.mats, { name: 'mast' }), cups, vane);
  return { group: g, size: [0.3, 4.4, 0.3], collider: true, parts: { anemometer: cups, vane } };
}
export function meter(spec, ctx) {
  const p = new P();
  p.at('gloss', box(0.22, 0.32, 0.12, { color: COL.lightGrey }), 0, 0, 0);
  p.at('glass', cyl(0.08, 0.08, 0.06, 14, { color: [0.9, 0.9, 0.9] }), 0, 0.02, 0.08, 0, H, 0);
  p.at('matte', cyl(0.025, 0.025, 0.8, 8, { color: COL.charcoal }), 0, 0.6, 0.0);
  p.at('matte', cyl(0.02, 0.02, 0.9, 8, { color: COL.charcoal }), -0.2, -0.5, 0.0);
  return { static: p.list, size: [0.24, 0.35, 0.14], centred: true };
}
export function backflow(spec, ctx) { const p = new P(); p.at('metal', cyl(0.03, 0.03, 0.5, 8, { color: COL.brass }), 0, 0.25, 0); p.at('metal', cyl(0.03, 0.03, 0.3, 8, { color: COL.brass }), 0, 0.5, 0.15, 0, H, 0); p.at('metal', cyl(0.03, 0.03, 0.5, 8, { color: COL.brass }), 0, 0.25, 0.3); p.at('metal', box(0.12, 0.08, 0.08, { color: COL.brass }), 0, 0.5, 0.15); return { static: p.list, size: [0.15, 0.6, 0.4], collider: false }; }
export function safe(spec, ctx) { const p = new P(); p.at('gloss', box(0.45, 0.6, 0.45, { color: COL.charcoal }), 0, 0.3, 0); p.at('metal', cyl(0.06, 0.06, 0.02, 12, { color: COL.chrome }), 0.1, 0.35, 0.23, 0, H, 0); p.at('matte', box(0.12, 0.12, 0.01, { color: COL.black }), -0.1, 0.4, 0.23); return { static: p.list, size: [0.45, 0.6, 0.45], collider: true }; }
export function toteStack(spec, ctx) { const p = new P(); for (let i = 0; i < 3; i++) { p.at('matte', box(0.55, 0.36, 0.4, { color: i % 2 ? [0.35, 0.38, 0.42] : [0.2, 0.3, 0.5] }), 0, 0.19 + i * 0.4, 0); p.at('matte', box(0.58, 0.03, 0.43, { color: COL.yellow }), 0, 0.39 + i * 0.4, 0); } return { static: p.list, size: [0.58, 1.2, 0.43], collider: true }; }
export function boxStack(spec, ctx) { const p = new P(); const S = ctx.stream; for (let i = 0; i < 4; i++) { const w = 0.45 + S.nextFloat() * 0.15, h = 0.3 + S.nextFloat() * 0.12; p.at('boxLabel', box(w, h, w * 0.8, { color: [1, 1, 1] }), (i % 2) * 0.5 - 0.25, h / 2 + (i > 1 ? 0.42 : 0), 0, (S.nextFloat() - 0.5) * 0.3); } return { static: p.list, size: [1.1, 0.9, 0.5], collider: true }; }
export function dogBed(spec, ctx) { const p = new P(); p.at('fabric', torus(0.32, 0.1, 8, 20, { color: [0.4, 0.3, 0.25] }), 0, 0.1, 0, 0, H, 0); p.at('fabric', cyl(0.3, 0.3, 0.06, 16, { color: [0.55, 0.45, 0.38] }), 0, 0.03, 0); return { static: p.list, size: [0.85, 0.2, 0.85], low: true }; }
export function shelfBoard(spec, ctx) { const p = new P(); p.at('paint', box(spec.w || 0.9, 0.025, 0.3, { color: COL.white }), 0, 0, 0); for (const s of [-1, 1]) p.at('paint', box(0.03, 0.2, 0.25, { color: COL.white }), s * ((spec.w || 0.9) / 2 - 0.05), -0.11, 0); return { static: p.list, size: [spec.w || 0.9, 0.25, 0.3], centred: true }; }
export function petBowls(spec, ctx) { const p = new P(); for (const x of [-0.1, 0.1]) { p.at('metal', cyl(0.09, 0.07, 0.05, 12, { color: COL.steel }, true), x, 0.025, 0); p.at('metal', cyl(0.07, 0.07, 0.01, 12, { color: COL.steel }), x, 0.005, 0); } p.at('matte', box(0.5, 0.12, 0.38, { color: [0.4, 0.45, 0.5] }), 0.5, 0.06, 0.1); return { static: p.list, size: [0.9, 0.15, 0.4], low: true }; }
export function areaRug(spec, ctx) { const p = new P(); const g = plane(spec.w || 3.0, spec.d || 2.2, 1, 1, { color: spec.colour || [0.55, 0.5, 0.45] }); g.rotateX(-H); p.add('fabric', g); return { static: p.list, size: [spec.w || 3, 0.01, spec.d || 2.2], low: true }; }
export function bayCushion(spec, ctx) { const p = new P(); p.at('fabric', rounded(1.35, 0.06, 0.38, 0.03, 3, { color: COL.sage }), 0, 0.03, 0); p.at('fabric', rounded(0.4, 0.4, 0.1, 0.04, 3, { color: COL.terracotta }), -0.4, 0.26, -0.12, 0, 0, 0.2); return { static: p.list, size: [1.35, 0.4, 0.4], low: true }; }
export function tvOutdoor(spec, ctx) {
  const p = new P();
  p.at('gloss', box(0.9, 0.52, 0.04, { color: COL.black }), 0, 0, 0);
  p.at('matte', box(0.84, 0.46, 0.005, { color: [0.05, 0.05, 0.06] }), 0, 0, 0.022);
  p.at('matte', box(0.3, 0.25, 0.04, { color: COL.charcoal }), 0, 0, -0.04);
  return { static: p.list, size: [0.9, 0.52, 0.1], centred: true };
}

// ---- vehicles ---------------------------------------------------------------------------------------------------
export function car(spec, ctx) {
  const p = new P();
  const c = spec.colour || [0.55, 0.58, 0.62];
  const truck = !!spec.truck;
  const L = truck ? 5.4 : 4.5, W = 1.85, wheelR = 0.34;
  p.at('glossWet', rounded(W, 0.5, L, 0.08, 3, { color: c }), 0, 0.55, 0);
  if (truck) { p.at('glossWet', rounded(W - 0.05, 0.7, 2.0, 0.1, 3, { color: c }), 0, 1.1, -0.8); p.at('matte', box(W - 0.2, 0.05, 2.0, { color: COL.charcoal }), 0, 0.82, 1.6); p.at('glossWet', box(0.06, 0.45, 2.1, { color: c }), -W / 2 + 0.05, 1.03, 1.6); p.at('glossWet', box(0.06, 0.45, 2.1, { color: c }), W / 2 - 0.05, 1.03, 1.6); p.at('glossWet', box(W - 0.05, 0.45, 0.06, { color: c }), 0, 1.03, 2.62); }
  else p.at('glossWet', rounded(W - 0.15, 0.55, 2.4, 0.15, 3, { color: c }), 0, 1.05, -0.1);
  p.at('glass', box(W - 0.2, 0.42, truck ? 1.9 : 2.3, { color: [0.6, 0.7, 0.75] }), 0, 1.08, truck ? -0.8 : -0.1);
  for (const [x, z] of [[-W / 2 + 0.05, L * 0.32], [W / 2 - 0.05, L * 0.32], [-W / 2 + 0.05, -L * 0.32], [W / 2 - 0.05, -L * 0.32]]) { p.at('rubber', cyl(wheelR, wheelR, 0.22, 16, { color: COL.rubber }), x, wheelR, z, 0, 0, H); p.at('metal', cyl(0.2, 0.2, 0.24, 10, { color: COL.chrome }), x, wheelR, z, 0, 0, H); }
  p.at('matte', box(W - 0.1, 0.12, 0.08, { color: COL.charcoal }), 0, 0.42, -L / 2 + 0.02);
  p.at('matte', box(W - 0.1, 0.12, 0.08, { color: COL.charcoal }), 0, 0.42, L / 2 - 0.02);
  for (const s of [-1, 1]) { const tail = new THREE.Mesh(box(0.2, 0.08, 0.02, { color: [1, 1, 1] }), ctx.mats.variant('ledBlue', 'tail', { emissive: 0xff2222, emissiveIntensity: 0.3 })); tail.position.set(s * (W / 2 - 0.2), 0.7, L / 2 + 0.0); tail.name = 'tail'; p.parts[`tail${s}`] = tail; }
  for (const s of [-1, 1]) p.at('matte', box(0.24, 0.1, 0.03, { color: [0.9, 0.9, 0.85] }), s * (W / 2 - 0.25), 0.7, -L / 2 - 0.01);
  p.at('metal', cyl(0.01, 0.01, 0.15, 6, { color: COL.chrome }), 0, 0.85, 0, 0, 0, 0);
  const meshes = p.meshes(ctx.mats, { name: spec.id });
  const crushed = new THREE.Mesh(merge([place(rounded(W - 0.4, 0.3, 2.2, 0.1, 3, { color: mulRgb(rgb(c), 0.8) }), 0, 0.75, -0.1, 0.1, 0, 0.15)]), ctx.mats.get('glossWet'));
  crushed.name = 'crushed'; crushed.visible = false;
  const g = g0(ctx, spec.id, ...meshes, crushed, hitProxy(W, 1.5, L, 0, spec.id));
  return { group: g, size: [W, 1.5, L], collider: true, parts: { crushed, ...p.parts } };
}
export function minivan(spec, ctx) {
  const p = new P();
  const c = [0.75, 0.76, 0.78], L = 5.0, W = 1.95;
  p.at('glossWet', rounded(W, 0.55, L, 0.1, 3, { color: c }), 0, 0.58, 0);
  p.at('glossWet', rounded(W - 0.1, 0.9, 3.6, 0.2, 3, { color: c }), 0, 1.25, 0.3);
  p.at('glass', box(W - 0.2, 0.5, 3.4, { color: [0.6, 0.7, 0.75] }), 0, 1.35, 0.3);
  for (const [x, z] of [[-W / 2 + 0.05, 1.6], [W / 2 - 0.05, 1.6], [-W / 2 + 0.05, -1.5], [W / 2 - 0.05, -1.5]]) { p.at('rubber', cyl(0.36, 0.36, 0.22, 16, { color: COL.rubber }), x, 0.36, z, 0, 0, H); p.at('metal', cyl(0.2, 0.2, 0.24, 10, { color: COL.chrome }), x, 0.36, z, 0, 0, H); }
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(W, 1.8, L, 0, spec.id));
  return { group: g, size: [W, 1.8, L], collider: true };
}
export function pickup(spec, ctx) { return car({ ...spec, truck: true, colour: spec.colour || [0.9, 0.9, 0.88] }, ctx); }
export function cruiser(spec, ctx) {
  const r = car({ ...spec, colour: [0.92, 0.92, 0.9] }, ctx);
  const bar = new THREE.Mesh(box(1.1, 0.12, 0.3, { color: [1, 1, 1] }), ctx.mats.variant('ledBlue', 'lightbar', { emissive: 0x3366ff, emissiveIntensity: 2 }));
  bar.position.set(0, 1.4, -0.3); bar.name = 'lightbar';
  r.group.add(bar); r.parts = { ...r.parts, lightbar: bar };
  const stripe = new THREE.Mesh(box(1.9, 0.25, 4.4, { color: [0.1, 0.12, 0.2] }), ctx.mats.get('gloss')); stripe.position.y = 0.72; stripe.scale.set(1.01, 1, 0.999); r.group.add(stripe);
  return r;
}
export function bucketTruck(spec, ctx) {
  const p = new P();
  const c = COL.white, L = 8.0, W = 2.4;
  p.at('glossWet', box(W, 0.6, L, { color: [0.3, 0.3, 0.32] }), 0, 0.7, 0);
  p.at('glossWet', rounded(W, 1.4, 2.2, 0.15, 3, { color: c }), 0, 1.7, -2.6);
  p.at('glass', box(W - 0.2, 0.6, 0.8, { color: [0.6, 0.7, 0.75] }), 0, 2.0, -3.4);
  p.at('glossWet', box(W, 1.2, 4.5, { color: c }), 0, 1.6, 1.5);
  const decal = plane(2.0, 0.5, 1, 1, { color: [1, 1, 1] }); place(decal, W / 2 + 0.005, 1.7, 1.5, H); p.add('truckDecal', decal);
  for (const z of [-2.6, 1.0, 2.4]) for (const s of [-1, 1]) { p.at('rubber', cyl(0.5, 0.5, 0.3, 16, { color: COL.rubber }), s * (W / 2 - 0.1), 0.5, z, 0, 0, H); }
  const boom = new THREE.Group(); boom.name = 'boom'; boom.position.set(0, 2.2, 2.5);
  const bp = new P(); bp.at('glossWet', box(0.35, 0.35, 5.0, { color: c }), 0, 0, -2.5); bp.at('glossWet', box(0.9, 1.0, 0.9, { color: c }), 0, 0.5, -5.2);
  boom.add(...bp.meshes(ctx.mats, { name: 'boom' })); boom.rotation.x = -0.15;
  p.at('glossWet', cyl(0.5, 0.5, 0.4, 12, { color: c }), 0, 2.2, 2.5);
  for (const s of [-1, 1]) p.at('matte', box(0.2, 0.9, 0.2, { color: COL.yellow }), s * (W / 2 + 0.3), 0.45, 0, 0, 0, 0);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), boom, hitProxy(W + 0.6, 3.2, L, 0, spec.id));
  g.userData.setBoom = (up) => { boom.rotation.x = -0.15 - up * 1.1; };
  return { group: g, size: [W + 0.6, 3.2, L], collider: true, parts: { boom, boomUp: boom } };
}
export function cowTrailer(spec, ctx) {
  const p = new P();
  p.at('glossWet', box(2.4, 2.2, 5.0, { color: COL.white }), 0, 1.6, 0);
  p.at('matte', box(0.3, 0.3, 1.5, { color: COL.charcoal }), 0, 0.5, -3.0);
  for (const s of [-1, 1]) p.at('rubber', cyl(0.4, 0.4, 0.25, 14, { color: COL.rubber }), s * 1.1, 0.4, 0.5, 0, 0, H);
  p.at('alu', cyl(0.12, 0.15, 12, 8, { color: COL.lightGrey }), 0, 8.0, 1.5);
  for (const y of [11, 13]) p.at('alu', box(0.3, 0.6, 0.15, { color: COL.lightGrey }), 0, y, 1.5);
  for (let i = 0; i < 3; i++) p.at('alu', cyl(0.01, 0.01, 12, 4, { color: COL.charcoal }), Math.sin(i * 2.1) * 3, 6, 1.5 + Math.cos(i * 2.1) * 3, 0, 0.4 * Math.sin(i * 2.1), 0.4 * Math.cos(i * 2.1));
  p.at('matte', box(1.0, 1.2, 0.8, { color: COL.charcoal }), 1.5, 0.6, -1.5);   // the generator
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(3.2, 3.0, 6.5, 0, spec.id));
  return { group: g, size: [3.2, 3.0, 6.5], collider: true };
}
export function boatTrailer(spec, ctx) {
  const p = new P();
  p.at('alu', box(0.1, 0.1, 5.0, { color: COL.lightGrey }), 0, 0.5, 0);
  for (const s of [-1, 1]) { p.at('alu', box(0.08, 0.08, 3.6, { color: COL.lightGrey }), s * 0.9, 0.5, 0.3); p.at('rubber', cyl(0.32, 0.32, 0.2, 14, { color: COL.rubber }), s * 1.05, 0.32, 0.6, 0, 0, H); }
  p.at('glossWet', rounded(2.0, 0.8, 5.4, 0.25, 4, { color: COL.white }), 0, 1.0, -0.2);
  p.at('glossWet', box(1.6, 0.5, 2.0, { color: [0.2, 0.25, 0.3] }), 0, 1.6, 0.2);
  p.at('glass', box(1.5, 0.35, 0.05, { color: [0.6, 0.7, 0.75] }), 0, 1.75, -0.8);
  p.at('matte', box(0.4, 0.6, 0.3, { color: COL.charcoal }), 0, 1.2, 2.6);
  p.at('cloth', box(2.05, 0.05, 3.0, { color: [0.2, 0.3, 0.6] }), 0, 1.42, -1.2);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(2.2, 2.0, 6.0, 0, spec.id));
  return { group: g, size: [2.2, 2.0, 6.0], collider: true };
}
export function boatLift(spec, ctx) {
  const p = new P();
  for (const [x, z] of [[-1.4, -2.5], [1.4, -2.5], [-1.4, 2.5], [1.4, 2.5]]) p.at('alu', cyl(0.12, 0.12, 4.5, 8, { color: COL.lightGrey }), x, 2.0, z);
  for (const x of [-1.4, 1.4]) p.at('alu', box(0.15, 0.15, 5.4, { color: COL.lightGrey }), x, 4.2, 0);
  const cradle = new THREE.Group(); cradle.name = 'cradle'; cradle.position.y = 2.6;
  const cp = new P();
  for (const x of [-0.9, 0.9]) cp.at('alu', box(0.2, 0.15, 5.0, { color: COL.lightGrey }), x, 0, 0);
  cp.at('glossWet', rounded(2.0, 0.8, 5.6, 0.25, 4, { color: COL.white }), 0, 0.5, 0);
  cp.at('glossWet', box(1.5, 0.5, 2.0, { color: [0.25, 0.3, 0.35] }), 0, 1.1, 0.3);
  cp.at('cloth', box(2.05, 0.05, 5.2, { color: [0.15, 0.25, 0.5] }), 0, 0.92, 0);
  cradle.add(...cp.meshes(ctx.mats, { name: 'cradle' }));
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), cradle);
  return { group: g, size: [3.2, 5, 5.6], collider: false, parts: { cradle } };
}
export function trampoline(spec, ctx) {
  const p = new P();
  p.at('cloth', cyl(2.0, 2.0, 0.04, 24, { color: [0.1, 0.1, 0.12] }), 0, 0.85, 0);
  p.at('gloss', torus(2.05, 0.12, 8, 28, { color: [0.15, 0.4, 0.2] }), 0, 0.85, 0, 0, H, 0);
  for (let i = 0; i < 6; i++) p.at('alu', cyl(0.03, 0.03, 0.85, 6, { color: COL.lightGrey }), Math.sin(i * 1.047) * 1.9, 0.42, Math.cos(i * 1.047) * 1.9);
  for (let i = 0; i < 6; i++) p.at('alu', cyl(0.02, 0.02, 1.8, 6, { color: COL.lightGrey }), Math.sin(i * 1.047 + 0.52) * 1.6, 1.75, Math.cos(i * 1.047 + 0.52) * 1.6);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(4.2, 2.6, 4.2, 0, spec.id));
  return { group: g, size: [4.2, 2.6, 4.2], collider: true };
}

// ---- street furniture ------------------------------------------------------------------------------------------
export function mailbox(spec, ctx) {
  const p = new P();
  p.at('wood', box(0.1, 1.1, 0.1, { color: COL.oak }), 0, 0.55, 0);
  p.at('wood', box(0.1, 0.08, 0.4, { color: COL.oak }), 0, 1.05, 0.15);
  p.at('gloss', box(0.2, 0.2, 0.5, { color: COL.charcoal }), 0, 1.2, 0.2);
  p.at('gloss', cyl(0.1, 0.1, 0.5, 14, { color: COL.charcoal }), 0, 1.3, 0.2, 0, H, 0);
  p.at('gloss', box(0.03, 0.15, 0.03, { color: COL.red }), 0.12, 1.32, 0.1);
  p.at('matte', box(0.18, 0.05, 0.01, { color: COL.white }), 0, 1.2, 0.46);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.25, 1.45, 0.5, 0, spec.id));
  return { group: g, size: [0.25, 1.45, 0.5], collider: true };
}
export function binsLodged(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.62, 1.05, 0.68, { color: [0.12, 0.14, 0.16] }), 0, 0.35, 0, 0.3, 1.2, 0.2);
  p.at('matte', box(0.62, 1.05, 0.68, { color: [0.1, 0.32, 0.62] }), 0.9, 0.3, 0.4, -0.5, 0.2, 1.4);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }));
  return { group: g, size: [2.0, 0.8, 1.5], collider: false };
}
export function flagpole(spec, ctx) {
  const p = new P();
  p.at('alu', cyl(0.03, 0.045, 6.0, 8, { color: COL.lightGrey }), 0, 3.0, 0);
  p.at('metal', sphere(0.06, 8, { color: COL.brass }), 0, 6.05, 0);
  const cloth = new THREE.Mesh(plane(1.5, 0.8, 8, 4, { color: [1, 1, 1], flex: null }), ctx.mats.get('flag'));
  const fl = cloth.geometry.attributes.uv, pos = cloth.geometry.attributes.position, n = pos.count; const flex = new Float32Array(n);
  for (let i = 0; i < n; i++) flex[i] = 0.15 + 0.85 * (pos.getX(i) + 0.75) / 1.5;
  cloth.geometry.setAttribute('aFlex', new THREE.BufferAttribute(flex, 1)); void fl;
  cloth.position.set(0.78, 5.5, 0); cloth.name = 'cloth'; cloth.castShadow = true;
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), cloth);
  return { group: g, size: [0.2, 6.1, 0.2], collider: true, parts: { cloth } };
}
export function generac(spec, ctx) {
  const p = new P();
  p.at('gloss', rounded(1.2, 0.75, 0.65, 0.05, 3, { color: [0.85, 0.85, 0.8] }), 0, 0.5, 0);
  p.at('concrete', box(1.4, 0.12, 0.8, { color: [1, 1, 1] }), 0, 0.06, 0);
  for (let i = 0; i < 12; i++) p.at('matte', box(0.02, 0.5, 0.6, { color: [0.4, 0.4, 0.42] }), -0.55 + i * 0.1, 0.5, 0.0);
  p.at('matte', box(0.3, 0.1, 0.02, { color: COL.charcoal }), 0.3, 0.75, 0.33);
  return { group: g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id })), size: [1.4, 0.9, 0.8], collider: true };
}
export function windowsLit(spec, ctx) {
  // emissive quads slightly proud of a neighbour's front windows (positions authored by neighbourhood.js via spec.quads)
  const quads = spec.quads || [[0, 0, 0, 0.9, 1.2, 0]];
  const g = new THREE.Group(); g.name = spec.id;
  const mat = ctx.mats.variant('glow', spec.id, { emissive: 0xffd9a8, emissiveIntensity: 1.6, transparent: true, opacity: 0.85 });
  for (const [x, y, z, w, h, yaw] of quads) { const m = new THREE.Mesh(plane(w, h, 1, 1, { color: [1, 1, 1] }), mat); m.position.set(x, y, z); m.rotation.y = yaw; m.castShadow = false; g.add(m); }
  g.visible = false;
  return { group: g, size: [1, 1, 1], centred: true, absolute: true };
}
export function windowsDark(spec, ctx) {
  const quads = spec.quads || [[0, 0, 0, 0.9, 1.2, 0]];
  const g = new THREE.Group(); g.name = spec.id;
  const mat = ctx.mats.variant('matte', 'darkWindow', { color: 0x050608 });
  for (const [x, y, z, w, h, yaw] of quads) { const m = new THREE.Mesh(plane(w, h, 1, 1, { color: [0.02, 0.02, 0.03] }), mat); m.position.set(x, y, z); m.rotation.y = yaw; g.add(m); }
  g.visible = false;
  return { group: g, size: [1, 1, 1], centred: true, absolute: true };
}
export function ringDoorbell(spec, ctx) {
  const p = new P();
  p.at('matte', rounded(0.06, 0.13, 0.03, 0.008, 2, { color: [0.15, 0.15, 0.17] }), 0, 0, 0);
  const led = new THREE.Mesh(torus(0.014, 0.004, 6, 16, { color: [1, 1, 1] }), ctx.mats.variant('ledBlue', spec.id, {}));
  led.position.set(0, -0.03, 0.016); led.name = 'led';
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), led);
  return { group: g, size: [0.06, 0.13, 0.04], centred: true, parts: { led } };
}
export function looseGarageDoor(spec, ctx) {
  const g = plane(4.9, 2.13, 8, 4, { color: [1, 1, 1] }); g.translate(0, 1.065, 0);
  // crumple: bend the panel slightly
  const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.12 * Math.sin(pos.getX(i) * 1.3) * (pos.getY(i) / 2.13)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, ctx.mats.variant('garageDoor', 'loose', { side: THREE.DoubleSide }));
  m.castShadow = true;
  return { group: g0(ctx, spec.id, m), size: [4.9, 2.13, 0.3], collider: false };
}
export function plywoodPair(spec, ctx) {
  const mk = (name) => { const m = new THREE.Mesh(plane(1.22, 1.5, 6, 6, { color: [0.86, 0.7, 0.45], flex: 0.4 }), ctx.mats.variant('wood', 'plywood', { side: THREE.DoubleSide })); m.name = name; m.castShadow = true; return m; };
  const s1 = mk('sheet1'), s2 = mk('sheet2');
  const [x, y, z] = spec.second; s2.position.set(x - spec.pos[0], y - spec.pos[1], z - spec.pos[2]);
  return { group: g0(ctx, spec.id, s1, s2), size: [1.3, 1.5, 0.1], centred: true, parts: { sheet1: s1, sheet2: s2 } };
}
export function tarp(spec, ctx) {
  const g = plane(4.0, 5.0, 12, 12, { color: [1, 1, 1], flex: 0.5 });
  const pos = g.attributes.position; const flex = g.attributes.aFlex; for (let i = 0; i < pos.count; i++) flex.setX(i, 0.15 + 0.6 * Math.abs(pos.getX(i)) / 2.0);
  const m = new THREE.Mesh(g, ctx.mats.variant('cloth', 'tarp', { color: 0x2a5fc9, side: THREE.DoubleSide }));
  m.rotation.x = -H + 0.32; if (spec.slope === 'W') m.rotation.y = PI;
  m.position.y = 3.6; m.castShadow = true; m.name = 'tarp';
  return { group: g0(ctx, spec.id, m), size: [4, 0.1, 5], centred: true, absolute: false };
}
export function kerbPile(spec, ctx) {
  const p = new P(), S = ctx.stream;
  const veg = new THREE.Group(); veg.name = 'vegetative';
  const vp = new P();
  for (let i = 0; i < 14; i++) vp.at('leafHedge', plane(0.6, 1.4, 1, 2, { color: [1, 1, 1] }), (S.nextFloat() - 0.5) * 2.2, 0.3 + S.nextFloat() * 0.5, (S.nextFloat() - 0.5) * 1.2, S.nextFloat() * 6.28, S.nextFloat() * 1.5, S.nextFloat());
  vp.at('barkOak', cyl(0.12, 0.15, 2.5, 8, { color: [1, 1, 1] }), 0, 0.3, 0, 0.4, 0, H);
  vp.at('barkRing', cyl(0.1, 0.12, 2.0, 8, { color: [1, 1, 1] }), 0.5, 0.55, 0.3, -0.3, 0.2, H);
  veg.add(...vp.meshes(ctx.mats, { name: 'veg' }));
  const cd = new THREE.Group(); cd.name = 'cd'; cd.position.x = 3.2;
  const cp = new P();
  cp.at('drywall', box(1.2, 0.05, 0.9, { color: [0.95, 0.95, 0.9] }), 0, 0.1, 0, 0.3, 0, 0.2);
  cp.at('alu', box(0.05, 0.05, 2.4, { color: COL.lightGrey }), 0.3, 0.25, 0, 0.6);
  cp.at('screen', plane(1.2, 1.5, 2, 2, { color: [1, 1, 1] }), -0.3, 0.4, 0.2, 0.5, -1.2, 0.2);
  cp.at('shingle', box(0.6, 0.02, 0.4, { color: [1, 1, 1] }), 0.4, 0.3, -0.3, 1.0);
  cp.at('cloth', box(0.8, 0.5, 0.6, { color: [0.85, 0.8, 0.7] }), -0.2, 0.25, -0.3, 0.2); // an insulation bag
  cd.add(...cp.meshes(ctx.mats, { name: 'cd' }));
  void p;
  const g = g0(ctx, spec.id, veg, cd);
  g.userData.setVolume = (m3) => { const s = Math.max(0.2, Math.min(2.2, Math.cbrt(Math.max(0.05, m3) / 2))); veg.scale.setScalar(s); cd.scale.setScalar(s * 0.8); };
  return { group: g, size: [5, 1.5, 2], collider: false, parts: { vegetative: veg, cd } };
}
export function flyers(spec, ctx) {
  const p = new P();
  for (let i = 0; i < 4; i++) p.at('matte', box(0.14, 0.2, 0.004, { color: [[0.95, 0.9, 0.3], [0.9, 0.9, 0.9], [0.4, 0.7, 0.9], [0.95, 0.6, 0.3]][i] }), 0.06, 0.3 - i * 0.05, 0.03 + i * 0.006, 0.2 * (i - 1.5));
  return { group: g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id })), size: [0.2, 0.4, 0.1], centred: true };
}
export function trafficCone(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.36, 0.03, 0.36, { color: COL.orange }), 0, 0.015, 0);
  p.at('matte', cone(0.16, 0.7, 12, { color: COL.orange }), 0, 0.38, 0);
  p.at('matte', cyl(0.11, 0.13, 0.08, 12, { color: COL.white }), 0, 0.45, 0);
  return { group: g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id })), size: [0.36, 0.72, 0.36], low: false };
}
export function pole(spec, ctx) {
  const p = new P();
  const h = spec.h || 9.5;
  p.at('barkOak', cyl(0.13, 0.17, h, 10, { color: [0.7, 0.62, 0.5] }), 0, h / 2 - 0.5, 0);
  p.at('wood', box(2.4, 0.1, 0.1, { color: [0.5, 0.42, 0.3] }), 0, h - 1.0, 0);
  for (const x of [-1.0, 0, 1.0]) p.at('gloss', cyl(0.05, 0.06, 0.12, 8, { color: [0.4, 0.45, 0.5] }), x, h - 0.9, 0);
  if (spec.transformer) { p.at('matte', cyl(0.32, 0.32, 0.8, 12, { color: [0.45, 0.47, 0.44] }), 0.45, h - 2.0, 0); p.at('matte', box(0.1, 0.1, 0.1, { color: COL.charcoal }), 0.45, h - 1.5, 0); }
  return { group: g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id })), size: [0.35, h, 0.35], collider: true };
}
export function transformerCan(spec, ctx) {
  const p = new P();
  p.at('matte', cyl(0.32, 0.32, 0.8, 12, { color: [0.55, 0.58, 0.55] }), 0, 0, 0);
  p.at('matte', box(0.1, 0.1, 0.1, { color: COL.charcoal }), 0, 0.5, 0);
  return { group: g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id })), size: [0.7, 0.8, 0.7], centred: true };
}
export function lineSpan(spec, ctx) {
  // 'up': three sagging wires between (20,−2.5) and (32,10) at 8.5 m; 'down': the same wires on the ground
  const up = new THREE.Group(); up.name = 'up'; const down = new THREE.Group(); down.name = 'down'; down.visible = false;
  const mat = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
  const mk = (y0, y1, sag, dz) => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(12 * t, y0 + (y1 - y0) * t - sag * Math.sin(t * PI), 12.5 * t + dz)); } return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); };
  for (const dz of [-0.4, 0, 0.4]) up.add(mk(8.6, 8.6, 0.5, dz));
  for (const dz of [-0.4, 0, 0.4]) down.add(mk(8.6, 0.3, 2.5, dz));
  const g = g0(ctx, spec.id, up, down);
  return { group: g, size: [1, 1, 1], centred: true, parts: { up, down } };
}
export function stopSign(spec, ctx) {
  const p = new P();
  p.at('alu', cyl(0.035, 0.035, 2.3, 8, { color: [0.55, 0.56, 0.58] }), 0, 1.15, 0);
  const face = new THREE.Mesh(plane(0.75, 0.75, 1, 1, { color: [1, 1, 1] }), ctx.mats.get('stopSign')); face.position.set(0, 2.2, 0.02); face.name = 'face';
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), face);
  return { group: g, size: [0.8, 2.6, 0.2], collider: true };
}
export function fountain(spec, ctx) {
  const p = new P();
  p.at('matte', cyl(0.5, 0.5, 0.4, 12, { color: COL.charcoal }), 0, 0.0, 0);
  const spray = new THREE.Mesh(cone(0.8, 3.5, 12, { color: [0.9, 0.95, 1] }), ctx.mats.variant('water', 'spray', { opacity: 0.35, color: 0xcfe8ff }));
  spray.position.y = 1.9; spray.rotation.x = PI; spray.name = 'spray';
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), spray);
  return { group: g, size: [1, 4, 1], parts: { spray } };
}
export function figure(spec, ctx) {
  const p = new P();
  p.at('fabric', rounded(0.44, 0.7, 0.26, 0.1, 3, { color: [0.3, 0.4, 0.6] }), 0, 1.15, 0);
  p.at('fabric', rounded(0.4, 0.85, 0.24, 0.08, 3, { color: [0.35, 0.33, 0.3] }), 0, 0.42, 0);
  p.at('fabric', sphere(0.12, 10, { color: [0.85, 0.7, 0.58] }), 0, 1.66, 0);
  p.at('matte', cyl(0.13, 0.13, 0.06, 12, { color: [0.85, 0.82, 0.7] }), 0, 1.76, 0);
  for (const s of [-1, 1]) p.at('fabric', cyl(0.05, 0.045, 0.62, 8, { color: [0.85, 0.7, 0.58] }), s * 0.28, 1.15, 0, 0, 0, s * 0.15);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.5, 1.8, 0.3, 0, spec.id));
  return { group: g, size: [0.5, 1.8, 0.3], collider: false };
}
export function dog(spec, ctx) {
  const p = new P();
  const c = [0.72, 0.55, 0.32];
  p.at('fabric', rounded(0.24, 0.26, 0.6, 0.1, 3, { color: c }), 0, 0.42, 0);
  p.at('fabric', rounded(0.2, 0.18, 0.26, 0.08, 3, { color: c }), 0, 0.6, 0.38);
  p.at('fabric', box(0.1, 0.08, 0.14, { color: mulRgb(rgb(c), 0.7) }), 0, 0.55, 0.53);
  for (const [x, z] of [[-0.08, 0.2], [0.08, 0.2], [-0.08, -0.2], [0.08, -0.2]]) p.at('fabric', cyl(0.035, 0.03, 0.3, 6, { color: c }), x, 0.15, z);
  for (const s of [-1, 1]) p.at('fabric', box(0.05, 0.1, 0.03, { color: mulRgb(rgb(c), 0.8) }), s * 0.09, 0.7, 0.36, 0, 0, s * 0.3);
  const tail = new THREE.Mesh(cyl(0.02, 0.01, 0.28, 6, { color: [1, 1, 1] }), ctx.mats.get('fabric')); tail.position.set(0, 0.5, -0.36); tail.rotation.x = -0.9; tail.name = 'tail';
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), tail, hitProxy(0.35, 0.75, 0.9, 0, spec.id));
  return { group: g, size: [0.35, 0.75, 0.9], collider: false, parts: { tail } };
}
export function bikes(spec, ctx) {
  const p = new P();
  for (const [dx, c] of [[0, [0.8, 0.2, 0.5]], [0.6, [0.2, 0.5, 0.9]]]) {
    for (const z of [-0.3, 0.3]) p.at('rubber', torus(0.22, 0.02, 6, 16, { color: COL.rubber }), dx, 0.24, z, 0, 0, 0);
    p.at('gloss', box(0.03, 0.03, 0.6, { color: c }), dx, 0.45, 0, 0, 0, 0);
    p.at('gloss', box(0.03, 0.35, 0.03, { color: c }), dx, 0.45, 0.1, 0, 0, 0.3);
    p.at('matte', box(0.3, 0.02, 0.03, { color: COL.black }), dx, 0.72, 0.28);
    p.at('matte', box(0.15, 0.03, 0.2, { color: COL.black }), dx, 0.65, -0.1);
  }
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }));
  return { group: g, size: [1.0, 0.8, 0.7], collider: false };
}
export function fallenLimb(spec, ctx) {
  const p = new P();
  p.at('barkRing', cyl(0.06, 0.1, 2.6, 8, { color: [1, 1, 1] }), 0, 0.1, 0, 0.2, 0, H);
  for (let i = 0; i < 5; i++) p.at('frondQueen', plane(2.2, 0.5, 4, 1, { color: [1, 1, 1] }), 0.6 + i * 0.4, 0.12, 0.3 - i * 0.15, 0.3 + i * 0.4, 0, 0.1);
  const g = g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }));
  return { group: g, size: [3, 0.4, 1.5], low: true };
}
export function shingleDecals(spec, ctx) {
  const p = new P(), S = ctx.stream;
  for (let i = 0; i < 18; i++) p.at('felt', plane(0.35 + S.nextFloat() * 0.5, 0.3 + S.nextFloat() * 0.4, 1, 1, { color: [1, 1, 1] }), 0, 0, 0);
  const g = new THREE.Group(); g.name = spec.id; g.visible = false;
  return { group: g, size: [1, 1, 1], patches: p.list, centred: true, absolute: true };
}
export function heron(spec, ctx) {
  const p = new P();
  p.at('fabric', rounded(0.16, 0.35, 0.5, 0.06, 3, { color: [0.55, 0.6, 0.66] }), 0, 0.55, 0);
  p.at('fabric', cyl(0.03, 0.04, 0.5, 6, { color: [0.55, 0.6, 0.66] }), 0, 0.95, 0.15, 0, 0.3, 0);
  p.at('fabric', sphere(0.06, 8, { color: [0.6, 0.64, 0.7] }), 0, 1.2, 0.25);
  p.at('matte', cone(0.015, 0.16, 6, { color: COL.yellow }), 0, 1.2, 0.36, 0, H, 0);
  for (const s of [-1, 1]) p.at('matte', cyl(0.012, 0.012, 0.42, 5, { color: COL.charcoal }), s * 0.05, 0.2, 0);
  return { group: g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id })), size: [0.3, 1.3, 0.6] };
}
export function dragonflies(spec, ctx) {
  const g = new THREE.Group(); g.name = spec.id; const S = ctx.stream;
  const p = new P();
  for (let i = 0; i < 16; i++) p.at('screen', plane(0.12, 0.03, 1, 1, { color: [0.8, 0.85, 0.9] }), (S.nextFloat() - 0.5) * 8, 0.5 + S.nextFloat() * 2, (S.nextFloat() - 0.5) * 8, S.nextFloat() * 6, 0, 0);
  g.add(...p.meshes(ctx.mats, { name: spec.id, castShadow: false }));
  return { group: g, size: [8, 3, 8], centred: true };
}
function birdFlock(spec, ctx, n, spread, size, color) {
  const g = new THREE.Group(); g.name = spec.id; const S = ctx.stream;
  const geom = plane(size, size * 0.35, 1, 1, { color });
  const mesh = new THREE.InstancedMesh(geom, ctx.mats.variant('matte', 'bird', { side: THREE.DoubleSide }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) { v.set((S.nextFloat() - 0.5) * spread, (S.nextFloat() - 0.5) * spread * 0.3, (S.nextFloat() - 0.5) * spread); e.set(-H + (S.nextFloat() - 0.5) * 0.6, S.nextFloat() * 6, 0); q.setFromEuler(e); m.compose(v, q, s); mesh.setMatrixAt(i, m); }
  mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; mesh.name = `${spec.id}:birds`; mesh.castShadow = false;
  g.add(mesh);
  return { group: g, size: [spread, spread * 0.3, spread], centred: true, parts: { birds: mesh } };
}
export function flock(spec, ctx) { return birdFlock(spec, ctx, 60, 40, 0.5, [0.2, 0.2, 0.22]); }
export function buzzards(spec, ctx) { return birdFlock(spec, ctx, 7, 25, 1.4, [0.1, 0.1, 0.1]); }
export function eyeBirds(spec, ctx) { return birdFlock(spec, ctx, 90, 120, 0.9, [0.9, 0.9, 0.9]); }
export function streetlightPole(spec, ctx) {
  const p = new P();
  const h = 9.0, arm = spec.arm ?? -1.9;
  p.at('concrete', cyl(0.12, 0.18, h, 10, { color: [0.85, 0.85, 0.83] }), 0, h / 2, 0);
  if (arm !== 0) { p.at('alu', cyl(0.05, 0.06, Math.abs(arm) + 0.2, 8, { color: [0.6, 0.6, 0.62] }), arm / 2, h - 0.15, 0, 0, 0, H); }
  p.at('matte', box(0.55, 0.16, 0.3, { color: [0.45, 0.46, 0.48] }), arm, h - 0.1, 0);
  const lens = new THREE.Mesh(box(0.35, 0.03, 0.22, { color: [1, 1, 1] }), ctx.mats.variant('glowCool', spec.id, {}));
  lens.position.set(arm, h - 0.19, 0); lens.name = 'lens';
  return { group: g0(ctx, spec.id, ...p.meshes(ctx.mats, { name: spec.id }), lens), size: [0.4, h, 0.4], collider: true, parts: { lens } };
}
export function stormInlet(spec, ctx) { const p = new P(); p.at('concrete', box(0.9, 0.5, 0.9, { color: [1, 1, 1] }), 0, 0.2, 0); p.at('matte', box(0.7, 0.04, 0.7, { color: [0.3, 0.3, 0.32] }), 0, 0.46, 0); for (let i = 0; i < 6; i++) p.at('matte', box(0.7, 0.05, 0.04, { color: [0.2, 0.2, 0.22] }), 0, 0.47, -0.3 + i * 0.12); return { static: p.list, size: [0.9, 0.5, 0.9] }; }
export function padMount(spec, ctx) { const p = new P(); p.at('gloss', box(1.2, 0.9, 0.9, { color: [0.2, 0.42, 0.28] }), 0, 0.45, 0); p.at('concrete', box(1.4, 0.1, 1.1, { color: [1, 1, 1] }), 0, 0.05, 0); return { group: g0(ctx, 'padMount', ...p.meshes(ctx.mats, { name: 'padMount' })), size: [1.4, 1.0, 1.1], collider: true }; }
export function hoaSignMonument(spec, ctx) {
  const p = new P();
  p.at('stucco', box(3.2, 1.4, 0.4, { color: [0.94, 0.92, 0.88] }), 0, 0.7, 0);
  p.at('stucco', box(3.4, 0.12, 0.6, { color: [0.85, 0.82, 0.75] }), 0, 1.45, 0);
  const sign = new THREE.Mesh(plane(2.6, 1.3, 1, 1, { color: [1, 1, 1] }), ctx.mats.get('hoaSign')); sign.position.set(0, 0.72, 0.205);
  return { group: g0(ctx, 'hoaSign', ...p.meshes(ctx.mats, { name: 'hoaSign' }), sign), size: [3.4, 1.6, 0.6], collider: true };
}
