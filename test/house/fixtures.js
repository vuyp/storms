/**
 * test/house/fixtures.js — a synthetic reference storm (DESIGN §2.7 / M §11, house-level columns) that writes
 * `state.local` and `state.cues` per sim time, plus a harness that runs the house module against it in fixed
 * 5-s sub-steps with headless bus semantics (flushSim after every sub-step), so the house tests need no storm module.
 *
 * The table is the hour-by-hour of DESIGN §2.7 with the three night bands as pulses, direction unwrapped through the
 * eye (E → ENE → NE → N → W → WSW → WNW), the eyewall gust factor 1.65 inside 1.4·RMW (35 km) and 1.55 outside, and
 * `uStruct = 1.38·u1m·(0.6 + 0.4·bandWind)`. Everything derived (rainWall, windLoadEnvPa, powerHazard, debrisRate,
 * dPdt, reversal, phase, the eye/reversal events, the sun) follows ARCHITECTURE §7 / DESIGN §5.2.
 */
import { createState, DAY_START_0 } from '../../src/core/state.js';
import { createBus } from '../../src/core/bus.js';
import { createRng } from '../../src/core/rng.js';
import { EV } from '../../src/core/events.js';
import * as house from '../../src/house/index.js';

const KT = 0.514444;
export const T0 = DAY_START_0 + 14 * 3600;
export const RMW_KM = 25;

