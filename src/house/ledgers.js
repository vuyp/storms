/**
 * house/ledgers.js — the fridge and pool ledgers (DESIGN §6.12; ARCHITECTURE Law 8) and the detector chirp.
 * Owner: E3 house. Writes: house.fridge.*, house.pool.*.
 * Reads: utilities.{power, generator}, local.{rainMmPerH, sun}, clock.{hour, isNight}, house.cage.stage.
 * Events: house:detectorChirp {detectorId} (hoursSinceOutage ≥ 4 && isNight, once; suppressed if the battery was pulled).
 * The chirp waits for the small hours (a seeded 01:30–03:00, H §7.7 "2–3 a.m. of the aftermath night": the battery sags
 * in the heat) rather than the first dusk sub-step that satisfies the gate.
 *
 * Fridge: freezer 48 h unopened, fridge 4 h; each opening −1 h freezer / −20 min fridge; each frozen Ziploc +2 h once it
 * has had 3 h of power to freeze (max +24); "coldest" pre-chills +4 h / +30 min; an open door loses cold 4× faster.
 * Powered (grid via main+kitchen breakers, or the generator's 'fridge' circuit) the compressor rebuilds the reserve at
 * 1.5 h/h (freezer) and 2 h/h (fridge) — the 2-on/2-off generator routine holds the freezer. `coldReserveH` mirrors the
 * freezer (the ending card's line). Smell grows once the fridge reserve is below zero until purged; the ice maker dumps
 * on restoration if it was left on.
 * Pool: level 0 = deck − 0.15 m; rain raises it at 2.5× the rate (the cage deck sheds into it); the backwash valve with
 * the pump running drops it 0.15 m in 3 min; it overtops the lanai step at +0.15; the pump follows the pool-pump breaker
 * and its 08–16 timer, runs dry below −0.20 m and burns out after 10 min of that; colour 0 → 1 with the storm total.
 */
import { EV } from '../core/events.js';

export const FREEZER_H = 48, FRIDGE_H = 4, BAG_BONUS_H = 2, BAG_MAX_BONUS_H = 24, BAG_FREEZE_H = 3;
export const OPEN_COST_FREEZER_H = 1, OPEN_COST_FRIDGE_H = 1 / 3;
export const POOL_OVERTOP_M = 0.15, POOL_DRY_M = -0.20, POOL_BACKWASH_M_PER_S = 0.15 / 180, POOL_RAIN_FACTOR = 2.5;
const CHIRP_AFTER_H = 4;

export function initLedgers(H) {
  const f = H.S.fridge, p = H.S.pool;
  f.open = false; f.coldest = false; f.iceMakerOn = true; f.frozenBags = 0; f.freezerReserveH = FREEZER_H; f.fridgeReserveH = FRIDGE_H;
  f.coldReserveH = FREEZER_H; f.openCount = 0; f.purged = false; f.smell = 0; f.iceDumped = false;
  p.levelM = 0; p.valveOpen = false; p.pumpOn = false; p.pumpBurnt = false; p.colour = 0; p.overtopping = false;
  H.priv.ledgers = { bagBonusH: 0, dryMin: 0, chirped: false, chirpHour: 1.5 + 1.5 * H.hash01('chirp') };
}

export function fridgePowered(H) {
  const U = H.state.utilities?.power, G = H.state.utilities?.generator;
  return !!((U?.on && U.breakers?.main && U.breakers?.kitchen) || (G?.running && G.circuits?.includes('fridge')));
}

