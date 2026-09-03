/**
 * world/build/roof.js — hip roofs at 4:12 with 0.6-m eaves (DESIGN §3.6; T §4): shingle slopes with slope-true
 * UVs, fascia rings, vented-soffit strips (clipped to outside the slab and the earlier roofs so nothing
 * z-fights a ceiling), hip/ridge caps, K-style gutters with downspouts, the covered-entry roof and its columns,
 * and the windward-slope InstancedMesh of shingle tabs (5 mm above the surface) that render converts to debris.
 * Owner: E4 world+textures. Writes no state.
 */
import * as THREE from 'three';
import { quad, boxAt, box, place, rgb, mulRgb, cyl, ensureAttrs } from './geo.js';
import { roofs, SLAB, DIM, PORCH } from '../plan.js';

const SIN_PITCH = (1 / 3) / Math.sqrt(1 + 1 / 9); // 4:12 → 0.316

/** Subtract rect B from rect A (both [x0,z0,x1,z1]) → up to 4 rects. */
function rectMinus(A, B) {
  const [ax0, az0, ax1, az1] = A, [bx0, bz0, bx1, bz1] = B;
  if (bx0 >= ax1 || bx1 <= ax0 || bz0 >= az1 || bz1 <= az0) return [A];
  const out = [];
  if (bz0 > az0) out.push([ax0, az0, ax1, bz0]);
  if (bz1 < az1) out.push([ax0, bz1, ax1, az1]);
  const mz0 = Math.max(az0, bz0), mz1 = Math.min(az1, bz1);
  if (bx0 > ax0) out.push([ax0, mz0, bx0, mz1]);
  if (bx1 < ax1) out.push([bx1, mz0, ax1, mz1]);
  return out.filter(r => r[2] - r[0] > 0.01 && r[3] - r[1] > 0.01);
}
function rectsMinus(list, B) { return list.flatMap(A => rectMinus(A, B)); }

/**
 * One hip roof in world space. Returns the slope descriptors for tabs/decals.
 * @param {{x0:number,x1:number,z0:number,z1:number,ridgeAxis:'x'|'z',eave:number,eaveY:number,pitch:number,id?:string}} r
 * @param {import('./geo.js').Collector} coll
 * @param {{shingleMat?:string, tint?:number[], clip?:number[][]}} opts clip: rects to subtract from soffit strips
 */
