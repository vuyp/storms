/**
 * world/terrain.js — the ground (three concentric grids: 0.5 m over the lot, 2 m over the neighbourhood,
 * 8 m to the fog), the swale street with its crown and the cul-de-sac bulb, the main road and Egret Way,
 * driveways / walk / porch slab / the front step / pads in broom-finish concrete, the retention pond and its
 * water plane, the street flood plane (DESIGN §3.7, §6.8; ARCHITECTURE §9; T §10.7, §10.9).
 * Owner: E4 world+textures. Writes no state. Heights come from plan.siteHeightAt so the player agrees.
 */
import * as THREE from 'three';
import { quad, quadY, boxAt, rgb, mulRgb, merge, staticMesh, Collector } from './build/geo.js';
import { siteHeightAt, SLAB, LANAI, CAGE, PORCH, DRIVEWAY, WALK, STREET, SWALE, BULB, MAIN_ROAD, EGRET_WAY, POND, DIM, CONDENSER, lots, lotTransform } from './plan.js';
import { hash3 } from '../textures/noise.js';

const inRect = (x, z, r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

/** Terrain height: the site height except under slabs/decks, which drop 0.25 m so nothing z-fights a floor. */
export function terrainHeightAt(x, z) {
  if (inRect(x, z, SLAB)) return -0.35;
  if (inRect(x, z, CAGE) || inRect(x, z, LANAI)) return CAGE.y - 0.25;
  if (inRect(x, z, PORCH)) return PORCH.y - 0.2;
  for (const lot of lots) { if (lot.id === 'self') continue; const b = lotTransform(lot).bounds(); if (x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]) return -0.45; }
  return siteHeightAt(x, z);
}

function isPaved(x, z) {
  if (inRect(x, z, DRIVEWAY)) return true;
  for (const w of WALK) if (inRect(x, z, w)) return true;
  if (z >= STREET.z0 && z <= STREET.z1 && x >= STREET.x0 && x <= STREET.x1) return true;
  const dbx = x - BULB.cx, dbz = z - BULB.cz; if (dbx * dbx + dbz * dbz <= BULB.r * BULB.r) return true;
  if (z >= MAIN_ROAD.z0 && z <= MAIN_ROAD.z1) return true;
  if (inRect(x, z, EGRET_WAY)) return true;
  return false;
}

/** A height-sampled grid over [x0,x1]×[z0,z1] at `step`, skipping cells inside `hole`; vertex colours by surface. */
function groundGrid(x0, z0, x1, z1, step, hole, key) {
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const pos = [], uv = [], col = [], idx = [];
  const grass = rgb([1, 1, 1]), grassDry = rgb([1.08, 1.0, 0.85]), pondBed = rgb([0.55, 0.5, 0.42]), bank = rgb([0.8, 0.78, 0.6]);
  const vid = new Int32Array((nx + 1) * (nz + 1)).fill(-1);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * step, z = z0 + j * step;
    const y = terrainHeightAt(x, z) - 0.01;
    pos.push(x, y, z); uv.push(x, z);
    const inPond = x <= POND.waterX + 1 && x >= POND.farX - 1 && z >= POND.z0 - 6 && z <= POND.z1 + 6;
    const nearBank = x < POND.bankX + 1.5 && x > POND.farX - 4 && z > POND.z0 - 8 && z < POND.z1 + 8;
    const n = hash3(Math.round(x * 2), Math.round(z * 2), key);
    let c = grass;
    if (inPond) c = pondBed; else if (nearBank) c = bank; else if (n > 0.86) c = grassDry;
    const shade = 0.9 + 0.2 * hash3(i, j, key + 1);
    col.push(c[0] * shade, c[1] * shade, c[2] * shade);
    vid[j * (nx + 1) + i] = j * (nx + 1) + i;
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const cx = x0 + (i + 0.5) * step, cz = z0 + (j + 0.5) * step;
    if (hole && cx > hole[0] && cx < hole[2] && cz > hole[1] && cz < hole[3]) continue;
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aBounce', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The crowned street as a strip following the site profile (plus the bulb, the main road and Egret Way). */
function streetGeometry() {
  const geoms = [];
  const dark = rgb([1, 1, 1]);
  const strip = (x0, x1, z0, z1, nx, nz) => quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], { nx, ny: nz, color: dark, vertexFn: (p) => { p[1] = siteHeightAt(p[0], p[2]) + 0.012; }, uvFn: (p) => [p[0] - 23.1, p[2]] });
  geoms.push(strip(STREET.x0, STREET.x1, STREET.z0, STREET.z1, 14, Math.round((STREET.z1 - STREET.z0) / 2)));
  geoms.push(strip(MAIN_ROAD.x0, MAIN_ROAD.x1, MAIN_ROAD.z0, MAIN_ROAD.z1, 40, 4));
  geoms.push(strip(EGRET_WAY.x0, EGRET_WAY.x1, EGRET_WAY.z0, EGRET_WAY.z1, 24, 3));
  // the bulb: a fan of triangles from the centre
  const n = 36, pos = [], uv = [], col = [], idx = [];
  pos.push(BULB.cx, siteHeightAt(BULB.cx, BULB.cz) + 0.012, BULB.cz); uv.push(BULB.cx - 23.1, BULB.cz); col.push(1, 1, 1);
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; const x = BULB.cx + Math.cos(a) * BULB.r, z = BULB.cz + Math.sin(a) * BULB.r; pos.push(x, siteHeightAt(x, z) + 0.012, z); uv.push(x - 23.1, z); col.push(1, 1, 1); }
  for (let i = 1; i <= n; i++) idx.push(0, i + 1, i);
  const bulb = new THREE.BufferGeometry();
  bulb.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bulb.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bulb.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  bulb.setAttribute('aBounce', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1)); bulb.setIndex(idx); bulb.computeVertexNormals();
  geoms.push(bulb);
  return merge(geoms);
}

