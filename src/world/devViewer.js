/**
 * world/devViewer.js — a throwaway viewer for the world module alone (`dev/world.html?…`): its own
 * WebGLRenderer, a sky/sun/ambient light set (dev only — the real lights belong to render), a fly/orbit camera,
 * and `window.__world` for dev/shot.mjs. Not part of the game build.
 *   ?pos=x,y,z  ?look=x,y,z | ?yaw=deg&pitch=deg  ?room=<roomId>  ?fov=70  ?power=0|1  ?wet=0..1  ?wind=ms,deg
 *   ?open=door_id[,door_id]  ?pose=id:name[,id:name]  ?shutters=1 (panels placed)  ?accordion=0..1  ?garage=0..1
 *   ?seed=7  ?quality=low|high  ?night=1  ?wire=1
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { build, api as world, materials } from './index.js';
import { createRng } from '../core/rng.js';
import { roomCentre } from './plan.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);
const vec = (k) => (q.has(k) ? q.get(k).split(',').map(Number) : null);

const canvas = document.getElementById('gl') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'gl' }));
const hud = document.getElementById('hud') || document.body.appendChild(Object.assign(document.createElement('pre'), { id: 'hud' }));
const renderer = new THREE.WebGLRenderer({ canvas, antialias: q.get('quality') !== 'low', powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = num('exposure', 1.0);
renderer.shadowMap.enabled = q.get('shadows') !== '0';
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const night = q.get('night') === '1';
scene.background = new THREE.Color(night ? 0x0a0f18 : 0xa9c6e6);
scene.fog = new THREE.Fog(scene.background, 140, 420);
const hemi = new THREE.HemisphereLight(night ? 0x203048 : 0xbfd8ff, night ? 0x080808 : 0x6b6050, night ? 0.25 : 0.9);
const amb = new THREE.AmbientLight(0xffffff, night ? 0.05 : 0.12);
const sun = new THREE.DirectionalLight(night ? 0x334466 : 0xfff1d6, night ? 0.15 : 2.4);
sun.position.set(30, 45, -25); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -22; sun.shadow.camera.right = 22; sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22; sun.shadow.camera.near = 5; sun.shadow.camera.far = 140; sun.shadow.normalBias = 0.03; sun.shadow.bias = -0.0005;
sun.target.position.set(6, 0, 10);
scene.add(hemi, amb, sun, sun.target);
const roomLight = new THREE.PointLight(0xffd9a8, 0, 8, 1.5); scene.add(roomLight); // dev-only fill for room shots

const camera = new THREE.PerspectiveCamera(num('fov', 70), innerWidth / innerHeight, 0.05, 900);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.1;

let registry = null;
const ctx = { state: { meta: { seed: num('seed', 7), options: { service: q.get('service') || 'overhead' } } }, rng: createRng(num('seed', 7)), quality: q.get('quality') || 'high', debug: true };

function placeCamera(params = q) {
  const get = (k) => params instanceof URLSearchParams ? params.get(k) : params[k];
  const has = (k) => params instanceof URLSearchParams ? params.has(k) : params[k] != null;
  const v = (k) => (has(k) ? String(get(k)).split(',').map(Number) : null);
  const n = (k, d) => (has(k) ? Number(get(k)) : d);
  let pos = v('pos');
  const room = get('room');
  if (!pos && room) { const c = roomCentre(room) || [7, 0, 10]; pos = [c[0], (c[1] || 0) + n('eye', 1.6), c[2]]; }
  if (!pos) pos = [26, 6, 22];
  camera.position.set(pos[0], pos[1], pos[2]);
  const look = v('look');
  if (look) controls.target.set(look[0], look[1], look[2]);
  else {
    const yaw = n('yaw', room ? 0 : 200) * Math.PI / 180, pitch = n('pitch', room ? 0 : -12) * Math.PI / 180;
    // yaw: compass (0 = looking north = −z, 90 = east = +x)
    const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    controls.target.copy(camera.position).addScaledVector(d, 3);
  }
  if (has('fov')) { camera.fov = n('fov', 70); camera.updateProjectionMatrix(); }
  controls.update();
  if (room && registry) { const c = roomCentre(room); if (c) roomLight.position.set(c[0], 2.4, c[2]); roomLight.intensity = n('fill', 6); } else roomLight.intensity = 0;
}
function applyOptions(params = q) {
  const get = (k) => params instanceof URLSearchParams ? params.get(k) : params[k];
  const has = (k) => params instanceof URLSearchParams ? params.has(k) : params[k] != null;
  if (!registry) return;
  const u = materials.uniforms;
  if (has('power')) u.uPowerOn.value = Number(get('power'));
  if (has('wet')) u.uWet.value = Number(get('wet'));
  if (has('wind')) { const [ms, deg] = String(get('wind')).split(',').map(Number); const a = (deg || 0) * Math.PI / 180; u.uWind.value.set(Math.sin(a) * ms, 0, -Math.cos(a) * ms, 0); }
  if (has('open')) for (const id of String(get('open')).split(',')) { const [did, amt] = id.split(':'); registry.doors[did]?.userData.setOpen?.(amt != null ? Number(amt) : 1); }
  if (has('pose')) for (const pr of String(get('pose')).split(',')) { const [id, name] = pr.split(':'); const g = registry.props[id]; if (g) registry.applyPose(g, name); }
  if (has('shutters')) for (const [id, g] of Object.entries(registry.props)) if (g.userData.kind === 'panel') registry.applyPose(g, get('shutters') === '1' ? 'placed' : 'rack');
  if (has('accordion')) registry.openings.slider_great_W.shutter?.userData.setProgress?.(Number(get('accordion')));
  if (has('garage')) registry.doors.door_garage_roll?.userData.setOpen?.(Number(get('garage')));
  if (has('flood')) { registry.flood.visible = true; registry.flood.position.y = Number(get('flood')); }
  if (has('hide')) for (const name of String(get('hide')).split(',')) registry.root.traverse((o) => { if (o.name === name) o.visible = false; });
  if (has('wire')) registry.root.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material)) o.material.wireframe = get('wire') === '1'; });
}

let frames = 0, lastStats = null;
function stats() {
  const r = renderer.info.render;
  return { calls: r.calls, triangles: r.triangles, points: r.points, lines: r.lines, programs: renderer.info.programs?.length, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, world: registry?.stats || null, frames };
}
function hudText() {
  const s = lastStats; if (!s) return '';
  return `calls ${s.calls}  tris ${s.triangles}  programs ${s.programs}  |  world meshes ${s.world?.meshes} tris ${s.world?.triangles} build ${s.world?.buildMs} ms  |  cam ${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)}  room ${world.roomOf(camera.position)}`;
}
function frame() {
  controls.update();
  if (materials.uniforms) { materials.uniforms.uTime.value = performance.now() / 1000; materials.uniforms.uWind.value.w = performance.now() / 1000; }
  renderer.render(scene, camera);
  frames++;
  lastStats = stats();
  if (frames % 10 === 1) hud.textContent = hudText();
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
// WASD fly
const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });
setInterval(() => {
  const sp = keys.ShiftLeft ? 0.6 : 0.15;
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
  const mv = new THREE.Vector3();
  if (keys.KeyW) mv.add(dir); if (keys.KeyS) mv.sub(dir); if (keys.KeyD) mv.add(right); if (keys.KeyA) mv.sub(right); if (keys.KeyE) mv.y += 1; if (keys.KeyQ) mv.y -= 1;
  if (mv.lengthSq()) { mv.normalize().multiplyScalar(sp); camera.position.add(mv); controls.target.add(mv); }
}, 16);

(async () => {
  try {
    hud.textContent = 'building…';
    const built = await build(ctx);
    registry = built.registry;
    scene.add(built.root);
    placeCamera();
    applyOptions();
    window.__world = {
      registry, renderer, scene, camera, controls, stats, materials, api: world,
      view(params) { placeCamera(params); applyOptions(params); frames = 0; },
      ready: () => frames > 2,
    };
    renderer.compile(scene, camera);
    frame();
    await new Promise((r) => setTimeout(r, 50));
    window.__worldReady = true;
    console.log('[world] built', JSON.stringify(registry.stats));
  } catch (err) {
    console.error('[world] build failed', err);
    hud.textContent = 'build failed: ' + (err && err.stack || err);
    window.__worldError = String(err && err.stack || err);
  }
})();
