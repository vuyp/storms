/**
 * core/save.js — snapshot / restore of the sim slices (chapters, harness). Owner: E1 core.
 * restore() copies in place so module-held references to sub-objects stay valid.
 */
const SAVED = ['meta', 'clock', 'storm', 'local', 'cues', 'house', 'utilities', 'hood', 'alerts', 'devices', 'player', 'objects', 'life', 'tasks', 'details', 'log'];

function plain(v) {
  if (ArrayBuffer.isView(v)) return { __typed: v.constructor.name, data: Array.from(v) };
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = plain(v[k]); return o; }
  return v;
}
function revive(target, src) {
  if (src && typeof src === 'object' && src.__typed) {
    const C = globalThis[src.__typed] || Float32Array; return C.from(src.data);
  }
  if (Array.isArray(src)) {
    if (Array.isArray(target)) { target.length = src.length; for (let i = 0; i < src.length; i++) target[i] = revive(target[i], src[i]); return target; }
    return src.map(s => revive(undefined, s));
  }
  if (src && typeof src === 'object') {
    const t = (target && typeof target === 'object' && !Array.isArray(target)) ? target : {};
    for (const k of Object.keys(t)) if (!(k in src)) delete t[k];
    for (const k of Object.keys(src)) t[k] = revive(t[k], src[k]);
    return t;
  }
  return src;
}

export function snapshot(state, rng) {
  const out = {};
  for (const k of SAVED) out[k] = plain(state[k]);
  out.__rng = rng ? rng.snapshot() : null;
  return JSON.stringify(out);
}
export function restore(state, json, rng) {
  const src = typeof json === 'string' ? JSON.parse(json) : json;
  for (const k of SAVED) if (k in src) state[k] = revive(state[k], src[k]);
  if (rng && src.__rng) rng.restore(src.__rng);
  return state;
}