// tRel, sust kt, dir (unwrapped °), P hPa, rain mm/h, tAir °C, r km, bandRain, bandWind, eyeFactor, cloudFrac
export const REFERENCE_TABLE = [
  [-32, 9, 90, 1011.4, 0, 26, 640, 0, 1, 0, 0.2],
  [-30, 10, 112, 1011.3, 0, 29, 600, 0, 1, 0, 0.3],
  [-27, 11, 112, 1011.2, 0, 32, 540, 0, 1, 0, 0.45],
  [-24, 12, 112, 1011.1, 0, 33, 480, 0, 1, 0, 0.6],
  [-21, 14, 112, 1010.9, 1, 32, 420, 0.1, 1, 0, 0.7],
  [-18.25, 16, 112, 1010.8, 0, 29, 340, 0, 1, 0, 0.8],
  [-17, 16.5, 112, 1010.7, 0, 27, 330, 0, 1, 0, 0.9],
  [-16.6, 16.5, 112, 1010.65, 2, 27, 325, 0.3, 1.05, 0, 0.95],
  [-16.4, 17, 118, 1010.6, 20, 25, 322, 1.2, 1.17, 0, 1],
  [-15.5, 17.5, 118, 1010.55, 18, 25, 312, 1.1, 1.15, 0, 1],
  [-15.3, 18, 112, 1010.5, 1, 26, 310, 0.2, 1.02, 0, 0.9],
  [-14, 19, 112, 1010.2, 0.5, 26, 280, 0.1, 1, 0, 0.8],
  [-12.7, 20.5, 112, 1009.95, 1, 26, 254, 0.2, 1.03, 0, 0.95],
  [-12.5, 21, 120, 1009.9, 28, 25, 250, 1.6, 1.25, 0, 1],
  [-11.2, 22, 120, 1009.7, 25, 25, 224, 1.5, 1.22, 0, 1],
  [-11, 22.5, 112, 1009.6, 3, 26, 220, 0.4, 1.05, 0, 1],
  [-10, 25, 112, 1009.3, 3, 26, 200, 0.4, 1.05, 0, 1],
  [-9.5, 26, 115, 1009.05, 32, 25, 190, 1.4, 1.3, 0, 1],
  [-8.6, 28, 115, 1008.6, 30, 25, 172, 1.3, 1.28, 0, 1],
  [-8.4, 29, 112, 1008.5, 15, 25.5, 168, 0.8, 1.15, 0, 1],
  [-8, 30, 112, 1008.3, 15, 25.5, 160, 0.8, 1.15, 0, 1],
  [-7, 33, 112, 1007.5, 22, 25.5, 140, 1.0, 1.2, 0, 1],
  [-6, 37, 112, 1006.5, 25, 25.5, 120, 1.1, 1.2, 0, 1],
  [-5, 43, 112, 1004.7, 32, 26, 100, 1.2, 1.2, 0, 1],
  [-4, 50, 112, 1001.2, 38, 26, 80, 1.3, 1.15, 0, 1],
  [-3.1, 58, 112, 997.7, 42, 26, 62, 1.5, 1.1, 0, 1],
  [-2.5, 64, 112, 993.5, 55, 26, 50, 1.8, 1.05, 0, 1],
  [-2.25, 67, 106, 990.6, 65, 26, 45, 2.2, 1, 0, 1],
  [-2.0, 70, 100, 987.8, 68, 26, 40, 2.5, 1, 0, 1],
  [-1.75, 73, 95, 984, 70, 26, 35, 2.8, 1, 0, 1],
  [-1.5, 76, 90, 979.6, 70, 26, 30, 3, 1, 0, 1],
  [-1.25, 78, 85, 972.8, 70, 26, 25, 3, 1, 0, 1],
  [-1.0, 75, 67, 965.3, 35, 27, 20, 2, 1, 0.1, 1],
  [-0.85, 55, 55, 960, 8, 28, 17, 0.8, 1, 0.3, 0.9],
  [-0.69, 30, 45, 957, 2, 29, 13.8, 0.3, 1, 0.5, 0.7],
  [-0.5, 15, 30, 951.2, 0, 30, 10, 0, 1, 0.85, 0.3],
  [-0.3, 6, 0, 950.3, 0, 30, 6, 0, 1, 1, 0.2],
  [0, 5, -90, 950.0, 0, 30, 0, 0, 1, 1, 0.2],
  [0.3, 6, -110, 950.3, 0, 30, 6, 0, 1, 1, 0.2],
  [0.5, 22, -100, 951.2, 2, 29, 10, 0.2, 1, 0.85, 0.5],
  [0.69, 30, -80, 957, 10, 28, 13.8, 0.8, 1, 0.5, 0.9],
  [0.75, 55, -68, 957.5, 40, 27, 15, 2, 1, 0.3, 1],
  [0.85, 68, -68, 960, 60, 26, 17, 2.6, 1, 0.1, 1],
  [1.0, 78, -68, 965.3, 80, 26, 20, 3, 1, 0, 1],
  [1.25, 80, -68, 972.8, 80, 26, 25, 3, 1, 0, 1],
  [1.75, 75, -68, 981, 65, 26, 35, 2.5, 1, 0, 1],
  [2.0, 72, -68, 987.8, 50, 26, 40, 1.8, 1.05, 0, 1],
  [3.0, 60, -80, 997.3, 35, 26, 60, 1.5, 1.1, 0, 1],
  [4.0, 49, -90, 1001.2, 22, 26, 80, 1.2, 1.15, 0, 1],
  [5.0, 42, -90, 1004.7, 15, 26, 100, 1.0, 1.15, 0, 1],
  [6.0, 37, -75, 1006.5, 8, 26, 120, 0.8, 1.1, 0, 0.9],
  [8.0, 30, -68, 1008.3, 3, 26, 160, 0.4, 1.05, 0, 0.7],
  [10.0, 25, -55, 1009.3, 1, 26, 200, 0.2, 1, 0, 0.5],
  [12.0, 21, -45, 1009.8, 0, 26, 240, 0, 1, 0, 0.4],
  [15.0, 17, -45, 1010.5, 0, 25, 300, 0, 1, 0, 0.2],
  [16.75, 16, -45, 1010.7, 0, 26, 335, 0, 1, 0, 0.2],
  [18.0, 14, -30, 1010.8, 0, 28, 360, 0, 1, 0, 0.2],
  [24.0, 10, -30, 1011.2, 0, 34, 480, 0, 1, 0, 0.3],
  [30.0, 8, -30, 1011.4, 0, 27, 600, 0, 1, 0, 0.2],
  [48.0, 6, 0, 1011.6, 0, 33, 960, 0, 1, 0, 0.2],
  [72.0, 5, 45, 1011.6, 0, 33, 1400, 0, 1, 0, 0.2],
];

