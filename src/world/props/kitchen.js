/**
 * world/props/kitchen.js — cabinets, island, sink, fridge (with its door pivot and the notepad), range, OTR
 * microwave, coffee maker, thermoses, jugs, water cases, the junk drawer, pantry shelves, kitchen clutter
 * (DESIGN §3.3 kitchen/pantry; T §6). Owner: E4 world+textures. Writes no state.
 */
import { P, COL, box, rounded, cyl, sphere, torus, plane, place, rgb, mulRgb, merge, THREE, hitProxy } from './common.js';

const H = Math.PI / 2;
const CAB = [0.94, 0.93, 0.9]; // shaker white

/** Base cabinet run: w along x, back at −z, doors/drawers on +z, granite top. */
export function baseCabinets(spec, ctx) {
  const p = new P();
  const w = spec.w, d = 0.6, h = 0.9;
  p.at('wood', box(w, h - 0.1, d - 0.05, { color: CAB }), 0, (h - 0.1) / 2 + 0.1, -0.025);
  p.at('wood', box(w, 0.1, d - 0.12, { color: mulRgb(rgb(CAB), 0.4) }), 0, 0.05, -0.06);      // toe kick
  p.at('granite', box(w + 0.03, 0.035, d + 0.02, { color: [1, 1, 1] }), 0, h - 0.0175, 0.01);
  const n = Math.max(1, Math.round(w / 0.6));
  const cw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + cw * (i + 0.5);
    const drawer = spec.drawers && i === spec.drawers;
    if (drawer) {
      for (let r = 0; r < 3; r++) { p.at('wood', box(cw - 0.03, 0.2, 0.02, { color: CAB }), x, 0.2 + r * 0.24, d / 2 - 0.035); p.at('metal', cyl(0.005, 0.005, 0.12, 6, { color: COL.chrome }), x, 0.2 + r * 0.24, d / 2 - 0.02, 0, 0, H); }
    } else {
      p.at('wood', box(cw - 0.03, 0.6, 0.02, { color: CAB }), x, 0.45, d / 2 - 0.035);
      p.at('wood', box(cw - 0.12, 0.5, 0.006, { color: mulRgb(rgb(CAB), 0.92) }), x, 0.45, d / 2 - 0.022);  // shaker recess
      p.at('metal', cyl(0.005, 0.005, 0.12, 6, { color: COL.chrome }), x + (i % 2 ? -1 : 1) * (cw / 2 - 0.07), 0.55, d / 2 - 0.02);
      p.at('wood', box(cw - 0.03, 0.18, 0.02, { color: CAB }), x, 0.8, d / 2 - 0.035);
    }
  }
  return { static: p.list, size: [w, h, d], collider: true, offset: [0, 0, 0] };
}
export function upperCabinets(spec, ctx) {
  const p = new P();
  const w = spec.w, d = 0.32, h = 0.76, y0 = 1.4;
  p.at('wood', box(w, h, d, { color: CAB }), 0, y0 + h / 2, -0.0);
  const n = Math.max(1, Math.round(w / 0.5)), cw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + cw * (i + 0.5);
    p.at('wood', box(cw - 0.03, h - 0.04, 0.02, { color: CAB }), x, y0 + h / 2, d / 2 + 0.005);
    p.at('wood', box(cw - 0.12, h - 0.16, 0.006, { color: mulRgb(rgb(CAB), 0.92) }), x, y0 + h / 2, d / 2 + 0.014);
    p.at('metal', cyl(0.005, 0.005, 0.12, 6, { color: COL.chrome }), x + (i % 2 ? 1 : -1) * (cw / 2 - 0.07), y0 + 0.15, d / 2 + 0.02);
  }
  p.at('wood', box(w, 0.06, 0.06, { color: CAB }), 0, y0 + h + 0.02, d / 2 - 0.03); // light rail
  return { static: p.list, size: [w, h + 0.1, d], collider: false, offset: [0, y0, 0], noCollider: true };
}
export function sinkUnit(spec, ctx) {
  const p = new P();
  // a double-bowl stainless sink set into the counter (the counter itself is the cabinet run's top)
  p.at('metal', box(0.8, 0.02, 0.5, { color: COL.steel }), 0, 0.885, 0);
  for (const x of [-0.2, 0.2]) p.at('metal', box(0.34, 0.2, 0.4, { color: mulRgb(rgb(COL.steel), 0.7) }), x, 0.79, 0);
  p.at('metal', cyl(0.018, 0.02, 0.2, 10, { color: COL.chrome }), 0, 0.99, -0.2);
  const spout = cyl(0.012, 0.012, 0.25, 8, { color: COL.chrome }); place(spout, 0, 1.12, -0.09, 0, H, 0); p.add('metal', spout);
  p.at('metal', sphere(0.02, 8, { color: COL.chrome }), 0, 1.1, -0.2);
  p.at('matte', box(0.32, 0.04, 0.22, { color: [0.7, 0.7, 0.68] }), 0.45, 0.92, 0.1);   // dish rack
  p.at('matte', box(0.08, 0.16, 0.05, { color: [0.3, 0.6, 0.35] }), -0.42, 0.98, -0.15);  // soap
  return { static: p.list, size: [0.9, 0.3, 0.55], collider: false, noCollider: true };
}
export function island(spec, ctx) {
  const p = new P();
  const w = 2.4, d = 0.9, h = 0.9;
  p.at('wood', box(w, h - 0.1, d, { color: [0.36, 0.42, 0.45] }), 0, 0.5, 0);
  p.at('wood', box(w, 0.1, d - 0.1, { color: [0.2, 0.22, 0.24] }), 0, 0.05, 0);
  p.at('granite', box(w + 0.3, 0.035, d + 0.3, { color: [1, 1, 1] }), 0, h - 0.0175, 0);
  for (let i = 0; i < 4; i++) { const x = -w / 2 + 0.6 * (i + 0.5); p.at('wood', box(0.55, 0.62, 0.02, { color: [0.38, 0.45, 0.48] }), x, 0.45, -d / 2 - 0.005); p.at('metal', cyl(0.005, 0.005, 0.12, 6, { color: COL.chrome }), x + 0.2, 0.55, -d / 2 - 0.02); }
  for (let i = 0; i < 2; i++) p.at('wood', box(1.1, 0.16, 0.02, { color: [0.38, 0.45, 0.48] }), -0.6 + i * 1.2, 0.8, -d / 2 - 0.005);
  // three counter stools on the great-room side (+z)
  for (const x of [-0.7, 0, 0.7]) {
    p.at('wood', cyl(0.17, 0.17, 0.04, 14, { color: COL.espresso }), x, 0.66, d / 2 + 0.35);
    for (let k = 0; k < 4; k++) p.at('wood', cyl(0.012, 0.015, 0.65, 6, { color: COL.espresso }), x + Math.sin(k * H + 0.785) * 0.13, 0.325, d / 2 + 0.35 + Math.cos(k * H + 0.785) * 0.13);
  }
  return { static: p.list, size: [w + 0.3, h, d + 0.3], collider: true, extraColliders: [[-0.7, 0, d / 2 + 0.35, 0.36, 0.7, 0.36], [0, 0, d / 2 + 0.35, 0.36, 0.7, 0.36], [0.7, 0, d / 2 + 0.35, 0.36, 0.7, 0.36]] };
}
export function fridge(spec, ctx) {
  const p = new P();
  const w = 0.9, d = 0.78, h = 1.78;
  p.at('metal', box(w, h, d, { color: COL.steel }), 0, h / 2, 0);
  p.at('matte', box(w - 0.02, 0.08, d - 0.02, { color: COL.charcoal }), 0, 0.04, 0);
  // door pivot (french-door top, freezer drawer below): the right-hand top door opens (hinge on +x edge of the front face)
  const doorG = new P();
  doorG.at('metal', box(w / 2 - 0.005, 1.1, 0.06, { color: COL.steel }), -(w / 4), 0, 0);
  doorG.at('metal', box(0.025, 0.7, 0.03, { color: COL.chrome }), -(w / 2) + 0.06, 0, 0.045);
  const door = new THREE.Group(); door.name = `${spec.id}:door`;
  door.position.set(w / 2, 0.68 + 0.55, d / 2 + 0.03);
  door.add(...doorG.meshes(ctx.mats, { name: `${spec.id}:door` }));
  door.userData = { part: 'door', openSign: 1, maxAngle: 1.7, setOpen(o) { door.rotation.y = Math.max(0, Math.min(1, o)) * 1.7; } };
  // the fixed left door and the freezer drawer (static)
  p.at('metal', box(w / 2 - 0.005, 1.1, 0.06, { color: COL.steel }), -(w / 4), 1.23, d / 2 + 0.03);
  p.at('metal', box(0.025, 0.7, 0.03, { color: COL.chrome }), -0.06, 1.23, d / 2 + 0.075);
  p.at('metal', box(w - 0.01, 0.56, 0.06, { color: COL.steel }), 0, 0.38, d / 2 + 0.03);
  p.at('metal', box(0.5, 0.025, 0.03, { color: COL.chrome }), 0, 0.6, d / 2 + 0.075);
  // water/ice dispenser recess on the left door
  p.at('matte', box(0.24, 0.32, 0.04, { color: COL.charcoal }), -0.24, 1.3, d / 2 + 0.05);
  // the fridge-temperature display
  const g = new THREE.Group();
  g.add(door);
  g.add(hitProxy(w, h, d + 0.08, 0, spec.id));
  return { static: p.list, group: g, size: [w, h, d + 0.08], collider: true, parts: { door }, screen: { part: 'display', pos: [-0.24, 1.42, d / 2 + 0.071], w: 0.18, h: 0.05, canvas: [96, 32] } };
}
export function fridgeGarage(spec, ctx) {
  const p = new P();
  const w = 0.75, d = 0.72, h = 1.7;
  p.at('gloss', box(w, h, d, { color: COL.offWhite }), 0, h / 2, 0);
  p.at('gloss', box(w - 0.02, 1.1, 0.02, { color: COL.offWhite }), 0, 1.15, d / 2 + 0.01);
  p.at('gloss', box(w - 0.02, 0.5, 0.02, { color: COL.offWhite }), 0, 0.3, d / 2 + 0.01);
  for (const y of [1.15, 0.3]) p.at('matte', box(0.03, 0.3, 0.03, { color: COL.lightGrey }), w / 2 - 0.08, y, d / 2 + 0.03);
  const g = new THREE.Group(); g.add(hitProxy(w, h, d, 0, spec.id));
  return { static: p.list, group: g, size: [w, h, d], collider: true };
}
export function chestFreezer(spec, ctx) {
  const p = new P();
  const w = 1.2, d = 0.65, h = 0.85;
  p.at('gloss', box(w, h, d, { color: COL.offWhite }), 0, h / 2, 0);
  p.at('gloss', box(w + 0.01, 0.06, d + 0.01, { color: COL.offWhite }), 0, h + 0.03, 0);
  p.at('matte', box(w - 0.1, 0.02, 0.04, { color: COL.lightGrey }), 0, h + 0.03, d / 2 + 0.02);
  const g = new THREE.Group(); g.add(hitProxy(w, h + 0.06, d, 0, spec.id));
  return { static: p.list, group: g, size: [w, h + 0.06, d], collider: true };
}
export function range(spec, ctx) {
  const p = new P();
  const w = 0.76, d = 0.66, h = 0.9;
  p.at('gloss', box(w, h, d, { color: COL.offWhite }), 0, h / 2, 0);
  p.at('gloss', box(w, 0.04, d, { color: COL.charcoal }), 0, h + 0.02, 0);
  for (const [x, z] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]]) p.at('matte', cyl(0.1, 0.1, 0.01, 16, { color: COL.black }), x, h + 0.045, z);
  p.at('gloss', box(w, 0.1, 0.06, { color: COL.offWhite }), 0, h + 0.09, -d / 2 + 0.03);    // backguard with the clock
  for (let i = 0; i < 4; i++) p.at('matte', cyl(0.018, 0.018, 0.02, 10, { color: COL.charcoal }), -0.25 + i * 0.16, h + 0.09, -d / 2 + 0.065, 0, H, 0);
  p.at('matte', box(w - 0.08, 0.45, 0.012, { color: COL.charcoal }), 0, 0.42, d / 2 + 0.005);  // oven window
  p.at('metal', cyl(0.012, 0.012, w - 0.1, 8, { color: COL.chrome }), 0, 0.7, d / 2 + 0.04, 0, 0, H);
  p.at('matte', box(w - 0.06, 0.12, 0.02, { color: COL.offWhite }), 0, 0.09, d / 2 + 0.01);    // warming drawer
  const g = new THREE.Group(); g.add(hitProxy(w, h + 0.12, d, 0, spec.id));
  return { static: p.list, group: g, size: [w, h + 0.12, d], collider: true, screen: { part: 'clock', pos: [0.15, h + 0.09, -d / 2 + 0.062], w: 0.1, h: 0.03, canvas: [96, 32] } };
}
export function microwave(spec, ctx) {
  const p = new P();
  const w = 0.76, d = 0.4, h = 0.42;
  p.at('gloss', box(w, h, d, { color: COL.offWhite }), 0, h / 2, 0);
  p.at('matte', box(0.48, 0.3, 0.012, { color: COL.charcoal }), -0.1, h / 2, d / 2 + 0.005);
  p.at('matte', box(0.2, 0.34, 0.01, { color: COL.lightGrey }), 0.26, h / 2, d / 2 + 0.005);
  p.at('matte', cyl(0.012, 0.012, 0.3, 8, { color: COL.chrome }), -0.1, h / 2, d / 2 + 0.03, 0, 0, 0);
  const g = new THREE.Group(); g.add(hitProxy(w, h, d, 0, spec.id));
  return { static: p.list, group: g, size: [w, h, d], collider: false, noCollider: true, screen: { part: 'clock', pos: [0.26, h / 2 + 0.1, d / 2 + 0.011], w: 0.12, h: 0.04, canvas: [96, 32] } };
}
export function coffeeMaker(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.2, 0.34, 0.24, { color: COL.charcoal }), 0, 0.17, -0.02);
  p.at('matte', box(0.2, 0.05, 0.24, { color: COL.charcoal }), 0, 0.025, 0.05);
  p.at('glass', cyl(0.075, 0.06, 0.16, 12, { color: [0.4, 0.3, 0.2] }), 0, 0.13, 0.06);
  p.at('matte', box(0.02, 0.1, 0.03, { color: COL.charcoal }), 0.085, 0.14, 0.06);
  const g = new THREE.Group(); g.add(hitProxy(0.22, 0.36, 0.28, 0, spec.id));
  return { static: p.list, group: g, size: [0.22, 0.36, 0.28], collider: false, noCollider: true };
}
export function thermos(spec, ctx) {
  const p = new P();
  p.at('metal', cyl(0.045, 0.045, 0.26, 12, { color: COL.steel }), 0, 0.13, 0);
  p.at('matte', cyl(0.035, 0.035, 0.03, 12, { color: COL.charcoal }), 0, 0.275, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.1, 0.3, 0.1, 0, spec.id));
  return { group: g, size: [0.1, 0.3, 0.1], collider: false, low: true };
}
export function jug(spec, ctx) {
  const p = new P();
  p.at('glossWet', rounded(0.15, 0.24, 0.15, 0.02, 2, { color: [0.85, 0.9, 0.95] }), 0, 0.12, 0);
  p.at('gloss', cyl(0.03, 0.03, 0.04, 10, { color: [0.85, 0.9, 0.95] }), 0, 0.26, 0);
  p.at('matte', cyl(0.032, 0.032, 0.015, 10, { color: [0.2, 0.3, 0.6] }), 0, 0.285, 0);
  p.at('gloss', box(0.02, 0.08, 0.05, { color: [0.85, 0.9, 0.95] }), 0.08, 0.2, 0);
  return { instanced: 'jug', static: p.list, size: [0.16, 0.3, 0.16], collider: false, low: true };
}
export function waterCase(spec, ctx) {
  const p = new P();
  const g = box(0.4, 0.21, 0.27, { color: [1, 1, 1] });
  p.add('waterCase', g);
  return { instanced: 'waterCase', static: p.list, size: [0.4, 0.21, 0.27], collider: false, low: true };
}
export function stockpot(spec, ctx) {
  const p = new P();
  p.at('metal', cyl(0.14, 0.13, 0.22, 16, { color: COL.steel }, true), 0, 0.11, 0);
  p.at('metal', cyl(0.13, 0.13, 0.01, 16, { color: COL.steel }), 0, 0.005, 0);
  p.at('metal', cyl(0.145, 0.145, 0.01, 16, { color: COL.steel }), 0, 0.225, 0);
  for (const s of [-1, 1]) p.at('metal', torus(0.03, 0.006, 6, 10, { color: COL.steel }), s * 0.15, 0.17, 0, 0, 0, H);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.32, 0.24, 0.32, 0, spec.id));
  return { group: g, size: [0.32, 0.24, 0.32], collider: false, low: true };
}
export function pots(spec, ctx) {
  const p = new P();
  p.at('metal', cyl(0.11, 0.1, 0.1, 14, { color: COL.steel }, true), -0.15, 0.05, 0);
  p.at('metal', cyl(0.1, 0.1, 0.01, 14, { color: COL.steel }), -0.15, 0.005, 0);
  p.at('metal', cyl(0.09, 0.08, 0.08, 14, { color: COL.steel }, true), 0.15, 0.04, 0);
  p.at('metal', cyl(0.08, 0.08, 0.01, 14, { color: COL.steel }), 0.15, 0.005, 0);
  p.at('matte', cyl(0.01, 0.01, 0.16, 6, { color: COL.charcoal }), 0.15, 0.07, 0.15, 0, H, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.5, 0.12, 0.25, 0, spec.id));
  return { group: g, size: [0.5, 0.12, 0.25], collider: false, low: true };
}
export function ziplocBox(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.24, 0.07, 0.12, { color: [0.2, 0.45, 0.8] }), 0, 0.035, 0);
  p.at('matte', box(0.2, 0.03, 0.01, { color: COL.white }), 0, 0.035, 0.061);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.24, 0.07, 0.12, 0, spec.id));
  return { group: g, size: [0.24, 0.07, 0.12], collider: false, low: true };
}
export function nutBag(spec, ctx) {
  const p = new P();
  p.at('gloss', rounded(0.14, 0.05, 0.1, 0.02, 2, { color: [0.85, 0.88, 0.9] }), 0, 0.025, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.14, 0.05, 0.1, 0, spec.id));
  return { group: g, size: [0.14, 0.05, 0.1], collider: false, low: true };
}
export function coffeeCan(spec, ctx) {
  const p = new P();
  p.at('gloss', cyl(0.078, 0.078, 0.16, 14, { color: [0.75, 0.15, 0.12] }), 0, 0.08, 0);
  p.at('matte', cyl(0.08, 0.08, 0.015, 14, { color: [0.9, 0.9, 0.88] }), 0, 0.165, 0);
  p.at('matte', box(0.14, 0.06, 0.01, { color: [0.95, 0.85, 0.4] }), 0, 0.08, 0.075);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.16, 0.18, 0.16, 0, spec.id));
  return { group: g, size: [0.16, 0.18, 0.16], collider: false, low: true };
}
export function wine(spec, ctx) {
  const p = new P();
  p.at('gloss', cyl(0.038, 0.038, 0.2, 12, { color: [0.12, 0.2, 0.12] }), 0, 0.1, 0);
  p.at('gloss', cyl(0.014, 0.036, 0.08, 12, { color: [0.12, 0.2, 0.12] }), 0, 0.24, 0);
  p.at('gloss', cyl(0.014, 0.014, 0.04, 12, { color: [0.12, 0.2, 0.12] }), 0, 0.3, 0);
  p.at('matte', cyl(0.039, 0.039, 0.08, 12, { color: [0.92, 0.9, 0.82] }), 0, 0.11, 0);
  p.at('glass', cyl(0.035, 0.03, 0.12, 12, { color: [0.9, 0.9, 0.9] }, true), 0.12, 0.16, 0);
  p.at('glass', cyl(0.006, 0.006, 0.08, 8, { color: [0.9, 0.9, 0.9] }), 0.12, 0.06, 0);
  const g = new THREE.Group(); g.add(hitProxy(0.26, 0.33, 0.12, 0, spec.id));
  return { static: p.list, group: g, size: [0.26, 0.33, 0.12], collider: false, low: true };
}
export function notepad(spec, ctx) {
  const p = new P();
  const g = plane(0.14, 0.2, 1, 1, { color: [1, 1, 1] }); p.add('notepad', g);
  const mg = box(0.02, 0.02, 0.01, { color: COL.red }); place(mg, 0, 0.09, 0.004); p.add('matte', mg);
  const grp = new THREE.Group(); grp.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.16, 0.22, 0.02, -0.11, spec.id));
  return { group: grp, size: [0.16, 0.22, 0.03], collider: false, low: true, centred: true };
}
export function drawer(spec, ctx) {
  // the junk drawer: a drawer front that can pull out (a pivot-less slide)
  const p = new P();
  p.at('wood', box(0.55, 0.2, 0.02, { color: CAB }), 0, 0, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.55, 0.2, 0.06, -0.1, spec.id));
  g.userData.slide = { dir: [0, 0, 1], distance: 0.3 };
  return { group: g, size: [0.55, 0.2, 0.06], collider: false, low: true, centred: true };
}
export function pantryShelves(spec, ctx) {
  const p = new P(), S = ctx.stream;
  const w = spec.w || 3.4, d = 0.4;
  for (const y of [0.35, 0.8, 1.25, 1.7, 2.15]) p.at('paint', box(w, 0.025, d, { color: COL.white }), 0, y, 0);
  for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) p.at('paint', box(0.04, 2.3, d, { color: COL.white }), x, 1.15, 0);
  // clutter: cans, boxes, jars
  for (const y of [0.35, 0.8, 1.25, 1.7]) {
    let x = -w / 2 + 0.08;
    while (x < w / 2 - 0.12) {
      const r = S.nextFloat();
      if (r < 0.45) { p.at('canLabel', cyl(0.038, 0.038, 0.11, 10, { color: [1, 1, 1] }), x + 0.04, y + 0.068, 0.05 + S.nextFloat() * 0.1); x += 0.085; }
      else if (r < 0.8) { const bw = 0.08 + S.nextFloat() * 0.12, bh = 0.15 + S.nextFloat() * 0.15; p.at('matte', box(bw, bh, 0.06 + S.nextFloat() * 0.1, { color: [[0.85, 0.25, 0.2], [0.95, 0.75, 0.2], [0.2, 0.35, 0.65], [0.9, 0.9, 0.85]][Math.floor(S.nextFloat() * 4)] }), x + bw / 2, y + bh / 2 + 0.013, 0); x += bw + 0.02; }
      else { p.at('glass', cyl(0.045, 0.045, 0.13, 10, { color: [0.7, 0.5, 0.3] }), x + 0.05, y + 0.078, 0.04); x += 0.11; }
    }
  }
  return { static: p.list, size: [w, 2.3, d], collider: true };
}
/** The great-room-side clutter of prep: canned goods pile, paper goods, a laundry basket of "important stuff". */
export function prepPile(spec, ctx) {
  const p = new P(), S = ctx.stream;
  for (let i = 0; i < 9; i++) p.at('canLabel', cyl(0.038, 0.038, 0.11, 10, { color: [1, 1, 1] }), (i % 3) * 0.085 - 0.085, Math.floor(i / 3) * 0.112 + 0.055, (i % 2) * 0.03);
  p.at('matte', box(0.5, 0.28, 0.28, { color: COL.white }), 0.45, 0.14, 0);           // paper towels pack
  p.at('matte', box(0.5, 0.28, 0.28, { color: COL.white }), 0.45, 0.42, 0);
  p.at('matte', box(0.34, 0.12, 0.24, { color: [0.85, 0.85, 0.82] }), -0.42, 0.06, 0.1);  // paper plates
  void S;
  return { static: p.list, size: [1.2, 0.6, 0.4], collider: false, low: true };
}
