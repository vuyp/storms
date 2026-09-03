/**
 * textures/index.js — `textures.get(name)`: memoised, seeded canvas textures; `prepare()` generates the set
 * (≤ 2.5 s, yielding to the boot bar) with an IndexedDB ImageData cache keyed by name + seed + version
 * (ARCHITECTURE §6.6, §9; T §5). Owner: E4 world+textures. Writes no state.
 *
 * Names: a recipe name ('stucco', 'porcelain', …) returns its colour map; 'stucco:normal' / 'porcelain:rough'
 * return the data maps. Colour maps are SRGBColorSpace, data maps NoColorSpace (T §13 #2). Repeating textures
 * carry `repeat = 1 / coverMetres` so geometry UVs authored in metres tile correctly; `cover(name)` exposes it.
 * Budget: ≈ 48 canvases, ≈ 42 MB of GPU texture memory (ARCHITECTURE §10 ≤ 60 MB shared with the screens).
 */
import * as THREE from 'three';
import { keyFor, makeCanvas } from './noise.js';
import { makeStucco, makeBlock } from './stucco.js';
import { makeDrywall } from './drywall.js';
import { makePorcelain, makeBathTile, makePavers, makeWaterlineTile } from './tile.js';
import { makeWood, makeGranite } from './wood.js';
import { makeShingle, makeFelt } from './shingle.js';
import { makeSoffit } from './soffit.js';
import { makeConcrete, makeGarageFloor } from './concrete.js';
import { makeAsphalt } from './asphalt.js';
import { makeTurf, makeMulch, makeDirt } from './turf.js';
import { makeScreen } from './screen.js';
import { makeFrondSabal, makeFrondFeather, makeLeafCluster, makeBarkSabal, makeBarkRing, makeBarkOak } from './foliage.js';
import { makeFabric, makeCarpet } from './fabric.js';
import { makeBrushed, makeGarageDoor, makePanelAtlas, makeCorrugated } from './metal.js';
import { makeStain, makePuddle, makeContactShadow, makeScuff, makeNoise256, makeGrime, makeCookie } from './decals.js';
import { makeNotepad, makeWaterCase, makeChart, makeLetter, makeBoxLabel, makeCanLabel, makeFlag, makeScreenOff, makePoolToy, makeHouseNumber, makeStopSign, makeHoaSign, makeTruckDecal } from './labels.js';

export const TEXTURE_VERSION = 4;
const DB_NAME = 'florida-storm-textures', STORE = 'maps';

const S = { seed: 7, anisotropy: 4, lowTier: false };
/** @type {Map<string, object>} recipe results {color?, normal?, rough?, cover, alpha?, repeat?, data?, cells?} */
const results = new Map();
/** @type {Map<string, THREE.Texture>} */
const textures = new Map();
let bytes = 0;

/** Recipe table: name → { size (base), run(key) }. Sizes per ARCHITECTURE §9 (512² default, 1024² floor/shingles, 256² noise). */
const RECIPES = {
  stucco: (k) => makeStucco(512, k, S.seed),
  block: (k) => makeBlock(512, k, S.seed),
  drywall: (k) => makeDrywall(512, k, S.seed),
  porcelain: (k) => makePorcelain(S.lowTier ? 512 : 1024, k),
  bathTile: (k) => makeBathTile(512, k),
  pavers: (k) => makePavers(512, k),
  waterline: (k) => makeWaterlineTile(256, k),
  wood: (k) => makeWood(512, k),
  granite: (k) => makeGranite(512, k),
  shingle: (k) => makeShingle(S.lowTier ? 512 : 1024, k, [74, 71, 68]),
  shingleBrown: (k) => makeShingle(512, k, [96, 80, 62]),
  felt: (k) => makeFelt(256, k),
  soffit: (k) => makeSoffit(512, k),
  concrete: (k) => makeConcrete(512, k),
  garageFloor: (k) => makeGarageFloor(512, k),
  asphalt: (k) => makeAsphalt(512, k),
  turf: (k) => makeTurf(512, k, S.seed),
  mulch: (k) => makeMulch(256, k),
  dirt: (k) => makeDirt(256, k),
  screen: () => makeScreen(256),
  frondSabal: (k) => makeFrondSabal(512, k, S.seed),
  frondQueen: (k) => makeFrondFeather(512, k, S.seed, { base: [58, 112, 40] }),
  frondFoxtail: (k) => makeFrondFeather(512, k, S.seed, { plumose: true, base: [52, 104, 40] }),
  frondRoyal: (k) => makeFrondFeather(512, k, S.seed, { base: [44, 100, 48] }),
  leafOak: (k) => makeLeafCluster(256, k, S.seed, { base: [46, 78, 34], leaf: 7, count: 320 }),
  leafHedge: (k) => makeLeafCluster(256, k, S.seed, { base: [56, 104, 44], leaf: 11, count: 220, glossy: true }),
  leafFicus: (k) => makeLeafCluster(256, k, S.seed, { base: [40, 88, 40], leaf: 9, count: 280, glossy: true }),
  barkSabal: (k) => makeBarkSabal(256, k),
  barkRing: (k) => makeBarkRing(256, k),
  barkOak: (k) => makeBarkOak(256, k),
  fabric: (k) => makeFabric(512, k),
  carpet: (k) => makeCarpet(512, k),
  brushed: (k) => makeBrushed(512, k),
  garageDoor: (k) => makeGarageDoor(1024, 448, k),
  panelAtlas: (k) => makePanelAtlas(1024, k, S.seed),
  corrugated: (k) => makeCorrugated(256, k),
  stain: (k) => makeStain(256, k),
  puddle: (k) => makePuddle(256, k),
  contactShadow: () => makeContactShadow(128),
  scuff: (k) => makeScuff(128, k),
  noise256: (k) => makeNoise256(k),
  grime: (k) => makeGrime(256, k),
  cookie: () => makeCookie(256),
  notepad: (k) => makeNotepad(k, S.seed),
  waterCase: () => makeWaterCase(),
  chart: (k) => makeChart(k, S.seed),
  letter: () => makeLetter(),
  boxLabel: (k) => makeBoxLabel(k, S.seed),
  canLabel: (k) => makeCanLabel(k, S.seed),
  flag: () => makeFlag(),
  screenOff: () => makeScreenOff(512, 288),
  poolToy: () => makePoolToy(),
  houseNumber: () => makeHouseNumber('4212'),
  stopSign: () => makeStopSign(),
  hoaSign: () => makeHoaSign(),
  truckDecal: () => makeTruckDecal(),
};
export const RECIPE_NAMES = Object.freeze(Object.keys(RECIPES));