/** Linear interpolation of a table row at tRel; returns the row values and the segment slope of P (hPa/h). */
export function rowAt(tRel, table = REFERENCE_TABLE, out = null) {
  const res = out || { v: new Array(table[0].length).fill(0), dPdt: 0, i: 0 };
  const v = res.v;
  const last = table[table.length - 1];
  if (tRel <= table[0][0]) { for (let j = 0; j < v.length; j++) v[j] = table[0][j]; res.dPdt = 0; return res; }
  if (tRel >= last[0]) { for (let j = 0; j < v.length; j++) v[j] = last[j]; res.dPdt = 0; return res; }
  let i = res.i || 0;
  if (i >= table.length - 1 || table[i][0] > tRel) i = 0;
  while (table[i + 1][0] < tRel) i++;
  res.i = i;
  const a = table[i], b = table[i + 1];
  const f = (tRel - a[0]) / (b[0] - a[0]);
  for (let j = 0; j < v.length; j++) v[j] = a[j] + (b[j] - a[j]) * f;
  res.dPdt = (b[3] - a[3]) / (b[0] - a[0]);
  return res;
}

const DEG = Math.PI / 180;
export function sunElAt(hour) {
  if (hour >= 7.2 && hour <= 19.7) return 75 * Math.sin(Math.PI * (hour - 7.2) / 12.5);
  const d = hour < 7.2 ? 7.2 - hour : hour - 19.7;
  return -Math.min(40, 6 + 8 * Math.min(d, 12 - d + 0.001));
}

/**
 * The synthetic storm: writes local/cues/clock-derived fields for `simTime`, tracks integrals (rain total, street water,
 * reversal smoothing), the phase, and emits the storm events the house consumes.
 */
