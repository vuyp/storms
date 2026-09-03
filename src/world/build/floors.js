/**
 * world/build/floors.js — floors, ceilings (flat knockdown, the master tray, the garage), baseboards, the lanai
 * ceiling and the pool-cage deck (DESIGN §3.1, §3.3; ARCHITECTURE §9). Owner: E4 world+textures. Writes no state.
 * Floors/ceilings are 0.5-m grids with vertex AO at the walls and the fixture bounce (aBounce × uPowerOn).
 */
import { quadY, quadX, quadZ, boxAt, rgb, mulRgb } from './geo.js';
import { distToEdges, distToCorners } from './bake.js';
import { rooms, lines, DIM, PAINTS, LANAI, CAGE, POOL, casedOpenings } from '../plan.js';

const SUB = 0.5;
const ss = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

const FLOOR_MAT = { tile: 'tile', carpet: 'carpet', concrete: 'garageFloor', pavers: 'pavers' };

/** Grid-tessellated horizontal rectangle with per-vertex AO/bounce for a room polygon. */
function slab(y, x0, z0, x1, z1, facing, poly, baker, tint, opts = {}) {
  const { ambient = 0, aoR = 0.35, aoK = 0.28, uvOffset = [0, 0] } = opts;
  const nx = Math.max(1, Math.ceil((x1 - x0) / SUB)), nz = Math.max(1, Math.ceil((z1 - z0) / SUB));
  const n = [0, facing, 0];
  const vertexFn = (p, nn, u, v, out) => {
    const dE = poly ? distToEdges(p[0], p[2], poly) : 9, dC = poly ? distToCorners(p[0], p[2], poly) : 9;
    const ao = (1 - aoK + aoK * ss(0, aoR, dE)) * (0.9 + 0.1 * ss(0, 0.5, dC));
    out.color = [tint[0] * ao, tint[1] * ao, tint[2] * ao];
    out.bounce = baker ? Math.min(1, ambient + baker.bounce(p, n)) : 0;
  };
  return quadY(y, x0, z0, x1, z1, facing, { nx, ny: nz, vertexFn, uvOffset });
}

/**
 * @param {object} ctx { bakerFor, roomCollector, exteriorCollector, roomFilter?, offset? }
 */
export function buildFloors(ctx) {
  const { bakerFor, roomCollector, exteriorCollector, roomFilter = null, offset = [0, 0], interiorOnly = false } = ctx;
  const ox = offset[0], oz = offset[1];
  const white = rgb([1, 1, 1]);
  const ceilTint = rgb(PAINTS.ceiling);
  const trimTint = rgb(PAINTS.trim);

  for (const [id, room] of Object.entries(rooms)) {
    if (roomFilter && !roomFilter.has(id)) continue;
    if (id === 'cage' || id === 'nguyenFoyer') continue;
    if (interiorOnly && (id === 'lanai')) continue;
    const baker = bakerFor(id);
    const coll = roomCollector(id);
    const poly = room.polygon.map(([x, z]) => [x + ox, z + oz]);
    const floorMat = FLOOR_MAT[room.floor] || 'tile';
    // floor
    for (const [x0, z0, x1, z1] of room.rects) coll.add(floorMat, slab(room.floorY, x0 + ox, z0 + oz, x1 + ox, z1 + oz, +1, poly, baker, white, { aoK: room.floor === 'pavers' ? 0.15 : 0.28 }));
    // ceiling
    const cy = room.ceilingY;
    if (room.ceiling === 'tray') {
      const [x0, z0, x1, z1] = room.rects[0];
      const i = room.trayInset, ty = room.trayY;
      // outer ring at 2.85 (4 strips), the raised field at 3.15, the four sloped-in tray sides
      coll.add('drywall', slab(cy, x0 + ox, z0 + oz, x1 + ox, z0 + i + oz, -1, poly, baker, ceilTint, { ambient: 0.12 }));
      coll.add('drywall', slab(cy, x0 + ox, z1 - i + oz, x1 + ox, z1 + oz, -1, poly, baker, ceilTint, { ambient: 0.12 }));
      coll.add('drywall', slab(cy, x0 + ox, z0 + i + oz, x0 + i + ox, z1 - i + oz, -1, poly, baker, ceilTint, { ambient: 0.12 }));
      coll.add('drywall', slab(cy, x1 - i + ox, z0 + i + oz, x1 + ox, z1 - i + oz, -1, poly, baker, ceilTint, { ambient: 0.12 }));
      coll.add('drywall', slab(ty, x0 + i + ox, z0 + i + oz, x1 - i + ox, z1 - i + oz, -1, null, baker, ceilTint, { ambient: 0.18 }));
      const c = mulRgb(ceilTint, 0.93);
      coll.add('drywall', quadZ(z0 + i + oz, x0 + i + ox, cy, x1 - i + ox, ty, +1, { color: c, nx: 6, ny: 1 }));
      coll.add('drywall', quadZ(z1 - i + oz, x0 + i + ox, cy, x1 - i + ox, ty, -1, { color: c, nx: 6, ny: 1 }));
      coll.add('drywall', quadX(x0 + i + ox, z0 + i + oz, cy, z1 - i + oz, ty, +1, { color: c, nx: 6, ny: 1 }));
      coll.add('drywall', quadX(x1 - i + ox, z0 + i + oz, cy, z1 - i + oz, ty, -1, { color: c, nx: 6, ny: 1 }));
    } else if (room.ceiling !== 'none') {
      for (const [x0, z0, x1, z1] of room.rects) coll.add('drywall', slab(cy, x0 + ox, z0 + oz, x1 + ox, z1 + oz, -1, poly, baker, id === 'lanai' ? mulRgb(ceilTint, 0.96) : ceilTint, { ambient: id === 'garage' ? 0.06 : 0.12 }));
    }
    // baseboards (not in the garage, closets with concrete, lanai)
    if (['garage', 'lanai', 'ahuCloset'].includes(id)) continue;
    baseboards(id, room, coll, trimTint, offset);
  }

  // the pool-cage deck: pavers around the pool and outside the lanai (the lanai floor is its own room)
  if (!roomFilter && !interiorOnly) {
    const deck = [
      [CAGE.x0, CAGE.z0, LANAI.x0, POOL.z0], [LANAI.x0, CAGE.z0, CAGE.x1, LANAI.z0],           // north
      [CAGE.x0, POOL.z1, LANAI.x0, CAGE.z1], [LANAI.x0, LANAI.z1, CAGE.x1, CAGE.z1],           // south
      [CAGE.x0, POOL.z0, POOL.x0, POOL.z1], [POOL.x1, POOL.z0, LANAI.x0, POOL.z1],             // west / middle
      [CAGE.x0 - 0.9, CAGE.z0 - 0.9, CAGE.x0, CAGE.z1 + 0.9], [CAGE.x0, CAGE.z0 - 0.9, CAGE.x1, CAGE.z0], [CAGE.x0, CAGE.z1, CAGE.x1 + 0.0, CAGE.z1 + 0.9], // a paver apron outside the cage
    ];
    const cagePoly = rooms.cage.polygon;
    for (const [x0, z0, x1, z1] of deck) exteriorCollector.add('pavers', slab(CAGE.y, x0, z0, x1, z1, +1, cagePoly, null, white, { aoK: 0.12 }));
  }
}

