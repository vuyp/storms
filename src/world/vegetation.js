/**
 * world/vegetation.js — palms (sabal fan fronds, queen/foxtail/royal feather fronds), the live oak, the ficus
 * hedge wall and the clusia foundation hedge (DESIGN §3.7, §4.2; T §10.4). One InstancedMesh per kind with a
 * bark + foliage material group; every card carries `aFlex` (0 trunk … 1 tip) for the shared wind bend; every
 * named tree of core/ids TREES drives its instance through a self-syncing InstanceProxy Group so render can
 * pose it (fallen, limbs lost, folded). Owner: E4 world+textures. Writes no state.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cyl, rgb, merge, withAttr, ensureAttrs } from './build/geo.js';
import { trees, fillerTrees, siteHeightAt } from './plan.js';
import { InstanceProxy, applyPose } from './build/props.js';

const PI = Math.PI, GOLD = PI * (3 - Math.sqrt(5));
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const jit = (S, a) => (S.nextFloat() - 0.5) * 2 * a;

/** A frond card built along local +y from the origin (normal +z): `cols` columns across, `nSeg` along. */
function frondCard(w, L, nSeg, { fold = 0, droop = 0, flex0 = 0.25, flex1 = 1, uAlong = false, taper = 0, cols = 3 } = {}) {
  const pos = [], uv = [], flex = [], idx = [];
  for (let j = 0; j <= nSeg; j++) {
    const t = j / nSeg;
    const y = t * L, zc = -droop * t * t, ww = w * (1 - taper * t);
    for (let i = 0; i < cols; i++) {
      const s = i / (cols - 1) - 0.5;
      pos.push(s * ww, y, zc + fold * Math.abs(s) * 2 * (0.3 + 0.7 * (1 - t)));
      if (uAlong) uv.push(t, s + 0.5); else uv.push(s + 0.5, t);
      flex.push(flex0 + (flex1 - flex0) * t * t);
    }
  }
  for (let j = 0; j < nSeg; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aFlex', new THREE.Float32BufferAttribute(flex, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return ensureAttrs(g, { color: [1, 1, 1] });
}

/** Orient a card built along +y (normal +z) to point along (azimuth, elevation) from `at`, rolled about its axis. */
function orient(g, at, az, el, roll = 0) {
  const d = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const n = new THREE.Vector3(-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az));
  if (roll) { _q.setFromAxisAngle(d, roll); n.applyQuaternion(_q); }
  const x = new THREE.Vector3().crossVectors(d, n).normalize();
  _m.makeBasis(x, d, n); _m.setPosition(at[0], at[1], at[2]);
  g.applyMatrix4(_m);
  return g;
}
/** Rotate a +y-built geometry so +y points along (az, el), placed at `at`. */
function orientAxis(g, at, az, el) {
  const d = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  _q.setFromUnitVectors(_up, d);
  _m.makeRotationFromQuaternion(_q); _m.setPosition(at[0], at[1], at[2]);
  g.applyMatrix4(_m);
  return g;
}
/** A trunk from y0 up, bark UVs in metres. */
function trunk(rTop, rBot, h, seg, color, y0 = 0) {
  const g = cyl(rTop, rBot, h, seg, { color: rgb(color) });
  g.translate(0, y0 + h / 2, 0);
  const uv = g.attributes.uv, circ = 2 * PI * (rTop + rBot) / 2;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
  return withAttr(g, 'aFlex', 0, 1);
}
function leafCard(size, flex) {
  const g = new THREE.PlaneGeometry(size, size);
  ensureAttrs(g, { color: [1, 1, 1] });
  return withAttr(g, 'aFlex', flex, 1);
}

