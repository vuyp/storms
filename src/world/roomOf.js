/**
 * world/roomOf.js — `roomOf(point)` with a 0.5-m grid cache, `yardSectorOf(point)` (ARCHITECTURE §2, §6.6;
 * DESIGN §3.3, §16.4). Owner: E4 world+textures. Pure: node-importable, no THREE (accepts {x,y,z} or [x,y,z]).
 * Writes no state.
 *
 * Resolution order: an interior polygon hit → the nearest interior room when the point is inside the slab but
 * within a wall (≤ 0.3 m, so doorways and door leaves never read 'outside') → lanai → cage → nguyenFoyer →
 * 'outside'. Points above the attic line (y > 3.6) or below the slab (y < −0.6 inside the slab) are 'outside'.
 */
import { rooms, SLAB, LANAI, CAGE, yardSectorOfXZ } from './plan.js';
import { INTERIOR_ROOM_IDS } from '../core/ids.js';

export const CELL = 0.5;
const SNAP = 0.3;

/** Standard even-odd point-in-polygon. */
export function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    const hit = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}
/** Distance from (x,z) to the polygon boundary (0 inside is not implied — this is the edge distance). */
export function distanceToPolygonEdge(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], az = poly[j][1], bx = poly[i][0], bz = poly[i][1];
    const dx = bx - ax, dz = bz - az;
    const len2 = dx * dx + dz * dz || 1e-9;
    let t = ((x - ax) * dx + (z - az) * dz) / len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + t * dx - x, pz = az + t * dz - z;
    const d = Math.sqrt(px * px + pz * pz);
    if (d < best) best = d;
  }
  return best;
}
function bboxOf(poly) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of poly) { if (x < x0) x0 = x; if (z < z0) z0 = z; if (x > x1) x1 = x; if (z > z1) z1 = z; }
  return [x0, z0, x1, z1];
}

const ENTRIES = [
  ...INTERIOR_ROOM_IDS.map(id => ({ id, poly: rooms[id].polygon, bbox: bboxOf(rooms[id].polygon), interior: true })),
  { id: 'lanai', poly: rooms.lanai.polygon, bbox: bboxOf(rooms.lanai.polygon), interior: false },
  { id: 'cage', poly: rooms.cage.polygon, bbox: bboxOf(rooms.cage.polygon), interior: false },
  { id: 'nguyenFoyer', poly: rooms.nguyenFoyer.polygon, bbox: bboxOf(rooms.nguyenFoyer.polygon), interior: false, snap: true },
];

/** The grid: x ∈ [−12, 16], z ∈ [−28, 24]; each cell lists candidate rooms and caches a `single` answer. */
const GX0 = -12, GZ0 = -28, GX1 = 16, GZ1 = 24;
const NX = Math.ceil((GX1 - GX0) / CELL), NZ = Math.ceil((GZ1 - GZ0) / CELL);
const cells = new Array(NX * NZ);
function buildCell(cx, cz) {
  const x0 = GX0 + cx * CELL, z0 = GZ0 + cz * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
  const cand = [];
  for (const e of ENTRIES) {
    const b = e.bbox;
    if (x1 < b[0] - SNAP || x0 > b[2] + SNAP || z1 < b[1] - SNAP || z0 > b[3] + SNAP) continue;
    cand.push(e);
  }
  let single = null;
  if (cand.length >= 1) {
    // fully inside the first interior candidate (all four corners + centre)?
    for (const e of cand) {
      const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [(x0 + x1) / 2, (z0 + z1) / 2]];
      if (pts.every(([x, z]) => pointInPolygon(x, z, e.poly))) { single = e.id; break; }
    }
  }
  return { cand, single };
}
for (let cz = 0; cz < NZ; cz++) for (let cx = 0; cx < NX; cx++) cells[cz * NX + cx] = buildCell(cx, cz);

function resolveXZ(x, z) {
  const cx = Math.floor((x - GX0) / CELL), cz = Math.floor((z - GZ0) / CELL);
  if (cx < 0 || cz < 0 || cx >= NX || cz >= NZ) return 'outside';
  const cell = cells[cz * NX + cx];
  if (cell.single) return cell.single;
  const inSlab = x >= SLAB.x0 && x <= SLAB.x1 && z >= SLAB.z0 && z <= SLAB.z1;
  let nearest = null, nearestD = SNAP;
  for (const e of cell.cand) {
    if (e.interior) {
      if (pointInPolygon(x, z, e.poly)) return e.id;
      if (inSlab) { const d = distanceToPolygonEdge(x, z, e.poly); if (d < nearestD) { nearestD = d; nearest = e.id; } }
    }
  }
  if (nearest) return nearest;
  for (const e of cell.cand) {
    if (e.interior) continue;
    if (pointInPolygon(x, z, e.poly)) return e.id;
    if (e.snap && distanceToPolygonEdge(x, z, e.poly) < SNAP && x >= 0 && x <= 14) return e.id;
  }
  return 'outside';
}

/** @param {{x:number,y:number,z:number}|number[]} p */
export function roomOf(p) {
  const x = Array.isArray(p) ? p[0] : p.x, y = Array.isArray(p) ? p[1] : p.y, z = Array.isArray(p) ? p[2] : p.z;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 'outside';
  if (y != null && Number.isFinite(y) && y > 3.6) return 'outside';
  return resolveXZ(x, z);
}
export function roomOfXZ(x, z) { return resolveXZ(x, z); }

/** 'frontYard' | 'backYard' | 'driveway' | 'street' | '' (DESIGN §16.4). Independent of roomOf. */
export function yardSectorOf(p) {
  const x = Array.isArray(p) ? p[0] : p.x, z = Array.isArray(p) ? p[2] : p.z;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return '';
  return yardSectorOfXZ(x, z);
}

/** True for the covered / enclosed places (used for "outdoors" logic: lanai counts as sheltered, cage as outdoors). */
export function isIndoorRoom(id) { return INTERIOR_ROOM_IDS.includes(id) || id === 'nguyenFoyer'; }

export const gridInfo = { CELL, x0: GX0, z0: GZ0, nx: NX, nz: NZ, cells };