export function createSyntheticStorm(state, bus, { table = REFERENCE_TABLE, mul = {} } = {}) {
  const L = state.local, C = state.cues;
  let approachDir = null, reversalSmooth = 0, eyeIn = false, eyeExited = false, reversalFired = false;
  let swale = 0, street = 0, phase = 'prep', bandSeen = false, rainTotal = 0, lastSim = null;
  const dirOf = (unwrapped) => ((unwrapped % 360) + 360) % 360;
  const row = { v: new Array(table[0].length).fill(0), dPdt: 0, i: 0 };

  function write(simTime) {
    const tRel = (simTime - T0) / 3600;
    const dt = lastSim == null ? 0 : simTime - lastSim;
    lastSim = simTime;
    rowAt(tRel, table, row);
    const v = row.v, dPdt = row.dPdt;
    const kt = v[1], dirU = v[2], pHpa = v[3], rain = v[4], tAir = v[5], rKm = v[6], bandRain = v[7], bandWind = v[8], eyeFactor = v[9], cloudFrac = v[10];
    const u1m = kt * KT * (mul.wind ?? 1);
    const inCore = rKm < 1.4 * RMW_KM;
    const G = inCore ? 1.65 : 1.55;
    const bw = inCore ? 1 : bandWind;
    const dir = dirOf(dirU);
    L.u1m = u1m; L.uMean = u1m; L.uMarine = u1m / 0.78;
    L.uGustEnv = G * u1m * bw; L.uStruct = 1.38 * u1m * (0.6 + 0.4 * bw);
    L.uInst = u1m; L.uG3 = L.uGustEnv;   // real-time fields exist but the house must never read them
    L.dirFromDeg = dir; L.dirInstDeg = dir;
    L.pHpa = pHpa; L.dPdtHpaPerH = dPdt;
    L.rainMmPerH = rain * (mul.rain ?? 1);
    for (let i = 0; i < 8; i++) L.rainWallMmPerH[i] = L.rainMmPerH * (Math.max(0, u1m * Math.cos((dir - i * 45) * DEG)) / 7 + 0.1);
    L.rainAngleDeg = Math.atan(u1m / 7) / DEG;
    rainTotal += L.rainMmPerH * dt / 3600; L.rainTotalMm = rainTotal;
    L.bandRain = bandRain; L.bandWind = bw; L.bandFrontM = 1e6;
    L.tAirC = tAir; L.tdC = 24; L.rhOut = 0.89; L.cloudFrac = cloudFrac; L.cloudBaseM = 1000;
    L.eyeFactor = eyeFactor; L.rKm = rKm; L.phiDeg = 45;
    // street water bucket (DESIGN §6.8, simplified)
    const excess = Math.max(0, L.rainMmPerH - 50);
    swale += 0.08 * excess / 25 * dt / 3600; swale -= swale * (1 - Math.exp(-dt / (3 * 3600)));
    if (swale > 0.8) { street += swale - 0.8; swale = 0.8; }
    street -= street * (1 - Math.exp(-dt / (3 * 3600)));
    L.swaleWaterM = swale; L.streetWaterM = street; L.pondRiseM = Math.min(1.2, rainTotal / 200);
    // sun / clock
    const hour = (((simTime % 86400) + 86400) % 86400) / 3600;
    L.sun.azDeg = 180; L.sun.elDeg = sunElAt(hour);
    state.clock.hour = hour; state.clock.isNight = L.sun.elDeg < -6; state.clock.tRel = tRel;
    state.clock.dayIndex = Math.floor((simTime - state.clock.dayStart0) / 86400);
    // phase (DESIGN §2.1, house-level)
    if (bandRain >= 1) bandSeen = true;
    const departing = tRel > 0;
    let ph;
    if (eyeFactor >= 0.5) ph = 'eye';
    else if (inCore) ph = departing ? 'eyewallBack' : 'eyewallFront';
    else if (u1m >= 33) ph = departing ? 'hurricaneBack' : 'hurricane';
    else if (departing) ph = (u1m < 12 && tRel > 6) ? 'aftermath' : 'subsiding';
    else if (u1m >= 17) ph = 'ts';
    else if (bandSeen) ph = 'bands';
    else ph = 'prep';
    if (ph !== phase) { bus.emit(EV.STORM_PHASE_CHANGED, { from: phase, to: ph }); phase = ph; }
    L.phase = ph; state.clock.phase = ph;
    if (ph === 'ts' && approachDir == null) approachDir = dir;
    // reversal (10-min smoothing)
    let rev = 0;
    if (approachDir != null) {
      let d = Math.abs(((dir - approachDir) % 360 + 540) % 360 - 180);
      rev = Math.min(1, Math.max(0, (d - 60) / 120));
    }
    reversalSmooth += (rev - reversalSmooth) * (dt > 0 ? 1 - Math.exp(-dt / 600) : 1);
    L.reversal = reversalSmooth;
    // cues
    C.windLoadEnvPa = 0.6 * L.uGustEnv * L.uGustEnv; C.windLoadPa = C.windLoadEnvPa;
    C.eyeFactor = eyeFactor; C.reversal = reversalSmooth; C.earPop = Math.abs(dPdt);
    const treeFactor = state.meta.options.service === 'underground' ? 0 : 0.3;
    C.powerHazard = L.uGustEnv > 30 ? (1 / 3600) * Math.exp(0.11 * (L.uGustEnv - 30)) * (1 + treeFactor) : 0;
    const damage = state.hood.damage;
    C.debrisRate = 0.0015 * Math.max(0, L.uGustEnv - 20) ** 2 * (1 + 0.6 * damage);
    for (let i = 0; i < 8; i++) C.leakRate[i] = state.house.roof.atticWaterL[i] / 10;
    // events
    if (!eyeIn && eyeFactor >= 0.5) { eyeIn = true; bus.emit(EV.STORM_EYE_ENTER, {}); }
    if (eyeIn && !eyeExited && eyeFactor < 0.5) { eyeExited = true; bus.emit(EV.STORM_EYE_EXIT, {}); }
    if (!reversalFired && eyeExited && reversalSmooth >= 0.5) { reversalFired = true; bus.emit(EV.STORM_WIND_REVERSAL, { fromDeg: approachDir, toDeg: dir }); }
  }
  return { write, get phase() { return phase; } };
}