// ---- the kinds (built once at the origin, +y up, scale 1) ------------------------------------------------------
function palmSabal(S) {
  const t = trunk(0.24, 0.32, 5.4, 9, [0.75, 0.7, 0.62]);
  const boots = cyl(0.36, 0.3, 1.6, 9, { color: rgb([0.62, 0.56, 0.46]) }); boots.translate(0, 4.7, 0);
  const uv = boots.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.1, uv.getY(i) * 1.6);
  withAttr(boots, 'aFlex', 0, 1);
  const fronds = [];
  const cy = 5.5, n = 26;
  for (let k = 0; k < n; k++) {
    const az = k * GOLD + jit(S, 0.2);
    const el = -0.6 + 1.9 * ((k % 5) / 4) + jit(S, 0.18);
    const g = frondCard(1.25 + jit(S, 0.15), 1.7 + jit(S, 0.2), 4, { fold: 0.16, droop: el > 0.6 ? 0.1 : 0.35, flex0: 0.3, flex1: 0.95, taper: 0.1 });
    fronds.push(orient(g, [0, cy + Math.sin(el) * 0.1, 0], az, el, jit(S, 0.5)));
  }
  return { parts: [['barkSabal', merge([t, boots])], ['frondSabal', merge(fronds)]], height: 7.2, crownY: cy, radius: 1.9 };
}
function palmFeather(S, { h, r0, r1, n, L, w, droop, plumose, mat, shaft = 0, shaftColor = [0.5, 0.62, 0.42], bark = [0.78, 0.76, 0.7] }) {
  const parts = [['barkRing', trunk(r0, r1, h, 10, bark)]];
  let cy = h;
  if (shaft) { const sg = cyl(r0 * 0.95, r0 * 1.08, shaft, 10, { color: rgb(shaftColor) }); sg.translate(0, h + shaft / 2 - 0.05, 0); withAttr(sg, 'aFlex', 0, 1); parts.push(['matte', sg]); cy = h + shaft - 0.1; }
  const fronds = [];
  for (let k = 0; k < n; k++) {
    const az = k * GOLD + jit(S, 0.25);
    const el = 0.25 + 0.9 * ((k % 4) / 3) + jit(S, 0.15);
    const g = frondCard(w + jit(S, w * 0.1), L + jit(S, L * 0.12), 7, { fold: plumose ? 0 : 0.07, droop: droop * (0.8 + 0.4 * S.nextFloat()), flex0: 0.3, flex1: 1, uAlong: true, taper: 0.25 });
    fronds.push(orient(g, [0, cy, 0], az, el, jit(S, 0.3)));
  }
  for (let k = 0; k < 3; k++) { const g = frondCard(w * 0.8, L * 0.8, 4, { droop: 0.1, flex0: 0.2, flex1: 0.6, uAlong: true, taper: 0.3 }); fronds.push(orient(g, [0, cy - 0.1, 0], k * 2.1 + jit(S, 0.4), -1.25 + jit(S, 0.1), 0)); }
  parts.push([mat, merge(fronds)]);
  return { parts, height: cy + L * 0.6, crownY: cy, radius: L * 0.8 };
}
function oak(S) {
  const bark = [0.5, 0.45, 0.4];
  const geoms = [trunk(0.3, 0.45, 2.8, 10, bark)];
  const limbs = 6;
  for (let k = 0; k < limbs; k++) {
    const az = k * (2 * PI / limbs) + jit(S, 0.3), el = 0.55 + jit(S, 0.25), L = 4.5 + jit(S, 0.8);
    const g = cyl(0.06, 0.15, L, 7, { color: rgb(bark) }); g.translate(0, L / 2, 0); withAttr(g, 'aFlex', 0, 1);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.7, uv.getY(i) * L);
    geoms.push(orientAxis(g, [0, 2.6, 0], az, el));
  }
  const cards = [];
  for (let k = 0; k < 46; k++) {
    const u = S.nextFloat(), v = S.nextFloat(), w = S.nextFloat();
    const th = u * 2 * PI, ph = Math.acos(2 * v - 1), r = Math.cbrt(w);
    const x = 5.6 * r * Math.sin(ph) * Math.cos(th), y = 6.3 + 2.9 * r * Math.cos(ph), z = 5.6 * r * Math.sin(ph) * Math.sin(th);
    const size = 2.7 + jit(S, 0.6);
    for (let c = 0; c < 2; c++) {
      const g = leafCard(size, 0.3 + 0.25 * r);
      g.rotateX(jit(S, 0.5)); g.rotateY(th + c * PI / 2 + jit(S, 0.3)); g.translate(x, y, z);
      cards.push(g);
    }
  }
  return { parts: [['barkOak', merge(geoms)], ['leafOak', merge(cards)]], height: 9.5, crownY: 6.3, radius: 5.8 };
}
/** A hedge wall of leaf cards along local x (two faces + a top), length × height × depth. */
function leafWall(S, { len, h, depth, card, mat, alongZ = false }) {
  const cards = [];
  const n = Math.max(1, Math.ceil(len / (card * 0.7)));
  const rows = Math.max(1, Math.ceil(h / (card * 0.75)));
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : -len / 2 + card * 0.35 + i * (len - card * 0.7) / (n - 1);
    for (const side of [-1, 1]) for (let row = 0; row < rows; row++) {
      const y = Math.min(h - card * 0.3, card * 0.4 + row * card * 0.75 + jit(S, 0.08));
      const g = leafCard(card, 0.15 + 0.3 * (y / h));
      g.rotateY((side > 0 ? 0 : PI) + jit(S, 0.35)); g.translate(u + jit(S, 0.1), y, side * depth / 2 + jit(S, 0.06));
      cards.push(g);
    }
    const top = leafCard(card, 0.45); top.rotateX(-PI / 2 + jit(S, 0.25)); top.rotateY(jit(S, 1)); top.translate(u, h + jit(S, 0.08), jit(S, depth * 0.25));
    cards.push(top);
  }
  const g = merge(cards);
  if (alongZ) g.rotateY(PI / 2);
  return { parts: [[mat, g]], height: h, crownY: h / 2, radius: len / 2 };
}

