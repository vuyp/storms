/**
 * world/neighbourhood.js — every other house on Sandpiper Cove (DESIGN §4; T §6 "≈ 25 props per neighbour"):
 * the same plan stamped per lot through `plan.lotTransform` (exterior shell only, merged across lots per
 * material), the Nguyens' walkable front rooms, the feeder poles + wires + transformer cans, the four
 * streetlights, mailboxes, the HOA sign, storm inlets, the pad-mount box and the far LOD skirt of block houses.
 * Owner: E4 world+textures. Writes no state.
 */
import * as THREE from 'three';
import { Collector, merge, boxAt, box, cyl, place, rgb, mulRgb, quad, quadX, quadZ, quadY, box3, staticMesh, withAttr, ensureAttrs } from './build/geo.js';
import { buildWalls, buildStuccoTrim } from './build/walls.js';
import { buildFloors } from './build/floors.js';
import { hipRoof } from './build/roof.js';
import { buildNguyenDoors } from './build/openings.js';
import { createBaker } from './build/bake.js';
import { InstanceProxy, applyPose } from './build/props.js';
import * as furniture from './props/furniture.js';
import * as kitchenF from './props/kitchen.js';
import * as exteriorF from './props/exterior.js';
import { pointInPolygon } from './roomOf.js';
import { lines, rooms, openings, roofs, lots, lotTransform, SLAB, DIM, CAGE, PORCH, SWALE, METER, PAD_MOUNT, MAILBOX, feederPoles, transformers, streetlights as STREETLIGHT_DEFS, siteHeightAt } from './plan.js';
import { INTERIOR_ROOM_IDS } from '../core/ids.js';

const H = Math.PI / 2, PI = Math.PI;
const STUCCO = [[0.85, 0.80, 0.70], [0.84, 0.86, 0.80], [0.93, 0.86, 0.72]];
const BAND = [0.94, 0.92, 0.88];
const DOOR_COL = [[0.55, 0.16, 0.14], [0.16, 0.2, 0.3], [0.2, 0.25, 0.2], [0.92, 0.92, 0.9]];
const TRIM = [0.95, 0.95, 0.93], ALU = [0.9, 0.9, 0.88], BRONZE = [0.22, 0.18, 0.15];
const NG_ROOMS = new Set(['nook', 'kitchen', 'great', 'dining', 'foyer', 'frontHall']);
const NG_OFF = [0, -26];
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _x = new THREE.Vector3(1, 0, 0);
const jit = (S, a) => (S.nextFloat() - 0.5) * 2 * a;

/** The plan's room at an untranslated plan point (no snapping). */
export function rawPlanRoom(x, z) {
  for (const id of INTERIOR_ROOM_IDS) if (pointInPolygon(x, z, rooms[id].polygon)) return id;
  if (pointInPolygon(x, z, rooms.lanai.polygon)) return 'lanai';
  if (pointInPolygon(x, z, rooms.cage.polygon)) return 'cage';
  return 'outside';
}

/** The lot's plan→world matrix (rotation/mirror + translation) and whether it flips winding. */
function lotMatrix(lot) {
  const T = lotTransform(lot);
  const o = T.toWorld(0, 0), ex = T.dir(1, 0), ez = T.dir(0, 1);
  const m = new THREE.Matrix4().set(ex[0], 0, ez[0], o[0], 0, 1, 0, 0, ex[1], 0, ez[1], o[1], 0, 0, 0, 1);
  return { m, mirrored: T.mirrored, T };
}
function xformGeom(g, lm) {
  g.applyMatrix4(lm.m);
  if (lm.mirrored && g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.index.needsUpdate = true; }
  else if (lm.mirrored) { const p = g.attributes.position; const n = p.count; const idx = []; for (let i = 0; i < n; i += 3) idx.push(i, i + 2, i + 1); g.setIndex(idx); }
  return g;
}
/** Move every geometry of a local collector into `dest`, transformed by the lot matrix. */
function flush(lc, lm, dest) { for (const [mat, geoms] of lc.map) for (const g of geoms) dest.add(mat, xformGeom(g, lm)); lc.map.clear(); }
function rectWorld(T, x0, z0, x1, z1) { const a = T.toWorld(x0, z0), b = T.toWorld(x1, z1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }
/** Flip a closed geometry inside-out (for the dark inner box seen through neighbours' windows). */
function flipInside(g) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); return g; }
/** A beam box from a to b (any direction), square section s. */
function beamBetween(a, b, s, color) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = d.length(); d.normalize();
  const g = box(L, s, s, { color });
  _q.setFromUnitVectors(_x, d); _m.makeRotationFromQuaternion(_q); _m.setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  g.applyMatrix4(_m);
  return g;
}
/** userData for a provided prop group (mirrors build/props.js finishGroup). */
function dress(grp, id, spec, parts = null, extra = {}) {
  const p0 = spec.pos || [grp.position.x, grp.position.y, grp.position.z];
  const poses = { home: { p: [...p0], r: [0, spec.rotY || 0, 0] } };
  if (spec.poses) for (const [k, v] of Object.entries(spec.poses)) poses[k] = { ...v, p: v.p ? [...v.p] : undefined, r: v.r ? [...v.r] : undefined };
  grp.userData = { ...grp.userData, objectId: id, kind: spec.factory, room: spec.room, poses, pose: 'home', parts: parts || undefined, ...extra };
  grp.userData.setPose = (name) => applyPose(grp, name);
  const first = spec.poses ? Object.values(spec.poses)[0] : null;
  if (first && first.v === false) grp.visible = false;
  if (first && first.parts && parts) for (const [k, v] of Object.entries(first.parts)) if (parts[k]) parts[k].visible = v;
  return grp;
}

