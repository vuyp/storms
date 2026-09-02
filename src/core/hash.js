/**
 * core/hash.js — the state hash (ARCHITECTURE §6.1, §11).
 * Owner: E1 core. FNV-1a over canonical JSON of the sim-time slices only.
 */
import { fnv1a32 } from './rng.js';

const REALTIME_LOCAL = new Set(['uInst', 'uG3', 'dirInstDeg', 'mesovortex', 'lightning']);

function canon(v, depth = 0) {
  if (v === null || v === undefined) return 'null';
  const t = typeof v;
  if (t === 'number') return Number.isFinite(v) ? Number(v.toPrecision(10)).toString() : `"${String(v)}"`;
  if (t === 'boolean') return v ? 'true' : 'false';
  if (t === 'string') return JSON.stringify(v);
  if (Array.isArray(v) || ArrayBuffer.isView(v)) {
    const out = [];
    for (let i = 0; i < v.length; i++) out.push(canon(v[i], depth + 1));
    return `[${out.join(',')}]`;
  }
  if (t === 'object') {
    const keys = Object.keys(v).sort();
    const out = [];
    for (const k of keys) { if (k === 'fired') continue; out.push(`${JSON.stringify(k)}:${canon(v[k], depth + 1)}`); }
    return `{${out.join(',')}}`;
  }
  return 'null';
}

/** Canonical JSON of the hashed subset of the state. */
export function hashedSubset(state) {
  const local = {};
  for (const k of Object.keys(state.local)) if (!REALTIME_LOCAL.has(k)) local[k] = state.local[k];
  return {
    storm: state.storm,
    local,
    house: state.house,
    utilities: state.utilities,
    hood: state.hood,
    alertsIssued: state.alerts.issued,
    detailsFiredHashed: state.details.firedHashed,
  };
}

export function stateHash(state) {
  return fnv1a32(canon(hashedSubset(state))).toString(16).padStart(8, '0');
}

export function canonicalJson(v) { return canon(v); }
