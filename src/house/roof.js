/**
 * house/roof.js — shingles, deck, the lanai-mast anemometer (DESIGN §3.6, §6.7; ARCHITECTURE §8.2 "Roof").
 * Owner: E3 house. Writes: house.roof.{shingleLoss, deckExposed, anemometerAlive, anemometerLastGust}
 * (atticWaterL is written by intrusion.js). Reads (sim-time only): local.{uStruct, uGustEnv, dirFromDeg}.
 * Events: house:shingleLoss {slope, fraction} at every 0.05 of loss on a slope.
 *
 *   shingleLoss[windward slope] += 0.002·max(0, uStruct·cos(dirFrom − slope) − 42)²·(1 − loss)·h/3600 — the uplift
 *   follows the flow over the hip (the projection), and the field saturates as the exposed tabs go; × 3 on the garage
 *   roof's slopes (N, E) once the garage door is in (its attic is pressurised from below, DESIGN §6.4). Hurricane clips:
 *   the deck is exposed only above 85 % loss (never in Cat 3).
 *   Anemometer: p 0.3 per bucket of dying while uStruct > 45; the console then freezes on `anemometerLastGust`.
 */
import { EV } from '../core/events.js';
import { slopeOfDir, slopeOfSector, cosFace } from './structure.js';

/** Tunables (exported for calibration tests): loss rate coefficient (fraction/h per (m/s)²) and onset (m/s). */
export const ROOF_PARAMS = { lossCoef: 0.0007, lossOnset: 42 };
/*
 * lossCoef: DESIGN §6.7 quotes 0.002 fraction/h per (m/s)², which strips 30–45 % of a windward hip in the reference
 * eyewall and, through the attic intake's (1 + 4·shingleLoss), puts the east reservoir at 40–55 L against the spec's own
 * 15–35 L acceptance (which is the intake at ≈ 1×). 0.0007 gives 7–11 % on a clipped, six-nail architectural roof at a
 * 55 m/s 10-s gust (FEMA MAT "partial loss" for post-2002 roofs; the 3-tab snowbird roof next door is the hood's own
 * model), keeps the reservoir inside the band, still reaches tier 4 (> 15 %) on the garage roof once the door is in,
 * and strips a slope completely in the Cat 5 preset.
 */
const ANEMO_P = 0.3, ANEMO_U = 45;
const DECK_LOSS = 0.85;
const SLOPE_DEG = [0, 90, 180, 270];
const GARAGE_SLOPES = [0, 1];   // N and E hips of roof C

export function initRoof(H) {
  const r = H.S.roof;
  for (let i = 0; i < 4; i++) r.shingleLoss[i] = 0;
  r.deckExposed = false; r.anemometerAlive = true; r.anemometerLastGust = 0;
  H.priv.roof = { notch: [0, 0, 0, 0], anemoK: -1 };
}

export function stepRoof(H, h) {
  const r = H.S.roof, L = H.L, P = H.priv.roof;
  const u = L.uStruct;
  const slope = slopeOfDir(L.dirFromDeg);
  const uSlope = u * cosFace(L.dirFromDeg, SLOPE_DEG[slope]);
  if (uSlope > ROOF_PARAMS.lossOnset) {
    const mult = (H.S.garageDoor.failed && GARAGE_SLOPES.includes(slope)) ? 3 : 1;
    const d = uSlope - ROOF_PARAMS.lossOnset;
    const before = r.shingleLoss[slope];
    const after = Math.min(1, before + ROOF_PARAMS.lossCoef * d * d * mult * (1 - before) * h / 3600);
    r.shingleLoss[slope] = after;
    if (Math.floor(after / 0.05) > P.notch[slope]) {
      P.notch[slope] = Math.floor(after / 0.05);
      H.emit(EV.HOUSE_SHINGLE_LOSS, { slope, fraction: after });
    }
    if (!r.deckExposed && after >= DECK_LOSS) r.deckExposed = true;
  }
  // anemometer
  if (r.anemometerAlive) {
    if (L.uGustEnv > r.anemometerLastGust) r.anemometerLastGust = L.uGustEnv;
    if (u > ANEMO_U && P.anemoK !== H.k) {
      P.anemoK = H.k;
      if (ANEMO_P >= H.hash01('anemo', H.k)) r.anemometerAlive = false;
    }
  }
}

/** A heavy body landing on the roof (the cage's 2 000-J collapse, a garage door): strips tabs where it lands. */
export function applyRoofImpact(H, energyJ) {
  if (energyJ < 500) return;
  const r = H.S.roof;
  const slope = slopeOfDir(H.L.dirFromDeg);
  r.shingleLoss[slope] = Math.min(1, r.shingleLoss[slope] + 0.01 * Math.min(4, energyJ / 500));
}

export { slopeOfSector };