/** Concrete: driveway (with control joints via the texture), walk, porch slab, the step, pads; neighbours' driveways. */
function concreteGeometry() {
  const geoms = [];
  const c = rgb([1, 1, 1]);
  const slab = (x0, z0, x1, z1, dy = 0.015, nx = 6, nz = 4) => quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], { nx, ny: nz, color: c, vertexFn: (p) => { p[1] = siteHeightAt(p[0], p[2]) + dy; }, uvFn: (p) => [p[0], p[2]] });
  geoms.push(slab(DRIVEWAY.x0, DRIVEWAY.z0, DRIVEWAY.x1, DRIVEWAY.z1, 0.015, 12, 6));
  for (const w of WALK) geoms.push(slab(w.x0, w.z0, w.x1, w.z1, 0.02, 4, 2));
  // porch slab + the step (a solid block from grade to −0.15)
  geoms.push(boxAt(PORCH.x0, DIM.grade - 0.02, PORCH.z0, PORCH.x1 + 0.3, PORCH.y, PORCH.z1, { color: c }));
  geoms.push(boxAt(PORCH.x1 + 0.3, DIM.grade - 0.02, PORCH.z0 + 0.6, PORCH.x1 + 0.6, PORCH.y - 0.075, PORCH.z1 - 0.6, { color: mulRgb(c, 0.96) }));
  // the front threshold curb and the garage apron
  geoms.push(boxAt(SLAB.x1, DIM.grade - 0.05, 0.7, SLAB.x1 + 0.3, DIM.grade + 0.03, 6.0, { color: c }));
  // pads
  geoms.push(boxAt(CONDENSER.x0 - 0.2, DIM.grade - 0.05, CONDENSER.z0 - 0.2, CONDENSER.x1 + 0.2, DIM.grade + 0.05, CONDENSER.z1 + 0.2, { color: c }));
  // culvert headwalls where the driveway crosses the swale
  for (const z of [DRIVEWAY.z0 - 0.15, DRIVEWAY.z1 + 0.15]) geoms.push(boxAt(SWALE.x0, SWALE.bottomY - 0.1, z - 0.15, SWALE.x1, -0.4, z + 0.15, { color: mulRgb(c, 0.9) }));
  // storm inlets' aprons
  for (const [x, z] of SWALE.inlets) geoms.push(boxAt(x - 0.6, SWALE.bottomY - 0.05, z - 0.6, x + 0.4, SWALE.bottomY + 0.02, z + 0.6, { color: c }));
  // neighbours' driveways (their transformed local driveway rect) and porches
  for (const lot of lots) {
    if (lot.id === 'self') continue;
    const T = lotTransform(lot);
    const a = T.toWorld(DRIVEWAY.x0, DRIVEWAY.z0), b = T.toWorld(DRIVEWAY.x1, DRIVEWAY.z1);
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), z0 = Math.min(a[1], b[1]), z1 = Math.max(a[1], b[1]);
    geoms.push(slab(x0, z0, x1, z1, 0.02, 4, 4));
    const pa = T.toWorld(PORCH.x0, PORCH.z0), pb = T.toWorld(PORCH.x1 + 0.3, PORCH.z1);
    geoms.push(boxAt(Math.min(pa[0], pb[0]), DIM.grade - 0.02, Math.min(pa[1], pb[1]), Math.max(pa[0], pb[0]), PORCH.y, Math.max(pa[1], pb[1]), { color: c }));
  }
  return merge(geoms);
}