// ---- openings in local plan coordinates ------------------------------------------------------------------------
function mapper(op) {
  const n = op.normal, ax = op.plane.axis, f = op.plane.exteriorFace;
  const P = (u, d, y) => ax === 'z' ? [u, y, f + n[2] * d] : [f + n[0] * d, y, u];
  const B = (u0, u1, d0, d1, y0, y1, color) => { const a = P(u0, d0, y0), b = P(u1, d1, y1); return boxAt(a[0], a[1], a[2], b[0], b[1], b[2], { color }); };
  const Q = (u0, u1, d, y0, y1, opts = {}) => { const c = ax === 'z' ? f + n[2] * d : f + n[0] * d; return ax === 'z' ? quadZ(c, u0, y0, u1, y1, n[2] > 0 ? 1 : -1, opts) : quadX(c, u0, y0, u1, y1, n[0] > 0 ? 1 : -1, opts); };
  return { P, B, Q, n, ax };
}
function staticWindow(op, lc, glass, { obscure = false } = {}) {
  const M = mapper(op);
  const alu = rgb(ALU), band = rgb(BAND);
  const u0 = op.from, u1 = op.to, y0 = op.sill, y1 = op.head, fw = 0.05;
  lc.add('alu', M.B(u0, u0 + fw, -0.12, -0.03, y0, y1, alu)); lc.add('alu', M.B(u1 - fw, u1, -0.12, -0.03, y0, y1, alu));
  lc.add('alu', M.B(u0, u1, -0.12, -0.03, y1 - fw, y1, alu)); lc.add('alu', M.B(u0, u1, -0.12, -0.03, y0, y0 + fw, alu));
  if (op.kind === 'slider') { const um = (u0 + u1) / 2; lc.add('alu', M.B(um - 0.03, um + 0.03, -0.12, -0.03, y0, y1, alu)); lc.add('alu', M.B(u0, u1, -0.12, -0.03, y0, y0 + 0.02, alu)); }
  else if (op.h > 0.8) {
    const ym = (y0 + y1) / 2;
    lc.add('alu', M.B(u0, u1, -0.1, -0.05, ym - 0.03, ym + 0.03, alu));
    const um = (u0 + u1) / 2, yq = (ym + y1) / 2;
    lc.add('alu', M.B(um - 0.01, um + 0.01, -0.075, -0.06, ym + 0.03, y1 - fw, alu));
    lc.add('alu', M.B(u0 + fw, u1 - fw, -0.075, -0.06, yq - 0.01, yq + 0.01, alu));
  }
  if (y0 > 0.05) lc.add('stucco', M.B(u0 - 0.06, u1 + 0.06, -0.02, 0.07, y0 - 0.05, y0 + 0.01, band));
  glass.push(M.Q(u0 + fw, u1 - fw, -0.07, y0 + fw, y1 - fw, { color: obscure ? [0.85, 0.9, 0.88] : [1, 1, 1] }));
}
function staticBay(op, lc, glass) {
  const M = mapper(op), band = rgb(BAND), trim = rgb(TRIM), stucco = rgb([0.9, 0.86, 0.76]);
  const u0 = op.from, u1 = op.to, y0 = op.sill, y1 = op.head, pr = op.projection || 0.45;
  lc.add('stucco', M.B(u0 - 0.1, u1 + 0.1, 0, pr, y0 - 0.45, y0, stucco));            // the skirt
  lc.add('stucco', M.B(u0 - 0.15, u1 + 0.15, 0, pr + 0.1, y1, y1 + 0.18, band));     // the cap
  lc.add('paint', M.B(u0 - 0.05, u0, 0, pr, y0, y1, trim)); lc.add('paint', M.B(u1, u1 + 0.05, 0, pr, y0, y1, trim));
  lc.add('paint', M.B(u0, u1, pr - 0.05, pr, y0, y1, trim));
  lc.add('alu', M.B(u0 + 0.35, u0 + 0.4, pr - 0.05, pr + 0.01, y0, y1, rgb(ALU))); lc.add('alu', M.B(u1 - 0.4, u1 - 0.35, pr - 0.05, pr + 0.01, y0, y1, rgb(ALU)));
  glass.push(M.Q(u0 + 0.04, u1 - 0.04, pr - 0.03, y0 + 0.04, y1 - 0.04, {}));
}
function staticDoor(op, lc, glass, colour, { coach = true, sidelight = null, leaf = true, lit = false } = {}) {
  const M = mapper(op), trim = rgb(TRIM), lens = [];
  const u0 = op.from, u1 = sidelight ? sidelight.to : op.to, y1 = op.head;
  lc.add('paint', M.B(u0, u0 + 0.04, -0.25, -0.09, 0, y1, trim)); lc.add('paint', M.B(u1 - 0.04, u1, -0.25, -0.09, 0, y1, trim)); lc.add('paint', M.B(u0, u1, -0.25, -0.09, y1 - 0.04, y1, trim));
  lc.add('alu', M.B(u0, u1, -0.25, -0.02, -0.005, 0.03, rgb(ALU)));
  if (leaf) {
    const c = rgb(colour);
    lc.add('paint', M.B(op.from + 0.04, op.to - 0.02, -0.16, -0.12, 0.01, y1 - 0.04, c));
    const pw = (op.to - op.from - 0.04) / 2 - 0.12;
    for (const [ya, yb] of [[0.2, 0.75], [0.9, 1.35], [1.5, y1 - 0.2]]) for (const ua of [op.from + 0.12, op.to - 0.12 - pw]) lc.add('paint', M.B(ua, ua + pw, -0.115, -0.105, ya, yb, mulRgb(c, 0.86)));
    lc.add('chrome', M.B(op.to - 0.14, op.to - 0.06, -0.11, -0.095, 1.0, 1.02, rgb([0.85, 0.86, 0.88])));
  }
  if (sidelight) {
    lc.add('paint', M.B(op.to - 0.02, op.to + 0.02, -0.25, -0.09, 0, y1, trim));
    lc.add('paint', M.B(sidelight.from, sidelight.to, -0.18, -0.12, 0, 0.5, trim));
    glass.push(M.Q(sidelight.from + 0.03, sidelight.to - 0.03, -0.14, 0.5, y1 - 0.06, {}));
  }
  if (coach) for (const u of [u0 - 0.3, u1 + 0.3]) {
    lc.add('matte', M.B(u - 0.08, u + 0.08, 0.0, 0.12, 1.85, 2.1, rgb(BRONZE))); lc.add('matte', M.B(u - 0.1, u + 0.1, 0.0, 0.14, 2.1, 2.14, rgb(BRONZE)));
    if (!lit) lc.add('matte', M.B(u - 0.06, u + 0.06, 0.02, 0.1, 1.88, 2.07, rgb([0.9, 0.85, 0.7])));
    lens.push({ u, y: 1.97, d: 0.125 });
  }
  return { lens, M };
}
function staticGarageDoor(op, lc) {
  const M = mapper(op), trim = rgb(TRIM);
  lc.add('garageDoor', M.Q(op.from, op.to, -0.1, op.sill, op.head, { color: [1, 1, 1] }));
  lc.add('paint', M.B(op.from - 0.06, op.from, -0.02, 0.02, 0, op.head + 0.06, trim)); lc.add('paint', M.B(op.to, op.to + 0.06, -0.02, 0.02, 0, op.head + 0.06, trim)); lc.add('paint', M.B(op.from - 0.06, op.to + 0.06, -0.02, 0.02, op.head, op.head + 0.06, trim));
}
/** Corrugated shutter panels over an opening (a lot with its shutters up), depth 0.07 proud of the stucco. */
function staticShutter(op, coll) {
  const M = mapper(op);
  const alu = rgb([0.92, 0.92, 0.9]);
  const u0 = op.from - 0.1, u1 = op.to + 0.1, y0 = op.sill - 0.13, y1 = op.head + 0.13, pr = (op.bay ? (op.projection || 0.45) : 0);
  const g = M.Q(u0, u1, pr + 0.07, y0, y1, { color: [1, 1, 1] });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i));
  coll.add('corrugated', g);
  coll.add('alu', M.B(u0 - 0.05, u1 + 0.05, pr + 0.03, pr + 0.065, y0 - 0.02, y0 + 0.03, alu)); coll.add('alu', M.B(u0 - 0.05, u1 + 0.05, pr + 0.03, pr + 0.065, y1 - 0.03, y1 + 0.03, alu));
}