export function stepLedgers(H, h) {
  const S = H.S, f = S.fridge, p = S.pool, P = H.priv.ledgers, L = H.L;
  const hh = h / 3600;
  // ---- fridge
  const powered = fridgePowered(H);
  const freezerMax = FREEZER_H + P.bagBonusH + (f.coldest ? 4 : 0);
  const fridgeMax = FRIDGE_H + (f.coldest ? 0.5 : 0);
  if (powered) {
    if (f.frozenBags > 0 && P.bagBonusH < Math.min(BAG_MAX_BONUS_H, BAG_BONUS_H * f.frozenBags)) {
      P.bagBonusH = Math.min(Math.min(BAG_MAX_BONUS_H, BAG_BONUS_H * f.frozenBags), P.bagBonusH + f.frozenBags * (BAG_BONUS_H / BAG_FREEZE_H) * hh);
    }
    if (!f.open) {
      f.freezerReserveH = Math.min(freezerMax, f.freezerReserveH + 1.5 * hh);
      f.fridgeReserveH = Math.min(fridgeMax, f.fridgeReserveH + 2 * hh);
    }
  } else {
    const rate = f.open ? 4 : 1;
    f.freezerReserveH -= rate * hh;
    f.fridgeReserveH -= rate * hh;
  }
  f.freezerReserveH = Math.max(-1000, Math.min(freezerMax, f.freezerReserveH));
  f.fridgeReserveH = Math.max(-1000, Math.min(fridgeMax, f.fridgeReserveH));
  f.coldReserveH = f.freezerReserveH;
  if (f.fridgeReserveH < 0 && !f.purged) f.smell = Math.min(1, f.smell + hh / 24);
  else if (f.purged && f.smell > 0) f.smell = Math.max(0, f.smell - f.smell * (1 - Math.exp(-hh / 12)));

  // ---- pool
  const U = H.state.utilities?.power;
  const pumpPowered = !!(U?.on && U.breakers?.main && U.breakers?.poolPump) && !p.pumpBurnt;
  const hour = H.clock.hour ?? 12;
  const timerOn = hour >= 8 && hour < 16;
  p.pumpOn = pumpPowered && (timerOn || p.valveOpen);
  p.levelM += (L.rainMmPerH || 0) * POOL_RAIN_FACTOR * hh / 1000;
  if (p.valveOpen && p.pumpOn) p.levelM -= POOL_BACKWASH_M_PER_S * h;
  if (p.levelM > POOL_OVERTOP_M) { p.levelM = POOL_OVERTOP_M; p.overtopping = (L.rainMmPerH || 0) > 0; }
  else p.overtopping = false;
  if (p.levelM < -0.6) p.levelM = -0.6;
  if (p.pumpOn && p.levelM < POOL_DRY_M) {
    P.dryMin += h / 60;
    if (P.dryMin >= 10) { p.pumpBurnt = true; p.pumpOn = false; }
  } else P.dryMin = 0;
  p.colour = Math.min(1, p.colour + (L.rainMmPerH || 0) * hh / 250 * 0.8 + (S.cage.stage >= 2 ? hh * 0.02 : 0) - (p.pumpOn ? hh * 0.02 : 0));
  if (p.colour < 0) p.colour = 0;

  // ---- the smoke detector's low-battery chirp on the aftermath night
  if (!P.chirped) {
    const hours = U?.hoursSinceOutage ?? 0;
    const hour = H.clock.hour ?? 12;
    if (!U?.on && hours >= CHIRP_AFTER_H && H.clock.isNight && hour >= P.chirpHour && hour < 6) {
      P.chirped = true;
      if (H.detectorLive('detector_hall', H.now())) H.emit(EV.HOUSE_DETECTOR_CHIRP, { detectorId: 'detector_hall' });
    }
  }
}

/** power:restored — the ice maker dumps if it was left on (a puddle in the drawer on day 5). */
export function onPowerRestored(H) {
  const f = H.S.fridge;
  if (f.iceMakerOn) f.iceDumped = true;
}

// ---- setters for api.js
export function setFridgeOpen(H, open, compartment = 'fridge') {
  const f = H.S.fridge;
  open = !!open;
  if (open === f.open) return { ok: true, changed: false };
  f.open = open;
  if (open) {
    f.openCount++;
    if (compartment === 'freezer' || compartment === 'both') f.freezerReserveH -= OPEN_COST_FREEZER_H;
    if (compartment === 'fridge' || compartment === 'both') f.fridgeReserveH -= OPEN_COST_FRIDGE_H;
    f.coldReserveH = f.freezerReserveH;
  }
  return { ok: true, changed: true };
}
export function setIceMaker(H, on) { H.S.fridge.iceMakerOn = !!on; return { ok: true }; }
export function setFridgeColdest(H, on) {
  const f = H.S.fridge;
  const was = f.coldest; f.coldest = !!on;
  if (!was && f.coldest && !fridgePowered(H)) return { ok: true, note: 'no power to pull it down' };
  return { ok: true };
}
export function addFrozenBags(H, n) {
  const f = H.S.fridge;
  const count = Math.max(0, Math.floor(n));
  if (count === 0) return { ok: false, reason: 'no bags' };
  const room = 12 - f.frozenBags;
  if (room <= 0) return { ok: false, reason: 'the freezer is full of bags' };
  const added = Math.min(room, count);
  f.frozenBags += added;
  return { ok: true, added };
}
export function purgeFridge(H) {
  const f = H.S.fridge;
  if (f.purged) return { ok: false, reason: 'already purged' };
  f.purged = true;
  return { ok: true };
}
export function setPoolValve(H, open) {
  const p = H.S.pool;
  p.valveOpen = !!open;
  if (p.valveOpen && !(H.state.utilities?.power?.on && H.state.utilities.power.breakers?.poolPump)) return { ok: true, note: 'the pump is off — nothing will move' };
  return { ok: true };
}
