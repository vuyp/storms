/** DESIGN §6.12 fridge/pool arithmetic, the detector chirp, eyeStartSim, the api contract, finiteness. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHouseHarness } from './fixtures.js';
import { findNonFinite } from '../../src/core/state.js';
import { formatClock } from '../../src/core/clock.js';

test('fridge: coldest, twelve Ziplocs, openings, the 48-h freezer, the smell and the purge, the ice-maker dump', async () => {
  const h = await createHouseHarness({ seed: 1, startTRel: -30, outageTRel: -20, restoreTRel: 30 });
  const api = h.house.api, f = h.state.house.fridge;
  assert.equal(api.setFridgeColdest(true).ok, true);
  assert.equal(api.addFrozenBags(12).ok, true); assert.equal(api.addFrozenBags(1).ok, false); assert.equal(f.frozenBags, 12);
  assert.equal(api.setIceMaker(false).ok, true);
  h.advanceTo(-20.01);
  assert.ok(Math.abs(f.freezerReserveH - 76) < 0.1, `freezer ${f.freezerReserveH.toFixed(1)} h before the outage (48 + 24 bags + 4 coldest)`);
  assert.ok(Math.abs(f.fridgeReserveH - 4.5) < 0.1);
  h.advanceTo(-10);
  assert.ok(Math.abs(f.freezerReserveH - 66) < 0.2, `freezer ${f.freezerReserveH.toFixed(1)} h ten hours into the outage`);
  assert.ok(Math.abs(f.fridgeReserveH + 5.5) < 0.2);
  assert.equal(f.coldReserveH, f.freezerReserveH);
  assert.ok(f.smell > 0 && f.smell < 0.3, 'the fridge is warm and the smell has started');
  assert.equal(api.setFridgeOpen(true).ok, true); assert.equal(f.openCount, 1);
  assert.ok(Math.abs(f.fridgeReserveH + 5.5 - (-1 / 3)) < 0.2);
  assert.equal(api.setFridgeOpen(false).ok, true);
  assert.equal(api.setFridgeOpen(true, 'freezer').ok, true);
  assert.ok(Math.abs(f.freezerReserveH - 65) < 0.2, 'opening the freezer costs an hour');
  h.advanceTo(-9);
  assert.ok(f.freezerReserveH < 61.5, 'an open door loses cold four times faster');
  api.setFridgeOpen(false);
  // the generator's fridge circuit rebuilds the reserve (2 on / 2 off holds it)
  const G = h.state.utilities.generator; G.running = true; G.placement = 'driveway'; G.circuits = ['fridge'];
  const before = f.freezerReserveH;
  h.advanceTo(-7);
  assert.ok(f.freezerReserveH > before + 2.5, 'recovers at 1.5 h/h on the generator');
  G.running = false;
  assert.equal(api.purgeFridge().ok, true); assert.equal(api.purgeFridge().ok, false);
  const smell = f.smell;
  h.advanceTo(0);
  assert.ok(f.smell < smell, 'the smell fades after the purge');
  assert.equal(f.iceDumped, false);
  api.setIceMaker(true);
  h.advanceTo(31);
  assert.equal(f.iceDumped, true, 'left on, the ice maker dumps at restoration');
  h.dispose();
});

test('pool: rain raises it, the backwash drops 15 cm in 3 min, it overtops at +0.15, the pump runs dry and burns out', async () => {
  const h = await createHouseHarness({ seed: 1, startTRel: -26, outageTRel: null });   // Wed 12:00, pump timer window
  const api = h.house.api, p = h.state.house.pool;
  h.advanceTo(-25.99);
  assert.equal(p.pumpOn, true);
  assert.equal(api.setPoolValve(true).ok, true);
  h.advanceTo(-25.94);
  assert.ok(Math.abs(p.levelM + 0.15) < 0.01, `level ${p.levelM.toFixed(3)} after 3 min of backwash`);
  assert.equal(api.setPoolValve(false).ok, true);
  h.advanceTo(-20);
  assert.ok(Math.abs(p.levelM + 0.15) < 0.01, 'holds');
  assert.equal(p.pumpBurnt, false);
  api.setPoolValve(true);
  h.advanceTo(-19.5);
  assert.equal(p.pumpBurnt, true, 'left open, the level drops below the skimmer and the pump burns out');
  assert.equal(p.pumpOn, false);
  api.setPoolValve(false);
  h.dispose();
  const r = await createHouseHarness({ seed: 7, startTRel: -7 });
  r.advanceTo(2);
  const q = r.state.house.pool;
  assert.equal(q.levelM, 0.15); assert.equal(q.overtopping, true); assert.ok(q.colour > 0.5);
  assert.equal(q.pumpOn, false, 'no power');
  r.dispose();
  const b = await createHouseHarness({ seed: 1, startTRel: -26, outageTRel: null });
  b.state.utilities.power.breakers.poolPump = false;
  b.house.api.setPoolValve(true);
  b.advanceTo(-25);
  assert.equal(b.state.house.pool.pumpOn, false); assert.equal(b.state.house.pool.pumpBurnt, false); assert.ok(b.state.house.pool.levelM > -0.01);
  b.dispose();
});

test('the smoke detector chirps once in the small hours of the aftermath night, not with the battery pulled', async () => {
  const h = await createHouseHarness({ seed: 7, startTRel: -7 });
  h.advanceTo(17);
  assert.equal(h.count('house:detectorChirp'), 1);
  const e = h.find('house:detectorChirp');
  const hour = ((e.simTime % 86400) / 3600);
  assert.ok(hour >= 1.5 && hour < 3.5, `chirp at ${formatClock(e.simTime)}`);
  assert.equal(Math.floor((e.simTime - 86400) / 86400), 1, 'Friday');
  assert.equal(e.detectorId, 'detector_hall');
  assert.equal(h.state.house.eyeStartSim, 136800 - 0.69 * 3600 + 5 - ((136800 - 0.69 * 3600) % 5), 'eyeStartSim at the eyeEnter sub-step');
  assert.equal(h.find('storm:eyeEnter').simTime, h.state.house.eyeStartSim);
  assert.deepEqual(findNonFinite(h.state, ['house']), []);
  h.dispose();
  const p = await createHouseHarness({ seed: 7, startTRel: -7 });
  p.state.objects.detector_hall.extra.battery = 0;
  p.advanceTo(17);
  assert.equal(p.count('house:detectorChirp'), 0);
  p.dispose();
});

test('every setter returns {ok, reason?}; queries are finite; dispose clears the api', async () => {
  const h = await createHouseHarness({ seed: 4, startTRel: -30 });
  const api = h.house.api;
  const calls = [
    () => api.placePanel('nope', 4), () => api.removePanel('nope'), () => api.setShutter('nope', true), () => api.setBrace('nope', true),
    () => api.setDoor('nope', {}), () => api.setGarageDoor({ open: 0 }), () => api.setGarageBrace(false), () => api.placeSandbag('nope'),
    () => api.placeTowel('nope'), () => api.wringTowel('nope'), () => api.placeBucket('nope', 'b'), () => api.emptyBucket('nope'),
    () => api.setFridgeOpen(false), () => api.setIceMaker(true), () => api.setFridgeColdest(false), () => api.addFrozenBags(0),
    () => api.purgeFridge(), () => api.setPoolValve(false), () => api.setAttic(false),
  ];
  for (const c of calls) { const r = c(); assert.equal(typeof r.ok, 'boolean'); if (!r.ok) assert.equal(typeof r.reason, 'string'); }
  const ol = api.openingLoad('door_garage_roll');
  assert.ok(Number.isFinite(ol.load) && Number.isFinite(ol.threshold));
  const gl = api.openingLoad('win_bed2_E');
  assert.ok(Number.isFinite(gl.load) && Number.isFinite(gl.pBucket));
  assert.deepEqual(api.openingLoad('nope'), { load: 0, threshold: null });
  assert.ok(Number.isFinite(api.coRate()) && Number.isFinite(api.coPpmAt('garage')));
  assert.ok(typeof api.thresholds().garageUnbraced === 'number');
  h.dispose();
  assert.equal(Object.keys(api).length, 0, 'dispose clears the stable api object');
  assert.doesNotThrow(() => h.house.step(5), 'step after dispose is a no-op');
});
