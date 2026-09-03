/**
 * world/index.js — the static world (ARCHITECTURE §6.6, §15 WP-14). `build(ctx)` → { root, registry }:
 * textures → materials → walls/floors/roof/openings/shutters → cage + pool → terrain → vegetation →
 * neighbourhood → props → per-room merged meshes → colliders grid → registry. Creates no THREE.Light.
 * Owner: E4 world+textures. Writes no state (reads meta.seed / meta.options / quality only).
 */
import * as THREE from 'three';
import * as tex from '../textures/index.js';
import { createMaterials } from '../textures/materials.js';
import { createStream } from '../core/rng.js';
import plan, { lines, rooms, openings as planOpenings, fixtures, roomCentre, siteHeightAt, props as LAYOUT } from './plan.js';
import { roomOf, roomOfXZ, yardSectorOf, isIndoorRoom } from './roomOf.js';
import { Collector, box3 } from './build/geo.js';
import { createBaker } from './build/bake.js';
import { buildWalls, buildStuccoTrim } from './build/walls.js';
import { buildFloors } from './build/floors.js';
import { buildHouseRoof } from './build/roof.js';
import { buildOpenings } from './build/openings.js';
import { buildShutters } from './build/shutters.js';
import { buildProps, applyPose, InstanceProxy } from './build/props.js';
import { buildCage } from './props/cage.js';
import { buildTerrain } from './terrain.js';
import { buildVegetation } from './vegetation.js';
import { buildNeighbourhood, patchesOnSlope } from './neighbourhood.js';
import { createColliderGrid } from './colliders.js';
import { assembleRegistry, checkRegistry } from './registry.js';

/** Shared uniforms + material accessors, filled by build() (render writes the uniform values each frame). */
export const materials = { uniforms: null, get: null, variant: null, patch: null, screenMaterial: null, all: null, names: null, info: null, dispose: null };
export const textures = tex.api;
export { plan, roomOf, roomOfXZ, yardSectorOf, isIndoorRoom, applyPose, InstanceProxy };

let registry = null, root = null, matsRef = null;
const HOUSE_COLOUR = [0.85, 0.80, 0.70], BAND_COLOUR = [0.94, 0.92, 0.88];

/** Count triangles of a mesh (× instances). */
function trisOf(obj) {
  if (!obj.isMesh && !obj.isLine) return 0;
  const g = obj.geometry; if (!g) return 0;
  const n = g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
  return obj.isInstancedMesh ? n * obj.count : n;
}

/**
 * Build the world. `ctx` needs `state.meta.{seed, options}`, `rng` (fork), and optionally `quality` ('low' …).
 * @returns {Promise<{root:THREE.Group, registry:object}>}
 */