/**
 * @param {{mats:object, key?:number}} ctx
 * @returns {{group:THREE.Group, flood:THREE.Mesh, pond:{water:THREE.Mesh, bankY:number}, heightAt:Function, meshes:THREE.Mesh[]}}
 */
export function buildTerrain(ctx) {
  const { mats, key = 7 } = ctx;
  const group = new THREE.Group(); group.name = 'terrain';
  // near 0.5 m, mid 2 m, far 8 m (aligned so the holes match cell boundaries)
  const near = [-26, -16, 46, 36];
  const mid = [-100, -92, 76, 140];
  const gNear = groundGrid(near[0], near[1], near[2], near[3], 0.5, null, key);
  const gMid = groundGrid(mid[0], mid[1], mid[2], mid[3], 2, near, key + 1);
  const gFar = groundGrid(-420, -412, 420, 428, 8, mid, key + 2);
  const ground = staticMesh(merge([gNear, gMid, gFar]), mats.get('turf'), { name: 'ground', receiveShadow: true });
  group.add(ground);
  // mulch bed along the east foundation and around the porch
  const mulch = merge([
    quadY(DIM.grade + 0.02, SLAB.x1 + 0.02, 0.6, SLAB.x1 + 0.9, PORCH.z0, +1, { color: [1, 1, 1], uvOffset: [0, 0] }),
    quadY(DIM.grade + 0.02, SLAB.x1 + 0.02, PORCH.z1, SLAB.x1 + 0.9, 19.6, +1, { color: [1, 1, 1] }),
    quadY(DIM.grade + 0.02, 0.4, SLAB.z1 + 0.02, 10.5, SLAB.z1 + 0.8, +1, { color: [1, 1, 1] }),
  ]);
  group.add(staticMesh(mulch, mats.get('mulch'), { name: 'mulch' }));
  const street = staticMesh(streetGeometry(), mats.get('asphalt'), { name: 'street', receiveShadow: true });
  group.add(street);
  const concrete = staticMesh(concreteGeometry(), mats.get('concrete'), { name: 'concrete', receiveShadow: true });
  group.add(concrete);
  // the pond water plane (render swaps in its water shader; base y = −1.5, rises with local.pondRiseM)
  const pondW = POND.waterX - POND.farX, pondD = POND.z1 - POND.z0;
  const pond = new THREE.Mesh(new THREE.PlaneGeometry(pondW + 6, pondD + 12, 16, 16), mats.get('water'));
  pond.rotation.x = -Math.PI / 2; pond.position.set((POND.waterX + POND.farX) / 2, POND.waterY, (POND.z0 + POND.z1) / 2); pond.name = 'pondWater'; pond.renderOrder = 3;
  pond.userData = { kind: 'water', baseY: POND.waterY, maxRise: POND.maxRise };
  group.add(pond);
  // the flood plane over the street/swales/yards: below the swale bottom until render raises it
  const flood = new THREE.Mesh(new THREE.PlaneGeometry(150, 200, 30, 40), mats.variant('water', 'flood', { color: 0x4a4638, opacity: 0.8 }));
  flood.rotation.x = -Math.PI / 2; flood.position.set(15, SWALE.bottomY - 0.05, 30); flood.name = 'floodPlane'; flood.renderOrder = 3; flood.visible = false;
  flood.userData = { kind: 'water', baseY: SWALE.bottomY, hiddenBelow: SWALE.bottomY - 0.02 };
  group.add(flood);
  for (const m of group.children) { m.matrixAutoUpdate = false; m.updateMatrix(); }
  return { group, flood, pond: { water: pond, bankY: POND.bankY, waterY: POND.waterY }, ground, street, concrete, heightAt: siteHeightAt, isPaved, meshes: [ground, street, concrete, pond, flood] };
}
