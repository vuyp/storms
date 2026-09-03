/**
 * house/intrusion.js — the water-intrusion ladder, the attic reservoir and the ceiling leak points
 * (DESIGN §6.6, §3.6; ARCHITECTURE §8.2 "Intrusion"; research H §4.4).
 * Owner: E3 house. Writes: house.openings[*].{intrusionTier, litres, towelsL}, house.floorWater[*], house.soffitIntegral,
 * house.roof.atticWaterL, house.ceilingLeaks[*], house.mildew.
 * Reads (sim-time only): local.{rainWallMmPerH, rainMmPerH, streetWaterM}, house.roof.shingleLoss, house.garageDoor.
 * Events: house:intrusion {openingId, tier}, house:leakStarted {lpId, tier}, house:leakTier {lpId, tier},
 * house:bucketOverflow {lpId}, house:ceilingSag {lpId}, house:ceilingCollapse {lpId}.
 *
 * Tiers on the façade's wall-equivalent rain rainWall[sector] (mm/h): 1 track ≥ 60 / door threshold ≥ 90;
 * 2 sill ≥ 170 bare / 300 shuttered; 3 soffit when ∫max(0, rainWall − 200)dt ≥ 30 mm·h on that façade;
 * 4 deck streams once shingleLoss[slope] > 0.15. Litres at an opening: 0.005·excess L/h (0.5 L/h per 100 mm/h over
 * the tier-1 threshold), towels absorb 2 L each first, poolM2 = 0.075·litres (1.5 m² at 20 L).
 * The attic reservoir: while a façade is at tier ≥ 3, atticWaterL[i] += 0.15·max(0, rainWall[i] − 200)·(1 + 4·shingleLoss)
 * L/h (the factor is DESIGN §6.6's "intake ×5" at total shingle loss); it drains through the façade's leak points at atticWaterL/τ_attic
 * (τ = 10 h, insulation wicking) split between the active points. Diagonal sectors (NE, SE…) have no leak points of
 * their own: half of each drains through the neighbouring cardinal's points. Points activate as the reservoir wicks
 * through: the first at 2 L (the foyer can ≈ 11:50 on the reference), then at 12 L and 24 L ("when the reservoir
 * doubles" from the previous activation, with a wick-through minimum). Leak tiers 1 drip < 0.5 L/h, 2 stream,
 * 3 sag. A bucket holds 10 L then overflows; sag after 6 un-bucketed hours at ≥ 0.2 L/h; collapse after 24 at ≥ 0.1.
 */
import { EV } from '../core/events.js';
import { OPENINGS, LEAK_POINT_IDS } from '../core/ids.js';
import { LADDER_OPENING_IDS, LEAK_POINTS_BY_SECTOR, slopeOfSector } from './structure.js';

export const TAU_ATTIC_H = 10;
export const SOFFIT_MM_PER_H = 200, SOFFIT_TIER3_MMH = 30;
export const TRACK_MM = 60, DOOR_MM = 90, SILL_BARE_MM = 170, SILL_SHUTTERED_MM = 300;
export const BUCKET_CAP_L = 10;
export const LEAK_ACTIVATION_L = [2, 12, 24, 48];
export const SAG_H = 6, COLLAPSE_H = 24, SAG_GATE_LPH = 0.2, COLLAPSE_GATE_LPH = 0.1;
const CARDINALS = [0, 2, 4, 6];
const STREET_GARAGE_M = 0.15, STREET_FOYER_M = 0.30;
const FLOOR_EVAP_TAU_S = 36 * 3600;
const POOL_CAP_M2 = 12;

/** Pure: the tier reached on a façade for an opening (ARCHITECTURE §15 export `intrusion.tiers(rainWall)`). */
export function tiers(rainWallMmPerH, { kind = 'window', shuttered = false, soffitIntegral = 0, shingleLoss = 0 } = {}) {
  let t = 0;
  const thr1 = kind === 'door' ? DOOR_MM : TRACK_MM;
  if (rainWallMmPerH >= thr1) t = 1;
  if (rainWallMmPerH >= (shuttered ? SILL_SHUTTERED_MM : SILL_BARE_MM)) t = 2;
  if (soffitIntegral >= SOFFIT_TIER3_MMH) t = 3;
  if (shingleLoss > 0.15) t = 4;
  return t;
}

