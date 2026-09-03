/**
 * world/props/devices.js — the screens and instruments: TVs (with their canvas screens), the NOAA radio,
 * the weather console, the wall barometer, thermostat, UPS, cable modem (with its four LEDs), smart speaker,
 * laptop, tablet, remote (DESIGN §9.1–9.5; screens are CanvasTextures E7 redraws ≤ 10 Hz).
 * Owner: E4 world+textures. Writes no state.
 */
import { P, COL, box, rounded, cyl, sphere, torus, plane, place, rgb, mulRgb, merge, THREE, hitProxy } from './common.js';

const H = Math.PI / 2;

/** A screen record: canvas + MeshBasicMaterial, registered by the orchestrator as registry.screens[id]. */
function makeScreen(ctx, id, w, h, cw, ch) {
  const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
  const c2 = canvas.getContext('2d');
  c2.fillStyle = '#0a0b0e'; c2.fillRect(0, 0, cw, ch);
  const { material, texture } = ctx.mats.screenMaterial(canvas);
  const g = plane(w, h, 1, 1, { color: [1, 1, 1] });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w, uv.getY(i) / h);
  const mesh = new THREE.Mesh(g, material); mesh.name = `${id}:screen`; mesh.userData = { screen: true, objectId: id };
  return { mesh, canvas, texture, material, w, h, id };
}

