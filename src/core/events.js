/**
 * core/events.js — frozen bus event names (ARCHITECTURE §5), the wake list, the moment list.
 * Owner: E1 core.
 */
export const EV = Object.freeze({
  CLOCK_PHASE: 'clock:phase', CLOCK_TIER: 'clock:tier', CLOCK_SLEEP_START: 'clock:sleepStart', CLOCK_SLEEP_END: 'clock:sleepEnd', CLOCK_MOMENT: 'clock:moment',
  STORM_PHASE_CHANGED: 'storm:phaseChanged', STORM_BAND_ENTER: 'storm:bandEnter', STORM_BAND_EXIT: 'storm:bandExit',
  STORM_LIGHTNING: 'storm:lightning', STORM_MESOVORTEX: 'storm:mesovortex', STORM_EYE_ENTER: 'storm:eyeEnter', STORM_EYE_EXIT: 'storm:eyeExit',
  STORM_WIND_REVERSAL: 'storm:windReversal', STORM_LANDFALL: 'storm:landfall',
  STORM_SUNSET: 'storm:sunset', STORM_SUNRISE: 'storm:sunrise', STORM_CIVIL_DAWN: 'storm:civilDawn', STORM_CIVIL_DUSK: 'storm:civilDusk',
  STORM_ADVISORY_DUE: 'storm:advisoryDue',
  POWER_FLICKER: 'power:flicker', POWER_BROWNOUT: 'power:brownout', POWER_TRANSFORMER_FLASH: 'power:transformerFlash', POWER_LOST: 'power:lost', POWER_RESTORED: 'power:restored',
  GEN_STARTED: 'gen:started', GEN_STOPPED: 'gen:stopped', GEN_FUEL_LOW: 'gen:fuelLow', GEN_PULL_FAILED: 'gen:pullFailed',
  CELL_STATE_CHANGED: 'cell:stateChanged', CELL_MESSAGES_DELIVERED: 'cell:messagesDelivered', CELL_RESTORE: 'cell:restore',
  WATER_PRESSURE_LOST: 'water:pressureLost', WATER_PRESSURE_BACK: 'water:pressureBack', WATER_BOIL_NOTICE: 'water:boilNotice', WATER_BOIL_LIFTED: 'water:boilLifted',
  MEDIA_CABLE_LOST: 'media:cableLost', MEDIA_WIFI_LOST: 'media:wifiLost',
  COUNTY_CURFEW: 'county:curfew', COUNTY_POD: 'county:pod', COUNTY_COW: 'county:cow',
  HOUSE_OPENING_FAILED: 'house:openingFailed', HOUSE_SLIDER_UNLATCH: 'house:sliderUnlatch', HOUSE_DOOR_RIPPED: 'house:doorRipped', HOUSE_DOOR_SLAM: 'house:doorSlam',
  HOUSE_GARAGE_BUCKLE: 'house:garageBuckle', HOUSE_GARAGE_FAILED: 'house:garageFailed', HOUSE_CAGE_PANEL_TEAR: 'house:cagePanelTear', HOUSE_CAGE_STAGE: 'house:cageStage',
  HOUSE_SHINGLE_LOSS: 'house:shingleLoss', HOUSE_LEAK_STARTED: 'house:leakStarted', HOUSE_LEAK_TIER: 'house:leakTier',
  HOUSE_CEILING_SAG: 'house:ceilingSag', HOUSE_CEILING_COLLAPSE: 'house:ceilingCollapse', HOUSE_INTRUSION: 'house:intrusion',
  HOUSE_EAR_POP: 'house:earPop', HOUSE_ATTIC_WHUMP: 'house:atticWhump', HOUSE_BUCKET_OVERFLOW: 'house:bucketOverflow',
  HOUSE_DETECTOR_CHIRP: 'house:detectorChirp', HOUSE_CO_ALARM: 'house:coAlarm', HOUSE_CO_DOSE: 'house:coDose',
  HOOD_TREE_LIMB: 'hood:treeLimb', HOOD_TREE_FALLEN: 'hood:treeFallen', HOOD_NEIGHBOUR_SHUTTER: 'hood:neighbourShutter', HOOD_EVACUATED: 'hood:evacuated',
  HOOD_GEN_ON: 'hood:genOn', HOOD_GEN_OFF: 'hood:genOff', HOOD_PLYWOOD_FLOWN: 'hood:plywoodFlown', HOOD_TRANSFORMER_FLASH: 'hood:transformerFlash',
  HOOD_CABLE_NODE_DOWN: 'hood:cableNodeDown', HOOD_STREETLIGHTS: 'hood:streetlights', HOOD_DEBRIS_IMPACT: 'hood:debrisImpact', HOOD_GROUNDED: 'hood:grounded',
  ALERT_ISSUED: 'alert:issued', ALERT_WEA: 'alert:wea', ALERT_NWR: 'alert:nwr', ALERT_TV: 'alert:tv', ALERT_ADVISORY: 'alert:advisory',
  NPC_SAY: 'npc:say', PET_STATE: 'pet:state',
  PLAYER_ROOM_CHANGE: 'player:roomChange', PLAYER_OUTDOORS: 'player:outdoors', PLAYER_KNOCKED_DOWN: 'player:knockedDown', PLAYER_UP: 'player:up',
  PLAYER_INJURY: 'player:injury', PLAYER_SLEEP: 'player:sleep', PLAYER_WAKE: 'player:wake',
  INTERACT_USE: 'interact:use', INTERACT_PICKUP: 'interact:pickup', INTERACT_DROP: 'interact:drop', INTERACT_HOLD_START: 'interact:holdStart', INTERACT_HOLD_END: 'interact:holdEnd',
  OBJECT_CHANGED: 'object:changed', TASK_DONE: 'task:done', TASK_AVAILABLE: 'task:available', DETAIL_FIRED: 'detail:fired',
  GAME_CHAPTER: 'game:chapter', GAME_END: 'game:end',
  DEVICE_TV_CHANNEL: 'device:tvChannel', DEVICE_PHONE_APP: 'device:phoneApp', DEVICE_NWR_STATE: 'device:nwrState', DEVICE_PHOTO: 'device:photo',
  DEBUG_SCREENSHOT_READY: 'debug:screenshotReady',
});
export const EVENT_NAMES = Object.freeze(Object.values(EV));

