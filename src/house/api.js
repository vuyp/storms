/**
 * house/api.js — house.api (ARCHITECTURE §6.3): the only foreign write path into `house`. Every setter validates
 * and returns {ok, reason} (no-op when physically blocked); setDoor also returns `outcome`.
 * Owner: E3 house. Wind rules of DESIGN §10.1 use `uGustEnv` (never uInst) because they change hashed state.
 * Reads: local.{u1m, uGustEnv, dirFromDeg, uStruct}, utilities.power (garage motor).
 * Events: house:doorRipped {id}.
 */
import { EV } from '../core/events.js';
import { OPENINGS, EXTERIOR_DOORS, INTERIOR_DOORS } from '../core/ids.js';
import { cosFace, glassLoadCoef } from './structure.js';
import { hazardMult } from './openings.js';
import { setGarageBraced } from './garage.js';
import * as intrusion from './intrusion.js';
import * as ledgers from './ledgers.js';
import { setAtticOpen } from './pressure.js';
import { coRate, coPpmAt } from './co.js';

export const PANEL_WIND_LIMIT = 20;     // m/s of u1m above which panels cannot be handled outside ("The wind has this now")
export const WINDOW_OPEN_LIMIT = 15;    // bare windows can be opened after the storm only below this
export const ATTIC_WIND_LIMIT = 15;
export const DOOR_HELD_MS = 20, DOOR_RIP_MS = 30, DOOR_SLAM_MS = 25, GARAGE_LIFT_LIMIT = 15;

