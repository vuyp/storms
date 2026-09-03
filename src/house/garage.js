/**
 * house/garage.js — the roll-up garage door (DESIGN §6.4; ARCHITECTURE §8.2 "Garage door").
 * Owner: E3 house. Writes: house.garageDoor.*, house.openings.door_garage_roll.{open, braced, failed, failCause}.
 * Reads (sim-time only): local.{uStruct, dirFromDeg}, cues.windLoadEnvPa.
 * Events: house:garageBuckle {}, house:garageFailed {}, house:atticWhump.
 *
 *   load = uStruct·max(0, cos(dirFrom − 90°))          (the door faces east; no load while it stands open)
 *   pumpAmpEnv = 0.03·clamp(windLoadEnvPa·cos/2500, 0, 1)  (hashed; render adds 0.01·windLoadPa/2500 of wobble)
 *   buckle when load ≥ threshold − 2 (once); fail when load ≥ threshold — a threshold component, so the failure
 *   is on the sub-step whose 10-s structural gust envelope carried the bucket max over the line.
 *   threshold N(57, 4) unbraced / N(66, 4) braced, both drawn once per seed from stream 'damage'.
 */
import { EV } from '../core/events.js';
import { cosFace, thresholdFromStream } from './structure.js';

/**
 * Threshold means, DESIGN §6.4: N(57, 4) unbraced, N(66, 4) braced. On the §2.7 direction schedule (E at T−1.5,
 * E/ENE at T−1.25) the bucket-max front load is ≈ 55.1 m/s → Φ((55.1 − 57)/4) ≈ 32 % unbraced, ≈ 0.3 % braced
 * (200-seed Monte Carlo on the synthetic record: 32 % / 0 %). The fraction is steep in the RMW direction (≈ 8 points
 * per 5° of dirFrom), so the spec's "μ re-tuned by ≤ 2 m/s" clause is the knob if the real storm's inflow angle
 * puts the peak wind further south of east than the table's.
 */
export const GARAGE_MU_UNBRACED = 57, GARAGE_MU_BRACED = 66, GARAGE_SIGMA = 4;
const FACADE = 90;

export function initGarage(H) {
  const g = H.S.garageDoor;
  // fixed draw order from the 'damage' stream: unbraced first, braced second
  H.priv.garage = {
    thrUnbraced: thresholdFromStream(H.damage, GARAGE_MU_UNBRACED, GARAGE_SIGMA),
    thrBraced: thresholdFromStream(H.damage, GARAGE_MU_BRACED, GARAGE_SIGMA),
  };
  g.braced = !!H.opts.bracedGarageKitInstalled;
  g.threshold = g.braced ? H.priv.garage.thrBraced : H.priv.garage.thrUnbraced;
  g.open = 0; g.load = 0; g.pumpAmpEnv = 0; g.buckled = false; g.failed = false; g.failedSim = null;
  const o = H.S.openings.door_garage_roll;
  o.braced = g.braced; o.open = 0; o.failed = false; o.failCause = null;
}

export function setGarageBraced(H, on) {
  const g = H.S.garageDoor;
  g.braced = !!on;
  g.threshold = g.braced ? H.priv.garage.thrBraced : H.priv.garage.thrUnbraced;
  H.S.openings.door_garage_roll.braced = g.braced;
}

export function stepGarage(H) {
  const g = H.S.garageDoor, L = H.L;
  const cf = cosFace(L.dirFromDeg, FACADE);
  if (g.failed) { g.load = L.uStruct * cf; g.pumpAmpEnv = 0; return; }
  // an open door carries no wind load (the wind blows through); a half-open one is treated as open
  const closedFrac = g.open > 0.5 ? 0 : 1;
  g.load = L.uStruct * cf * closedFrac;
  g.pumpAmpEnv = 0.03 * Math.min(1, Math.max(0, H.C.windLoadEnvPa * cf / 2500)) * closedFrac;
  if (!g.buckled && g.load >= g.threshold - 2) {
    g.buckled = true;
    H.emit(EV.HOUSE_GARAGE_BUCKLE, { load: g.load, threshold: g.threshold });
  }
  if (g.load >= g.threshold) failGarage(H, 'wind');
}

export function failGarage(H, cause = 'wind') {
  const g = H.S.garageDoor;
  if (g.failed) return;
  g.failed = true; g.failedSim = H.now(); g.buckled = true; g.pumpAmpEnv = 0; g.open = 1;
  const o = H.S.openings.door_garage_roll;
  o.failed = true; o.failCause = cause; o.open = 1;
  H.flags.garageFailedSim = g.failedSim;
  H.emit(EV.HOUSE_GARAGE_FAILED, { cause, load: g.load, threshold: g.threshold });
  H.emit(EV.HOUSE_ATTIC_WHUMP, { source: 'garage' });
}
