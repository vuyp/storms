/**
 * world/build/props.js — the prop orchestrator: every object id (DESIGN §16.1) and every dressing prop id
 * (§4.2) becomes a Group in registry.props with authored poses; static clutter merges into the room meshes;
 * repeated small objects are one InstancedMesh per kind driven by self-syncing proxies; every object carries an
 * invisible hit proxy for the interaction raycast; screens, glow lenses and named parts are registered.
 * Owner: E4 world+textures. Writes no state.
 * Budget: ≈ 14 instanced kinds (1 draw call each) + the visible individual movables; ≤ 12 merged meshes per room.
 */
import * as THREE from 'three';
import * as furniture from '../props/furniture.js';
import * as kitchen from '../props/kitchen.js';
import * as appliances from '../props/appliances.js';
import * as devices from '../props/devices.js';
import * as exterior from '../props/exterior.js';
import { place, box3, box3At, rgb, merge, cyl, box, sphere, torus, plane, mulRgb } from './geo.js';
import { hitProxy } from '../props/common.js';
import { rooms, sockets, fixtures, DIM, LANAI, POOL, siteHeightAt } from '../plan.js';

const H = Math.PI / 2, PI = Math.PI;
const _m = new THREE.Matrix4();

/** A Group whose world matrix is mirrored into one instance of an InstancedMesh every frame (no sync call needed). */
export class InstanceProxy extends THREE.Group {
  constructor(mesh, index) { super(); this.userData.instance = { mesh, index }; this._last = new THREE.Matrix4().makeScale(0, 0, 0); this._hidden = false; }
  updateMatrixWorld(force) {
    super.updateMatrixWorld(force);
    const { mesh, index } = this.userData.instance;
    if (!this.visible) _m.makeScale(0, 0, 0); else _m.copy(mesh.matrixWorld).invert().multiply(this.matrixWorld);
    if (!_m.equals(this._last)) { this._last.copy(_m); mesh.setMatrixAt(index, _m); mesh.instanceMatrix.needsUpdate = true; }
  }
}

const FACTORIES = {
  ...furniture, ...kitchen, ...appliances, ...devices, ...exterior,
  switch: appliances.lightSwitch, console: devices.consoleUnit, bin: appliances.bin, cone: exterior.trafficCone,
};

