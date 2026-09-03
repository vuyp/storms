/**
 * world/build/openings.js — every window, slider, door and the garage door of DESIGN §3.4–3.5:
 * single-hung aluminium windows with sashes, muntins, screens, stools and casings; the three-facet bay;
 * the triple and double sliders with tracks; the inswing fibreglass front door with its sidelight, threshold,
 * coach lights, number plaque and wreath; the outswing steel man door; the 16-ft sectional roll-up with tracks,
 * opener rail, motor and manual-release cord; twelve six-panel interior doors with lever handles (louvred AHU,
 * bifold linen); the cage screen door. Owner: E4 world+textures. Writes no state.
 *
 * Door pivots: `registry.doors[id]` is a Group at the hinge; `pivot.userData.setOpen(open 0..1)` rotates it
 * (or slides a slider panel, or rolls the garage door). Render calls it from `house.doors[id].open`.
 */
import * as THREE from 'three';
import { boxAt, box, place, plane, cyl, torus, rgb, mulRgb, merge, staticMesh, Collector, quadX, quadZ, quadY, sphere } from './geo.js';
import { openings, doors, casedOpenings, rooms, DIM, PAINTS, CAGE, PORCH, fixtures } from '../plan.js';

const WHITE = [0.95, 0.95, 0.93], TRIM = PAINTS.trim, BRONZE = [0.22, 0.18, 0.15], ALU = [0.92, 0.92, 0.9];
const PI = Math.PI, H = PI / 2;

/** Map (u along the wall, depth outward from the exterior face, y) → world box for an exterior opening. */
function makeMapper(op, offset = [0, 0]) {
  const n = op.normal, ext = op.plane.exteriorFace, axis = op.plane.axis;
  const ox = offset[0], oz = offset[1];
  return {
    box(u0, u1, d0, d1, y0, y1, o) {
      const a = ext + Math.min(n[axis === 'z' ? 2 : 0] * d0, n[axis === 'z' ? 2 : 0] * d1), b = ext + Math.max(n[axis === 'z' ? 2 : 0] * d0, n[axis === 'z' ? 2 : 0] * d1);
      return axis === 'z' ? boxAt(u0 + ox, y0, a + oz, u1 + ox, y1, b + oz, o) : boxAt(a + ox, y0, u0 + oz, b + ox, y1, u1 + oz, o);
    },
    /** a vertical plane at depth d spanning u0..u1, y0..y1, facing outward (+) or inward (−) */
    pane(u0, u1, d, y0, y1, facing, o) {
      const at = ext + n[axis === 'z' ? 2 : 0] * d;
      const f = facing * (axis === 'z' ? n[2] : n[0]);
      return axis === 'z' ? quadZ(at + oz, u0 + ox, y0, u1 + ox, y1, f, o) : quadX(at + ox, u0 + oz, y0, u1 + oz, y1, f, o);
    },
    point(u, d, y) { const at = ext + n[axis === 'z' ? 2 : 0] * d; return axis === 'z' ? [u + ox, y, at + oz] : [at + ox, y, u + oz]; },
    yaw: Math.atan2(n[0], n[2]), // rotation.y that turns local +z into the outward normal
  };
}

function glassMesh(geoms, mats, op, extra = {}) {
  const g = merge(geoms);
  const m = new THREE.Mesh(g, op.obscure ? mats.get('glassObscure') : mats.get('glass'));
  m.name = `glass:${op.id}`; m.renderOrder = 2; m.castShadow = false; m.receiveShadow = false;
  m.userData = { openingId: op.id, normal: op.normal, facadeDeg: op.facadeDeg, w: op.w, h: op.h, kind: 'glass', ...extra };
  return m;
}

