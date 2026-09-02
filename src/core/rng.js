/**
 * core/rng.js — deterministic randomness (ARCHITECTURE §11).
 * Owner: E1 core. Streams are forked by name from the scenario seed; hash01 is stateless for bucket rolls.
 * Math.random is banned everywhere in src/ (scripts/lint-random.mjs).
 */

/** FNV-1a 32-bit over a string. */
export function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — a small fast 32-bit generator; returns a function giving uint32. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
  };
}

/** Standard-normal from two uniforms (Box–Muller; the second value is discarded for simplicity). */
function boxMuller(u1, u2) {
  const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12)));
  return r * Math.cos(2 * Math.PI * u2);
}

/**
 * A named stream.
 * @returns {{name:string, next():number, nextFloat():number, range(a:number,b:number):number, int(n:number):number,
 *            normal(mu?:number, sigma?:number):number, pick<T>(arr:T[]):T, chance(p:number):boolean, state():number, restore(s:number):void}}
 */
export function createStream(seed, name) {
  const key = fnv1a32(`${seed >>> 0}:${name}`);
  let gen = mulberry32(key);
  let calls = 0;
  const nextU32 = () => { calls++; return gen(); };
  const stream = {
    name,
    next: nextU32,
    nextFloat: () => nextU32() / 4294967296,
    range: (a, b) => a + (b - a) * (nextU32() / 4294967296),
    int: (n) => nextU32() % n,
    normal: (mu = 0, sigma = 1) => mu + sigma * boxMuller(nextU32() / 4294967296, nextU32() / 4294967296),
    pick: (arr) => arr[nextU32() % arr.length],
    chance: (p) => nextU32() / 4294967296 < p,
    /** Number of draws so far (for snapshot/restore). */
    state: () => calls,
    restore: (n) => { gen = mulberry32(key); calls = 0; for (let i = 0; i < n; i++) nextU32(); },
  };
  return stream;
}

/**
 * The master generator (ARCHITECTURE §6.1): `fork(name)` once per module in init; `hash01(...keys)` anywhere.
 * @param {number} seed uint32
 */
export function createRng(seed) {
  seed = seed >>> 0;
  const streams = new Map();
  const rng = {
    seed,
    fork(name) {
      if (!streams.has(name)) streams.set(name, createStream(seed, name));
      return streams.get(name);
    },
    /** Stateless uniform in [0,1) from the seed and any keys — identical at any speed. */
    hash01(...keys) {
      return hash01(seed, ...keys);
    },
    /** Stateless standard normal from keys. */
    hashNormal(...keys) {
      return boxMuller(hash01(seed, ...keys, 'n1'), hash01(seed, ...keys, 'n2'));
    },
    streams: () => Array.from(streams.keys()),
    snapshot: () => Object.fromEntries(Array.from(streams, ([k, s]) => [k, s.state()])),
    restore: (snap) => { for (const [k, n] of Object.entries(snap || {})) rng.fork(k).restore(n); },
  };
  return rng;
}

/** Stateless uniform from a seed and keys (FNV-1a over the joined string). */
export function hash01(seed, ...keys) {
  const h = fnv1a32(`${seed >>> 0}|${keys.join('|')}`);
  // second mix so consecutive keys decorrelate
  const m = mulberry32(h)();
  return m / 4294967296;
}

/** Inverse-CDF Poisson count from one uniform (deterministic bucket sampling). */
export function poissonFromU(lambda, u) {
  if (lambda <= 0) return 0;
  if (lambda > 60) { // normal approximation for large rates
    const z = boxMuller(Math.max(u, 1e-9), 0.5 + (u * 0.37) % 0.5);
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
  }
  let k = 0, p = Math.exp(-lambda), cdf = p;
  while (u > cdf && k < 1000) { k++; p *= lambda / k; cdf += p; }
  return k;
}

/** Normal quantile from a uniform (Acklam's approximation), for thresholds drawn from hash01. */
export function normalFromU(u, mu = 0, sigma = 1) {
  u = Math.min(Math.max(u, 1e-9), 1 - 1e-9);
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  let q, r, x;
  if (u < 0.02425) { q = Math.sqrt(-2 * Math.log(u)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (u > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - u)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else { q = u - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  return mu + sigma * x;
}
