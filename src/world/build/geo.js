/**
 * world/build/geo.js — geometry helpers shared by every builder: subdivided quads with per-vertex bake
 * callbacks, metre-UV boxes, placement, vertex attributes, safe merging (ARCHITECTURE §9 "merged per material").
 * Owner: E4 world+textures. Writes no state.
 *
 * Conventions: UVs are in metres (textures carry `repeat = 1/cover`); every merged geometry carries a `color`
 * attribute (linear RGB — hex/sRGB inputs are converted), and optionally `aBounce` / `aFlex`.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/** sRGB hex / [r,g,b] (0..1 sRGB) → linear [r,g,b]. */
export function rgb(c) {
  if (Array.isArray(c)) { if (c.length === 3 && c.__linear) return c; _c.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); }
  else _c.set(c);
  return [_c.r, _c.g, _c.b];
}
/** Mark an rgb triple as already linear (skips conversion). */
export function lin(r, g, b) { const a = [r, g, b]; a.__linear = true; return a; }
export const mulRgb = (c, s) => lin(c[0] * s, c[1] * s, c[2] * s);

/** Fill (or replace) a constant attribute. */
export function withAttr(geom, name, value, itemSize = 1) {
  const n = geom.attributes.position.count;
  const arr = new Float32Array(n * itemSize);
  if (itemSize === 1) arr.fill(value);
  else for (let i = 0; i < n; i++) for (let k = 0; k < itemSize; k++) arr[i * itemSize + k] = value[k];
  geom.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
  return geom;
}
export function tint(geom, c) { return withAttr(geom, 'color', rgb(c), 3); }
/** Add the attributes every world material may read, with defaults, without overwriting existing ones. */
export function ensureAttrs(geom, { color = [1, 1, 1], bounce = 0, flex = null } = {}) {
  if (!geom.attributes.color) withAttr(geom, 'color', rgb(color), 3);
  if (!geom.attributes.aBounce) withAttr(geom, 'aBounce', bounce, 1);
  if (flex != null && !geom.attributes.aFlex) withAttr(geom, 'aFlex', flex, 1);
  if (!geom.attributes.uv) withAttr(geom, 'uv', [0, 0], 2);
  if (!geom.attributes.normal) geom.computeVertexNormals();
  return geom;
}

/** Place a geometry: translate (x,y,z), rotate YXZ (ry, rx, rz), uniform or per-axis scale. Mutates and returns it. */
export function place(geom, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _v.set(x, y, z);
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.set(s, s, s);
  _m.compose(_v, _q, _s);
  geom.applyMatrix4(_m);
  return geom;
}

/**
 * A subdivided quad. Corners a→b run along u (the "bottom" edge), a→d along v; the front face normal is
 * (b−a)×(d−a). `vertexFn(p, n, u, v, out)` may set out.color / out.bounce / out.flex per vertex (u,v in metres).
 */
