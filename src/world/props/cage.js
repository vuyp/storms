/**
 * world/props/cage.js — the mansard pool cage (6 main beams + purlins as one InstancedMesh, 24 screen panels
 * as one InstancedMesh with per-panel ids, the door is built in openings.js) and the pool (plaster shell,
 * waterline tile, coping, ladder, skimmer, light lens, the water plane render replaces) (DESIGN §3.3, §6.5;
 * T §10.5, §10.7). Owner: E4 world+textures. Writes no state.
 */
import * as THREE from 'three';
import { box, boxAt, cyl, plane, place, rgb, merge, quadX, quadZ, quadY, ensureAttrs } from '../build/geo.js';
import { CAGE, POOL, LANAI, DIM, roofs, fixtures } from '../plan.js';
import { CAGE_PANELS } from '../../core/ids.js';

const H = Math.PI / 2;

/**
 * @returns {{group:THREE.Group, beams:THREE.InstancedMesh, panels:THREE.InstancedMesh, panelIds:string[], colliders:number[][]}}
 */
export function buildCage(ctx) {
  const { mats } = ctx;
  const group = new THREE.Group(); group.name = 'cage';
  const alu = rgb([0.86, 0.87, 0.85]);
  const x0 = CAGE.x0, x1 = CAGE.x1, z0 = CAGE.z0, z1 = CAGE.z1, y0 = CAGE.y;
  const hOut = y0 + CAGE.hOuter, hTop = DIM.eaveY - 0.02; // 2.45 … 3.03
  const xM = CAGE.mansardX; // the mansard knee: flat top from xM to the house fascia, slope from x0 to xM
  const fasciaX = roofs.find(r => r.id === 'A').x0 - 0.6; // −3.6, the lanai fascia
  // ---- beams: 2×2 in. extrusions as instanced boxes (unit box scaled per instance) ----
  const beamList = []; // [x,y,z, length, yaw, pitch]
  const add = (a, b, size = 0.05) => beamList.push({ a, b, size });
  // posts along the west wall (6 mains), corner posts, N/S wall posts
  const postsX = [];
  for (let i = 0; i <= 8; i++) postsX.push(z0 + (z1 - z0) * i / 8);
  for (const z of postsX) add([x0, y0, z], [x0, hOut, z], 0.05);
  for (let i = 0; i <= 6; i++) { const x = x0 + (x1 - x0) * i / 6; if (x >= fasciaX - 0.01) continue; const hh = x <= xM ? hOut + (hTop - hOut) * (x - x0) / (xM - x0) : hTop; add([x, y0, z0], [x, hh, z0], 0.05); add([x, y0, z1], [x, hh, z1], 0.05); }
  // top rails: outer beam along the west edge at hOut, the knee rail at hTop, the fascia attachment rail
  add([x0, hOut, z0], [x0, hOut, z1], 0.07); add([xM, hTop, z0], [xM, hTop, z1], 0.07); add([fasciaX, hTop, z0], [fasciaX, hTop, z1], 0.05);
  add([x0, hOut, z0], [xM, hTop, z0], 0.07); add([x0, hOut, z1], [xM, hTop, z1], 0.07); add([xM, hTop, z0], [fasciaX, hTop, z0], 0.05); add([xM, hTop, z1], [fasciaX, hTop, z1], 0.05);
  // roof purlins (N–S) every 2.25 m along the span, following the mansard
  for (let i = 1; i < 4; i++) { const x = x0 + (fasciaX - x0) * i / 4; const hh = x <= xM ? hOut + (hTop - hOut) * (x - x0) / (xM - x0) : hTop; add([x, hh, z0], [x, hh, z1], 0.05); }
  // roof rafters (E–W) at each west post
  for (const z of postsX) { add([x0, hOut, z], [xM, hTop, z], 0.05); add([xM, hTop, z], [fasciaX, hTop, z], 0.04); }
  // bottom rails (the "kick plate" rail at 0.6 m)
  add([x0, y0 + 0.6, z0], [x0, y0 + 0.6, z1], 0.04); add([x0, y0 + 0.6, z0], [fasciaX + 0.6, y0 + 0.6, z0], 0.04); add([x0, y0 + 0.6, z1], [fasciaX + 0.6, y0 + 0.6, z1], 0.04);
  const beamGeom = ensureAttrs(new THREE.BoxGeometry(1, 1, 1), { color: [1, 1, 1] });
  const beams = new THREE.InstancedMesh(beamGeom, mats.get('alu'), beamList.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), tmp = new THREE.Matrix4();
  const colliders = [];
  beamList.forEach(({ a, b, size }, i) => {
    dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = dir.length(); dir.normalize();
    p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    // rotate the box's +y to `dir`
    q.setFromUnitVectors(up, dir);
    s.set(size, len, size);
    m.compose(p, q, s); beams.setMatrixAt(i, m);
    beams.setColorAt(i, new THREE.Color(alu[0], alu[1], alu[2]));
    if (Math.abs(dir.y) > 0.9 && len > 1) colliders.push([p.x - 0.05, a[1], p.z - 0.05, p.x + 0.05, b[1], p.z + 0.05]);
  });
  beams.instanceMatrix.needsUpdate = true; beams.name = 'cageBeams'; beams.castShadow = true; beams.computeBoundingSphere();
  group.add(beams);
  // ---- screen panels: unit plane (1×1, 8×8 segments so render can bulge them), scaled per panel ----
  const panelGeom = new THREE.PlaneGeometry(1, 1, 8, 8);
  ensureAttrs(panelGeom, { color: [1, 1, 1], flex: 0.35 });
  const pf = panelGeom.attributes.aFlex; const pp = panelGeom.attributes.position;
  for (let i = 0; i < pp.count; i++) pf.setX(i, 0.15 + 0.5 * (1 - Math.max(Math.abs(pp.getX(i)), Math.abs(pp.getY(i))) * 2)); // centre flexes most
  const uv = panelGeom.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.5, uv.getY(i) * 2.6);
  const panels = new THREE.InstancedMesh(panelGeom, mats.get('screen'), CAGE_PANELS.length);
  const panelIds = [];
  const e = new THREE.Euler();
  let k = 0;
  const setPanel = (id, cx, cy, cz, w, h, yaw, pitch = 0) => {
    p.set(cx, cy, cz); e.set(pitch, yaw, 0); q.setFromEuler(e); s.set(w, h, 1); m.compose(p, q, s); panels.setMatrixAt(k, m); panelIds.push(id); k++;
  };
  // W wall: 8 panels of 1.5 × 2.6, plane normal −x → yaw −90° (plane's +z → −x)
  for (let i = 0; i < 8; i++) setPanel(`cageW_${i + 1}`, x0, y0 + CAGE.hOuter / 2, z0 + 1.5 * (i + 0.5), 1.5, CAGE.hOuter, -H);
  // N and S walls: 6 panels each across x0..fasciaX (5.4 m → 0.9 wide) — the wall panels follow the mansard height
  const span = fasciaX - x0, pw = span / 6;
  for (let i = 0; i < 6; i++) {
    const cx = x0 + pw * (i + 0.5);
    const hh = cx <= xM ? CAGE.hOuter + (hTop - hOut) * (cx - x0) / (xM - x0) : hTop - y0;
    setPanel(`cageN_${i + 1}`, cx, y0 + hh / 2, z0, pw, hh, Math.PI);
    setPanel(`cageS_${i + 1}`, cx, y0 + hh / 2, z1, pw, hh, 0);
  }
  // roof strips: 4 strips across the 5.4-m span, running N–S (12 m long): strip 1 is the mansard slope
  const stripW = span / 4;
  for (let i = 0; i < 4; i++) {
    const xa = x0 + stripW * i, xb = xa + stripW;
    const ya = xa <= xM ? hOut + (hTop - hOut) * (xa - x0) / (xM - x0) : hTop, yb = xb <= xM ? hOut + (hTop - hOut) * (xb - x0) / (xM - x0) : hTop;
    const cx = (xa + xb) / 2, cy = (ya + yb) / 2;
    const pitch = -Math.atan2(yb - ya, xb - xa); // tilt about z... the plane faces +y after rotX(−90°); tilt for the slope
    const len = Math.hypot(xb - xa, yb - ya);
    // plane: +z → +y (rotX −90°), then rotate about z by the slope, width along x = len, height along z = 12
    p.set(cx, cy, (z0 + z1) / 2); e.set(-H, 0, pitch, 'ZYX'); q.setFromEuler(e); s.set(len, z1 - z0, 1); m.compose(p, q, s); panels.setMatrixAt(k, m); panelIds.push(`cageR_${i + 1}`); k++;
  }
  panels.count = k; panels.instanceMatrix.needsUpdate = true; panels.name = 'cagePanels'; panels.castShadow = false; panels.receiveShadow = false; panels.frustumCulled = false;
  panels.userData = { panelIds, kind: 'cagePanels' };
  group.add(panels);
  // ---- the pool ----
  const pool = buildPool(ctx);
  group.add(pool.group);
  return { group, beams, panels, panelIds, colliders, pool };
}

