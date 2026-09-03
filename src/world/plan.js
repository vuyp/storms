/**
 * world/plan.js — the house and lot as data (DESIGN §3.2–3.7, §4, §16.2–16.4; ARCHITECTURE §6.6 `plan`).
 * Owner: E4 world+textures. Pure data + pure functions: importable in node without THREE or the DOM.
 * Writes no state. Frozen with the ID registry: every id here comes from core/ids.js.
 *
 * Coordinates (ARCHITECTURE §2): metres, +X east, +Y up, +Z south; origin = the slab's NW corner at finished
 * floor. Wall centre-lines are exactly DESIGN §3.2 (a line may be moved ≤ 0.05 m; none has been).
 */
import {
  OPENINGS, OPENING_IDS, OPENING_ROOM, INTERIOR_DOORS, EXTERIOR_DOORS, CASED_OPENINGS, LEAK_POINTS, LEAK_POINT_IDS,
  SOCKETS, SOCKET_IDS, FIXTURE_IDS, CEILING_FIXTURES, LAMP_IDS, WINDOW_LIGHT_OPENINGS, LIGHT_SOCKET_IDS, TRANSFORMERS, TRANSFORMER_IDS,
  TREES, TREE_IDS, STREETLIGHTS, HOOD_HOUSES, ROOM_IDS, INTERIOR_ROOM_IDS, ROOM_SWITCH, PROP_IDS, OBJECT_IDS, WALL_DEG,
} from '../core/ids.js';
import { LAYOUT, HOOD_LAYOUT } from './props/layout.js';

// ---------------------------------------------------------------------------------------------------------------
// 1. Dimensions (DESIGN §3.1, §3.6, §3.7)
// ---------------------------------------------------------------------------------------------------------------
export const SLAB = Object.freeze({ x0: 0, x1: 14.0, z0: 0, z1: 19.8 });
export const DIM = Object.freeze({
  ceiling: 2.85, tray: 3.15, wallTop: 3.05, extT: 0.25, intT: 0.115, eave: 0.6, pitch: 1 / 3, eaveY: 3.05,
  grade: -0.30, lanaiY: -0.15, porchY: -0.15, deckY: -0.15, poolWaterY: -0.30, swaleY: -0.80, streetCrownY: -0.45, streetEdgeY: -0.55,
  pondBankY: -0.5, pondWaterY: -1.5, casedHead: 2.15, doorH: 2.03, baseboardH: 0.09, casingW: 0.06,
});
export const LOT = Object.freeze({ x0: -16.4, x1: 21.6, z0: -2.1, z1: 21.9 });
export const LANAI = Object.freeze({ x0: -3.0, x1: 0, z0: 6.5, z1: 17.5, y: -0.15, ceilingY: 2.85 });
export const CAGE = Object.freeze({ x0: -9.0, x1: 0, z0: 6.0, z1: 18.0, y: -0.15, hHouse: 3.05, hOuter: 2.6, mansardX: -7.4, door: [-9.0, 7.0] });
export const POOL = Object.freeze({ x0: -8.0, x1: -4.0, z0: 8.0, z1: 16.0, depthShallow: 1.1, depthDeep: 1.8, waterY: -0.30, deckY: -0.15, pad: [-2.0, 18.5] });
export const DRIVEWAY = Object.freeze({ x0: 14.0, x1: 23.1, z0: 0.5, z1: 6.5 });
export const PORCH = Object.freeze({ x0: 14.0, x1: 16.0, z0: 6.9, z1: 9.9, y: -0.15, roof: { x0: 14.0, x1: 16.4, z0: 6.6, z1: 10.2 } });
export const WALK = Object.freeze([{ x0: 16.0, x1: 19.4, z0: 7.9, z1: 9.3 }, { x0: 18.0, x1: 19.4, z0: 6.5, z1: 7.9 }]);
export const SWALE = Object.freeze({ x0: 21.6, x1: 23.1, bottomY: -0.80, inlets: [[23.0, 14], [23.0, 44]] });
export const STREET = Object.freeze({ x0: 23.1, x1: 30.4, crownX: 26.75, z0: -50, z1: 112, crownY: -0.45, edgeY: -0.55, width: 7.3 });
export const BULB = Object.freeze({ cx: 26.75, cz: -38, r: 12 });
export const MAIN_ROAD = Object.freeze({ z0: 112, z1: 121, x0: -60, x1: 140 });
export const EGRET_WAY = Object.freeze({ z0: 72, z1: 79, x0: 30.4, x1: 140 });
export const POND = Object.freeze({ bankX: -17.5, waterX: -20.0, farX: -80.0, z0: -25, z1: 40, bankY: -0.5, waterY: -1.5, fountain: [-50, 8], maxRise: 1.2 });
export const CONDENSER = Object.freeze({ x0: 11.0, x1: 12.0, z0: 20.2, z1: 21.0 });
export const MAST = Object.freeze({ pos: [-2.5, 6.8], top: 4.3 });
export const MAILBOX = Object.freeze([22.0, 8.0]);
export const METER = Object.freeze([12.0, 0.0]);
export const POLES = Object.freeze([[20.0, -2.5], [9.0, -3.0], [-4.0, -3.0]]);
export const PAD_MOUNT = Object.freeze([22.5, 30]);
export const HEDGE = Object.freeze({ x: 14.3, z0: 1.0, z1: 19.0 });

