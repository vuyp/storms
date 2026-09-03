/** DESIGN §6.6 / ARCHITECTURE §13.6: the water ladder, the attic reservoir, buckets, sag and collapse. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHouseHarness } from './fixtures.js';
import { LEAK_POINT_IDS } from '../../src/core/ids.js';

function track(h) {
  const rec = { soffit30: null, foyerActive: null, peakE: 0, bowMaxFront: 0, bowMaxBack: 0, dp: [] };
  const sub = h.subStep;
  h.subStep = () => {
    sub();
    const S = h.state.house, t = h.tRel();
    if (rec.soffit30 == null && S.soffitIntegral[2] >= 30) rec.soffit30 = t;
    if (rec.foyerActive == null && S.ceilingLeaks.lp_foyer_can.active) rec.foyerActive = t;
    if (S.roof.atticWaterL[2] > rec.peakE) rec.peakE = S.roof.atticWaterL[2];
    const bow = S.openings.slider_great_W.bowEnvM;
    if (t >= -7 && t <= 0 && bow > rec.bowMaxFront) rec.bowMaxFront = bow;
    if (t >= 0.5 && t <= 1.5 && bow > rec.bowMaxBack) rec.bowMaxBack = bow;
  };
  return rec;
}

test('reference run, no bucket: soffit tier 3, the foyer drip, the east reservoir, sag and collapse', async () => {
  const h = await createHouseHarness({ seed: 7, startTRel: -7 });
  const rec = track(h);
  h.advanceTo(4);
  const S = h.state.house;
  assert.ok(rec.soffit30 != null && rec.soffit30 >= -2.8 && rec.soffit30 <= -2.0, `east soffit integral reaches 30 mm·h at T${rec.soffit30?.toFixed(2)} (T−2.4 ± 0.4)`);
  assert.ok(rec.foyerActive != null && rec.foyerActive <= -2.0, `lp_foyer_can active at T${rec.foyerActive?.toFixed(2)} (by T−2.0)`);
  assert.ok(rec.peakE >= 15 && rec.peakE <= 35, `east reservoir peak ${rec.peakE.toFixed(1)} L (15–35)`);
  assert.equal(rec.bowMaxFront, 0, 'the west slider does not bow in the front half (lee)');
  assert.ok(rec.bowMaxBack > 0.02, `slider_great_W.bowEnvM ${rec.bowMaxBack.toFixed(3)} > 0.02 in T+0.5 … T+1.5`);
  // the tier ladder is enumerated in order on the bed-2 window
  const tiers = h.events.filter(e => e.name === 'house:intrusion' && e.openingId === 'win_bed2_E').map(e => e.tier);
  assert.deepEqual(tiers.slice(0, 3), [1, 2, 3]);
  assert.ok(h.count('house:leakStarted', e => e.lpId === 'lp_foyer_can') === 1);
  const first = h.find('house:leakStarted');
  assert.equal(first.lpId, 'lp_foyer_can', 'the foyer can light is the first stain');
  assert.ok(h.count('house:leakTier', e => e.lpId === 'lp_foyer_can' && e.tier === 2) >= 1, 'the foyer drip becomes a stream');
  assert.ok(S.ceilingLeaks.lp_master_can.active && S.ceilingLeaks.lp_great_register.active, 'the west points open in the back eyewall');
  assert.ok(S.roof.atticWaterL[6] > S.roof.atticWaterL[2], 'more water on the west after the back eyewall');
  assert.ok(S.openings.slider_great_W.intrusionTier >= 1 && h.find('house:intrusion', e => e.openingId === 'slider_great_W').simTime > 136800, 'the sliders leak only after the reversal');
  // the drips outlast the rain
  h.advanceTo(24);
  assert.ok(S.ceilingLeaks.lp_foyer_can.rateLph > 0.05, `foyer drip ${S.ceilingLeaks.lp_foyer_can.rateLph.toFixed(3)} L/h at T+24`);
  assert.ok(S.ceilingLeaks.lp_foyer_can.stainM2 > 0.5);
  assert.ok(h.count('house:ceilingSag') >= 1, 'sag fires with no bucket');
  h.advanceTo(30);
  assert.ok(h.count('house:ceilingCollapse') >= 1, 'collapse fires before T+30 with no bucket');
  const col = h.find('house:ceilingCollapse');
  assert.ok(S.ceilingLeaks[col.lpId].collapsed && S.ceilingLeaks[col.lpId].tier === 3 && S.ceilingLeaks[col.lpId].sag === 1);
  assert.ok(S.floorWater[col.lpId].litres > 5, 'a bucket-worth on the floor under the collapse');
  assert.ok(S.mildew > 0, 'mildew after the leaks');
  assert.ok(S.damageScore > 0.3 && S.damageScore <= 1);
  h.dispose();
});

test('buckets: placed at T−1 nothing sags or collapses; the puddle stays dry until the overflow', async () => {
  const h = await createHouseHarness({
    seed: 7, startTRel: -7,
    script: (hh, tRel) => { if (tRel >= -1 && !hh._b) { hh._b = true; for (const lp of LEAK_POINT_IDS) assert.equal(hh.house.api.placeBucket(lp, 'bucket_1').ok, true); } },
  });
  let dryUntilOverflow = true;
  const sub = h.subStep;
  h.subStep = () => {
    sub();
    const lp = h.state.house.ceilingLeaks.lp_foyer_can, fw = h.state.house.floorWater.lp_foyer_can;
    if (lp.bucket && !h.find('house:bucketOverflow', e => e.lpId === 'lp_foyer_can') && fw.litres > 0) dryUntilOverflow = false;
  };
  h.advanceTo(30);
  assert.equal(h.count('house:ceilingSag'), 0);
  assert.equal(h.count('house:ceilingCollapse'), 0);
  assert.ok(dryUntilOverflow, 'floorWater[lp].litres == 0 while the bucket has room');
  const S = h.state.house;
  assert.ok(h.count('house:bucketOverflow', e => e.lpId === 'lp_master_can') === 1, 'the master can overflows its bucket');
  assert.equal(S.ceilingLeaks.lp_master_can.bucketL, 10);
  assert.ok(S.floorWater.lp_master_can.litres > 0, 'the puddle grows after the overflow');
  const r = h.house.api.emptyBucket('lp_master_can');
  assert.equal(r.ok, true); assert.equal(r.litres, 10); assert.equal(S.ceilingLeaks.lp_master_can.bucketL, 0);
  assert.equal(h.house.api.emptyBucket('lp_master_can').litres, 0);
  assert.equal(h.house.api.placeBucket('lp_master_can', 'bucket_2').ok, false);
  assert.equal(h.house.api.removeBucket('lp_master_can').ok, true);
  assert.equal(h.house.api.emptyBucket('lp_master_can').ok, false);
  assert.equal(h.house.api.placeBucket('nope', 'bucket_2').ok, false);
  h.dispose();
});

test('shutters cut the intrusion litres by ≥ 60 %; towels and sandbags work as specified', async () => {
  const litres = (h) => Object.values(h.state.house.openings).reduce((n, o) => n + (o.litres || 0), 0);
  const bare = await createHouseHarness({ seed: 7, startTRel: -7 });
  bare.advanceTo(4);
  const bareL = litres(bare);
  const bareFront = bare.state.house.floorWater.door_front.litres;
  bare.dispose();
  const shut = await createHouseHarness({
    seed: 7, startTRel: -7,
    script: (hh, tRel) => {
      if (hh._done) return; hh._done = true;
      const api = hh.house.api;
      for (const id of ['win_nook_N', 'peep_laundry_N', 'sidelight_foyer_E', 'win_bed2_E', 'win_bed3_E', 'win_master_S', 'win_den_S', 'win_kitchen_W', 'win_mbath_W', 'slider_master_W']) {
        const o = hh.state.house.openings[id];
        for (let i = 0; i < o.panelsNeeded; i++) assert.equal(api.placePanel(id, 4).ok, true, id);
        assert.equal(o.shuttered, true); assert.equal(o.fastening, 1);
      }
      assert.equal(api.setShutter('slider_great_W', true).ok, true);
      assert.equal(api.setBrace('slider_great_W', true).ok, true);
      for (let i = 0; i < 4; i++) assert.equal(api.placeSandbag('door_front').ok, true);
      assert.equal(api.placeSandbag('door_front').ok, false);
      assert.ok(Math.abs(hh.state.house.openings.door_front.sandbagM - 0.12) < 1e-9);
      assert.equal(api.placeTowel('door_front').ok, true);
      assert.equal(api.placeTowel('door_front').ok, true);
      assert.equal(hh.state.house.openings.door_front.towelsL, 4);
    },
  });
  shut.advanceTo(4);
  const shutL = litres(shut);
  assert.ok(shutL <= 0.4 * bareL, `shuttered litres ${shutL.toFixed(1)} vs bare ${bareL.toFixed(1)}`);
  assert.equal(Object.values(shut.state.house.openings).filter(o => o.failed && o.id !== 'door_garage_roll').length <= 1, true);
  assert.equal(shut.state.house.openings.slider_great_W.bowEnvM, 0, 'a shuttered slider does not bow');
  const S = shut.state.house;
  assert.ok(S.openings.door_front.towelsL < 4, 'the towels at the front door took water');
  assert.ok(S.floorWater.door_front.litres < bareFront, 'less on the foyer floor with towels');
  const w = shut.house.api.wringTowel('door_front');
  assert.equal(w.ok, true); assert.ok(w.litres > 0); assert.equal(S.openings.door_front.towelsL, 4);
  assert.ok(shut.count('house:intrusion', e => e.openingId === 'win_bed2_E' && e.tier === 2) === 1, 'a shuttered sill still weeps at 300');
  shut.dispose();
});

test('the wind blocks the panels; a half-fastened panel counts', async () => {
  const h = await createHouseHarness({ seed: 3, startTRel: -30 });
  const api = h.house.api, o = h.state.house.openings.win_bed2_E;
  assert.equal(api.placePanel('win_bed2_E', 2).ok, true);
  assert.equal(o.fastening, 0.5); assert.equal(o.shuttered, false); assert.equal(o.shutterProgress, 0.5);
  assert.equal(api.placePanel('win_bed2_E', 4).ok, true);
  assert.equal(o.fastening, 0.75); assert.equal(o.shuttered, true);
  assert.equal(api.placePanel('win_bed2_E', 4).ok, false);
  assert.equal(api.placePanel('door_front', 4).ok, false);
  assert.equal(api.setShutter('win_bed2_E', true).ok, false);
  assert.equal(api.setBrace('win_bed2_E', true).ok, false);
  h.state.local.u1m = 25;
  assert.equal(api.placePanel('win_bed3_E', 4).ok, false);
  assert.equal(api.placePanel('win_bed3_E', 4).reason, 'The wind has this now');
  assert.equal(api.removePanel('win_bed2_E').ok, false);
  h.state.local.u1m = 5;
  assert.equal(api.removePanel('win_bed2_E').ok, true);
  assert.equal(o.shuttered, false); assert.equal(o.panelsPlaced, 1);
  h.dispose();
});
