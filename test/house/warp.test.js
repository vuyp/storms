/** ARCHITECTURE §13.4 for the house slice: frame dtSim 1 s vs 600 s, both sub-stepped at 5 s, must agree exactly. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHouseHarness, T0 } from './fixtures.js';
import { canonicalJson } from '../../src/core/hash.js';

function script(h, tRel) {
  const S = h.state, q = S.hood.impactQueue, now = S.clock.simTime;
  // sim-side impacts written to hood.impactQueue the way hood/debris.js does (fired entries with simTime ≤ now)
  const at = (t) => tRel >= t && tRel < t + 5 / 3600;
  if (at(-1.6)) { q.push({ simTime: now, surface: 'win_bed2_E', class: '2x4', energyJ: 250, pos: [13.9, 1.5, 13.2], fired: true }, { simTime: now, surface: 'win_bed2_E', class: '2x4', energyJ: 250, pos: [13.9, 1.5, 13.2], fired: true }); }
  if (at(-1.4)) q.push({ simTime: now, surface: 'peep_laundry_N', class: 'bin', energyJ: 120, pos: [6.5, 1.8, -0.1], fired: true });
  if (at(-1.3)) q.push({ simTime: now, surface: 'roof', class: 'garageDoor', energyJ: 2000, pos: [7, 5, 10], fired: true });
  if (at(0.9)) q.push({ simTime: now, surface: 'roof', class: 'aluminium', energyJ: 2000, pos: [-2, 4, 10], fired: true });
  if (tRel >= -1.0 && !h._bucket) { h._bucket = true; h.house.api.placeBucket('lp_foyer_can', 'bucket_1'); }
  if (tRel >= -6.5 && !h._prep) { h._prep = true; h.house.api.placePanel('win_nook_N', 4); h.house.api.placePanel('win_nook_N', 4); h.house.api.placePanel('win_nook_N', 2); h.house.api.placeTowel('door_front'); h.house.api.placeSandbag('door_front'); }
  if (tRel >= -3.0 && !h._co) { h._co = true; S.utilities.generator.placement = 'lanai'; S.utilities.generator.running = true; S.player.room = 'great'; }
  // hood trims fired entries at bucket boundaries
  if (q.length && Math.floor(now / 600) !== Math.floor((now - 5) / 600)) for (let i = q.length - 1; i >= 0; i--) if (q[i].fired && q[i].simTime < now - 5) q.splice(i, 1);
}

async function run(frameS) {
  const h = await createHouseHarness({ seed: 7, startTRel: -10, frameS, script });
  h.advanceTo(4);
  const S = h.state.house;
  const out = {
    events: h.events.filter(e => e.name.startsWith('house:')).map(e => `${e.name}@${e.simTime}${e.id ? ':' + e.id : ''}${e.lpId ? ':' + e.lpId : ''}${e.stage != null ? ':' + e.stage : ''}`),
    failed: Object.values(S.openings).filter(o => o.failed).map(o => `${o.id}:${o.failCause}`),
    garage: [S.garageDoor.failed, S.garageDoor.failedSim, S.garageDoor.buckled],
    cage: [S.cage.stage, S.cage.stageSim, S.cage.panels.filter(p => p.torn).map(p => `${p.id}@${p.tornSim}`)],
    anemo: [S.roof.anemometerAlive, S.roof.anemometerLastGust],
    soffit: [...S.soffitIntegral], attic: [...S.roof.atticWaterL], shingle: [...S.roof.shingleLoss],
    tIn: S.thermal.tInC, rh: S.thermal.rhIn, cold: S.fridge.coldReserveH, fridge: S.fridge.fridgeReserveH,
    floor: Object.values(S.floorWater).map(f => f.litres), stains: Object.values(S.ceilingLeaks).map(l => l.stainM2),
    coDose: S.coDose, co: { ...S.coPpmByRoom }, pool: S.pool.levelM, mildew: S.mildew, damage: S.damageScore,
    slams: Object.values(S.doors).reduce((n, d) => n + d.slamCount, 0), eyeStart: S.eyeStartSim,
    json: canonicalJson(S),
  };
  h.dispose();
  return out;
}

test('warp exactness: 1-s frames and 600-s frames give identical failures, events and integrals', async () => {
  const a = await run(1), b = await run(600);
  assert.deepEqual(a.events, b.events);
  assert.ok(a.events.some(e => e.startsWith('house:openingFailed')), 'the scripted 2×4 strikes fail a window');
  assert.ok(a.events.some(e => e.startsWith('house:garageFailed')) || a.events.some(e => e.startsWith('house:garageBuckle')));
  assert.deepEqual(a.failed, b.failed); assert.deepEqual(a.garage, b.garage); assert.deepEqual(a.cage, b.cage); assert.deepEqual(a.anemo, b.anemo);
  assert.equal(a.slams, b.slams); assert.equal(a.eyeStart, b.eyeStart);
  const within = (x, y, tol = 0.02) => Math.abs(x - y) <= tol * Math.max(1e-9, Math.abs(x), Math.abs(y));
  for (const k of ['soffit', 'attic', 'shingle', 'floor', 'stains']) for (let i = 0; i < a[k].length; i++) assert.ok(within(a[k][i], b[k][i]), `${k}[${i}] ${a[k][i]} vs ${b[k][i]}`);
  for (const k of ['tIn', 'rh', 'cold', 'fridge', 'coDose', 'pool', 'mildew', 'damage']) assert.ok(within(a[k], b[k]), `${k} ${a[k]} vs ${b[k]}`);
  assert.equal(a.json, b.json, 'the whole house slice is bit-identical');
  assert.ok(a.coDose > 0 || Object.values(a.co).some(v => v > 0), 'the lanai generator put CO into the great room');
});

test('determinism: the same seed twice is identical; another seed draws other thresholds', async () => {
  const a = await run(5), b = await run(5);
  assert.equal(a.json, b.json);
  const h1 = await createHouseHarness({ seed: 7 }); const t1 = h1.house.api.thresholds(); h1.dispose();
  const h2 = await createHouseHarness({ seed: 8 }); const t2 = h2.house.api.thresholds(); h2.dispose();
  assert.notEqual(t1.garageUnbraced, t2.garageUnbraced);
  assert.notEqual(t1.panels.join(','), t2.panels.join(','));
  assert.ok(t1.garageBraced > t1.garageUnbraced);
  assert.ok(t1.panels.every(p => p > 15 && p < 45));
});

test('the reference start is a 5-s multiple and T0 is Thu 14:00', () => {
  assert.equal(T0, 86400 + 14 * 3600);
});
