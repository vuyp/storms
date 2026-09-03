/**
 * world/build/walls.js — every wall face from the plan's centre-lines (DESIGN §3.2; ARCHITECTURE §9 "Plan as
 * data → meshes"). Owner: E4 world+textures. Writes no state.
 *
 * Each line is split into sub-segments by the room on each side; each face is decomposed into rectangles around
 * its openings (piers, headers, sill walls) and emitted as 0.5-m-tessellated quads with vertex-baked AO and
 * fixture bounce (bake.js). Exterior faces are stucco (−0.30 m grade … 3.05 m eave, with the raised bands of a
 * 2003 CBS house); interior faces are knockdown drywall (painted block in the garage); reveals are painted trim.
 * Wall colliders are one Box3 per solid run (doorways stay open; window sill walls block).
 */
import { quadX, quadZ, quadY, quad, box3, boxAt, rgb, mulRgb } from './geo.js';
import { rooms, DIM, PAINTS, SLAB } from '../plan.js';

const EPS = 1e-4;
const SUB = 0.5;

/** Rectangle decomposition of a face (u0..u1 × v0..v1) around holes. */
function decompose(u0, u1, v0, v1, holes) {
  const out = [];
  const hs = holes.filter(h => h.to > u0 + EPS && h.from < u1 - EPS).map(h => ({ ...h, from: Math.max(h.from, u0), to: Math.min(h.to, u1) })).sort((a, b) => a.from - b.from);
  let cursor = u0, leftCorner = true;
  for (const h of hs) {
    if (h.from > cursor + 0.004) out.push({ u0: cursor, u1: h.from, v0, v1, cornerL: leftCorner, cornerR: false, holeR: true, holeL: !leftCorner });
    if (h.head < v1 - 0.004) out.push({ u0: h.from, u1: h.to, v0: h.head, v1, cornerL: false, cornerR: false, header: true });
    if (h.sill > v0 + 0.004) out.push({ u0: h.from, u1: h.to, v0, v1: h.sill, cornerL: false, cornerR: false, sillWall: true });
    cursor = h.to; leftCorner = false;
  }
  if (u1 > cursor + 0.004) out.push({ u0: cursor, u1, v0, v1, cornerL: leftCorner, cornerR: true, holeL: !leftCorner });
  return out;
}

/** Sample the room on one side of a line along its length → contiguous runs [{from,to,room}]. */
function sideRuns(line, side, roomAt, offset) {
  const step = 0.02;
  const runs = [];
  const off = line.t / 2 + 0.09;
  let cur = null;
  for (let u = line.from + step / 2; u < line.to; u += step) {
    const x = line.dir === 'EW' ? u : line.at + side * off;
    const z = line.dir === 'EW' ? line.at + side * off : u;
    const room = roomAt(x + offset[0], z + offset[1]);
    if (cur && cur.room === room) cur.to = u + step / 2;
    else { cur = { from: u - step / 2, to: u + step / 2, room }; runs.push(cur); }
  }
  // snap run ends to the line ends and merge tiny slivers into their neighbours
  if (runs.length) { runs[0].from = line.from; runs[runs.length - 1].to = line.to; }
  return runs.filter(r => r.to - r.from > 0.08);
}

/**
 * @param {object} ctx
 * @param {Array} ctx.lines plan lines
 * @param {(x:number,z:number)=>string} ctx.roomAt
 * @param {(roomId:string)=>{bounce:Function, ao:Function}} ctx.bakerFor
 * @param {(roomId:string)=>import('./geo.js').Collector} ctx.roomCollector
 * @param {import('./geo.js').Collector} ctx.exteriorCollector
 * @param {THREE.Box3[]} ctx.colliders
 * @param {number[]} [ctx.offset] plan → world translation (the Nguyen shell uses [0, −26])
 * @param {boolean} [ctx.interiorOnly] skip exterior (stucco) faces
 * @param {boolean} [ctx.exteriorOnly] only the stucco faces and their reveals (neighbour shells)
 * @param {Set<string>} [ctx.roomFilter] only build faces bordering these rooms
 * @param {number[]} [ctx.houseColour] sRGB 0..1 stucco tint
 */