export function hipRoof(r, coll, opts = {}) {
  const { shingleMat = 'shingle', tint = [1, 1, 1], clip = [], fascia = true, soffit = true, caps = true, fasciaCuts = [] } = opts;
  const e = r.eave, ex0 = r.x0 - e, ex1 = r.x1 + e, ez0 = r.z0 - e, ez1 = r.z1 + e, eaveY = r.eaveY, pitch = r.pitch;
  const L = ex1 - ex0, D = ez1 - ez0;
  const slopes = [];
  const shingleTint = rgb(tint);
  const uvFor = (eaveDir) => (p) => [p[0] * eaveDir[0] + p[2] * eaveDir[2], (p[1] - eaveY) / SIN_PITCH];
  const face = (id, a, b, c, d, eaveDir, normalHint) => {
    const g = quad(a, b, c, d, { nx: Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 1.5)), ny: 4, color: shingleTint, uvFn: uvFor(eaveDir) });
    coll.add(shingleMat, g);
    slopes.push({ id, corners: [a, b, c, d], eaveDir, normal: normalHint, eaveY, roof: r.id });
  };
  let ridge;
  if (r.ridgeAxis === 'x') {
    const halfW = D / 2, ridgeY = eaveY + pitch * halfW, zc = (ez0 + ez1) / 2;
    const rx0 = Math.min(ex0 + halfW, (ex0 + ex1) / 2), rx1 = Math.max(ex1 - halfW, (ex0 + ex1) / 2);
    ridge = { a: [rx0, ridgeY, zc], b: [rx1, ridgeY, zc], y: ridgeY };
    face('N', [ex1, eaveY, ez0], [ex0, eaveY, ez0], [rx0, ridgeY, zc], [rx1, ridgeY, zc], [1, 0, 0], [0, halfW, -pitch * halfW]);
    face('S', [ex0, eaveY, ez1], [ex1, eaveY, ez1], [rx1, ridgeY, zc], [rx0, ridgeY, zc], [1, 0, 0], [0, halfW, pitch * halfW]);
    face('W', [ex0, eaveY, ez0], [ex0, eaveY, ez1], [rx0, ridgeY, zc], [rx0, ridgeY, zc], [0, 0, 1], [-pitch * halfW, halfW, 0]);
    face('E', [ex1, eaveY, ez1], [ex1, eaveY, ez0], [rx1, ridgeY, zc], [rx1, ridgeY, zc], [0, 0, 1], [pitch * halfW, halfW, 0]);
    if (caps) {
      hipCap(coll, [ex0, eaveY, ez0], [rx0, ridgeY, zc], shingleMat, shingleTint); hipCap(coll, [ex1, eaveY, ez0], [rx1, ridgeY, zc], shingleMat, shingleTint);
      hipCap(coll, [ex0, eaveY, ez1], [rx0, ridgeY, zc], shingleMat, shingleTint); hipCap(coll, [ex1, eaveY, ez1], [rx1, ridgeY, zc], shingleMat, shingleTint);
      if (rx1 - rx0 > 0.05) hipCap(coll, [rx0, ridgeY, zc], [rx1, ridgeY, zc], shingleMat, shingleTint, 0.3);
    }
  } else {
    const halfW = L / 2, ridgeY = eaveY + pitch * halfW, xc = (ex0 + ex1) / 2;
    const rz0 = Math.min(ez0 + halfW, (ez0 + ez1) / 2), rz1 = Math.max(ez1 - halfW, (ez0 + ez1) / 2);
    ridge = { a: [xc, ridgeY, rz0], b: [xc, ridgeY, rz1], y: ridgeY };
    face('W', [ex0, eaveY, ez0], [ex0, eaveY, ez1], [xc, ridgeY, rz1], [xc, ridgeY, rz0], [0, 0, 1], [-pitch * halfW, halfW, 0]);
    face('E', [ex1, eaveY, ez1], [ex1, eaveY, ez0], [xc, ridgeY, rz0], [xc, ridgeY, rz1], [0, 0, 1], [pitch * halfW, halfW, 0]);
    face('N', [ex1, eaveY, ez0], [ex0, eaveY, ez0], [xc, ridgeY, rz0], [xc, ridgeY, rz0], [1, 0, 0], [0, halfW, -pitch * halfW]);
    face('S', [ex0, eaveY, ez1], [ex1, eaveY, ez1], [xc, ridgeY, rz1], [xc, ridgeY, rz1], [1, 0, 0], [0, halfW, pitch * halfW]);
    if (caps) {
      hipCap(coll, [ex0, eaveY, ez0], [xc, ridgeY, rz0], shingleMat, shingleTint); hipCap(coll, [ex1, eaveY, ez0], [xc, ridgeY, rz0], shingleMat, shingleTint);
      hipCap(coll, [ex0, eaveY, ez1], [xc, ridgeY, rz1], shingleMat, shingleTint); hipCap(coll, [ex1, eaveY, ez1], [xc, ridgeY, rz1], shingleMat, shingleTint);
      if (rz1 - rz0 > 0.05) hipCap(coll, [xc, ridgeY, rz0], [xc, ridgeY, rz1], shingleMat, shingleTint, 0.3);
    }
  }
  // fascia: 0.2 tall × 0.03 boards hanging from the eave line, white aluminium (the soffit atlas's plain band)
  const white = rgb([0.95, 0.95, 0.93]);
  const fb = eaveY - 0.2, ft = eaveY + 0.01;
  if (fascia) {
    const runs = [[[ex0, ez0], [ex1, ez0], 'z'], [[ex0, ez1], [ex1, ez1], 'z'], [[ex0, ez0], [ex0, ez1], 'x'], [[ex1, ez0], [ex1, ez1], 'x']];
    for (const [p, q, axis] of runs) {
      let segs = axis === 'z' ? [[p[0], q[0]]] : [[p[1], q[1]]];
      for (const cut of fasciaCuts) if (cut.axis === axis && Math.abs(cut.at - (axis === 'z' ? p[1] : p[0])) < 0.05) segs = segs.flatMap(([a, b]) => (cut.to <= a || cut.from >= b) ? [[a, b]] : [[a, cut.from], [cut.to, b]].filter(s => s[1] - s[0] > 0.02));
      for (const [a, b] of segs) {
        if (axis === 'z') coll.add('soffit', fasciaBox(a, fb, p[1] - 0.015, b, ft, p[1] + 0.015, white));
        else coll.add('soffit', fasciaBox(p[0] - 0.015, fb, a, p[0] + 0.015, ft, b, white));
      }
    }
  }
  // soffit strips under the overhang at the fascia bottom, clipped
  if (soffit) {
    let strips = [[ex0, ez0, ex1, r.z0], [ex0, r.z1, ex1, ez1], [ex0, r.z0, r.x0, r.z1], [r.x1, r.z0, ex1, r.z1]];
    for (const c of clip) strips = rectsMinus(strips, c);
    for (const [x0, z0, x1, z1] of strips) {
      const along = (x1 - x0) >= (z1 - z0); // panels run perpendicular to the wall → u across the strip's short axis
      coll.add('soffit', soffitQuad(fb, x0, z0, x1, z1, along, white));
    }
  }
  return { slopes, ridge, eaveRect: [ex0, ez0, ex1, ez1] };
}