// ---------------------------------------------------------------------------------------------------------------
// 2. Wall centre-lines (DESIGN §3.2). dir 'EW': runs east–west at z = at over x ∈ [from,to]; 'NS': at x = at over z.
//    Openings are ranges along the wall's running coordinate. `ext` walls carry the outward façade letter.
// ---------------------------------------------------------------------------------------------------------------
const O = (id, from, to, sill, head, kind, more = {}) => ({ id, from, to, sill, head, kind, ...more });
export const lines = Object.freeze([
  // exterior (t 0.25) — faces at 0/0.25, 13.75/14, 0/0.25, 19.55/19.8
  { id: 'N', dir: 'EW', at: 0.125, from: 0, to: 14.0, t: 0.25, ext: true, outward: 'N', openings: [
    O('win_nook_N', 1.80, 3.30, 0.9, 2.1, 'window', { bay: true, projection: 0.45 }),
    O('peep_laundry_N', 6.25, 6.85, 1.5, 2.1, 'peep'),
    O('door_garage_man', 12.50, 13.31, 0, 2.03, 'door'),
  ] },
  { id: 'E', dir: 'NS', at: 13.875, from: 0, to: 19.8, t: 0.25, ext: true, outward: 'E', openings: [
    O('door_garage_roll', 0.90, 5.80, 0, 2.13, 'garage'),
    O('door_front', 7.90, 8.81, 0, 2.03, 'door', { unitWith: 'sidelight_foyer_E' }),
    O('sidelight_foyer_E', 8.81, 9.11, 0, 2.03, 'window', { unit: 'door_front' }),
    O('win_bed2_E', 12.80, 13.70, 0.9, 2.1, 'window'),
    O('win_bed3_E', 16.90, 17.80, 0.9, 2.1, 'window'),
  ] },
  { id: 'S', dir: 'EW', at: 19.675, from: 0, to: 14.0, t: 0.25, ext: true, outward: 'S', openings: [
    O('win_master_S', 2.00, 2.90, 0.9, 2.1, 'window'),
    O('win_den_S', 8.00, 8.90, 0.9, 2.1, 'window'),
  ] },
  { id: 'W', dir: 'NS', at: 0.125, from: 0, to: 19.8, t: 0.25, ext: true, outward: 'W', openings: [
    O('win_kitchen_W', 4.30, 5.20, 1.1, 2.1, 'window'),
    O('slider_great_W', 8.00, 10.70, 0, 2.44, 'slider'),
    O('win_mbath_W', 13.40, 14.00, 1.5, 2.1, 'window', { obscure: true }),
    O('slider_master_W', 15.50, 17.30, 0, 2.03, 'slider'),
  ] },
  // interior (t 0.115)
  { id: 'x1', dir: 'NS', at: 3.95, from: 11.3, to: 15.2, t: 0.115, openings: [O('door_masterCloset', 13.30, 14.11, 0, 2.03, 'door')] },
  { id: 'x2', dir: 'NS', at: 4.95, from: 15.2, to: 19.675, t: 0.115, openings: [O('door_master', 15.50, 16.31, 0, 2.03, 'door')] },
  { id: 'x3a', dir: 'NS', at: 5.60, from: 0.125, to: 6.7, t: 0.115, openings: [O('door_laundry_kitchen', 1.20, 2.01, 0, 2.03, 'door'), O('door_pantry', 4.40, 5.21, 0, 2.03, 'door')] },
  { id: 'x3b', dir: 'NS', at: 5.60, from: 6.7, to: 10.0, t: 0.115, openings: [O('cased_great_dining', 7.20, 9.60, 0, 2.15, 'cased')] },
  { id: 'x4a', dir: 'NS', at: 6.50, from: 11.3, to: 15.2, t: 0.115, openings: [] },
  { id: 'x4b', dir: 'NS', at: 6.50, from: 16.4, to: 19.675, t: 0.115, openings: [] },
  { id: 'x5', dir: 'NS', at: 7.50, from: 0.125, to: 6.7, t: 0.115, openings: [O('door_laundry_garage', 1.40, 2.21, 0, 2.03, 'door')] },
  { id: 'x6', dir: 'NS', at: 7.70, from: 11.3, to: 15.2, t: 0.115, openings: [O('door_hallBath', 12.40, 13.21, 0, 2.03, 'door'), O('door_linen', 14.10, 14.91, 0, 2.03, 'door')] },
  { id: 'x7a', dir: 'NS', at: 10.40, from: 6.7, to: 10.0, t: 0.115, openings: [O('cased_dining_foyer', 7.60, 9.10, 0, 2.15, 'cased')] },
  { id: 'x7b', dir: 'NS', at: 10.40, from: 11.3, to: 19.675, t: 0.115, openings: [O('door_bed3', 15.50, 16.31, 0, 2.03, 'door')] },
  { id: 'z1', dir: 'EW', at: 3.00, from: 5.6, to: 7.5, t: 0.115, openings: [] },
  { id: 'z2', dir: 'EW', at: 6.70, from: 5.6, to: 13.875, t: 0.115, openings: [] },
  { id: 'z3', dir: 'EW', at: 10.00, from: 5.6, to: 10.4, t: 0.115, openings: [O('cased_dining_frontHall', 7.00, 9.00, 0, 2.15, 'cased')] },
  { id: 'z4a', dir: 'EW', at: 11.30, from: 3.95, to: 6.5, t: 0.115, openings: [] },
  { id: 'z4b', dir: 'EW', at: 11.30, from: 7.7, to: 13.875, t: 0.115, openings: [O('door_bed2', 11.20, 12.01, 0, 2.03, 'door')] },
  { id: 'z5', dir: 'EW', at: 12.20, from: 0.125, to: 3.95, t: 0.115, openings: [] },
  { id: 'z6', dir: 'EW', at: 13.815, from: 7.7, to: 10.4, t: 0.115, openings: [] },
  { id: 'z7a', dir: 'EW', at: 15.20, from: 0.125, to: 3.95, t: 0.115, openings: [O('door_masterBath', 2.50, 3.31, 0, 2.03, 'door')] },
  { id: 'z7b', dir: 'EW', at: 15.20, from: 3.95, to: 6.5, t: 0.115, openings: [] },
  { id: 'z7c', dir: 'EW', at: 15.20, from: 7.7, to: 10.4, t: 0.115, openings: [] },
  { id: 'z7d', dir: 'EW', at: 15.20, from: 10.4, to: 13.875, t: 0.115, openings: [] },
  { id: 'z8', dir: 'EW', at: 16.40, from: 4.95, to: 10.4, t: 0.115, openings: [O('door_ahu', 5.30, 6.11, 0, 2.03, 'door', { louvred: true }), O('door_den', 8.00, 8.81, 0, 2.03, 'door')] },
]);
export const lineById = Object.freeze(Object.fromEntries(lines.map(l => [l.id, l])));

