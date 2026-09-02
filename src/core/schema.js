/**
 * core/schema.js — the JSDoc typedefs of ARCHITECTURE §3 (the frozen contract) and SCHEMA_VERSION.
 * Owner: E1 core. The authoritative field list with defaults is createState() in core/state.js;
 * the prose contract is docs/ARCHITECTURE.md §3. Types here exist for editors and for the tests.
 */
export { SCHEMA_VERSION } from './state.js';

/** @typedef {'prep'|'bands'|'ts'|'hurricane'|'eyewallFront'|'eye'|'eyewallBack'|'hurricaneBack'|'subsiding'|'aftermath'} StormPhase */

/** @typedef {Object} Local  conditions at the house this tick (house-level, sim-time unless noted)
 *  @property {number} uMarine @property {number} uMean @property {number} u1m @property {number} uGustEnv @property {number} uStruct
 *  @property {number} uInst   real-time @property {number} uG3  real-time
 *  @property {number} dirFromDeg @property {number} dirInstDeg  real-time
 *  @property {number} pHpa @property {number} dPdtHpaPerH
 *  @property {number} rainMmPerH @property {number[]} rainWallMmPerH  8 sectors @property {number} rainAngleDeg @property {number} rainTotalMm @property {number} rainRecentMm
 *  @property {number} bandRain @property {number} bandWind @property {number} bandFrontM
 *  @property {number} tAirC @property {number} tdC @property {number} rhOut
 *  @property {number} illumLux @property {number} visibilityM @property {number} cloudFrac @property {number} cloudBaseM
 *  @property {number} eyeFactor @property {number} reversal
 *  @property {{distM:number, azDeg:number, simTime:number}|null} lightning @property {number} lightningRatePerMin
 *  @property {number} surgeM @property {number} swaleWaterM @property {number} streetWaterM @property {number} pondRiseM
 *  @property {{azDeg:number, elDeg:number}} sun @property {StormPhase} phase @property {number} rKm @property {number} phiDeg @property {number} mesovortex
 */

/** @typedef {Object} Cues
 *  @property {number} windLoadPa real-time @property {number} windLoadEnvPa sim @property {number} roar @property {number} whistle @property {number} debrisRate
 *  @property {number[]} leakRate @property {number} pushForceN @property {number} earPop @property {number} powerHazard
 *  @property {number} eyeFactor @property {number} reversal @property {number} heatIndexC @property {number} heatIndexOutC @property {number} wetness
 */

/** @typedef {Object} Interactable
 *  @property {string} id
 *  @property {string[]} meshIds
 *  @property {(state:any) => {verb:string, label:string, holdS:number, enabled:boolean, reason?:string}[]} verbs
 *  @property {(state:any, ctx:any, verb:string) => void} use
 *  @property {{kind:string, count:number}|null} carryable
 */

/** @typedef {Object} ModuleContract  every module directory's index.js
 *  @property {(ctx:any) => void|Promise<void>} init
 *  @property {(...args:any[]) => void} [update]   its slot in the frame (dtSim/dtReal per ARCHITECTURE §4)
 *  @property {(h:number) => void} [step]          sim-block modules only (storm, utilities, house, hood): fixed 5-s sub-step
 *  @property {(dtReal:number) => void} [updateRealtime]  storm only
 *  @property {() => void} [dispose]
 *  @property {Object} api
 */
export const MODULE_NAMES = Object.freeze(['storm', 'utilities', 'house', 'hood', 'alerts', 'life', 'player', 'objects', 'details', 'scenario', 'devices', 'render', 'audio', 'ui', 'world']);
