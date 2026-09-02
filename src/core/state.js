/**
 * core/state.js — createState(meta): the single state tree with every field defaulted (ARCHITECTURE §3).
 * Owner: E1 core. Module init() may re-derive its own slice (thresholds, positions) but never adds foreign fields.
 */
import {
  OPENINGS, OPENING_IDS, OPENING_ROOM, WALL_DEG, WALL_SECTOR, INTERIOR_DOORS, EXTERIOR_DOORS, LEAK_POINTS, LEAK_POINT_IDS,
  CAGE_PANELS, WATER_CONTAINERS, BREAKER_IDS, HOOD_HOUSES, HOOD_HOUSE_IDS, TRANSFORMERS, TRANSFORMER_IDS, TREES, TREE_IDS,
  OBJECTS, OBJECT_IDS, PHONE_THREADS, ROOM_IDS, INTERIOR_ROOM_IDS, basinId,
} from './ids.js';

export const SCHEMA_VERSION = '1.1';
export const EPOCH_ISO = '2026-09-02T00:00:00-04:00';
export const DAY = 86400;
export const DAY_START_0 = 86400; // Thu 3 Sep 00:00 EDT — the midnight beginning the landfall day (reference)

export function defaultOptions() {
  return {
    bracedGarageKitInstalled: false, impactWindows: false, service: 'overhead', generatorOwned: true,
    pet: 'dog', canalFront: false, landfallHour: 14, trackOffsetKm: 0, forwardSpeedKmh: 20, pacing: 'standard',
  };
}

export function defaultMeta(over = {}) {
  const options = { ...defaultOptions(), ...(over.options || {}) };
  const stormName = over.stormName || 'Leah';
  return {
    stormName, basinId: basinId(stormName), presetId: over.presetId || 'leah-ref', seed: (over.seed ?? 7) >>> 0,
    quality: over.quality || 'auto', headless: !!over.headless, options, schemaVersion: SCHEMA_VERSION,
    debug: !!over.debug, stub: !!over.stub,
  };
}

function opening(id) {
  const o = OPENINGS[id];
  return {
    id, kind: o.kind, wall: o.wall, facadeDeg: WALL_DEG[o.wall], sector: WALL_SECTOR[o.wall], room: OPENING_ROOM[id],
    shuttered: false, shutterProgress: 0, fastening: 0,
    panelsPlaced: 0, panelsNeeded: typeof o.panels === 'number' ? o.panels : (o.panels === 'accordion' ? 2 : 0), braced: false,
    open: 0, latched: true, locked: false, sandbagM: 0, towelsL: 0,
    bowEnvM: 0, intrusionTier: 0, failed: false, failCause: null, hazardAcc: 0, litres: 0,
  };
}

function door(id, def) {
  return { id, open: 0, targetOpen: 0, latched: true, locked: false, ripped: false, hingeSide: def.hingeSide, swingInto: def.swingInto, slamCount: 0 };
}