const ok = (extra = {}) => ({ ok: true, ...extra });
const no = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export function createApi(H) {
  const S = H.S, L = H.L;
  const nuts = {};   // wing nuts per panelled opening (fastening = Σnuts / (4·panelsPlaced))

  function mirrorDoor(id) {
    const d = S.doors[id], o = S.openings[id];
    if (d && o) { o.open = d.open; o.latched = d.latched; o.locked = d.locked; }
    if (id === 'door_cage_screen' && d) S.cage.doorLatched = d.latched && d.open === 0;
  }

  function windOnDoor(id) {
    const o = S.openings[id];
    const facade = o ? o.facadeDeg : 270;
    return L.uGustEnv * cosFace(L.dirFromDeg, facade);
  }

  const api = {
    // ---- shutters and panels ---------------------------------------------------------------------------------
    placePanel(openingId, nutCount = 4) {
      const o = S.openings[openingId], def = OPENINGS[openingId];
      if (!o || !def || typeof def.panels !== 'number' || def.panels === 0) return no('no panel tracks there');
      if (o.failed) return no('nothing left to shutter');
      if (L.u1m > PANEL_WIND_LIMIT) return no('The wind has this now');
      if (o.panelsPlaced >= o.panelsNeeded) return no('already shuttered');
      const n = Math.max(0, Math.min(4, Math.floor(Number(nutCount) || 0)));
      nuts[openingId] = (nuts[openingId] || 0) + n;
      o.panelsPlaced++;
      o.fastening = nuts[openingId] / (4 * o.panelsPlaced);
      o.shutterProgress = o.panelsPlaced / o.panelsNeeded;
      o.shuttered = o.panelsPlaced >= o.panelsNeeded;
      return ok({ panelsPlaced: o.panelsPlaced, shuttered: o.shuttered, fastening: o.fastening });
    },
    removePanel(openingId) {
      const o = S.openings[openingId], def = OPENINGS[openingId];
      if (!o || !def || typeof def.panels !== 'number' || def.panels === 0) return no('no panel there');
      if (o.panelsPlaced <= 0) return no('no panel to remove');
      if (L.u1m > PANEL_WIND_LIMIT) return no('The wind has this now');
      const avg = o.panelsPlaced > 0 ? (nuts[openingId] || 0) / o.panelsPlaced : 0;
      nuts[openingId] = Math.max(0, (nuts[openingId] || 0) - avg);
      o.panelsPlaced--;
      o.fastening = o.panelsPlaced > 0 ? nuts[openingId] / (4 * o.panelsPlaced) : 0;
      o.shutterProgress = o.panelsNeeded ? o.panelsPlaced / o.panelsNeeded : 0;
      o.shuttered = false;
      return ok({ panelsPlaced: o.panelsPlaced, nutsReturned: Math.round(avg) });
    },
    setShutter(openingId, closed) {
      const o = S.openings[openingId], def = OPENINGS[openingId];
      if (!o || !def || def.panels !== 'accordion') return no('no accordion shutter there');
      if (o.failed) return no('nothing left to shutter');
      if (closed && L.u1m > PANEL_WIND_LIMIT) return no('The wind has this now');
      o.shuttered = !!closed; o.shutterProgress = closed ? 1 : 0; o.fastening = closed ? 1 : 0;
      o.panelsPlaced = closed ? o.panelsNeeded : 0;
      if (closed) o.bowEnvM = 0;
      return ok({ shuttered: o.shuttered });
    },
    setBrace(openingId, on) {
      const o = S.openings[openingId], def = OPENINGS[openingId];
      if (!o || !def || def.kind !== 'slider') return no('nothing to brace there');
      if (o.failed) return no('the slider is gone');
      o.braced = !!on;
      return ok({ braced: o.braced });
    },

    // ---- doors ---------------------------------------------------------------------------------------------------
    /**
     * @param {string} id door id (interior or exterior), a window id (open/close a bare window after the storm),
     *   or 'door_garage_roll' (delegates to setGarageDoor)
     * @returns {{ok:boolean, reason?:string, outcome?:'opened'|'closed'|'held'|'ripped'|'slammed'|'locked'|'unlocked'|'latched'}}
     */
    setDoor(id, { open, latched, locked } = {}) {
      if (id === 'door_garage_roll') return api.setGarageDoor({ open: open ?? S.garageDoor.open });
      const d = S.doors[id];
      if (!d) {
        const o = S.openings[id], def = OPENINGS[id];
        if (!o || !def || !['window', 'peep'].includes(def.kind)) return no('no such door');
        if (open == null) return no('nothing to do');
        if (open > 0) {
          if (o.failed) return no('the glass is gone');
          if (o.shuttered || o.panelsPlaced > 0) return no('the shutter is on');
          if (L.u1m > WINDOW_OPEN_LIMIT) return no('The wind has this now');
          o.open = Math.min(1, Math.max(0, open)); o.latched = false;
          return ok({ outcome: 'opened' });
        }
        o.open = 0; o.latched = true;
        return ok({ outcome: 'closed' });
      }
      const ext = EXTERIOR_DOORS[id];
      const o = S.openings[id];
      let outcome = null;
      if (locked != null) {
        if (!(id === 'door_front' || id === 'door_garage_man' || id === 'door_masterCloset' || ext?.slider)) return no('no lock on that door');
        if (locked && d.open > 0) return no('close it first');
        d.locked = !!locked; outcome = locked ? 'locked' : 'unlocked';
      }
      if (open != null) {
        if (open > 0) {
          if (d.locked) { mirrorDoor(id); return no('locked', { outcome: 'held' }); }
          if (o && o.failed) return no('it is gone');
          if (ext) {
            const w = windOnDoor(id);
            const isSlider = !!ext.slider;
            if (!isSlider && w > DOOR_RIP_MS) {
              d.ripped = true; d.open = 1; d.targetOpen = 1; d.latched = false;
              mirrorDoor(id);
              H.emit(EV.HOUSE_DOOR_RIPPED, { id });
              return ok({ outcome: 'ripped' });
            }
            if (w > DOOR_HELD_MS) { mirrorDoor(id); return no('The wind is holding it shut', { outcome: 'held' }); }
          } else if (INTERIOR_DOORS[id]) {
            // a latched door between the player and a pressurised garage/attic is hard to open (hold 2 s): the caller's hold
            const def = INTERIOR_DOORS[id];
            const dp = Math.abs((S.pressure.dpRoomPa[def.between[0]] ?? 0) - (S.pressure.dpRoomPa[def.between[1]] ?? 0));
            if (dp > 40) outcome = 'opened'; // still opens; the interaction layer applies the 2-s hold from `holdS`
          }
          d.open = Math.min(1, Math.max(0, open)); d.targetOpen = d.open; d.latched = false;
          outcome = outcome || 'opened';
        } else {
          d.ripped = false;
          d.open = 0; d.targetOpen = 0;
          d.latched = latched != null ? !!latched : true;
          outcome = 'closed';
          if (ext && !d.latched && !ext.slider && OPENINGS[id]?.swing === 'in' && windOnDoor(id) > DOOR_SLAM_MS) outcome = 'slammed';
        }
      } else if (latched != null) {
        if (latched && d.open > 0.01) return no('close it first');
        d.latched = !!latched; outcome = latched ? 'latched' : 'opened';
      }
      mirrorDoor(id);
      const holdS = (INTERIOR_DOORS[id] && open > 0 && Math.abs((S.pressure.dpRoomPa[INTERIOR_DOORS[id].between[0]] ?? 0) - (S.pressure.dpRoomPa[INTERIOR_DOORS[id].between[1]] ?? 0)) > 40) ? 2 : 0;
      return ok({ outcome: outcome || 'closed', holdS });
    },

    // ---- the garage ----------------------------------------------------------------------------------------------
    setGarageDoor({ open } = {}) {
      const g = S.garageDoor;
      if (g.failed) return no('the door is in');
      const target = Math.min(1, Math.max(0, Number(open) || 0));
      if (target > g.open) {
        const w = L.uGustEnv * cosFace(L.dirFromDeg, 90);
        if (w > GARAGE_LIFT_LIMIT) return no('The wind has it');
        if (g.buckled) return no('the tracks are bent');
      }
      g.open = target;
      S.openings.door_garage_roll.open = target;
      const powered = !!(H.state.utilities?.power?.on && H.state.utilities.power.breakers?.garage);
      return ok({ open: g.open, manual: !powered });
    },
    setGarageBrace(on) {
      const g = S.garageDoor;
      if (g.failed) return no('the door is in');
      if (on && g.open > 0.5) return no('close the door first');
      setGarageBraced(H, on);
      return ok({ braced: g.braced, threshold: g.threshold });
    },

    // ---- water --------------------------------------------------------------------------------------------------
    placeSandbag: (doorId) => intrusion.placeSandbag(H, doorId),
    placeTowel: (id) => intrusion.placeTowel(H, id),
    wringTowel: (id) => intrusion.wringTowel(H, id),
    placeBucket: (lpId, containerId) => intrusion.placeBucket(H, lpId, containerId),
    /** @returns {{ok:boolean, litres:number}} the litres removed (the caller pours them into a utilities.water container or the lanai). */
    emptyBucket: (lpId) => intrusion.emptyBucket(H, lpId),
    removeBucket: (lpId) => intrusion.removeBucket(H, lpId),

    // ---- ledgers ------------------------------------------------------------------------------------------------
    setFridgeOpen: (open, compartment) => ledgers.setFridgeOpen(H, open, compartment),
    setIceMaker: (on) => ledgers.setIceMaker(H, on),
    setFridgeColdest: (on) => ledgers.setFridgeColdest(H, on),
    addFrozenBags: (n) => ledgers.addFrozenBags(H, n),
    purgeFridge: () => ledgers.purgeFridge(H),
    setPoolValve: (open) => ledgers.setPoolValve(H, open),

    // ---- attic / queries -----------------------------------------------------------------------------------------
    setAttic(open) {
      if (open && L.u1m > ATTIC_WIND_LIMIT) return no('not in this wind');
      setAtticOpen(H, open);
      return ok({ open: !!open });
    },
    roomPressurePa(roomId) { return S.pressure.dpRoomPa[roomId] ?? 0; },
    openingLoad(openingId) {
      if (openingId === 'door_garage_roll') return { load: S.garageDoor.load, threshold: S.garageDoor.threshold, buckleAt: S.garageDoor.threshold - 2 };
      const o = S.openings[openingId], p = H.priv.openings[openingId];
      if (!o || !p) return { load: 0, threshold: null };
      const load = L.uStruct * glassLoadCoef(L.dirFromDeg, o.facadeDeg);
      const mult = hazardMult(o, !!H.opts.impactWindows);
      return { load, threshold: null, pBucket: 6e-4 * Math.max(0, load - 30) * (1 + 2 * (H.state.hood?.damage ?? 0)) * mult, bucketMax: p.glass.max };
    },
    coRate: () => coRate(H),
    coPpmAt: (roomId) => coPpmAt(H, roomId),
    /** Debug: the drawn thresholds. */
    thresholds() {
      return { garageUnbraced: H.priv.garage.thrUnbraced, garageBraced: H.priv.garage.thrBraced, cageStruct: S.cage.structThreshold, panels: S.cage.panels.map(p => p.threshold) };
    },
  };
  return api;
}