function fasciaBox(x0, y0, z0, x1, y1, z1, color) {
  const g = boxAt(x0, y0, z0, x1, y1, z1, { color });
  // keep the fascia's UVs in the plain band of the soffit atlas (v ∈ 0.02..0.2 of a 0.6-m cover)
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 0.02 + (uv.getY(i) % 0.1));
  return g;
}
function soffitQuad(y, x0, z0, x1, z1, along, color) {
  // facing down; UV: u across the strip depth (0.25..1 of the atlas = the vented band), v along the wall in metres
  const g = quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], { nx: 1, ny: 1, color, uvFn: (p) => {
    const across = along ? (p[2] - z0) / Math.max(0.01, z1 - z0) : (p[0] - x0) / Math.max(0.01, x1 - x0);
    const alongM = along ? p[0] : p[2];
    return [alongM, 0.6 * (0.27 + 0.7 * across)];
  } });
  return g;
}
/** A hip or ridge cap: a thin box laid along the line from a to b. */
function hipCap(coll, a, b, mat, tint, w = 0.26) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const h = Math.hypot(dx, dz), len = Math.hypot(dx, dy, dz);
  if (len < 0.05) return;
  const g = box(len, 0.03, w, { color: mulRgb(tint, 0.85) });
  place(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.012, (a[2] + b[2]) / 2, Math.atan2(-dz, dx), 0, Math.atan2(dy, h));
  coll.add(mat, g);
}

/** K-style gutter along an eave with a downspout at each end; returns nothing (adds to the collector). */
export function gutter(coll, x0, z0, x1, z1, eaveY, { downspouts = [], color = [0.95, 0.95, 0.93], grade = -0.30 } = {}) {
  const c = rgb(color);
  const y0 = eaveY - 0.2, y1 = eaveY - 0.1;
  const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const g = along ? boxAt(Math.min(x0, x1), y0, z0 - 0.06, Math.max(x0, x1), y1, z0 + 0.06, { color: c }) : boxAt(x0 - 0.06, y0, Math.min(z0, z1), x0 + 0.06, y1, Math.max(z0, z1), { color: c });
  fixPlainUv(g); coll.add('soffit', g);
  for (const [dx, dz, inX, inZ] of downspouts) {
    const p = cyl(0.045, 0.045, y0 - grade - 0.1, 8, { color: c });
    place(p, dx + inX * 0.08, (y0 + grade) / 2, dz + inZ * 0.08);
    fixPlainUv(p); coll.add('soffit', p);
    const elbow = cyl(0.045, 0.045, 0.3, 8, { color: c });
    place(elbow, dx + inX * 0.04, y0 - 0.02, dz + inZ * 0.04, 0, inX ? 0 : Math.PI / 2, inX ? Math.PI / 2 : 0);
    fixPlainUv(elbow); coll.add('soffit', elbow);
  }
}
function fixPlainUv(g) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 0.02 + (Math.abs(uv.getY(i)) % 0.1)); }

/**
 * The main house roofs (A, B, C, the porch) plus gutters, columns and the shingle-tab InstancedMesh.
 * @returns {{slopes:object[], tabs:THREE.InstancedMesh, ridgeY:Object<string,number>}}
 */