// ---- the lanai + screened cage (local coordinates) --------------------------------------------------------------
function lanaiDeck(lc) {
  const band = rgb(BAND);
  lc.add('pavers', quadY(CAGE.y, CAGE.x0, CAGE.z0, CAGE.x1, CAGE.z1, +1, { nx: 6, ny: 8, color: [1, 1, 1] }));
  for (const z of [6.6, 12.0, 17.4]) lc.add('stucco', boxAt(-3.15, -0.15, z - 0.12, -2.85, DIM.eaveY - 0.2, z + 0.12, { color: band }));
  lc.add('stucco', boxAt(-3.2, DIM.eaveY - 0.5, 6.4, -2.8, DIM.eaveY - 0.2, 17.6, { color: band }));
}
/**
 * The cage frame + screens. mode: 'intact' | 'torn' | 'collapsed'.
 * @param {Collector} coll beams ('alu') and screens ('screen')
 */
function cageFrame(coll, mode, S) {
  const alu = rgb([0.86, 0.87, 0.85]);
  const x0 = CAGE.x0, x1 = -3.6, z0 = CAGE.z0, z1 = CAGE.z1, y0 = CAGE.y, xM = CAGE.mansardX;
  const hOut = y0 + CAGE.hOuter, hTop = DIM.eaveY - 0.02;
  const hAt = (x) => x <= xM ? hOut + (hTop - hOut) * (x - x0) / (xM - x0) : hTop;
  const beam = (a, b, s = 0.05) => coll.add('alu', beamBetween(a, b, s, alu));
  const collapsed = mode === 'collapsed';
  const lean = collapsed ? 1.15 : 0; // W posts fold inward
  const postsZ = []; for (let i = 0; i <= 8; i++) postsZ.push(z0 + (z1 - z0) * i / 8);
  const wTop = (z) => collapsed ? [x0 + Math.sin(lean) * CAGE.hOuter, y0 + Math.cos(lean) * CAGE.hOuter, z] : [x0, hOut, z];
  for (const z of postsZ) beam([x0, y0, z], wTop(z), 0.05);
  const nPostsX = 5;
  for (let i = 0; i <= nPostsX; i++) { const x = x0 + (x1 - x0) * i / nPostsX; if (x >= x1 - 0.01) continue; const h = collapsed ? y0 + (hAt(x) - y0) * (0.35 + 0.3 * S.nextFloat()) : hAt(x); beam([x, y0, z0], [x, h, z0]); beam([x, y0, z1], [x, h, z1]); }
  beam(wTop(z0), wTop(z1), 0.07);
  if (!collapsed) {
    beam([xM, hTop, z0], [xM, hTop, z1], 0.07); beam([x1, hTop, z0], [x1, hTop, z1], 0.05);
    beam([x0, hOut, z0], [xM, hTop, z0], 0.07); beam([x0, hOut, z1], [xM, hTop, z1], 0.07); beam([xM, hTop, z0], [x1, hTop, z0]); beam([xM, hTop, z1], [x1, hTop, z1]);
    for (let i = 1; i < 4; i++) { const x = x0 + (x1 - x0) * i / 4; beam([x, hAt(x), z0], [x, hAt(x), z1]); }
    for (const z of postsZ) { beam([x0, hOut, z], [xM, hTop, z]); beam([xM, hTop, z], [x1, hTop, z], 0.04); }
    for (const z of postsZ) beam([x0, y0 + 0.6, z0], [x0, y0 + 0.6, z1], 0.04);
  } else {
    // the roof frame dropped onto the deck, rafters askew
    for (const z of postsZ) beam([x0 + 1.5 + jit(S, 0.4), y0 + 0.25, z + jit(S, 0.3)], [xM + 0.6, y0 + 0.9 + jit(S, 0.3), z + jit(S, 0.5)], 0.05);
    beam([xM, hTop - 0.4, z0], [xM, hTop - 0.4, z1], 0.07); beam([x1, hTop, z0], [x1, hTop, z1], 0.05);
  }
  // screens
  const screen = (corners, flex = 0.25) => coll.add('screen', quad(corners[0], corners[1], corners[2], corners[3], { nx: 2, ny: 2, flex, color: [1, 1, 1] }));
  const skip = (i, n) => mode === 'torn' && ((i * 7 + 3) % n) < Math.round(n * 0.45);
  if (!collapsed) {
    for (let i = 0; i < 8; i++) { // west wall columns
      const za = z0 + (z1 - z0) * i / 8, zb = za + (z1 - z0) / 8;
      if (skip(i, 8)) { if (mode === 'torn' && i % 3 === 0) screen([[x0, hOut, zb], [x0, hOut, za], [x0 + 0.5, hOut - 1.6, za + 0.3], [x0 + 0.6, hOut - 1.4, zb - 0.2]], 0.9); continue; }
      screen([[x0, y0, zb], [x0, y0, za], [x0, hOut, za], [x0, hOut, zb]]);
    }
    for (let i = 0; i < 4; i++) { // N/S walls
      const xa = x0 + (x1 - x0) * i / 4, xb = xa + (x1 - x0) / 4;
      if (!skip(i + 2, 4)) screen([[xa, y0, z0], [xb, y0, z0], [xb, hAt(xb), z0], [xa, hAt(xa), z0]]);
      if (!skip(i + 1, 4)) screen([[xb, y0, z1], [xa, y0, z1], [xa, hAt(xa), z1], [xb, hAt(xb), z1]]);
    }
    for (let i = 0; i < 4; i++) { // roof strips
      const xa = x0 + (x1 - x0) * i / 4, xb = xa + (x1 - x0) / 4;
      if (skip(i, 4)) continue;
      screen([[xa, hAt(xa) + 0.01, z1], [xb, hAt(xb) + 0.01, z1], [xb, hAt(xb) + 0.01, z0], [xa, hAt(xa) + 0.01, z0]], 0.35);
    }
  } else {
    for (let i = 0; i < 6; i++) { const za = z0 + 0.5 + i * 1.9, xa = x0 + 0.4 + S.nextFloat() * 3; screen([[xa, y0 + 0.15, za + 1.6], [xa + 2.2, y0 + 0.3 + S.nextFloat() * 0.4, za + 1.4], [xa + 2.0, y0 + 0.6, za], [xa - 0.3, y0 + 0.2, za + 0.2]], 0.6); }
  }
}