/** A single-hung window (or the peep / obscure bath window / a standalone fixed pane). */
function buildWindow(op, ctx) {
  const { roomCollector, exteriorCollector, frameCollector, screenCollector, mats, offset = [0, 0] } = ctx;
  const M = makeMapper(op, offset);
  const white = rgb(WHITE), trim = rgb(TRIM);
  const u0 = op.from, u1 = op.to, s = op.sill, h = op.head;
  const fixed = op.kind === 'peep' || op.h <= 0.65;
  // outer frame with a 0.04 exterior flange and 0.09 depth
  const fw = 0.05;
  frameCollector.add('alu', M.box(u0 - 0.02, u1 + 0.02, -0.03, -0.005, s - 0.02, s + 0.0, { color: white })); // flange bottom
  frameCollector.add('alu', M.box(u0 - 0.02, u1 + 0.02, -0.03, -0.005, h, h + 0.02, { color: white }));
  frameCollector.add('alu', M.box(u0 - 0.02, u0, -0.03, -0.005, s, h, { color: white }));
  frameCollector.add('alu', M.box(u1, u1 + 0.02, -0.03, -0.005, s, h, { color: white }));
  frameCollector.add('alu', M.box(u0, u0 + fw, -0.11, -0.03, s, h, { color: white }));
  frameCollector.add('alu', M.box(u1 - fw, u1, -0.11, -0.03, s, h, { color: white }));
  frameCollector.add('alu', M.box(u0, u1, -0.11, -0.03, h - fw, h, { color: white }));
  frameCollector.add('alu', M.box(u0, u1, -0.11, -0.03, s, s + 0.035, { color: white })); // the sloped sill (as a box)
  const panes = [];
  if (fixed) {
    frameCollector.add('alu', sashRing(M, u0 + fw, u1 - fw, s + 0.035, h - fw, -0.065, -0.045, 0.035, white));
    panes.push(M.pane(u0 + fw + 0.035, u1 - fw - 0.035, -0.055, s + 0.07, h - fw - 0.035, 1, { nx: 2, ny: 2 }));
  } else {
    const mid = (s + h) / 2;
    // upper (fixed) sash, outer track
    frameCollector.add('alu', sashRing(M, u0 + fw, u1 - fw, mid - 0.015, h - fw, -0.062, -0.042, 0.04, white));
    panes.push(M.pane(u0 + fw + 0.04, u1 - fw - 0.04, -0.052, mid + 0.025, h - fw - 0.04, 1, { nx: 2, ny: 2 }));
    // lower (operable) sash, inner track, with a lift rail
    frameCollector.add('alu', sashRing(M, u0 + fw, u1 - fw, s + 0.035, mid + 0.015, -0.095, -0.075, 0.04, white));
    frameCollector.add('alu', M.box(u0 + fw + 0.04, u1 - fw - 0.04, -0.10, -0.075, mid - 0.03, mid + 0.015, { color: white }));
    panes.push(M.pane(u0 + fw + 0.04, u1 - fw - 0.04, -0.085, s + 0.075, mid - 0.03, 1, { nx: 2, ny: 2 }));
    // muntins (snap-in grille) — one vertical, one horizontal per sash for windows ≥ 0.8 wide
    if (op.w >= 0.8) {
      const um = (u0 + u1) / 2;
      for (const [y0, y1, d] of [[mid + 0.025, h - fw - 0.04, -0.05], [s + 0.075, mid - 0.03, -0.083]]) {
        frameCollector.add('alu', M.box(um - 0.009, um + 0.009, d - 0.006, d + 0.006, y0, y1, { color: white }));
        const ym = (y0 + y1) / 2;
        frameCollector.add('alu', M.box(u0 + fw + 0.04, u1 - fw - 0.04, d - 0.006, d + 0.006, ym - 0.009, ym + 0.009, { color: white }));
      }
    }
    // exterior insect screen over the lower sash
    screenCollector.add('screen', M.pane(u0 + fw + 0.005, u1 - fw - 0.005, -0.02, s + 0.04, mid - 0.005, 1, { nx: 2, ny: 2, flex: 0.15 }));
    // sash lock (a small cam) on the meeting rail, interior
    frameCollector.add('alu', M.box((u0 + u1) / 2 - 0.02, (u0 + u1) / 2 + 0.02, -0.12, -0.10, mid - 0.02, mid, { color: rgb([0.85, 0.85, 0.85]) }));
  }
  // interior stool, apron and casings (painted trim) into the room's collector
  const rc = roomCollector(op.room);
  const t = op.plane.t;
  rc.add('paint', M.box(u0 - 0.07, u1 + 0.07, -t - 0.07, -t + 0.015, s - 0.005, s + 0.025, { color: trim }));           // stool
  rc.add('paint', M.box(u0 - 0.05, u1 + 0.05, -t - 0.016, -t, s - 0.07, s - 0.005, { color: trim }));                    // apron
  rc.add('paint', M.box(u0 - 0.06, u0, -t - 0.016, -t, s + 0.025, h + 0.06, { color: trim }));                           // casings
  rc.add('paint', M.box(u1, u1 + 0.06, -t - 0.016, -t, s + 0.025, h + 0.06, { color: trim }));
  rc.add('paint', M.box(u0 - 0.06, u1 + 0.06, -t - 0.016, -t, h, h + 0.06, { color: trim }));
  // exterior sill nose (a small stucco/precast ledge)
  exteriorCollector.add('stucco', M.box(u0 - 0.04, u1 + 0.04, -0.005, 0.04, s - 0.05, s + 0.005, { color: rgb([0.94, 0.92, 0.88]) }));
  const frame = new THREE.Group(); frame.name = `frame:${op.id}`;
  const c = M.point((u0 + u1) / 2, -0.06, (s + h) / 2); frame.position.set(c[0], c[1], c[2]); frame.rotation.y = M.yaw;
  frame.userData = { openingId: op.id, w: op.w, h: op.h, sill: s, head: h, normal: op.normal, room: op.room, fixed };
  const glass = glassMesh(panes, mats, op);
  return { frame, glass, tracks: [new THREE.Vector3(...M.point(u0, -0.09, s)), new THREE.Vector3(...M.point(u1, -0.09, s)), new THREE.Vector3(...M.point((u0 + u1) / 2, -0.09, s))] };
}
function sashRing(M, u0, u1, y0, y1, d0, d1, w, color) {
  return merge([
    M.box(u0, u1, d0, d1, y0, y0 + w, { color }), M.box(u0, u1, d0, d1, y1 - w, y1, { color }),
    M.box(u0, u0 + w, d0, d1, y0, y1, { color }), M.box(u1 - w, u1, d0, d1, y0, y1, { color }),
  ]);
}