/** Static furnishing per room beyond the object ids (DESIGN §3.3 contents). [factory, x, y, z, rotY, opts] */
const ROOM_STATICS = {
  nook: [['tableNook', 2.55, 0, 1.9, 0], ['sideTable', 4.9, 0, 0.7, 0], ['bayCushion', 2.55, 0.92, -0.2, 0]],
  kitchen: [
    ['baseCabinets', 0.55, 0, 5.0, H, { w: 3.4, drawers: 4 }], ['upperCabinets', 0.41, 0, 3.75, H, { w: 0.9 }], ['upperCabinets', 0.41, 0, 6.0, H, { w: 1.4 }],
    ['sinkUnit', 0.55, 0, 4.75, H], ['baseCabinets', 5.2, 0, 5.4, -H, { w: 0.38 }], ['baseCabinets', 5.2, 0, 6.52, -H, { w: 0.34 }],
    ['upperCabinets', 5.38, 0.6, 6.0, -H, { w: 1.1 }], ['island', 3.0, 0, 6.65, 0], ['prepPile', 2.4, 0, 7.5, 0],
  ],
  great: [['coffeeTable', 3.4, 0, 9.4, 0], ['sideTable', 5.0, 0, 8.05, 0], ['sideTable', 0.7, 0, 11.75, 0], ['bookshelf', 1.8, 0, 11.98, PI, { w: 1.2, h: 1.9 }], ['dogBed', 3.0, 0, 11.72, 0], ['dresser', 4.75, 0, 10.96, PI, { w: 1.6 }], ['areaRug', 3.2, 0.004, 9.0, 0, { w: 3.0, d: 2.4, colour: [0.5, 0.45, 0.42] }]],
  dining: [['tableDining', 8.0, 0, 8.35, 0], ['dresser', 6.4, 0, 7.02, 0, { w: 1.4 }]],
  foyer: [['closetFront', 11.8, 0, 7.36, 0, { w: 1.6 }], ['consoleTable', 13.1, 0, 6.94, 0]],
  hallBath: [['tub', 9.93, 0, 12.35, -H], ['vanity', 8.45, 0, 11.635, 0, { w: 0.9 }]],
  linen: [['pantryShelves', 10.14, 0, 14.5, -H, { w: 1.2 }]],
  masterBath: [['gardenTub', 0.7, 0, 13.15, H], ['shower', 0.75, 0, 14.5, 0], ['vanity', 2.5, 0, 12.54, 0, { w: 2.2 }]],
  masterCloset: [['closetShelves', 6.2, 0, 13.25, -H, { w: 3.7 }], ['closetShelves', 4.25, 0, 12.35, H, { w: 1.9 }], ['safe', 5.9, 0, 11.65, 0]],
  masterBR: [['dresser', 1.15, 0, 19.28, PI, { w: 1.4 }], ['nightstand', 4.4, 0, 16.78, -H], ['nightstand', 4.4, 0, 19.3, -H], ['areaRug', 2.4, 0.004, 17.6, 0, { w: 3.6, d: 2.6, colour: [0.55, 0.55, 0.6] }]],
  ahuCloset: [['airHandler', 5.7, 0, 18.6, 0]],
  den: [['desk', 9.95, 0, 17.7, -H], ['deskChair', 9.2, 0, 17.7, H], ['filingCabinet', 10.1, 0, 19.25, PI], ['bookshelf', 6.75, 0, 17.6, H, { w: 1.2, h: 1.6 }]],
  bed2: [['dresser', 10.72, 0, 13.65, H, { w: 1.3 }], ['nightstand', 13.35, 0, 14.9, PI], ['closetFront', 13.05, 0, 11.96, 0, { w: 1.3 }], ['toteStack', 13.3, 0, 12.45, 0]],
  bed3: [['closetFront', 12.65, 0, 15.86, 0, { w: 2.1 }], ['boxStack', 13.1, 0, 16.6, 0]],
  laundry: [['dryer', 6.04, 0, 0.62, 0], ['washer', 6.76, 0, 0.62, 0], ['utilitySink', 5.95, 0, 2.62, 0], ['shelfBoard', 6.2, 1.48, 2.8, 0, { w: 0.9 }], ['petBowls', 7.1, 0, 2.62, 0]],
  pantry: [['pantryShelves', 7.24, 0, 4.85, -H, { w: 3.4 }], ['pantryShelves', 5.86, 0, 3.7, H, { w: 1.2 }], ['pantryShelves', 5.86, 0, 5.95, H, { w: 1.3 }]],
  garage: [['shelvingUnit', 9.75, 0, 0.52, 0, { w: 3.5 }], ['shutterRack', 10.55, 0, 6.42, PI], ['waterHeater', 8.0, 0, 6.15, 0], ['wetVac', 13.25, 0, 4.9, 0], ['boxFan', 12.55, 0, 5.05, 0], ['coolers', 11.95, 0, 1.0, 0], ['ladder', 7.62, 1.3, 4.5, 0], ['drill', 10.0, 1.12, 0.5, 0.4]],
  lanai: [['tvOutdoor', -0.06, 1.6, 11.9, -H]],
  outside: [['bench', 14.72, -0.15, 7.2, H], ['pot', 14.45, -0.15, 7.6, 0], ['pot', 14.45, -0.15, 9.45, 0], ['backflow', 15.5, -0.3, 11.5, 0], ['meter', 12.0, 1.45, -0.02, PI], ['poolPumpPad', -2.0, -0.15, 18.5, 0]],
};
const EXT_ROOMS = new Set(['outside', 'lanai', 'cage']);

