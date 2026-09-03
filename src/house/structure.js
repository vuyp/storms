/**
 * house/structure.js — the bucket rule (ARCHITECTURE §8.1, DESIGN §6.2), implemented once and reused by
 * utilities/ and hood/, plus the house's static geometry tables (room façades, adjacency, slopes) derived
 * from core/ids.js so the house model needs no world/ registry to run in node.
 *
 * Owner: E3 house. Writes: nothing (pure). Reads: nothing (pure helpers over sim-time values).
 * Budget: pure functions, no allocation in the hot path (ARCHITECTURE §10 house row: ≤ 0.025 ms per sub-step).
 *
 * The rule, quoted:
 *   bucket k = floor(simTime/600)
 *   integral components: H_c += hazard_c(state)·dtSim ; fail when 1 − exp(−H_c) ≥ u_c, u_c = hash01(seed, c)
 *   per-bucket components: p_c,k from the bucket's peak envelope; fail when p_c,k ≥ hash01(seed, c, k)
 *   thresholds N(μ,σ): drawn once per component in init from stream 'damage'
 * Per-bucket components are evaluated on the *running* bucket max at every sub-step against the bucket's
 * single roll, so a failure lands on the sub-step whose envelope carried it over — the outcome per bucket is
 * identical to an end-of-bucket evaluation, and identical at 1× and 3600× because the 5-s samples are.
 */
import { hash01, normalFromU } from '../core/rng.js';
import {
  OPENINGS, OPENING_IDS, OPENING_ROOM, WALL_DEG, WALL_SECTOR, INTERIOR_DOORS, EXTERIOR_DOORS, CASED_OPENINGS,
  INTERIOR_ROOM_IDS, LEAK_POINTS, LEAK_POINT_IDS,
} from '../core/ids.js';

export const BUCKET_S = 600;

/** 10-sim-minute bucket index. */
export function bucketOf(simTime) { return Math.floor(simTime / BUCKET_S); }

/** The per-bucket roll for component c in bucket k — the same number at any speed (ARCHITECTURE §8.1). */
export function bucketRoll(seed, component, k) { return hash01(seed, 'bucket', component, k); }

/** The one-per-component uniform for integral-hazard components. */
export function componentU(seed, component) { return hash01(seed, 'u', component); }

/** Integral-hazard test: 1 − exp(−H) ≥ u. */
export function integralFailed(H, u) { return 1 - Math.exp(-H) >= u; }

/** A threshold N(μ, σ) drawn statelessly from the seed (for components created outside init). */
export function thresholdFromHash(seed, component, mu, sigma) { return normalFromU(hash01(seed, 'threshold', component), mu, sigma); }

/** A threshold N(μ, σ) drawn from the 'damage' stream (init-time components; draw order is fixed by the caller). */
export function thresholdFromStream(stream, mu, sigma) { return stream.normal(mu, sigma); }

/** Smallest signed angle a − b in (−180, 180]. */
export function angleDiffDeg(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360; else if (d <= -180) d += 360;
  return d;
}
const DEG = Math.PI / 180;
/** max(0, cos(dirFrom − façade)) — the windward projection used by every load in §8.2. */
export function cosFace(dirFromDeg, facadeDeg) { return Math.max(0, Math.cos(angleDiffDeg(dirFromDeg, facadeDeg) * DEG)); }
/** |cos(dirFrom − n)| for cage panels (loaded from either side). */
export function absCos(dirFromDeg, facadeDeg) { return Math.abs(Math.cos(angleDiffDeg(dirFromDeg, facadeDeg) * DEG)); }

/**
 * The glass-load coefficient for bare-glass failure. Windward walls take the stagnation pressure and the
 * direct debris stream (cos Δ); side walls — parallel to the wind — carry the largest *suction* coefficients
 * of the envelope (ASCE 7 GCp ≈ −0.8 … −1.1 near corners) and the debris that streams along the wall, so a
 * window on a wall at 60–90° to the wind is loaded almost as hard as a windward one; a lee wall (Δ > 120°)
 * is shielded. This is what makes the north-wall peep window the "classic omission" of DESIGN §3.4 at ≈ 18 %
 * over a storm whose wind is E-ish then W-ish: max(cos Δ, 0.74·|sin Δ|) with the lee taper (0.74 calibrated to the
 * 14–22 % acceptance band of ARCHITECTURE §13.6 on the §2.7 record; 0.9 gives ≈ 50 %).
 */
export const GLASS_PARAMS = { sideCoef: 0.74 };
export function glassLoadCoef(dirFromDeg, facadeDeg) {
  const d = angleDiffDeg(dirFromDeg, facadeDeg) * DEG;
  const c = Math.cos(d), s = Math.abs(Math.sin(d));
  const lee = c < -0.5 ? Math.max(0, (c + 0.85) / 0.35) : 1;   // 1 down to 0 between Δ = 120° and 148°
  return Math.max(Math.max(0, c), GLASS_PARAMS.sideCoef * s * lee);
}