/** The nook's three-facet bay window (DESIGN §3.3): 0.45-m projection, seat board, hip cap, stucco skirt. */
function buildBay(op, ctx) {
  const { roomCollector, exteriorCollector, frameCollector, screenCollector, mats, offset = [0, 0] } = ctx;
  const ox = offset[0], oz = offset[1];
  const white = rgb(WHITE), trim = rgb(TRIM), stucco = rgb([0.94, 0.92, 0.88]);
  const zf = op.plane.exteriorFace; // 0 for the N wall
  const s = op.sill, h = op.head, p = op.projection;
  const xL = op.from, xR = op.to, xa = xL + 0.3, xb = xR - 0.3;
  // facets as 2D segments (x, z) in plan: left (xL,0)→(xa,−p), centre (xa,−p)→(xb,−p), right (xb,−p)→(xR,0)
  const facets = [[[xL, zf], [xa, zf - p]], [[xa, zf - p], [xb, zf - p]], [[xb, zf - p], [xR, zf]]];
  const panes = [];
  const slots = [];
  for (const [[x0, z0], [x1, z1]] of facets) {
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz); // rotation so local +x runs along the facet? we build in local then place
    // local frame: origin at (x0, z0), +u along the facet, normal outward = (−dz, dx)/len (left-hand of travel, points north for the centre facet)
    const nx = dz / len * -1 * -1, nz = -dx / len; // outward for a segment running west→east on the north side is −z
    const nrm = [ -dz / len * (dx >= 0 ? -1 : 1) * -1, 0, 0 ]; void nrm; void yaw; void nx; void nz; void ox; void oz;
    // simpler: build the facet as an axis-aligned frame in a local group rotated to the facet direction
    const grp = facetFrame(len, s, h, white, mats, panes, screenCollector);
    const ang = Math.atan2(-dz, dx); // rotation.y that maps local +x to (dx, dz)
    grp.geoms.forEach(g => { place(g, x0 + ox, 0, z0 + oz, ang); frameCollector.add('alu', g); });
    grp.panes.forEach(g => { place(g, x0 + ox, 0, z0 + oz, ang); panes.push(g); });
    grp.screens.forEach(g => { place(g, x0 + ox, 0, z0 + oz, ang); screenCollector.add('screen', g); });
    const cx = x0 + dx / 2, cz = z0 + dz / 2;
    const n = [Math.sin(ang - H) * -1, 0, Math.cos(ang - H) * -1];
    // outward normal of the facet: rotate the facet direction by −90° (north side of an east-running segment)
    const out = [dz / len, 0, -dx / len];
    slots.push({ centre: [cx + ox, (s + h) / 2, cz + oz], normal: out, width: len, yaw: Math.atan2(out[0], out[2]) });
    void n;
    // stucco skirt below the sill and a fascia strip above the head on each facet
    const skirt = quadSeg(x0, z0, x1, z1, DIM.grade, s - 0.04, out, stucco); exteriorCollector.add('stucco', skirt);
    const head = quadSeg(x0, z0, x1, z1, h, h + 0.22, out, white); exteriorCollector.add('soffit', head);
  }
  // the bay's floor/ceiling boards (interior) and the seat
  const rc = roomCollector(op.room);
  const seat = bayShape(xL, xa, xb, xR, zf, p, s - 0.01, s + 0.03, trim, +1); rc.add('paint', seat);
  const ceil = bayShape(xL, xa, xb, xR, zf, p, h - 0.02, h + 0.02, trim, -1); rc.add('paint', ceil);
  // the bay's roof cap: a low hip over the facets (three sloped quads to a small ridge at the wall)
  const capY0 = h + 0.22, capY1 = h + 0.55;
  const shingleTint = rgb([0.9, 0.9, 0.9]);
  const capPts = [[xL, zf], [xa, zf - p - 0.15], [xb, zf - p - 0.15], [xR, zf]];
  for (let i = 0; i < 3; i++) {
    const [x0, z0] = capPts[i], [x1, z1] = capPts[i + 1];
    const g = quadFacetSlope([x0, capY0, z0], [x1, capY0, z1], [Math.min(xR, x1 + 0.15 * (i === 2 ? 1 : 0) + (i === 1 ? 0.15 : 0)), capY1, zf], [Math.max(xL, x0 - (i === 0 ? 0 : 0.15)), capY1, zf], shingleTint);
    exteriorCollector.add('shingle', g);
  }
  exteriorCollector.add('soffit', quadY(capY0 - 0.001, xL, zf - p - 0.15, xR, zf, -1, { color: white }));
  // the stucco skirt's underside (the bay floor seen from outside) closes the box
  exteriorCollector.add('stucco', quadY(DIM.grade + 0.02, xL, zf - p, xR, zf, -1, { color: stucco }));
  const frame = new THREE.Group(); frame.name = `frame:${op.id}`;
  frame.position.set((xL + xR) / 2 + ox, (s + h) / 2, zf - p / 2 + oz);
  frame.userData = { openingId: op.id, w: op.w, h: op.h, sill: s, head: h, normal: op.normal, room: op.room, bay: true, facets: slots };
  const glass = glassMesh(panes, mats, op, { bay: true });
  return { frame, glass, tracks: slots.map(sl => new THREE.Vector3(sl.centre[0], s, sl.centre[2])), facetSlots: slots };
}
function facetFrame(len, s, h, white, mats, panes, screenCollector) {
  // local: x along the facet 0..len, z = 0 the wall plane of the facet, outward −z... we build with the facet's
  // outward normal at local +z by convention and rotate into place
  const geoms = [], pn = [], sc = [];
  const fw = 0.05;
  const B = (x0, x1, z0, z1, y0, y1) => boxAt(x0, y0, z0, x1, y1, z1, { color: white });
  geoms.push(B(0, len, -0.10, -0.02, s, s + 0.05), B(0, len, -0.10, -0.02, h - fw, h), B(0, fw, -0.10, -0.02, s, h), B(len - fw, len, -0.10, -0.02, s, h));
  const mid = (s + h) / 2;
  geoms.push(B(fw, len - fw, -0.065, -0.045, mid - 0.015, mid + 0.025), B(fw, len - fw, -0.065, -0.045, h - fw - 0.04, h - fw), B(fw, fw + 0.04, -0.065, -0.045, mid, h - fw), B(len - fw - 0.04, len - fw, -0.065, -0.045, mid, h - fw));
  geoms.push(B(fw, len - fw, -0.095, -0.075, s + 0.05, s + 0.09), B(fw, len - fw, -0.095, -0.075, mid - 0.03, mid + 0.015), B(fw, fw + 0.04, -0.095, -0.075, s + 0.05, mid), B(len - fw - 0.04, len - fw, -0.095, -0.075, s + 0.05, mid));
  // panes: local plane z = const facing +z (outward)
  pn.push(quadZ(-0.055, fw + 0.04, mid + 0.025, len - fw - 0.04, h - fw - 0.04, +1, { nx: 2, ny: 2 }));
  pn.push(quadZ(-0.085, fw + 0.04, s + 0.09, len - fw - 0.04, mid - 0.03, +1, { nx: 2, ny: 2 }));
  sc.push(quadZ(-0.03, fw, s + 0.05, len - fw, mid, +1, { nx: 2, ny: 2, flex: 0.15 }));
  return { geoms, panes: pn, screens: sc };
}
function quadSeg(x0, z0, x1, z1, y0, y1, out, color) {
  // a vertical quad along the segment with normal `out`
  const a = [x0, y0, z0], b = [x1, y0, z1], c = [x1, y1, z1], d = [x0, y1, z0];
  const g = require_quad(a, b, c, d, color);
  // ensure normal points along `out`
  const n = g.attributes.normal;
  if (n.getX(0) * out[0] + n.getZ(0) * out[2] < 0) return require_quad(b, a, d, c, color);
  return g;
}
function require_quad(a, b, c, d, color) { return quadFree(a, b, c, d, color); }
function quadFree(a, b, c, d, color) {
  const q = new THREE.BufferGeometry();
  const pos = new Float32Array([...a, ...b, ...c, ...d]);
  q.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  q.setIndex([0, 1, 2, 0, 2, 3]);
  q.computeVertexNormals();
  const lu = Math.hypot(b[0] - a[0], b[2] - a[2]), lv = Math.abs(d[1] - a[1]);
  q.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, lu, 0, lu, lv, 0, lv], 2));
  const col = rgb(color);
  q.setAttribute('color', new THREE.Float32BufferAttribute([...col, ...col, ...col, ...col], 3));
  q.setAttribute('aBounce', new THREE.Float32BufferAttribute([0, 0, 0, 0], 1));
  return q;
}
function quadFacetSlope(a, b, c, d, color) { return quadFree(a, b, c, d, color); }
function bayShape(xL, xa, xb, xR, zf, p, y0, y1, color, facing) {
  // a thin slab of the bay's plan polygon (wall line → facets) between y0 and y1: top/bottom faces + the polygon
  const shape = new THREE.Shape();
  shape.moveTo(xL, -zf); shape.lineTo(xR, -zf); shape.lineTo(xb, -(zf - p)); shape.lineTo(xa, -(zf - p)); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  // extrude along +z in shape space → rotate so depth runs along +y and the shape's y maps to world −z
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  // ExtrudeGeometry's shape plane after rotateX(−90°): (x, y) → (x, 0, −y) → our shape used −z as y → world z = zf.. ✓
  g.computeVertexNormals();
  const n = g.attributes.position.count;
  const col = rgb(color);
  const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.setAttribute('aBounce', new THREE.BufferAttribute(new Float32Array(n), 1));
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
  void facing;
  return g;
}

