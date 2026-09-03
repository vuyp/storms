/**
 * house/pressure.js — interior/attic pressure, room differentials, door slams, ear pops, the attic whump
 * (DESIGN §3.5, §5.2 earPop, §10.1 doors; ARCHITECTURE §8.2 "Pressure"; research H §4.2).
 * Owner: E3 house. Writes: house.pressure.*, house.doors[*].{open, targetOpen, latched, slamCount}, house.openings[door].open.
 * Reads (sim-time only): local.{pHpa, dPdtHpaPerH, dirFromDeg, uGustEnv}, cues.windLoadEnvPa.
 * Events: house:doorSlam {id, cause:'wind'}, house:earPop {sign}, house:atticWhump {}.
 *
 *   pInside → pHpa with τ 20 s (2 s once an opening or the garage has failed); pAttic τ 60 s (2 s after a failure,
 *   5 s with the hall hatch open).
 *   dpRoomPa[room] = 100·(pInside − pHpa) + windLoadEnvPa·cos_face·(0.015 + 0.25·openFrac + 1.0·(failedInRoom ||
 *     (garageFailed && adjacentToGarage)))   — a sealed CBS house leaks only a few Pa (39 at the eyewall envelope).
 *   Interior doors: an unlatched door drifts/slams when the *room-to-room* differential (the common-mode lag cancels)
 *   exceeds 40 Pa, toward the side it swings into; hashed via slamCount. Latched doors only rattle (render/audio).
 *   Exterior doors: unlatched inswing front door slams open above a 25 m/s windward gust; outswing doors slam shut.
 *   Ear pops: one house:earPop per hPa of change while |dPdt| ≥ 8 hPa/h (the "frequent pops" band of the cue table;
 *   audio adds its own 40–120-s soft pops from cues.earPop), sign −1 falling / +1 rising, so the pops reverse in the eye.
 */
import { EV } from '../core/events.js';
import { INTERIOR_DOORS, EXTERIOR_DOORS, OPENINGS, INTERIOR_ROOM_IDS } from '../core/ids.js';
import { cosFace, ROOM_FACADES, ROOM_OPENINGS, GARAGE_ADJACENT, EXTERIOR_DOOR_IDS } from './structure.js';

export const SLAM_PA = 40;
export const EARPOP_DPDT = 8, EARPOP_STEP_HPA = 1.0;
const TAU_IN_S = 20, TAU_IN_FAILED_S = 2, TAU_ATTIC_S = 60, TAU_ATTIC_FAILED_S = 2, TAU_ATTIC_HATCH_S = 5;
const FAILED_COUPLING_S = 1800;   // the 2-s attic coupling holds for half an hour after a failure, then the attic re-seals to 60 s
const WHUMP_LOAD_PA = 800;
const INTERIOR_DOOR_IDS = Object.keys(INTERIOR_DOORS);

/** Pure (ARCHITECTURE §15 export `pressure.roomDp`). */
export function roomDp(pInsideHpa, pHpa, windLoadEnvPa, cosFaceRoom, openFrac, failed) {
  return 100 * (pInsideHpa - pHpa) + windLoadEnvPa * cosFaceRoom * (0.015 + 0.25 * openFrac + (failed ? 1.0 : 0));
}

export function initPressure(H) {
  const p = H.S.pressure;
  p.pInsideHpa = H.L.pHpa; p.pAtticHpa = H.L.pHpa;
  for (const r of INTERIOR_ROOM_IDS) p.dpRoomPa[r] = 0;
  H.priv.pressure = { earAcc: 0, lastP: H.L.pHpa, atticOpen: false, lastFailSim: -1e9 };
}