/** Baseboard runs along a room's polygon minus the doors and cased openings; 0.09 × 0.012 painted. */
function baseboards(id, room, coll, tint, offset) {
  const ox = offset[0], oz = offset[1];
  const poly = room.polygon;
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const vertical = Math.abs(a[0] - b[0]) < 1e-6;
    const at = vertical ? a[0] : a[1];
    const lo = Math.min(vertical ? a[1] : a[0], vertical ? b[1] : b[0]), hi = Math.max(vertical ? a[1] : a[0], vertical ? b[1] : b[0]);
    // is there a wall on this edge? (an open plan boundary has none — e.g. nook/kitchen at z = 3.30)
    const line = lines.find(l => (vertical ? l.dir === 'NS' : l.dir === 'EW') && Math.abs(l.at - at) <= l.t / 2 + 0.002 && Math.min(l.to, hi) - Math.max(l.from, lo) > 0.05);
    if (!line) continue;
    // subtract floor-reaching openings
    const cuts = [];
    for (const o of line.openings) if (o.sill <= 0.02) cuts.push([o.from - 0.06, o.to + 0.06]);
    for (const c of casedOpenings) if (c.line === line.id) cuts.push([c.from - 0.06, c.to + 0.06]);
    let runs = [[Math.max(lo, line.from), Math.min(hi, line.to)]];
    for (const [c0, c1] of cuts) {
      const next = [];
      for (const [r0, r1] of runs) {
        if (c1 <= r0 || c0 >= r1) { next.push([r0, r1]); continue; }
        if (c0 > r0) next.push([r0, c0]);
        if (c1 < r1) next.push([c1, r1]);
      }
      runs = next;
    }
    const inward = vertical ? Math.sign(cx - at) : Math.sign(cz - at);
    const t = 0.012, hgt = DIM.baseboardH;
    for (const [r0, r1] of runs) {
      if (r1 - r0 < 0.03) continue;
      const y0 = room.floorY, y1 = room.floorY + hgt;
      if (vertical) coll.add('paint', boxAt(at + ox, y0, r0 + oz, at + inward * t + ox, y1, r1 + oz, { color: tint }));
      else coll.add('paint', boxAt(r0 + ox, y0, at + oz, r1 + ox, y1, at + inward * t + oz, { color: tint }));
    }
  }
}