/** Sliding glass doors (great: triple; master: double). The operable panel is the door pivot (it slides). */
function buildSlider(op, door, ctx) {
  const { roomCollector, frameCollector, mats, offset = [0, 0] } = ctx;
  const M = makeMapper(op, offset);
  const white = rgb(WHITE), trim = rgb(TRIM);
  const u0 = op.from, u1 = op.to, h = op.head, s = 0;
  const nP = op.id === 'slider_great_W' ? 3 : 2;
  const pw = (u1 - u0) / nP;
  const fw = 0.06;
  // frame: head, jambs (0.1 deep), the sill track with two rails
  frameCollector.add('alu', M.box(u0 - 0.02, u1 + 0.02, -0.13, -0.02, h - fw, h + 0.02, { color: white }));
  frameCollector.add('alu', M.box(u0 - 0.02, u0 + fw, -0.13, -0.02, s, h, { color: white }));
  frameCollector.add('alu', M.box(u1 - fw, u1 + 0.02, -0.13, -0.02, s, h, { color: white }));
  frameCollector.add('alu', M.box(u0, u1, -0.13, -0.02, s, s + 0.02, { color: white }));
  frameCollector.add('alu', M.box(u0, u1, -0.058, -0.048, s + 0.02, s + 0.035, { color: white })); // outer rail
  frameCollector.add('alu', M.box(u0, u1, -0.098, -0.088, s + 0.02, s + 0.035, { color: white })); // inner rail
  const panes = [];
  const panelGeoms = (k, d) => {
    const a = u0 + fw + k * pw, b = a + pw;
    const ring = sashRing(M, a, b, s + 0.035, h - fw, d - 0.02, d + 0.02, 0.055, white);
    const pane = M.pane(a + 0.055, b - 0.055, d, s + 0.09, h - fw - 0.055, 1, { nx: 3, ny: 4 });
    return { ring, pane };
  };
  // fixed panels on the outer track; the operable one on the inner track slides over its neighbour
  const operable = 0; // the northern / first panel
  const pivot = new THREE.Group(); pivot.name = `door:${op.id}`;
  for (let k = 0; k < nP; k++) {
    const d = k === operable ? -0.093 : -0.053;
    const { ring, pane } = panelGeoms(k, d);
    if (k === operable) {
      const c = M.point(u0 + fw + k * pw, 0, 0);
      pivot.position.set(c[0], c[1], c[2]);
      place(ring, -c[0], -c[1], -c[2]); place(pane, -c[0], -c[1], -c[2]);
      const ringMesh = staticMesh(merge([ring]), mats.get('alu'), { name: `${op.id}:panelFrame` });
      ringMesh.matrixAutoUpdate = true;
      const paneMesh = new THREE.Mesh(pane, mats.get('glass')); paneMesh.name = `${op.id}:panelGlass`; paneMesh.renderOrder = 2;
      paneMesh.userData = { openingId: op.id, normal: op.normal, facadeDeg: op.facadeDeg, w: pw, h, kind: 'glass', slidingPanel: true };
      // the handle (interior side)
      const hnd = box(0.03, 0.22, 0.02, { color: rgb(BRONZE) });
      const hp = M.point(u0 + fw + k * pw + pw - 0.08, -0.115, 1.0);
      place(hnd, hp[0] - c[0], hp[1] - c[1], hp[2] - c[2]);
      const hndMesh = staticMesh(hnd, mats.get('paint'), { name: `${op.id}:handle` }); hndMesh.matrixAutoUpdate = true;
      pivot.add(ringMesh, paneMesh, hndMesh);
      pivot.userData.glass = paneMesh;
    } else { frameCollector.add('alu', ring); panes.push(pane); }
  }
  const slideDir = new THREE.Vector3(door.slideDir[0], door.slideDir[1], door.slideDir[2]);
  const base = pivot.position.clone();
  const dist = pw - 0.06;
  pivot.userData = { ...pivot.userData, doorId: op.id, kind: 'slider', slideDir, slideDistance: dist, base, openSign: 1, baseYaw: 0, maxAngle: 0,
    setOpen(open) { pivot.position.copy(base).addScaledVector(slideDir, Math.max(0, Math.min(1, open)) * dist); } };
  // interior casing (paint) around the opening
  const rc = roomCollector(op.room), t = op.plane.t;
  rc.add('paint', M.box(u0 - 0.06, u0, -t - 0.016, -t, s, h + 0.06, { color: trim }));
  rc.add('paint', M.box(u1, u1 + 0.06, -t - 0.016, -t, s, h + 0.06, { color: trim }));
  rc.add('paint', M.box(u0 - 0.06, u1 + 0.06, -t - 0.016, -t, h, h + 0.06, { color: trim }));
  // the lanai-side threshold (a small aluminium step down to the pavers)
  frameCollector.add('alu', M.box(u0 - 0.05, u1 + 0.05, 0.0, 0.06, DIM.lanaiY, s + 0.01, { color: white }));
  const frame = new THREE.Group(); frame.name = `frame:${op.id}`;
  const c = M.point((u0 + u1) / 2, -0.07, h / 2); frame.position.set(c[0], c[1], c[2]); frame.rotation.y = M.yaw;
  frame.userData = { openingId: op.id, w: op.w, h: op.h, sill: s, head: h, normal: op.normal, room: op.room, slider: true, panels: nP };
  const glass = glassMesh(panes, mats, op);
  const tracks = [new THREE.Vector3(...M.point(u0, -0.07, 0.02)), new THREE.Vector3(...M.point(u1, -0.07, 0.02)), new THREE.Vector3(...M.point((u0 + u1) / 2, -0.07, 0.02))];
  return { frame, glass, door: pivot, tracks };
}

/** Six-panel raised look: a core slab plus stiles/rails proud on both faces; a lever set. Local: hinge at x=0, slab along +x, thickness along z. */
function doorLeafGeom(w, h, thick, colour, { louvred = false, bifold = false, steel = false, lever = true, deadbolt = false, wreath = false } = {}) {
  const c = rgb(colour);
  const dark = mulRgb(c, 0.86);
  const geoms = [];
  const core = box(w, h, thick * 0.55, { color: dark }); place(core, w / 2, h / 2, 0); geoms.push(core);
  const pr = thick / 2;
  for (const side of [-1, 1]) {
    const zc = side * (pr - 0.004);
    const rail = (x0, x1, y0, y1) => { const g = box(x1 - x0, y1 - y0, 0.008, { color: c }); place(g, (x0 + x1) / 2, (y0 + y1) / 2, zc); geoms.push(g); };
    rail(0, 0.1, 0, h); rail(w - 0.1, w, 0, h);                 // stiles
    rail(0, w, h - 0.12, h); rail(0, w, 0, 0.2);                 // top rail, bottom rail
    rail(0, w, h * 0.5 - 0.04, h * 0.5 + 0.04);                  // lock rail
    rail(0, w, h * 0.8 - 0.035, h * 0.8 + 0.035);                // top mid rail
    rail(w / 2 - 0.03, w / 2 + 0.03, 0.2, h - 0.12);             // centre mullion
    if (bifold) rail(w / 2 - 0.006, w / 2 + 0.006, 0, h);
    if (louvred) for (let y = 0.26; y < h * 0.5 - 0.08; y += 0.045) { const g = box(w - 0.24, 0.012, 0.03, { color: c }); place(g, w / 2, y, zc, 0, side * 0.7, 0); geoms.push(g); }
  }
  if (lever) {
    for (const side of [-1, 1]) {
      const rose = cyl(0.03, 0.03, 0.012, 12, { color: rgb(BRONZE) }); place(rose, w - 0.075, 1.0, side * (pr + 0.004), 0, H, 0); geoms.push(rose);
      const lev = box(0.11, 0.016, 0.014, { color: rgb(BRONZE) }); place(lev, w - 0.075 - 0.045, 1.0, side * (pr + 0.02)); geoms.push(lev);
    }
  }
  if (deadbolt) for (const side of [-1, 1]) { const b = cyl(0.028, 0.028, 0.012, 12, { color: rgb(BRONZE) }); place(b, w - 0.075, 1.12, side * (pr + 0.004), 0, H, 0); geoms.push(b); }
  if (wreath) { const wr = torus(0.17, 0.045, 8, 18, { color: rgb([0.16, 0.36, 0.14]) }); place(wr, w / 2, 1.55, pr + 0.05); geoms.push(wr); const bow = box(0.1, 0.06, 0.03, { color: rgb([0.7, 0.1, 0.12]) }); place(bow, w / 2, 1.38, pr + 0.07); geoms.push(bow); }
  return merge(geoms);
}

