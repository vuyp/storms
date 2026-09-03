/**
 * test/world/plan.test.js — plan.js reproduces DESIGN §3.2–3.7 and the §16 registry; roomOf is correct
 * (ARCHITECTURE §15 WP-14 acceptance). Pure modules: no THREE, no DOM.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, lines, rooms, openings, doors, sockets, leakPoints, fixtures, adjacency, props, roofs, roofRidge, siteHeightAt, casedOpenings, lots, lotTransform } from '../../src/world/plan.js';
import { roomOf, yardSectorOf, pointInPolygon } from '../../src/world/roomOf.js';
import { OPENING_IDS, DOOR_IDS, SOCKET_IDS, LEAK_POINT_IDS, FIXTURE_IDS, OBJECT_IDS, PROP_IDS, INTERIOR_ROOM_IDS, ROOM_IDS, INTERIOR_DOORS, EXTERIOR_DOORS, CASED_OPENINGS, OPENINGS } from '../../src/core/ids.js';

// DESIGN §3.2 — the plan grid
const GRID = { x1: 3.95, x2: 4.95, x3a: 5.60, x3b: 5.60, x4a: 6.50, x4b: 6.50, x5: 7.50, x6: 7.70, x7a: 10.40, x7b: 10.40, z1: 3.00, z2: 6.70, z3: 10.00, z4a: 11.30, z4b: 11.30, z5: 12.20, z6: 13.815, z7a: 15.20, z7b: 15.20, z7c: 15.20, z7d: 15.20, z8: 16.40, N: 0.125, E: 13.875, S: 19.675, W: 0.125 };

test('every wall centre-line is within 0.05 m of DESIGN §3.2', () => {
  for (const [id, v] of Object.entries(GRID)) {
    const l = lines.find(x => x.id === id);
    assert.ok(l, `line ${id} exists`);
    assert.ok(Math.abs(l.at - v) <= 0.05, `${id} at ${l.at} vs ${v}`);
  }
  const x3 = lines.find(l => l.id === 'x3a');
  assert.deepEqual([x3.from, x3.to], [0.125, 6.7]);
  const z4b = lines.find(l => l.id === 'z4b');
  assert.deepEqual([z4b.from, z4b.to], [7.7, 13.875]);
  assert.ok(!lines.some(l => l.id.startsWith('x3') && l.from < 11.3 && l.to > 10.1 && l.from >= 10.0), 'no wall on x3 between z 10 and 11.3');
  for (const l of lines) { assert.equal(l.t, l.ext ? 0.25 : 0.115); assert.ok(l.to > l.from); }
});

test('every registry id is present: openings, doors, sockets, leak points, fixtures, props', () => {
  for (const id of OPENING_IDS) assert.ok(openings[id], `opening ${id}`);
  for (const id of DOOR_IDS) assert.ok(doors[id], `door ${id}`);
  for (const id of SOCKET_IDS) assert.ok(sockets[id] && sockets[id].pos.length === 3, `socket ${id}`);
  for (const id of LEAK_POINT_IDS) assert.ok(leakPoints[id], `leak ${id}`);
  for (const id of FIXTURE_IDS) assert.ok(fixtures[id] && fixtures[id].pos, `fixture ${id}`);
  for (const id of [...OBJECT_IDS, ...PROP_IDS]) assert.ok(props[id], `prop ${id}`);
  for (const id of INTERIOR_ROOM_IDS) assert.ok(rooms[id], `room ${id}`);
  assert.equal(Object.keys(plan.sockets).length, SOCKET_IDS.length);
  assert.equal(Object.keys(plan.fixtures).length, FIXTURE_IDS.length);
});

test('openings match the envelope table (DESIGN §3.4)', () => {
  const o = openings;
  assert.deepEqual([o.win_nook_N.from, o.win_nook_N.to, o.win_nook_N.sill, o.win_nook_N.head], [1.80, 3.30, 0.9, 2.1]);
  assert.ok(o.win_nook_N.bay && o.win_nook_N.projection === 0.45);
  assert.deepEqual([o.peep_laundry_N.from, o.peep_laundry_N.to, o.peep_laundry_N.sill], [6.25, 6.85, 1.5]);
  assert.deepEqual([o.door_garage_roll.from, o.door_garage_roll.to, o.door_garage_roll.head], [0.90, 5.80, 2.13]);
  assert.deepEqual([o.door_front.from, o.door_front.to], [7.90, 8.81]);
  assert.deepEqual([o.slider_great_W.from, o.slider_great_W.to, o.slider_great_W.head], [8.00, 10.70, 2.44]);
  assert.deepEqual([o.slider_master_W.from, o.slider_master_W.to, o.slider_master_W.head], [15.50, 17.30, 2.03]);
  assert.deepEqual([o.win_kitchen_W.sill, o.win_kitchen_W.head], [1.1, 2.1]);
  for (const id of OPENING_IDS) {
    const d = OPENINGS[id];
    assert.ok(Math.abs(o[id].w - d.w) < 0.011, `${id} width ${o[id].w} vs ${d.w}`);
    assert.ok(Math.abs(o[id].h - d.h) < 0.011, `${id} height ${o[id].h} vs ${d.h}`);
    assert.equal(o[id].wall, d.wall);
    assert.equal(o[id].facadeDeg, { N: 0, E: 90, S: 180, W: 270 }[d.wall]);
  }
  assert.deepEqual(o.door_cage_screen.centre.map(v => +v.toFixed(2)), [-9.0, 0.85, 7.0]);
});

test('doors: hinge on the wall line, swing toward the swing-into room, widths 0.81/0.91', () => {
  for (const [id, d] of Object.entries(doors)) {
    if (id === 'door_cage_screen') continue;
    const l = lines.find(x => x.id === d.line);
    assert.ok(l, `${id} line`);
    const hp = d.hingePos;
    if (l.dir === 'EW') assert.ok(Math.abs(hp[2] - l.at) < 1e-9); else assert.ok(Math.abs(hp[0] - l.at) < 1e-9);
    const c = plan.roomCentre(d.swingInto);
    const sd = l.dir === 'EW' ? d.swingDir[2] : d.swingDir[0];
    if (c) {
      const side = l.dir === 'EW' ? Math.sign(c[2] - l.at) : Math.sign(c[0] - l.at);
      assert.equal(sd, side, `${id} swings toward ${d.swingInto}`);
    } else if (d.swingInto === 'outside') {
      const n = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[l.outward];
      assert.equal(sd, l.dir === 'EW' ? n[1] : n[0], `${id} swings outward`);
    }
    assert.ok(Math.abs(d.w - (d.slider ? d.w : (id === 'door_front' ? 0.91 : 0.81))) < 0.011, `${id} width`);
  }
  assert.equal(doors.door_front.hinge, 'from');
  assert.equal(doors.door_laundry_kitchen.hinge, 'from');
  assert.ok(doors.slider_great_W.slider && doors.slider_great_W.slideDistance > 0.85);
});

test('adjacency covers every door and cased opening, both directions', () => {
  for (const [id, d] of Object.entries({ ...INTERIOR_DOORS, ...EXTERIOR_DOORS })) {
    const [a, b] = d.between;
    assert.ok(adjacency[a].some(e => e.roomId === b && e.doorId === id), `${a}→${b} via ${id}`);
    assert.ok(adjacency[b].some(e => e.roomId === a && e.doorId === id), `${b}→${a} via ${id}`);
  }
  for (const [a, b] of CASED_OPENINGS) {
    assert.ok(adjacency[a].some(e => e.roomId === b && e.doorId === null), `${a}↔${b} cased`);
    assert.ok(adjacency[b].some(e => e.roomId === a && e.doorId === null));
  }
  for (const r of ROOM_IDS) assert.ok(Array.isArray(adjacency[r]), `adjacency[${r}]`);
  assert.equal(casedOpenings.length, 3, 'three cased openings have wall geometry (the rest are absent wall segments)');
  assert.ok(adjacency.garage.some(e => e.doorId === 'door_garage_roll'));
});

test('roomOf is correct for a few hundred sampled points (incl. lanai/cage/outside/nguyenFoyer) and snaps in doorways', () => {
  let n = 0;
  for (const id of INTERIOR_ROOM_IDS) {
    for (const [x0, z0, x1, z1] of rooms[id].rects) {
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const x = x0 + 0.12 + (x1 - x0 - 0.24) * i / 4, z = z0 + 0.12 + (z1 - z0 - 0.24) * j / 4;
        assert.equal(roomOf([x, 1.0, z]), id, `(${x.toFixed(2)},${z.toFixed(2)}) → ${id}`); n++;
      }
    }
  }
  assert.ok(n > 300);
  // the four non-rooms
  assert.equal(roomOf([-1.5, 1.0, 12.0]), 'lanai');
  assert.equal(roomOf([-6.0, 1.0, 12.0]), 'cage');
  assert.equal(roomOf([-2.0, 1.0, 17.8]), 'cage');
  assert.equal(roomOf([18.0, 1.0, 8.5]), 'outside');
  assert.equal(roomOf([26.75, 1.0, 8.0]), 'outside');
  assert.equal(roomOf([-12.0, 1.0, 12.0]), 'outside');
  assert.equal(roomOf([12.1, 1.0, 8.4 - 26]), 'nguyenFoyer');
  assert.equal(roomOf([2.9, 1.0, 9.0 - 26]), 'nguyenFoyer');
  assert.equal(roomOf([12.1, 1.0, 13.2 - 26]), 'outside', 'the Nguyens have no walkable bed2');
  // doorways: a point in the wall thickness reads a room, never outside
  assert.ok(['laundry', 'nook'].includes(roomOf([5.60, 1.0, 1.6])), 'the laundry doorway reads a room');
  assert.notEqual(roomOf([13.875, 1.0, 8.35]), 'outside', 'the front door threshold');
  assert.notEqual(roomOf([0.125, 1.0, 9.35]), 'outside', 'the slider track');
  assert.ok(['dining', 'frontHall'].includes(roomOf([8.0, 1.0, 10.0])), 'the cased opening reads a room');
  // above the attic line
  assert.equal(roomOf([7, 4.5, 10]), 'outside');
  assert.equal(roomOf({ x: 2.9, y: 1.6, z: 9.0 }), 'great');
  assert.ok(pointInPolygon(1, 12, rooms.great.polygon) && !pointInPolygon(5, 12, rooms.great.polygon));
});

test('yard sectors (DESIGN §16.4)', () => {
  assert.equal(yardSectorOf([18.0, 0, 12.0]), 'frontYard');
  assert.equal(yardSectorOf([-12.0, 0, 12.0]), 'backYard');
  assert.equal(yardSectorOf([18.5, 0, 3.5]), 'driveway');
  assert.equal(yardSectorOf([26.75, 0, 8.0]), 'street');
  assert.equal(yardSectorOf([26.75, 0, -40.0]), 'street');
  assert.equal(yardSectorOf([7.0, 0, 10.0]), '');
  assert.equal(yardSectorOf([500, 0, 500]), '');
});

test('roofs (DESIGN §3.6): ridge heights and lengths; Roof B spans x 0 → 7.5 with 0.6-m eaves', () => {
  const A = roofs.find(r => r.id === 'A'), B = roofs.find(r => r.id === 'B'), C = roofs.find(r => r.id === 'C');
  assert.ok(Math.abs(roofRidge(A).ridgeY - 5.43) < 0.02); assert.ok(Math.abs(roofRidge(A).ridgeLen - 3.9) < 0.02);
  assert.ok(Math.abs(roofRidge(B).ridgeY - 4.37) < 0.02); assert.ok(Math.abs(roofRidge(B).ridgeLen - 0.8) < 0.02);
  assert.ok(Math.abs(roofRidge(C).ridgeY - 4.33) < 0.02);
  assert.deepEqual([B.x0, B.x1, B.eave], [0, 7.5, 0.6]);
  assert.deepEqual([A.x0, A.x1, A.z0, A.z1], [-3.0, 14.0, 6.7, 19.8]);
});

test('site elevations (DESIGN §3.7)', () => {
  assert.equal(siteHeightAt(7, 10), 0);
  assert.equal(siteHeightAt(-1.5, 12), -0.15);
  assert.equal(siteHeightAt(-6, 12), -0.15);
  assert.equal(siteHeightAt(15, 8.4), -0.15);
  assert.ok(Math.abs(siteHeightAt(26.75, 8) - -0.45) < 1e-9, 'street crown');
  assert.ok(Math.abs(siteHeightAt(22.35, 8) - -0.80) < 0.02, 'swale bottom');
  const d1 = siteHeightAt(14.5, 3.5), d2 = siteHeightAt(23.0, 3.5);
  assert.ok(d1 <= -0.29 && d1 >= -0.31 && d2 < -0.45 && d2 >= -0.51, `driveway ${d1} → ${d2}`);
  assert.ok(siteHeightAt(-40, 8) < -1.4, 'pond');
  assert.ok(Math.abs(siteHeightAt(-17.5, 8) - -0.5) < 0.05, 'pond bank top');
  const g = siteHeightAt(18, 14);
  assert.ok(g > -0.46 && g < -0.14, `lawn ${g}`);
  assert.equal(siteHeightAt(0.5, 10), 0, 'inside the slab');
});

test('sockets and leak points sit in their rooms; lots transform consistently', () => {
  for (const id of SOCKET_IDS) {
    const s = sockets[id];
    if (['player', 'outside', 'fixed'].includes(s.room)) continue;
    if (s.kind === 'panel') continue; // outside the opening, on the façade
    const r = roomOf([s.pos[0], 1.0, s.pos[2]]);
    assert.equal(r, s.room, `${id} at (${s.pos}) reads ${r}, wants ${s.room}`);
  }
  for (const id of LEAK_POINT_IDS) assert.equal(roomOf([leakPoints[id].floor[0], 1.0, leakPoints[id].floor[2]]), leakPoints[id].room, id);
  const ray = lots.find(l => l.id === 'ray');
  const T = lotTransform(ray);
  assert.deepEqual(T.toWorld(14, 0), [34, -4], "Ray's front wall faces the street at x = 34");
  assert.deepEqual(T.toWorld(0, 19.8), [48, 15.8]);
  const b1 = lotTransform(lots.find(l => l.id === 'bulb1'));
  assert.deepEqual(b1.toWorld(14, 0), [14, -56], 'bulb1 faces south');
  const ng = lotTransform(lots.find(l => l.id === 'nguyen'));
  assert.deepEqual(ng.toWorld(14, 8.355).map(v => +v.toFixed(3)), [14, -17.645], "the Nguyens' front door");
});