export function initIntrusion(H) {
  const S = H.S;
  for (let i = 0; i < 8; i++) { S.soffitIntegral[i] = 0; S.roof.atticWaterL[i] = 0; }
  for (const id of LADDER_OPENING_IDS) { const o = S.openings[id]; o.intrusionTier = 0; o.litres = 0; o.towelsL = 0; o.sandbagM = 0; }
  for (const id of Object.keys(S.floorWater)) { S.floorWater[id].litres = 0; S.floorWater[id].poolM2 = 0; }
  for (const id of LEAK_POINT_IDS) {
    const lp = S.ceilingLeaks[id];
    lp.active = false; lp.activeSince = null; lp.rateLph = 0; lp.tier = 0; lp.litresDelivered = 0; lp.stainM2 = 0;
    lp.unbucketedH = 0; lp.sag = 0; lp.collapsed = false; lp.bucket = null; lp.bucketL = 0;
  }
  S.mildew = 0;
  H.priv.intrusion = {
    towels: Object.fromEntries(LADDER_OPENING_IDS.map(id => [id, 0])),
    area: Object.fromEntries(LADDER_OPENING_IDS.map(id => [id, OPENINGS[id].w * OPENINGS[id].h])),
    tier2Sim: null, sagFired: {}, activation: [0, 0, 0, 0, 0, 0, 0, 0],
  };
}

function bumpTier(H, o, t) {
  while (o.intrusionTier < t) { o.intrusionTier++; H.emit(EV.HOUSE_INTRUSION, { openingId: o.id, tier: o.intrusionTier }); }
}

function addFloor(S, key, litres) {
  const fw = S.floorWater[key];
  if (!fw) return;
  fw.litres += litres;
  fw.poolM2 = Math.min(POOL_CAP_M2, 0.075 * fw.litres);
}