/**
 * A hinged door pivot from a plan door record. Local frame: +x from the hinge along the closed leaf, +z = the
 * swing side when openSign = −1 (the sign is computed so `rotation.y = baseYaw + openSign·open·maxAngle`).
 */
function buildHingedDoor(door, ctx, opts = {}) {
  const { roomCollector, exteriorCollector, mats, offset = [0, 0] } = ctx;
  const { colour = WHITE, thick = 0.035, maxAngle = 1.62, leafOpts = {}, registerFrame = true, staticLeaf = false } = opts;
  const along = door.axis === 'x' ? [0, 0, 1] : [1, 0, 0]; // plan: axis 'z' = wall at z = at running along x (EW line); 'x' = NS line running along z
  const sgn = door.hinge === 'from' ? 1 : -1;
  const d = [along[0] * sgn, 0, along[2] * sgn];
  const s = door.swingDir;
  const yaw = Math.atan2(-d[2], d[0]);
  const localZ = [Math.sin(yaw), 0, Math.cos(yaw)];
  const openSign = (localZ[0] * s[0] + localZ[2] * s[2]) > 0 ? -1 : 1;
  const w = door.w - 0.04, h = door.h - 0.02;
  const pivot = new THREE.Group(); pivot.name = `door:${door.id}`;
  pivot.position.set(door.hingePos[0] + offset[0], door.sill ?? 0, door.hingePos[2] + offset[1]);
  pivot.rotation.y = yaw;
  const leaf = doorLeafGeom(w, h, thick, colour, leafOpts);
  place(leaf, 0.02, 0.01, 0);
  const leafMesh = new THREE.Mesh(leaf, mats.get(door.steel ? 'gloss' : 'paint'));
  leafMesh.name = `${door.id}:leaf`; leafMesh.castShadow = true; leafMesh.receiveShadow = true;
  pivot.add(leafMesh);
  pivot.userData = { doorId: door.id, kind: door.exterior ? 'exterior' : 'interior', baseYaw: yaw, openSign, maxAngle, hingeSide: door.hingeSide, swingInto: door.swingInto, leaf: leafMesh, w: door.w, h: door.h, t: door.t,
    setOpen(open) { pivot.rotation.y = yaw + openSign * Math.max(0, Math.min(1, open)) * maxAngle; } };
  // the frame: jambs + head + stops, casings both faces (painted trim) — static, into the rooms' collectors
  if (registerFrame) {
    const trim = rgb(TRIM), stop = mulRgb(trim, 0.95);
    const t = door.t;
    const [a, b] = door.between;
    const roomA = rooms[a] ? a : null, roomB = rooms[b] ? b : null;
    const collA = roomA ? roomCollector(roomA) : exteriorCollector, collB = roomB ? roomCollector(roomB) : exteriorCollector;
    const y1 = (door.sill ?? 0) + door.h;
    const ox = offset[0], oz = offset[1];
    const jamb = (u, sign) => door.axis === 'x' ? boxAt(door.at - t / 2 + ox, door.sill ?? 0, u + oz, door.at + t / 2 + ox, y1, u + sign * 0.02 + oz, { color: trim }) : boxAt(u + ox, door.sill ?? 0, door.at - t / 2 + oz, u + sign * 0.02 + ox, y1, door.at + t / 2 + oz, { color: trim });
    collA.add('paint', jamb(door.from, 1)); collA.add('paint', jamb(door.to, -1));
    collA.add('paint', door.axis === 'x' ? boxAt(door.at - t / 2 + ox, y1 - 0.02, door.from + oz, door.at + t / 2 + ox, y1, door.to + oz, { color: trim }) : boxAt(door.from + ox, y1 - 0.02, door.at - t / 2 + oz, door.to + ox, y1, door.at + t / 2 + oz, { color: trim }));
    // door stop on the swing side's opposite face centre-line
    const stopD = door.axis === 'x' ? boxAt(door.at - 0.01 + ox, door.sill ?? 0, door.from + 0.02 + oz, door.at + 0.01 + ox, y1 - 0.02, door.from + 0.035 + oz, { color: stop }) : null;
    if (stopD) collA.add('paint', stopD);
    // casings on both faces
    for (const [coll, side] of [[collA, -1], [collB, 1]]) {
      const face = door.at + side * (t / 2);
      const proud = side * 0.016;
      const cw = 0.06;
      if (door.axis === 'x') {
        coll.add('paint', boxAt(Math.min(face, face + proud) + ox, door.sill ?? 0, door.from - cw + oz, Math.max(face, face + proud) + ox, y1 + cw, door.from + oz, { color: trim }));
        coll.add('paint', boxAt(Math.min(face, face + proud) + ox, door.sill ?? 0, door.to + oz, Math.max(face, face + proud) + ox, y1 + cw, door.to + cw + oz, { color: trim }));
        coll.add('paint', boxAt(Math.min(face, face + proud) + ox, y1, door.from - cw + oz, Math.max(face, face + proud) + ox, y1 + cw, door.to + cw + oz, { color: trim }));
      } else {
        coll.add('paint', boxAt(door.from - cw + ox, door.sill ?? 0, Math.min(face, face + proud) + oz, door.from + ox, y1 + cw, Math.max(face, face + proud) + oz, { color: trim }));
        coll.add('paint', boxAt(door.to + ox, door.sill ?? 0, Math.min(face, face + proud) + oz, door.to + cw + ox, y1 + cw, Math.max(face, face + proud) + oz, { color: trim }));
        coll.add('paint', boxAt(door.from - cw + ox, y1, Math.min(face, face + proud) + oz, door.to + cw + ox, y1 + cw, Math.max(face, face + proud) + oz, { color: trim }));
      }
    }
  }
  if (staticLeaf) { pivot.matrixAutoUpdate = false; pivot.updateMatrix(); }
  return pivot;
}