export function createState(metaOver = {}) {
  const meta = defaultMeta(metaOver);
  const landfallHour = meta.options.landfallHour;
  const T0 = DAY_START_0 + landfallHour * 3600;
  const startSim = T0 - 32 * 3600; // presets override via clock.api.setStart

  const state = {
    meta,
    clock: {
      simTime: startSim, realTime: 0, tRel: -32, T0, dtSim: 0, dtReal: 0, speed: 1, requestedSpeed: null, autoPace: true,
      tier: 'prep', momentSlowUntilReal: 0, momentId: null, softMomentUntilReal: 0,
      sleeping: false, sleepUntilSim: 0, sleepTarget: null, paused: false,
      phase: 'prep', phaseSinceSim: startSim, dayIndex: -1, dayStart0: DAY_START_0, hour: 6, isNight: false,
      startSim, firstLightSim: null, subStep: 5, frame: 0,
    },
    storm: {
      centre: { xE: -450, yN: -450 }, headingDeg: 45, vtMs: 5.56, vmaxMarineMs: 48.9, vmaxLandfallMs: 51.4, pcHpa: 955, pnHpa: 1012,
      rmwM: 25000, B: 1.5, overLand: false, landfallSim: null, coast: { px: -3.18, py: -3.18, nx: 0.940, ny: 0.342 },
      bands: [], rKm: 640, phiDeg: 45, approachDirDeg: null,
      forecast: { issuedSim: startSim, advisoryNumber: 21, points: [], errorDirDeg: 0, shiftKm: 0 },
      track: [], flags: { eyeEntered: false, eyeExited: false, reversalFired: false },
    },
    local: {
      uMarine: 5, uMean: 4, u1m: 4, uGustEnv: 6, uStruct: 5, uInst: 4, uG3: 5, dirFromDeg: 90, dirInstDeg: 90,
      pHpa: 1011.4, dPdtHpaPerH: 0, rainMmPerH: 0, rainWallMmPerH: [0, 0, 0, 0, 0, 0, 0, 0], rainAngleDeg: 0, rainTotalMm: 0, rainRecentMm: 0,
      bandRain: 0, bandWind: 1, bandFrontM: 1e6, tAirC: 26, tdC: 24, rhOut: 0.89, illumLux: 5000, visibilityM: 19000, cloudFrac: 0.3, cloudBaseM: 8000,
      eyeFactor: 0, reversal: 0, lightning: null, lightningRatePerMin: 0, surgeM: 0, swaleWaterM: 0, streetWaterM: 0, pondRiseM: 0,
      sun: { azDeg: 90, elDeg: 5 }, phase: 'prep', rKm: 640, phiDeg: 45, mesovortex: 0,
    },
    cues: {
      windLoadPa: 0, windLoadEnvPa: 0, roar: 0, whistle: 0, debrisRate: 0, leakRate: [0, 0, 0, 0, 0, 0, 0, 0],
      pushForceN: 0, earPop: 0, powerHazard: 0, eyeFactor: 0, reversal: 0, heatIndexC: 26, heatIndexOutC: 27, wetness: 0,
    },
    house: {
      openings: Object.fromEntries(OPENING_IDS.map(id => [id, opening(id)])),
      doors: Object.fromEntries([
        ...Object.entries(INTERIOR_DOORS).map(([id, d]) => [id, door(id, d)]),
        ...Object.entries(EXTERIOR_DOORS).map(([id, d]) => [id, door(id, d)]),
      ]),
      garageDoor: { open: 0, braced: false, pumpAmpEnv: 0, load: 0, threshold: 57, buckled: false, failed: false, failedSim: null },
      cage: {
        panels: CAGE_PANELS.map(p => ({ id: p.id, nDeg: p.nDeg, roof: p.roof, torn: false, tornSim: null, threshold: 30 })),
        stage: 0, structThreshold: 48, foldProgress: 0, doorLatched: false, doorGone: false, stageSim: 0,
      },
      roof: { shingleLoss: [0, 0, 0, 0], deckExposed: false, anemometerAlive: true, anemometerLastGust: 0, atticWaterL: [0, 0, 0, 0, 0, 0, 0, 0] },
      pressure: { pInsideHpa: 1011.4, pAtticHpa: 1011.4, dpRoomPa: Object.fromEntries(INTERIOR_ROOM_IDS.map(r => [r, 0])) },
      thermal: { tInC: 24, rhIn: 0.5, tdInC: 13, hvacOn: true, fanOn: false, sealed: 0, tTargetC: 24 },
      ceilingLeaks: Object.fromEntries(LEAK_POINT_IDS.map(id => [id, {
        id, room: LEAK_POINTS[id].room, sector: LEAK_POINTS[id].sector, active: false, activeSince: null, rateLph: 0, tier: 0,
        litresDelivered: 0, stainM2: 0, unbucketedH: 0, sag: 0, collapsed: false, bucket: null, bucketL: 0,
      }])),
      floorWater: Object.fromEntries([...OPENING_IDS, ...LEAK_POINT_IDS].map(id => [id, { id, room: OPENING_ROOM[id] || LEAK_POINTS[id]?.room || 'outside', litres: 0, poolM2: 0 }])),
      soffitIntegral: [0, 0, 0, 0, 0, 0, 0, 0],
      fridge: { open: false, coldest: false, iceMakerOn: true, frozenBags: 0, freezerReserveH: 48, fridgeReserveH: 4, coldReserveH: 48, openCount: 0, purged: false, smell: 0, iceDumped: false },
      pool: { levelM: 0, valveOpen: false, pumpOn: true, pumpBurnt: false, colour: 0, overtopping: false },
      coPpm: 0, coPpmByRoom: Object.fromEntries(INTERIOR_ROOM_IDS.map(r => [r, 0])), coDose: 0,
      eyeStartSim: null, mildew: 0, damageScore: 0,
    },
    utilities: {
      power: {
        on: true, hazardE: 0, hazardEFail: 1, brownout: false, flickerCount: 0, lastFlickerSim: 0, lostSim: null, hoursSinceOutage: 0,
        restoredSim: null, restoreScheduledSim: 0, transformerFlashed: false, cause: null, flickerThresholdsCrossed: [],
        breakers: Object.fromEntries(BREAKER_IDS.map(b => [b, true])),
      },
      generator: { placement: 'none', running: false, fuelL: 0, cansL: [19, 19, 0, 0], hoursRun: 0, circuits: [], pullAttempts: 0, startedSim: null },
      water: {
        pressure: 1, plantLostSim: null,
        containers: Object.fromEntries(Object.entries(WATER_CONTAINERS).map(([id, cap]) => [id, { fillL: id === 'bottles' ? cap : 0, capacityL: cap, tapOn: false, drainTaped: false }])),
        storedL: 12, usedL: 0, heaterWarmL: 190, boilNotice: false, boilIssuedSim: null, boilLiftedSim: null,
      },
      cell: {
        state: 'LTE', towerOn: true, towerBatteryH: 3.5, towerLostGridSim: null, towerDarkSim: null, dataOn: true, smsOn: true,
        restoreSim: null, cowSim: 0, lte1Sim: 0, normalSim: 0, outbox: [], held: [], sosSeen: false,
      },
      media: { cableOn: true, nodeLostSim: null, wifiOn: true, antennaOk: true, landlineOn: true },
      county: { outageFraction: 0, curfew: false, curfewSinceSim: null, restoreFraction: 0, podOpen: false, cowUp: false, trafficLightsOn: true },
    },
    hood: {
      houses: Object.fromEntries(HOOD_HOUSE_IDS.map(id => [id, {
        id, shuttered: !!HOOD_HOUSES[id].shuttersAt && HOOD_HOUSES[id].shuttersAt <= -32, shuttering: false, evacuated: false, shingleLoss: 0, deckExposed: false,
        garageFailed: false, garageFailedHalf: null, cageStage: 0, genOn: false, genSchedule: null, tarp: false, lastDark: false,
        lightsOn: true, plywoodFlown: false, ringOn: id === 'bergstrom', flagUp: id === 'ray', trampolineGone: false, boatRolled: false, liftTilted: false, powerOn: true,
      }])),
      trees: Object.fromEntries(TREE_IDS.map(id => [id, { id, kind: TREES[id].kind, pos: [...TREES[id].pos], bend: 0, frondLoss: 0, limbsLost: 0, fallen: false, fallDirDeg: 0, fallSim: null }])),
      transformers: Object.fromEntries(TRANSFORMER_IDS.map(id => [id, { id, pos: [...TRANSFORMERS[id].pos], houses: [...TRANSFORMERS[id].houses], hazardE: 0, hazardEFail: 1, failed: false, failedSim: null, flashed: false }])),
      cableNodeDown: false, streetlightsOn: false, fountainOn: true, stopSignBent: false, mailboxGone: false,
      impactQueue: [], grounded: [], debrisPileM3: 0, damage: 0,
    },
    alerts: {
      advisories: [], active: [], issued: {}, weaLog: [], nwrQueue: [], tvCrawl: [],
      nextAdvisorySim: 0, nextIntermediateSim: 0, tcuHourly: false, torWatch: false,
    },
    devices: {
      phone: {
        battery: 71, banks: [60, 60], screenOn: false, up: false, app: 'lock', wifi: true,
        threads: Object.fromEntries(PHONE_THREADS.map(t => [t, []])), unread: 0, alertHistory: [], weaActive: null, gallery: [],
        flashlight: false, lowPowerPrompted: false, onSurface: false, pos: [0, 0, 0], alertsEnabled: true,
        radar: { lastFrameSim: startSim, stale: false }, ringLastClip: null, charging: null,
      },
      tv: { on: true, channel: 7, volume: 0.6, muted: false, contentKey: 'advisory', segment: 'radar', macroblock: 0, noSignal: false, easActive: false, antenna: false },
      tvKitchen: { on: false, channel: 7, volume: 0.5, muted: false, contentKey: 'advisory', segment: 'radar', macroblock: 0, noSignal: false, easActive: false, antenna: true },
      nwr: { on: false, state: 'OFF', volume: 0.7, channel: 7, batteryH: 0, sameActive: false, currentProduct: null, eventList: [], hiss: 0, backlightUntilReal: 0, pos: [0, 0, 0], room: 'kitchen' },
      console: {
        wind: 4, gust: 6, gustHigh: 6, gustHighSim: startSim, dirDeg: 90, pHpa: 1011.4, pInhg: 29.87, pInHg: 29.87, trend: 'flat', stormIcon: false,
        pHistory: new Float32Array(288).fill(1011.4), rainRate: 0, rainTotal: 0, tIn: 24, rhIn: 0.5, tOut: 26, rhOut: 0.89, tdOut: 24, outdoorOnline: true, backlight: true,
      },
      thermostat: { alive: true, display: '72 COOL' },
      ups: { onBattery: false, beeping: false, minutesLeft: 12, unplugged: false },
      modem: { power: true, ds: true, us: true, online: true },
    },
    player: {
      pos: [12.0, 1.65, 8.8], yaw: 270, pitch: 0, room: 'foyer', outdoors: false, crouching: false, sprinting: false,
      down: false, downSinceReal: 0, injury: 0, yardSector: '', inLee: false, carrying: null, pockets: {},
      helmet: false, shoes: true, earsMuffled: 0, flashlightOn: false, phoneUp: false, sleeping: false, wet: 0, lookingAt: null,
      speedMul: 1, holdingVerb: null, holdProgress: 0,
    },
    objects: Object.fromEntries(OBJECT_IDS.map(id => {
      const o = OBJECTS[id];
      return [id, {
        id, kind: o.kind, room: o.room, pos: [0, 0, 0], rotY: 0, state: 'home', on: false, open: false, fill: 0, secured: false,
        socket: null, count: o.count ?? 1, battery: o.battery ?? 0, extra: Object.fromEntries(o.extra.map(k => [k, defaultExtra(k, id, o)])),
      }];
    })),
    life: {
      pet: { kind: meta.options.pet, state: 'sleep', pos: [2.0, 0, 9.0], targetPos: [2.0, 0, 9.0], fear: 0, fearTarget: 0, panicUntilReal: 0, lastSeenSim: startSim, observed: false, fedCount: 0, walkedCount: 0, panting: 0 },
      neighbours: Object.fromEntries(['ray', 'linda', 'marcus', 'denise', 'tam'].map(id => [id, { id, visible: false, where: 'home', said: {} }])),
      wildlife: { frogs: 0, crickets: 0, birds: 0.3, cicadas: 0.5, mosquitoes: 0, buzzards: 0, flockActive: false },
    },
    tasks: { list: [] },
    details: { fired: {}, firedHashed: {}, captionsUsed: 0, lastEvalSim: startSim },
    log: [],
    debug: { frameMs: {}, drawCalls: 0, triangles: 0, programs: 0, textureBytes: 0, hash: '', nanPaths: [], lightsCreatedAfterInit: 0 },
  };
  return state;
}

