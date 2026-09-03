/** ARCHITECTURE §13.6 house Monte Carlo on the synthetic §2.7 record (fixed seed set → deterministic statistics). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHouseHarness } from './fixtures.js';

const N = 100;

test(`Monte Carlo over ${N} seeds: garage, cage, bare and shuttered glass, anemometer`, async () => {
  const st = { garage: 0, cage5: 0, cage5AfterRev: 0, peep: 0, shuttered: 0, anemoDead: 0, buckleBeforeFail: 0, garageAt: [] };
  for (let seed = 1; seed <= N; seed++) {
    const h = await createHouseHarness({
      seed, startTRel: -7,
      script: (hh, tRel) => { if (!hh._sh && tRel > -7) { hh._sh = true; hh.house.api.placePanel('win_bed3_E', 4); hh.house.api.placePanel('win_bed3_E', 4); } },
    });
    h.advanceTo(4);
    const S = h.state.house;
    if (S.garageDoor.failed) {
      st.garage++;
      st.garageAt.push((S.garageDoor.failedSim - 136800) / 3600);
      const b = h.find('house:garageBuckle'), f = h.find('house:garageFailed');
      if (b && f && b.simTime <= f.simTime) st.buckleBeforeFail++;
      assert.ok(S.openings.door_garage_roll.failed && S.garageDoor.open === 1);
    }
    if (S.cage.stage === 5) {
      st.cage5++;
      const rev = h.find('storm:windReversal'), s5 = h.find('house:cageStage', e => e.stage === 5), s4 = h.find('house:cageStage', e => e.stage === 4);
      if (rev && s5.simTime >= rev.simTime) st.cage5AfterRev++;
      assert.equal(s5.simTime - s4.simTime, 10, 'stage 5 lands two sub-steps after stage 4 (6-s fold in sim time)');
      assert.equal(S.cage.foldProgress, 1);
      assert.ok(S.cage.doorGone);
    }
    if (S.openings.peep_laundry_N.failed) st.peep++;
    if (S.openings.win_bed3_E.failed) st.shuttered++;
    if (!S.roof.anemometerAlive) st.anemoDead++;
    assert.ok(S.roof.anemometerLastGust > 40, 'the console keeps its last gust');
    assert.ok(S.cage.stage >= 3, 'the front eyewall tears the west wall and the roof strips');
    h.dispose();
  }
  const pct = (n) => 100 * n / N;
  assert.ok(pct(st.garage) >= 30 && pct(st.garage) <= 40, `unbraced garage failure ${pct(st.garage)} % (30–40)`);
  assert.equal(st.buckleBeforeFail, st.garage, 'every failure is preceded by the buckle warning');
  assert.ok(st.garageAt.every(t => t > -2.5 && t < 0), 'garage failures happen in the front eyewall');
  assert.ok(pct(st.cage5) > 95, `cage stage 5 in ${pct(st.cage5)} % (> 95)`);
  assert.ok(st.cage5AfterRev / st.cage5 > 0.6, `stage 5 after the reversal in ${(100 * st.cage5AfterRev / st.cage5).toFixed(0)} % of collapses (> 60)`);
  assert.ok(pct(st.peep) >= 14 && pct(st.peep) <= 22, `bare peep window failure ${pct(st.peep)} % (14–22)`);
  assert.ok(pct(st.shuttered) >= 0.5 && pct(st.shuttered) <= 3, `shuttered window failure ${pct(st.shuttered)} % (0.5–3)`);
  assert.ok(pct(st.anemoDead) > 90, `anemometer dies in ${pct(st.anemoDead)} %`);
});

test('braced garage door fails in < 5 % of seeds', async () => {
  let failed = 0;
  const M = 60;
  for (let seed = 1; seed <= M; seed++) {
    const h = await createHouseHarness({ seed, startTRel: -4, options: { bracedGarageKitInstalled: true } });
    h.advanceTo(2);
    if (h.state.house.garageDoor.failed) failed++;
    assert.ok(h.state.house.garageDoor.threshold > 55);
    h.dispose();
  }
  assert.ok(100 * failed / M < 5, `braced failure ${100 * failed / M} %`);
});
