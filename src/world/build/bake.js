/**
 * world/build/bake.js — the vertex-colour "lightmap": fixture falloff (aBounce, scaled by uPowerOn in the
 * shader) and wall-junction ambient occlusion (ARCHITECTURE §9 "Vertex-colour bake at build"; T §7 items 6, 8).
 * Owner: E4 world+textures. Writes no state.
 */

/** Smoothstep 0..1. */
const ss = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

/**
 * A baker for one room: `bounce(p, n)` sums the room's fixtures with a Lambert cosine and a 1/(1+(d/r)²)
 * falloff; `ao(dFloor, dCeil, dCorner)` darkens concave junctions.
 * @param {{pos:number[], intensity:number, kind?:string, lamp?:boolean}[]} fixtures
 */
export function createBaker(fixtures, { radius = 2.4, gain = 1.15, ambient = 0.0 } = {}) {
  const fx = fixtures.map(f => ({ p: f.pos, i: (f.intensity ?? 1) * (f.lamp ? 0.55 : 1) * (f.kind === 'rect' ? 0 : 1) }));
  return {
    bounce(p, n) {
      let s = ambient;
      for (const f of fx) {
        const dx = f.p[0] - p[0], dy = f.p[1] - p[1], dz = f.p[2] - p[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const cos = (dx * n[0] + dy * n[1] + dz * n[2]) / d;
        if (cos <= 0) continue;
        s += f.i * gain * Math.pow(cos, 0.8) / (1 + (d / radius) * (d / radius));
      }
      return Math.min(1, s);
    },
    /** AO factor from distances to the floor, the ceiling and the nearest vertical corner (metres). */
    ao(dFloor, dCeil, dCorner) {
      let k = 1;
      k *= 0.72 + 0.28 * ss(0, 0.32, dFloor);
      k *= 0.78 + 0.22 * ss(0, 0.32, dCeil);
      k *= 0.74 + 0.26 * ss(0, 0.36, dCorner);
      return k;
    },
  };
}

/** Distance from (x,z) to the nearest vertical edge of a polygon (a corner post), for floor/ceiling AO. */
export function distToCorners(x, z, poly) {
  let best = Infinity;
  for (const [px, pz] of poly) { const d = Math.hypot(px - x, pz - z); if (d < best) best = d; }
  return best;
}
/** Distance from (x,z) to the polygon's edges (walls), for floor/ceiling AO near walls. */
export function distToEdges(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], az = poly[j][1], bx = poly[i][0], bz = poly[i][1];
    const dx = bx - ax, dz = bz - az;
    const len2 = dx * dx + dz * dz || 1e-9;
    let t = ((x - ax) * dx + (z - az) * dz) / len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(ax + t * dx - x, az + t * dz - z);
    if (d < best) best = d;
  }
  return best;
}