// ---------------------------------------------------------------------------------------------------------------
// 3. Rooms (DESIGN §3.3): clear polygons for roomOf, rectangle decompositions for the floor/ceiling builders.
// ---------------------------------------------------------------------------------------------------------------
const box = (x0, z0, x1, z1) => ({ polygon: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], rects: [[x0, z0, x1, z1]] });
const R = (id, geom, more) => ({ id, floorY: 0, ceilingY: DIM.ceiling, floor: 'tile', ceiling: 'knockdown', paint: 'greige', ...geom, ...more });
export const rooms = Object.freeze({
  nook: R('nook', box(0.25, 0.25, 5.5425, 3.30), { paint: 'sage' }),
  kitchen: R('kitchen', box(0.25, 3.30, 5.5425, 6.70), { paint: 'sage' }),
  great: R('great', {
    polygon: [[0.25, 6.70], [5.5425, 6.70], [5.5425, 11.2425], [3.8925, 11.2425], [3.8925, 12.1425], [0.25, 12.1425]],
    rects: [[0.25, 6.70, 5.5425, 11.2425], [0.25, 11.2425, 3.8925, 12.1425]],
  }),
  laundry: R('laundry', box(5.6575, 0.25, 7.4425, 2.9425), { paint: 'white' }),
  pantry: R('pantry', box(5.6575, 3.0575, 7.4425, 6.6425), { paint: 'white' }),
  garage: R('garage', box(7.5575, 0.25, 13.75, 6.6425), { floor: 'concrete', ceiling: 'garage', paint: 'block' }),
  dining: R('dining', box(5.6575, 6.7575, 10.3425, 9.9425), { paint: 'terracotta' }),
  foyer: R('foyer', box(10.4575, 6.7575, 13.75, 10.0575)),
  frontHall: R('frontHall', box(5.6575, 10.0575, 13.75, 11.2425)),
  bedHall: R('bedHall', {
    polygon: [[6.5575, 11.2425], [7.6425, 11.2425], [7.6425, 15.2575], [10.3425, 15.2575], [10.3425, 16.3425], [5.0075, 16.3425], [5.0075, 15.2575], [6.5575, 15.2575]],
    rects: [[6.5575, 11.2425, 7.6425, 15.2575], [5.0075, 15.2575, 10.3425, 16.3425]],
  }),
  hallBath: R('hallBath', box(7.7575, 11.3575, 10.3425, 13.7575), { paint: 'white' }),
  linen: R('linen', box(7.7575, 13.8725, 10.3425, 15.1425), { paint: 'white' }),
  masterBath: R('masterBath', box(0.25, 12.2575, 3.8925, 15.1425), { paint: 'white' }),
  masterCloset: R('masterCloset', box(4.0075, 11.3575, 6.4425, 15.1425), { floor: 'carpet', paint: 'white' }),
  masterBR: R('masterBR', box(0.25, 15.2575, 4.8925, 19.55), { ceilingY: DIM.ceiling, ceiling: 'tray', trayY: DIM.tray, trayInset: 0.75, paint: 'blue' }),
  ahuCloset: R('ahuCloset', box(5.0075, 16.4575, 6.4425, 19.55), { floor: 'concrete', paint: 'white' }),
  den: R('den', box(6.5575, 16.4575, 10.3425, 19.55), { floor: 'carpet', paint: 'greige' }),
  bed2: R('bed2', box(10.4575, 11.3575, 13.75, 15.1425), { floor: 'carpet', paint: 'blue' }),
  bed3: R('bed3', box(10.4575, 15.2575, 13.75, 19.55), { floor: 'carpet', paint: 'greige' }),
  lanai: R('lanai', box(LANAI.x0, LANAI.z0, LANAI.x1, LANAI.z1), { floorY: LANAI.y, ceilingY: LANAI.ceilingY, floor: 'pavers', ceiling: 'knockdown', paint: 'white', exterior: true }),
  cage: R('cage', box(CAGE.x0, CAGE.z0, CAGE.x1, CAGE.z1), { floorY: CAGE.y, ceilingY: CAGE.hOuter, floor: 'pavers', ceiling: 'none', exterior: true }),
  // The Nguyens' walkable shell (DESIGN §4.2 `nguyen_interior`, cut-list item 1): their foyer + front hall + dining + great room, translated by (0, −26).
  nguyenFoyer: R('nguyenFoyer', {
    polygon: [[0.25, 6.70 - 26], [13.75, 6.70 - 26], [13.75, 11.2425 - 26], [3.8925, 11.2425 - 26], [3.8925, 12.1425 - 26], [0.25, 12.1425 - 26]],
    rects: [[0.25, 6.70 - 26, 13.75, 11.2425 - 26], [0.25, 11.2425 - 26, 3.8925, 12.1425 - 26]],
  }, { origin: [0, -26] }),
});
export const roomIds = Object.freeze(Object.keys(rooms));
/** Room centres at eye height (also used by main.js as `world.roomCentre`). */
export function roomCentre(id) {
  const r = rooms[id];
  if (!r) return null;
  const rect = r.rects[0];
  return [(rect[0] + rect[2]) / 2, r.floorY + 1.65, (rect[1] + rect[3]) / 2];
}
/** Wall paint colours (DESIGN §3.3 "pastel/beige/greige"). */
export const PAINTS = Object.freeze({
  greige: [0.84, 0.80, 0.72], sage: [0.78, 0.82, 0.72], white: [0.93, 0.92, 0.89], terracotta: [0.86, 0.72, 0.60], blue: [0.74, 0.80, 0.84], block: [0.86, 0.85, 0.82],
  ceiling: [0.95, 0.94, 0.92], trim: [0.96, 0.95, 0.93],
});

// ---------------------------------------------------------------------------------------------------------------
// 4. Openings (DESIGN §3.4) — geometry records: wall plane, along-range, sill/head, exterior normal, centre.
// ---------------------------------------------------------------------------------------------------------------
function wallNormal(letter) { return { N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1], W: [-1, 0, 0] }[letter]; }
export const openings = Object.freeze(Object.fromEntries(OPENING_IDS.map(id => {
  const def = OPENINGS[id];
  if (id === 'door_cage_screen') {
    return [id, {
      id, kind: 'screen', wall: 'W', line: 'cage', facadeDeg: WALL_DEG.W, room: 'cage', normal: [-1, 0, 0], plane: { axis: 'x', at: CAGE.x0 },
      from: CAGE.door[1] - 0.45, to: CAGE.door[1] + 0.45, sill: CAGE.y, head: CAGE.y + 2.0, w: 0.9, h: 2.0,
      centre: [CAGE.x0, CAGE.y + 1.0, CAGE.door[1]], panels: 0, thickness: 0.05, hinge: 'from', swingInto: 'outside',
    }];
  }
  const line = lines.find(l => l.ext && l.openings.some(o => o.id === id));
  const o = line.openings.find(x => x.id === id);
  const n = wallNormal(line.outward);
  const along = (o.from + o.to) / 2;
  const centre = line.dir === 'EW' ? [along, (o.sill + o.head) / 2, line.at] : [line.at, (o.sill + o.head) / 2, along];
  const exteriorFace = line.dir === 'EW' ? line.at + n[2] * line.t / 2 : line.at + n[0] * line.t / 2;
  const interiorFace = line.dir === 'EW' ? line.at - n[2] * line.t / 2 : line.at - n[0] * line.t / 2;
  return [id, {
    id, kind: def.kind, wall: line.outward, line: line.id, facadeDeg: WALL_DEG[line.outward], room: OPENING_ROOM[id], normal: n,
    plane: { axis: line.dir === 'EW' ? 'z' : 'x', at: line.at, exteriorFace, interiorFace, t: line.t },
    from: o.from, to: o.to, sill: o.sill, head: o.head, w: o.to - o.from, h: o.head - o.sill, centre, along,
    panels: typeof def.panels === 'number' ? def.panels : def.panels, bay: !!o.bay, projection: o.projection || 0, obscure: !!o.obscure, unit: o.unit || null, unitWith: o.unitWith || null,
    swing: def.swing || null,
  }];
})));

