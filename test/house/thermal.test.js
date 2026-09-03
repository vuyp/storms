/** DESIGN §6.11 / ARCHITECTURE §13.6: the sealed-house relaxation and the reference night. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHouseHarness } from './fixtures.js';

// a still, overcast night at 30 °C: tRel, kt, dir, P, rain, tAir, r, bandRain, bandWind, eye, cloud
const STILL_30 = [[-40, 4, 90, 1011, 0, 30, 900, 0, 1, 0, 1], [40, 4, 90, 1011, 0, 30, 900, 0, 1, 0, 1]];

test('sealed house, tAirC = 30, no sun, from 24 °C: 30.9 ± 0.3 after 6 h; rh climbs toward 90 %', async () => {
  const h = await createHouseHarness({ seed: 1, startTRel: -14, outageTRel: -14, table: STILL_30 });   // T−14 = Thu 00:00
  const t = h.state.house.thermal;
  assert.equal(t.tInC, 24); assert.equal(t.hvacOn, true);
  h.advanceTo(-8);
  assert.ok(h.state.local.sun.elDeg < 0, 'night');
  assert.equal(t.hvacOn, false); assert.equal(t.sealed, 1); assert.ok(Math.abs(t.tTargetC - 33) < 1e-9);
  assert.ok(Math.abs(t.tInC - 30.9) <= 0.3, `tInC ${t.tInC.toFixed(2)}`);
  assert.ok(t.rhIn > 0.85 && t.rhIn <= 0.9);
  assert.ok(t.tdInC > 27 && t.tdInC < t.tInC);
  h.dispose();
});

test('the reference night: 24 °C at the outage, ≥ 28.5 by T+8, ≈ 29 at 90 % RH', async () => {
  const h = await createHouseHarness({ seed: 7, startTRel: -7 });
  h.advanceTo(-5.95);
  assert.ok(Math.abs(h.state.house.thermal.tInC - 24) < 0.3, 'the A/C holds 24 until the outage');
  h.advanceTo(8);
  const t = h.state.house.thermal;
  assert.ok(t.tInC >= 28.5, `tInC ${t.tInC.toFixed(2)} at T+8`);
  assert.ok(t.tInC < 30.5);
  assert.ok(t.rhIn > 0.85);
  assert.equal(t.fanOn, false);
  h.dispose();
});

test('the A/C pulls the house back to 24 in about an hour; a generator next door adds half a degree', async () => {
  const h = await createHouseHarness({ seed: 1, startTRel: -14, outageTRel: -14, restoreTRel: -8, table: STILL_30 });
  h.advanceTo(-8.01);
  assert.ok(h.state.house.thermal.tInC > 30);
  h.advanceTo(-6.5);
  assert.ok(h.state.house.thermal.hvacOn);
  assert.ok(h.state.house.thermal.tInC < 24.5, `tInC ${h.state.house.thermal.tInC.toFixed(2)} after 90 min of A/C`);
  h.dispose();
  const g = await createHouseHarness({ seed: 1, startTRel: -14, outageTRel: -14, table: STILL_30, script: (hh) => { hh.state.utilities.generator.running = true; hh.state.utilities.generator.placement = 'lanai'; } });
  g.advanceTo(-8);
  assert.ok(Math.abs(g.state.house.thermal.tTargetC - 33.5) < 1e-9);
  g.dispose();
});

test('opening the bare windows after the storm unseals the house (τ 40 min toward the outside air)', async () => {
  const h = await createHouseHarness({ seed: 1, startTRel: -14, outageTRel: -14, table: STILL_30 });
  h.advanceTo(-8);
  const api = h.house.api;
  for (const id of ['win_nook_N', 'win_bed2_E', 'win_bed3_E', 'win_master_S', 'win_den_S', 'win_kitchen_W', 'win_mbath_W', 'peep_laundry_N']) assert.equal(api.setDoor(id, { open: 1 }).ok, true, id);
  assert.equal(api.setDoor('slider_great_W', { open: 1 }).ok, true);
  const t = h.state.house.thermal;
  h.advanceTo(-7.95);
  assert.equal(t.sealed, 0);
  assert.ok(Math.abs(t.tTargetC - 30) < 1e-9);
  const before = t.tInC;
  h.advanceTo(-7);
  assert.ok(t.tInC < before - 0.5 && t.tInC > 30, `tInC ${t.tInC.toFixed(2)} falls toward 30 within an hour`);
  h.state.local.u1m = 20;
  assert.equal(api.setDoor('win_nook_N', { open: 1 }).ok, false);
  h.dispose();
});
