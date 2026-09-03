/**
 * world/props/appliances.js — laundry, bath and garage machinery and the hurricane supplies: washer/dryer,
 * utility sink, water heater, air handler, breaker panel, generator + cans + cords, buckets, sandbags, towels,
 * the kit bin, lights (flashlights, headlamp, lanterns, candles), tubs, toilets, vanities, shower, hatches,
 * detectors, switches, fans, lamps (DESIGN §3.3, §10.2; T §6). Owner: E4 world+textures. Writes no state.
 */
import { P, COL, box, rounded, cyl, sphere, torus, cone, plane, lathe, place, rgb, mulRgb, merge, THREE, hitProxy, coil } from './common.js';

const H = Math.PI / 2;

export function washer(spec, ctx) { return laundryMachine(spec, ctx, true); }
export function dryer(spec, ctx) { return laundryMachine(spec, ctx, false); }
function laundryMachine(spec, ctx, isWasher) {
  const p = new P();
  const w = 0.68, d = 0.7, h = 0.95;
  p.at('gloss', box(w, h, d, { color: COL.offWhite }), 0, h / 2, 0);
  p.at('gloss', box(w, 0.2, 0.05, { color: COL.offWhite }), 0, h + 0.1, -d / 2 + 0.025);        // control panel
  p.at('matte', box(0.3, 0.06, 0.02, { color: COL.charcoal }), -0.1, h + 0.1, -d / 2 + 0.055);
  p.at('matte', cyl(0.03, 0.03, 0.03, 10, { color: COL.lightGrey }), 0.22, h + 0.1, -d / 2 + 0.06, 0, H, 0);
  if (isWasher) { p.at('gloss', box(w - 0.06, 0.02, d - 0.1, { color: COL.offWhite }), 0, h + 0.01, 0.02); }
  else { p.at('matte', cyl(0.23, 0.23, 0.02, 20, { color: COL.charcoal }), 0, 0.5, d / 2 + 0.01, 0, H, 0); p.at('glass', cyl(0.18, 0.18, 0.02, 20, { color: [0.6, 0.6, 0.6] }), 0, 0.5, d / 2 + 0.02, 0, H, 0); }
  const g = new THREE.Group(); g.add(hitProxy(w, h + 0.2, d, 0, spec.id));
  return { static: p.list, group: g, size: [w, h + 0.2, d], collider: true };
}
export function utilitySink(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.55, 0.32, 0.5, { color: COL.white }), 0, 0.72, 0);
  p.at('matte', box(0.5, 0.28, 0.45, { color: mulRgb(rgb(COL.white), 0.85) }), 0, 0.74, 0);
  for (const [x, z] of [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.22], [0.24, 0.22]]) p.at('matte', box(0.03, 0.56, 0.03, { color: COL.white }), x, 0.28, z);
  p.at('metal', cyl(0.012, 0.012, 0.2, 8, { color: COL.chrome }), 0, 0.98, -0.2);
  const g = new THREE.Group(); g.add(hitProxy(0.55, 0.9, 0.5, 0, spec.id));
  return { static: p.list, group: g, size: [0.55, 0.9, 0.5], collider: true };
}
export function waterHeater(spec, ctx) {
  const p = new P();
  p.at('gloss', cyl(0.3, 0.3, 1.5, 18, { color: COL.offWhite }), 0, 0.85, 0);
  p.at('matte', cyl(0.28, 0.28, 0.1, 18, { color: COL.charcoal }), 0, 0.05, 0);
  p.at('matte', box(0.14, 0.1, 0.03, { color: COL.lightGrey }), 0, 0.5, 0.3);
  for (const x of [-0.1, 0.1]) p.at('metal', cyl(0.012, 0.012, 1.2, 8, { color: COL.chrome }), x, 2.2, 0);
  p.at('matte', cyl(0.36, 0.36, 0.06, 18, { color: COL.charcoal }), 0, 0.03, 0); // drain pan
  return { static: p.list, size: [0.7, 1.7, 0.7], collider: true };
}
export function airHandler(spec, ctx) {
  const p = new P();
  p.at('gloss', box(0.6, 1.5, 0.6, { color: COL.lightGrey }), 0, 0.85, 0);
  p.at('matte', box(0.5, 0.9, 0.02, { color: [0.65, 0.66, 0.68] }), 0, 0.9, 0.31);
  p.at('matte', box(0.55, 0.45, 0.55, { color: [0.6, 0.6, 0.62] }), 0, 1.85, 0);
  p.at('matte', cyl(0.18, 0.18, 0.7, 12, { color: [0.62, 0.62, 0.64] }), 0, 2.45, 0);
  p.at('matte', box(0.6, 0.1, 0.6, { color: COL.charcoal }), 0, 0.05, 0);
  p.at('matte', box(0.12, 0.06, 0.04, { color: COL.charcoal }), 0, 1.3, 0.32);  // the relay box
  return { static: p.list, size: [0.6, 2.8, 0.6], collider: true };
}
export function breakerPanel(spec, ctx) {
  const p = new P();
  p.at('gloss', box(0.36, 0.76, 0.1, { color: COL.lightGrey }), 0, 0, 0);
  p.at('gloss', box(0.34, 0.74, 0.012, { color: COL.lightGrey }), 0, 0, 0.056);
  for (let r = 0; r < 9; r++) for (const c of [-1, 1]) p.at('matte', box(0.03, 0.02, 0.01, { color: COL.charcoal }), c * 0.05, 0.3 - r * 0.07, 0.07);
  p.at('matte', box(0.06, 0.03, 0.012, { color: COL.charcoal }), 0, 0.34, 0.07);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.36, 0.76, 0.12, -0.38, spec.id));
  return { group: g, size: [0.36, 0.76, 0.12], collider: false, centred: true };
}
export function generator(spec, ctx) {
  const p = new P();
  // a 5.5-kW portable: black frame, red tank, engine, alternator, on a two-wheel dolly
  p.at('gloss', rounded(0.62, 0.22, 0.45, 0.03, 3, { color: COL.red }), 0, 0.62, 0);
  p.at('matte', box(0.6, 0.3, 0.42, { color: COL.charcoal }), 0, 0.35, 0);
  p.at('matte', cyl(0.14, 0.14, 0.3, 12, { color: COL.charcoal }), 0.15, 0.4, 0, 0, 0, H);
  p.at('matte', box(0.16, 0.22, 0.2, { color: [0.35, 0.36, 0.38] }), -0.2, 0.42, 0);   // alternator
  p.at('matte', box(0.14, 0.12, 0.05, { color: COL.charcoal }), 0, 0.45, 0.24);        // outlet panel
  p.at('matte', cyl(0.05, 0.05, 0.06, 10, { color: COL.charcoal }), 0, 0.76, -0.1);     // fuel cap
  for (const s of [-1, 1]) { p.at('matte', box(0.03, 0.03, 0.55, { color: COL.black }), s * 0.32, 0.22, 0); p.at('matte', box(0.03, 0.55, 0.03, { color: COL.black }), s * 0.32, 0.4, -0.26); }
  for (const s of [-1, 1]) { p.at('rubber', cyl(0.13, 0.13, 0.06, 14, { color: COL.rubber }), s * 0.36, 0.13, -0.14, 0, 0, H); }
  p.at('matte', box(0.03, 0.03, 0.7, { color: COL.black }), 0.32, 0.5, -0.3, 0, 0.6, 0);   // handle
  p.at('matte', box(0.03, 0.03, 0.7, { color: COL.black }), -0.32, 0.5, -0.3, 0, 0.6, 0);
  p.at('matte', box(0.06, 0.08, 0.04, { color: COL.black }), 0.15, 0.5, 0.24);          // pull start
  const exhaust = new THREE.Mesh(cone(0.06, 0.4, 8, { color: [0.7, 0.7, 0.7] }), ctx.mats.get('water'));
  exhaust.position.set(0.3, 0.75, 0); exhaust.rotation.z = -H; exhaust.visible = false; exhaust.name = 'exhaust';
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), exhaust, hitProxy(0.8, 0.8, 0.6, 0, spec.id));
  return { group: g, size: [0.8, 0.8, 0.6], collider: true, parts: { exhaust } };
}
export function gasCan(spec, ctx) {
  const p = new P();
  p.at('gloss', rounded(0.3, 0.36, 0.2, 0.02, 3, { color: COL.red }), 0, 0.18, 0);
  p.at('matte', box(0.28, 0.06, 0.01, { color: COL.yellow }), 0, 0.2, 0.1);
  p.at('gloss', cyl(0.035, 0.035, 0.06, 10, { color: COL.red }), 0.09, 0.39, 0);
  p.at('matte', cyl(0.035, 0.035, 0.02, 10, { color: COL.yellow }), 0.09, 0.42, 0);
  p.at('gloss', box(0.16, 0.04, 0.04, { color: COL.red }), -0.03, 0.4, 0);
  return { instanced: 'gasCan', static: p.list, size: [0.32, 0.44, 0.22], collider: false, low: true };
}
export function propane(spec, ctx) {
  const p = new P();
  p.at('gloss', cyl(0.15, 0.15, 0.36, 14, { color: COL.white }), 0, 0.23, 0);
  p.at('gloss', sphere(0.15, 12, { color: COL.white }), 0, 0.41, 0, 0, 0, 0, [1, 0.35, 1]);
  p.at('gloss', cyl(0.15, 0.13, 0.05, 14, { color: COL.white }), 0, 0.025, 0);
  p.at('matte', cyl(0.11, 0.11, 0.08, 8, { color: COL.white }, true), 0, 0.5, 0);
  p.at('matte', cyl(0.03, 0.03, 0.05, 8, { color: COL.charcoal }), 0, 0.5, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.32, 0.55, 0.32, 0, spec.id));
  return { group: g, size: [0.32, 0.55, 0.32], collider: false, low: false };
}
export function cord(spec, ctx) {
  const p = new P();
  p.add('matte', coil(0.12, 5, 0.008, COL.orange));
  return { instanced: 'cord', static: p.list, size: [0.26, 0.1, 0.26], collider: false, low: true };
}
export function bucket(spec, ctx) {
  const p = new P();
  p.at('matte', cyl(0.15, 0.13, 0.36, 16, { color: [0.95, 0.5, 0.1] }, true), 0, 0.18, 0);
  p.at('matte', cyl(0.13, 0.13, 0.01, 16, { color: [0.95, 0.5, 0.1] }), 0, 0.005, 0);
  p.at('metal', torus(0.15, 0.005, 6, 20, { color: COL.steel }), 0, 0.36, 0, 0, H, 0);
  return { instanced: 'bucket', static: p.list, size: [0.3, 0.37, 0.3], collider: false, low: true, double: true };
}
export function sandbag(spec, ctx) {
  const p = new P();
  const g = rounded(0.42, 0.16, 0.28, 0.06, 4, { color: [0.62, 0.55, 0.42] });
  p.at('fabric', g, 0, 0.08, 0);
  return { instanced: 'sandbag', static: p.list, size: [0.42, 0.16, 0.28], collider: false, low: true };
}
export function towel(spec, ctx) {
  const p = new P();
  p.at('fabric', rounded(0.34, 0.07, 0.24, 0.025, 3, { color: [0.35, 0.5, 0.62] }), 0, 0.035, 0);
  return { instanced: 'towel', static: p.list, size: [0.34, 0.07, 0.24], collider: false, low: true };
}
export function kitBin(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.5, 0.3, 0.36, { color: [0.2, 0.3, 0.5] }), 0, 0.15, 0);
  p.at('matte', box(0.53, 0.03, 0.39, { color: COL.yellow }), 0, 0.315, 0);
  const g = new THREE.Group(); g.add(hitProxy(0.53, 0.33, 0.39, 0, spec.id));
  return { static: p.list, group: g, size: [0.53, 0.33, 0.39], collider: false, low: true };
}
export function aaPack(spec, ctx) { const p = new P(); p.at('matte', box(0.09, 0.05, 0.03, { color: [0.85, 0.6, 0.15] }), 0, 0.025, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.09, 0.05, 0.03, 0, spec.id)); return { group: g, size: [0.09, 0.05, 0.03], low: true }; }
export function ductTape(spec, ctx) { const p = new P(); p.at('matte', torus(0.035, 0.014, 8, 16, { color: COL.grey }), 0, 0.048, 0, 0, 0, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.1, 0.1, 0.1, 0, spec.id)); return { group: g, size: [0.1, 0.1, 0.1], low: true }; }
export function lighter(spec, ctx) { const p = new P(); p.at('gloss', box(0.025, 0.08, 0.012, { color: COL.red }), 0, 0.04, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.04, 0.08, 0.04, 0, spec.id)); return { group: g, size: [0.04, 0.08, 0.04], low: true }; }
export function braceKit(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.32, 0.12, 0.9, { color: [0.85, 0.82, 0.6] }), 0, 0.06, 0);
  p.at('matte', box(0.3, 0.02, 0.5, { color: [0.2, 0.2, 0.7] }), 0, 0.125, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.32, 0.14, 0.9, 0, spec.id));
  return { group: g, size: [0.32, 0.14, 0.9], low: true };
}
export function twoByFour(spec, ctx) {
  const p = new P();
  p.at('wood', box(0.038, 2.4, 0.089, { color: [0.85, 0.72, 0.5] }), 0, 1.2, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.1, 2.4, 0.12, 0, spec.id));
  return { group: g, size: [0.1, 2.4, 0.12], collider: false };
}
export function flashlight(spec, ctx) {
  const p = new P();
  p.at('matte', cyl(0.02, 0.02, 0.2, 10, { color: COL.black }), 0, 0.02, 0, 0, 0, H);
  p.at('matte', cyl(0.03, 0.02, 0.05, 10, { color: COL.black }), 0.12, 0.02, 0, 0, 0, -H);
  const lens = new THREE.Mesh(cyl(0.024, 0.024, 0.01, 10, { color: [1, 1, 1] }), ctx.mats.variant('candleGlow', spec.id, {}));
  lens.position.set(0.15, 0.02, 0); lens.rotation.z = -H; lens.name = 'lens'; lens.visible = true; lens.material.emissiveIntensity = 0;
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), lens, hitProxy(0.3, 0.06, 0.06, 0, spec.id));
  return { group: g, size: [0.3, 0.06, 0.06], low: true, parts: { lens } };
}
export function headlamp(spec, ctx) {
  const p = new P();
  p.add('fabric', coil(0.09, 1, 0.012, [0.2, 0.2, 0.22]));
  p.at('matte', box(0.05, 0.035, 0.03, { color: COL.black }), 0, 0.02, 0.1);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.2, 0.06, 0.2, 0, spec.id));
  return { group: g, size: [0.2, 0.06, 0.2], low: true };
}
export function lantern(spec, ctx) {
  const p = new P();
  p.at('matte', cyl(0.09, 0.1, 0.06, 12, { color: [0.15, 0.3, 0.2] }), 0, 0.03, 0);
  p.at('matte', cyl(0.07, 0.07, 0.05, 12, { color: [0.15, 0.3, 0.2] }), 0, 0.27, 0);
  p.at('matte', torus(0.05, 0.006, 6, 12, { color: [0.15, 0.3, 0.2] }), 0, 0.33, 0);
  const lens = new THREE.Mesh(cyl(0.065, 0.065, 0.18, 12, { color: [1, 1, 1] }), ctx.mats.variant('candleGlow', spec.id, { transparent: true, opacity: 0.85 }));
  lens.position.y = 0.15; lens.name = 'lens'; lens.material.emissiveIntensity = 0;
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), lens, hitProxy(0.2, 0.35, 0.2, 0, spec.id));
  return { group: g, size: [0.2, 0.35, 0.2], low: true, parts: { lens } };
}
export function candle(spec, ctx) {
  const p = new P();
  p.at('glass', cyl(0.04, 0.038, 0.09, 12, { color: [0.9, 0.85, 0.7] }, true), 0, 0.045, 0);
  p.at('matte', cyl(0.036, 0.036, 0.07, 12, { color: [0.95, 0.9, 0.78] }), 0, 0.035, 0);
  p.at('matte', cyl(0.002, 0.002, 0.015, 4, { color: COL.black }), 0, 0.078, 0);
  return { instanced: 'candle', static: p.list, size: [0.08, 0.09, 0.08], low: true };
}
export function tub(spec, ctx) {
  const p = new P();
  const w = spec.w || 1.5, d = spec.d || 0.75, h = 0.55;
  p.at('bathTile', box(w, h, d, { color: [1, 1, 1] }), 0, h / 2, 0);
  p.at('gloss', box(w - 0.1, 0.02, d - 0.1, { color: COL.white }), 0, h - 0.01, 0);
  p.at('gloss', box(w - 0.22, 0.45, d - 0.22, { color: mulRgb(rgb(COL.white), 0.94) }), 0, h - 0.24, 0);
  p.at('gloss', box(w - 0.06, 0.04, 0.08, { color: COL.white }), 0, h + 0.02, d / 2 - 0.04);
  // tile surround on the wall behind (local −z)
  p.at('bathTile', box(w + 0.1, 1.5, 0.02, { color: [1, 1, 1] }), 0, h + 0.75, -d / 2 - 0.005);
  p.at('metal', cyl(0.01, 0.01, 0.12, 8, { color: COL.chrome }), -w / 2 + 0.15, h + 0.12, -d / 2 + 0.02, 0, H, 0); // spout
  p.at('metal', cyl(0.035, 0.035, 0.02, 12, { color: COL.chrome }), -w / 2 + 0.15, h + 0.35, -d / 2 + 0.01, 0, H, 0);   // handle
  p.at('metal', cyl(0.012, 0.012, 0.9, 8, { color: COL.chrome }), -w / 2 + 0.15, h + 0.8, -d / 2 + 0.03);                 // shower riser
  p.at('metal', cyl(0.045, 0.02, 0.06, 10, { color: COL.chrome }), -w / 2 + 0.2, h + 1.28, -d / 2 + 0.12, 0, 0.7, 0);       // head
  // shower curtain rod + curtain (pushed back)
  p.at('metal', cyl(0.012, 0.012, w, 8, { color: COL.chrome }), 0, h + 1.5, d / 2 - 0.05, 0, 0, H);
  p.at('fabric', box(0.32, 1.45, 0.02, { color: [0.75, 0.85, 0.9] }), w / 2 - 0.2, h + 0.78, d / 2 - 0.05);
  const g = new THREE.Group(); g.add(hitProxy(w, h + 0.05, d, 0, spec.id));
  return { static: p.list, group: g, size: [w, h + 0.05, d], collider: true };
}
export function gardenTub(spec, ctx) {
  const p = new P();
  const w = 1.5, d = 0.8, h = 0.55;
  p.at('bathTile', box(w, h, d, { color: [1, 1, 1] }), 0, h / 2, 0);
  p.at('gloss', box(w - 0.1, 0.02, d - 0.1, { color: COL.white }), 0, h - 0.01, 0);
  p.at('gloss', box(w - 0.24, 0.45, d - 0.24, { color: mulRgb(rgb(COL.white), 0.94) }), 0, h - 0.24, 0);
  p.at('metal', cyl(0.012, 0.012, 0.14, 8, { color: COL.chrome }), 0, h + 0.06, -d / 2 + 0.06, 0, 0.3, 0);
  for (const x of [-0.09, 0.09]) p.at('metal', cyl(0.025, 0.025, 0.03, 10, { color: COL.chrome }), x, h + 0.015, -d / 2 + 0.06);
  const g = new THREE.Group(); g.add(hitProxy(w, h + 0.05, d, 0, spec.id));
  return { static: p.list, group: g, size: [w, h + 0.05, d], collider: true };
}
export function shower(spec, ctx) {
  const p = new P();
  const w = 0.9, d = 1.2, h = 2.1;
  p.at('bathTile', box(w, 0.1, d, { color: [1, 1, 1] }), 0, 0.05, 0);
  p.at('bathTile', box(0.02, h, d, { color: [1, 1, 1] }), -w / 2 + 0.01, h / 2, 0);
  p.at('bathTile', box(w, h, 0.02, { color: [1, 1, 1] }), 0, h / 2, -d / 2 + 0.01);
  p.at('glass', box(0.008, 1.9, d, { color: [0.85, 0.9, 0.9] }), w / 2, 1.05, 0);
  p.at('metal', box(0.03, 1.9, 0.03, { color: COL.chrome }), w / 2, 1.05, d / 2 - 0.02);
  p.at('metal', cyl(0.045, 0.02, 0.06, 10, { color: COL.chrome }), -w / 2 + 0.12, 1.95, 0, 0, 0, 0.9);
  p.at('metal', cyl(0.035, 0.035, 0.02, 12, { color: COL.chrome }), -w / 2 + 0.02, 1.1, 0, 0, 0, H);
  return { static: p.list, size: [w, h, d], collider: true };
}
export function toilet(spec, ctx) {
  const p = new P();
  p.at('gloss', box(0.45, 0.4, 0.2, { color: COL.white }), 0, 0.6, -0.22);             // tank
  p.at('gloss', box(0.47, 0.03, 0.22, { color: COL.white }), 0, 0.815, -0.22);
  p.at('gloss', rounded(0.38, 0.2, 0.55, 0.08, 4, { color: COL.white }), 0, 0.32, 0.05); // bowl rim
  p.at('gloss', box(0.3, 0.25, 0.35, { color: COL.white }), 0, 0.14, 0.02);             // pedestal
  p.at('gloss', rounded(0.36, 0.03, 0.5, 0.06, 3, { color: COL.white }), 0, 0.43, 0.06); // seat + lid
  p.at('metal', box(0.05, 0.02, 0.02, { color: COL.chrome }), -0.17, 0.72, -0.1);        // lever
  const g = new THREE.Group(); g.add(hitProxy(0.47, 0.83, 0.7, 0, spec.id));
  return { static: p.list, group: g, size: [0.47, 0.83, 0.7], collider: true, offset: [0, 0, -0.08] };
}
export function vanity(spec, ctx) {
  const p = new P();
  const w = spec.w || 0.9, d = 0.55, h = 0.86;
  p.at('wood', box(w, h - 0.08, d, { color: [0.94, 0.93, 0.9] }), 0, (h - 0.08) / 2 + 0.08, 0);
  p.at('wood', box(w, 0.08, d - 0.06, { color: [0.4, 0.4, 0.4] }), 0, 0.04, -0.03);
  p.at('granite', box(w + 0.02, 0.03, d + 0.02, { color: [0.9, 0.9, 0.88] }), 0, h + 0.015, 0);
  const bowls = w > 1.5 ? [-w / 4, w / 4] : [0];
  for (const x of bowls) { p.at('gloss', cyl(0.2, 0.15, 0.1, 16, { color: COL.white }, true), x, h - 0.04, 0.02); p.at('metal', cyl(0.012, 0.012, 0.16, 8, { color: COL.chrome }), x, h + 0.1, -0.2); }
  const nd = Math.max(1, Math.round(w / 0.45));
  for (let i = 0; i < nd; i++) { const x = -w / 2 + (i + 0.5) * w / nd; p.at('wood', box(w / nd - 0.03, 0.6, 0.015, { color: [0.94, 0.93, 0.9] }), x, 0.45, d / 2 + 0.005); p.at('metal', cyl(0.005, 0.005, 0.1, 6, { color: COL.chrome }), x, 0.6, d / 2 + 0.02, 0, 0, H); }
  // mirror + light bar above
  p.at('metal', box(w - 0.1, 0.9, 0.02, { color: [0.9, 0.92, 0.95] }), 0, h + 0.65, -d / 2 - 0.0);
  p.at('matte', box(w - 0.3, 0.08, 0.1, { color: COL.chrome }), 0, h + 1.15, -d / 2 + 0.05);
  const g = new THREE.Group(); g.add(hitProxy(w, h, d, 0, spec.id));
  return { static: p.list, group: g, size: [w, h, d], collider: true, offset: [0, 0, 0] };
}
export function tap(spec, ctx) { const g = new THREE.Group(); g.add(hitProxy(0.16, 0.16, 0.16, -0.08, spec.id)); return { group: g, size: [0.16, 0.16, 0.16], centred: true }; }
export function tapKitchen(spec, ctx) { return tap(spec, ctx); }
export function valveBox(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.2, 0.16, 0.06, { color: COL.white }), 0, 0, 0);
  for (const x of [-0.05, 0.05]) p.at('matte', cyl(0.025, 0.025, 0.02, 8, { color: x < 0 ? COL.red : COL.blue }), x, 0, 0.035, 0, H, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.2, 0.16, 0.08, -0.08, spec.id));
  return { group: g, size: [0.2, 0.16, 0.08], centred: true };
}
export function atticHatch(spec, ctx) {
  const p = new P();
  p.at('paint', box(0.62, 0.02, 0.82, { color: COL.white }), 0, -0.01, 0);
  p.at('paint', box(0.06, 0.03, 0.9, { color: COL.white }), -0.31, -0.015, 0); p.at('paint', box(0.06, 0.03, 0.9, { color: COL.white }), 0.31, -0.015, 0);
  p.at('paint', box(0.7, 0.03, 0.06, { color: COL.white }), 0, -0.015, -0.41); p.at('paint', box(0.7, 0.03, 0.06, { color: COL.white }), 0, -0.015, 0.41);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.7, 0.05, 0.9, -0.05, spec.id));
  g.userData.lift = 0.3;
  return { group: g, size: [0.7, 0.05, 0.9], centred: true };
}
export function atticPulldown(spec, ctx) {
  const p = new P();
  p.at('paint', box(0.62, 0.02, 1.36, { color: COL.white }), 0, -0.01, 0);
  p.at('paint', box(0.7, 0.03, 1.44, { color: COL.white }), 0, -0.02, 0);
  p.at('matte', cyl(0.004, 0.004, 0.5, 4, { color: COL.white }), 0, -0.27, 0.6);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.7, 0.06, 1.44, -0.06, spec.id));
  return { group: g, size: [0.7, 0.06, 1.44], centred: true };
}
export function detector(spec, ctx) {
  const p = new P();
  p.at('matte', cyl(0.07, 0.075, 0.03, 16, { color: COL.white }), 0, -0.015, 0);
  const led = new THREE.Mesh(sphere(0.006, 6, { color: [1, 1, 1] }), ctx.mats.variant('ledBlue', spec.id, { emissive: 0x33ff44 }));
  led.position.set(0.04, -0.032, 0); led.name = 'led';
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), led, hitProxy(0.16, 0.05, 0.16, -0.05, spec.id));
  return { group: g, size: [0.16, 0.05, 0.16], centred: true, parts: { led } };
}
export function lightSwitch(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.07, 0.115, 0.008, { color: COL.white }), 0, 0, 0);
  p.at('matte', box(0.03, 0.05, 0.012, { color: COL.white }), 0, 0.0, 0.006, 0, -0.35, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.1, 0.14, 0.03, -0.07, spec.id));
  return { group: g, size: [0.1, 0.14, 0.03], centred: true };
}
export function ceilingFan(spec, ctx) {
  const p = new P();
  const outdoor = !!spec.outdoor;
  const body = outdoor ? [0.35, 0.36, 0.34] : [0.92, 0.9, 0.86], blade = outdoor ? [0.36, 0.34, 0.3] : [0.5, 0.36, 0.24];
  p.at('matte', cyl(0.08, 0.08, 0.05, 12, { color: body }), 0, -0.025, 0);               // canopy
  p.at('matte', cyl(0.012, 0.012, 0.25, 8, { color: body }), 0, -0.15, 0);                // downrod
  p.at('matte', cyl(0.12, 0.1, 0.12, 14, { color: body }), 0, -0.33, 0);                  // motor
  const blades = new THREE.Group(); blades.name = 'blades'; blades.position.y = -0.33;
  const bp = new P();
  for (let i = 0; i < 5; i++) bp.at('wood', box(0.55, 0.008, 0.11, { color: blade }), Math.cos(i * 1.2566) * 0.38, -0.02, Math.sin(i * 1.2566) * 0.38, -i * 1.2566, 0, 0.2);
  blades.add(...bp.meshes(ctx.mats, { name: `${spec.id}:blades`, castShadow: false }));
  const light = spec.light ? new THREE.Mesh(sphere(0.09, 12, { color: [1, 1, 1] }), ctx.mats.variant('glow', spec.id, {})) : null;
  if (light) { light.position.y = -0.46; light.scale.y = 0.7; light.name = 'light'; }
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id, castShadow: false }), blades); if (light) g.add(light);
  g.add(hitProxy(1.2, 0.5, 1.2, -0.55, spec.id));
  return { group: g, size: [1.2, 0.5, 1.2], centred: true, parts: { blades, light }, spin: true };
}
export function bathFan(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.3, 0.02, 0.3, { color: COL.white }), 0, -0.01, 0);
  for (let i = 0; i < 6; i++) p.at('matte', box(0.24, 0.006, 0.02, { color: mulRgb(rgb(COL.white), 0.85) }), 0, -0.022, -0.1 + i * 0.04);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id, castShadow: false }), hitProxy(0.3, 0.03, 0.3, -0.03, spec.id));
  return { group: g, size: [0.3, 0.03, 0.3], centred: true };
}
export function lampTable(spec, ctx) { return lamp(spec, ctx, 0.5, 0.14, 0.2); }
export function lampSmall(spec, ctx) { return lamp(spec, ctx, 0.38, 0.11, 0.15); }
function lamp(spec, ctx, hgt, rShadeTop, rShadeBot) {
  const p = new P();
  const base = lathe([[0.0, 0], [0.09, 0], [0.09, 0.02], [0.05, 0.03], [0.045, hgt * 0.35], [0.06, hgt * 0.5], [0.03, hgt * 0.75], [0.02, hgt]], 14, { color: [0.35, 0.3, 0.25] });
  p.add('gloss', base);
  const shade = new THREE.Mesh(cyl(rShadeTop, rShadeBot, hgt * 0.5, 20, { color: [1, 1, 1] }, true), ctx.mats.variant('glow', spec.id, { side: THREE.DoubleSide, emissiveIntensity: 1.2 }));
  shade.position.y = hgt + hgt * 0.15; shade.name = 'shade';
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), shade, hitProxy(rShadeBot * 2, hgt * 1.5, rShadeBot * 2, 0, spec.id));
  return { group: g, size: [rShadeBot * 2, hgt * 1.5, rShadeBot * 2], parts: { shade } };
}
export function lampDesk(spec, ctx) {
  const p = new P();
  p.at('matte', cyl(0.08, 0.08, 0.015, 12, { color: COL.charcoal }), 0, 0.0075, 0);
  p.at('matte', cyl(0.008, 0.008, 0.3, 6, { color: COL.charcoal }), 0.04, 0.15, 0, 0, 0, -0.3);
  p.at('matte', cyl(0.008, 0.008, 0.25, 6, { color: COL.charcoal }), 0.12, 0.38, 0, 0, 0, 0.9);
  const shade = new THREE.Mesh(cone(0.07, 0.1, 12, { color: [1, 1, 1] }), ctx.mats.variant('glow', spec.id, { side: THREE.DoubleSide, emissiveIntensity: 1.0 }));
  shade.position.set(0.05, 0.42, 0); shade.rotation.z = 2.4; shade.name = 'shade';
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), shade, hitProxy(0.3, 0.5, 0.2, 0, spec.id));
  return { group: g, size: [0.3, 0.5, 0.2], parts: { shade } };
}
export function wetVac(spec, ctx) { const p = new P(); p.at('matte', cyl(0.22, 0.2, 0.45, 14, { color: [0.75, 0.15, 0.12] }), 0, 0.3, 0); p.at('matte', cyl(0.24, 0.24, 0.18, 14, { color: COL.charcoal }), 0, 0.6, 0); p.at('matte', box(0.5, 0.06, 0.5, { color: COL.charcoal }), 0, 0.04, 0); p.at('matte', torus(0.04, 0.02, 6, 10, { color: COL.charcoal }), 0.25, 0.4, 0, 0, 0, 0); return { static: p.list, size: [0.5, 0.7, 0.5], collider: true }; }
export function boxFan(spec, ctx) { const p = new P(); p.at('matte', box(0.5, 0.5, 0.12, { color: COL.white }), 0, 0.28, 0); p.at('matte', cyl(0.22, 0.22, 0.02, 20, { color: COL.charcoal }), 0, 0.28, 0.06, 0, H, 0); p.at('matte', box(0.5, 0.03, 0.18, { color: COL.white }), 0, 0.015, 0); return { static: p.list, size: [0.5, 0.55, 0.2], collider: false, low: false }; }
export function ladder(spec, ctx) { const p = new P(); const c = COL.yellow; for (const s of [-1, 1]) p.at('matte', box(0.04, 0.09, 2.4, { color: c }), s * 0.2, 0, 0); for (let z = -1.05; z <= 1.05; z += 0.3) p.at('matte', box(0.36, 0.03, 0.06, { color: c }), 0, 0, z); const g = new THREE.Group(); return { static: p.list, size: [0.44, 0.1, 2.4], collider: false, centred: true, group: g }; }
export function coolers(spec, ctx) { const p = new P(); p.at('gloss', rounded(0.7, 0.45, 0.42, 0.03, 3, { color: [0.85, 0.85, 0.82] }), 0, 0.225, 0); p.at('gloss', box(0.72, 0.06, 0.44, { color: [0.2, 0.35, 0.65] }), 0, 0.46, 0); p.at('gloss', rounded(0.5, 0.35, 0.35, 0.03, 3, { color: [0.75, 0.15, 0.12] }), 0.75, 0.175, 0); p.at('gloss', box(0.52, 0.05, 0.37, { color: COL.white }), 0.75, 0.36, 0); return { static: p.list, size: [1.3, 0.5, 0.45], collider: true, offset: [0.3, 0, 0] }; }
export function drill(spec, ctx) { const p = new P(); p.at('matte', box(0.2, 0.07, 0.06, { color: [0.85, 0.75, 0.1] }), 0, 0.09, 0); p.at('matte', box(0.04, 0.12, 0.06, { color: COL.charcoal }), -0.03, 0.05, 0); p.at('matte', cyl(0.012, 0.012, 0.06, 8, { color: COL.steel }), 0.12, 0.09, 0, 0, 0, H); return { static: p.list, size: [0.24, 0.14, 0.08], low: true }; }
export function helmet(spec, ctx) { const p = new P(); const c = spec.colour || COL.blue; p.at('gloss', sphere(0.13, 12, { color: c }), 0, 0.09, 0, 0, 0, 0, [1, 0.75, 1.1]); p.at('fabric', box(0.06, 0.03, 0.2, { color: COL.black }), 0, 0.03, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.28, 0.2, 0.3, 0, spec.id)); return { group: g, size: [0.28, 0.2, 0.3], low: true }; }
export function shoes(spec, ctx) { const p = new P(); for (const x of [-0.07, 0.07]) { p.at('fabric', rounded(0.1, 0.07, 0.28, 0.03, 3, { color: [0.2, 0.22, 0.28] }), x, 0.035, 0); p.at('rubber', box(0.1, 0.02, 0.28, { color: COL.white }), x, 0.01, 0); } const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.26, 0.1, 0.3, 0, spec.id)); return { group: g, size: [0.26, 0.1, 0.3], low: true }; }
export function goBag(spec, ctx) { const p = new P(); p.at('fabric', rounded(0.35, 0.45, 0.22, 0.05, 3, { color: [0.2, 0.25, 0.22] }), 0, 0.225, 0); p.at('fabric', box(0.04, 0.3, 0.04, { color: COL.black }), 0.1, 0.5, -0.05); p.at('fabric', box(0.04, 0.3, 0.04, { color: COL.black }), -0.1, 0.5, -0.05); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.35, 0.5, 0.25, 0, spec.id)); return { group: g, size: [0.35, 0.5, 0.25], low: false }; }
export function docsPouch(spec, ctx) { const p = new P(); p.at('gloss', box(0.32, 0.03, 0.24, { color: [0.85, 0.88, 0.9] }), 0, 0.015, 0); p.at('matte', box(0.28, 0.006, 0.2, { color: COL.white }), 0, 0.034, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.32, 0.04, 0.24, 0, spec.id)); return { group: g, size: [0.32, 0.04, 0.24], low: true }; }
export function folder(spec, ctx) { const p = new P(); p.at('matte', box(0.3, 0.025, 0.24, { color: [0.85, 0.7, 0.4] }), 0, 0.0125, 0); p.at('matte', box(0.25, 0.006, 0.2, { color: COL.white }), 0.02, 0.028, 0.01); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.3, 0.04, 0.24, 0, spec.id)); return { group: g, size: [0.3, 0.04, 0.24], low: true }; }
export function photoFrames(spec, ctx) { const p = new P(); for (const [x, w, h] of [[-0.3, 0.25, 0.2], [0.05, 0.2, 0.25], [0.35, 0.3, 0.22]]) { p.at('wood', box(w, h, 0.02, { color: COL.espresso }), x, 0, 0); p.at('matte', box(w - 0.04, h - 0.04, 0.01, { color: [0.6, 0.65, 0.7] }), x, 0, 0.008); } const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.9, 0.3, 0.04, -0.15, spec.id)); return { group: g, size: [0.9, 0.3, 0.04], centred: true }; }
export function paperback(spec, ctx) { const p = new P(); p.at('matte', box(0.11, 0.03, 0.17, { color: [0.85, 0.82, 0.75] }), 0, 0.015, 0); p.at('matte', box(0.112, 0.004, 0.172, { color: [0.2, 0.3, 0.5] }), 0, 0.032, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.12, 0.04, 0.18, 0, spec.id)); return { group: g, size: [0.12, 0.04, 0.18], low: true }; }
export function cards(spec, ctx) { const p = new P(); p.at('matte', box(0.065, 0.02, 0.09, { color: [0.2, 0.3, 0.6] }), 0, 0.01, 0); p.at('matte', box(0.063, 0.001, 0.088, { color: COL.white }), 0.05, 0.001, 0.1, 0.3); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.14, 0.03, 0.14, 0, spec.id)); return { group: g, size: [0.14, 0.03, 0.14], low: true }; }
export function letter(spec, ctx) { const p = new P(); const g = plane(0.216, 0.28, 1, 1, { color: [1, 1, 1] }); g.rotateX(-H); p.add('letter', g); const grp = new THREE.Group(); grp.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.22, 0.02, 0.28, 0, spec.id)); return { group: grp, size: [0.22, 0.02, 0.28], low: true }; }
export function chart(spec, ctx) { const p = new P(); const g = plane(0.56, 0.43, 1, 1, { color: [1, 1, 1] }); g.rotateX(-H); p.add('chart', g); const grp = new THREE.Group(); grp.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.56, 0.02, 0.43, 0, spec.id)); return { group: grp, size: [0.56, 0.02, 0.43], low: true }; }
export function key(spec, ctx) { const p = new P(); p.at('metal', box(0.02, 0.004, 0.05, { color: COL.brass }), 0, 0.002, 0); p.at('metal', torus(0.012, 0.003, 6, 10, { color: COL.brass }), 0, 0.002, -0.03, 0, H, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.06, 0.02, 0.08, 0, spec.id)); return { group: g, size: [0.06, 0.02, 0.08], low: true }; }
export function powerStrip(spec, ctx) { const p = new P(); p.at('matte', box(0.32, 0.04, 0.06, { color: COL.white }), 0, 0.02, 0); for (let i = 0; i < 6; i++) p.at('matte', box(0.03, 0.005, 0.03, { color: COL.charcoal }), -0.12 + i * 0.05, 0.043, 0); p.at('matte', cyl(0.004, 0.004, 0.8, 4, { color: COL.black }), 0.35, 0.01, 0.2, 0, 0, H); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.34, 0.06, 0.08, 0, spec.id)); return { group: g, size: [0.34, 0.06, 0.08], low: true }; }
export function chainsaw(spec, ctx) { const p = new P(); p.at('matte', box(0.3, 0.22, 0.2, { color: COL.orange }), 0, 0.12, 0); p.at('metal', box(0.45, 0.06, 0.012, { color: COL.steel }), 0.35, 0.12, 0); p.at('matte', box(0.06, 0.05, 0.24, { color: COL.black }), -0.05, 0.26, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.9, 0.3, 0.26, 0, spec.id)); return { group: g, size: [0.9, 0.3, 0.26], low: true }; }
export function tarpFolded(spec, ctx) { const p = new P(); p.at('cloth', rounded(0.5, 0.12, 0.4, 0.03, 3, { color: [0.15, 0.35, 0.75] }), 0, 0.06, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.5, 0.12, 0.4, 0, spec.id)); return { group: g, size: [0.5, 0.12, 0.4], low: true }; }
export function rake(spec, ctx) { const p = new P(); p.at('wood', cyl(0.012, 0.012, 1.5, 6, { color: COL.oak }), 0, 0.03, 0, 0, 0, H); p.at('matte', box(0.02, 0.02, 0.5, { color: COL.green }), 0.8, 0.03, 0); for (let i = 0; i < 12; i++) p.at('matte', box(0.2, 0.004, 0.006, { color: COL.green }), 0.9, 0.02, -0.24 + i * 0.044); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(1.8, 0.06, 0.5, 0, spec.id)); return { group: g, size: [1.8, 0.06, 0.5], low: true }; }
export function turtle(spec, ctx) { const p = new P(); p.at('matte', sphere(0.14, 10, { color: [0.45, 0.45, 0.4] }), 0, 0.09, 0, 0, 0, 0, [1.3, 0.6, 1]); p.at('matte', sphere(0.05, 8, { color: [0.45, 0.45, 0.4] }), 0.2, 0.08, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.4, 0.18, 0.3, 0, spec.id)); return { group: g, size: [0.4, 0.18, 0.3], low: true }; }
export function powerBank(spec, ctx) { const p = new P(); p.at('gloss', rounded(0.07, 0.02, 0.14, 0.008, 2, { color: COL.charcoal }), 0, 0.01, 0); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.08, 0.03, 0.15, 0, spec.id)); return { group: g, size: [0.08, 0.03, 0.15], low: true }; }
export function charger(spec, ctx) { const p = new P(); p.at('matte', box(0.03, 0.03, 0.03, { color: COL.white }), 0, 0.015, 0); p.at('matte', cyl(0.003, 0.003, 0.4, 4, { color: COL.white }), 0.15, 0.004, 0.08, 0.5, 0, H); const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.3, 0.04, 0.2, 0, spec.id)); return { group: g, size: [0.3, 0.04, 0.2], low: true }; }
export function binsLoose(spec, ctx) { return bin(spec, ctx); }
export function bin(spec, ctx) {
  const p = new P();
  const c = spec.colour || [0.12, 0.14, 0.16];
  p.at('matte', box(0.62, 1.05, 0.68, { color: c }), 0, 0.575, 0);
  p.at('matte', box(0.66, 0.06, 0.72, { color: mulRgb(rgb(c), 1.15) }), 0, 1.13, 0);
  for (const s of [-1, 1]) p.at('rubber', cyl(0.09, 0.09, 0.04, 12, { color: COL.rubber }), s * 0.33, 0.09, -0.3, 0, 0, H);
  p.at('matte', box(0.5, 0.04, 0.04, { color: c }), 0, 1.0, -0.38);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.68, 1.16, 0.74, 0, spec.id));
  return { group: g, size: [0.68, 1.16, 0.74], collider: true };
}
export function planter(spec, ctx) {
  const p = new P();
  p.at('matteWet', cyl(0.25, 0.2, 0.4, 14, { color: COL.terracotta }, true), 0, 0.2, 0);
  p.at('matteWet', cyl(0.2, 0.2, 0.02, 14, { color: COL.terracotta }), 0, 0.01, 0);
  p.at('mulch', cyl(0.24, 0.24, 0.02, 14, { color: [1, 1, 1] }), 0, 0.37, 0);
  // a croton: a few coloured leaf planes
  for (let i = 0; i < 9; i++) p.at('leafHedge', plane(0.14, 0.42, 1, 2, { color: [1, 1, 1], flex: 0.6 }), Math.sin(i * 0.7) * 0.1, 0.55, Math.cos(i * 0.7) * 0.1, i * 0.7, -0.4 + (i % 3) * 0.2, 0);
  return { instanced: 'planter', static: p.list, size: [0.5, 0.8, 0.5], collider: false, low: false };
}