export function stepIntrusion(H, h) {
  const S = H.S, L = H.L, P = H.priv.intrusion;
  const rw = L.rainWallMmPerH;
  const hh = h / 3600;
  const sl = S.roof.shingleLoss;

  // soffit integrals per façade sector
  for (let i = 0; i < 8; i++) S.soffitIntegral[i] += Math.max(0, rw[i] - SOFFIT_MM_PER_H) * hh;

  // openings: the ladder and the litres
  for (let i = 0; i < LADDER_OPENING_IDS.length; i++) {
    const id = LADDER_OPENING_IDS[i];
    const o = S.openings[id];
    const r = rw[o.sector];
    let inflow = 0;
    if (o.failed) {
      // a hole in the envelope: wall-rain over the opening area, a third of it reaching this room's floor
      inflow = 0.3 * r * P.area[id] * hh;
      bumpTier(H, o, Math.max(2, tiers(r, { kind: o.kind, shuttered: false, soffitIntegral: S.soffitIntegral[o.sector], shingleLoss: sl[slopeOfSector(o.sector)] })));
    } else {
      const t = tiers(r, { kind: o.kind, shuttered: o.shuttered, soffitIntegral: S.soffitIntegral[o.sector], shingleLoss: sl[slopeOfSector(o.sector)] });
      bumpTier(H, o, t);
      const thr1 = o.kind === 'door' ? DOOR_MM : TRACK_MM;
      inflow = 0.005 * Math.max(0, r - thr1) * hh;
      if (o.open > 0.2) inflow += 0.3 * r * P.area[id] * Math.min(1, o.open) * hh;   // an open leaf lets the rain straight in
    }
    if (inflow > 0) {
      const absorbed = Math.min(inflow, o.towelsL);
      o.towelsL -= absorbed; inflow -= absorbed;
      o.litres += inflow;
      addFloor(S, id, inflow);
    }
  }

  // street water under the garage door and the front door (sandbags raise the thresholds)
  const sw = L.streetWaterM;
  if (sw > 0) {
    const gThr = STREET_GARAGE_M + S.openings.door_garage_roll.sandbagM;
    if (sw > gThr) addFloor(S, 'door_garage_roll', (sw - gThr) * 200 * hh);
    const fThr = STREET_FOYER_M + S.openings.door_front.sandbagM;
    if (sw > fThr) addFloor(S, 'door_front', (sw - fThr) * 200 * hh);
  }
  // a failed garage door: driven rain across the slab regardless of sandbags
  if (S.garageDoor.failed) {
    const r = rw[2];
    if (r > 0) addFloor(S, 'door_garage_roll', 0.02 * r * hh);
  }

  // the attic reservoir intake
  const attic = S.roof.atticWaterL;
  for (let i = 0; i < 8; i++) {
    if (S.soffitIntegral[i] < SOFFIT_TIER3_MMH) continue;
    attic[i] += 0.15 * Math.max(0, rw[i] - SOFFIT_MM_PER_H) * (1 + 4 * sl[slopeOfSector(i)]) * hh;
  }

  // the leak points drain each cardinal's reservoir (plus half of each neighbouring diagonal)
  for (let ci = 0; ci < 4; ci++) {
    const c = CARDINALS[ci];
    const cl = (c + 7) % 8, cr = (c + 1) % 8;
    const points = LEAK_POINTS_BY_SECTOR[c];
    if (!points.length) continue;
    const V = attic[c] + 0.5 * (attic[cl] + attic[cr]);
    const eligible = S.soffitIntegral[c] >= SOFFIT_TIER3_MMH || S.soffitIntegral[cl] >= SOFFIT_TIER3_MMH || S.soffitIntegral[cr] >= SOFFIT_TIER3_MMH;
    // activation (ratchet)
    if (eligible) {
      for (let j = P.activation[c]; j < points.length; j++) {
        if (V >= LEAK_ACTIVATION_L[Math.min(j, LEAK_ACTIVATION_L.length - 1)]) {
          const lp = S.ceilingLeaks[points[j]];
          lp.active = true; lp.activeSince = H.now(); lp.tier = 1;
          P.activation[c] = j + 1;
          H.emit(EV.HOUSE_LEAK_STARTED, { lpId: lp.id, tier: 1 });
        } else break;
      }
    }
    const nActive = P.activation[c];
    let drained = 0;
    if (V > 1e-6) {
      if (nActive > 0) {
        const total = V / TAU_ATTIC_H;   // L/h
        const per = total / nActive;
        for (let j = 0; j < nActive; j++) {
          const lp = S.ceilingLeaks[points[j]];
          const dl = per * hh;
          stepLeakPoint(H, lp, per, dl, h);
          drained += dl;
        }
      } else {
        drained = V / (TAU_ATTIC_H * 4) * hh;   // no path opened yet: slow loss through the ridge vents
      }
      const f = Math.min(1, drained / V);
      attic[c] -= attic[c] * f;
      attic[cl] -= 0.5 * attic[cl] * f;
      attic[cr] -= 0.5 * attic[cr] * f;
    } else {
      for (let j = 0; j < nActive; j++) stepLeakPoint(H, S.ceilingLeaks[points[j]], 0, 0, h);
    }
  }
  for (let i = 0; i < 8; i++) if (attic[i] < 1e-9) attic[i] = 0;

  // floor water dries slowly in a sealed, humid house
  const evap = 1 - Math.exp(-h / FLOOR_EVAP_TAU_S);
  let floorTotal = 0;
  for (const key in S.floorWater) {
    const fw = S.floorWater[key];
    if (fw.litres > 0) { fw.litres -= fw.litres * evap; if (fw.litres < 1e-4) fw.litres = 0; fw.poolM2 = Math.min(POOL_CAP_M2, 0.075 * fw.litres); }
    floorTotal += fw.litres;
  }

  // mildew: 24 h after any leak reaches tier 2 (or a standing 20 L on the tile), grows over two days
  if (P.tier2Sim == null && floorTotal > 20) P.tier2Sim = H.now();
  if (P.tier2Sim != null && H.now() >= P.tier2Sim + 24 * 3600) S.mildew = Math.min(1, S.mildew + hh / 48);
}