/**
 * The harness. Options: seed, options (HouseOptions), outageTRel (null = never), restoreTRel, startTRel, frameS
 * (frame length in sim seconds; the sim block always sub-steps at 5 s), script: (harness, tRel) => void called before
 * each sub-step, mul: {wind, rain} multipliers on the table.
 */
export function createHouseHarness({ seed = 7, options = {}, outageTRel = -5.9, restoreTRel = null, startTRel = -32, frameS = 5, script = null, mul = {}, table = REFERENCE_TABLE } = {}) {
  const state = createState({ seed, options, headless: true });
  const bus = createBus(state.clock);
  const rng = createRng(state.meta.seed);
  state.clock.T0 = T0; state.clock.dayStart0 = DAY_START_0;
  state.clock.startSim = T0 + startTRel * 3600; state.clock.simTime = state.clock.startSim;
  const storm = createSyntheticStorm(state, bus, { table, mul });
  storm.write(state.clock.simTime);
  const events = [];
  bus.on('*', (e) => events.push(e), { sim: true });
  const ctx = { state, bus, rng, modules: {}, headless: true, quality: { tier: 'low', gpu: null }, params: {}, options, clock: { api: { SUB_STEP: 5 } } };
  const h = {
    state, bus, rng, ctx, events, storm, house,
    tRel: () => (state.clock.simTime - T0) / 3600,
    sim: () => state.clock.simTime,
    powerLost: false, powerRestored: false,
    acc: 0,
    /** Advance to tRel (hours) in frames of `frameS` sim seconds, sub-stepping at 5 s with headless semantics. */
    advanceTo(tRelTarget, opts = {}) {
      const fs = opts.frameS ?? frameS;
      const target = T0 + tRelTarget * 3600;
      let guard = 0;
      while (state.clock.simTime < target - 1e-6 && guard++ < 1e8) {
        const remaining = target - state.clock.simTime;
        if (remaining < 5) h.acc = 5;                       // a tail shorter than a sub-step lands on the next boundary
        else h.acc += Math.min(fs, Math.max(0, remaining - h.acc));
        let steps = 0;
        while (h.acc >= 5 - 1e-9 && steps < 200) { h.acc -= 5; h.subStep(); steps++; }
        bus.flush();
      }
      bus.flush();
    },
    subStep() {
      state.clock.simTime += 5;
      const tRel = h.tRel();
      storm.write(state.clock.simTime);
      // utilities: the outage script
      const U = state.utilities.power;
      if (outageTRel != null && !h.powerLost && tRel >= outageTRel) {
        h.powerLost = true; U.on = false; U.lostSim = state.clock.simTime; U.cause = 'transformer';
        bus.emit(EV.POWER_LOST, { cause: 'transformer' });
      }
      if (restoreTRel != null && h.powerLost && !h.powerRestored && tRel >= restoreTRel) {
        h.powerRestored = true; U.on = true; U.restoredSim = state.clock.simTime; U.lostSim = null;
        bus.emit(EV.POWER_RESTORED, {});
      }
      U.hoursSinceOutage = U.on || U.lostSim == null ? 0 : (state.clock.simTime - U.lostSim) / 3600;
      // hood: damage ratchets with the envelope (a proxy for the neighbourhood)
      state.hood.damage = Math.max(state.hood.damage, Math.min(1, Math.max(0, (state.local.uGustEnv - 30) / 100)));
      if (script) script(h, tRel);
      house.step(5);
      bus.flushSim();
    },
    /** Count events by name (optionally with a predicate). */
    count(name, pred = null) { let n = 0; for (const e of events) if (e.name === name && (!pred || pred(e))) n++; return n; },
    find(name, pred = null) { return events.find(e => e.name === name && (!pred || pred(e))) || null; },
    dispose() { house.dispose(); },
  };
  house.dispose();
  return house.init(ctx).then(() => h);
}

/** Convenience: run a whole reference storm for one seed and return the harness. */
export async function runReference(seed, { from = -7, to = 4, ...rest } = {}) {
  const h = await createHouseHarness({ seed, startTRel: from, ...rest });
  h.advanceTo(to);
  return h;
}

