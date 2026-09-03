/**
 * house/cage.js — the pool cage (DESIGN §3.3 "cage", §6.5; ARCHITECTURE §8.2 "Cage").
 * Owner: E3 house. Writes: house.cage.*.
 * Reads (sim-time only): local.{uGustEnv, dirFromDeg, eyeFactor}. Events: house:cagePanelTear {panelId},
 * house:cageStage {stage}, house:doorSlam {id:'door_cage_screen'} (the screen door banging until latched).
 *
 * 24 panels (8 W wall, 6 N, 6 S, 4 roof strips), each a threshold component N(30, 4) on
 *   load_i = uGustEnv·shield_i·max(0.3, |cos(dirFrom − n_i)|),  shield_i = roof ? 1 : (|Δ(dirFrom, 90°)| ≤ 60° ? 0.7 : 1)
 * (the house shields the wall panels while the wind comes over it — the whole front half of an on-track storm).
 * Stages: 0 intact → 1 humming (uGustEnv > 20) → 2 first tear → 3 ≥ 60 % of the *loaded* panels (|cos| > 0.3) gone →
 * 4 folding when uGustEnv·shield_struct ≥ structThreshold N(48, 4) → 5 collapsed.
 * The fold: `foldProgress` advances in SIM time over 6 s (h/6 per sub-step, so stage 5 lands on the second sub-step
 * after stage 4). Stage 4 is a moment (the clock holds 1× for 20 real s) so in play the fold is 6–10 real seconds;
 * during sleep it is instant, which is right (stage ≥ 4 wakes the player at that sub-step). Stage 5 must be sim-time
 * because hood/ queues a 2 000-J roof impact from it and the hash must not depend on real time. The renderer tweens
 * its own 6-s keyframe from `stageSim`; `foldProgress` is the sim's authoritative value.
 */
import { EV } from '../core/events.js';
import { angleDiffDeg, absCos, thresholdFromStream } from './structure.js';

export const PANEL_MU = 30, PANEL_SIGMA = 4, STRUCT_MU = 48, STRUCT_SIGMA = 4;
const FOLD_S = 6;
const HUM_U = 20;
const DOOR_BANG_U = 12;

export function initCage(H) {
  const c = H.S.cage;
  // fixed draw order: 24 panel thresholds then the structure
  for (let i = 0; i < c.panels.length; i++) {
    const p = c.panels[i];
    p.threshold = thresholdFromStream(H.damage, PANEL_MU, PANEL_SIGMA);
    p.torn = false; p.tornSim = null;
  }
  c.structThreshold = thresholdFromStream(H.damage, STRUCT_MU, STRUCT_SIGMA);
  c.stage = 0; c.foldProgress = 0; c.doorLatched = false; c.doorGone = false; c.stageSim = 0;
  H.priv.cage = { banging: false, tornCount: 0 };
}

function setStage(H, stage) {
  const c = H.S.cage;
  if (stage <= c.stage) return;
  c.stage = stage; c.stageSim = H.now();
  H.emit(EV.HOUSE_CAGE_STAGE, { stage });
}

export function stepCage(H, h) {
  const c = H.S.cage, L = H.L, P = H.priv.cage;
  const u = L.uGustEnv, dir = L.dirFromDeg;
  const overHouse = Math.abs(angleDiffDeg(dir, 90)) <= 60;
  const shieldWall = overHouse ? 0.7 : 1;

  if (c.stage >= 4) {
    if (c.stage === 4) {
      c.foldProgress = Math.min(1, c.foldProgress + h / FOLD_S);
      if (c.foldProgress >= 1 - 1e-9) { c.foldProgress = 1; setStage(H, 5); }
    }
    // a collapsed cage takes its screen door with it
    if (!c.doorGone) c.doorGone = true;
    return;
  }

  // stage 1: humming/bulging
  if (c.stage === 0 && u > HUM_U) setStage(H, 1);

  // panel tears (threshold components on the bucket max ≡ per sub-step check)
  let loaded = 0, loadedTorn = 0;
  for (let i = 0; i < c.panels.length; i++) {
    const p = c.panels[i];
    const cosn = absCos(dir, p.nDeg);
    const isLoaded = cosn > 0.3;
    if (isLoaded) loaded++;
    if (p.torn) { if (isLoaded) loadedTorn++; continue; }
    const load = u * (p.roof ? 1 : shieldWall) * Math.max(0.3, cosn);
    if (load >= p.threshold) {
      p.torn = true; p.tornSim = H.now(); P.tornCount++;
      if (isLoaded) loadedTorn++;
      H.emit(EV.HOUSE_CAGE_PANEL_TEAR, { panelId: p.id, load });
      if (c.stage < 2) setStage(H, 2);
    }
  }
  // stage 3: ≥ 60 % of the loaded panels gone (falls back to all panels when nothing faces the wind)
  if (c.stage === 2) {
    const frac = loaded > 0 ? loadedTorn / loaded : P.tornCount / c.panels.length;
    if (frac >= 0.6) setStage(H, 3);
  }
  // stage 4: the structure lets go
  if (c.stage === 3) {
    const shieldStruct = overHouse ? 0.7 : 1;
    if (u * shieldStruct >= c.structThreshold) { setStage(H, 4); c.foldProgress = 0; }
  }

  // the screen door: bangs above 12 m/s until latched; gone in the eye once the cage is torn (stage ≥ 2)
  if (!c.doorGone) {
    if (L.eyeFactor >= 0.5 && c.stage >= 2) { c.doorGone = true; c.doorLatched = false; P.banging = false; }
    else {
      const banging = !c.doorLatched && u > DOOR_BANG_U;
      if (banging && !P.banging) {   // one event per banging episode; audio loops from cage.doorLatched && uGustEnv > 12
        H.emit(EV.HOUSE_DOOR_SLAM, { id: 'door_cage_screen', cause: 'wind' });
        const d = H.S.doors.door_cage_screen; if (d) d.slamCount++;
      }
      P.banging = banging;
    }
  }
}