// ---------------------------------------------------------------------------------------------------------------
// 5. Doors (DESIGN §3.5): hinge end, swing room, the room on each side, the pivot's world position.
// ---------------------------------------------------------------------------------------------------------------
const HINGE = { // which end of the along-range carries the hinge ('from' = lower coordinate)
  door_laundry_kitchen: 'from', door_pantry: 'from', door_laundry_garage: 'to', door_bed2: 'from', door_hallBath: 'to', door_linen: 'from',
  door_master: 'to', door_masterBath: 'from', door_masterCloset: 'from', door_bed3: 'from', door_den: 'from', door_ahu: 'from',
  door_front: 'from', door_garage_man: 'to', door_cage_screen: 'from', slider_great_W: 'from', slider_master_W: 'from',
};
function doorRecord(id, def, kind) {
  let line, o;
  if (id === 'door_cage_screen') {
    const op = openings[id];
    return {
      id, kind: 'screen', between: def.between, swingInto: def.swingInto, hingeSide: def.hingeSide, line: 'cage', axis: 'x', at: CAGE.x0,
      from: op.from, to: op.to, w: op.w, h: op.h, t: 0.05, sill: CAGE.y, hinge: HINGE[id],
      hingePos: [CAGE.x0, CAGE.y, HINGE[id] === 'from' ? op.from : op.to], swingDir: [-1, 0, 0], exterior: true, slider: false,
    };
  }
  for (const l of lines) { const f = l.openings.find(x => x.id === id); if (f) { line = l; o = f; break; } }
  const hinge = HINGE[id] || 'from';
  const hingeAlong = hinge === 'from' ? o.from : o.to;
  const hingePos = line.dir === 'EW' ? [hingeAlong, 0, line.at] : [line.at, 0, hingeAlong];
  // swing direction: the unit normal toward the swing room
  const into = def.swingInto;
  let swingDir;
  if (line.dir === 'EW') swingDir = [0, 0, roomSideSign(into, line, 'z')]; else swingDir = [roomSideSign(into, line, 'x'), 0, 0];
  return {
    id, kind, between: def.between, swingInto: into, hingeSide: def.hingeSide, line: line.id, axis: line.dir === 'EW' ? 'z' : 'x', at: line.at,
    from: o.from, to: o.to, w: o.to - o.from, h: o.head - o.sill, t: line.t, sill: o.sill, hinge, hingePos, swingDir,
    exterior: !!line.ext, slider: !!def.slider, steel: !!def.steel, selfClosing: !!def.selfClosing, bifold: !!def.bifold, louvred: !!def.louvred || !!o.louvred,
    slideDir: def.slider ? (line.dir === 'EW' ? [1, 0, 0] : [0, 0, 1]) : null, slideDistance: def.slider ? (o.to - o.from) / (id === 'slider_great_W' ? 3 : 2) : 0,
  };
}
/** +1/−1: which side of a wall line a room lies on (by its centre). */
function roomSideSign(roomId, line, axis) {
  if (roomId === 'outside' || roomId === 'lanai') {
    if (line.ext) { const n = wallNormal(line.outward); return axis === 'z' ? n[2] : n[0]; }
  }
  const c = roomCentre(roomId);
  const v = axis === 'z' ? c[2] : c[0];
  return v > line.at ? 1 : -1;
}
export const doors = Object.freeze(Object.fromEntries([
  ...Object.entries(INTERIOR_DOORS).map(([id, d]) => [id, doorRecord(id, d, 'interior')]),
  ...Object.entries(EXTERIOR_DOORS).map(([id, d]) => [id, doorRecord(id, d, d.slider ? 'slider' : 'exterior')]),
]));
export const casedOpenings = Object.freeze(lines.flatMap(l => l.openings.filter(o => o.kind === 'cased').map(o => ({ id: o.id, line: l.id, axis: l.dir === 'EW' ? 'z' : 'x', at: l.at, from: o.from, to: o.to, head: o.head }))));

// ---------------------------------------------------------------------------------------------------------------
// 6. Roofs (DESIGN §3.6, T §4): three hips at 4:12 with 0.6-m eaves, eave 3.05 m; plus the covered entry.
// ---------------------------------------------------------------------------------------------------------------
export const roofs = Object.freeze([
  { id: 'A', x0: -3.0, x1: 14.0, z0: 6.7, z1: 19.8, ridgeAxis: 'x', eave: 0.6, eaveY: 3.05, pitch: 1 / 3, gutters: ['E', 'W'] },
  { id: 'B', x0: 0.0, x1: 7.5, z0: 0.0, z1: 6.7, ridgeAxis: 'x', eave: 0.6, eaveY: 3.05, pitch: 1 / 3, gutters: ['W'] },
  { id: 'C', x0: 7.5, x1: 14.0, z0: 0.0, z1: 6.7, ridgeAxis: 'z', eave: 0.6, eaveY: 3.05, pitch: 1 / 3, gutters: ['E'] },
  { id: 'P', x0: PORCH.roof.x0, x1: PORCH.roof.x1, z0: PORCH.roof.z0, z1: PORCH.roof.z1, ridgeAxis: 'z', eave: 0.3, eaveY: 3.05, pitch: 1 / 3, gutters: [], porch: true },
]);
/** Roof geometry helpers (pure): ridge height and the outline of a hip roof. */
export function roofRidge(r) {
  const w = (r.ridgeAxis === 'x' ? (r.z1 - r.z0) : (r.x1 - r.x0)) + 2 * r.eave;
  const L = (r.ridgeAxis === 'x' ? (r.x1 - r.x0) : (r.z1 - r.z0)) + 2 * r.eave;
  return { ridgeY: r.eaveY + r.pitch * (w / 2), ridgeLen: Math.max(0, L - w), halfW: w / 2 };
}

// ---------------------------------------------------------------------------------------------------------------
// 7. Leak points (DESIGN §3.6, §16.4) with the ceiling stain anchor and the floor puddle point.
// ---------------------------------------------------------------------------------------------------------------
export const leakPoints = Object.freeze(Object.fromEntries(LEAK_POINT_IDS.map(id => {
  const lp = LEAK_POINTS[id];
  const room = rooms[lp.room];
  const ceilY = id === 'lp_master_can' ? DIM.tray : (id === 'lp_bed2_head' ? 2.2 : room.ceilingY);
  const floor = [lp.pos[0], room.floorY, lp.pos[2]];
  const bucket = id === 'lp_bed2_head' ? [13.3, 0, 13.25] : floor;
  return [id, { id, room: lp.room, sector: lp.sector, pos: [lp.pos[0], ceilY, lp.pos[2]], ceiling: [lp.pos[0], ceilY, lp.pos[2]], floor, bucket, normal: id === 'lp_bed2_head' ? [-1, 0, 0] : [0, -1, 0], kind: id === 'lp_bed2_head' ? 'head' : (id.endsWith('_can') ? 'can' : id === 'lp_great_register' ? 'register' : id === 'lp_hall_detector' ? 'detector' : 'ceiling') }];
})));