export function buildPool(ctx) {
  const { mats } = ctx;
  const g = new THREE.Group(); g.name = 'pool';
  const x0 = POOL.x0, x1 = POOL.x1, z0 = POOL.z0, z1 = POOL.z1, deck = POOL.deckY;
  const dS = POOL.depthShallow, dD = POOL.depthDeep;
  const plaster = rgb([0.86, 0.9, 0.9]);
  const geoms = [];
  // floor: sloping from the shallow end (z0) to the deep end (z1)
  geoms.push(quadY(0, x0, z0, x1, z1, +1, { nx: 4, ny: 8, color: plaster, vertexFn: (p, n, u, v, out) => { p[1] = deck - dS - (dD - dS) * ((p[2] - z0) / (z1 - z0)); } }));
  // walls (inward-facing)
  const wallTint = plaster;
  geoms.push(quadX(x0, z0, deck - dD - 0.02, z1, deck, +1, { nx: 8, ny: 3, color: wallTint, vertexFn: (p) => { const t = (p[2] - z0) / (z1 - z0); const floorY = deck - dS - (dD - dS) * t; if (p[1] < floorY) p[1] = floorY; } }));
  geoms.push(quadX(x1, z0, deck - dD - 0.02, z1, deck, -1, { nx: 8, ny: 3, color: wallTint, vertexFn: (p) => { const t = (p[2] - z0) / (z1 - z0); const floorY = deck - dS - (dD - dS) * t; if (p[1] < floorY) p[1] = floorY; } }));
  geoms.push(quadZ(z0, x0, deck - dS, x1, deck, +1, { nx: 4, ny: 2, color: wallTint }));
  geoms.push(quadZ(z1, x0, deck - dD, x1, deck, -1, { nx: 4, ny: 3, color: wallTint }));
  const shell = new THREE.Mesh(merge(geoms), mats.get('bathTile')); shell.name = 'poolShell'; shell.receiveShadow = true;
  g.add(shell);
  // waterline tile band (0.15 m below the coping) and the coping ring
  const wl = merge([
    quadX(x0 + 0.005, z0, deck - 0.16, z1, deck - 0.01, +1, { color: [1, 1, 1] }), quadX(x1 - 0.005, z0, deck - 0.16, z1, deck - 0.01, -1, { color: [1, 1, 1] }),
    quadZ(z0 + 0.005, x0, deck - 0.16, x1, deck - 0.01, +1, { color: [1, 1, 1] }), quadZ(z1 - 0.005, x0, deck - 0.16, x1, deck - 0.01, -1, { color: [1, 1, 1] }),
  ]);
  g.add(Object.assign(new THREE.Mesh(wl, mats.get('waterline')), { name: 'waterline' }));
  const cop = rgb([0.9, 0.87, 0.8]);
  const coping = merge([
    boxAt(x0 - 0.3, deck, z0 - 0.3, x1 + 0.3, deck + 0.03, z0, { color: cop }), boxAt(x0 - 0.3, deck, z1, x1 + 0.3, deck + 0.03, z1 + 0.3, { color: cop }),
    boxAt(x0 - 0.3, deck, z0, x0, deck + 0.03, z1, { color: cop }), boxAt(x1, deck, z0, x1 + 0.3, deck + 0.03, z1, { color: cop }),
  ]);
  g.add(Object.assign(new THREE.Mesh(coping, mats.get('concrete')), { name: 'coping', receiveShadow: true }));
  // ladder at the deep end, a skimmer lid, the light niche on the east wall
  const chrome = rgb([0.85, 0.86, 0.88]);
  const ladder = merge([
    place(cyl(0.02, 0.02, 1.6, 8, { color: chrome }), x1 - 0.5, deck - 0.5, z1 - 0.3), place(cyl(0.02, 0.02, 1.6, 8, { color: chrome }), x1 - 0.5, deck - 0.5, z1 - 0.7),
    place(cyl(0.02, 0.02, 0.4, 8, { color: chrome }), x1 - 0.5, deck - 0.4, z1 - 0.5, 0, H, 0), place(cyl(0.02, 0.02, 0.4, 8, { color: chrome }), x1 - 0.5, deck - 0.8, z1 - 0.5, 0, H, 0),
    place(cyl(0.02, 0.02, 0.4, 8, { color: chrome }), x1 - 0.5, deck - 1.2, z1 - 0.5, 0, H, 0),
    place(cyl(0.02, 0.02, 0.7, 8, { color: chrome }), x1 + 0.1, deck + 0.35, z1 - 0.3), place(cyl(0.02, 0.02, 0.7, 8, { color: chrome }), x1 + 0.1, deck + 0.35, z1 - 0.7),
    place(cyl(0.02, 0.02, 0.6, 8, { color: chrome }), x1 - 0.2, deck + 0.7, z1 - 0.3, 0, 0, H), place(cyl(0.02, 0.02, 0.6, 8, { color: chrome }), x1 - 0.2, deck + 0.7, z1 - 0.7, 0, 0, H),
  ]);
  g.add(Object.assign(new THREE.Mesh(ladder, mats.get('chrome')), { name: 'ladder' }));
  g.add(Object.assign(new THREE.Mesh(place(cyl(0.12, 0.12, 0.02, 14, { color: [0.9, 0.9, 0.88] }), x1 + 0.2, deck + 0.04, z0 + 1.5), mats.get('matte')), { name: 'skimmer' }));
  const light = new THREE.Mesh(cyl(0.12, 0.12, 0.03, 14, { color: [1, 1, 1] }), mats.variant('glowCool', 'fix_pool', { emissive: 0xbfe0ff }));
  light.position.set(x1 - 0.02, fixtures.fix_pool.pos[1], fixtures.fix_pool.pos[2]); light.rotation.z = H; light.name = 'glow:fix_pool';
  g.add(light);
  // the water plane (render swaps the material for its water shader and raises/lowers it with house.pool.levelM)
  const water = new THREE.Mesh(plane(x1 - x0, z1 - z0, 8, 16, { color: [1, 1, 1] }), mats.get('poolWater'));
  water.rotation.x = -H; water.position.set((x0 + x1) / 2, POOL.waterY, (z0 + z1) / 2); water.name = 'poolWater'; water.renderOrder = 3; water.receiveShadow = false;
  water.userData = { kind: 'water', baseY: POOL.waterY };
  g.add(water);
  return { group: g, shell, water, light, box: [x0, deck - dD, z0, x1, deck, z1] };
}