/** Where 'loose' objects go when stored (DESIGN §6.1 task 3): grid offsets around the store sockets. */
function storePoses(index) {
  const g = sockets.sock_garage_store.pos, po = sockets.sock_pool_sink.pos, ins = sockets.sock_inside_store.pos;
  const col = index % 3, row = Math.floor(index / 3);
  return {
    garage: { p: [g[0] - 0.6 + col * 0.6, g[1], g[2] - row * 0.7], r: [0, 0.3 * (index % 2), 0] },
    pool: { p: [po[0] - 1.2 + col * 1.2, po[1] + 0.05 * row, po[2] - 1.5 + row * 1.2], r: [0.3 * (index % 2), index * 0.7, 0.2] },
    inside: { p: [ins[0] + 0.2 * col, ins[1] + 0.02 * row, ins[2] + 0.4 * row], r: [0, 0.4 * index, 0] },
    gone: { v: false },
  };
}

/**
 * @param {object} ctx { mats, layout, roomCollector, exteriorCollector, colliders, colliderMeta, stream, provided:{id→Group},
 *                       roomOfXZ, cageMesh?, glowMeshes:{}, screens:{} }
 */
export function buildProps(ctx) {
  const { mats, layout, roomCollector, exteriorCollector, colliders, colliderMeta, stream, provided = {}, glowMeshes = {}, screens = {} } = ctx;
  const groups = {};
  const roots = [];
  const parts = {};
  const instanced = {};   // kind → { mesh, ids:[], geom, mat, n }
  const pending = [];     // [{ id, kind, spec, size, low, collider }]
  const fctx = { mats, stream };

  const collectorFor = (room) => (EXT_ROOMS.has(room) || !rooms[room]) ? exteriorCollector : roomCollector(room);
  const addStatics = (list, x, y, z, ry, room) => { const coll = collectorFor(room); for (const [mat, g] of list) { place(g, x, y, z, ry); coll.add(mat, g); } };
  const addCollider = (x, y, z, size, ry, id, low, offset = [0, 0, 0]) => {
    if (low) return;
    const c = Math.cos(ry), s = Math.sin(ry);
    const ox = offset[0] * c + offset[2] * s, oz = -offset[0] * s + offset[2] * c;
    colliders.push(box3At(x + ox, y + (offset[1] || 0), z + oz, size[0], size[1], size[2], ry));
    colliderMeta.push({ id, kind: 'prop' });
  };

  // ---- static room furnishing ----
  for (const [room, list] of Object.entries(ROOM_STATICS)) {
    for (const [factory, x, y, z, ry, opts = {}] of list) {
      const f = FACTORIES[factory]; if (!f) { console.warn('[world] no factory', factory); continue; }
      const r = f({ id: `${room}:${factory}`, ...opts }, fctx);
      if (r.static) addStatics(r.static, x, y, z, ry, room);
      if (r.group) { r.group.position.set(x, y, z); r.group.rotation.y = ry; roots.push(r.group); }
      if (r.collider) addCollider(x, y, z, r.size, ry, `${room}:${factory}`, r.low, r.offset);
      if (r.extraColliders) for (const [ex, ey, ez, w, h, d] of r.extraColliders) { const c = Math.cos(ry), s = Math.sin(ry); colliders.push(box3At(x + ex * c + ez * s, y + ey, z - ex * s + ez * c, w, h, d, ry)); colliderMeta.push({ id: `${room}:${factory}`, kind: 'prop' }); }
      if (r.screen && r.screen.canvas) { /* desk monitor: a static dark screen only */ }
    }
  }

  // ---- fixture housings (cans, flush mounts, shop lights, chandeliers) with per-room glow lenses ----
  buildFixtureHousings(ctx, glowMeshes, provided);

  // ---- the objects and dressing props ----
  let looseIndex = 0;
  for (const [id, spec0] of Object.entries(layout)) {
    const spec = { ...spec0, id };
    if (provided[id]) { groups[id] = provided[id]; continue; }
    if (['door', 'window', 'garageDoor', 'accordion', 'doorNguyen', 'nguyenInterior', 'streetlights', 'treeProxy', 'panel'].includes(spec.factory)) continue; // built elsewhere
    const f = FACTORIES[spec.factory];
    if (!f) { console.warn('[world] no factory for', id, spec.factory); groups[id] = placeholder(id, spec); roots.push(groups[id]); continue; }
    const r = f(spec, fctx);
    const [x, y, z] = spec.pos || [0, 0, 0];
    const ry = spec.rotY || 0;
    let grp = r.group || null;
    if (r.instanced) {
      const kind = r.instanced;
      if (!instanced[kind]) instanced[kind] = { kind, list: [], statics: r.static, size: r.size, low: r.low };
      const idx = instanced[kind].list.length;
      instanced[kind].list.push({ id, spec });
      grp = new THREE.Group(); grp.name = id; // replaced by an InstanceProxy after the mesh exists
      pending.push({ id, kind, index: idx, spec, size: r.size, low: r.low, x, y, z, ry, double: r.double });
      continue;
    }
    if (r.static && r.static.length) addStatics(r.static, x, y, z, ry, spec.room);
    if (!grp) { grp = new THREE.Group(); grp.name = id; }
    if (!grp.getObjectByName(`hit:${id}`) && r.size && !r.absolute) grp.add(hitProxy(r.size[0], r.size[1], r.size[2], r.centred ? -r.size[1] / 2 : 0, id));
    grp.position.set(x, y, z); grp.rotation.y = ry;
    grp.name = id;
    finishGroup(grp, id, spec, r, looseIndex);
    if (spec.loose) looseIndex++;
    if (r.collider) addCollider(x, y, z, r.size, ry, id, r.low, r.offset);
    if (r.screen && r.screen.canvas) screens[id] = { ...r.screen, mesh: r.screen.mesh, objectId: id };
    if (r.parts) for (const [k, v] of Object.entries(r.parts)) if (v) { parts[`${id}:${k}`] = v; v.userData.part = k; v.userData.objectId = id; }
    if (r.patches) grp.userData.patches = r.patches;
    groups[id] = grp; roots.push(grp);
  }

  // ---- instanced kinds: one mesh per kind, one proxy per object ----
  for (const [kind, info] of Object.entries(instanced)) {
    const byMat = new Map();
    for (const [mat, g] of info.statics) { if (!byMat.has(mat)) byMat.set(mat, []); byMat.get(mat).push(g); }
    const mats2 = [], geoms = [];
    for (const [mat, gs] of byMat) { geoms.push(merge(gs)); mats2.push(mats.get(mat)); }
    let geom, material;
    if (geoms.length === 1) { geom = geoms[0]; material = mats2[0]; }
    else {
      // multi-material: merge with groups
      const { mergeGeometries } = { mergeGeometries: null };
      void mergeGeometries;
      geom = mergeWithGroups(geoms); material = mats2;
    }
    const n = info.list.length;
    const mesh = new THREE.InstancedMesh(geom, material, n);
    mesh.name = `inst:${kind}`; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.userData = { kind, instanceIds: info.list.map(l => l.id) };
    info.mesh = mesh; info.ids = mesh.userData.instanceIds;
    roots.push(mesh);
  }
  for (const pd of pending) {
    const info = instanced[pd.kind];
    const proxy = new InstanceProxy(info.mesh, pd.index);
    proxy.name = pd.id;
    proxy.add(hitProxy(pd.size[0], pd.size[1], pd.size[2], 0, pd.id));
    proxy.position.set(pd.x, pd.y, pd.z); proxy.rotation.y = pd.ry;
    finishGroup(proxy, pd.id, pd.spec, { size: pd.size, low: pd.low }, looseIndex);
    if (pd.spec.loose) looseIndex++;
    groups[pd.id] = proxy; roots.push(proxy);
  }
  return { groups, roots, instanced, parts, screens, glowMeshes };
}