// ---------------------------------------------------------------------------------------------------------------
// 8. Sockets (DESIGN §16.2): every id of core/ids.js with a world position and a facing.
// ---------------------------------------------------------------------------------------------------------------
function panelSocketPos(openingId) {
  const op = openings[openingId];
  const n = op.normal;
  const off = op.bay ? op.projection + 0.08 : 0.08;
  return [op.centre[0] + n[0] * (op.plane.t / 2 + off), op.sill, op.centre[2] + n[2] * (op.plane.t / 2 + off)];
}
const SOCKET_POS = {
  sock_brace_slider_great_W: { pos: [0.55, 0, 9.35], rotY: 0 }, sock_brace_garage: { pos: [13.55, 0, 3.35], rotY: 0 },
  sock_sandbag_door_front: { pos: [13.35, 0, 8.35], rotY: 0, slots: [[0, 0, -0.35], [0, 0, 0.35], [0, 0.18, -0.15], [0, 0.18, 0.15]] },
  sock_sandbag_door_laundry_garage: { pos: [7.72, 0, 1.8], rotY: 0, slots: [[0, 0, -0.32], [0, 0, 0.32], [0, 0.18, -0.15], [0, 0.18, 0.15]] },
  sock_towel_door_front: { pos: [13.55, 0, 8.35], rotY: 0 }, sock_towel_slider_great_W: { pos: [0.42, 0, 9.35], rotY: 0 },
  sock_towel_slider_master_W: { pos: [0.42, 0, 16.4], rotY: 0 }, sock_towel_door_garage_man: { pos: [12.9, 0, 0.42], rotY: Math.PI / 2 },
  sock_towel_door_laundry_garage: { pos: [7.3, 0, 1.8], rotY: 0 }, sock_towel_win_bed2_E: { pos: [13.6, 0.9, 13.25], rotY: 0 }, sock_towel_win_bed3_E: { pos: [13.6, 0.9, 17.35], rotY: 0 },
  sock_mattress_frontHall: { pos: [7.0, 0, 10.65], rotY: Math.PI / 2 }, sock_mattress_bedHall: { pos: [7.1, 0, 13.2], rotY: 0 }, sock_mattress_masterCloset: { pos: [4.6, 0, 13.7], rotY: 0 },
  sock_gen_garage: { pos: [8.4, 0, 5.2], rotY: 0 }, sock_gen_lanai: { pos: [-1.0, LANAI.y, 16.2], rotY: 0 }, sock_gen_driveway: { pos: [18.0, -0.30, 5.4], rotY: 0 },
  sock_car_garage: { pos: [10.7, 0, 3.4], rotY: Math.PI / 2 }, sock_car_driveway: { pos: [18.8, -0.30, 3.5], rotY: Math.PI / 2 },
  sock_freezer: { pos: [5.05, 1.5, 3.85], rotY: 0 },
  sock_pool_sink: { pos: [-6.0, POOL.deckY - POOL.depthDeep + 0.2, 13.5], rotY: 0 }, sock_garage_store: { pos: [12.4, 0, 5.3], rotY: 0 }, sock_inside_store: { pos: [0.9, 0, 7.15], rotY: 0 },
  sock_candle_great: { pos: [3.4, 0.45, 9.4], rotY: 0 }, sock_candle_hallBath: { pos: [8.45, 0.9, 11.62], rotY: 0 }, sock_candle_masterBath: { pos: [2.5, 0.92, 12.6], rotY: 0 },
  sock_candle_dining: { pos: [8.4, 0.78, 8.35], rotY: 0 }, sock_lantern_nightstand: { pos: [4.5, 0.62, 19.3], rotY: 0 }, sock_lantern_hall: { pos: [7.1, 0, 14.6], rotY: 0 }, sock_lantern_closet: { pos: [5.2, 0, 14.8], rotY: 0 },
  sock_nwr_kitchen: { pos: [0.55, 0.92, 3.55], rotY: Math.PI / 2 }, sock_nwr_bedHall: { pos: [6.75, 0, 12.0], rotY: Math.PI / 2 }, sock_nwr_hallBath: { pos: [9.2, 0.86, 13.55], rotY: 0 },
  sock_nwr_masterCloset: { pos: [5.9, 0.4, 14.9], rotY: -Math.PI / 2 }, sock_nwr_nightstand: { pos: [4.3, 0.62, 19.15], rotY: -Math.PI / 2 },
  sock_phone_kitchen: { pos: [0.6, 0.92, 6.0], rotY: 0 }, sock_phone_nightstand: { pos: [4.5, 0.62, 16.6], rotY: 0 }, sock_phone_counter: { pos: [3.0, 0.92, 6.65], rotY: 0 },
  sock_hand: { pos: [0, 0, 0], rotY: 0 },
  sock_kerb_bags: { pos: [21.3, -0.45, 9.5], rotY: 0 }, sock_kerb_pile: { pos: [21.0, -0.45, 12.5], rotY: 0 },
};
export const sockets = Object.freeze(Object.fromEntries(SOCKET_IDS.map(id => {
  const def = SOCKETS[id];
  let pos, rotY = 0, slots = null;
  if (def.kind === 'panel') { pos = panelSocketPos(def.opening); const n = openings[def.opening].normal; rotY = Math.atan2(n[0], -n[2]); }
  else if (def.kind === 'bucket') { pos = leakPoints[def.leakPoint].bucket; }
  else { const s = SOCKET_POS[id]; pos = s.pos; rotY = s.rotY || 0; slots = s.slots || null; }
  return [id, { id, kind: def.kind, room: def.room, accepts: def.accepts, capacity: def.capacity, opening: def.opening || null, leakPoint: def.leakPoint || null, pos: [...pos], rotY, slots }];
})));

