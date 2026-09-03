/**
 * house/index.js — the house model (ARCHITECTURE §4 step 5, §6.3, §8.2, §15 WP-8; DESIGN §3, §6).
 * Owner: E3 house. Writes: `house` only. Reads (sim-time only, never uInst/uG3/windLoadPa): local.{u1m, uGustEnv,
 * uStruct, dirFromDeg, rainWallMmPerH, rainMmPerH, pHpa, dPdtHpaPerH, tAirC, cloudFrac, rhOut, sun, eyeFactor, reversal,
 * streetWaterM}, cues.windLoadEnvPa, utilities.{power, generator}, hood.{damage, impactQueue}, player.room (CO dose),
 * objects.detector_*, clock.{simTime, hour, isNight}.
 * Consumes: storm:eyeEnter, storm:eyeExit, storm:windReversal, hood:debrisImpact, power:lost, power:restored.
 * Emits: every house:* event of §5 (see the sub-modules).
 * Budget (§10): ≤ 0.025 ms per 5-s sub-step; no allocation in step(); 12 sub-steps/frame at 60×.
 *
 * Determinism: everything here advances in sim time in fixed 5-s sub-steps from the deterministic envelopes; the only
 * randomness is stream 'damage' (thresholds drawn once in init, fixed order) and hash01 bucket rolls (§8.1). Impacts are
 * read from hood.impactQueue (state) rather than from the bus so the outcome does not depend on flush cadence; the bus
 * listener is a fallback for a hood that emits without queueing. The cage fold and stage 5 advance in sim time (cage.js).
 * `update()` is a no-op: the house has no real-time process (the renderer animates from state).
 */
import { EV } from '../core/events.js';
import { bucketOf } from './structure.js';
import { initOpenings, stepOpenings, applyImpact } from './openings.js';
import { initGarage, stepGarage } from './garage.js';
import { initCage, stepCage } from './cage.js';
import { initRoof, stepRoof, applyRoofImpact } from './roof.js';
import { initIntrusion, stepIntrusion } from './intrusion.js';
import { initPressure, stepPressure } from './pressure.js';
import { initThermal, stepThermal } from './thermal.js';
import { initCO, stepCO, detectorLive } from './co.js';
import { initLedgers, stepLedgers, onPowerRestored } from './ledgers.js';
import { createApi } from './api.js';
import { LEAK_POINT_IDS } from '../core/ids.js';

export { bucketOf, bucketRoll, componentU, integralFailed, thresholdFromHash, thresholdFromStream } from './structure.js';

/** @type {object|null} the house runtime (H) */
let H = null;
let offs = [];
/** Stable object: methods are installed by init() and cleared by dispose(), so `modules.house.api` is always the same reference. */
export const api = {};

export async function init(ctx) {
  const state = ctx.state;
  const seed = state.meta.seed >>> 0;
  H = {
    ctx, state, S: state.house, L: state.local, C: state.cues, clock: state.clock,
    seed, opts: state.meta.options || {},
    damage: ctx.rng.fork('damage'),
    hash01: (...keys) => ctx.rng.hash01(...keys),
    bus: ctx.bus,
    emit: (name, payload) => ctx.bus.emit(name, payload || {}),
    now: () => state.clock.simTime,
    k: bucketOf(state.clock.simTime), newBucket: false,
    priv: {},
    flags: { failedOpenings: 0, lastOpeningFailSim: -1e9, garageFailedSim: -1e9, reversalSim: null, eyeExitSim: null, lastImpactSim: -1e9, impactsSeen: 0 },
    detectorLive: (id, now) => detectorLive(H, id, now),
  };
  initOpenings(H); initGarage(H); initCage(H); initRoof(H); initIntrusion(H);
  initPressure(H); initThermal(H); initCO(H); initLedgers(H);
  H.S.eyeStartSim = null; H.S.damageScore = 0; H.S.mildew = 0;
  H.priv.lastImpactSim = state.clock.simTime - 1;
  for (const k of Object.keys(api)) delete api[k];
  Object.assign(api, createApi(H));

  const on = (name, fn) => offs.push(ctx.bus.on(name, fn, { module: 'house' }));
  on(EV.STORM_EYE_ENTER, (e) => { if (H && H.S.eyeStartSim == null) H.S.eyeStartSim = e.simTime ?? H.now(); });
  on(EV.STORM_EYE_EXIT, (e) => { if (H) H.flags.eyeExitSim = e.simTime ?? H.now(); });
  on(EV.STORM_WIND_REVERSAL, (e) => { if (H) H.flags.reversalSim = e.simTime ?? H.now(); });
  on(EV.POWER_RESTORED, () => { if (H) onPowerRestored(H); });
  on(EV.POWER_LOST, () => { /* the ledgers, thermal and the chirp read utilities.power each sub-step */ });
  on(EV.HOOD_DEBRIS_IMPACT, (e) => { if (H && !queued(e)) handleImpact(e.surface, e.energyJ, e.simTime); });
  return api;
}

