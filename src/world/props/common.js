/**
 * world/props/common.js — the tiny DSL every prop factory uses (ARCHITECTURE §9 "Props"; T §6).
 * Owner: E4 world+textures. Writes no state.
 *
 * A factory builds at the origin (bottom-centre, local +z = the object's front) and returns
 *   { static: [[material, geometry], …], group?: Group, size: [w,h,d], collider?: boolean, low?: boolean, parts?: {name: Object3D} }
 * The orchestrator (build/props.js) transforms statics into the room's merged meshes and positions the group.
 */
import * as THREE from 'three';
import { box, boxAt, rounded, cyl, sphere, torus, cone, plane, lathe, place, rgb, lin, mulRgb, merge, ensureAttrs } from '../build/geo.js';

export { box, boxAt, rounded, cyl, sphere, torus, cone, plane, lathe, place, rgb, lin, mulRgb, merge, ensureAttrs, THREE };

/** Accumulates [material, geometry] pairs; `at()` places a geometry then records it. */
export class P {
  constructor() { this.list = []; this.parts = {}; }
  add(mat, geom) { this.list.push([mat, geom]); return geom; }
  /** place + add: geometry, material, position, yaw, pitch, roll, scale */
  at(mat, geom, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1) { place(geom, x, y, z, ry, rx, rz, s); this.list.push([mat, geom]); return geom; }
  /** merge everything of one material into a mesh (for group-held visuals) */
  meshes(mats, { castShadow = true, name = '' } = {}) {
    const byMat = new Map();
    for (const [m, g] of this.list) { if (!byMat.has(m)) byMat.set(m, []); byMat.get(m).push(g); }
    const out = [];
    for (const [m, gs] of byMat) {
      const g = merge(gs); if (!g) continue;
      const mesh = new THREE.Mesh(g, mats.get(m)); mesh.castShadow = castShadow; mesh.receiveShadow = true; mesh.name = name ? `${name}:${m}` : m;
      out.push(mesh);
    }
    this.list = [];
    return out;
  }
}

/** Common colours (sRGB triples). */
export const COL = {
  white: [0.95, 0.95, 0.93], offWhite: [0.9, 0.89, 0.86], black: [0.06, 0.06, 0.07], charcoal: [0.16, 0.16, 0.18], grey: [0.55, 0.56, 0.58], lightGrey: [0.78, 0.79, 0.8],
  steel: [0.75, 0.76, 0.78], chrome: [0.85, 0.86, 0.88], bronze: [0.22, 0.18, 0.15], red: [0.78, 0.12, 0.1], blue: [0.16, 0.36, 0.72], navy: [0.12, 0.16, 0.3],
  green: [0.2, 0.5, 0.25], yellow: [0.95, 0.8, 0.2], orange: [0.95, 0.5, 0.12], espresso: [0.32, 0.22, 0.15], maple: [0.85, 0.66, 0.42], oak: [0.7, 0.52, 0.32],
  cream: [0.93, 0.88, 0.78], tan: [0.76, 0.66, 0.52], khaki: [0.62, 0.58, 0.48], sage: [0.6, 0.66, 0.5], denim: [0.35, 0.42, 0.6], slate: [0.42, 0.47, 0.55],
  rubber: [0.1, 0.1, 0.11], plasticGrey: [0.6, 0.6, 0.62], wicker: [0.55, 0.42, 0.28], terracotta: [0.72, 0.4, 0.27], brass: [0.75, 0.62, 0.32],
};

/** An invisible box for raycast hits, bottom at y0. */
export function hitProxy(w, h, d, y0 = 0, objectId = '') {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.y = y0 + h / 2;
  m.visible = false; m.name = `hit:${objectId}`; m.userData = { hit: true, objectId };
  m.raycast = THREE.Mesh.prototype.raycast;
  return m;
}

/** Deterministic jitter helper from the world rng stream. */
export function jit(S, a) { return (S.nextFloat() - 0.5) * 2 * a; }

/** Six thin cylinders as a cable coil etc. */
export function coil(r, turns, t, color) {
  const geoms = [];
  for (let i = 0; i < turns; i++) geoms.push(place(torus(r, t, 6, 16, { color }), 0, i * t * 2.2, 0, 0, Math.PI / 2, 0));
  return merge(geoms);
}
