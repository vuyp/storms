/** DESIGN §6.13 / ARCHITECTURE §13.6: carbon monoxide — the closed garage, the UL 2034 alarm, the dose, the spread. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHouseHarness } from './fixtures.js';

function generatorIn(h, placement) {
  const G = h.state.utilities.generator;
  G.placement = placement; G.running = true; G.fuelL = 15; G.circuits = ['fridge'];
}

test('generator in the closed garage: alarm within 8 min, 4 500 ppm·min of dose in 28 ± 3 min standing in it', async () => {
  const h = await createHouseHarness({ seed: 5, startTRel: -30, outageTRel: -30.5 });
  generatorIn(h, 'garage');
  h.state.player.room = 'garage';
  let alarmMin = null, doseMin = null, ppm10 = null;
  const t0 = h.sim();
  const sub = h.subStep;
  h.subStep = () => {
    sub();
    const m = (h.sim() - t0) / 60;
    if (alarmMin == null) { const a = h.find('house:coAlarm'); if (a) alarmMin = (a.simTime - t0) / 60; }
    if (doseMin == null && h.state.house.coDose >= 4500) doseMin = m;
    if (Math.abs(m - 10) < 1e-6) ppm10 = h.state.house.coPpm;
  };
  h.advanceTo(-29);
  assert.ok(alarmMin != null && alarmMin <= 8, `alarm at ${alarmMin} min`);
  assert.equal(h.find('house:coAlarm').detectorId, 'detector_garage');
  assert.ok(ppm10 > 150 && ppm10 < 400, `${ppm10} ppm at 10 min`);
  assert.ok(doseMin != null && doseMin >= 25 && doseMin <= 31, `dose 4 500 at ${doseMin} min`);
  assert.ok(h.count('house:coDose') >= 9, 'house:coDose at every 500');
  assert.equal(h.house.api.coRate(), 40);
  assert.ok(h.house.api.coPpmAt('garage') > 300 && h.house.api.coPpmAt('garage') < 400, 'a closed garage settles near 360 ppm');
  assert.equal(h.house.api.coPpmAt('bed2'), 0);
  assert.ok(h.state.house.coPpmByRoom.laundry < 1, 'the self-closing steel door keeps the laundry clean');
  assert.equal(h.count('house:coAlarm'), 1, 'one alarm per episode');
  h.dispose();
});

test('roll-up open: slower but still dangerous; the driveway is safe; the player outside takes no dose', async () => {
  const h = await createHouseHarness({ seed: 5, startTRel: -30, outageTRel: -30.5 });
  generatorIn(h, 'garage');
  assert.equal(h.house.api.setGarageDoor({ open: 1 }).ok, true);
  h.state.player.room = 'garage';
  assert.equal(h.house.api.coRate(), 12);
  h.advanceTo(-29.5);
  assert.ok(h.state.house.coDose < 4500 && h.state.house.coPpm < 250, `open garage ${h.state.house.coPpm.toFixed(0)} ppm at 30 min`);
  h.advanceTo(-28);
  assert.ok(h.state.house.coDose > 4500, 'two hours with the door open is still lethal');
  h.dispose();
  const d = await createHouseHarness({ seed: 5, startTRel: -30, outageTRel: -30.5 });
  generatorIn(d, 'driveway');
  d.state.player.room = 'garage';
  d.advanceTo(-29);
  assert.equal(d.state.house.coDose, 0); assert.equal(d.house.api.coRate(), 0);
  generatorIn(d, 'garage');
  d.state.player.room = 'outside';
  d.advanceTo(-28);
  assert.equal(d.state.house.coDose, 0); assert.equal(d.state.house.coPpm, 0);
  assert.ok(d.state.house.coPpmByRoom.garage > 100);
  d.dispose();
});

test('lanai generator with the slider open: CO into the great room, halving through the house; no hall alarm', async () => {
  const h = await createHouseHarness({ seed: 5, startTRel: -30, outageTRel: -30.5 });
  generatorIn(h, 'lanai');
  assert.equal(h.house.api.setDoor('slider_great_W', { open: 1 }).ok, true);
  assert.equal(h.house.api.setDoor('door_bed2', { open: 1 }).ok, true);
  h.state.player.room = 'great';
  h.advanceTo(-28);
  const c = h.state.house.coPpmByRoom;
  assert.ok(c.great > 20 && c.great < 80, `great ${c.great.toFixed(1)} ppm`);
  assert.ok(c.dining > 0.5 * c.great, 'the cased opening nearly equalises');
  assert.ok(c.bed2 > 0 && c.bed2 < 0.7 * c.frontHall, 'an open door halves per step');
  assert.equal(c.masterCloset < 0.5 * c.great, true);
  assert.equal(h.count('house:coAlarm'), 0);
  assert.equal(h.state.house.coDose, 0, 'below the 100-ppm floor');
  h.dispose();
});

test('a dead battery or a silenced detector suppresses the alarm; the alarm re-arms after the air clears', async () => {
  const h = await createHouseHarness({ seed: 5, startTRel: -30, outageTRel: -30.5 });
  h.state.objects.detector_garage.extra.battery = 0;
  generatorIn(h, 'garage');
  h.advanceTo(-29.5);
  assert.equal(h.count('house:coAlarm'), 0);
  h.dispose();
  const s = await createHouseHarness({ seed: 5, startTRel: -30, outageTRel: -30.5 });
  s.state.objects.detector_garage.extra.silencedUntilSim = s.sim() + 3600;
  generatorIn(s, 'garage');
  s.advanceTo(-29.5);
  assert.equal(s.count('house:coAlarm'), 0);
  s.state.objects.detector_garage.extra.silencedUntilSim = 0;
  s.advanceTo(-29.4);
  assert.equal(s.count('house:coAlarm'), 1);
  s.state.utilities.generator.running = false;
  s.house.api.setGarageDoor({ open: 1 });
  s.advanceTo(-28);
  assert.ok(s.state.house.coPpmByRoom.garage < 5);
  generatorIn(s, 'garage'); s.house.api.setGarageDoor({ open: 0 });
  s.advanceTo(-27.5);
  assert.equal(s.count('house:coAlarm'), 2, 're-armed');
  s.dispose();
});