// ---- one lot's shell (walls, openings, deck/cage, roofs) ---------------------------------------------------------
function buildLot(lot, ctx, out) {
  const { hoodColl, glassGeoms, wc, colliders, colliderMeta, S, lotShutters, mats } = ctx;
  const lm = lotMatrix(lot), T = lm.T;
  const lc = new Collector();
  const houseColour = STUCCO[lot.stucco % STUCCO.length];
  const isNguyen = lot.id === 'nguyen';
  buildWalls({ lines, roomAt: rawPlanRoom, bakerFor: null, roomCollector: () => lc, exteriorCollector: lc, colliders: null, exteriorOnly: true, houseColour, bandColour: BAND });
  buildStuccoTrim({ lines, openings, exteriorCollector: lc, houseColour, bandColour: BAND });
  // the dark inner box (seen through the glass)
  lc.add('matte', flipInside(boxAt(0.3, -0.35, 0.3, 13.7, 3.0, 19.5, { color: rgb([0.02, 0.02, 0.025]) })));
  // openings
  const glass = [];
  const doorColour = DOOR_COL[(lot.stucco + lot.roof + (lot.mirrorZ ? 1 : 0)) % DOOR_COL.length];
  const shuttered = lot.shuttersAt != null;
  const shutterColl = shuttered ? new Collector() : null;
  let coachLens = [];
  for (const op of Object.values(openings)) {
    if (op.kind === 'screen') continue;
    if (op.unit) continue;
    if (op.kind === 'garage') { if (lot.id !== 'bergstrom') staticGarageDoor(op, lc); continue; }
    if (op.kind === 'door') {
      const side = op.unitWith ? openings[op.unitWith] : null;
      const r = staticDoor(op, lc, glass, doorColour, { coach: !!side, sidelight: side, leaf: !(isNguyen && op.id === 'door_front'), lit: lot.id === 'ray' });
      if (side) coachLens = r.lens;
      continue;
    }
    if (op.bay) staticBay(op, lc, glass); else staticWindow(op, lc, glass, { obscure: !!op.obscure });
    if (shutterColl && op.id !== 'peep_laundry_N') staticShutter(op, shutterColl);
    if (lot.id === 'denise' && (op.id === 'win_bed2_E' || op.id === 'win_bed3_E')) { /* plywood is the denise_plywood prop */ }
  }
  lanaiDeck(lc);
  if (lot.id !== 'bergstrom') cageFrame(lc, 'intact', S);
  // transform + merge
  flush(lc, lm, hoodColl);
  for (const g of glass) glassGeoms.push(xformGeom(g, lm));
  if (shutterColl) {
    const meshes = [];
    for (const [mat, geoms] of shutterColl.map) { const g = merge(geoms.map(x => xformGeom(x, lm))); if (g) meshes.push(staticMesh(g, mats.get(mat), { name: `shutters:${lot.id}:${mat}`, castShadow: true })); }
    const grp = new THREE.Group(); grp.name = `lotShutters:${lot.id}`; grp.add(...meshes); grp.visible = false;
    grp.userData = { lot: lot.id, shuttersAt: lot.shuttersAt };
    lotShutters[lot.id] = grp; out.group.add(grp);
  }
  // roofs (world coordinates)
  const done = [];
  const slab = rectWorld(T, SLAB.x0, SLAB.z0, SLAB.x1, SLAB.z1);
  const swap = lot.facing === 'S' || lot.facing === 'N';
  const slopes = {};
  for (const r of roofs) {
    const R = rectWorld(T, r.x0, r.z0, r.x1, r.z1);
    const rr = { id: r.id, x0: R[0], z0: R[1], x1: R[2], z1: R[3], ridgeAxis: swap ? (r.ridgeAxis === 'x' ? 'z' : 'x') : r.ridgeAxis, eave: r.eave, eaveY: r.eaveY, pitch: r.pitch, porch: r.porch };
    const res = hipRoof(rr, wc, { clip: [slab, ...done], shingleMat: lot.roof ? 'shingleBrown' : 'shingle' });
    slopes[r.id] = res.slopes; done.push(res.eaveRect);
  }
  for (const z of [PORCH.z0 + 0.15, PORCH.z1 - 0.15]) { const [wx, wz] = T.toWorld(PORCH.x1 + 0.09, z); wc.add('stucco', boxAt(wx - 0.14, PORCH.y, wz - 0.14, wx + 0.14, DIM.eaveY - 0.2, wz + 0.14, { color: rgb(BAND) })); }
  // mailbox
  const mb = T.toWorld(lot.facing === 'S' || lot.facing === 'N' ? 20.4 : MAILBOX[0], MAILBOX[1]);
  const mbDir = T.dir(1, 0);
  placeFactory(exteriorF.mailbox, { id: `mailbox:${lot.id}` }, ctx, mb[0], siteHeightAt(mb[0], mb[1]), mb[1], Math.atan2(mbDir[0], mbDir[1]), wc);
  // colliders: the slab as a solid block (the Nguyens get real walls), the cage as a block
  if (!isNguyen) {
    const b = T.bounds(); colliders.push(box3(b[0], -0.3, b[1], b[2], 3.05, b[3])); colliderMeta.push({ id: `house:${lot.id}`, kind: 'house', lot: lot.id });
    const c = rectWorld(T, CAGE.x0, CAGE.z0, CAGE.x1, CAGE.z1); colliders.push(box3(c[0], -0.3, c[1], c[2], 2.6, c[3])); colliderMeta.push({ id: `cage:${lot.id}`, kind: 'cage', lot: lot.id });
  }
  const bounds = T.bounds();
  out.lots[lot.id] = { id: lot.id, bounds, origin: [...lot.origin], facing: lot.facing, coachLens: coachLens.map(l => l), slopes, transform: T };
  out.roofSlopes[lot.id] = slopes;
}
/** Place a prop factory's statics into a collector (or add its group to `out`). */
function placeFactory(f, spec, ctx, x, y, z, ry, coll) {
  const r = f(spec, { mats: ctx.mats, stream: ctx.S });
  if (r.static) for (const [mat, g] of r.static) coll.add(mat, place(g, x, y, z, ry));
  if (r.group) { r.group.position.set(x, y, z); r.group.rotation.y = ry; ctx.extraGroups.push(r.group); return r.group; }
  return null;
}