export function stepPressure(H, h) {
  const S = H.S, L = H.L, p = S.pressure, P = H.priv.pressure;
  const failedAny = H.flags.failedOpenings > 0 || S.garageDoor.failed;
  const recentFail = Math.max(H.flags.lastOpeningFailSim, H.flags.garageFailedSim ?? -1e9);
  const coupled = failedAny && (H.now() - recentFail) < FAILED_COUPLING_S;

  // inside and attic pressures relax toward the outside (analytic over the sub-step)
  const tauIn = failedAny ? TAU_IN_FAILED_S : TAU_IN_S;
  p.pInsideHpa += (L.pHpa - p.pInsideHpa) * (1 - Math.exp(-h / tauIn));
  const tauAttic = coupled ? TAU_ATTIC_FAILED_S : (P.atticOpen ? TAU_ATTIC_HATCH_S : TAU_ATTIC_S);
  const atticTarget = P.atticOpen ? p.pInsideHpa : L.pHpa;
  p.pAtticHpa += (atticTarget - p.pAtticHpa) * (1 - Math.exp(-h / tauAttic));

  // room differentials
  const wl = H.C.windLoadEnvPa, dir = L.dirFromDeg;
  const lag = 100 * (p.pInsideHpa - L.pHpa);
  const garageFailed = S.garageDoor.failed;
  for (let i = 0; i < INTERIOR_ROOM_IDS.length; i++) {
    const room = INTERIOR_ROOM_IDS[i];
    const facades = ROOM_FACADES[room];
    let cf = 0;
    for (let j = 0; j < facades.length; j++) { const c = cosFace(dir, facades[j]); if (c > cf) cf = c; }
    const ops = ROOM_OPENINGS[room];
    let open = 0, failedIn = false;
    for (let j = 0; j < ops.length; j++) {
      const o = S.openings[ops[j]];
      if (o.failed) failedIn = true; else if (o.open > 0.2) open++;
    }
    const openFrac = ops.length ? open / ops.length : 0;
    const failed = failedIn || (garageFailed && (room === 'garage' || GARAGE_ADJACENT.includes(room)));
    p.dpRoomPa[room] = lag + wl * cf * (0.015 + 0.25 * openFrac + (failed ? 1.0 : 0));
  }

  // interior doors: unlatched ones drift and slam on the room-to-room differential
  for (let i = 0; i < INTERIOR_DOOR_IDS.length; i++) {
    const id = INTERIOR_DOOR_IDS[i];
    const d = S.doors[id], def = INTERIOR_DOORS[id];
    if (def.selfClosing && !d.latched && !d.ripped) {
      // the closer swings it shut over ~6 s and the latch catches
      d.open = Math.max(0, d.open - h / 6); d.targetOpen = d.open;
      if (d.open <= 0) { d.open = 0; d.latched = true; }
      continue;
    }
    if (d.latched) continue;
    const into = def.swingInto;
    const other = def.between[0] === into ? def.between[1] : def.between[0];
    const push = (p.dpRoomPa[other] ?? 0) - (p.dpRoomPa[into] ?? 0);   // > 0 pushes the leaf open into `into`
    if (push > SLAM_PA && d.open < 0.99) slam(H, d, 1);
    else if (push < -SLAM_PA && d.open > 0.01) slam(H, d, 0);
  }

  // exterior doors in the wind (uGustEnv, DESIGN §10.1)
  for (let i = 0; i < EXTERIOR_DOOR_IDS.length; i++) {
    const id = EXTERIOR_DOOR_IDS[i];
    const d = S.doors[id];
    if (!d || d.latched || id === 'door_cage_screen') continue;
    const facade = OPENINGS[id] ? H.S.openings[id].facadeDeg : 90;
    const w = L.uGustEnv * cosFace(dir, facade);
    const inswing = OPENINGS[id]?.swing === 'in' || EXTERIOR_DOORS[id].slider;
    if (w > 25) {
      if (inswing && d.open < 0.99) slam(H, d, 1);
      else if (!inswing && d.open > 0.01) slam(H, d, 0);
    }
    const o = S.openings[id]; if (o) o.open = d.open;
  }

  // ear pops
  const dp = L.dPdtHpaPerH;
  if (Math.abs(dp) >= EARPOP_DPDT) {
    P.earAcc += Math.abs(L.pHpa - P.lastP);
    if (P.earAcc >= EARPOP_STEP_HPA) { P.earAcc = 0; H.emit(EV.HOUSE_EAR_POP, { sign: dp < 0 ? -1 : 1, dPdt: dp }); }
  } else P.earAcc = Math.max(0, P.earAcc - Math.abs(L.pHpa - P.lastP));
  P.lastP = L.pHpa;

  // the attic breathing once the envelope is open: a whump per bucket while the load is up
  if (failedAny && wl > WHUMP_LOAD_PA && H.newBucket) H.emit(EV.HOUSE_ATTIC_WHUMP, { source: 'wind' });
}

function slam(H, d, to) {
  d.open = to; d.targetOpen = to; d.slamCount++;
  H.emit(EV.HOUSE_DOOR_SLAM, { id: d.id, cause: 'wind', to });
}

export function setAtticOpen(H, open) { H.priv.pressure.atticOpen = !!open; }
export function isAtticOpen(H) { return H.priv.pressure.atticOpen; }