export function buildWalls(ctx) {
  const { lines, roomAt, bakerFor, roomCollector, exteriorCollector, colliders, offset = [0, 0], interiorOnly = false, exteriorOnly = false, roomFilter = null } = ctx;
  const houseColour = rgb(ctx.houseColour || [0.85, 0.80, 0.70]);
  const bandColour = mulRgb(rgb(ctx.bandColour || [0.94, 0.92, 0.88]), 1);
  const ox = offset[0], oz = offset[1];
  const stats = { faces: 0, pieces: 0 };

  const isRoom = (id) => id && id !== 'outside' && id !== 'lanai' && id !== 'cage';

  for (const line of lines) {
    const holes = line.openings.filter(o => !o.unit); // a unit member (the sidelight) is folded into its door's hole
    for (const h of line.openings) if (h.unitWith) { const s = line.openings.find(o => o.id === h.unitWith); if (s) { const idx = holes.indexOf(h); holes[idx] = { ...h, from: Math.min(h.from, s.from), to: Math.max(h.to, s.to), sill: Math.min(h.sill, s.sill), head: Math.max(h.head, s.head) }; } }
    const halfT = line.t / 2;
    for (const side of [-1, 1]) {
      const runs = sideRuns(line, side, roomAt, offset);
      for (const run of runs) {
        const room = run.room;
        const isExterior = !isRoom(room);
        if (isExterior && interiorOnly) continue;
        if (!isExterior && exteriorOnly) continue;
        if (roomFilter && !isExterior && !roomFilter.has(room)) continue;
        if (roomFilter && isExterior) continue;
        const roomDef = rooms[room];
        const floorY = isExterior ? DIM.grade : (roomDef?.floorY ?? 0);
        const topY = isExterior ? DIM.wallTop : (roomDef?.ceilingY ?? DIM.ceiling);
        // extend into the crossing walls at both ends so faces meet inside the joint (no notches at corners)
        const ext = 0.06;
        const u0 = run.from - (run.from > line.from + EPS ? ext : (line.ext ? 0 : ext));
        const u1 = run.to + (run.to < line.to - EPS ? ext : (line.ext ? 0 : ext));
        const at = line.at + side * halfT;
        const baker = isExterior ? null : bakerFor(room);
        const matName = isExterior ? 'stucco' : (line.ext && room === 'garage') ? 'block' : 'drywall';
        const paint = isExterior ? houseColour : rgb(PAINTS[roomDef?.paint || 'greige'] || PAINTS.greige);
        const collector = isExterior ? exteriorCollector : roomCollector(room);
        const pieces = decompose(u0, u1, floorY, topY, holes);
        stats.faces++;
        for (const pc of pieces) {
          const w = pc.u1 - pc.u0, h = pc.v1 - pc.v0;
          if (w < 0.004 || h < 0.004) continue;
          const nx = Math.max(1, Math.ceil(w / SUB)), ny = Math.max(1, Math.ceil(h / SUB));
          const vertexFn = (p, n, u, v, out) => {
            // AO: floor, ceiling and vertical corners of this room face
            const dFloor = p[1] - floorY, dCeil = topY - p[1];
            let dCorner = 9;
            if (pc.cornerL) dCorner = Math.min(dCorner, u);
            if (pc.cornerR) dCorner = Math.min(dCorner, w - u);
            if (pc.holeL) dCorner = Math.min(dCorner, u * 2 + 0.08);
            if (pc.holeR) dCorner = Math.min(dCorner, (w - u) * 2 + 0.08);
            let ao;
            if (isExterior) ao = 0.82 + 0.18 * Math.min(1, Math.max(0, (p[1] - DIM.grade) / 0.5));
            else ao = baker.ao(dFloor, dCeil, dCorner);
            let tint = paint;
            if (isExterior) {
              // stucco banding: a raised head band at 2.25–2.40, the base band below 0.25 (a lighter tint here; relief below)
              const y = p[1];
              if ((y > 2.25 - 0.001 && y < 2.40 + 0.001) || y < 0.25) tint = bandColour;
            }
            out.color = [tint[0] * ao, tint[1] * ao, tint[2] * ao];
            out.bounce = isExterior ? 0 : baker.bounce(p, n);
          };
          const opts = { nx, ny, vertexFn, uvOffset: [pc.u0, pc.v0] };
          let g;
          if (line.dir === 'EW') g = quadZ(at + oz, pc.u0 + ox, pc.v0, pc.u1 + ox, pc.v1, side, opts);
          else g = quadX(at + ox, pc.u0 + oz, pc.v0, pc.u1 + oz, pc.v1, side, opts);
          collector.add(matName, g);
          stats.pieces++;
        }
        // reveals (jambs, head, sill) — painted trim, once per hole, from the +side pass only
        if (line.ext ? isExterior : side === 1) {
          for (const h of holes) {
            if (h.to <= u0 + EPS || h.from >= u1 - EPS) continue;
            const hv0 = Math.max(h.sill, line.ext && isExterior ? DIM.grade : 0), hv1 = h.head;
            const trim = h.kind === 'cased' ? rgb(PAINTS.trim) : rgb(PAINTS.trim);
            const c = mulRgb(trim, 0.92);
            const a0 = line.at - halfT, a1 = line.at + halfT;
            const revealCollector = line.ext ? exteriorCollector : collector;
            // the door/window frame sits in the reveal; interior reveals are drywall-returned and painted
            if (line.dir === 'EW') {
              revealCollector.add('paint', quadX(h.from + ox, a0 + oz, hv0, a1 + oz, hv1, +1, { color: c, ny: 2 }));
              revealCollector.add('paint', quadX(h.to + ox, a0 + oz, hv0, a1 + oz, hv1, -1, { color: c, ny: 2 }));
              revealCollector.add('paint', quadY(hv1, h.from + ox, a0 + oz, h.to + ox, a1 + oz, -1, { color: c }));
              if (h.sill > 0.01) revealCollector.add('paint', quadY(h.sill, h.from + ox, a0 + oz, h.to + ox, a1 + oz, +1, { color: c }));
            } else {
              revealCollector.add('paint', quadZ(h.from + oz, a0 + ox, hv0, a1 + ox, hv1, +1, { color: c, ny: 2 }));
              revealCollector.add('paint', quadZ(h.to + oz, a0 + ox, hv0, a1 + ox, hv1, -1, { color: c, ny: 2 }));
              revealCollector.add('paint', quadY(hv1, a0 + ox, h.from + oz, a1 + ox, h.to + oz, -1, { color: c }));
              if (h.sill > 0.01) revealCollector.add('paint', quadY(h.sill, a0 + ox, h.from + oz, a1 + ox, h.to + oz, +1, { color: c }));
            }
          }
        }
      }
    }
    // free-end caps: an interior wall end that no other wall touches (the cased-opening piers at z = 10)
    if (!line.ext && !interiorOnly && !exteriorOnly) {
      for (const end of ['from', 'to']) {
        const u = line[end];
        const px = line.dir === 'EW' ? u : line.at, pz = line.dir === 'EW' ? line.at : u;
        const touched = lines.some(o => o !== line && (o.dir === 'EW' ? (Math.abs(o.at - pz) < 0.13 && px >= o.from - 0.13 && px <= o.to + 0.13) : (Math.abs(o.at - px) < 0.13 && pz >= o.from - 0.13 && pz <= o.to + 0.13)));
        if (touched) continue;
        const sideRoom = roomAt(px + ox + (line.dir === 'EW' ? 0 : 0.2), pz + oz + (line.dir === 'EW' ? 0.2 : 0));
        if (roomFilter && !roomFilter.has(sideRoom)) continue;
        const paint = rgb(PAINTS[rooms[sideRoom]?.paint || 'greige'] || PAINTS.greige);
        const facing = end === 'from' ? -1 : 1;
        const g = line.dir === 'EW'
          ? quadX(u + ox, line.at - halfT + oz, 0, line.at + halfT + oz, DIM.ceiling, facing, { color: paint, ny: 4 })
          : quadZ(u + oz, line.at - halfT + ox, 0, line.at + halfT + ox, DIM.ceiling, facing, { color: paint, ny: 4 });
        roomCollector(isRoom(sideRoom) ? sideRoom : 'great').add('drywall', g);
      }
    }
    // colliders: solid runs at player height (0–2 m); holes leave gaps except sill walls
    if (colliders) {
      const runs = decompose(line.from, line.to, 0, 2.6, holes.map(h => ({ ...h, sill: h.sill, head: h.head })));
      for (const pc of runs) {
        if (pc.header) continue;
        const y0 = pc.sillWall ? 0 : 0, y1 = pc.sillWall ? pc.v1 : 2.6;
        if (pc.sillWall && pc.v1 < 0.3) continue;
        const a0 = line.at - halfT, a1 = line.at + halfT;
        if (line.dir === 'EW') colliders.push(box3(pc.u0 + ox, y0, a0 + oz, pc.u1 + ox, y1, a1 + oz));
        else colliders.push(box3(a0 + ox, y0, pc.u0 + oz, a1 + ox, y1, pc.u1 + oz));
      }
    }
  }
  return stats;
}

