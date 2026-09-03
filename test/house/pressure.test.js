/** ARCHITECTURE §8.2 "Pressure", DESIGN §3.5 / §10.1: room differentials, slams, ear pops, the exterior door rules. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHouseHarness } from './fixtures.js';
import { failOpening } from '../../src/house/openings.js';
import { EV } from '../../src/core/events.js';

const ALL_PANELS = ['win_nook_N', 'peep_laundry_N', 'sidelight_foyer_E', 'win_bed2_E', 'win_bed3_E', 'win_master_S', 'win_den_S', 'win_kitchen_W', 'win_mbath_W', 'slider_master_W'];
function shutterAll(h) {
  for (const id of ALL_PANELS) { const o = h.state.house.openings[id]; for (let i = 0; i < o.panelsNeeded; i++) h.house.api.placePanel(id, 4); }
  h.house.api.setShutter('slider_great_W', true);
  h.house.api.setGarageBrace(true);
}

test('a sealed windward room never exceeds 40 Pa of wind term below uGustEnv 66; a failure takes it past 40 within one sub-step', async () => {
  const h = await createHouseHarness({ seed: 11, startTRel: -7, script: (hh) => { if (!hh._s) { hh._s = true; shutterAll(hh); } } });
  let maxWind = 0, maxTotal = 0, lagMax = 0, worst = null;
  const sub = h.subStep;
  h.subStep = () => {
    sub();
    const S = h.state.house, L = h.state.local;
    if (L.uGustEnv < 66 && !S.openings.win_bed2_E.failed && !S.garageDoor.failed) {
      const lag = 100 * (S.pressure.pInsideHpa - L.pHpa);
      const wind = S.pressure.dpRoomPa.bed2 - lag;
      if (wind > maxWind) { maxWind = wind; worst = h.tRel(); }
      if (S.pressure.dpRoomPa.bed2 > maxTotal) maxTotal = S.pressure.dpRoomPa.bed2;
      if (Math.abs(lag) > lagMax) lagMax = Math.abs(lag);
    }
  };
  h.advanceTo(-1.6);
  assert.ok(maxWind <= 40, `wind term ${maxWind.toFixed(1)} Pa at T${worst?.toFixed(2)}`);
  assert.ok(maxWind > 25, 'the eyewall envelope is felt (doors rattle)');
  assert.ok(lagMax < 15, `inside/outside lag ${lagMax.toFixed(1)} Pa (τ 20 s at ≤ 30 hPa/h)`);
  assert.ok(maxTotal <= 55);
  assert.equal(h.count('house:doorSlam', e => e.id !== 'door_cage_screen'), 0, 'no interior door slams in a sealed house');
  // force a failure in bed 2 (as a 2×4 through bare glass would) and read the next sub-step
  const rt = h.house._runtime();
  failOpening(rt, h.state.house.openings.win_bed2_E, 'debris');
  h.advanceTo(-1.6 + 5 / 3600);
  assert.ok(h.state.house.pressure.dpRoomPa.bed2 > 40, `bed2 ${h.state.house.pressure.dpRoomPa.bed2.toFixed(0)} Pa after the failure`);
  assert.ok(h.state.house.pressure.dpRoomPa.bed2 > 1000);
  assert.ok(h.find('house:openingFailed', e => e.id === 'win_bed2_E'));
  assert.ok(h.find('house:atticWhump'));
  // the unlatched hall door into bed 2 slams
  assert.equal(h.house.api.setDoor('door_bed2', { open: 0, latched: false }).ok, true);
  const slams = h.count('house:doorSlam');
  h.advanceTo(-1.5);
  assert.ok(h.count('house:doorSlam', e => e.id === 'door_bed2') >= 1, 'the door between the hall and the failed room slams');
  assert.ok(h.state.house.doors.door_bed2.slamCount >= 1);
  assert.ok(h.count('house:doorSlam') > slams);
  assert.ok(h.count('house:atticWhump') >= 2, 'the attic keeps breathing while the load is up');
  assert.ok(Math.abs(h.state.house.pressure.pInsideHpa - h.state.local.pHpa) < 0.05, 'τ 2 s with a hole in the envelope');
  h.dispose();
});

test('ear pops: one per hPa above 8 hPa/h, first around T−2.5, reversing sign in the eye', async () => {
  const h = await createHouseHarness({ seed: 7, startTRel: -7 });
  h.advanceTo(3);
  const pops = h.events.filter(e => e.name === 'house:earPop');
  const t = (e) => (e.simTime - 136800) / 3600;
  assert.ok(pops.length >= 30 && pops.length <= 120, `${pops.length} pops`);
  assert.ok(t(pops[0]) > -3 && t(pops[0]) < -2, `first pop at T${t(pops[0]).toFixed(2)}`);
  assert.equal(pops[0].sign, -1);
  const rising = pops.find(e => e.sign === 1);
  assert.ok(rising && t(rising) > -0.1, 'the ears pop the other way after the pressure minimum');
  assert.ok(pops.every((e, i) => i === 0 || e.simTime - pops[i - 1].simTime >= 60), 'never more than one pop a minute');
  assert.ok(Math.abs(h.state.house.pressure.pAtticHpa - h.state.local.pHpa) < 0.3);
  h.dispose();
});

test('exterior door rules (DESIGN §10.1) on uGustEnv: held, ripped, slammed, locked; sliders; the garage lift', async () => {
  const h = await createHouseHarness({ seed: 2, startTRel: -30 });
  const S = h.state, api = h.house.api, L = S.local;
  const tick = () => { S.clock.simTime += 5; h.house.step(5); S.bus?.flushSim?.(); h.bus.flushSim(); };
  L.dirFromDeg = 90; L.uGustEnv = 10; S.cues.windLoadEnvPa = 60;
  let r = api.setDoor('door_front', { open: 1 });
  assert.equal(r.ok, true); assert.equal(r.outcome, 'opened'); assert.equal(S.house.openings.door_front.open, 1);
  assert.equal(api.setDoor('door_front', { open: 0 }).outcome, 'closed');
  assert.equal(S.house.doors.door_front.latched, true);
  L.uGustEnv = 25;
  r = api.setDoor('door_front', { open: 1 });
  assert.equal(r.ok, false); assert.equal(r.outcome, 'held'); assert.equal(r.reason, 'The wind is holding it shut');
  L.uGustEnv = 35;
  r = api.setDoor('door_front', { open: 1 });
  assert.equal(r.ok, true); assert.equal(r.outcome, 'ripped'); assert.equal(S.house.doors.door_front.ripped, true);
  assert.ok(h.bus.pending().some(e => e.name === EV.HOUSE_DOOR_RIPPED));
  r = api.setDoor('door_front', { open: 0, latched: false });
  assert.equal(r.outcome, 'slammed'); assert.equal(S.house.doors.door_front.ripped, false);
  tick();
  assert.equal(S.house.doors.door_front.open, 1, 'an unlatched inswing door slams open above 25 m/s');
  assert.ok(h.events.some(e => e.name === 'house:doorSlam' && e.id === 'door_front'));
  L.uGustEnv = 5;
  assert.equal(api.setDoor('door_front', { open: 0 }).outcome, 'closed');
  assert.equal(api.setDoor('door_front', { locked: true }).outcome, 'locked');
  r = api.setDoor('door_front', { open: 1 });
  assert.equal(r.ok, false); assert.equal(r.reason, 'locked');
  assert.equal(api.setDoor('door_front', { locked: false }).ok, true);
  assert.equal(api.setDoor('door_front', { open: 1 }).ok, true);
  assert.equal(api.setDoor('door_front', { locked: true }).ok, false, 'close it first');
  assert.equal(api.setDoor('door_front', { open: 0 }).ok, true);
  // the lee side: the front door opens freely in the back half
  L.dirFromDeg = 270; L.uGustEnv = 40;
  assert.equal(api.setDoor('door_front', { open: 1 }).outcome, 'opened');
  assert.equal(api.setDoor('door_front', { open: 0 }).ok, true);
  // outswing garage man door on the north wall with a north wind: held, then slammed shut when left unlatched
  L.dirFromDeg = 0; L.uGustEnv = 22;
  assert.equal(api.setDoor('door_garage_man', { open: 1 }).outcome, 'held');
  L.uGustEnv = 8;
  assert.equal(api.setDoor('door_garage_man', { open: 1 }).ok, true);
  S.house.doors.door_garage_man.latched = false; L.uGustEnv = 28; tick();
  assert.equal(S.house.doors.door_garage_man.open, 0, 'the wind slams an outswing door shut');
  // sliders: never ripped; the great slider unlatched in a west wind is a door in the wind
  L.dirFromDeg = 270; L.uGustEnv = 40;
  assert.equal(api.setDoor('slider_great_W', { open: 1 }).outcome, 'opened');
  assert.equal(api.setDoor('slider_great_W', { open: 0, latched: false }).ok, true);
  tick();
  assert.equal(S.house.doors.slider_great_W.open, 1);
  assert.equal(api.setDoor('slider_great_W', { open: 0 }).ok, true);
  // interior doors, windows, unknown ids
  assert.equal(api.setDoor('door_master', { open: 1 }).outcome, 'opened');
  assert.equal(api.setDoor('door_master', { locked: true }).ok, false);
  assert.equal(api.setDoor('door_masterCloset', { open: 0 }).ok, true);
  assert.equal(api.setDoor('door_masterCloset', { locked: true }).ok, true);
  assert.equal(api.setDoor('nothing', { open: 1 }).ok, false);
  L.u1m = 5;
  assert.equal(api.setDoor('win_bed2_E', { open: 1 }).ok, true);
  assert.equal(api.setDoor('win_bed2_E', { open: 0 }).ok, true);
  api.placePanel('win_bed2_E', 4); api.placePanel('win_bed2_E', 4);
  assert.equal(api.setDoor('win_bed2_E', { open: 1 }).ok, false);
  // the garage: cannot be lifted into a windward gust; the roll-up mirrors into the openings table
  L.dirFromDeg = 90; L.uGustEnv = 20;
  assert.equal(api.setGarageDoor({ open: 1 }).ok, false);
  L.uGustEnv = 5;
  assert.equal(api.setGarageDoor({ open: 1 }).ok, true);
  assert.equal(S.house.openings.door_garage_roll.open, 1);
  assert.equal(api.setGarageBrace(true).ok, false, 'close the door first');
  assert.equal(api.setDoor('door_garage_roll', { open: 0 }).ok, true);
  assert.equal(api.setGarageBrace(true).ok, true);
  assert.ok(S.house.garageDoor.threshold > 58 && S.house.garageDoor.braced && S.house.openings.door_garage_roll.braced);
  assert.equal(api.setGarageBrace(false).ok, true);
  assert.ok(S.house.garageDoor.threshold < 66);
  // the self-closing steel door
  assert.equal(api.setDoor('door_laundry_garage', { open: 1 }).ok, true);
  for (let i = 0; i < 3; i++) tick();
  assert.equal(S.house.doors.door_laundry_garage.open, 0); assert.equal(S.house.doors.door_laundry_garage.latched, true);
  // the screen door bangs above 12 m/s until latched (one event per episode)
  L.uGustEnv = 15; L.dirFromDeg = 270;
  const before = h.events.filter(e => e.name === 'house:doorSlam' && e.id === 'door_cage_screen').length;
  tick(); tick(); tick();
  assert.equal(h.events.filter(e => e.name === 'house:doorSlam' && e.id === 'door_cage_screen').length, before + 1);
  assert.equal(api.setDoor('door_cage_screen', { open: 0, latched: true }).ok, true);
  assert.equal(S.house.cage.doorLatched, true);
  // the attic hatch
  L.u1m = 20; assert.equal(api.setAttic(true).ok, false);
  L.u1m = 5; assert.equal(api.setAttic(true).ok, true);
  assert.equal(api.roomPressurePa('bed2'), S.house.pressure.dpRoomPa.bed2);
  assert.equal(api.roomPressurePa('nowhere'), 0);
  h.dispose();
});