/** The front entry: door + sidelight unit, threshold, coach lights, number plaque, doorbell. */
function buildFrontDoor(op, door, ctx) {
  const { exteriorCollector, frameCollector, glowMeshes, mats, offset = [0, 0], houseNumber = '4212', ring = false } = ctx;
  const M = makeMapper(op, offset);
  const trim = rgb(TRIM), alu = rgb(ALU);
  const side = openings[op.unitWith] || openings.sidelight_foyer_E;
  const u0 = op.from, u1 = side.to, h = op.head, t = op.plane.t;
  // unit frame (paint) inside the reveal: jambs/head 0.04 thick at depth −0.11..−0.25 (the door hangs near the interior face)
  frameCollector.add('paint', M.box(u0, u0 + 0.04, -t, -0.09, 0, h, { color: trim }));
  frameCollector.add('paint', M.box(u1 - 0.04, u1, -t, -0.09, 0, h, { color: trim }));
  frameCollector.add('paint', M.box(u0, u1, -t, -0.09, h - 0.04, h, { color: trim }));
  frameCollector.add('paint', M.box(op.to - 0.02, op.to + 0.02, -t, -0.09, 0, h, { color: trim })); // the mullion between door and sidelight
  // threshold
  frameCollector.add('alu', M.box(u0, side.to, -t, -0.02, -0.005, 0.03, { color: alu }));
  // sidelight: a fixed narrow pane with a low panel
  frameCollector.add('paint', M.box(side.from + 0.02, side.to - 0.04, -0.18, -0.12, 0, 0.5, { color: trim }));
  const pane = M.pane(side.from + 0.02, side.to - 0.04, -0.15, 0.5, h - 0.04, 1, { nx: 1, ny: 6 });
  const glass = glassMesh([pane], mats, side, {});
  // the door leaf (inswing, deep blue fibreglass, deadbolt, wreath)
  const pivot = buildHingedDoor({ ...door, sill: 0 }, ctx, { colour: [0.19, 0.27, 0.38], thick: 0.045, maxAngle: 1.55, leafOpts: { deadbolt: true, wreath: true }, registerFrame: false });
  // shift the leaf into the frame depth: local z is the swing side (inside) → the leaf sits 0.14 in from the exterior face
  pivot.userData.leaf.position.z += 0;
  // exterior dressing: coach lights (housing + glow lens), number plaque, doorbell
  const coachIds = ['fix_coach_1', 'fix_coach_2'];
  for (const fid of coachIds) {
    const f = fixtures[fid]; if (!f) continue;
    const p = f.pos;
    const black = rgb([0.08, 0.08, 0.09]);
    const housing = merge([
      place(box(0.16, 0.34, 0.16, { color: black }), 0, 0, 0),
      place(box(0.2, 0.03, 0.2, { color: black }), 0, 0.185, 0),
      place(box(0.03, 0.1, 0.16, { color: black }), -0.09, 0, 0),
    ]);
    place(housing, p[0] + offset[0] + op.normal[0] * 0.1, p[1], p[2] + offset[1] + op.normal[2] * 0.1, M.yaw);
    exteriorCollector.add('matte', housing);
    const lens = box(0.11, 0.24, 0.11, { color: [1, 1, 1] });
    const lm = new THREE.Mesh(lens, mats.variant('glow', fid, {}));
    lm.position.set(p[0] + offset[0] + op.normal[0] * 0.1, p[1], p[2] + offset[1] + op.normal[2] * 0.1);
    lm.name = `glow:${fid}`; lm.userData = { fixtureId: fid };
    glowMeshes[fid] = lm;
  }
  const plaque = plane(0.3, 0.15, 1, 1, { color: [1, 1, 1] });
  const pp = M.point(op.from - 0.32, 0.012, 2.35);
  place(plaque, pp[0], pp[1], pp[2], M.yaw);
  const plaqueMesh = new THREE.Mesh(plaque, mats.get('houseNumber')); plaqueMesh.name = 'houseNumber';
  const bell = box(0.04, 0.1, 0.02, { color: ring ? rgb([0.1, 0.1, 0.12]) : rgb([0.85, 0.85, 0.8]) });
  const bp = M.point(side.to + 0.12, 0.012, 1.2);
  place(bell, bp[0], bp[1], bp[2], M.yaw);
  exteriorCollector.add('matte', bell);
  const frame = new THREE.Group(); frame.name = `frame:${op.id}`;
  const c = M.point((op.from + op.to) / 2, -0.14, h / 2); frame.position.set(c[0], c[1], c[2]); frame.rotation.y = M.yaw;
  frame.userData = { openingId: op.id, w: op.w, h: op.h, normal: op.normal, room: op.room, door: true, sidelight: side.id };
  const tracks = [new THREE.Vector3(...M.point(op.from, -0.12, 0)), new THREE.Vector3(...M.point(op.to, -0.12, 0)), new THREE.Vector3(...M.point((op.from + op.to) / 2, -0.12, 0))];
  return { frame, glass, door: pivot, tracks, extra: [plaqueMesh] };
}

