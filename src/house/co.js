/**
 * house/co.js — carbon monoxide (DESIGN §6.13; ARCHITECTURE §8.2 "CO"; research H §5.5).
 * Owner: E3 house. Writes: house.coPpmByRoom, house.coPpm, house.coDose.
 * Reads: utilities.generator.{running, placement}, house.{garageDoor, doors, openings}, player.room (the dose — the one
 * permitted player read, ARCHITECTURE §15), objects.detector_*.{battery, extra.silencedUntilSim}.
 * Events: house:coAlarm {ppm, detectorId}, house:coDose {dose} at every 500 ppm·min.
 *
 * Source: generator running in the garage +40 ppm/min with the roll-up closed, +12 with it open (or the man door open);
 * on the lanai +3 ppm/min into any room whose west opening is open or failed; driveway 0. Sinks: 5 %/min in a room with
 * an open exterior opening, 1 %/min sealed; the garage additionally leaks 10 %/min through the roll-up's perimeter with
 * the door down (so a closed garage settles near 360 ppm — the UL 2034 curve is crossed within 8 min and standing in it
 * reaches the 4 500 ppm·min dose in ≈ 28 min, DESIGN §6.13's numbers). Spread along plan.adjacency: an open interior door
 * exchanges at 1 %/min (so a room one door away settles at half the source room, "halving per step"); cased openings
 * exchange at 10 %/min (near-equalising). Detectors (hall and garage) follow the UL 2034 alarm curve: with `t` the time
 * since the level first passed 70 ppm, alarm when c ≥ cAlarm(t): 400 ppm within 4 min, 150 within 10, 70 within 60
 * (log-log between the points); a dead battery or a silenced detector suppresses it.
 */
import { EV } from '../core/events.js';
import { INTERIOR_DOORS, CASED_OPENINGS, INTERIOR_ROOM_IDS } from '../core/ids.js';
import { ROOM_OPENINGS } from './structure.js';

export const CO_RATE_GARAGE_CLOSED = 40, CO_RATE_GARAGE_OPEN = 12, CO_RATE_LANAI = 3;
export const CO_DECAY_SEALED = 0.01, CO_DECAY_OPEN = 0.05, CO_GARAGE_LEAK = 0.10;
export const CO_DOOR_EXCHANGE = 0.01, CO_CASED_EXCHANGE = 0.10;
export const CO_DOSE_FLOOR = 100, CO_DOSE_EVENT_STEP = 500;
const DETECTORS = [{ id: 'detector_hall', room: 'frontHall' }, { id: 'detector_garage', room: 'garage' }];
const LANAI_ROOMS = ['great', 'masterBR', 'kitchen', 'masterBath'];

/** UL 2034 alarm concentration for an exposure time (minutes since the level first passed 70 ppm). */
export function ul2034AlarmPpm(tMin) {
  if (tMin <= 4) return 400;
  if (tMin >= 60) return 70;
  const pts = [[4, 400], [10, 150], [60, 70]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, c0] = pts[i], [t1, c1] = pts[i + 1];
    if (tMin <= t1) { const f = (Math.log(tMin) - Math.log(t0)) / (Math.log(t1) - Math.log(t0)); return Math.exp(Math.log(c0) + f * (Math.log(c1) - Math.log(c0))); }
  }
  return 70;
}

export function initCO(H) {
  const S = H.S;
  for (const r of INTERIOR_ROOM_IDS) S.coPpmByRoom[r] = 0;
  S.coPpm = 0; S.coDose = 0;
  // adjacency edges once: [roomA, roomB, doorId|null]
  const edges = [];
  for (const [id, d] of Object.entries(INTERIOR_DOORS)) edges.push([d.between[0], d.between[1], id]);
  for (const [a, b] of CASED_OPENINGS) edges.push([a, b, null]);
  H.priv.co = {
    edges, doseNotch: 0,
    detectors: DETECTORS.map(d => ({ ...d, onsetSim: null, alarm: false, belowSince: null })),
  };
}

function roomHasOpenExterior(H, room) {
  const ops = ROOM_OPENINGS[room];
  for (let i = 0; i < ops.length; i++) { const o = H.S.openings[ops[i]]; if (o.failed || o.open > 0.2) return true; }
  return false;
}

