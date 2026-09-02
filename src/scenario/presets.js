/**
 * scenario/presets.js — storm presets (DESIGN §1.1, M §13) and the scenario start rule.
 * Owner: E1 (with E2). Every value is marine unless noted. Track offset positive = house right of track.
 */
import { STORM_NAMES, basinId } from '../core/ids.js';

const KT = 0.514444;

/** @typedef {{id:string, label:string, vmaxKt:number, vmaxLandfallKt:number, pcHpa:number, pnHpa:number, rmwKm:number, B:number,
 *   vtKmh:number, headingDeg:number, trackOffsetKm:number, landfallHour:number, r34Km:number, r50Km:number, r64Km:number,
 *   intensityTrend:{tRel:number, vmaxKt:number}[], blurb:string}} StormPreset */

export const PRESETS = Object.freeze({
  'leah-ref': {
    id: 'leah-ref', label: 'Reference — Category 3, eye over the house',
    vmaxKt: 100, vmaxLandfallKt: 100, pcHpa: 950, pnHpa: 1012, rmwKm: 25, B: 1.5, vtKmh: 20, headingDeg: 45, trackOffsetKm: 0, landfallHour: 14,
    r34Km: 200, r50Km: 115, r64Km: 80,
    intensityTrend: [{ tRel: -60, vmaxKt: 90 }, { tRel: -33, vmaxKt: 95 }, { tRel: -12, vmaxKt: 100 }, { tRel: 0, vmaxKt: 100 }],
    blurb: 'A 100-kt major hurricane, 950 hPa, 25-km eye, 20 km/h to the north-east. Landfall 4.5 km south-west of the house at 13:46; the eye passes directly over at 14:00.',
  },
  'compact-cat4': {
    id: 'compact-cat4', label: 'Compact Category 4 — fast, violent, short',
    vmaxKt: 130, vmaxLandfallKt: 130, pcHpa: 940, pnHpa: 1012, rmwKm: 12, B: 1.9, vtKmh: 35, headingDeg: 45, trackOffsetKm: 0, landfallHour: 14,
    r34Km: 150, r50Km: 80, r64Km: 45,
    intensityTrend: [{ tRel: -40, vmaxKt: 110 }, { tRel: -18, vmaxKt: 125 }, { tRel: -6, vmaxKt: 130 }, { tRel: 0, vmaxKt: 130 }],
    blurb: 'A small, intense Cat 4 racing ashore at 35 km/h: a 15-minute eye and the worst wind the house will ever see.',
  },
  'large-cat2': {
    id: 'large-cat2', label: 'Large Category 2 — a long, wide storm, no eye',
    vmaxKt: 90, vmaxLandfallKt: 90, pcHpa: 965, pnHpa: 1012, rmwKm: 45, B: 1.2, vtKmh: 16, headingDeg: 30, trackOffsetKm: 30, landfallHour: 14,
    r34Km: 300, r50Km: 170, r64Km: 100,
    intensityTrend: [{ tRel: -60, vmaxKt: 85 }, { tRel: -20, vmaxKt: 90 }, { tRel: 0, vmaxKt: 90 }],
    blurb: 'A sprawling Cat 2 passing 30 km to the west: eight hours of veering wind, no eye, a very long night.',
  },
  'slow-cat1': {
    id: 'slow-cat1', label: 'Slow Category 1 — thirty hours of wind and 500 mm of rain',
    vmaxKt: 75, vmaxLandfallKt: 75, pcHpa: 978, pnHpa: 1012, rmwKm: 40, B: 1.1, vtKmh: 8, headingDeg: 20, trackOffsetKm: -20, landfallHour: 14,
    r34Km: 220, r50Km: 130, r64Km: 60,
    intensityTrend: [{ tRel: -80, vmaxKt: 65 }, { tRel: -30, vmaxKt: 75 }, { tRel: 0, vmaxKt: 75 }],
    blurb: 'A crawling Cat 1 at 8 km/h: the wind never gets extreme but it never stops, and the pond comes up the lanai step.',
  },
  'nearmiss-cat3': {
    id: 'nearmiss-cat3', label: 'Near miss — Category 3 passing 70 km away',
    vmaxKt: 100, vmaxLandfallKt: 100, pcHpa: 950, pnHpa: 1012, rmwKm: 25, B: 1.5, vtKmh: 20, headingDeg: 45, trackOffsetKm: 70, landfallHour: 14,
    r34Km: 200, r50Km: 115, r64Km: 80,
    intensityTrend: [{ tRel: -60, vmaxKt: 90 }, { tRel: -33, vmaxKt: 95 }, { tRel: -12, vmaxKt: 100 }, { tRel: 0, vmaxKt: 100 }],
    blurb: 'The reference storm 70 km to the west: Cat 1 conditions at the house, tornado warnings all night, and a lot of rain.',
  },
  'cat5': {
    id: 'cat5', label: 'Category 5 — 140 kt, 919 hPa',
    vmaxKt: 140, vmaxLandfallKt: 140, pcHpa: 919, pnHpa: 1012, rmwKm: 18, B: 1.8, vtKmh: 22, headingDeg: 45, trackOffsetKm: 0, landfallHour: 14,
    r34Km: 240, r50Km: 140, r64Km: 90,
    intensityTrend: [{ tRel: -48, vmaxKt: 120 }, { tRel: -18, vmaxKt: 135 }, { tRel: -6, vmaxKt: 140 }, { tRel: 0, vmaxKt: 140 }],
    blurb: 'The one you evacuate for. Every failure model reaches its threshold; the house is a Cat 5 test.',
  },
});
export const PRESET_IDS = Object.freeze(Object.keys(PRESETS));

/** Apply setup options on top of a preset (the sliders of DESIGN §14). */
export function resolvePreset(presetId, options = {}) {
  const p = PRESETS[presetId] || PRESETS['leah-ref'];
  return {
    ...p,
    vtKmh: options.forwardSpeedKmh ?? p.vtKmh,
    trackOffsetKm: options.trackOffsetKm ?? p.trackOffsetKm,
    landfallHour: options.landfallHour ?? p.landfallHour,
    vmaxMs: p.vmaxKt * KT, vmaxLandfallMs: p.vmaxLandfallKt * KT, rmwM: p.rmwKm * 1000, vtMs: (options.forwardSpeedKmh ?? p.vtKmh) / 3.6,
  };
}

/**
 * The scenario start (DESIGN §1.1): startTRel = −max(32 h, (R34 + 250 km)/vt); the start clock is the
 * 06:00 nearest to (and not more than an hour after) that instant. Highlights starts at T−16.
 * @returns {{startTRel:number, startSim:number, T0:number}}
 */
export function scenarioStart(preset, options = {}, dayStart0 = 86400) {
  const T0 = dayStart0 + (options.landfallHour ?? preset.landfallHour) * 3600;
  if (options.pacing === 'highlights') return { startTRel: -16, startSim: T0 - 16 * 3600, T0 };
  const vt = options.forwardSpeedKmh ?? preset.vtKmh;
  const h = Math.max(32, (preset.r34Km + 250) / vt);
  const candidate = T0 - h * 3600;
  // snap to a 06:00 wake-up: the 06:00 within [candidate − 23 h, candidate + 1 h] closest to candidate
  const dayOf = Math.floor(candidate / 86400) * 86400;
  let six = dayOf + 6 * 3600;
  if (six > candidate + 3600) six -= 86400;
  return { startTRel: (six - T0) / 3600, startSim: six, T0 };
}

export function stormMeta(name) { return { stormName: STORM_NAMES.includes(name) ? name : 'Leah', basinId: basinId(name) }; }