function defaultExtra(key, id, o) {
  switch (key) {
    case 'label': return o.label || id;
    case 'parkedAt': return 'driveway';
    case 'dented': return false;
    case 'wetL': return 0;
    case 'tankFull': return true;
    case 'clockSet': return true;
    case 'hot': return id === 'coffeeMaker';
    case 'lastSleptSim': return 0;
    case 'debrisClass': return o.debrisClass || 'bin';
    case 'threshold': return o.threshold || 20;
    case 'battery': return 1;
    case 'silencedUntilSim': return 0;
    case 'bent': return false;
    case 'lit': return false;
    case 'inBag': return false;
    case 'read': return false;
    case 'used': return false;
    default: return 0;
  }
}

/** Walk the sim slices for NaN/Infinity (soak rule). Returns the offending paths. */
export function findNonFinite(state, slices = ['storm', 'local', 'cues', 'house', 'utilities', 'hood']) {
  const bad = [];
  const walk = (v, path, depth) => {
    if (depth > 12) return;
    if (typeof v === 'number') { if (!Number.isFinite(v)) bad.push(path); return; }
    if (v && typeof v === 'object') {
      if (ArrayBuffer.isView(v)) { for (let i = 0; i < v.length; i++) if (!Number.isFinite(v[i])) { bad.push(`${path}[${i}]`); break; } return; }
      for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`, depth + 1);
    }
  };
  for (const s of slices) walk(state[s], s, 0);
  return bad;
}

export { ROOM_IDS };