/** Modules whose listeners are "sim-side" and receive events during bus.flushSim() (ARCHITECTURE §4). */
export const SIM_SIDE_MODULES = Object.freeze(['storm', 'utilities', 'house', 'hood', 'alerts', 'clock', 'devices', 'core']);

/**
 * Wake list (DESIGN §2.5, ARCHITECTURE §5 column W). Value: true, or a predicate on the payload.
 * Every wake event is emitted from the sim block or alerts.
 */
export const WAKE_EVENTS = Object.freeze({
  [EV.ALERT_WEA]: true,
  [EV.ALERT_NWR]: (e) => !!e.wat,
  [EV.POWER_LOST]: true,
  [EV.POWER_TRANSFORMER_FLASH]: true,
  [EV.HOOD_DEBRIS_IMPACT]: (e) => e.energyJ > 40 && !['frontYard', 'backYard', 'driveway', 'street', 'car2', 'pool'].includes(e.surface),
  [EV.HOUSE_OPENING_FAILED]: true,
  [EV.HOUSE_GARAGE_FAILED]: true,
  [EV.HOUSE_CEILING_SAG]: true,
  [EV.HOUSE_CEILING_COLLAPSE]: true,
  [EV.HOUSE_CAGE_STAGE]: (e) => e.stage >= 4,
  [EV.STORM_EYE_ENTER]: true,
  [EV.STORM_EYE_EXIT]: true,
  [EV.STORM_WIND_REVERSAL]: true,
  [EV.HOUSE_DETECTOR_CHIRP]: true,
  [EV.HOUSE_CO_ALARM]: true,
  [EV.HOUSE_CO_DOSE]: true,
});

/** Moments (DESIGN §2.4): 1× for 20 real seconds. Value: true or a predicate on the payload. */
export const MOMENT_EVENTS = Object.freeze({
  [EV.POWER_LOST]: true,
  [EV.POWER_TRANSFORMER_FLASH]: true,
  [EV.HOUSE_EAR_POP]: 'first',
  [EV.HOUSE_CAGE_STAGE]: (e) => e.stage === 4,
  [EV.HOUSE_GARAGE_FAILED]: true,
  [EV.HOUSE_OPENING_FAILED]: true,
  [EV.STORM_EYE_ENTER]: true,
  [EV.STORM_WIND_REVERSAL]: true,
  [EV.STORM_EYE_EXIT]: true,
  [EV.HOOD_TREE_FALLEN]: true,
  [EV.HOUSE_CEILING_COLLAPSE]: true,
  [EV.ALERT_WEA]: true,
  [EV.POWER_RESTORED]: true,
});
/** Soft moments: 3× for 60 real seconds. */
export const SOFT_MOMENT_EVENTS = Object.freeze({
  [EV.STORM_SUNSET]: (e, state) => state.local.phase === 'prep',
});

export function isWakeEvent(evt) {
  const w = WAKE_EVENTS[evt.name];
  return w === true || (typeof w === 'function' && !!w(evt));
}
