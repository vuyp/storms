/**
 * house/openings.js — the envelope openings (DESIGN §3.4, §6.6; ARCHITECTURE §8.2 "Openings").
 * Owner: E3 house. Writes: house.openings[*].{bowEnvM, failed, failCause, hazardAcc, latched, open}.
 * Reads (sim-time only): local.{uStruct, dirFromDeg}, cues.windLoadEnvPa, hood.{damage, impactQueue}, meta.options.impactWindows.
 * Events: house:openingFailed {id, cause}, house:sliderUnlatch {id}.
 * Budget: 15 openings × O(1) per sub-step, no allocation.
 *
 * Bare-glass failure per bucket: p = 6e-4·max(0, uStruct·c − 30)·(1 + 2·hood.damage)·mult, evaluated on the
 * running bucket max of uStruct·c against the bucket's roll; mult = shuttered ? 0.08·(1 + 3·(1 − fastening)) : 1
 * (a partly panelled window is bare over its missing fraction), × 0.03 impact glass, × 3 while the grill (class
 * 'bin') is queued against that opening. Debris strikes accumulate an integral hazard (hazardAcc) against one
 * per-opening uniform: a frond never breaks glass, a 2×4 nearly always does.
 * Sliders: bowEnvM = 0.02·windLoadEnvPa·cos_face/1000·(braced ? 0.5 : 1) when windward and unshuttered (0 in the lee,
 * so the west sliders bow only after the reversal); latch pops with p 0.08/bucket while bowEnvM > 0.03.
 */
import { EV } from '../core/events.js';
import { OPENINGS, OPENING_ROOM } from '../core/ids.js';
import { bucketMaxUpdate, createBucketMax, glassLoadCoef, cosFace, componentU, integralFailed, GLAZED_OPENING_IDS } from './structure.js';

const P_COEF = 6e-4;
const P_ONSET = 30;          // m/s of uStruct·c below which bare glass has no hazard
const UNLATCH_P = 0.08;      // per bucket while bowEnvM > 0.03
const BOW_UNLATCH_M = 0.03;

export function initOpenings(H) {
  const seed = H.seed;
  H.priv.openings = {};
  for (const id of GLAZED_OPENING_IDS) {
    const def = OPENINGS[id];
    H.priv.openings[id] = {
      id, facade: H.S.openings[id].facadeDeg, areaM2: def.w * def.h, kind: def.kind,
      glass: createBucketMax(), unlatch: createBucketMax(),
      uDebris: componentU(seed, `debris:${id}`),
      slider: def.kind === 'slider',
    };
  }
  H.flags.failedOpenings = 0;
  H.flags.lastOpeningFailSim = -1e9;
  H.flags.grillQueued = new Set();
}

/** Multiplier of the bare-glass hazard from shutters/panels/impact glass (0 = fully protected). */
export function hazardMult(o, impactWindows) {
  let mult;
  if (o.shuttered) mult = 0.08 * (1 + 3 * (1 - Math.min(1, Math.max(0, o.fastening))));
  else if (o.panelsNeeded > 0 && o.panelsPlaced > 0) {
    const frac = Math.min(1, o.panelsPlaced / o.panelsNeeded);
    mult = frac * 0.08 * (1 + 3 * (1 - Math.min(1, Math.max(0, o.fastening)))) + (1 - frac);
  } else mult = 1;
  if (impactWindows) mult *= 0.03;
  return mult;
}

/** Rebuild the "grill queued against this façade" set from hood.impactQueue once per bucket (the queue is bucket-drawn). */
function refreshGrillSet(H) {
  const set = H.flags.grillQueued;
  set.clear();
  const q = H.state.hood?.impactQueue;
  if (!q || !q.length) return;
  for (let i = 0; i < q.length; i++) {
    const imp = q[i];
    if (imp && !imp.fired && imp.class === 'bin' && H.S.openings[imp.surface]) set.add(imp.surface);
  }
}

export function stepOpenings(H, h) {
  const L = H.L, S = H.S;
  const uStruct = L.uStruct, dir = L.dirFromDeg;
  const wl = H.C.windLoadEnvPa;
  const damage = Math.min(1, Math.max(0, H.state.hood?.damage ?? 0));
  const k = H.k;
  if (H.newBucket) refreshGrillSet(H);
  const impactWindows = !!H.opts.impactWindows;

  for (let i = 0; i < GLAZED_OPENING_IDS.length; i++) {
    const id = GLAZED_OPENING_IDS[i];
    const o = S.openings[id];
    const p = H.priv.openings[id];
    const cf = cosFace(dir, p.facade);

    // slider bow (sim-time envelope; the renderer adds the real-time wobble from windLoadPa)
    if (p.slider) {
      if (o.failed || o.shuttered || cf <= 0) o.bowEnvM = 0;
      else o.bowEnvM = 0.02 * wl * cf / 1000 * (o.braced ? 0.5 : 1);
      if (!o.failed && o.latched && !o.braced && o.bowEnvM > BOW_UNLATCH_M) {
        bucketMaxUpdate(p.unlatch, k, 1);
        if (!p.unlatch.rolled && UNLATCH_P >= H.hash01('unlatch', id, k)) {
          p.unlatch.rolled = true;
          o.latched = false; o.open = 1;
          const d = S.doors[id]; if (d) { d.latched = false; d.open = 1; d.targetOpen = 1; }
          H.emit(EV.HOUSE_SLIDER_UNLATCH, { id });
        }
      }
    }
    if (o.failed) continue;

    // bare-glass failure by pressure/debris load (per-bucket component on the running max)
    const load = uStruct * glassLoadCoef(dir, p.facade);
    bucketMaxUpdate(p.glass, k, load);
    let mult = hazardMult(o, impactWindows);
    if (H.flags.grillQueued.has(id)) mult *= 3;
    if (mult > 0 && !p.glass.rolled) {
      const pk = P_COEF * Math.max(0, p.glass.max - P_ONSET) * (1 + 2 * damage) * mult;
      if (pk > 0 && pk >= H.hash01('glass', id, k)) { p.glass.rolled = true; failOpening(H, o, 'pressure'); continue; }
    }
    // debris strikes (integral hazard accumulated by applyImpact)
    if (o.hazardAcc > 0 && integralFailed(o.hazardAcc, p.uDebris)) { failOpening(H, o, 'debris'); continue; }
  }
}

/** A sim-side impact on an opening surface (from hood.impactQueue or hood:debrisImpact). */
export function applyImpact(H, surface, energyJ) {
  const o = H.S.openings[surface];
  if (!o || o.failed || !H.priv.openings[surface]) return;
  // glass hazard from kinetic energy above a 15-J bruise threshold; shutters/panels/impact glass protect
  const mult = hazardMult(o, !!H.opts.impactWindows);
  if (mult <= 0) return;
  o.hazardAcc += Math.max(0, energyJ - 15) / 150 * mult;
}

export function failOpening(H, o, cause) {
  o.failed = true;
  o.failCause = cause;
  o.bowEnvM = 0;
  o.open = 1;                     // the opening is a hole now
  const d = H.S.doors[o.id]; if (d) { d.open = 1; d.targetOpen = 1; d.latched = false; }
  H.flags.failedOpenings++;
  H.flags.lastOpeningFailSim = H.now();
  H.emit(EV.HOUSE_OPENING_FAILED, { id: o.id, cause, room: OPENING_ROOM[o.id] });
  H.emit(EV.HOUSE_ATTIC_WHUMP, { source: o.id });
}

