/**
 * core/ids.js — the frozen ID registry (DESIGN §16, §3.4–3.7, §4.1–4.2, §6.15).
 * Owner: E1 core. Pure data; imported by every module. Adding an id is a docs/state-changelog.md entry.
 */

const range = (prefix, n, from = 1) => Array.from({ length: n }, (_, i) => `${prefix}${from + i}`);

/** Room ids (DESIGN §3.3) plus the four non-room places roomOf() may return. */
export const ROOM_IDS = Object.freeze([
  'nook', 'kitchen', 'great', 'laundry', 'pantry', 'garage', 'dining', 'foyer', 'frontHall', 'bedHall',
  'hallBath', 'linen', 'masterBath', 'masterCloset', 'masterBR', 'ahuCloset', 'den', 'bed2', 'bed3',
  'lanai', 'cage', 'outside', 'nguyenFoyer',
]);
export const INTERIOR_ROOM_IDS = Object.freeze(ROOM_IDS.slice(0, 19));
export const YARD_SECTORS = Object.freeze(['frontYard', 'backYard', 'driveway', 'street']);

/** Façade sector helpers (ARCHITECTURE §2): 8 sectors of 45° centred N, NE, E, SE, S, SW, W, NW. */
export const SECTOR_NAMES = Object.freeze(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
export const WALL_DEG = Object.freeze({ N: 0, E: 90, S: 180, W: 270 });
export const WALL_SECTOR = Object.freeze({ N: 0, E: 2, S: 4, W: 6 });
export const K_EXP = Object.freeze([0.80, 0.78, 0.78, 0.78, 0.78, 0.82, 0.85, 0.85]);
export function sectorOfDeg(deg) { return ((Math.round((((deg % 360) + 360) % 360) / 45)) % 8 + 8) % 8; }

/**
 * Exterior openings — the envelope table (DESIGN §3.4). Geometry lives in world/plan.js; this is
 * what the state initialiser and the house model need.
 * panels: panel count for aluminium panel shutters; 'accordion' for the great-room slider; 0 for doors.
 */
export const OPENINGS = Object.freeze({
  win_nook_N:        { wall: 'N', kind: 'window', panels: 3, nuts: 12, w: 1.5, h: 1.2, sill: 0.9 },
  peep_laundry_N:    { wall: 'N', kind: 'peep',   panels: 1, nuts: 4,  w: 0.6, h: 0.6, sill: 1.5 },
  door_garage_man:   { wall: 'N', kind: 'door',   panels: 0, nuts: 0,  w: 0.81, h: 2.03, sill: 0, swing: 'out' },
  door_garage_roll:  { wall: 'E', kind: 'garage', panels: 0, nuts: 0,  w: 4.9, h: 2.13, sill: 0 },
  door_front:        { wall: 'E', kind: 'door',   panels: 0, nuts: 0,  w: 0.91, h: 2.03, sill: 0, swing: 'in' },
  sidelight_foyer_E: { wall: 'E', kind: 'window', panels: 1, nuts: 4,  w: 0.3, h: 2.03, sill: 0 },
  win_bed2_E:        { wall: 'E', kind: 'window', panels: 2, nuts: 8,  w: 0.9, h: 1.2, sill: 0.9 },
  win_bed3_E:        { wall: 'E', kind: 'window', panels: 2, nuts: 8,  w: 0.9, h: 1.2, sill: 0.9 },
  win_master_S:      { wall: 'S', kind: 'window', panels: 2, nuts: 8,  w: 0.9, h: 1.2, sill: 0.9 },
  win_den_S:         { wall: 'S', kind: 'window', panels: 2, nuts: 8,  w: 0.9, h: 1.2, sill: 0.9 },
  win_kitchen_W:     { wall: 'W', kind: 'window', panels: 2, nuts: 8,  w: 0.9, h: 1.0, sill: 1.1 },
  slider_great_W:    { wall: 'W', kind: 'slider', panels: 'accordion', nuts: 0, w: 2.7, h: 2.44, sill: 0 },
  win_mbath_W:       { wall: 'W', kind: 'window', panels: 1, nuts: 4,  w: 0.6, h: 0.6, sill: 1.5 },
  slider_master_W:   { wall: 'W', kind: 'slider', panels: 3, nuts: 12, w: 1.8, h: 2.03, sill: 0 },
  door_cage_screen:  { wall: 'W', kind: 'screen', panels: 0, nuts: 0,  w: 0.9, h: 2.0, sill: 0, swing: 'out' },
});
export const OPENING_IDS = Object.freeze(Object.keys(OPENINGS));
export const PANEL_OPENING_IDS = Object.freeze(OPENING_IDS.filter(id => typeof OPENINGS[id].panels === 'number' && OPENINGS[id].panels > 0));
/** Room each opening belongs to (for pressure, occlusion, intrusion puddles). */
export const OPENING_ROOM = Object.freeze({
  win_nook_N: 'nook', peep_laundry_N: 'laundry', door_garage_man: 'garage', door_garage_roll: 'garage',
  door_front: 'foyer', sidelight_foyer_E: 'foyer', win_bed2_E: 'bed2', win_bed3_E: 'bed3', win_master_S: 'masterBR',
  win_den_S: 'den', win_kitchen_W: 'kitchen', slider_great_W: 'great', win_mbath_W: 'masterBath',
  slider_master_W: 'masterBR', door_cage_screen: 'cage',
});

/** Shutter panels → the opening they fit (DESIGN §3.4, §16.1). */
export const PANEL_TO_OPENING = Object.freeze({
  panel_nook_1: 'win_nook_N', panel_nook_2: 'win_nook_N', panel_nook_3: 'win_nook_N',
  panel_kit_1: 'win_kitchen_W', panel_kit_2: 'win_kitchen_W',
  panel_br2_1: 'win_bed2_E', panel_br2_2: 'win_bed2_E',
  panel_br3_1: 'win_bed3_E', panel_br3_2: 'win_bed3_E',
  panel_den_1: 'win_den_S', panel_den_2: 'win_den_S',
  panel_mbr_1: 'win_master_S', panel_mbr_2: 'win_master_S',
  panel_mba: 'win_mbath_W',
  panel_msl_1: 'slider_master_W', panel_msl_2: 'slider_master_W', panel_msl_3: 'slider_master_W',
  panel_sidelt: 'sidelight_foyer_E', panel_laun: 'peep_laundry_N',
});
export const PANEL_IDS = Object.freeze(Object.keys(PANEL_TO_OPENING));
export const PANEL_LABELS = Object.freeze({
  panel_nook_1: 'NOOK 1', panel_nook_2: '4210', panel_nook_3: 'NOOK 3', panel_kit_1: 'KIT 1', panel_kit_2: 'KIT 2',
  panel_br2_1: 'BR2 1', panel_br2_2: 'BR2 2', panel_br3_1: 'BR3 1', panel_br3_2: 'BR3 2', panel_den_1: 'DEN 1',
  panel_den_2: 'DEN 2', panel_mbr_1: 'MBR 1', panel_mbr_2: 'MBR 2', panel_mba: 'MBA', panel_msl_1: 'MSL 1',
  panel_msl_2: 'MSL 2', panel_msl_3: 'MSL 3', panel_sidelt: 'SIDELT', panel_laun: 'LAUN',
});

/** Interior doors (DESIGN §3.5): hinge side and the room they swing into. */
export const INTERIOR_DOORS = Object.freeze({
  door_laundry_kitchen: { between: ['laundry', 'nook'], swingInto: 'nook', hingeSide: 'L' },
  door_pantry:          { between: ['pantry', 'kitchen'], swingInto: 'kitchen', hingeSide: 'L' },
  door_laundry_garage:  { between: ['laundry', 'garage'], swingInto: 'laundry', hingeSide: 'R', steel: true, selfClosing: true },
  door_bed2:            { between: ['frontHall', 'bed2'], swingInto: 'bed2', hingeSide: 'L' },
  door_hallBath:        { between: ['bedHall', 'hallBath'], swingInto: 'hallBath', hingeSide: 'L' },
  door_linen:           { between: ['bedHall', 'linen'], swingInto: 'linen', hingeSide: 'L', bifold: true },
  door_master:          { between: ['bedHall', 'masterBR'], swingInto: 'masterBR', hingeSide: 'R' },
  door_masterBath:      { between: ['masterBR', 'masterBath'], swingInto: 'masterBath', hingeSide: 'L' },
  door_masterCloset:    { between: ['masterBath', 'masterCloset'], swingInto: 'masterCloset', hingeSide: 'R' },
  door_bed3:            { between: ['bedHall', 'bed3'], swingInto: 'bed3', hingeSide: 'L' },
  door_den:             { between: ['bedHall', 'den'], swingInto: 'den', hingeSide: 'L' },
  door_ahu:             { between: ['bedHall', 'ahuCloset'], swingInto: 'ahuCloset', hingeSide: 'R', louvred: true },
});
/** Exterior doors mirrored in house.doors (open/latched) — their envelope state is in house.openings. */
export const EXTERIOR_DOORS = Object.freeze({
  door_front:       { between: ['outside', 'foyer'], swingInto: 'foyer', hingeSide: 'L' },
  door_garage_man:  { between: ['garage', 'outside'], swingInto: 'outside', hingeSide: 'R' },
  slider_great_W:   { between: ['lanai', 'great'], swingInto: 'great', hingeSide: 'L', slider: true },
  slider_master_W:  { between: ['lanai', 'masterBR'], swingInto: 'masterBR', hingeSide: 'L', slider: true },
  door_cage_screen: { between: ['outside', 'cage'], swingInto: 'outside', hingeSide: 'L' },
});
export const DOOR_IDS = Object.freeze([...Object.keys(INTERIOR_DOORS), ...Object.keys(EXTERIOR_DOORS)]);

/** Cased openings (no door) — with adjacency they define plan.adjacency together with the doors. */
export const CASED_OPENINGS = Object.freeze([
  ['great', 'dining'], ['dining', 'frontHall'], ['dining', 'foyer'], ['great', 'frontHall'],
  ['frontHall', 'bedHall'], ['foyer', 'frontHall'], ['kitchen', 'great'], ['nook', 'kitchen'],
]);

/** Leak points (DESIGN §3.6) with the façade sector index whose attic reservoir they drain. */
export const LEAK_POINTS = Object.freeze({
  lp_foyer_can:      { room: 'foyer',     sector: 2, pos: [12.2, 2.85, 8.4] },
  lp_bed2_head:      { room: 'bed2',      sector: 2, pos: [13.6, 2.2, 13.25] },
  lp_master_can:     { room: 'masterBR',  sector: 6, pos: [1.2, 3.15, 16.0] },
  lp_great_register: { room: 'great',     sector: 6, pos: [2.6, 2.85, 7.4] },
  lp_den_ceiling:    { room: 'den',       sector: 4, pos: [8.5, 2.85, 18.8] },
  lp_hall_detector:  { room: 'frontHall', sector: 2, pos: [8.0, 2.85, 10.65] },
});
export const LEAK_POINT_IDS = Object.freeze(Object.keys(LEAK_POINTS));
export const INTRUSION_TIERS = Object.freeze({ NONE: 0, TRACK: 1, SILL: 2, SOFFIT: 3, DECK: 4 });
export const LEAK_TIERS = Object.freeze({ NONE: 0, DRIP: 1, STREAM: 2, SAG: 3 });

/** Impact surfaces (DESIGN §6.15). */
export const IMPACT_SURFACES = Object.freeze([
  'roof', ...OPENING_IDS, 'wall_N', 'wall_E', 'wall_S', 'wall_W', 'cage', 'pool', 'car2',
  'frontYard', 'backYard', 'driveway', 'street',
]);
export const HOUSE_SURFACES = Object.freeze(IMPACT_SURFACES.filter(s => !YARD_SECTORS.includes(s) && s !== 'car2' && s !== 'pool'));
export const DEBRIS_CLASSES = Object.freeze({
  frond: 5, shingle: 20, screenPanel: 40, felt: 8, chair: 60, bin: 120, '2x4': 250, aluminium: 300, plywood: 180,
  trampoline: 400, garageDoor: 2000,
});

/** Pool cage panels (DESIGN §3.3, §6.5): 8 W wall, 6 N, 6 S, 4 roof strips. */
export const CAGE_PANELS = Object.freeze([
  ...range('cageW_', 8).map(id => ({ id, nDeg: 270, roof: false })),
  ...range('cageN_', 6).map(id => ({ id, nDeg: 0, roof: false })),
  ...range('cageS_', 6).map(id => ({ id, nDeg: 180, roof: false })),
  ...range('cageR_', 4).map(id => ({ id, nDeg: 270, roof: true })),
]);

/** Ledgers (DESIGN §6.12). */
export const WATER_CONTAINERS = Object.freeze({
  tubHall: 150, tubMaster: 210, washer: 60, jug_1: 3.8, jug_2: 3.8, jug_3: 3.8, jug_4: 3.8, jug_5: 3.8, jug_6: 3.8,
  pots: 16, bottles: 12,
});
export const BREAKER_IDS = Object.freeze(['main', 'ac', 'waterHeater', 'poolPump', 'range', 'garage', 'kitchen', 'bedrooms', 'lights']);
export const GENERATOR_CIRCUITS = Object.freeze(['fridge', 'fan', 'tv', 'chargers', 'lamp', 'router']);
export const GENERATOR_PLACEMENTS = Object.freeze(['none', 'garage', 'lanai', 'driveway']);

/** The neighbourhood (DESIGN §4, §4.1). Positions are world metres (x east, z south). */
export const HOOD_HOUSES = Object.freeze({
  nguyen:    { lot: '4210', origin: [0, -26], facing: 'E', shuttersAt: -27, evacuatesAt: -26 },
  bergstrom: { lot: '4214', origin: [0, 24],  facing: 'E', unshuttered: true, garageThreshold: [53, 4], threeTab: true },
  ray:       { lot: '4215', origin: [34, -4], facing: 'W', shuttersAt: -30, generac: true, oak: true },
  marcus:    { lot: '4218', origin: [0, -52], facing: 'E', portableGen: true },
  denise:    { lot: '4220', origin: [34, 22], facing: 'W', plywood: true },
  bulb1:     { lot: '4221', origin: [14, -70], facing: 'S', trampoline: true },
  bulb2:     { lot: '4223', origin: [40, -70], facing: 'S', boat: true },
  boatguy:   { lot: 'pond', origin: [-95, 10], facing: 'E', boatLift: true },
});
export const HOOD_HOUSE_IDS = Object.freeze(Object.keys(HOOD_HOUSES));
export const TRANSFORMERS = Object.freeze({
  sandpiperW: { pos: [9.0, 9.0, -3.0],   houses: ['self', 'nguyen', 'bergstrom'] },
  sandpiperE: { pos: [32.0, 9.0, 10.0],  houses: ['ray'] },
  bulb:       { pos: [26.75, 9.0, -45],  houses: ['marcus', 'bulb1', 'bulb2'] },
  egret:      { pos: [32.0, 9.0, 78],    houses: ['denise'] },
  pond:       { pos: [-95, 9.0, -20],    houses: ['boatguy'] },
});
export const TRANSFORMER_IDS = Object.freeze(Object.keys(TRANSFORMERS));
export const TREES = Object.freeze({
  queen1:     { kind: 'queen',   pos: [17.5, 0, -0.5] },
  queen2:     { kind: 'queen',   pos: [17.5, 0, 9.5] },
  sabal1:     { kind: 'sabal',   pos: [-12.5, 0, 20.5] },
  foxtail:    { kind: 'foxtail', pos: [15.5, 0, 11.0] },
  hedgeE:     { kind: 'hedge',   pos: [14.3, 0, 10.0] },
  rayOak:     { kind: 'oak',     pos: [36.5, 0, 4.0] },
  bergQueen1: { kind: 'queen',   pos: [17.5, 0, 26.0] },
  bergQueen2: { kind: 'queen',   pos: [-6.0, 0, 30.0] },
  bergFicus:  { kind: 'ficus',   pos: [7.0, 0, 22.5] },
  nguyenQueen:{ kind: 'queen',   pos: [17.5, 0, -22.0] },
  pondSabal1: { kind: 'sabal',   pos: [-18.0, 0, -6.0] },
  pondSabal2: { kind: 'sabal',   pos: [-18.5, 0, 30.0] },
  royal1:     { kind: 'royal',   pos: [30.0, 0, -60.0] },
});
export const TREE_IDS = Object.freeze(Object.keys(TREES));
export const STREETLIGHTS = Object.freeze([[31.5, -8], [31.5, 22], [31.5, 52], [26.75, -50]]);

/** Neighbourhood dressing props (DESIGN §4.2) — every id must exist in world.registry.props. */
export const PROP_IDS = Object.freeze([
  'nguyen_minivan', 'nguyen_bikes', 'nguyen_dog', 'nguyen_turtle', 'nguyen_key', 'nguyen_interior', 'nguyen_limb',
  'ray_flag', 'ray_car', 'ray_oak', 'ray_generac', 'ray_windowsLit', 'ray_chainsaw_npc',
  'berg_ring', 'berg_cagePanels', 'berg_shingles', 'berg_garageDoor', 'berg_ficus',
  'marcus_generator', 'marcus_strip', 'denise_plywood', 'bulb_trampoline', 'bulb_boat', 'boatguy_lift',
  'stopSign', 'mailbox', 'bins_swale', 'powerLines_down', 'pole_leaning', 'cone_onLine',
  'tarp_bergstrom', 'tarp_marcus', 'tarp_denise',
  'kerbPile_4212', 'kerbPile_4210', 'kerbPile_4214', 'kerbPile_4215', 'kerbPile_4218', 'kerbPile_4220',
  'flyers', 'cow_trailer', 'bucketTruck_main', 'bucketTruck_culdesac', 'crew_onPole', 'newTransformer',
  'loudspeakerTruck', 'cruiser', 'lastDarkHouse', 'streetlights', 'pondFountain',
  'heron', 'dragonflies', 'flock', 'buzzards', 'eyeBirds',
]);

/**
 * Object ids (DESIGN §16.1): kind, home room, carry rule, permitted `extra` keys.
 * carry: 0 = fixed, 1 = one in hand, n = stack of n, 'pocket', 'drag', 'ride'.
 */
const O = (ids, kind, room, carry, extra = [], more = {}) => ids.map(id => [id, { kind, room, carry, extra, ...more }]);
export const OBJECTS = Object.freeze(Object.fromEntries([
  ...O(PANEL_IDS, 'panel', 'garage', 4, ['label']),
  ...O(['wingnutCan'], 'nuts', 'garage', 'pocket', [], { count: 68 }),
  ...O(['wingnutBag'], 'nuts', 'kitchen', 'pocket', [], { count: 8 }),
  ...O(['accordion_great'], 'accordion', 'lanai', 0),
  ...O(['sliderBrace2x4'], 'brace', 'great', 1),
  ...O(['garageBraceKit'], 'brace', 'garage', 1),
  ...O(['car1', 'car2'], 'car', 'outside', 'ride', ['parkedAt', 'dented']),
  ...O(range('sandbag_', 8), 'sandbag', 'garage', 2),
  ...O(range('towel_', 8), 'towel', 'linen', 1, ['wetL']),
  ...O([...range('bucket_', 3), 'stockpot'], 'bucket', 'garage', 1),
  ...O(['tap_tubHall'], 'tap', 'hallBath', 0), ...O(['tap_tubMaster'], 'tap', 'masterBath', 0),
  ...O(['tap_kitchen'], 'tap', 'kitchen', 0), ...O(['tap_washer', 'tap_utility'], 'tap', 'laundry', 0),
  ...O(range('jug_', 6), 'container', 'kitchen', 1),
  ...O(['bottles'], 'container', 'pantry', 'pocket', [], { count: 24 }),
  ...O(['pots'], 'container', 'kitchen', 1, [], { count: 2 }),
  ...O(['toilet_hall'], 'toilet', 'hallBath', 0, ['tankFull']), ...O(['toilet_master'], 'toilet', 'masterBath', 0, ['tankFull']),
  ...O(['fridge'], 'fridge', 'kitchen', 0), ...O(['fridgeGarage', 'freezerGarage'], 'fridge', 'garage', 0),
  ...O(['ziplocs'], 'bags', 'kitchen', 'pocket', [], { count: 12 }),
  ...O(['microwave', 'oven'], 'appliance', 'kitchen', 0, ['clockSet']),
  ...O(['coffeeMaker'], 'appliance', 'kitchen', 0, ['hot']), ...O(range('thermos_', 2), 'appliance', 'kitchen', 1, ['hot']),
  ...O(['charger_kitchen'], 'charger', 'kitchen', 0), ...O(['charger_nightstand'], 'charger', 'masterBR', 0),
  ...O(range('bank_', 2), 'charger', 'kitchen', 1),
  ...O(['generator'], 'generator', 'garage', 'drag'), ...O(range('gasCan_', 4), 'generator', 'garage', 1),
  ...O(range('propane_', 2), 'generator', 'garage', 1), ...O(range('cord_', 3), 'generator', 'garage', 1),
  ...O(['breakerPanel'], 'panel', 'garage', 0),
  ...O(DOOR_IDS, 'door', 'fixed', 0), ...O(['door_garage_roll'], 'door', 'garage', 0),
  ...O(['win_nook_N', 'peep_laundry_N', 'sidelight_foyer_E', 'win_bed2_E', 'win_bed3_E', 'win_master_S', 'win_den_S', 'win_kitchen_W', 'win_mbath_W'], 'window', 'fixed', 0),
  ...O(['mattress_bed3'], 'mattress', 'bed3', 'drag'), ...O(['mattress_bed2'], 'mattress', 'bed2', 'drag'),
  ...O(['bed_master'], 'restSpot', 'masterBR', 0, ['lastSleptSim']), ...O(['bed_bed2'], 'restSpot', 'bed2', 0, ['lastSleptSim']),
  ...O(['bed_bed3'], 'restSpot', 'bed3', 0, ['lastSleptSim']), ...O(['sofa'], 'restSpot', 'great', 0, ['lastSleptSim']),
  ...O(['hallMattressSpot'], 'restSpot', 'frontHall', 0, ['lastSleptSim']), ...O(['tubHallSpot'], 'restSpot', 'hallBath', 0, ['lastSleptSim']),
  ...O(range('chair_nook_', 4), 'restSpot', 'nook', 0, ['lastSleptSim']), ...O(range('chair_dining_', 6), 'restSpot', 'dining', 0, ['lastSleptSim']),
  ...O(['frontStep'], 'restSpot', 'outside', 0, ['lastSleptSim']),
  ...O(range('helmet_', 2), 'wearable', 'dining', 1), ...O(['shoes'], 'wearable', 'foyer', 1),
  ...O(range('lanaiChair_', 4), 'loose', 'lanai', 1, ['debrisClass', 'threshold'], { debrisClass: 'chair', threshold: 22 }),
  ...O(['lanaiTable'], 'loose', 'lanai', 'drag', ['debrisClass', 'threshold'], { debrisClass: 'chair', threshold: 26 }),
  ...O(range('chaise_', 2), 'loose', 'lanai', 'drag', ['debrisClass', 'threshold'], { debrisClass: 'chair', threshold: 24 }),
  ...O(['grill'], 'loose', 'lanai', 'drag', ['debrisClass', 'threshold'], { debrisClass: 'bin', threshold: 30 }),
  ...O(range('planter_', 3), 'loose', 'lanai', 1, ['debrisClass', 'threshold'], { debrisClass: 'bin', threshold: 25 }),
  ...O(['hoseReel'], 'loose', 'lanai', 1, ['debrisClass', 'threshold'], { debrisClass: 'bin', threshold: 28 }),
  ...O(['windChimes'], 'loose', 'lanai', 1, ['debrisClass', 'threshold'], { debrisClass: 'frond', threshold: 12 }),
  ...O(['poolToys'], 'loose', 'lanai', 1, ['debrisClass', 'threshold'], { debrisClass: 'frond', threshold: 10 }),
  ...O(['outdoorRug'], 'loose', 'lanai', 1, ['debrisClass', 'threshold'], { debrisClass: 'felt', threshold: 15 }),
  ...O(['doormat'], 'loose', 'outside', 1, ['debrisClass', 'threshold'], { debrisClass: 'felt', threshold: 20 }),
  ...O(['bin_trash', 'bin_recycle'], 'loose', 'outside', 1, ['debrisClass', 'threshold'], { debrisClass: 'bin', threshold: 18 }),
  ...O(['poolValve'], 'valve', 'cage', 0),
  ...O(['tv_great'], 'device', 'great', 0), ...O(['tv_kitchen'], 'device', 'kitchen', 0), ...O(['remote_great'], 'device', 'great', 1),
  ...O(['nwr'], 'device', 'kitchen', 1), ...O(['console'], 'device', 'kitchen', 0), ...O(['barometerWall'], 'device', 'dining', 0),
  ...O(['thermostat'], 'device', 'frontHall', 0), ...O(['ups', 'modem'], 'device', 'den', 0), ...O(['smartSpeaker'], 'device', 'kitchen', 0),
  ...O(['laptop'], 'device', 'nook', 0), ...O(['tablet'], 'device', 'nook', 1),
  ...O(['detector_hall'], 'detector', 'frontHall', 0, ['battery', 'silencedUntilSim']),
  ...O(['detector_garage'], 'detector', 'garage', 0, ['battery', 'silencedUntilSim']),
  ...O(range('lamp_great_', 2), 'lamp', 'great', 0), ...O(['lamp_nook'], 'lamp', 'nook', 0), ...O(['lamp_nightstand'], 'lamp', 'masterBR', 0),
  ...O(['lamp_bed2'], 'lamp', 'bed2', 0), ...O(['lamp_den'], 'lamp', 'den', 0),
  ...O(['switch_nook'], 'switch', 'nook', 0), ...O(['switch_kitchen'], 'switch', 'kitchen', 0), ...O(['switch_great'], 'switch', 'great', 0),
  ...O(['switch_laundry'], 'switch', 'laundry', 0), ...O(['switch_pantry'], 'switch', 'pantry', 0), ...O(['switch_garage'], 'switch', 'garage', 0),
  ...O(['switch_dining'], 'switch', 'dining', 0), ...O(['switch_foyer'], 'switch', 'foyer', 0), ...O(['switch_frontHall'], 'switch', 'frontHall', 0),
  ...O(['switch_bedHall'], 'switch', 'bedHall', 0), ...O(['switch_hallBath'], 'switch', 'hallBath', 0), ...O(['switch_masterBath'], 'switch', 'masterBath', 0),
  ...O(['switch_masterBR'], 'switch', 'masterBR', 0), ...O(['switch_den'], 'switch', 'den', 0), ...O(['switch_bed2'], 'switch', 'bed2', 0),
  ...O(['switch_bed3'], 'switch', 'bed3', 0), ...O(['switch_lanai'], 'switch', 'great', 0), ...O(['switch_coach'], 'switch', 'foyer', 0),
  ...O(['fan_great'], 'fan', 'great', 0, ['bent']), ...O(['fan_master'], 'fan', 'masterBR', 0, ['bent']), ...O(['fan_bed2'], 'fan', 'bed2', 0, ['bent']),
  ...O(['fan_bed3'], 'fan', 'bed3', 0, ['bent']), ...O(['fan_den'], 'fan', 'den', 0, ['bent']), ...O(range('fan_lanai_', 3), 'fan', 'lanai', 0, ['bent']),
  ...O(['bathFan_hall'], 'fan', 'hallBath', 0, ['bent']), ...O(['bathFan_master'], 'fan', 'masterBath', 0, ['bent']),
  ...O(range('flashlight_', 2), 'light', 'kitchen', 1, ['lit'], { battery: 9 }), ...O(['headlamp'], 'light', 'kitchen', 1, ['lit'], { battery: 12 }),
  ...O(range('lantern_', 2), 'light', 'great', 1, ['lit'], { battery: 30 }), ...O(range('candle_', 4), 'light', 'great', 1, ['lit'], { battery: 8 }),
  ...O(['lighter'], 'light', 'laundry', 'pocket'),
  ...O(['atticHatch_hall'], 'hatch', 'frontHall', 0), ...O(['atticPulldown_garage'], 'hatch', 'garage', 0),
  ...O(['docsPouch'], 'docs', 'dining', 1, ['inBag']), ...O(['goBag'], 'docs', 'masterCloset', 1, ['inBag']),
  ...O(['insuranceFolder'], 'docs', 'den', 1, ['inBag']), ...O(['photoFrames'], 'docs', 'frontHall', 1, ['inBag']),
  ...O(['notepad'], 'paper', 'kitchen', 0, ['read']), ...O(['paperback'], 'paper', 'masterBR', 1, ['read']), ...O(['cards'], 'paper', 'dining', 1, ['read']),
  ...O(['wine'], 'paper', 'kitchen', 0, ['read']), ...O(['hoaLetter', 'trackingChart'], 'paper', 'nook', 0, ['read']),
  ...O(['hurricaneKitBin'], 'kit', 'laundry', 0), ...O(['aaBatteries'], 'kit', 'laundry', 'pocket', [], { count: 6 }), ...O(['ductTape'], 'kit', 'laundry', 'pocket'),
  ...O(['junkDrawer'], 'drawer', 'kitchen', 0),
  ...O(['turtleKey'], 'aftermath', 'outside', 'pocket', ['used']), ...O(['nguyenDoor'], 'aftermath', 'outside', 0, ['used']),
  ...O(['marcusStrip'], 'aftermath', 'outside', 0, ['used']), ...O(['chainsaw', 'tarp', 'rake'], 'aftermath', 'outside', 1, ['used']),
  ...O(['pet', 'ray'], 'npc', 'fixed', 0),
]));
export const OBJECT_IDS = Object.freeze(Object.keys(OBJECTS));
export const EXTRA_KEYS = Object.freeze(Array.from(new Set(Object.values(OBJECTS).flatMap(o => o.extra))));

/** Socket ids (DESIGN §16.2): kind and what they accept. Positions come from world.registry.sockets. */
const S = (ids, kind, accepts, room, capacity = 1) => ids.map(id => [id, { kind, accepts, room, capacity }]);
export const SOCKETS = Object.freeze(Object.fromEntries([
  ...PANEL_OPENING_IDS.map(id => [`sock_panel_${id}`, { kind: 'panel', accepts: ['panel'], room: OPENING_ROOM[id], capacity: OPENINGS[id].panels, opening: id }]),
  ...S(['sock_brace_slider_great_W'], 'brace', ['sliderBrace2x4'], 'great'), ...S(['sock_brace_garage'], 'brace', ['garageBraceKit'], 'garage'),
  ...S(['sock_sandbag_door_front'], 'sandbag', ['sandbag'], 'foyer', 4), ...S(['sock_sandbag_door_laundry_garage'], 'sandbag', ['sandbag'], 'garage', 4),
  ...S(['sock_towel_door_front'], 'towel', ['towel'], 'foyer'), ...S(['sock_towel_slider_great_W'], 'towel', ['towel'], 'great'),
  ...S(['sock_towel_slider_master_W'], 'towel', ['towel'], 'masterBR'), ...S(['sock_towel_door_garage_man'], 'towel', ['towel'], 'garage'),
  ...S(['sock_towel_door_laundry_garage'], 'towel', ['towel'], 'laundry'), ...S(['sock_towel_win_bed2_E'], 'towel', ['towel'], 'bed2'),
  ...S(['sock_towel_win_bed3_E'], 'towel', ['towel'], 'bed3'),
  ...LEAK_POINT_IDS.map(lp => [`sock_bucket_${lp}`, { kind: 'bucket', accepts: ['bucket'], room: LEAK_POINTS[lp].room, capacity: 1, leakPoint: lp }]),
  ...S(['sock_mattress_frontHall'], 'mattress', ['mattress'], 'frontHall'), ...S(['sock_mattress_bedHall'], 'mattress', ['mattress'], 'bedHall'),
  ...S(['sock_mattress_masterCloset'], 'mattress', ['mattress'], 'masterCloset'),
  ...S(['sock_gen_garage'], 'generator', ['generator'], 'garage'), ...S(['sock_gen_lanai'], 'generator', ['generator'], 'lanai'),
  ...S(['sock_gen_driveway'], 'generator', ['generator'], 'outside'),
  ...S(['sock_car_garage'], 'car', ['car'], 'garage'), ...S(['sock_car_driveway'], 'car', ['car'], 'outside'),
  ...S(['sock_freezer'], 'freezer', ['bags', 'container'], 'kitchen', 24),
  ...S(['sock_pool_sink'], 'store', ['loose'], 'cage', 12), ...S(['sock_garage_store'], 'store', ['loose'], 'garage', 20), ...S(['sock_inside_store'], 'store', ['loose'], 'great', 20),
  ...S(['sock_candle_great'], 'light', ['light'], 'great'), ...S(['sock_candle_hallBath'], 'light', ['light'], 'hallBath'),
  ...S(['sock_candle_masterBath'], 'light', ['light'], 'masterBath'), ...S(['sock_candle_dining'], 'light', ['light'], 'dining'),
  ...S(['sock_lantern_nightstand'], 'light', ['light'], 'masterBR'), ...S(['sock_lantern_hall'], 'light', ['light'], 'bedHall'),
  ...S(['sock_lantern_closet'], 'light', ['light'], 'masterCloset'),
  ...S(['sock_nwr_kitchen'], 'device', ['nwr'], 'kitchen'), ...S(['sock_nwr_bedHall'], 'device', ['nwr'], 'bedHall'),
  ...S(['sock_nwr_hallBath'], 'device', ['nwr'], 'hallBath'), ...S(['sock_nwr_masterCloset'], 'device', ['nwr'], 'masterCloset'),
  ...S(['sock_nwr_nightstand'], 'device', ['nwr'], 'masterBR'),
  ...S(['sock_phone_kitchen'], 'phone', ['phone'], 'kitchen'), ...S(['sock_phone_nightstand'], 'phone', ['phone'], 'masterBR'),
  ...S(['sock_phone_counter'], 'phone', ['phone'], 'kitchen'),
  ...S(['sock_hand'], 'hand', ['*'], 'player'),
  ...S(['sock_kerb_bags'], 'kerb', ['bags'], 'outside', 20), ...S(['sock_kerb_pile'], 'kerb', ['loose'], 'outside', 50),
]));
export const SOCKET_IDS = Object.freeze(Object.keys(SOCKETS));

/** Fixture descriptor ids (DESIGN §16.3). Lights are render's; world registers descriptors. */
export const CEILING_FIXTURES = Object.freeze({
  fix_nook: 'nook', fix_kitchen_1: 'kitchen', fix_kitchen_2: 'kitchen', fix_great_fan: 'great', fix_laundry: 'laundry',
  fix_pantry: 'pantry', fix_garage_1: 'garage', fix_garage_2: 'garage', fix_dining: 'dining', fix_foyer_can: 'foyer',
  fix_frontHall: 'frontHall', fix_bedHall_1: 'bedHall', fix_bedHall_2: 'bedHall', fix_hallBath: 'hallBath', fix_linen: 'linen',
  fix_masterBath_1: 'masterBath', fix_masterBath_2: 'masterBath', fix_masterCloset: 'masterCloset', fix_master_fan: 'masterBR',
  fix_master_can: 'masterBR', fix_ahu: 'ahuCloset', fix_den: 'den', fix_bed2: 'bed2', fix_bed3: 'bed3',
  fix_lanai_1: 'lanai', fix_lanai_2: 'lanai', fix_lanai_3: 'lanai', fix_coach_1: 'outside', fix_coach_2: 'outside', fix_pool: 'cage',
});
export const LAMP_IDS = Object.freeze(['lamp_great_1', 'lamp_great_2', 'lamp_nook', 'lamp_nightstand', 'lamp_bed2', 'lamp_den']);
export const WINDOW_LIGHT_OPENINGS = Object.freeze(OPENING_IDS.filter(id => ['window', 'peep', 'slider'].includes(OPENINGS[id].kind)));
export const LIGHT_SOCKET_IDS = Object.freeze(SOCKET_IDS.filter(id => SOCKETS[id].kind === 'light'));
export const FIXTURE_IDS = Object.freeze([
  ...Object.keys(CEILING_FIXTURES),
  ...LAMP_IDS.map(id => `fix_lamp_${id}`),
  ...WINDOW_LIGHT_OPENINGS.map(id => `fix_win_${id}`),
  'fix_tv_great', 'fix_tv_kitchen', 'fix_phone',
  ...LIGHT_SOCKET_IDS.map(id => `fix_candle_${id}`),
  'fix_street_1', 'fix_street_2', 'fix_street_3', 'fix_street_4', 'fix_fountain', 'fix_ringLed', 'fix_rayWindows',
  ...TRANSFORMER_IDS.map(id => `fix_transformer_${id}`),
]);

/** Room → the light switch that controls its ceiling fixtures. */
export const ROOM_SWITCH = Object.freeze({
  nook: 'switch_nook', kitchen: 'switch_kitchen', great: 'switch_great', laundry: 'switch_laundry', pantry: 'switch_pantry',
  garage: 'switch_garage', dining: 'switch_dining', foyer: 'switch_foyer', frontHall: 'switch_frontHall', bedHall: 'switch_bedHall',
  hallBath: 'switch_hallBath', linen: 'switch_bedHall', masterBath: 'switch_masterBath', masterCloset: 'switch_masterBath',
  masterBR: 'switch_masterBR', ahuCloset: 'switch_bedHall', den: 'switch_den', bed2: 'switch_bed2', bed3: 'switch_bed3',
  lanai: 'switch_lanai', cage: 'switch_lanai', outside: 'switch_coach',
});

/** Alert product kinds and the phone threads (DESIGN §9). */
export const PRODUCT_KINDS = Object.freeze(['HUW', 'SSW', 'TOA', 'TOR', 'HLS', 'EWW', 'FFW', 'CEM', 'HEAT', 'EYE']);
export const PHONE_THREADS = Object.freeze(['Sandpiper Cove Neighbors', 'Mom', 'Tam Nguyen', 'Alert Sarasota', 'Gulf Power & Light', 'Sarasota County Utilities', 'FL Dept of Health']);
export const STORM_NAMES = Object.freeze(['Arthur', 'Bertha', 'Cristobal', 'Dolly', 'Edouard', 'Fay', 'Gonzalo', 'Hanna', 'Isaias', 'Josephine', 'Kyle', 'Leah', 'Marco', 'Nana', 'Omar', 'Paulette', 'Rene', 'Sally', 'Teddy', 'Vicky', 'Wilfred']);
export function basinId(name) { const i = STORM_NAMES.indexOf(name); return `AL${String(i < 0 ? 12 : i + 1).padStart(2, '0')}2026`; }

export const PHASES = Object.freeze(['prep', 'bands', 'ts', 'hurricane', 'eyewallFront', 'eye', 'eyewallBack', 'hurricaneBack', 'subsiding', 'aftermath']);
export const TIERS = Object.freeze(['prep', 'gap', 'band', 'ts', 'hurricane', 'eyewall', 'eye', 'subsiding', 'aftermathDay', 'aftermathNight', 'moment', 'hold', 'carry', 'device']);