/** The sectional roll-up garage door with tracks, torsion shaft, opener rail/motor and the release cord. */
function buildGarageDoor(op, ctx) {
  const { roomCollector, frameCollector, mats, offset = [0, 0] } = ctx;
  const M = makeMapper(op, offset);
  const galv = rgb([0.7, 0.72, 0.74]), white = rgb(WHITE);
  const w = op.w, h = op.h, u0 = op.from, u1 = op.to;
  const gc = roomCollector('garage');
  // jambs and header trim (painted wood)
  frameCollector.add('paint', M.box(u0 - 0.06, u0, -0.08, 0.0, 0, h + 0.06, { color: white }));
  frameCollector.add('paint', M.box(u1, u1 + 0.06, -0.08, 0.0, 0, h + 0.06, { color: white }));
  frameCollector.add('paint', M.box(u0 - 0.06, u1 + 0.06, -0.08, 0.0, h, h + 0.06, { color: white }));
  // vertical tracks inside the garage on both jambs, horizontal tracks along the ceiling
  for (const u of [u0 - 0.05, u1 + 0.05]) {
    gc.add('alu', M.box(u - 0.02, u + 0.02, -0.14, -0.08, 0.1, h + 0.05, { color: galv }));
    gc.add('alu', M.box(u - 0.02, u + 0.02, -0.5, -0.5 - 3.6, h + 0.25, h + 0.31, { color: galv }));
  }
  // torsion spring shaft above the header
  const shaft = cyl(0.014, 0.014, w + 0.2, 8, { color: galv }); const sp = M.point((u0 + u1) / 2, -0.2, h + 0.36); place(shaft, sp[0], sp[1], sp[2], 0, 0, H); gc.add('alu', shaft);
  const spring = cyl(0.045, 0.045, 0.8, 10, { color: rgb([0.35, 0.35, 0.38]) }); const spp = M.point(u0 + 1.2, -0.2, h + 0.36); place(spring, spp[0], spp[1], spp[2], 0, 0, H); gc.add('alu', spring);
  // opener rail + motor with its light lens, hanging from the ceiling at the door's centre
  const railP0 = M.point((u0 + u1) / 2, -0.3, h + 0.5), railP1 = M.point((u0 + u1) / 2, -3.9, h + 0.5);
  const rail = box(0.06, 0.05, 3.6, { color: galv }); place(rail, (railP0[0] + railP1[0]) / 2, railP0[1], (railP0[2] + railP1[2]) / 2, M.yaw); gc.add('alu', rail);
  const motorP = M.point((u0 + u1) / 2, -4.1, h + 0.45);
  const motor = box(0.36, 0.2, 0.42, { color: rgb([0.16, 0.16, 0.18]) }); place(motor, motorP[0], motorP[1], motorP[2], M.yaw); gc.add('matte', motor);
  const lensG = box(0.1, 0.06, 0.1, { color: [1, 1, 1] }); const lensM = new THREE.Mesh(lensG, mats.get('glow')); lensM.position.set(motorP[0], motorP[1] - 0.12, motorP[2]); lensM.name = 'glow:garageOpener';
  for (const zz of [-0.5, -3.6]) { const hanger = box(0.03, DIM.ceiling - (h + 0.5) - 0.02, 0.03, { color: galv }); const hp = M.point((u0 + u1) / 2, zz, (DIM.ceiling + h + 0.5) / 2); place(hanger, hp[0], hp[1], hp[2]); gc.add('alu', hanger); }
  const cordP = M.point((u0 + u1) / 2 + 0.05, -0.7, h + 0.5);
  const cord = cyl(0.003, 0.003, 0.9, 5, { color: rgb([0.8, 0.1, 0.1]) }); place(cord, cordP[0], cordP[1] - 0.45, cordP[2]); gc.add('matte', cord);
  const knob = box(0.05, 0.08, 0.03, { color: rgb([0.8, 0.1, 0.1]) }); place(knob, cordP[0], cordP[1] - 0.92, cordP[2]); gc.add('matte', knob);
  // the wall button by the man door
  gc.add('matte', boxAt(12.2 + offset[0], 1.28, 0.26 + offset[1], 12.3 + offset[0], 1.36, 0.28 + offset[1], { color: rgb([0.9, 0.9, 0.9]) }));
  // the door itself: one 24×12 plane for the closed/pumping state and four sections for the opening animation
  const pivot = new THREE.Group(); pivot.name = `door:${op.id}`;
  const c = M.point((u0 + u1) / 2, -0.06, 0); pivot.position.set(c[0], c[1], c[2]); pivot.rotation.y = M.yaw;
  const doorMat = mats.variant('garageDoor', 'house', { side: THREE.DoubleSide });
  const full = plane(w, h, 24, 12, { color: [1, 1, 1] }); full.translate(0, h / 2, 0);
  const fullMesh = new THREE.Mesh(full, doorMat); fullMesh.name = 'garageDoor'; fullMesh.castShadow = true; fullMesh.receiveShadow = true;
  fullMesh.userData = { openingId: op.id, kind: 'garageDoor', w, h };
  pivot.add(fullMesh);
  const sections = [];
  const sh = h / 4;
  for (let i = 0; i < 4; i++) {
    const g = plane(w, sh, 8, 2, { color: [1, 1, 1] }); g.translate(0, -sh / 2, 0);
    const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) + (i + 1) * sh - sh);
    const m = new THREE.Mesh(g, doorMat); m.name = `garageDoor:section${i}`; m.visible = false; m.castShadow = true;
    m.position.set(0, (i + 1) * sh, 0);
    pivot.add(m); sections.push(m);
  }
  const travel = h + 2.2;
  pivot.userData = { doorId: op.id, kind: 'garage', sections, full: fullMesh, baseYaw: M.yaw, openSign: 0, maxAngle: 0, h, w,
    setOpen(open) {
      open = Math.max(0, Math.min(1, open));
      const closed = open <= 0.0005;
      fullMesh.visible = closed;
      for (let i = 0; i < 4; i++) {
        const m = sections[i]; m.visible = !closed;
        const s = open * travel + i * sh;              // the section's top edge along the track
        const yTop = Math.min(s + sh, h + 0.02);
        const into = Math.max(0, s + sh - (h + 0.02));
        const phi = Math.min(1, into / 0.45) * H;
        m.position.set(0, yTop, -into);
        m.rotation.set(phi, 0, 0);
      }
    } };
  // the door's frame group for the registry
  const frame = new THREE.Group(); frame.name = `frame:${op.id}`; frame.position.copy(pivot.position); frame.rotation.y = M.yaw;
  frame.userData = { openingId: op.id, w, h, normal: op.normal, room: 'garage', garage: true };
  return { frame, glass: null, door: pivot, garageDoorMesh: fullMesh, extra: [lensM], tracks: [new THREE.Vector3(...M.point(u0, -0.06, 0)), new THREE.Vector3(...M.point(u1, -0.06, 0)), new THREE.Vector3(...c)] };
}