// ---------------------------------------------------------------------------------------------------------------
// 9. Fixtures (DESIGN §16.3): descriptors only — render owns every THREE.Light (Law 7).
// ---------------------------------------------------------------------------------------------------------------
const WARM = 0xffd1a3, COOL = 0xfff1dd, LED = 0xf4f7ff, BLUEW = 0xcfe6ff;
const CEIL_POS = {
  fix_nook: [2.55, 2.45, 1.9], fix_kitchen_1: [1.6, 2.85, 5.0], fix_kitchen_2: [4.0, 2.85, 5.0], fix_great_fan: [2.9, 2.5, 9.0], fix_laundry: [6.55, 2.85, 1.6],
  fix_pantry: [6.55, 2.85, 4.8], fix_garage_1: [9.2, 2.75, 3.4], fix_garage_2: [12.2, 2.75, 3.4], fix_dining: [8.0, 2.3, 8.35], fix_foyer_can: [12.2, 2.85, 8.4],
  fix_frontHall: [9.7, 2.85, 10.65], fix_bedHall_1: [7.1, 2.85, 13.0], fix_bedHall_2: [8.0, 2.85, 15.8], fix_hallBath: [9.05, 2.85, 12.5], fix_linen: [9.05, 2.85, 14.5],
  fix_masterBath_1: [1.3, 2.85, 13.7], fix_masterBath_2: [2.8, 2.85, 12.75], fix_masterCloset: [5.2, 2.85, 13.2], fix_master_fan: [2.5, 2.8, 17.4],
  fix_master_can: [1.2, 3.15, 16.0], fix_ahu: [5.7, 2.85, 18.0], fix_den: [8.4, 2.55, 18.0], fix_bed2: [12.1, 2.55, 13.2], fix_bed3: [12.1, 2.55, 17.4],
  fix_lanai_1: [-1.5, 2.55, 8.5], fix_lanai_2: [-1.5, 2.55, 12.0], fix_lanai_3: [-1.5, 2.55, 15.5], fix_coach_1: [14.06, 1.95, 7.55], fix_coach_2: [14.06, 1.95, 9.45], fix_pool: [-4.05, -0.85, 12.0],
};
const CIRCUIT = { garage: 'garage', kitchen: 'kitchen', nook: 'kitchen', laundry: 'kitchen', pantry: 'kitchen', bed2: 'bedrooms', bed3: 'bedrooms', masterBR: 'bedrooms', masterBath: 'bedrooms', masterCloset: 'bedrooms', den: 'bedrooms' };
const LAMP_POS = { lamp_great_1: [5.0, 1.15, 8.05], lamp_great_2: [0.7, 1.15, 11.75], lamp_nook: [4.9, 1.05, 0.7], lamp_nightstand: [4.45, 1.05, 16.75], lamp_bed2: [13.35, 1.02, 14.85], lamp_den: [10.1, 1.15, 18.35] };
const LAMP_ROOM = { lamp_great_1: 'great', lamp_great_2: 'great', lamp_nook: 'nook', lamp_nightstand: 'masterBR', lamp_bed2: 'bed2', lamp_den: 'den' };
const STREET_FIX = STREETLIGHTS.map(([x, z], i) => [`fix_street_${i + 1}`, { room: 'outside', pos: [x === 26.75 ? x : x - 1.9, 8.9, z], color: LED, kind: 'point', intensity: 1.0, powerCircuit: 'grid', priority: 'street', pole: [x, z] }]);
export const fixtures = Object.freeze(Object.fromEntries([
  ...Object.entries(CEILING_FIXTURES).map(([id, room]) => [id, {
    id, room, pos: CEIL_POS[id], kind: 'point', intensity: id.startsWith('fix_garage') ? 1.3 : id.startsWith('fix_coach') ? 0.5 : id === 'fix_pool' ? 0.6 : 1.0,
    color: id.startsWith('fix_garage') ? COOL : id === 'fix_pool' ? BLUEW : id.startsWith('fix_lanai') ? WARM : WARM,
    powerCircuit: CIRCUIT[room] || 'lights', switchId: ROOM_SWITCH[room] || 'switch_lights', fan: /fan/.test(id) || id.startsWith('fix_lanai'),
    leakPoint: id === 'fix_foyer_can' ? 'lp_foyer_can' : id === 'fix_master_can' ? 'lp_master_can' : null,
  }]),
  ...LAMP_IDS.map(id => [`fix_lamp_${id}`, { id: `fix_lamp_${id}`, room: LAMP_ROOM[id], pos: LAMP_POS[id], kind: 'point', intensity: 0.6, color: WARM, powerCircuit: id === 'lamp_nightstand' || id === 'lamp_bed2' || id === 'lamp_den' ? 'bedrooms' : 'lights', objectId: id, lamp: true }]),
  ...WINDOW_LIGHT_OPENINGS.map(id => {
    const op = openings[id];
    const n = op.normal;
    const inside = [op.centre[0] - n[0] * (op.plane.t / 2 + 0.02), op.centre[1], op.centre[2] - n[2] * (op.plane.t / 2 + 0.02)];
    return [`fix_win_${id}`, { id: `fix_win_${id}`, room: op.room, pos: inside, kind: 'rect', windowId: id, width: op.w, height: op.h, normal: [-n[0], 0, -n[2]], color: 0xffffff, intensity: 1.0, powerCircuit: 'daylight' }];
  }),
  ['fix_tv_great', { id: 'fix_tv_great', room: 'great', pos: [4.75, 1.5, 11.0], kind: 'emissive', color: 0x9fbfff, intensity: 0.5, powerCircuit: 'tv', objectId: 'tv_great', normal: [0, 0, -1] }],
  ['fix_tv_kitchen', { id: 'fix_tv_kitchen', room: 'kitchen', pos: [0.75, 1.15, 6.3], kind: 'emissive', color: 0x9fbfff, intensity: 0.25, powerCircuit: 'tv', objectId: 'tv_kitchen', normal: [1, 0, 0] }],
  ['fix_phone', { id: 'fix_phone', room: 'player', pos: [0, 0, 0], kind: 'emissive', color: 0xdde8ff, intensity: 0.15, powerCircuit: 'battery', follows: 'phone' }],
  ...LIGHT_SOCKET_IDS.map(sid => [`fix_candle_${sid}`, { id: `fix_candle_${sid}`, room: SOCKETS[sid].room, pos: [SOCKET_POS[sid].pos[0], SOCKET_POS[sid].pos[1] + 0.16, SOCKET_POS[sid].pos[2]], kind: 'point', color: 0xffa64d, intensity: 0.35, powerCircuit: 'flame', socketId: sid }]),
  ...STREET_FIX,
  ['fix_fountain', { id: 'fix_fountain', room: 'outside', pos: [POND.fountain[0], POND.waterY + 0.6, POND.fountain[1]], kind: 'point', color: 0xcfe8ff, intensity: 0.4, powerCircuit: 'grid' }],
  ['fix_ringLed', { id: 'fix_ringLed', room: 'outside', pos: [14.04, 1.2, 24 + 7.7], kind: 'emissive', color: 0x3a7bff, intensity: 0.08, powerCircuit: 'bergstrom' }],
  ['fix_rayWindows', { id: 'fix_rayWindows', room: 'outside', pos: [33.9, 1.5, 4.5], kind: 'emissive', color: WARM, intensity: 0.6, powerCircuit: 'rayGenerac', normal: [-1, 0, 0] }],
  ...TRANSFORMER_IDS.map(id => [`fix_transformer_${id}`, { id: `fix_transformer_${id}`, room: 'outside', pos: [TRANSFORMERS[id].pos[0], 8.2, TRANSFORMERS[id].pos[2]], kind: 'point', color: 0x6bffd0, intensity: 0, powerCircuit: 'flash', transformerId: id }]),
]));

// ---------------------------------------------------------------------------------------------------------------
// 10. Adjacency (DESIGN §16.4): doors + cased openings, both directions. null doorId = cased opening.
// ---------------------------------------------------------------------------------------------------------------
export const adjacency = (() => {
  const adj = {};
  const add = (a, b, doorId) => { (adj[a] = adj[a] || []).push({ roomId: b, doorId }); (adj[b] = adj[b] || []).push({ roomId: a, doorId }); };
  for (const [id, d] of Object.entries(INTERIOR_DOORS)) add(d.between[0], d.between[1], id);
  for (const [id, d] of Object.entries(EXTERIOR_DOORS)) add(d.between[0], d.between[1], id);
  add('garage', 'outside', 'door_garage_roll');
  for (const [a, b] of CASED_OPENINGS) add(a, b, null);
  add('lanai', 'cage', null);
  for (const r of ROOM_IDS) adj[r] = adj[r] || [];
  return Object.freeze(adj);
})();