/** Is this impact represented in hood.impactQueue (then the sub-step scan handles it)? */
function queued(e) {
  const q = H.state.hood?.impactQueue;
  if (!q || !q.length) return false;
  for (let i = 0; i < q.length; i++) { const imp = q[i]; if (imp.surface === e.surface && imp.simTime === e.simTime && imp.class === e.class) return true; }
  return false;
}

function handleImpact(surface, energyJ, simTime) {
  if (!H) return;
  if (surface === 'roof') applyRoofImpact(H, energyJ);
  else if (H.S.openings[surface]) applyImpact(H, surface, energyJ);
  H.flags.impactsSeen++;
  if (simTime != null && simTime > H.flags.lastImpactSim) H.flags.lastImpactSim = simTime;
}

/** Sim-side impacts fired since the last sub-step, read from the queue (warp- and cadence-exact). */
function scanImpactQueue() {
  const q = H.state.hood?.impactQueue;
  if (!q || !q.length) return;
  let last = H.priv.lastImpactSim, newest = last;
  for (let i = 0; i < q.length; i++) {
    const imp = q[i];
    if (!imp.fired || imp.simTime <= last) continue;
    if (imp.surface === 'roof') applyRoofImpact(H, imp.energyJ);
    else if (H.S.openings[imp.surface]) applyImpact(H, imp.surface, imp.energyJ);
    H.flags.impactsSeen++;
    if (imp.simTime > newest) newest = imp.simTime;
  }
  H.priv.lastImpactSim = newest;
}

/** ARCHITECTURE §4 step 5 — one fixed 5-s sub-step of the house. */
export function step(h) {
  if (!H) return;
  const k = bucketOf(H.now());
  H.newBucket = k !== H.k; H.k = k;
  scanImpactQueue();
  // the structure
  stepGarage(H, h); stepCage(H, h); stepOpenings(H, h); stepRoof(H, h);
  // water, air, heat, gas, ledgers
  stepIntrusion(H, h); stepPressure(H, h); stepThermal(H, h); stepCO(H, h); stepLedgers(H, h);
  // the eye (state edge; the listener is the fallback when the storm emits before the field moves)
  if (H.S.eyeStartSim == null && H.L.eyeFactor >= 0.5) H.S.eyeStartSim = H.now();
  H.S.damageScore = damageScore();
}

function damageScore() {
  const S = H.S;
  let sl = 0; for (let i = 0; i < 4; i++) sl += S.roof.shingleLoss[i];
  let collapsed = 0, sag = 0, floor = 0;
  for (let i = 0; i < LEAK_POINT_IDS.length; i++) { const lp = S.ceilingLeaks[LEAK_POINT_IDS[i]]; if (lp.collapsed) collapsed++; else if (lp.sag >= 1) sag++; }
  for (const key in S.floorWater) floor += S.floorWater[key].litres;
  const score = 0.25 * (S.garageDoor.failed ? 1 : 0) + 0.2 * S.cage.stage / 5 + Math.min(0.25, 0.08 * H.flags.failedOpenings)
    + 0.15 * (sl / 4) + 0.05 * Math.min(2, collapsed) + 0.025 * Math.min(2, sag) + 0.05 * Math.min(1, floor / 50);
  return Math.min(1, score);
}

/** No real-time process in the house (contract slot). */
export function update() {}

export function dispose() {
  for (const off of offs) { try { off(); } catch { /* ignore */ } }
  offs = []; H = null;
  for (const k of Object.keys(api)) delete api[k];
}

/** Test/debug access to the runtime (thresholds, private trackers). */
export function _runtime() { return H; }