export function quad(a, b, c, d, opts = {}) {
  const { nx = 1, ny = 1, uvScale = 1, uvOffset = [0, 0], color = [1, 1, 1], bounce = 0, flex = null, vertexFn = null, uvSwap = false, uvFn = null } = opts;
  const pos = [], nor = [], uv = [], col = [], bou = [], fle = [];
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ad = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
  const dc = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
  const lenU = Math.hypot(...ab), lenV = Math.hypot(...ad);
  // normal from the winding
  const n = [ab[1] * ad[2] - ab[2] * ad[1], ab[2] * ad[0] - ab[0] * ad[2], ab[0] * ad[1] - ab[1] * ad[0]];
  const nl = Math.hypot(...n) || 1; n[0] /= nl; n[1] /= nl; n[2] /= nl;
  const base = rgb(color);
  const out = { color: base, bounce, flex };
  for (let j = 0; j <= ny; j++) {
    const tv = j / ny;
    for (let i = 0; i <= nx; i++) {
      const tu = i / nx;
      // bilinear: a + tu*(b-a) blended with d + tu*(c-d)
      const px = (a[0] + tu * ab[0]) * (1 - tv) + (d[0] + tu * dc[0]) * tv;
      const py = (a[1] + tu * ab[1]) * (1 - tv) + (d[1] + tu * dc[1]) * tv;
      const pz = (a[2] + tu * ab[2]) * (1 - tv) + (d[2] + tu * dc[2]) * tv;
      pos.push(px, py, pz); nor.push(n[0], n[1], n[2]);
      const u = tu * lenU, v = tv * lenV;
      if (uvFn) { const r = uvFn([px, py, pz], tu, tv); uv.push(r[0], r[1]); }
      else if (uvSwap) uv.push((v + uvOffset[1]) * uvScale, (u + uvOffset[0]) * uvScale); else uv.push((u + uvOffset[0]) * uvScale, (v + uvOffset[1]) * uvScale);
      if (vertexFn) { out.color = base; out.bounce = bounce; out.flex = flex; vertexFn([px, py, pz], n, u, v, out, tu, tv); }
      const cc = out.color; col.push(cc[0], cc[1], cc[2]);
      bou.push(out.bounce);
      if (flex != null || out.flex != null) fle.push(out.flex ?? 0);
    }
  }
  const idx = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const p0 = j * (nx + 1) + i, p1 = p0 + 1, p2 = p0 + nx + 1, p3 = p2 + 1;
    idx.push(p0, p1, p3, p0, p3, p2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aBounce', new THREE.Float32BufferAttribute(bou, 1));
  if (fle.length) g.setAttribute('aFlex', new THREE.Float32BufferAttribute(fle, 1));
  g.setIndex(idx);
  return g;
}
/** Axis-aligned quad helpers: a rectangle in a plane at `at`, facing +/− the plane's normal. */
export function quadX(at, z0, y0, z1, y1, facing = 1, opts = {}) { // plane x = at; u along z, v along y; facing +1 → normal +x
  return facing > 0 ? quad([at, y0, z1], [at, y0, z0], [at, y1, z0], [at, y1, z1], opts) : quad([at, y0, z0], [at, y0, z1], [at, y1, z1], [at, y1, z0], opts);
}
export function quadZ(at, x0, y0, x1, y1, facing = 1, opts = {}) { // plane z = at; u along x; facing +1 → normal +z
  return facing > 0 ? quad([x0, y0, at], [x1, y0, at], [x1, y1, at], [x0, y1, at], opts) : quad([x1, y0, at], [x0, y0, at], [x0, y1, at], [x1, y1, at], opts);
}
export function quadY(at, x0, z0, x1, z1, facing = 1, opts = {}) { // plane y = at; u along x, v along z
  return facing > 0 ? quad([x0, at, z1], [x1, at, z1], [x1, at, z0], [x0, at, z0], opts) : quad([x0, at, z0], [x1, at, z0], [x1, at, z1], [x0, at, z1], opts);
}

/** A box with UVs in metres (BoxGeometry's are 0..1 per face). Centred at the origin. */
export function box(w, h, d, opts = {}) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const uv = g.attributes.uv;
  // BoxGeometry face order: +x, −x, +y, −y, +z, −z; 4 verts each → scale by the face's extents
  const ext = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * ext[f][0], uv.getY(i) * ext[f][1]); }
  return ensureAttrs(g, opts);
}
/** A box between two world corners (min, max). */
export function boxAt(x0, y0, z0, x1, y1, z1, opts = {}) {
  const g = box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), opts);
  return place(g, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
export function rounded(w, h, d, r = 0.03, seg = 3, opts = {}) { return ensureAttrs(new RoundedBoxGeometry(w, h, d, seg, r), opts); }
export function cyl(rTop, rBot, h, seg = 12, opts = {}, open = false) { return ensureAttrs(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open), opts); }
export function sphere(r, seg = 12, opts = {}) { return ensureAttrs(new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)), opts); }
export function torus(r, t, seg = 10, tub = 16, opts = {}) { return ensureAttrs(new THREE.TorusGeometry(r, t, seg, tub), opts); }
export function plane(w, h, nx = 1, ny = 1, opts = {}) {
  const g = new THREE.PlaneGeometry(w, h, nx, ny);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  return ensureAttrs(g, opts);
}
export function cone(r, h, seg = 12, opts = {}) { return ensureAttrs(new THREE.ConeGeometry(r, h, seg), opts); }
export function lathe(points, seg = 16, opts = {}) { return ensureAttrs(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), seg), opts); }
export function extrude(shape, depth, opts = {}) { return ensureAttrs(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 }), opts); }