/** Fallen-tree rotation: tip the trunk ~83° toward compass bearing `deg` (0 = N = −z, 90 = E = +x). */
function fallRotation(yaw, deg, angle = 1.45) {
  const th = deg * PI / 180;
  const d = new THREE.Vector3(Math.sin(th), 0, -Math.cos(th));
  const axis = new THREE.Vector3().crossVectors(_up, d).normalize();
  const qFall = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  const qYaw = new THREE.Quaternion().setFromAxisAngle(_up, yaw);
  const e = new THREE.Euler().setFromQuaternion(qFall.multiply(qYaw), 'XYZ');
  return [e.x, e.y, e.z];
}

/**
 * @param {{mats:object, stream:object, layout:object}} ctx
 * @returns {{group:THREE.Group, byKind:Object<string,THREE.InstancedMesh>, instances:Object, proxies:Object<string,THREE.Group>, meshes:THREE.InstancedMesh[]}}
 */
export function buildVegetation({ mats, stream: S, layout = {} }) {
  const group = new THREE.Group(); group.name = 'vegetation';
  const kinds = {
    sabal: palmSabal(S),
    queen: palmFeather(S, { h: 8, r0: 0.17, r1: 0.24, n: 16, L: 3.0, w: 0.6, droop: 1.3, plumose: false, mat: 'frondQueen' }),
    foxtail: palmFeather(S, { h: 4.2, r0: 0.14, r1: 0.2, n: 10, L: 2.3, w: 0.8, droop: 0.8, plumose: true, mat: 'frondFoxtail', shaft: 0.8, shaftColor: [0.45, 0.6, 0.35] }),
    royal: palmFeather(S, { h: 11, r0: 0.28, r1: 0.42, n: 13, L: 4.2, w: 0.75, droop: 1.6, plumose: false, mat: 'frondRoyal', shaft: 1.8, bark: [0.82, 0.82, 0.8] }),
    oak: oak(S),
    ficus: leafWall(S, { len: 14, h: 2.7, depth: 1.1, card: 1.6, mat: 'leafFicus' }),
    hedge: leafWall(S, { len: 8.6, h: 0.95, depth: 0.7, card: 0.9, mat: 'leafHedge', alongZ: true }),
  };
  const lists = Object.fromEntries(Object.keys(kinds).map(k => [k, []]));
  const add = (kind, id, pos, s, named) => { if (!lists[kind]) { console.warn('[world] unknown tree kind', kind); return; } lists[kind].push({ id, pos, s, yaw: (kind === 'hedge' || kind === 'ficus') ? 0 : S.nextFloat() * 2 * PI, named }); };
  for (const t of Object.values(trees)) add(t.kind, t.id, t.pos, 1 + jit(S, 0.06), true);
  fillerTrees.forEach((f, i) => add(f.kind, `filler_${i}`, f.pos, f.s * (1 + jit(S, 0.05)), false));

  const byKind = {}, instances = {}, proxies = {}, meshes = [];
  for (const [kind, def] of Object.entries(kinds)) {
    const list = lists[kind];
    if (!list.length) continue;
    const geoms = def.parts.map(([, g]) => g);
    const materials = def.parts.map(([m]) => mats.get(m));
    let geom;
    if (geoms.length === 1) geom = geoms[0];
    else {
      for (const g of geoms) { if (!g.attributes.aFlex) withAttr(g, 'aFlex', 0, 1); if (!g.attributes.color) withAttr(g, 'color', [1, 1, 1], 3); if (!g.attributes.aBounce) withAttr(g, 'aBounce', 0, 1); }
      geom = mergeGeometries(geoms, true);
    }
    const mesh = new THREE.InstancedMesh(geom, materials.length === 1 ? materials[0] : materials, list.length);
    mesh.name = `veg:${kind}`; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.userData = { kind, instanceIds: list.map(l => l.id), height: def.height, crownY: def.crownY, radius: def.radius };
    list.forEach((inst, i) => {
      const x = inst.pos[0], z = inst.pos[2];
      const y = kind === 'hedge' ? siteHeightAt(x + 0.6, z) - 0.02 : siteHeightAt(x, z) - 0.06;
      // the clusia row sits in the bed beside the east wall: shift its centre 0.35 m out and 4.7 m south of its id point
      const px = kind === 'hedge' ? x + 0.35 : x, pz = kind === 'hedge' ? z + 4.7 : z;
      if (inst.named) {
        const proxy = new InstanceProxy(mesh, i);
        proxy.name = `tree:${inst.id}`;
        proxy.position.set(px, y, pz); proxy.rotation.y = inst.yaw; proxy.scale.setScalar(inst.s);
        proxy.userData = { ...proxy.userData, treeId: inst.id, kind, poses: { home: { p: [px, y, pz], r: [0, inst.yaw, 0], s: [inst.s, inst.s, inst.s] } }, pose: 'home' };
        proxy.userData.setPose = (name) => applyPose(proxy, name);
        proxies[inst.id] = proxy; group.add(proxy);
      } else {
        _p.set(px, y, pz); _q.setFromAxisAngle(_up, inst.yaw); _s.setScalar(inst.s);
        _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
      }
      instances[inst.id] = { id: inst.id, kind, index: i, mesh, pos: [px, y, pz], yaw: inst.yaw, s: inst.s, height: def.height * inst.s, crownY: def.crownY * inst.s, radius: def.radius * inst.s, named: inst.named };
    });
    mesh.instanceMatrix.needsUpdate = true;
    byKind[kind] = mesh; meshes.push(mesh); group.add(mesh);
  }
  // the dressing-prop proxies (ray_oak, berg_ficus): authored poses, fall directions → rotations
  const provided = {};
  for (const [id, spec] of Object.entries(layout)) {
    if (spec.factory !== 'treeProxy') continue;
    const proxy = proxies[spec.tree];
    if (!proxy) { console.warn('[world] treeProxy without a tree', id, spec.tree); continue; }
    const home = proxy.userData.poses.home;
    const poses = { home };
    for (const [name, pose] of Object.entries(spec.poses || {})) {
      const out = { ...pose, p: pose.p ? [...pose.p] : [...home.p] };
      if (pose.fallDirDeg != null) out.r = fallRotation(home.r[1], pose.fallDirDeg);
      else if (pose.r) out.r = [pose.r[0], pose.r[1] + home.r[1], pose.r[2]];
      poses[name] = out;
    }
    proxy.userData.objectId = id; proxy.userData.kind = 'treeProxy'; proxy.userData.room = spec.room; proxy.userData.poses = poses; proxy.userData.tree = spec.tree;
    proxy.userData.size = [instances[spec.tree].radius * 2, instances[spec.tree].height, instances[spec.tree].radius * 2];
    provided[id] = proxy;
  }
  return { group, byKind, instances, proxies, meshes, provided };
}