// ---------------------------------------------------------------------------------------------------------------
// 11. Lots, trees, transformers, streetlights (DESIGN §3.7, §4, §4.1)
// ---------------------------------------------------------------------------------------------------------------
/** Neighbour lots. `facing`: the side the front (the plan's east wall) faces. `mirrorZ`: garage on the other end. */
export const lots = Object.freeze([
  { id: 'self', lot: '4212', origin: [0, 0], facing: 'E', stucco: 0, roof: 0, mirrorZ: false, owner: 'You' },
  { id: 'nguyen', lot: '4210', origin: [0, -26], facing: 'E', stucco: 1, roof: 1, mirrorZ: false, owner: 'Nguyen', ...HOOD_HOUSES.nguyen },
  { id: 'bergstrom', lot: '4214', origin: [0, 24], facing: 'E', stucco: 2, roof: 0, mirrorZ: false, owner: 'Bergstrom', ...HOOD_HOUSES.bergstrom },
  { id: 'ray', lot: '4215', origin: [34, -4], facing: 'W', stucco: 1, roof: 0, mirrorZ: false, owner: 'Ray & Linda', ...HOOD_HOUSES.ray },
  { id: 'marcus', lot: '4218', origin: [0, -52], facing: 'E', stucco: 0, roof: 1, mirrorZ: false, owner: 'Marcus', ...HOOD_HOUSES.marcus },
  { id: 'denise', lot: '4220', origin: [34, 22], facing: 'W', stucco: 2, roof: 1, mirrorZ: true, owner: 'Denise', ...HOOD_HOUSES.denise },
  { id: 'bulb1', lot: '4221', origin: [14, -70], facing: 'S', stucco: 1, roof: 0, mirrorZ: false, owner: '—', ...HOOD_HOUSES.bulb1 },
  { id: 'bulb2', lot: '4223', origin: [40, -70], facing: 'S', stucco: 0, roof: 1, mirrorZ: true, owner: '—', ...HOOD_HOUSES.bulb2 },
  { id: 'boatguy', lot: 'pond', origin: [-95, 10], facing: 'E', stucco: 2, roof: 0, mirrorZ: false, owner: 'The boat guy', ...HOOD_HOUSES.boatguy },
  // fillers (no state): 4217 north of Ray (the last dark house), one south of the Bergstroms, one south of Denise
  { id: 'f4217', lot: '4217', origin: [34, -30], facing: 'W', stucco: 0, roof: 1, mirrorZ: true, filler: true },
  { id: 'f4216', lot: '4216', origin: [0, 50], facing: 'E', stucco: 1, roof: 0, mirrorZ: true, filler: true },
  { id: 'f4222', lot: '4222', origin: [34, 48], facing: 'W', stucco: 1, roof: 1, mirrorZ: false, filler: true },
  { id: 'fPond1', lot: 'pond', origin: [-95, -30], facing: 'E', stucco: 0, roof: 1, mirrorZ: true, filler: true },
  { id: 'fPond2', lot: 'pond', origin: [-95, 40], facing: 'E', stucco: 1, roof: 0, mirrorZ: false, filler: true },
]);
/**
 * Map a point of the local plan (x east, z south of the plan's NW corner) to the world for a lot.
 * E: identity; W: mirrored in x; S/N: axes swapped (the front faces +z / −z). mirrorZ flips the garage end.
 */
export function lotTransform(lot) {
  const [ox, oz] = lot.origin;
  const W = SLAB.x1, D = SLAB.z1;
  const mz = !!lot.mirrorZ;
  const f = lot.facing;
  return {
    toWorld(x, z) {
      const zz = mz ? D - z : z;
      switch (f) {
        case 'E': return [ox + x, oz + zz];
        case 'W': return [ox + (W - x), oz + zz];
        case 'S': return [ox + zz, oz + x];
        case 'N': return [ox + zz, oz + (W - x)];
        default: return [ox + x, oz + zz];
      }
    },
    /** rotate a local direction (dx, dz) */
    dir(dx, dz) {
      const dzz = mz ? -dz : dz;
      switch (f) {
        case 'E': return [dx, dzz];
        case 'W': return [-dx, dzz];
        case 'S': return [dzz, dx];
        case 'N': return [dzz, -dx];
        default: return [dx, dzz];
      }
    },
    mirrored: (f === 'W') !== mz, // odd number of reflections → winding must flip
    bounds() {
      const a = this.toWorld(0, 0), b = this.toWorld(W, D);
      return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
    },
  };
}

export const trees = Object.freeze(Object.fromEntries(TREE_IDS.map(id => [id, { id, kind: TREES[id].kind, pos: [...TREES[id].pos], named: true }])));
/** Unnamed filler vegetation: kind, position, size scale. */
export const fillerTrees = Object.freeze([
  { kind: 'queen', pos: [17.5, 0, -48], s: 1.05 }, { kind: 'sabal', pos: [-13, 0, -14], s: 0.9 }, { kind: 'sabal', pos: [-12, 0, 44], s: 1.0 },
  { kind: 'queen', pos: [50, 0, 30], s: 1.0 }, { kind: 'queen', pos: [50, 0, -14], s: 0.95 }, { kind: 'foxtail', pos: [15.5, 0, 34], s: 0.9 },
  { kind: 'foxtail', pos: [15.5, 0, -12], s: 1.0 }, { kind: 'sabal', pos: [-14, 0, 60], s: 1.1 }, { kind: 'queen', pos: [18, 0, 62], s: 1.0 },
  { kind: 'royal', pos: [22, 0, -60], s: 1.0 }, { kind: 'queen', pos: [32, 0, -78], s: 1.0 }, { kind: 'sabal', pos: [56, 0, -76], s: 0.95 },
  { kind: 'queen', pos: [32.5, 0, 60], s: 1.0 }, { kind: 'queen', pos: [32.5, 0, 36], s: 1.0 }, { kind: 'sabal', pos: [-79, 0, -8], s: 1.0 },
  { kind: 'sabal', pos: [-78, 0, 24], s: 1.0 }, { kind: 'queen', pos: [-83, 0, 36], s: 1.0 }, { kind: 'royal', pos: [34, 0, 100], s: 1.0 },
  { kind: 'royal', pos: [20, 0, 100], s: 1.0 }, { kind: 'oak', pos: [-40, 0, 55], s: 0.8 }, { kind: 'oak', pos: [60, 0, 5], s: 0.9 },
  { kind: 'sabal', pos: [-40, 0, -35], s: 1.0 }, { kind: 'sabal', pos: [-60, 0, 48], s: 1.0 }, { kind: 'queen', pos: [-30, 0, -22], s: 1.0 },
]);
export const transformers = Object.freeze(Object.fromEntries(TRANSFORMER_IDS.map(id => [id, { id, pos: [...TRANSFORMERS[id].pos], houses: [...TRANSFORMERS[id].houses] }])));
export const streetlights = Object.freeze(STREETLIGHTS.map(([x, z], i) => ({ id: `street_${i + 1}`, pos: [x, 0, z], headHeight: 9.0, arm: x === 26.75 ? 0 : -1.9, fixture: `fix_street_${i + 1}` })));
/** Overhead feeder along the east side of the street (poles every ~40 m) + the three laterals of §3.7. */
export const feederPoles = Object.freeze([
  [32, -45], [32, -10], [32, 10], [32, 45], [32, 78], [32, 110], [20.0, -2.5], [9.0, -3.0], [-4.0, -3.0], [-95, -20], [-70, -20],
]);

// ---------------------------------------------------------------------------------------------------------------
// 12. Props (every object id and every §4.2 prop id) — pure layout for ids.mjs; geometry in world/props/*.js
// ---------------------------------------------------------------------------------------------------------------
export const props = Object.freeze({ ...LAYOUT, ...HOOD_LAYOUT });