/** Merge geometries safely: normalises index/non-index and attribute sets; disposes the inputs. */
export function merge(list) {
  const geoms = list.filter(Boolean);
  if (!geoms.length) return null;
  const names = new Set();
  for (const g of geoms) for (const k of Object.keys(g.attributes)) names.add(k);
  const wantFlex = names.has('aFlex');
  const norm = geoms.map(g => {
    let gg = g;
    if (!gg.attributes.color) withAttr(gg, 'color', [1, 1, 1], 3);
    if (!gg.attributes.aBounce) withAttr(gg, 'aBounce', 0, 1);
    if (wantFlex && !gg.attributes.aFlex) withAttr(gg, 'aFlex', 0, 1);
    if (!gg.attributes.uv) withAttr(gg, 'uv', [0, 0], 2);
    if (!gg.attributes.normal) gg.computeVertexNormals();
    for (const k of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv', 'color', 'aBounce', 'aFlex'].includes(k)) gg.deleteAttribute(k);
    if (gg.index === null) { const ix = []; for (let i = 0; i < gg.attributes.position.count; i++) ix.push(i); gg.setIndex(ix); }
    return gg;
  });
  const out = mergeGeometries(norm, false);
  for (const g of norm) g.dispose();
  if (out) { out.computeBoundingSphere(); out.computeBoundingBox(); }
  return out;
}

/** A static mesh from a merged geometry. */
export function staticMesh(geom, material, { name = '', castShadow = false, receiveShadow = true, renderOrder = 0, frustumCulled = true } = {}) {
  if (!geom) return null;
  const m = new THREE.Mesh(geom, material);
  m.name = name; m.castShadow = castShadow; m.receiveShadow = receiveShadow; m.renderOrder = renderOrder;
  m.matrixAutoUpdate = false; m.updateMatrix(); m.frustumCulled = frustumCulled;
  if (!geom.boundingSphere) geom.computeBoundingSphere();
  return m;
}

/** A material-keyed collector: `add(material, geom)` … `build(name)` → Mesh per material. */
export class Collector {
  constructor() { this.map = new Map(); this.count = 0; }
  add(matName, geom) { if (!geom) return; if (!this.map.has(matName)) this.map.set(matName, []); this.map.get(matName).push(geom); this.count++; }
  addMany(matName, geoms) { for (const g of geoms) this.add(matName, g); }
  /** @param {(name:string)=>THREE.Material} getMat */
  build(getMat, prefix = '', opts = {}) {
    const meshes = [];
    for (const [matName, geoms] of this.map) {
      const g = merge(geoms);
      if (!g) continue;
      const m = staticMesh(g, getMat(matName), { name: `${prefix}:${matName}`, ...(opts[matName] || opts.all || {}) });
      meshes.push(m);
    }
    this.map.clear();
    return meshes;
  }
}

/** Box3 from world corners. */
export function box3(x0, y0, z0, x1, y1, z1) { return new THREE.Box3(new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1))); }
/** Box3 for a footprint (w × d) placed at (x, y, z) with a yaw. */
export function box3At(x, y, z, w, h, d, ry = 0) {
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
  const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
  return box3(x - hw, y, z - hd, x + hw, y + h, z + hd);
}
export { THREE };