// ---- the Nguyens' walkable front rooms ---------------------------------------------------------------------------
function buildNguyen(ctx, out) {
  const { mats, colliders, colliderMeta, S } = ctx;
  const lot = lots.find(l => l.id === 'nguyen');
  const coll = new Collector();
  const baker = createBaker([]);
  const roomAt = (x, z) => rawPlanRoom(x - NG_OFF[0], z - NG_OFF[1]);
  const walls = [];
  buildWalls({ lines, roomAt, bakerFor: () => baker, roomCollector: () => coll, exteriorCollector: new Collector(), colliders: walls, offset: NG_OFF, roomFilter: NG_ROOMS, houseColour: STUCCO[lot.stucco] });
  for (const b of walls) { colliders.push(b); colliderMeta.push({ id: 'house:nguyen', kind: 'wall', lot: 'nguyen' }); }
  buildFloors({ bakerFor: () => baker, roomCollector: () => coll, exteriorCollector: new Collector(), roomFilter: NG_ROOMS, offset: NG_OFF, interiorOnly: true });
  const doors = buildNguyenDoors({ mats, roomCollector: () => coll, exteriorCollector: coll, roomAt }, NG_OFF);
  // furniture (dry, tidy: DESIGN §4.2 "dry interior")
  const fctx = { mats, stream: S };
  const put = (f, spec, x, y, z, ry) => { const r = f(spec, fctx); if (r.static) for (const [mat, g] of r.static) coll.add(mat, place(g, x, y, z + NG_OFF[1], ry)); };
  put(furniture.sectional, { id: 'ng:sectional' }, 2.6, 0, 9.3, 0);
  put(furniture.coffeeTable, { id: 'ng:coffee' }, 3.2, 0, 8.4, 0);
  put(furniture.consoleTable, { id: 'ng:console' }, 13.1, 0, 6.94, 0);
  put(furniture.tableDining, { id: 'ng:dining' }, 8.0, 0, 8.35, 0);
  put(furniture.tableNook, { id: 'ng:nook' }, 2.55, 0, 1.9, 0);
  put(furniture.bookshelf, { id: 'ng:shelf', w: 1.2, h: 1.9 }, 1.8, 0, 11.98, PI);
  put(kitchenF.baseCabinets, { id: 'ng:base', w: 3.4, drawers: 4 }, 0.55, 0, 5.0, H);
  put(kitchenF.upperCabinets, { id: 'ng:upper', w: 2.6 }, 0.41, 0, 4.9, H);
  put(kitchenF.island, { id: 'ng:island' }, 3.0, 0, 6.65, 0);
  put(kitchenF.fridge, { id: 'ng:fridge' }, 5.2, 0, 5.9, -H);
  // the wind-up clock on their console (cut-list item 1)
  coll.add('wood', place(box(0.22, 0.28, 0.08, { color: rgb([0.4, 0.28, 0.18]) }), 13.1, 0.9, 6.94 + NG_OFF[1]));
  coll.add('matte', place(cyl(0.09, 0.09, 0.01, 16, { color: rgb([0.95, 0.93, 0.85]) }), 13.1, 0.98, 6.99 + NG_OFF[1], 0, H, 0));
  const meshes = coll.build((n) => mats.get(n), 'nguyen', { all: { castShadow: true } });
  const group = new THREE.Group(); group.name = 'nguyen_interior';
  group.add(...meshes, ...doors.statics, doors.frontDoor);
  // block the openings into the unbuilt rooms: the bed-hall gap, the sliders, the garage door, the man door
  const blocks = [[6.45, 11.2, 7.75, 11.45], [-0.05, 8.0, 0.3, 10.7], [-0.05, 15.5, 0.3, 17.3], [13.7, 0.9, 14.05, 5.8], [12.5, -0.05, 13.31, 0.3]];
  for (const [x0, z0, x1, z1] of blocks) { colliders.push(box3(x0, 0, z0 + NG_OFF[1], x1, 2.6, z1 + NG_OFF[1])); colliderMeta.push({ id: 'house:nguyen', kind: 'block', lot: 'nguyen' }); }
  out.nguyen = { group, frontDoor: doors.frontDoor, meshes };
  return group;
}

