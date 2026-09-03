import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketOf, bucketRoll, componentU, integralFailed, glassLoadCoef, cosFace, absCos, angleDiffDeg, slopeOfDir, slopeOfSector,
  ADJACENCY, GARAGE_ADJACENT, LEAK_POINTS_BY_SECTOR, ROOM_FACADES, ROOM_OPENINGS, GLAZED_OPENING_IDS, createBucketMax, bucketMaxUpdate,
} from '../../src/house/structure.js';
import { tiers } from '../../src/house/intrusion.js';
import { target, dewPointC } from '../../src/house/thermal.js';
import { roomDp } from '../../src/house/pressure.js';
import { ul2034AlarmPpm } from '../../src/house/co.js';
import { adjacency as planAdjacency } from '../../src/world/plan.js';

test('bucket rule: buckets, rolls and component uniforms are deterministic and in [0,1)', () => {
  assert.equal(bucketOf(0), 0); assert.equal(bucketOf(599.9), 0); assert.equal(bucketOf(600), 1); assert.equal(bucketOf(136800), 228);
  const a = bucketRoll(7, 'glass:peep', 228), b = bucketRoll(7, 'glass:peep', 228), c = bucketRoll(7, 'glass:peep', 229), d = bucketRoll(8, 'glass:peep', 228);
  assert.equal(a, b); assert.notEqual(a, c); assert.notEqual(a, d);
  for (const u of [a, c, d, componentU(7, 'x'), componentU(7, 'y')]) assert.ok(u >= 0 && u < 1);
  assert.equal(componentU(7, 'x'), componentU(7, 'x'));
  assert.equal(integralFailed(0, 0.5), false); assert.equal(integralFailed(10, 0.5), true); assert.equal(integralFailed(-Math.log(0.5), 0.5), true);
  const t = createBucketMax();
  assert.equal(bucketMaxUpdate(t, 3, 10), true); assert.equal(bucketMaxUpdate(t, 3, 5), false); assert.equal(t.max, 10);
  assert.equal(bucketMaxUpdate(t, 4, 1), true); assert.equal(t.max, 1); assert.equal(t.rolled, false);
});

test('angles: cosFace, absCos, the glass-load coefficient and the slopes', () => {
  assert.ok(Math.abs(angleDiffDeg(10, 350) - 20) < 1e-9);
  assert.ok(Math.abs(angleDiffDeg(350, 10) + 20) < 1e-9);
  assert.ok(Math.abs(cosFace(112, 90) - Math.cos(22 * Math.PI / 180)) < 1e-9);
  assert.equal(cosFace(270, 90), 0);
  assert.ok(Math.abs(absCos(270, 90) - 1) < 1e-9);
  assert.ok(Math.abs(glassLoadCoef(90, 90) - 1) < 1e-9);          // windward
  assert.ok(Math.abs(glassLoadCoef(90, 0) - 0.74) < 1e-9);        // side wall: suction + streaming debris
  assert.equal(glassLoadCoef(270, 90), 0);                         // lee
  assert.ok(glassLoadCoef(200, 90) < glassLoadCoef(110, 90));      // taper into the lee
  assert.ok(Math.abs(glassLoadCoef(135, 90) - Math.SQRT1_2) < 1e-9);
  assert.equal(slopeOfDir(112), 1); assert.equal(slopeOfDir(292), 3); assert.equal(slopeOfDir(0), 0); assert.equal(slopeOfDir(180), 2);
  assert.equal(slopeOfSector(2), 1); assert.equal(slopeOfSector(6), 3); assert.equal(slopeOfSector(1), 1); assert.equal(slopeOfSector(7), 0);
});

test('static tables match the plan and the ID registry', () => {
  assert.deepEqual(GARAGE_ADJACENT, ['laundry']);
  assert.ok(ADJACENCY.great.some(e => e.roomId === 'dining' && e.doorId === null));
  assert.ok(ADJACENCY.garage.some(e => e.roomId === 'laundry' && e.doorId === 'door_laundry_garage'));
  // identical to world/plan.js's adjacency (same source data)
  for (const r of Object.keys(planAdjacency)) {
    const a = ADJACENCY[r].map(e => `${e.roomId}:${e.doorId}`).sort(), b = planAdjacency[r].map(e => `${e.roomId}:${e.doorId}`).sort();
    assert.deepEqual(a, b, `adjacency ${r}`);
  }
  assert.deepEqual(LEAK_POINTS_BY_SECTOR[2], ['lp_foyer_can', 'lp_bed2_head', 'lp_hall_detector']);
  assert.deepEqual(LEAK_POINTS_BY_SECTOR[6], ['lp_master_can', 'lp_great_register']);
  assert.deepEqual(LEAK_POINTS_BY_SECTOR[4], ['lp_den_ceiling']);
  assert.deepEqual([...ROOM_FACADES.masterBR].sort(), [180, 270]);
  assert.deepEqual(ROOM_FACADES.dining, []);
  assert.deepEqual(ROOM_OPENINGS.foyer, ['door_front', 'sidelight_foyer_E']);
  assert.equal(GLAZED_OPENING_IDS.length, 11);
});

test('pure exports: intrusion.tiers, thermal.target, pressure.roomDp, the UL 2034 curve', () => {
  assert.equal(tiers(50), 0); assert.equal(tiers(70), 1); assert.equal(tiers(80, { kind: 'door' }), 0); assert.equal(tiers(100, { kind: 'door' }), 1);
  assert.equal(tiers(200), 2); assert.equal(tiers(200, { shuttered: true }), 1); assert.equal(tiers(320, { shuttered: true }), 2);
  assert.equal(tiers(0, { soffitIntegral: 30 }), 3); assert.equal(tiers(0, { shingleLoss: 0.2 }), 4);
  assert.ok(Math.abs(target(30, 1, -10, 1, false) - 33) < 1e-9);
  assert.ok(Math.abs(target(30, 0, 45, 0, true) - 32.5) < 1e-9);
  assert.ok(Math.abs(target(30, 0, 90, 1, false) - 30.6) < 1e-9);
  assert.ok(Math.abs(dewPointC(30, 0.9) - 28.2) < 0.3);
  assert.ok(Math.abs(roomDp(1000.1, 1000, 2614, 1, 0, false) - (10 + 39.21)) < 0.05);
  assert.ok(roomDp(1000, 1000, 2614, 1, 0, true) > 2600);
  assert.equal(ul2034AlarmPpm(4), 400); assert.equal(ul2034AlarmPpm(10), 150); assert.equal(ul2034AlarmPpm(60), 70); assert.equal(ul2034AlarmPpm(2), 400); assert.equal(ul2034AlarmPpm(90), 70);
  assert.ok(ul2034AlarmPpm(8) > 190 && ul2034AlarmPpm(8) < 230);
});