/** The current CO source rate into the garage (ppm/min) — api.coRate(). */
export function coRate(H) {
  const G = H.state.utilities?.generator;
  if (!G || !G.running) return 0;
  if (G.placement === 'garage') {
    const g = H.S.garageDoor;
    const open = g.open > 0.5 || g.failed || (H.S.doors.door_garage_man?.open > 0.2);
    return open ? CO_RATE_GARAGE_OPEN : CO_RATE_GARAGE_CLOSED;
  }
  if (G.placement === 'lanai') return CO_RATE_LANAI;
  return 0;
}

export function stepCO(H, h) {
  const S = H.S, P = H.priv.co, c = S.coPpmByRoom;
  const hm = h / 60;
  const G = H.state.utilities?.generator;
  const running = !!(G && G.running);

  // sources
  if (running) {
    if (G.placement === 'garage') c.garage += coRate(H) * hm;
    else if (G.placement === 'lanai') {
      for (let i = 0; i < LANAI_ROOMS.length; i++) if (roomHasOpenExterior(H, LANAI_ROOMS[i])) c[LANAI_ROOMS[i]] += CO_RATE_LANAI * hm;
    }
  }
  // sinks
  for (let i = 0; i < INTERIOR_ROOM_IDS.length; i++) {
    const r = INTERIOR_ROOM_IDS[i];
    if (c[r] <= 0) { c[r] = 0; continue; }
    let k = roomHasOpenExterior(H, r) ? CO_DECAY_OPEN : CO_DECAY_SEALED;
    if (r === 'garage') {
      const g = S.garageDoor;
      const open = g.open > 0.5 || g.failed || (S.doors.door_garage_man?.open > 0.2);
      k = open ? CO_DECAY_OPEN : CO_DECAY_SEALED + CO_GARAGE_LEAK;
    }
    c[r] *= Math.exp(-k * hm);
    if (c[r] < 0.01) c[r] = 0;
  }
  // spread along adjacency through open doors and cased openings
  const E = P.edges;
  for (let i = 0; i < E.length; i++) {
    const a = E[i][0], b = E[i][1], door = E[i][2];
    let kx;
    if (door === null) kx = CO_CASED_EXCHANGE;
    else { const d = S.doors[door]; if (!d || d.open <= 0.2) continue; kx = CO_DOOR_EXCHANGE * Math.min(1, d.open / 0.5); }
    const q = kx * (c[a] - c[b]) * hm;
    c[a] -= q; c[b] += q;
  }

  // the player's exposure (player.room is the one permitted player read)
  const room = H.state.player?.room;
  S.coPpm = (room && c[room] != null) ? c[room] : 0;
  if (S.coPpm > CO_DOSE_FLOOR) {
    S.coDose += (S.coPpm - CO_DOSE_FLOOR) * hm;
    const notch = Math.floor(S.coDose / CO_DOSE_EVENT_STEP);
    if (notch > P.doseNotch) { P.doseNotch = notch; H.emit(EV.HOUSE_CO_DOSE, { dose: S.coDose, ppm: S.coPpm }); }
  }

  // detectors
  const now = H.now();
  for (let i = 0; i < P.detectors.length; i++) {
    const det = P.detectors[i];
    const level = c[det.room] || 0;
    if (level >= 70) {
      if (det.onsetSim == null) det.onsetSim = now;
      det.belowSince = null;
    } else if (level < 50) {
      if (det.belowSince == null) det.belowSince = now;
      if (now - det.belowSince >= 300) { det.onsetSim = null; det.alarm = false; }
    }
    if (det.alarm || det.onsetSim == null) continue;
    const tMin = (now - det.onsetSim) / 60;
    if (level >= ul2034AlarmPpm(Math.max(tMin, 1e-3))) {
      if (!detectorLive(H, det.id, now)) continue;
      det.alarm = true;
      H.emit(EV.HOUSE_CO_ALARM, { ppm: level, detectorId: det.id, room: det.room });
    }
  }
}

/** Battery present and not silenced (objects.detector_*.extra.battery defaults to 1; the top-level battery is 0 for fixed objects). */
export function detectorLive(H, id, now) {
  const obj = H.state.objects?.[id];
  if (!obj) return true;
  const batt = obj.extra && obj.extra.battery != null ? obj.extra.battery : obj.battery;
  if (batt != null && batt <= 0) return false;
  if (obj.extra && obj.extra.silencedUntilSim > now) return false;
  return true;
}

export function coPpmAt(H, roomId) { return H.S.coPpmByRoom[roomId] ?? 0; }