export async function build(ctx) {
  const t0 = performance.now();
  const meta = ctx.state?.meta || {};
  const seed = (meta.seed ?? 7) >>> 0;
  const tier = typeof ctx.quality === 'string' ? ctx.quality : (ctx.quality?.tier || meta.quality || 'high');
  const lowTier = tier === 'low';
  const options = meta.options || {};
  const stream = ctx.rng?.fork ? ctx.rng.fork('world') : createStream(seed, 'world');
  const rng = ctx.rng?.fork ? ctx.rng : { fork: (n) => createStream(seed, n), hash01: () => 0.5 };

  // 1. textures + materials
  tex.init({ seed, anisotropy: lowTier ? 4 : 8, lowTier });
  const texStats = await tex.prepare(undefined, ctx.onProgress || null);
  const mats = createMaterials({ quality: tier });
  Object.assign(materials, mats);
  matsRef = mats;

  // 2. collectors, bakers, colliders
  root = new THREE.Group(); root.name = 'world';
  const roomCollectors = {};
  const roomCollector = (id) => (roomCollectors[id] = roomCollectors[id] || new Collector());
  const exteriorCollector = new Collector();
  const bakers = {};
  const bakerFor = (id) => (bakers[id] = bakers[id] || createBaker(Object.values(fixtures).filter(f => f.room === id && f.kind === 'point'), { radius: id === 'garage' ? 3.2 : 2.4 }));
  const colliders = [], colliderMeta = [];
  const pushColliders = (list, tag) => { for (const b of list) { colliders.push(b); colliderMeta.push(tag); } };
  const roomAt = (x, z) => roomOfXZ(x, z);
  const layout = { ...LAYOUT };

  // 3. the house shell
  const wallBoxes = [];
  const wallStats = buildWalls({ lines, roomAt, bakerFor, roomCollector, exteriorCollector, colliders: wallBoxes, houseColour: HOUSE_COLOUR, bandColour: BAND_COLOUR });
  pushColliders(wallBoxes, { id: 'wall', kind: 'wall' });
  buildStuccoTrim({ lines, openings: planOpenings, exteriorCollector, houseColour: HOUSE_COLOUR, bandColour: BAND_COLOUR });
  buildFloors({ bakerFor, roomCollector, exteriorCollector });
  const roof = buildHouseRoof({ exteriorCollector, mats, rng });
  const ob = buildOpenings({ mats, roomCollector, exteriorCollector, roomAt, colliders, houseNumber: '4212' });
  const sh = buildShutters({ mats, exteriorCollector, openingsBuilt: ob, layout });

  // 4. cage + pool, terrain, vegetation, neighbourhood
  const cage = buildCage({ mats });
  root.add(cage.group);
  pushColliders(cage.colliders.map(c => box3(...c)), { id: 'cage', kind: 'cage' });
  colliders.push(box3(cage.pool.box[0], cage.pool.box[1], cage.pool.box[2], cage.pool.box[3], cage.pool.box[4] - 0.02, cage.pool.box[5])); colliderMeta.push({ id: 'pool', kind: 'pool' });
  const terrain = buildTerrain({ mats, key: seed });
  root.add(terrain.group);
  const veg = buildVegetation({ mats, stream, layout });
  root.add(veg.group);
  const hood = buildNeighbourhood({ mats, stream, colliders, colliderMeta, layout, options });
  root.add(hood.group);
  if (layout.ray_windowsLit) layout.ray_windowsLit = { ...layout.ray_windowsLit, quads: hood.windowQuads.ray };
  if (layout.lastDarkHouse) layout.lastDarkHouse = { ...layout.lastDarkHouse, quads: hood.windowQuads.f4217 };

  // 5. props: provided groups (doors, windows, panels, the accordion, trees, the neighbourhood's groups)
  const provided = { ...veg.provided, ...hood.provided, ...sh.panels, accordion_great: sh.accordion };
  for (const [id, spec] of Object.entries(layout)) {
    if (spec.factory === 'door' && ob.doors[id]) provided[id] = ob.doors[id];
    else if (spec.factory === 'window' && ob.openings[id]?.frame) provided[id] = ob.openings[id].frame;
    else if (spec.factory === 'garageDoor' && ob.openings.door_garage_roll?.door) provided[id] = ob.openings.door_garage_roll.door;
  }
  for (const [id, grp] of Object.entries(provided)) {
    if (!grp.userData.poses) {
      const spec = layout[id] || {};
      const p = [grp.position.x, grp.position.y, grp.position.z];
      grp.userData = { ...grp.userData, objectId: id, kind: spec.factory || grp.userData.kind || 'provided', room: spec.room, poses: { home: { p, r: [grp.rotation.x, grp.rotation.y, grp.rotation.z] }, ...(spec.poses || {}) }, pose: 'home' };
      grp.userData.setPose = (name) => applyPose(grp, name);
    }
  }
  const screens = {};
  const pr = buildProps({ mats, layout, roomCollector, exteriorCollector, colliders, colliderMeta, stream, provided, roomOfXZ, glowMeshes: ob.glowMeshes, screens });
  for (const r of pr.roots) if (!r.parent) root.add(r);
  for (const [id, grp] of Object.entries(provided)) if (!grp.parent && !isDescendant(grp, root)) root.add(grp);
  if (pr.roots.every(r => r !== pr.groups.accordion_great) && sh.accordion && !sh.accordion.parent) root.add(sh.accordion);
  // the Bergstroms' stripped-tab patches onto their east slope
  const bs = pr.groups.berg_shingles;
  if (bs && bs.userData.patches && hood.roofSlopes.bergstrom) {
    const slope = hood.roofSlopes.bergstrom.A?.find(s => s.id === 'E') || hood.roofSlopes.bergstrom.C?.find(s => s.id === 'E');
    if (slope) { const g = patchesOnSlope(bs.userData.patches, slope, stream, layout.berg_shingles.pos); if (g) { const m = new THREE.Mesh(g, mats.get('felt')); m.name = 'berg_shingles:patches'; bs.add(m); } }
    delete bs.userData.patches;
  }
  // door pivots, openings' frames/glass, the garage door, sliders, coach lights → the root
  for (const d of Object.values(ob.doors)) if (!d.parent) root.add(d);
  for (const o of Object.values(ob.openings)) { for (const k of ['frame', 'glass', 'shutter']) if (o[k] && !o[k].parent) root.add(o[k]); }
  for (const e of ob.extra) if (!e.parent) root.add(e);
  if (ob.garageDoorMesh && !ob.garageDoorMesh.parent) root.add(ob.garageDoorMesh);
  for (const m of ob.frameMeshes) root.add(m);
  if (ob.screensMesh) { ob.screensMesh.renderOrder = 1; root.add(ob.screensMesh); }
  for (const g of Object.values(ob.glowMeshes)) if (g instanceof THREE.Object3D && !g.parent) root.add(g);
  if (roof.tabs) root.add(roof.tabs);

  // 6. per-room merged meshes + the exterior
  const roomGroups = {};
  for (const [id, coll] of Object.entries(roomCollectors)) {
    const grp = new THREE.Group(); grp.name = `room:${id}`;
    const meshes = coll.build((n) => mats.get(n), `room:${id}`, { glass: { renderOrder: 2 }, all: { castShadow: !['tile', 'carpet', 'drywall', 'garageFloor', 'pavers'].includes(id) } });
    for (const m of meshes) m.castShadow = !/tile|carpet|drywall|garageFloor|pavers|paint/.test(m.name);
    grp.add(...meshes);
    grp.userData = { room: id, meshCount: meshes.length };
    roomGroups[id] = grp; root.add(grp);
  }
  const exteriorMeshes = exteriorCollector.build((n) => mats.get(n), 'exterior', { all: { castShadow: true } });
  for (const m of exteriorMeshes) m.castShadow = !/turf|mulch|concrete|asphalt|pavers|soffit/.test(m.name);
  const exteriorGroup = new THREE.Group(); exteriorGroup.name = 'exterior'; exteriorGroup.add(...exteriorMeshes); root.add(exteriorGroup);

  // 7. colliders grid, stats, registry
  const grid = createColliderGrid(colliders, colliderMeta, 2);
  root.updateMatrixWorld(true);
  let meshCount = 0, tris = 0, instancedCount = 0;
  root.traverse((o) => { if (o.isMesh || o.isLine) { if (o.visible !== false && (!o.userData || !o.userData.hit)) { meshCount++; tris += trisOf(o); if (o.isInstancedMesh) instancedCount++; } } });
  const perRoom = Object.fromEntries(Object.entries(roomGroups).map(([id, g]) => [id, g.children.length]));
  const stats = {
    buildMs: Math.round(performance.now() - t0), textures: texStats, textureBytes: tex.textureBytes(), materials: mats.all.size,
    meshes: meshCount, instancedMeshes: instancedCount, triangles: Math.round(tris), colliders: colliders.length, grid: grid.stats(),
    perRoomMeshes: perRoom, maxRoomMeshes: Math.max(...Object.values(perRoom)), walls: wallStats, exteriorMeshes: exteriorMeshes.length, hoodMeshes: hood.meshes.length,
  };
  registry = assembleRegistry({
    colliders, colliderMeta, grid, openings: ob.openings, doors: ob.doors, props: pr.groups, cage, pool: cage.pool, terrain, veg, hood, roof, roomGroups, exteriorMeshes, mats,
    screens: pr.screens, instanced: pr.instanced, glowMeshes: pr.glowMeshes, propParts: pr.parts, stats, sliders: ob.sliders, garageDoorMesh: ob.garageDoorMesh,
  });
  registry.root = root;
  registry.applyPose = applyPose;
  registry.roomOf = roomOf;
  registry.yardSectorOf = yardSectorOf;
  registry.materialsApi = mats;
  const problems = checkRegistry(registry);
  if (problems.length) console.warn('[world] registry problems:', problems);
  stats.registryProblems = problems;
  if (ctx.debug || options.debugWorld) console.log('[world] built', stats);
  return { root, registry };
}
function isDescendant(obj, ancestor) { let p = obj.parent; while (p) { if (p === ancestor) return true; p = p.parent; } return false; }

/** Module lifecycle (main calls build() instead of init()); update advances the shared clock uniform only if render did not. */
export function init() { /* build() is the init */ }
export function update() { /* the world is static; render writes the uniforms */ }
export function dispose() {
  if (root) { root.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); }); root.parent?.remove(root); }
  matsRef?.dispose(); tex.dispose();
  root = null; registry = null; matsRef = null;
}
export const api = {
  build, plan, roomOf, roomOfXZ, yardSectorOf, isIndoorRoom, applyPose, materials, textures,
  get registry() { return registry; }, get root() { return root; },
  roomCentre, groundHeightAt: siteHeightAt,
  stats: () => registry?.stats || null,
};
export default { build, init, update, dispose, api, plan, roomOf, yardSectorOf, materials, textures };