/** Call once before build: the scenario seed and the renderer's anisotropy cap (4 on SwiftShader). */
export function init({ seed = 7, anisotropy = 4, lowTier = false } = {}) {
  if (seed !== S.seed) dispose();
  S.seed = seed >>> 0; S.anisotropy = anisotropy; S.lowTier = lowTier;
}

function runRecipe(name) {
  if (results.has(name)) return results.get(name);
  const make = RECIPES[name];
  if (!make) throw new Error(`textures: unknown recipe '${name}'`);
  const r = make(keyFor(S.seed, name));
  results.set(name, r);
  return r;
}

/** The raw recipe result (canvases + meta: cover, cells for the panel atlas). */
export function result(name) { return runRecipe(name); }
/** Metres covered by one repeat of the texture. */
export function cover(name) { return runRecipe(name.split(':')[0]).cover || [1, 1]; }

function toTexture(canvas, r, isColour) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = isColour && !r.data ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (r.repeat === false) { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; }
  else { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / r.cover[0], 1 / r.cover[1]); }
  t.anisotropy = S.anisotropy;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  bytes += canvas.width * canvas.height * 4 * 1.33;
  return t;
}

/**
 * The memoised texture for 'recipe' (colour) or 'recipe:normal' / 'recipe:rough'.
 * @returns {THREE.Texture}
 */
export function get(name) {
  if (textures.has(name)) return textures.get(name);
  const [base, map = 'color'] = name.split(':');
  const r = runRecipe(base);
  const canvas = r[map];
  if (!canvas) throw new Error(`textures: recipe '${base}' has no '${map}' map`);
  const t = toTexture(canvas, r, map === 'color');
  t.name = name;
  textures.set(name, t);
  return t;
}
export function has(name) { return !!RECIPES[name.split(':')[0]]; }

/** Estimated GPU bytes of every texture handed out so far. */
export function textureBytes() { return Math.round(bytes); }

export function dispose() {
  for (const t of textures.values()) t.dispose();
  textures.clear(); results.clear(); bytes = 0;
}

// ---------------------------------------------------------------------------------------------------------------
// IndexedDB cache of ImageData (keyed name|seed|version). Best effort: any failure just regenerates.
// ---------------------------------------------------------------------------------------------------------------
let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (_) { resolve(null); }
  });
  return dbPromise;
}
function idbGet(db, key) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (_) { resolve(null); }
  });
}
function idbPut(db, key, value) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (_) { resolve(false); }
  });
}
const MAP_KEYS = ['color', 'normal', 'rough'];
function serialize(r) {
  const maps = {};
  for (const k of MAP_KEYS) if (r[k]) { const c = r[k]; maps[k] = c.getContext('2d').getImageData(0, 0, c.width, c.height); }
  const meta = {};
  for (const k of Object.keys(r)) if (!MAP_KEYS.includes(k)) meta[k] = r[k];
  return { maps, meta };
}
function deserialize(rec) {
  const r = { ...rec.meta };
  for (const k of MAP_KEYS) if (rec.maps[k]) {
    const img = rec.maps[k];
    const c = makeCanvas(img.width, img.height);
    c.getContext('2d').putImageData(img, 0, 0);
    r[k] = c;
  }
  return r;
}

/**
 * Generate (or load from the cache) every recipe in `names` (default: all), yielding to the event loop so the
 * boot bar can advance. Resolves with {generated, cached, ms}.
 * @param {string[]} [names]
 * @param {(done:number, total:number, name:string)=>void} [onProgress]
 */
export async function prepare(names = RECIPE_NAMES, onProgress = null) {
  const t0 = performance.now();
  const db = await openDb();
  let generated = 0, cached = 0, lastYield = performance.now();
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (!results.has(name)) {
      const key = `${name}|${S.seed}|${TEXTURE_VERSION}|${S.lowTier ? 'lo' : 'hi'}`;
      let r = null;
      if (db) { const rec = await idbGet(db, key); if (rec && rec.maps) { try { r = deserialize(rec); cached++; } catch (_) { r = null; } } }
      if (!r) {
        r = runRecipe(name); generated++;
        if (db) idbPut(db, key, serialize(r)); // fire and forget
      } else results.set(name, r);
    }
    onProgress?.(i + 1, names.length, name);
    if (performance.now() - lastYield > 60) { await new Promise(res => setTimeout(res, 0)); lastYield = performance.now(); }
  }
  return { generated, cached, ms: performance.now() - t0 };
}

export const api = { init, get, has, cover, result, prepare, textureBytes, dispose, RECIPE_NAMES };