/** The pool-cage screen door at the NW corner (DESIGN §3.4): alu frame, screen, kick panel, closer. */
function buildCageDoor(op, door, ctx) {
  const { mats } = ctx;
  const pivot = new THREE.Group(); pivot.name = `door:${op.id}`;
  pivot.position.set(door.hingePos[0], door.hingePos[1], door.hingePos[2]);
  const yaw = -H; // local +x → world +z (the door runs south from its hinge at z = 6.55)
  pivot.rotation.y = yaw;
  const alu = rgb([0.86, 0.87, 0.86]);
  const w = op.w, h = op.h;
  const frame = merge([
    place(box(0.04, h, 0.04, { color: alu }), 0.02, h / 2, 0), place(box(0.04, h, 0.04, { color: alu }), w - 0.02, h / 2, 0),
    place(box(w, 0.04, 0.04, { color: alu }), w / 2, h - 0.02, 0), place(box(w, 0.04, 0.04, { color: alu }), w / 2, 0.02, 0),
    place(box(w, 0.04, 0.04, { color: alu }), w / 2, 0.45, 0), place(box(w - 0.08, 0.41, 0.012, { color: alu }), w / 2, 0.245, 0),
    place(box(0.03, 0.14, 0.02, { color: rgb(BRONZE) }), w - 0.08, 1.0, 0.03),
  ]);
  const fm = new THREE.Mesh(frame, mats.get('alu')); fm.name = `${op.id}:frame`; fm.castShadow = true;
  const scr = quadZ(0, 0.04, 0.47, w - 0.04, h - 0.04, +1, { nx: 3, ny: 4, flex: 0.2 });
  const sm = new THREE.Mesh(scr, mats.get('screen')); sm.name = `${op.id}:screen`;
  pivot.add(fm, sm);
  const openSign = -1;
  pivot.userData = { doorId: op.id, kind: 'screen', baseYaw: yaw, openSign, maxAngle: 1.7, leaf: fm, setOpen(open) { pivot.rotation.y = yaw + openSign * Math.max(0, Math.min(1, open)) * 1.7; } };
  const frameG = new THREE.Group(); frameG.name = `frame:${op.id}`; frameG.position.set(op.centre[0], op.centre[1], op.centre[2]); frameG.rotation.y = Math.atan2(op.normal[0], op.normal[2]);
  frameG.userData = { openingId: op.id, w, h, normal: op.normal, room: 'cage', screenDoor: true };
  return { frame: frameG, glass: null, door: pivot, tracks: [new THREE.Vector3(op.centre[0], CAGE.y, op.from), new THREE.Vector3(op.centre[0], CAGE.y, op.to), new THREE.Vector3(op.centre[0], CAGE.y, op.centre[2])] };
}

/**
 * Build every opening and door of the main house.
 * @returns {{openings:Object, doors:Object, garageDoorMesh:THREE.Mesh, sliders:Object, glowMeshes:Object, extra:THREE.Object3D[], screensMesh:THREE.Mesh, frameMeshes:THREE.Mesh[]}}
 */
export function buildOpenings(ctx) {
  const { mats } = ctx;
  const frameCollector = new Collector(), screenCollector = new Collector();
  const glowMeshes = {};
  const c2 = { ...ctx, frameCollector, screenCollector, glowMeshes };
  const out = { openings: {}, doors: {}, sliders: {}, glowMeshes, extra: [], garageDoorMesh: null };
  for (const id of Object.keys(openings)) {
    const op = openings[id];
    let res = null;
    if (op.unit) continue; // the sidelight is built with its door
    if (op.kind === 'garage') res = buildGarageDoor(op, c2);
    else if (op.kind === 'slider') res = buildSlider(op, doors[id], c2);
    else if (op.kind === 'screen') res = buildCageDoor(op, doors[id], c2);
    else if (op.kind === 'door' && id === 'door_front') res = buildFrontDoor(op, doors[id], c2);
    else if (op.kind === 'door') { const pivot = buildHingedDoor({ ...doors[id], sill: 0 }, c2, { colour: [0.92, 0.92, 0.9], thick: 0.045, leafOpts: { deadbolt: true }, maxAngle: 1.6 }); res = { frame: null, glass: null, door: pivot, tracks: [] }; }
    else if (op.bay) res = buildBay(op, c2);
    else res = buildWindow(op, c2);
    if (!res) continue;
    out.openings[id] = { id, frame: res.frame, glass: res.glass, shutter: null, door: res.door || null, tracks: res.tracks || [], facetSlots: res.facetSlots || null };
    if (id === 'door_front') out.openings.sidelight_foyer_E = { id: 'sidelight_foyer_E', frame: res.frame, glass: res.glass, shutter: null, door: null, tracks: res.tracks, unit: 'door_front' };
    if (res.door) out.doors[id] = res.door;
    if (res.garageDoorMesh) out.garageDoorMesh = res.garageDoorMesh;
    if (op.kind === 'slider') out.sliders[id] = out.openings[id];
    if (res.extra) out.extra.push(...res.extra);
  }
  // interior doors
  for (const [id, d] of Object.entries(doors)) {
    if (d.exterior || d.slider || d.kind === 'screen') continue;
    const pivot = buildHingedDoor(d, c2, { colour: [0.95, 0.95, 0.93], leafOpts: { louvred: !!d.louvred, bifold: !!d.bifold, lever: !d.bifold }, maxAngle: d.id === 'door_masterCloset' ? 1.5 : 1.62 });
    out.doors[id] = pivot;
  }
  // cased-opening casings (painted trim on both faces)
  const trim = rgb(TRIM);
  for (const c of casedOpenings) {
    const t = 0.115, cw = 0.07, y1 = c.head;
    for (const side of [-1, 1]) {
      const face = c.at + side * t / 2, proud = side * 0.016;
      const lo = Math.min(face, face + proud), hi = Math.max(face, face + proud);
      const room = ctx.roomAt(c.axis === 'x' ? face + side * 0.2 : (c.from + c.to) / 2, c.axis === 'x' ? (c.from + c.to) / 2 : face + side * 0.2);
      const coll = ctx.roomCollector(rooms[room] ? room : 'dining');
      if (c.axis === 'x') { coll.add('paint', boxAt(lo, 0, c.from - cw, hi, y1 + cw, c.from, { color: trim })); coll.add('paint', boxAt(lo, 0, c.to, hi, y1 + cw, c.to + cw, { color: trim })); coll.add('paint', boxAt(lo, y1, c.from - cw, hi, y1 + cw, c.to + cw, { color: trim })); }
      else { coll.add('paint', boxAt(c.from - cw, 0, lo, c.from, y1 + cw, hi, { color: trim })); coll.add('paint', boxAt(c.to, 0, lo, c.to + cw, y1 + cw, hi, { color: trim })); coll.add('paint', boxAt(c.from - cw, y1, lo, c.to + cw, y1 + cw, hi, { color: trim })); }
    }
  }
  out.frameMeshes = frameCollector.build((n) => mats.get(n), 'openings', { all: { castShadow: true } });
  const screens = screenCollector.build((n) => mats.get(n), 'windowScreens', { all: { castShadow: false } });
  out.screensMesh = screens[0] || null;
  return out;
}

/** The Nguyens' shell: static closed door leaves in its interior door holes + their front door pivot. */
export function buildNguyenDoors(ctx, offset) {
  const out = [];
  const c2 = { ...ctx, offset };
  for (const id of ['door_laundry_kitchen', 'door_pantry', 'door_bed2']) {
    const pivot = buildHingedDoor(doors[id], c2, { colour: [0.95, 0.95, 0.93], registerFrame: true, staticLeaf: true });
    out.push(pivot);
  }
  const front = buildHingedDoor({ ...doors.door_front, sill: 0 }, c2, { colour: [0.55, 0.16, 0.14], thick: 0.045, maxAngle: 1.5, leafOpts: { deadbolt: true }, registerFrame: false });
  front.name = 'door:nguyenDoor';
  front.userData.doorId = 'nguyenDoor';
  return { statics: out, frontDoor: front };
}

export { buildHingedDoor, makeMapper };
