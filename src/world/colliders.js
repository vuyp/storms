/**
 * world/colliders.js — the collider list (Box3[]) and its 2-m grid broadphase (ARCHITECTURE §6.6 "colliders:
 * Box3[] (+ grid broadphase)"). Owner: E4 world+textures. Writes no state. Pure THREE math, no DOM.
 */
import * as THREE from 'three';

/**
 * @param {THREE.Box3[]} boxes
 * @param {{id?:string, kind?:string}[]} [meta] parallel array of tags per box
 * @param {number} [cell] grid cell size in metres
 * @returns {{cell:number, x0:number, z0:number, nx:number, nz:number, boxes:THREE.Box3[], meta:object[],
 *   cells:Map<number, number[]>, key(x:number,z:number):number, query(box:THREE.Box3, out?:number[]):number[],
 *   near(x:number, z:number, r?:number, out?:number[]):number[], boxesNear(x:number,z:number,r?:number):THREE.Box3[],
 *   segment(a:THREE.Vector3, b:THREE.Vector3, r?:number):number[], stats():object}}
 */
export function createColliderGrid(boxes, meta = [], cell = 2) {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const b of boxes) { min.min(b.min); max.max(b.max); }
  if (!boxes.length) { min.set(0, 0, 0); max.set(0, 0, 0); }
  const x0 = Math.floor(min.x / cell) * cell, z0 = Math.floor(min.z / cell) * cell;
  const nx = Math.max(1, Math.ceil((max.x - x0) / cell) + 1), nz = Math.max(1, Math.ceil((max.z - z0) / cell) + 1);
  const cells = new Map();
  const key = (cx, cz) => cz * nx + cx;
  const cellOf = (x, z) => [Math.min(nx - 1, Math.max(0, Math.floor((x - x0) / cell))), Math.min(nz - 1, Math.max(0, Math.floor((z - z0) / cell)))];
  boxes.forEach((b, i) => {
    const [ax, az] = cellOf(b.min.x, b.min.z), [bx, bz] = cellOf(b.max.x, b.max.z);
    for (let cz = az; cz <= bz; cz++) for (let cx = ax; cx <= bx; cx++) { const k = key(cx, cz); let l = cells.get(k); if (!l) { l = []; cells.set(k, l); } l.push(i); }
  });
  const _seen = new Uint32Array(boxes.length + 1); let _stamp = 1;
  function gather(xa, za, xb, zb, out) {
    _stamp++;
    if (_stamp > 4e9) { _seen.fill(0); _stamp = 1; }
    const [ax, az] = cellOf(xa, za), [bx, bz] = cellOf(xb, zb);
    for (let cz = az; cz <= bz; cz++) for (let cx = ax; cx <= bx; cx++) {
      const l = cells.get(key(cx, cz)); if (!l) continue;
      for (const i of l) { if (_seen[i] === _stamp) continue; _seen[i] = _stamp; out.push(i); }
    }
    return out;
  }
  return {
    cell, x0, z0, nx, nz, boxes, meta, cells, key,
    /** indices of boxes whose cells overlap `box` (then test box.intersectsBox yourself) */
    query(box, out = []) { out.length = 0; return gather(box.min.x, box.min.z, box.max.x, box.max.z, out); },
    /** indices of candidate boxes within r of (x, z) */
    near(x, z, r = 1, out = []) { out.length = 0; return gather(x - r, z - r, x + r, z + r, out); },
    boxesNear(x, z, r = 1) { return gather(x - r, z - r, x + r, z + r, []).map(i => boxes[i]); },
    /** candidates along a segment (its xz bounding rect grown by r) */
    segment(a, b, r = 0.5) { return gather(Math.min(a.x, b.x) - r, Math.min(a.z, b.z) - r, Math.max(a.x, b.x) + r, Math.max(a.z, b.z) + r, []); },
    stats() { let occupied = 0, maxPer = 0; for (const l of cells.values()) { occupied++; if (l.length > maxPer) maxPer = l.length; } return { boxes: boxes.length, cells: occupied, maxPerCell: maxPer, nx, nz, cell }; },
  };
}

/** Add a box (with a tag) to a collider list + meta list. */
export function addBox(list, meta, box, tag) { list.push(box); meta.push(tag || {}); return box; }