export function tv(spec, ctx) {
  const p = new P();
  const w = 1.45, h = 0.83;
  p.at('gloss', box(w, h, 0.03, { color: COL.black }), 0, 0, 0);
  p.at('matte', box(0.5, 0.35, 0.03, { color: COL.charcoal }), 0, 0, -0.03);   // wall mount
  p.at('matte', box(0.06, 0.02, 0.03, { color: COL.charcoal }), 0, -h / 2 - 0.01, 0.0); // IR window
  const scr = makeScreen(ctx, spec.id, w - 0.02, h - 0.02, 512, 288);
  scr.mesh.position.set(0, 0, 0.016);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id, castShadow: false }), scr.mesh, hitProxy(w, h, 0.08, -h / 2, spec.id));
  return { group: g, size: [w, h, 0.08], centred: true, screen: scr, glow: { pos: [0, 0, 0.1] } };
}
export function tvSmall(spec, ctx) {
  const p = new P();
  const w = 0.44, h = 0.27;
  p.at('gloss', box(w, h, 0.03, { color: COL.black }), 0, 0.2 + h / 2, 0);
  p.at('matte', box(0.2, 0.02, 0.14, { color: COL.charcoal }), 0, 0.01, -0.02);
  p.at('matte', box(0.04, 0.2, 0.03, { color: COL.charcoal }), 0, 0.11, -0.03);
  p.at('matte', cyl(0.004, 0.004, 0.5, 4, { color: COL.charcoal }), 0.2, 0.55, -0.05, 0, 0, 0.3); // rabbit-ear antenna
  const scr = makeScreen(ctx, spec.id, w - 0.02, h - 0.02, 512, 288);
  scr.mesh.position.set(0, 0.2 + h / 2, 0.016);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id, castShadow: false }), scr.mesh, hitProxy(w, 0.5, 0.2, 0, spec.id));
  return { group: g, size: [w, 0.5, 0.2], screen: scr };
}
export function remote(spec, ctx) {
  const p = new P();
  p.at('matte', rounded(0.045, 0.015, 0.18, 0.006, 2, { color: COL.black }), 0, 0.0075, 0);
  for (let i = 0; i < 8; i++) p.at('matte', box(0.008, 0.004, 0.008, { color: COL.grey }), (i % 2 - 0.5) * 0.02, 0.016, -0.06 + Math.floor(i / 2) * 0.03);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), hitProxy(0.06, 0.02, 0.18, 0, spec.id));
  return { group: g, size: [0.06, 0.02, 0.18], low: true };
}
export function nwr(spec, ctx) {
  // a Midland-style tabletop: 0.16 × 0.1 × 0.1, LCD, three LEDs, buttons, an antenna
  const p = new P();
  p.at('matte', rounded(0.16, 0.1, 0.1, 0.01, 2, { color: [0.14, 0.15, 0.17] }), 0, 0.05, 0);
  p.at('matte', box(0.14, 0.02, 0.06, { color: [0.2, 0.21, 0.24] }), 0, 0.09, 0.0);
  for (let i = 0; i < 5; i++) p.at('matte', box(0.02, 0.004, 0.012, { color: [0.3, 0.3, 0.32] }), -0.05 + i * 0.025, 0.101, 0.03);
  p.at('matte', cyl(0.003, 0.003, 0.28, 4, { color: COL.black }), -0.06, 0.24, -0.03);
  const scr = makeScreen(ctx, spec.id, 0.07, 0.03, 128, 64);
  scr.mesh.position.set(-0.02, 0.06, 0.051);
  const leds = ['green', 'yellow', 'red'].map((c, i) => { const m = new THREE.Mesh(sphere(0.004, 6, { color: [1, 1, 1] }), ctx.mats.variant('ledBlue', `${spec.id}:${c}`, { emissive: c === 'green' ? 0x22ff44 : c === 'yellow' ? 0xffcc22 : 0xff2222 })); m.position.set(0.04, 0.05 + i * 0.012, 0.051); m.name = `led_${c}`; m.material.emissiveIntensity = 0; return m; });
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), scr.mesh, ...leds, hitProxy(0.18, 0.12, 0.12, 0, spec.id));
  return { group: g, size: [0.18, 0.12, 0.12], low: true, screen: scr, parts: Object.fromEntries(leds.map(l => [l.name, l])) };
}
export function consoleUnit(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.2, 0.15, 0.03, { color: [0.2, 0.21, 0.24] }), 0, 0.1, 0, 0, -0.35, 0);
  p.at('matte', box(0.14, 0.02, 0.09, { color: [0.2, 0.21, 0.24] }), 0, 0.01, -0.03);
  const scr = makeScreen(ctx, spec.id, 0.17, 0.12, 320, 240);
  scr.mesh.position.set(0, 0.1, 0.016); scr.mesh.rotation.x = -0.35;
  scr.mesh.position.set(0, 0.1 + 0.016 * Math.sin(0.35), 0.016 * Math.cos(0.35));
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), scr.mesh, hitProxy(0.22, 0.18, 0.12, 0, spec.id));
  return { group: g, size: [0.22, 0.18, 0.12], low: true, screen: scr };
}
export function barometer(spec, ctx) {
  const p = new P();
  p.at('wood', cyl(0.13, 0.13, 0.04, 24, { color: COL.oak }), 0, 0, 0, 0, H, 0);
  p.at('matte', cyl(0.105, 0.105, 0.005, 24, { color: [0.95, 0.93, 0.85] }), 0, 0, 0.022, 0, H, 0);
  for (let i = 0; i < 24; i++) { const a = -2.2 + i * (4.4 / 23); p.at('matte', box(0.004, 0.012, 0.002, { color: COL.black }), Math.sin(a) * 0.092, Math.cos(a) * 0.092, 0.026, 0, 0, -a); }
  const needle = new THREE.Mesh(box(0.004, 0.09, 0.002, { color: [1, 1, 1] }), ctx.mats.variant('matte', 'needle', { color: 0x222222 }));
  needle.position.set(0, 0.04, 0.028); needle.name = 'needle';
  const pivot = new THREE.Group(); pivot.name = 'needlePivot'; pivot.position.set(0, 0, 0); pivot.add(needle);
  needle.position.set(0, 0.045, 0.028);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), pivot, hitProxy(0.28, 0.28, 0.06, -0.14, spec.id));
  pivot.userData.setPressure = (hPa) => { pivot.rotation.z = -((hPa - 980) / 60 - 0.5) * 4.4; };
  pivot.userData.setPressure(1012);
  return { group: g, size: [0.28, 0.28, 0.06], centred: true, parts: { needle: pivot } };
}
export function thermostat(spec, ctx) {
  const p = new P();
  p.at('matte', rounded(0.13, 0.09, 0.025, 0.008, 2, { color: COL.white }), 0, 0, 0);
  const scr = makeScreen(ctx, spec.id, 0.07, 0.035, 128, 64);
  scr.mesh.position.set(0, 0.005, 0.013);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), scr.mesh, hitProxy(0.14, 0.1, 0.04, -0.05, spec.id));
  return { group: g, size: [0.14, 0.1, 0.04], centred: true, screen: scr };
}
export function ups(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.14, 0.2, 0.36, { color: COL.charcoal }), 0, 0.1, 0);
  const scr = makeScreen(ctx, spec.id, 0.06, 0.03, 128, 64);
  scr.mesh.position.set(0, 0.14, 0.181);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), scr.mesh, hitProxy(0.14, 0.2, 0.36, 0, spec.id));
  return { group: g, size: [0.14, 0.2, 0.36], low: true, screen: scr };
}
export function modem(spec, ctx) {
  const p = new P();
  p.at('matte', box(0.06, 0.16, 0.2, { color: COL.black }), 0, 0.08, 0);
  p.at('matte', box(0.2, 0.04, 0.16, { color: COL.charcoal }), 0.16, 0.02, 0);     // the router next to it
  for (let i = 0; i < 3; i++) p.at('matte', cyl(0.004, 0.004, 0.12, 4, { color: COL.black }), 0.08 + i * 0.08, 0.1, -0.06, 0, 0, 0.3);
  const names = ['power', 'ds', 'us', 'online'];
  const leds = names.map((n, i) => { const m = new THREE.Mesh(sphere(0.004, 6, { color: [1, 1, 1] }), ctx.mats.variant('ledBlue', `${spec.id}:${n}`, { emissive: n === 'online' ? 0x33ccff : 0x33ff66 })); m.position.set(0.031, 0.12 - i * 0.02, 0.05); m.name = `led_${n}`; return m; });
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), ...leds, hitProxy(0.3, 0.16, 0.2, 0, spec.id));
  return { group: g, size: [0.3, 0.16, 0.2], low: true, parts: Object.fromEntries(leds.map(l => [l.name, l])) };
}
export function smartSpeaker(spec, ctx) {
  const p = new P();
  p.at('fabric', cyl(0.05, 0.05, 0.1, 16, { color: [0.3, 0.32, 0.35] }), 0, 0.05, 0);
  const ring = new THREE.Mesh(torus(0.048, 0.004, 6, 24, { color: [1, 1, 1] }), ctx.mats.variant('ledBlue', spec.id, {}));
  ring.position.y = 0.1; ring.rotation.x = H; ring.name = 'ring'; ring.material.emissiveIntensity = 0;
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), ring, hitProxy(0.1, 0.11, 0.1, 0, spec.id));
  return { group: g, size: [0.1, 0.11, 0.1], low: true, parts: { ring } };
}
export function laptop(spec, ctx) {
  const p = new P();
  p.at('matte', rounded(0.33, 0.015, 0.23, 0.005, 2, { color: [0.75, 0.76, 0.78] }), 0, 0.0075, 0);
  p.at('matte', box(0.28, 0.003, 0.11, { color: COL.charcoal }), 0, 0.016, 0.02);
  p.at('matte', rounded(0.33, 0.22, 0.008, 0.005, 2, { color: [0.75, 0.76, 0.78] }), 0, 0.12, -0.13, 0, -0.25, 0);
  const scr = makeScreen(ctx, spec.id, 0.3, 0.19, 512, 288);
  scr.mesh.position.set(0, 0.12 + 0.005 * Math.sin(0.25), -0.13 + 0.005 * Math.cos(0.25)); scr.mesh.rotation.x = -0.25;
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), scr.mesh, hitProxy(0.34, 0.25, 0.3, 0, spec.id));
  return { group: g, size: [0.34, 0.25, 0.3], low: true, screen: scr };
}
export function tablet(spec, ctx) {
  const p = new P();
  p.at('matte', rounded(0.17, 0.008, 0.24, 0.004, 2, { color: COL.black }), 0, 0.004, 0);
  const scr = makeScreen(ctx, spec.id, 0.15, 0.22, 256, 384);
  scr.mesh.rotation.x = -H; scr.mesh.position.set(0, 0.0085, 0);
  const g = new THREE.Group(); g.add(...p.meshes(ctx.mats, { name: spec.id }), scr.mesh, hitProxy(0.17, 0.02, 0.24, 0, spec.id));
  return { group: g, size: [0.17, 0.02, 0.24], low: true, screen: scr };
}