function mergeWithGroups(geoms) {
  // simple multi-material merge: concatenates attributes and adds groups
  const out = new THREE.BufferGeometry();
  const attrs = {}; const index = []; let vOff = 0, iOff = 0;
  const names = ['position', 'normal', 'uv', 'color', 'aBounce'];
  for (const n of names) attrs[n] = [];
  const groups = [];
  geoms.forEach((g, gi) => {
    const cnt = g.attributes.position.count;
    for (const n of names) { const a = g.attributes[n]; const size = a ? a.itemSize : (n === 'uv' ? 2 : n === 'aBounce' ? 1 : 3); for (let i = 0; i < cnt * size; i++) attrs[n].push(a ? a.array[i] : (n === 'color' ? 1 : 0)); }
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: cnt }, (_, i) => i);
    for (const i of idx) index.push(i + vOff);
    groups.push({ start: iOff, count: idx.length, materialIndex: gi });
    vOff += cnt; iOff += idx.length;
  });
  out.setAttribute('position', new THREE.Float32BufferAttribute(attrs.position, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(attrs.normal, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(attrs.uv, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(attrs.color, 3));
  out.setAttribute('aBounce', new THREE.Float32BufferAttribute(attrs.aBounce, 1));
  out.setIndex(index);
  for (const g of groups) out.addGroup(g.start, g.count, g.materialIndex);
  out.computeBoundingSphere();
  return out;
}

function placeholder(id, spec) {
  const g = new THREE.Group(); g.name = id;
  if (spec.pos) g.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
  g.userData = { objectId: id, poses: { home: { p: spec.pos || [0, 0, 0], r: [0, spec.rotY || 0, 0] } }, pose: 'home' };
  return g;
}

/** userData: objectId, kind, room, poses (home + authored + store), current pose, parts map. */
function finishGroup(grp, id, spec, r, looseIndex) {
  const poses = {};
  const p0 = spec.pos || [grp.position.x, grp.position.y, grp.position.z];
  poses.home = { p: [...p0], r: [0, spec.rotY || 0, 0] };
  if (spec.poses) for (const [k, v] of Object.entries(spec.poses)) poses[k] = { ...v, p: v.p ? [...v.p] : undefined, r: v.r ? [...v.r] : undefined };
  if (spec.loose) Object.assign(poses, storePoses(looseIndex));
  grp.userData = { ...grp.userData, objectId: id, kind: spec.factory, room: spec.room, poses, pose: 'home', size: r.size, low: !!r.low, loose: !!spec.loose, hang: !!spec.hang };
  if (r.parts) grp.userData.parts = r.parts;
  // apply the initial pose's visibility (dressing props hidden until posed)
  const first = spec.poses ? Object.values(spec.poses)[0] : null;
  if (first && first.v === false) grp.visible = false;
  if (first && first.parts && r.parts) for (const [k, v] of Object.entries(first.parts)) if (r.parts[k]) r.parts[k].visible = v;
  grp.userData.setPose = (name) => applyPose(grp, name);
}

/** Apply an authored pose (position/rotation/visibility/parts/scale) to a prop group. Render calls this. */
export function applyPose(grp, name) {
  const pose = grp.userData.poses?.[name];
  if (!pose) return false;
  if (pose.p) grp.position.set(pose.p[0], pose.p[1], pose.p[2]);
  if (pose.r) grp.rotation.set(pose.r[0], pose.r[1], pose.r[2]);
  if (pose.s) grp.scale.set(pose.s[0], pose.s[1], pose.s[2]);
  if (pose.v != null) grp.visible = pose.v; else if (pose.p || pose.r || pose.parts) grp.visible = true;
  if (pose.parts && grp.userData.parts) for (const [k, v] of Object.entries(pose.parts)) if (grp.userData.parts[k]) grp.userData.parts[k].visible = v;
  grp.userData.pose = name;
  return true;
}

/** Ceiling fixtures: recessed cans (trim ring + lens), flush mounts, the garage shop lights, chandeliers. */
function buildFixtureHousings(ctx, glowMeshes, provided) {
  const { mats, roomCollector, exteriorCollector } = ctx;
  const white = rgb([0.95, 0.95, 0.93]);
  const glowByRoom = {};
  for (const [id, f] of Object.entries(fixtures)) {
    if (f.kind !== 'point' || f.lamp || f.socketId || f.transformerId || id.startsWith('fix_street') || id === 'fix_fountain' || id === 'fix_pool' || id.startsWith('fix_coach')) continue;
    const [x, y, z] = f.pos;
    const room = f.room;
    const coll = (room === 'lanai' || room === 'outside') ? exteriorCollector : roomCollector(room);
    // fans carry their own light kits (the fan object's part); link those
    if (f.fan) { glowMeshes[id] = { fanObject: id === 'fix_great_fan' ? 'fan_great' : id === 'fix_master_fan' ? 'fan_master' : id.replace('fix_lanai_', 'fan_lanai_') }; continue; }
    if (['fix_den', 'fix_bed2', 'fix_bed3'].includes(id)) { glowMeshes[id] = { fanObject: id.replace('fix_', 'fan_') }; continue; }
    let lens;
    if (id.startsWith('fix_garage')) {
      coll.add('matte', place(box(1.25, 0.07, 0.16, { color: white }), x, y + 0.035, z));
      lens = place(box(1.2, 0.02, 0.1, { color: [1, 1, 1] }), x, y - 0.005, z);
    } else if (id === 'fix_dining' || id === 'fix_nook') {
      const arms = id === 'fix_dining' ? 5 : 3;
      const chain = cyl(0.008, 0.008, DIM.ceiling - y, 6, { color: rgb([0.25, 0.22, 0.2]) }); place(chain, x, (DIM.ceiling + y) / 2, z); coll.add('matte', chain);
      coll.add('matte', place(cyl(0.05, 0.05, 0.08, 10, { color: rgb([0.25, 0.22, 0.2]) }), x, y + 0.04, z));
      const lensGeoms = [];
      for (let i = 0; i < arms; i++) {
        const a = i * 2 * PI / arms; const ax = x + Math.sin(a) * 0.22, az = z + Math.cos(a) * 0.22;
        coll.add('matte', place(box(0.24, 0.012, 0.012, { color: rgb([0.25, 0.22, 0.2]) }), x + Math.sin(a) * 0.11, y, z + Math.cos(a) * 0.11, a));
        lensGeoms.push(place(cyl(0.035, 0.05, 0.1, 10, { color: [1, 1, 1] }, true), ax, y + 0.05, az));
      }
      lens = merge(lensGeoms);
    } else if (['fix_frontHall', 'fix_bedHall_1', 'fix_bedHall_2', 'fix_laundry', 'fix_pantry', 'fix_linen', 'fix_masterCloset', 'fix_ahu', 'fix_hallBath'].includes(id)) {
      // flush-mount dome
      coll.add('matte', place(cyl(0.16, 0.16, 0.02, 14, { color: white }), x, y - 0.01, z));
      lens = place(sphere(0.14, 12, { color: [1, 1, 1] }), x, y - 0.02, z, 0, 0, 0, [1, 0.5, 1]);
    } else {
      // recessed can: trim ring flush with the ceiling + a lens disc just inside
      coll.add('matte', place(torus(0.075, 0.012, 6, 16, { color: white }), x, y - 0.005, z, 0, H, 0));
      lens = place(cyl(0.065, 0.065, 0.01, 14, { color: [1, 1, 1] }), x, y - 0.012, z);
    }
    (glowByRoom[room] = glowByRoom[room] || { geoms: [], ids: [] }).geoms.push(lens);
    glowByRoom[room].ids.push(id);
  }
  const meshes = [];
  for (const [room, { geoms, ids }] of Object.entries(glowByRoom)) {
    const mesh = new THREE.Mesh(merge(geoms), mats.variant('glow', `room:${room}`, {}));
    mesh.name = `glow:${room}`; mesh.castShadow = false; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    mesh.userData = { fixtureIds: ids, room };
    for (const id of ids) glowMeshes[id] = mesh;
    meshes.push(mesh);
  }
  ctx.roomGlow = Object.fromEntries(meshes.map(m => [m.userData.room, m]));
  return meshes;
}