/**
 * Exterior stucco relief for the main house: the raised head band, the base band, window surrounds and the
 * bay's skirt are thin boxes proud of the wall so they read in raking light. Stucco material, band tint.
 */
export function buildStuccoTrim({ lines, openings, exteriorCollector, houseColour, bandColour }) {
  const band = rgb(bandColour || [0.94, 0.92, 0.88]);
  const wallOuter = (line) => line.at + (line.outward === 'N' || line.outward === 'W' ? -1 : 1) * line.t / 2;
  for (const line of lines.filter(l => l.ext)) {
    const o = wallOuter(line);
    const dir = line.outward === 'N' || line.outward === 'W' ? -1 : 1;
    const proud = 0.03;
    const spans = [[line.from, line.to]];
    // head band 2.25–2.40 (skipped across the garage door opening which is lower anyway — it runs above it)
    for (const [a, b] of spans) {
      if (line.dir === 'EW') exteriorCollector.add('stucco', boxAt(a, 2.25, Math.min(o, o + dir * proud), b, 2.40, Math.max(o, o + dir * proud), { color: band }));
      else exteriorCollector.add('stucco', boxAt(Math.min(o, o + dir * proud), 2.25, a, Math.max(o, o + dir * proud), 2.40, b, { color: band }));
    }
    // base band: from grade to 0.25, 0.02 proud
    if (line.dir === 'EW') exteriorCollector.add('stucco', boxAt(line.from, DIM.grade - 0.05, Math.min(o, o + dir * 0.02), line.to, 0.25, Math.max(o, o + dir * 0.02), { color: band }));
    else exteriorCollector.add('stucco', boxAt(Math.min(o, o + dir * 0.02), DIM.grade - 0.05, line.from, Math.max(o, o + dir * 0.02), 0.25, line.to, { color: band }));
    // window surrounds (0.1 wide, 0.02 proud) around every window / peep; not the sliders, doors or the bay
    for (const op of line.openings) {
      if (!['window', 'peep'].includes(op.kind) || op.bay || op.unit) continue;
      const w = 0.10, p = 0.022;
      const f0 = op.from - w, f1 = op.to + w, s0 = op.sill - w, s1 = op.head + w;
      const o0 = Math.min(o, o + dir * p), o1 = Math.max(o, o + dir * p);
      const pieces = [[f0, s0, f1, op.sill], [f0, op.head, f1, s1], [f0, op.sill, op.from, op.head], [op.to, op.sill, f1, op.head]];
      for (const [a, y0, b, y1] of pieces) {
        if (line.dir === 'EW') exteriorCollector.add('stucco', boxAt(a, y0, o0, b, y1, o1, { color: band }));
        else exteriorCollector.add('stucco', boxAt(o0, y0, a, o1, y1, b, { color: band }));
      }
    }
  }
  // corner quoin-less: a subtle vertical corner bead at the four slab corners
  for (const [x, z] of [[0, 0], [14, 0], [0, 19.8], [14, 19.8]]) exteriorCollector.add('stucco', boxAt(x - 0.03, DIM.grade, z - 0.03, x + 0.03, DIM.wallTop, z + 0.03, { color: band }));
}