// ---- poles, wires, cans, streetlights, street furniture, the LOD skirt --------------------------------------------
function polesAndWires(ctx, out) {
  const { wc, mats, S } = ctx;
  const bark = rgb([0.62, 0.55, 0.45]), cross = rgb([0.5, 0.42, 0.3]), ins = rgb([0.4, 0.45, 0.5]);
  const poleH = 9.5;
  const tops = new Map();
  const poleAt = (x, z, crossAlongZ) => {
    const y0 = siteHeightAt(x, z) - 0.6;
    const g = cyl(0.13, 0.17, poleH + 0.6, 10, { color: bark });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.9, uv.getY(i) * 10);
    wc.add('barkOak', place(g, x, y0 + (poleH + 0.6) / 2, z));
    const top = y0 + poleH;
    wc.add('wood', place(box(2.4, 0.1, 0.1, { color: cross }), x, top - 1.0, z, crossAlongZ ? H : 0));
    for (const o of [-1, 0, 1]) wc.add('gloss', place(cyl(0.05, 0.06, 0.12, 8, { color: ins }), x + (crossAlongZ ? 0 : o), top - 0.9, z + (crossAlongZ ? o : 0)));
    tops.set(`${x},${z}`, top);
    return top;
  };
  const isProp = (x, z) => x === 20 && z === -2.5; // pole_leaning is a prop
  for (const [x, z] of feederPoles) { if (isProp(x, z)) { tops.set(`${x},${z}`, siteHeightAt(x, z) + poleH - 0.6); continue; } poleAt(x, z, Math.abs(z + 3) < 1.5 || Math.abs(z + 20) < 1.5); }
  poleAt(26.75, -45, false);
  const topOf = (x, z) => tops.get(`${x},${z}`) ?? (siteHeightAt(x, z) + poleH - 0.6);
  // wires: a LineSegments of three sagging conductors per span
  const pts = [];
  const span = (a, b, { ya = null, yb = null, n = 3, offs = 0.4, sagK = 0.012 } = {}) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const y0 = ya ?? topOf(a[0], a[1]) - 0.9, y1 = yb ?? topOf(b[0], b[1]) - 0.9;
    const sag = sagK * L;
    const dx = (b[1] - a[1]) / L, dz = -(b[0] - a[0]) / L; // perpendicular in xz
    for (let c = 0; c < n; c++) {
      const o = n === 1 ? 0 : (c - (n - 1) / 2) * offs;
      for (let i = 0; i < 12; i++) {
        for (const t of [i / 12, (i + 1) / 12]) pts.push(a[0] + (b[0] - a[0]) * t + dx * o, y0 + (y1 - y0) * t - sag * 4 * t * (1 - t), a[1] + (b[1] - a[1]) * t + dz * o);
      }
    }
  };
  const feeder = [[32, -45], [32, -10], [32, 10], [32, 45], [32, 78], [32, 110]];
  for (let i = 0; i < feeder.length - 1; i++) span(feeder[i], feeder[i + 1]);
  span([32, -45], [26.75, -45]);
  span([20, -2.5], [9, -3]); span([9, -3], [-4, -3]);
  span([-95, -20], [-70, -20]); span([-70, -20], [-40, -22]);
  span([9, -3], [METER[0], METER[1] - 0.3], { ya: topOf(9, -3) - 1.2, yb: 3.3, n: 1, sagK: 0.03 });
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const wires = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x141414 })); wires.name = 'wires'; wires.frustumCulled = false;
  out.wires = wires; out.group.add(wires);
  // the weatherhead + riser on the garage's north wall above the meter
  wc.add('alu', boxAt(METER[0] - 0.03, 1.7, METER[1] - 0.09, METER[0] + 0.03, 3.35, METER[1] - 0.03, { color: rgb([0.6, 0.6, 0.62]) }));
  wc.add('alu', place(cyl(0.05, 0.03, 0.12, 8, { color: rgb([0.6, 0.6, 0.62]) }), METER[0], 3.38, METER[1] - 0.06, 0, -0.6, 0));
  // transformer cans: one InstancedMesh, a proxy Group per transformer id
  const canGeom = merge([cyl(0.32, 0.32, 0.8, 14, { color: rgb([0.5, 0.53, 0.5]) }), place(box(0.1, 0.1, 0.1, { color: rgb([0.16, 0.16, 0.18]) }), 0, 0.5, 0), place(box(0.5, 0.06, 0.5, { color: rgb([0.45, 0.47, 0.45]) }), 0, -0.43, 0)]);
  const ids = Object.keys(transformers);
  const cans = new THREE.InstancedMesh(canGeom, mats.get('matte'), ids.length); cans.name = 'transformerCans'; cans.castShadow = true; cans.frustumCulled = false;
  cans.userData = { kind: 'transformerCans', instanceIds: ids };
  out.group.add(cans);
  const poles = {};
  ids.forEach((id, i) => {
    const [x, , z] = transformers[id].pos;
    const top = topOf(x, z);
    const along = (Math.abs(z + 3) < 1.5) ? [0, 1] : [1, 0];
    const p = new InstanceProxy(cans, i); p.name = `transformer:${id}`;
    p.position.set(x + along[0] * 0.45, top - 2.0, z + along[1] * 0.45);
    p.userData = { ...p.userData, transformerId: id, fixtureId: `fix_transformer_${id}`, pos: [x, top, z], houses: [...transformers[id].houses], poses: { home: { p: [p.position.x, p.position.y, p.position.z], r: [0, 0, 0] }, hanging: { p: [p.position.x, p.position.y - 0.9, p.position.z], r: [0.5, 0, 0.35] } }, pose: 'home' };
    p.userData.setPose = (name) => applyPose(p, name);
    poles[id] = p; out.group.add(p);
  });
  out.transformerPoles = poles;
  out.cans = cans;
}
function streetLighting(ctx, out) {
  const { wc, mats } = ctx;
  const parent = new THREE.Group(); parent.name = 'streetlights';
  const lights = {};
  for (const sl of STREETLIGHT_DEFS) {
    const [x, , z] = sl.pos; const y0 = siteHeightAt(x, z), h = sl.headHeight, arm = sl.arm;
    wc.add('concrete', place(cyl(0.12, 0.18, h, 10, { color: rgb([0.85, 0.85, 0.83]) }), x, y0 + h / 2, z));
    if (arm !== 0) wc.add('alu', place(cyl(0.05, 0.06, Math.abs(arm) + 0.2, 8, { color: rgb([0.6, 0.6, 0.62]) }), x + arm / 2, y0 + h - 0.15, z, 0, 0, H));
    wc.add('matte', place(box(0.55, 0.16, 0.3, { color: rgb([0.45, 0.46, 0.48]) }), x + arm, y0 + h - 0.1, z));
    const grp = new THREE.Group(); grp.name = sl.id; grp.position.set(x, y0, z);
    const lens = new THREE.Mesh(box(0.35, 0.03, 0.22, { color: [1, 1, 1] }), mats.variant('glowCool', sl.id, {})); lens.position.set(arm, h - 0.19, 0); lens.name = 'lens'; lens.castShadow = false;
    grp.add(lens);
    grp.userData = { streetlightId: sl.id, fixtureId: sl.fixture, lens, head: [x + arm, y0 + h - 0.19, z] };
    parent.add(grp);
    lights[sl.id] = { id: sl.id, group: grp, lens, pos: [x, y0, z], head: [x + arm, y0 + h - 0.19, z], fixture: sl.fixture };
  }
  out.streetlights = lights; out.streetlightsGroup = parent; out.group.add(parent);
}
function streetFurniture(ctx, out) {
  const { wc, mats, options } = ctx;
  for (const [x, z] of SWALE.inlets) placeFactory(exteriorF.stormInlet, { id: `inlet:${z}` }, ctx, x, SWALE.bottomY - 0.1, z, 0, wc);
  const hoa = placeFactory(exteriorF.hoaSignMonument, { id: 'hoaSign' }, ctx, 20.5, siteHeightAt(20.5, 109.5), 109.5, PI, wc);
  if (hoa) out.group.add(hoa);
  const pm = placeFactory(exteriorF.padMount, { id: 'padMount' }, ctx, PAD_MOUNT[0], siteHeightAt(PAD_MOUNT[0], PAD_MOUNT[1]), PAD_MOUNT[1], 0, wc);
  if (pm) { pm.visible = options?.service === 'underground'; pm.userData.service = 'underground'; out.padMount = pm; out.group.add(pm); }
}
function lodSkirt(ctx, out) {
  const { mats, S } = ctx;
  const body = boxAt(-7, 0, -10, 7, 3.2, 10, { color: rgb([0.86, 0.82, 0.72]) });
  const roof = new THREE.CylinderGeometry(2.2, 10.2, 2.4, 4, 1); roof.rotateY(PI / 4); roof.scale(1, 1, 1.4); roof.translate(0, 3.2 + 1.2, 0);
  ensureAttrs(roof, { color: rgb([0.36, 0.34, 0.32]) });
  const geom = merge([body, roof]);
  const spots = [];
  for (let z = -400; z <= 420; z += 26) for (let x = -400; x <= 420; x += 24) {
    const d = Math.hypot(x - 10, z - 20);
    if (d < 135) continue;
    if (x > -125 && x < -15 && z > -70 && z < 90) continue;        // the pond and its far bank
    if (Math.abs(z - 116) < 16 && x > -140 && x < 160) continue;   // the main road
    if (Math.abs(x - 26.75) < 14 && z < 130 && z > -140) continue; // Sandpiper Cove itself
    if (Math.abs(z - 75) < 12 && x > 30 && x < 160) continue;      // Egret Way
    if (S.nextFloat() < 0.18) continue;
    spots.push([x + jit(S, 5), z + jit(S, 5), (S.nextFloat() < 0.5 ? 0 : H) + jit(S, 0.12), 0.9 + S.nextFloat() * 0.25]);
  }
  const mesh = new THREE.InstancedMesh(geom, mats.variant('matte', 'lod', { roughness: 0.9 }), spots.length);
  mesh.name = 'lodSkirt'; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  spots.forEach(([x, z, yaw, sc], i) => { p.set(x, siteHeightAt(x, z) - 0.2, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw); s.set(sc, sc, sc); _m.compose(p, q, s); mesh.setMatrixAt(i, _m); });
  mesh.instanceMatrix.needsUpdate = true;
  out.lodSkirt = mesh; out.group.add(mesh);
}