/** Running bucket-max tracker for a per-bucket component. */
export function createBucketMax() {
  return { k: -1, max: 0, rolled: false };
}
/** Update the tracker with this sub-step's value; returns true when a new bucket began. */
export function bucketMaxUpdate(t, k, value) {
  let fresh = false;
  if (k !== t.k) { t.k = k; t.max = 0; t.rolled = false; fresh = true; }
  if (value > t.max) t.max = value;
  return fresh;
}

// ------------------------------------------------------------------------------------------------------------
// Static tables (DESIGN §3.3–3.5, §16.4) derived from core/ids.js — the same data world/plan.js builds from.
// ------------------------------------------------------------------------------------------------------------

/** Exterior openings that belong to the house envelope proper (the cage screen door is the cage's). */
export const ENVELOPE_OPENING_IDS = Object.freeze(OPENING_IDS.filter(id => id !== 'door_cage_screen'));
/** Glazed openings that can fail by pressure/debris (doors are steel; the garage roll-up has its own model). */
export const GLAZED_OPENING_IDS = Object.freeze(OPENING_IDS.filter(id => ['window', 'peep', 'slider'].includes(OPENINGS[id].kind)));
/** Openings that take part in the water ladder (tracks, sills, thresholds). */
export const LADDER_OPENING_IDS = Object.freeze(OPENING_IDS.filter(id => ['window', 'peep', 'slider', 'door'].includes(OPENINGS[id].kind)));
export const EXTERIOR_DOOR_IDS = Object.freeze(Object.keys(EXTERIOR_DOORS));

/** Room → exterior façade azimuths it has openings on (ahuCloset has a windowless south wall). */
export const ROOM_FACADES = (() => {
  const m = {};
  for (const r of INTERIOR_ROOM_IDS) m[r] = [];
  for (const id of ENVELOPE_OPENING_IDS) {
    const r = OPENING_ROOM[id];
    const deg = WALL_DEG[OPENINGS[id].wall];
    if (m[r] && !m[r].includes(deg)) m[r].push(deg);
  }
  m.ahuCloset.push(180);
  for (const r of INTERIOR_ROOM_IDS) Object.freeze(m[r]);
  return Object.freeze(m);
})();

/** Room → its envelope openings. */
export const ROOM_OPENINGS = (() => {
  const m = {};
  for (const r of INTERIOR_ROOM_IDS) m[r] = [];
  for (const id of ENVELOPE_OPENING_IDS) if (m[OPENING_ROOM[id]]) m[OPENING_ROOM[id]].push(id);
  for (const r of INTERIOR_ROOM_IDS) Object.freeze(m[r]);
  return Object.freeze(m);
})();

/**
 * plan.adjacency as ARCHITECTURE §6.6 defines it — `adjacency[roomId] = [{roomId, doorId|null}]` — built from
 * the door list and the cased openings of core/ids.js (identical to world/plan.js's export).
 */
export const ADJACENCY = (() => {
  const adj = {};
  const add = (a, b, doorId) => { (adj[a] = adj[a] || []).push({ roomId: b, doorId }); (adj[b] = adj[b] || []).push({ roomId: a, doorId }); };
  for (const [id, d] of Object.entries(INTERIOR_DOORS)) add(d.between[0], d.between[1], id);
  for (const [id, d] of Object.entries(EXTERIOR_DOORS)) add(d.between[0], d.between[1], id);
  add('garage', 'outside', 'door_garage_roll');
  for (const [a, b] of CASED_OPENINGS) add(a, b, null);
  add('lanai', 'cage', null);
  for (const r of INTERIOR_ROOM_IDS) adj[r] = adj[r] || [];
  return Object.freeze(adj);
})();

/** Rooms adjacent to the garage through a door (the pressurised-attic term of §8.2). */
export const GARAGE_ADJACENT = Object.freeze(ADJACENCY.garage.filter(e => e.doorId && INTERIOR_ROOM_IDS.includes(e.roomId)).map(e => e.roomId));

/** Leak points per façade sector, in activation order (DESIGN §6.6: the foyer can first, the window head second). */
export const LEAK_POINTS_BY_SECTOR = (() => {
  const order = ['lp_foyer_can', 'lp_bed2_head', 'lp_hall_detector', 'lp_master_can', 'lp_great_register', 'lp_den_ceiling'];
  const m = [[], [], [], [], [], [], [], []];
  for (const id of order) if (LEAK_POINTS[id]) m[LEAK_POINTS[id].sector].push(id);
  for (const id of LEAK_POINT_IDS) if (!order.includes(id)) m[LEAK_POINTS[id].sector].push(id);
  return Object.freeze(m.map(a => Object.freeze(a)));
})();

/** Roof slope index (N 0, E 1, S 2, W 3) facing a "from" direction. */
export function slopeOfDir(dirFromDeg) { return ((Math.round((((dirFromDeg % 360) + 360) % 360) / 90) % 4) + 4) % 4; }
/** Slope index for a façade sector (0..7 → N,E,S,W); diagonal sectors map to the nearer cardinal (NE→E, SE→E…). */
export function slopeOfSector(sector) { return [0, 1, 1, 2, 2, 3, 3, 0][((sector % 8) + 8) % 8]; }

export { WALL_SECTOR, WALL_DEG };
