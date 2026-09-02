/**
 * core/guard.js — debug-mode write guards (ARCHITECTURE Law 1).
 * Owner: E1 core. A module receives a view of the state in which every slice it does not own throws on write.
 */
const proxyCache = new WeakMap();

function readOnlyDeep(target, path, moduleName) {
  if (target === null || typeof target !== 'object') return target;
  let perModule = proxyCache.get(target);
  if (!perModule) { perModule = new Map(); proxyCache.set(target, perModule); }
  if (perModule.has(moduleName)) return perModule.get(moduleName);
  const p = new Proxy(target, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r);
      if (typeof k === 'symbol') return v;
      return readOnlyDeep(v, `${path}.${String(k)}`, moduleName);
    },
    set(t, k) { throw new Error(`[guard] ${moduleName} wrote ${path}.${String(k)} — not its slice (ARCHITECTURE Law 1)`); },
    deleteProperty(t, k) { throw new Error(`[guard] ${moduleName} deleted ${path}.${String(k)} — not its slice`); },
    defineProperty(t, k) { throw new Error(`[guard] ${moduleName} defined ${path}.${String(k)} — not its slice`); },
  });
  perModule.set(moduleName, p);
  return p;
}

/**
 * @param {object} state the root state
 * @param {string[]} ownedSlices top-level keys the module may write
 * @param {string} moduleName
 */
export function viewFor(state, ownedSlices, moduleName) {
  const owned = new Set(ownedSlices);
  return new Proxy(state, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r);
      if (typeof k === 'symbol' || owned.has(k) || v === null || typeof v !== 'object') return v;
      return readOnlyDeep(v, `state.${String(k)}`, moduleName);
    },
    set(t, k, v) {
      if (!owned.has(k)) throw new Error(`[guard] ${moduleName} replaced state.${String(k)} — not its slice`);
      t[k] = v; return true;
    },
  });
}

/** Which slices each module may write (ARCHITECTURE §1 table). */
export const OWNERSHIP = Object.freeze({
  core: ['meta', 'clock', 'log', 'debug'],
  clock: ['clock'],
  player: ['player'],
  interact: ['player'],
  objects: ['objects'],
  life: ['life'],
  details: ['details', 'log'],
  scenario: ['tasks', 'meta', 'log'],
  storm: ['storm', 'local', 'cues'],
  house: ['house'],
  utilities: ['utilities'],
  hood: ['hood'],
  alerts: ['alerts'],
  devices: ['devices'],
  ui: ['meta'],
  render: [],
  audio: [],
  world: [],
});