/** Emissive front-window quads of a lot, relative to `origin` (for the windowsLit / windowsDark factories). */
export function frontWindowQuads(lotId, origin) {
  const lot = lots.find(l => l.id === lotId);
  if (!lot) return [];
  const T = lotTransform(lot);
  const nrm = T.dir(1, 0), yaw = Math.atan2(nrm[0], nrm[1]);
  const quads = [];
  for (const op of Object.values(openings)) {
    if (op.wall !== 'E') continue;
    if (!['window', 'peep', 'slider'].includes(op.kind) && !op.unit) continue;
    const d = op.bay ? (op.projection || 0.45) + 0.02 : 0.06;
    const [x, z] = T.toWorld(14.0 + d, op.centre[2]);
    quads.push([x - origin[0], op.centre[1] - origin[1], z - origin[2], Math.max(0.2, op.w - 0.12), Math.max(0.2, op.h - 0.12), yaw]);
  }
  const door = openings.door_front, side = openings.sidelight_foyer_E;
  for (const u of [door.from - 0.3, side.to + 0.3]) { const [x, z] = T.toWorld(14.0 + 0.125, u); quads.push([x - origin[0], 1.97 - origin[1], z - origin[2], 0.13, 0.19, yaw]); }
  return quads;
}

/** Felt patches (the Bergstroms' stripped tabs) scattered over a roof slope, as one geometry relative to `origin`. */
export function patchesOnSlope(patches, slope, S, origin) {
  const [a, b, c, d] = slope.corners;
  const n = new THREE.Vector3(...slope.normal).normalize(), e = new THREE.Vector3(...slope.eaveDir).normalize();
  const up = new THREE.Vector3().crossVectors(n, e).normalize();
  const basis = new THREE.Matrix4().makeBasis(e, up, n);
  const tri = Math.hypot(c[0] - d[0], c[2] - d[2]) < 0.05;
  const geoms = [];
  for (const [, g] of patches) {
    const tv = 0.1 + 0.8 * S.nextFloat();
    let tu = 0.08 + 0.84 * S.nextFloat();
    if (tri) tu = 0.5 + (tu - 0.5) * (1 - tv);
    const px = (a[0] + tu * (b[0] - a[0])) * (1 - tv) + (d[0] + tu * (c[0] - d[0])) * tv;
    const py = (a[1] + tu * (b[1] - a[1])) * (1 - tv) + (d[1] + tu * (c[1] - d[1])) * tv;
    const pz = (a[2] + tu * (b[2] - a[2])) * (1 - tv) + (d[2] + tu * (c[2] - d[2])) * tv;
    const m = basis.clone(); m.setPosition(px + n.x * 0.012 - origin[0], py + n.y * 0.012 - origin[1], pz + n.z * 0.012 - origin[2]);
    g.rotateZ(jit(S, 0.3)); g.applyMatrix4(m);
    geoms.push(g);
  }
  return merge(geoms);
}

