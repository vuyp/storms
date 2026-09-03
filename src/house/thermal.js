/**
 * house/thermal.js — the indoor climate (DESIGN §6.11; ARCHITECTURE §8.2 "Thermal"; research H §4.1 step 6).
 * Owner: E3 house. Writes: house.thermal.*.
 * Reads (sim-time only): local.{tAirC, cloudFrac, sun.elDeg}, utilities.{power, generator}, house.openings (open fraction).
 *
 *   tIn += (tTarget − tIn)·(1 − exp(−h/τ)),  tTarget = tAirC + 3.0·sealed + roofGain + 0.5·genAdjacent,
 *   roofGain = 2·clamp(sun.elDeg/45, 0, 1)·(1 − 0.7·cloudFrac),  sealed = hvacOn ? 0 : clamp(1 − 2·openFracHouse, 0, 1),
 *   genAdjacent = 1 with the generator running on the lanai or in the garage.
 *   τ = 4 h with the A/C off and the house sealed (a CBS house on a slab), sliding to 40 min when the bare windows are
 *   opened after the storm; 20 min toward 24 °C while the A/C runs. rhIn → 90 % (τ 2 h) with the A/C off, 50 % (τ 20 min) on.
 * τ note: DESIGN quotes τ = 3 h but its own acceptance number (24 → 30.9 ± 0.3 °C after 6 h toward 33) is the 4-h
 * curve (3 h gives 31.8); the +3 °C sealed gain is kept because the T+8 ≥ 28.5 °C reference needs it, so τ = 4 h.
 */
import { ENVELOPE_OPENING_IDS } from './structure.js';

export const TAU_SEALED_S = 4 * 3600, TAU_OPEN_S = 40 * 60, TAU_HVAC_S = 20 * 60;
export const SEALED_GAIN_C = 3.0, GEN_ADJ_GAIN_C = 0.5, HVAC_SET_C = 24;
const CONDITIONED = ENVELOPE_OPENING_IDS.filter(id => id !== 'door_garage_roll' && id !== 'door_garage_man');

/** Pure (ARCHITECTURE §15 export `thermal.target`). */
export function target(tAirC, sealed, sunElDeg, cloudFrac, genAdjacent) {
  const roofGain = 2 * Math.min(1, Math.max(0, sunElDeg / 45)) * (1 - 0.7 * cloudFrac);
  return tAirC + SEALED_GAIN_C * sealed + roofGain + GEN_ADJ_GAIN_C * (genAdjacent ? 1 : 0);
}

/** Magnus dew point. */
export function dewPointC(tC, rh) {
  const r = Math.min(1, Math.max(0.01, rh));
  const g = Math.log(r) + 17.62 * tC / (243.12 + tC);
  return 243.12 * g / (17.62 - g);
}

export function initThermal(H) {
  const t = H.S.thermal;
  const on = acAvailable(H);
  t.hvacOn = on; t.fanOn = on;
  t.tInC = on ? HVAC_SET_C : H.L.tAirC; t.rhIn = on ? 0.5 : 0.85; t.tdInC = dewPointC(t.tInC, t.rhIn);
  t.sealed = on ? 0 : 1; t.tTargetC = on ? HVAC_SET_C : target(H.L.tAirC, 1, H.L.sun.elDeg, H.L.cloudFrac, false);
}

function acAvailable(H) {
  const U = H.state.utilities?.power;
  if (!U) return false;
  return !!(U.on && U.breakers?.main && U.breakers?.ac);
}

export function openFracHouse(H) {
  let n = 0;
  for (let i = 0; i < CONDITIONED.length; i++) { const o = H.S.openings[CONDITIONED[i]]; if (o.failed || o.open > 0.2) n++; }
  return n / CONDITIONED.length;
}

export function stepThermal(H, h) {
  const t = H.S.thermal, L = H.L;
  const U = H.state.utilities?.power, G = H.state.utilities?.generator;
  const ac = acAvailable(H);
  t.hvacOn = ac && t.tInC > HVAC_SET_C - 0.5;
  t.fanOn = !!((U?.on && U.breakers?.main) || (G?.running && G.circuits?.includes('fan')));
  const of = openFracHouse(H);
  const sealedRaw = Math.min(1, Math.max(0, 1 - 2 * of));
  t.sealed = t.hvacOn ? 0 : sealedRaw;
  const genAdj = !!(G?.running && (G.placement === 'garage' || G.placement === 'lanai'));
  let tau, tTarget;
  if (t.hvacOn) { tau = TAU_HVAC_S; tTarget = HVAC_SET_C; }
  else { tau = TAU_OPEN_S + (TAU_SEALED_S - TAU_OPEN_S) * sealedRaw; tTarget = target(L.tAirC, t.sealed, L.sun.elDeg, L.cloudFrac, genAdj); }
  t.tTargetC = tTarget;
  t.tInC += (tTarget - t.tInC) * (1 - Math.exp(-h / tau));
  const rhTarget = t.hvacOn ? 0.5 : (of > 0.3 ? Math.min(0.9, L.rhOut ?? 0.85) : 0.9);
  const rhTau = t.hvacOn ? TAU_HVAC_S : 2 * 3600;
  t.rhIn += (rhTarget - t.rhIn) * (1 - Math.exp(-h / rhTau));
  t.tdInC = dewPointC(t.tInC, t.rhIn);
}