function stepLeakPoint(H, lp, rateLph, dl, h) {
  const S = H.S, P = H.priv.intrusion;
  const hh = h / 3600;
  lp.rateLph = rateLph;
  if (dl > 0) {
    lp.litresDelivered += dl;
    lp.stainM2 = 0.05 * lp.litresDelivered;
    if (lp.bucket && !lp.collapsed) {
      const before = lp.bucketL;
      lp.bucketL += dl;
      if (lp.bucketL > BUCKET_CAP_L) {
        const spill = lp.bucketL - BUCKET_CAP_L;
        lp.bucketL = BUCKET_CAP_L;
        addFloor(S, lp.id, spill);
        if (before < BUCKET_CAP_L) H.emit(EV.HOUSE_BUCKET_OVERFLOW, { lpId: lp.id });
      }
    } else addFloor(S, lp.id, dl);
  }
  // tiers: drip / stream / sag
  let tier = lp.sag >= 1 ? 3 : (rateLph >= 0.5 ? 2 : (rateLph >= 0.02 ? 1 : (lp.tier === 0 ? 0 : 1)));
  if (lp.tier === 3) tier = 3;
  if (tier !== lp.tier) {
    lp.tier = tier;
    H.emit(EV.HOUSE_LEAK_TIER, { lpId: lp.id, tier });
    if (tier >= 2 && P.tier2Sim == null) P.tier2Sim = H.now();
  }
  // un-bucketed drip-hours → sag and collapse
  if (!lp.bucket && !lp.collapsed) {
    if (rateLph >= COLLAPSE_GATE_LPH) lp.unbucketedH += hh;
    if (rateLph >= SAG_GATE_LPH && lp.sag < 1) {
      lp.sag = Math.min(1, lp.sag + hh / SAG_H);
      if (lp.sag >= 1 && !P.sagFired[lp.id]) {
        P.sagFired[lp.id] = true; lp.tier = 3;
        H.emit(EV.HOUSE_CEILING_SAG, { lpId: lp.id });
        H.emit(EV.HOUSE_LEAK_TIER, { lpId: lp.id, tier: 3 });
      }
    }
    if (lp.unbucketedH >= COLLAPSE_H && lp.sag >= 1) {
      lp.collapsed = true; lp.tier = 3;
      addFloor(S, lp.id, BUCKET_CAP_L);   // the belly lets go: a bucket's worth, insulation on the floor
      H.emit(EV.HOUSE_CEILING_COLLAPSE, { lpId: lp.id });
    }
  }
}

/** Bucket handling for api.js. */
export function placeBucket(H, lpId, containerId) {
  const lp = H.S.ceilingLeaks[lpId];
  if (!lp) return { ok: false, reason: 'no such leak point' };
  if (lp.bucket) return { ok: false, reason: 'a bucket is already there' };
  lp.bucket = containerId || 'bucket'; lp.bucketL = 0;
  return { ok: true };
}
export function emptyBucket(H, lpId) {
  const lp = H.S.ceilingLeaks[lpId];
  if (!lp || !lp.bucket) return { ok: false, reason: 'no bucket there', litres: 0 };
  const litres = lp.bucketL; lp.bucketL = 0;
  return { ok: true, litres };
}
export function removeBucket(H, lpId) {
  const lp = H.S.ceilingLeaks[lpId];
  if (!lp || !lp.bucket) return { ok: false, reason: 'no bucket there', litres: 0 };
  const litres = lp.bucketL; lp.bucket = null; lp.bucketL = 0;
  return { ok: true, litres };
}
export function placeTowel(H, openingId) {
  const o = H.S.openings[openingId], P = H.priv.intrusion;
  if (!o || !(openingId in P.towels)) return { ok: false, reason: 'no towel socket there' };
  if (P.towels[openingId] >= 4) return { ok: false, reason: 'no room for another towel' };
  P.towels[openingId]++; o.towelsL += 2;
  return { ok: true, towels: P.towels[openingId] };
}
export function wringTowel(H, openingId) {
  const o = H.S.openings[openingId], P = H.priv.intrusion;
  if (!o || !P.towels[openingId]) return { ok: false, reason: 'no towel there', litres: 0 };
  const cap = 2 * P.towels[openingId];
  const litres = Math.max(0, cap - o.towelsL);
  o.towelsL = cap;
  return { ok: true, litres };
}
export function placeSandbag(H, doorId) {
  const S = H.S;
  const target = doorId === 'door_laundry_garage' ? S.openings.door_garage_roll : (doorId === 'door_front' ? S.openings.door_front : null);
  if (!target) return { ok: false, reason: 'no sandbag socket there' };
  if (target.sandbagM >= 0.12 - 1e-9) return { ok: false, reason: 'the stack is full' };
  target.sandbagM = Math.min(0.12, target.sandbagM + 0.03);
  return { ok: true, sandbagM: target.sandbagM };
}