/**
 * @param {{mats:object, stream:object, colliders:THREE.Box3[], colliderMeta:object[], layout:object, options?:object}} ctx
 */
export function buildNeighbourhood(ctx) {
  const { mats, stream: S, colliders, colliderMeta, layout, options = {} } = ctx;
  const group = new THREE.Group(); group.name = 'neighbourhood';
  const out = { group, lots: {}, roofSlopes: {}, lotShutters: {}, transformerPoles: {}, streetlights: {}, provided: {}, windowQuads: {} };
  const hoodColl = new Collector(), wc = new Collector();
  const glassGeoms = [];
  const c2 = { mats, S, hoodColl, wc, glassGeoms, colliders, colliderMeta, lotShutters: out.lotShutters, extraGroups: [], options };
  for (const lot of lots) { if (lot.id === 'self') continue; buildLot(lot, c2, out); }
  // the Nguyens' interior
  const ng = buildNguyen(c2, out);
  group.add(ng);
  const ngSpec = layout.nguyen_interior; if (ngSpec) { ng.position.set(0, 0, 0); dress(ng, 'nguyen_interior', { ...ngSpec, pos: [0, 0, 0] }); }
  out.provided.nguyen_interior = ng;
  if (layout.nguyenDoor) { dress(out.nguyen.frontDoor, 'nguyenDoor', { ...layout.nguyenDoor, pos: [out.nguyen.frontDoor.position.x, out.nguyen.frontDoor.position.y, out.nguyen.frontDoor.position.z] }); out.provided.nguyenDoor = out.nguyen.frontDoor; }
  // the Bergstroms' cage (three part groups)
  const bergSpec = layout.berg_cagePanels;
  if (bergSpec) {
    const lot = lots.find(l => l.id === 'bergstrom'); const lm = lotMatrix(lot);
    const grp = new THREE.Group(); grp.name = 'berg_cagePanels'; grp.position.set(...bergSpec.pos);
    const parts = {};
    for (const mode of ['intact', 'torn', 'collapsed']) {
      const cc = new Collector(); cageFrame(cc, mode, S);
      const part = new THREE.Group(); part.name = mode;
      for (const [mat, geoms] of cc.map) { const g = merge(geoms.map(x => xformGeom(x, lm))); if (!g) continue; g.translate(-bergSpec.pos[0], -bergSpec.pos[1], -bergSpec.pos[2]); part.add(staticMesh(g, mats.get(mat), { name: `bergCage:${mode}:${mat}`, castShadow: mat !== 'screen' })); }
      part.visible = mode === 'intact';
      parts[mode] = part; grp.add(part);
    }
    dress(grp, 'berg_cagePanels', bergSpec, parts, { size: [9, 3, 12] });
    out.provided.berg_cagePanels = grp; group.add(grp);
  }
  polesAndWires(c2, out);
  streetLighting(c2, out);
  if (layout.streetlights) { dress(out.streetlightsGroup, 'streetlights', layout.streetlights, null, { lights: out.streetlights }); out.provided.streetlights = out.streetlightsGroup; }
  streetFurniture(c2, out);
  lodSkirt(c2, out);
  for (const g of c2.extraGroups) if (!g.parent) group.add(g);
  // merge: lots (transformed), world-space statics, glass
  const meshes = [...hoodColl.build((n) => mats.get(n), 'hood', { all: { castShadow: true } }), ...wc.build((n) => mats.get(n), 'hoodW', { all: { castShadow: true } })];
  const glass = merge(glassGeoms);
  if (glass) { const gm = staticMesh(glass, mats.get('glass'), { name: 'hood:glass', castShadow: false, renderOrder: 2 }); meshes.push(gm); }
  group.add(...meshes);
  out.meshes = meshes;
  out.windowQuads = { ray: frontWindowQuads('ray', layout.ray_windowsLit?.pos || [0, 0, 0]), f4217: frontWindowQuads('f4217', layout.lastDarkHouse?.pos || [0, 0, 0]) };
  return out;
}