// ---------------------------------------------------------------------------------------------------------------
// 13. Site elevations (DESIGN §3.7) — a pure function of (x, z) so the player, props and terrain agree.
// ---------------------------------------------------------------------------------------------------------------
function h2(x, z) { let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function lawnNoise(x, z) { // ±0.15 m smooth vertex noise (bilinear on a 3-m lattice)
  const gx = x / 3, gz = z / 3, ix = Math.floor(gx), iz = Math.floor(gz), tx = gx - ix, tz = gz - iz;
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const a = h2(ix, iz), b = h2(ix + 1, iz), c = h2(ix, iz + 1), d = h2(ix + 1, iz + 1);
  return ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sz - 0.5) * 0.3;
}
const inRect = (x, z, r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
/** Ground height at (x, z) in metres relative to the finished floor (y = 0). Excludes the house slab interior. */
export function siteHeightAt(x, z) {
  // the slab and its aprons
  if (inRect(x, z, SLAB)) return 0;
  if (inRect(x, z, CAGE) || inRect(x, z, LANAI)) return DIM.deckY;
  if (inRect(x, z, PORCH)) return DIM.porchY;
  // the main road and Egret Way
  if (z >= MAIN_ROAD.z0 && z <= MAIN_ROAD.z1) return STREET.crownY;
  if (inRect(x, z, EGRET_WAY)) return STREET.crownY - 0.05 * Math.abs((z - (EGRET_WAY.z0 + EGRET_WAY.z1) / 2) / 3.5);
  // the cul-de-sac bulb
  const dbx = x - BULB.cx, dbz = z - BULB.cz, db = Math.sqrt(dbx * dbx + dbz * dbz);
  if (db <= BULB.r) return STREET.crownY - 0.10 * (db / BULB.r);
  if (db <= BULB.r + 1.5 && z < STREET.z0) return SWALE.bottomY + (SWALE.bottomY - STREET.edgeY) * 0; // bulb swale ring
  // the street (crowned) and the swales either side
  if (z >= STREET.z0 && z <= STREET.z1) {
    if (x >= STREET.x0 && x <= STREET.x1) { const d = Math.abs(x - STREET.crownX) / (STREET.width / 2); return STREET.crownY - (STREET.crownY - STREET.edgeY) * d * d; }
    const swaleW = 1.5;
    // west swale 21.6 → 23.1 (V profile, bottom −0.80 at the centre), east swale mirrored 30.4 → 31.9
    if (x >= SWALE.x0 && x < STREET.x0) { const t = (x - SWALE.x0) / swaleW; const v = 1 - Math.abs(t - 0.5) * 2; return -0.45 + (SWALE.bottomY + 0.45) * v; }
    if (x > STREET.x1 && x <= STREET.x1 + swaleW) { const t = (x - STREET.x1) / swaleW; const v = 1 - Math.abs(t - 0.5) * 2; return -0.45 + (SWALE.bottomY + 0.45) * v; }
  }
  // driveway: −0.30 at the house falling to −0.50 at the swale crossing (a culvert carries the swale under it)
  if (inRect(x, z, DRIVEWAY)) { const t = Math.max(0, (x - 16) / (DRIVEWAY.x1 - 16)); return DIM.grade - 0.20 * t * t; }
  for (const w of WALK) if (inRect(x, z, w)) return DIM.grade;
  // the pond: bank top −0.5 at x = −17.5, water −1.5 from x = −20, the far bank at −80
  if (z >= POND.z0 - 6 && z <= POND.z1 + 6) {
    if (x <= POND.waterX && x >= POND.farX) { const edge = Math.min(1, Math.min(z - (POND.z0 - 6), (POND.z1 + 6) - z) / 6); return POND.waterY - 0.4 - 0.4 * edge; }
    if (x <= POND.bankX && x > POND.waterX) { const t = (POND.bankX - x) / (POND.bankX - POND.waterX); return POND.bankY + (POND.waterY - 0.4 - POND.bankY) * t; }
    if (x < POND.farX && x > POND.farX - 3) { const t = (POND.farX - x) / 3; return POND.waterY - 0.4 + (POND.bankY + 0.2 - POND.waterY + 0.4) * t; }
    if (x <= POND.bankX + 3 && x > POND.bankX) { const t = (x - POND.bankX) / 3; return POND.bankY + (DIM.grade - POND.bankY) * t + lawnNoise(x, z) * t * 0.5; }
  }
  // lawns: grade −0.30 ± 0.15 noise; the noise fades to 0 within 1.5 m of the slab so the slab edge stays clean
  const dSlab = Math.max(SLAB.x0 - x, x - SLAB.x1, SLAB.z0 - z, z - SLAB.z1, 0);
  const fade = Math.min(1, dSlab / 1.5);
  return DIM.grade + lawnNoise(x, z) * fade;
}

// ---------------------------------------------------------------------------------------------------------------
// 14. Yard sectors (DESIGN §16.4) — pure.
// ---------------------------------------------------------------------------------------------------------------
export function yardSectorOfXZ(x, z) {
  if (x >= STREET.x0 - 0.01 && x <= STREET.x1 + 1.5 && z >= STREET.z0 && z <= STREET.z1) return 'street';
  const dbx = x - BULB.cx, dbz = z - BULB.cz;
  if (dbx * dbx + dbz * dbz <= BULB.r * BULB.r) return 'street';
  if (z >= MAIN_ROAD.z0 && z <= MAIN_ROAD.z1) return 'street';
  if (inRect(x, z, DRIVEWAY)) return 'driveway';
  if (inRect(x, z, SLAB)) return '';
  if (x > SLAB.x1 && x < 60 && z > -40 && z < 60) return 'frontYard';
  if (x < SLAB.x0 && x > -100 && z > -40 && z < 60) return 'backYard';
  return '';
}

/** Everything ARCHITECTURE §6.6 lists under `world.plan`, plus the site constants. */
export const plan = Object.freeze({
  lines, rooms, openings, doors, casedOpenings, roofs, lots, trees, fillerTrees, sockets, leakPoints, fixtures, adjacency, props,
  transformers, streetlights, feederPoles,
  SLAB, DIM, LOT, LANAI, CAGE, POOL, DRIVEWAY, PORCH, WALK, SWALE, STREET, BULB, MAIN_ROAD, EGRET_WAY, POND, CONDENSER, MAST, MAILBOX, METER, POLES, PAD_MOUNT, HEDGE, PAINTS,
  roomIds, roomCentre, lotTransform, roofRidge, siteHeightAt, yardSectorOfXZ,
});
export default plan;

// sanity: every registry id is present (cheap; runs once at import)
for (const id of OPENING_IDS) if (!openings[id]) throw new Error(`plan: opening ${id} missing`);
for (const id of SOCKET_IDS) if (!sockets[id]) throw new Error(`plan: socket ${id} missing`);
for (const id of FIXTURE_IDS) if (!fixtures[id]) throw new Error(`plan: fixture ${id} missing`);
for (const id of [...OBJECT_IDS, ...PROP_IDS]) if (!props[id]) throw new Error(`plan: prop ${id} missing`);
for (const id of INTERIOR_ROOM_IDS) if (!rooms[id]) throw new Error(`plan: room ${id} missing`);