export function buildHouseRoof({ exteriorCollector: coll, mats, rng }) {
  const slopes = [];
  const ridgeY = {};
  const done = [];
  const A = roofs.find(r => r.id === 'A');
  for (const r of roofs) {
    const clip = [[SLAB.x0, SLAB.z0, SLAB.x1, SLAB.z1], ...done];
    const fasciaCuts = r.id === 'A' ? [{ axis: 'x', at: r.x1 + r.eave, from: PORCH.roof.z0, to: PORCH.roof.z1 }] : [];
    const res = hipRoof(r, coll, { clip, fasciaCuts, soffit: !r.porch || true });
    if (!r.porch) slopes.push(...res.slopes);
    ridgeY[r.id] = res.ridge.y;
    done.push(res.eaveRect);
  }
  // gutters (DESIGN §3.6: on the E and W eaves) and their downspouts
  const eaveY = A.eaveY;
  gutter(coll, 14.6, -0.6, 14.6, PORCH.roof.z0, eaveY, { downspouts: [[14.6, -0.55, -1, 0]] });
  gutter(coll, 14.6, PORCH.roof.z1, 14.6, 20.4, eaveY, { downspouts: [[14.6, 20.35, -1, 0]] });
  gutter(coll, -3.6, 6.1, -3.6, 20.4, eaveY, { downspouts: [[-3.6, 6.15, 1, 0], [-3.6, 20.35, 1, 0]], grade: -0.15 });
  gutter(coll, -0.6, -0.6, -0.6, 6.1, eaveY, { downspouts: [[-0.6, -0.55, 1, 0]] });
  // the covered entry: two stuccoed columns and a beam under the porch roof
  const stucco = rgb([0.94, 0.92, 0.88]);
  for (const z of [PORCH.z0 + 0.15, PORCH.z1 - 0.15]) coll.add('stucco', boxAt(PORCH.x1 - 0.05, PORCH.y, z - 0.14, PORCH.x1 + 0.23, eaveY - 0.2, z + 0.14, { color: stucco }));
  coll.add('stucco', boxAt(PORCH.x1 - 0.1, eaveY - 0.45, PORCH.roof.z0 + 0.3, PORCH.x1 + 0.25, eaveY - 0.2, PORCH.roof.z1 - 0.3, { color: stucco }));
  // the lanai's outer beam and posts under roof A's west overhang
  for (const z of [6.6, 12.0, 17.4]) coll.add('stucco', boxAt(-3.15, -0.15, z - 0.12, -2.85, eaveY - 0.2, z + 0.12, { color: stucco }));
  coll.add('stucco', boxAt(-3.2, eaveY - 0.5, 6.4, -2.8, eaveY - 0.2, 17.6, { color: stucco }));
  // ridge vents: a slightly raised strip along A's ridge
  const ridgeVent = boxAt(-3.6 + 7.15 + 0.2, ridgeY.A + 0.02, 13.25 - 0.18, 14.6 - 7.15 - 0.2, ridgeY.A + 0.05, 13.25 + 0.18, { color: rgb([0.25, 0.25, 0.25]) });
  coll.add('soffit', ridgeVent);
  fixPlainUv(ridgeVent);
  // shingle tabs on every slope of A/B/C (5 mm proud), instanced; render lifts them as debris
  const tabs = buildTabs(slopes, mats, rng);
  return { slopes, tabs, ridgeY };
}

function buildTabs(slopes, mats, rng) {
  const stream = rng?.fork ? rng.fork('world:tabs') : { nextFloat: () => 0.5 };
  const per = 44;
  const total = slopes.length * per;
  const g = new THREE.PlaneGeometry(0.3, 0.42);
  g.rotateX(-Math.PI / 2);
  ensureAttrs(g, { color: [0.86, 0.86, 0.86] });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.3, uv.getY(i) * 0.14);
  const mat = mats.variant('shingle', 'tabs', { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const mesh = new THREE.InstancedMesh(g, mat, total);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), basis = new THREE.Matrix4();
  const x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const slopeOf = [];
  let k = 0;
  for (const sl of slopes) {
    const [a, b, c, d] = sl.corners;
    y.set(sl.normal[0], sl.normal[1], sl.normal[2]).normalize();
    x.set(sl.eaveDir[0], sl.eaveDir[1], sl.eaveDir[2]).normalize();
    z.crossVectors(x, y).normalize();
    basis.makeBasis(x, y, z); q.setFromRotationMatrix(basis);
    const tri = Math.hypot(c[0] - d[0], c[2] - d[2]) < 0.05;
    for (let i = 0; i < per; i++) {
      const tv = 0.08 + 0.84 * stream.nextFloat();
      let tu = 0.06 + 0.88 * stream.nextFloat();
      if (tri) tu = 0.5 + (tu - 0.5) * (1 - tv);
      const px = (a[0] + tu * (b[0] - a[0])) * (1 - tv) + (d[0] + tu * (c[0] - d[0])) * tv;
      const py = (a[1] + tu * (b[1] - a[1])) * (1 - tv) + (d[1] + tu * (c[1] - d[1])) * tv;
      const pz = (a[2] + tu * (b[2] - a[2])) * (1 - tv) + (d[2] + tu * (c[2] - d[2])) * tv;
      p.set(px, py, pz).addScaledVector(y, 0.006);
      m.compose(p, q, s);
      mesh.setMatrixAt(k, m);
      slopeOf.push(`${sl.roof}${sl.id}`);
      k++;
    }
  }
  mesh.count = k;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData = { slopes: slopeOf, kind: 'roofTabs' };
  mesh.name = 'roofTabs';
  mesh.castShadow = false; mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}
