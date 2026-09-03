/**
 * textures/materials.js — the MeshStandardMaterial set for the whole world plus the shared uniforms
 * `{uWind, uWet, uPowerOn, uFlash, uTime}` (ARCHITECTURE §6.6, §9 "Shared uniforms"; T §10.4, §10.8, §7 #6).
 * Owner: E4 world+textures. Writes no state; render (E5) writes the uniform values each frame.
 *
 * One `onBeforeCompile` closure patches every material; the features are compile-time defines so variants with
 * the same define set share a program (`customProgramCacheKey` is constant; three folds the defines into the key):
 *   USE_FLEX   — wind bend along `uWind.xyz` (world space, applied after the model/instance transform) scaled by the
 *                per-vertex `aFlex` attribute (0 trunk … 1 tip) — vegetation, screen mesh, flags, tarps.
 *   USE_WET    — `uWet` lowers roughness ×0.25 and darkens albedo ×0.65 on upward-facing exterior surfaces.
 *   USE_BOUNCE — the vertex-baked fixture bounce `aBounce` (floors/walls/ceilings) added as warm indirect light × uPowerOn.
 *   USE_POWERGLOW — the material's emissive is scaled by uPowerOn (fixture lenses, streetlight heads, the fountain).
 * Budget: ≤ 40 programs for the scene (ARCHITECTURE §10); this set compiles to ≈ 14 distinct programs.
 */
import * as THREE from 'three';
import * as tex from './index.js';

const CACHE_KEY = 'fls-world-1';

const VERT_PARS = /* glsl */`
uniform vec4 uWind;
uniform float uTime;
#ifdef USE_FLEX
  attribute float aFlex;
#endif
#ifdef USE_BOUNCE
  attribute float aBounce;
  varying float vBounce;
#endif
#ifdef USE_WET
  varying float vWorldNy;
#endif
`;
const VERT_BEGIN = /* glsl */`
#include <begin_vertex>
vec3 flsBend = vec3(0.0);
#ifdef USE_BOUNCE
  vBounce = aBounce;
#endif
#ifdef USE_FLEX
{
  float g = length(uWind.xyz);
  vec3 base = vec3(modelMatrix[3].x, 0.0, modelMatrix[3].z);
  #ifdef USE_INSTANCING
    base += vec3(instanceMatrix[3].x, 0.0, instanceMatrix[3].z);
  #endif
  float phase = uWind.w * (1.5 + g * 0.08) + dot(base.xz, vec2(0.7, 1.3));
  float sway = g * 0.012 * (1.0 + 0.5 * sin(phase) + 0.25 * sin(phase * 2.7 + 1.0) + 0.15 * sin(phase * 5.3 + aFlex * 4.0));
  vec3 dir = uWind.xyz / max(g, 0.001);
  float f2 = aFlex * aFlex;
  flsBend = dir * sway * f2;
  flsBend.y -= length(flsBend) * 0.35 * aFlex;
}
#endif
`;
const VERT_NORMAL = /* glsl */`
#include <beginnormal_vertex>
#ifdef USE_WET
{
  vec3 wN = objectNormal;
  #ifdef USE_INSTANCING
    wN = mat3(instanceMatrix) * wN;
  #endif
  vWorldNy = normalize(mat3(modelMatrix) * wN).y;
}
#endif
`;
const VERT_PROJECT = /* glsl */`
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelMatrix * mvPosition;
mvPosition.xyz += flsBend;
mvPosition = viewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
`;
const VERT_WORLDPOS = /* glsl */`
#include <worldpos_vertex>
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
  worldPosition.xyz += flsBend;
#endif
`;
const FRAG_PARS = /* glsl */`
uniform float uWet;
uniform float uPowerOn;
uniform float uFlash;
#ifdef USE_BOUNCE
  varying float vBounce;
#endif
#ifdef USE_WET
  varying float vWorldNy;
#endif
`;
const FRAG_ROUGH = /* glsl */`
#include <roughnessmap_fragment>
#ifdef USE_WET
{
  float wetUp = smoothstep(0.15, 0.85, vWorldNy);
  float wetF = uWet * mix(0.3, 1.0, wetUp);
  roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.25, wetF);
  diffuseColor.rgb *= 1.0 - 0.35 * wetF;
}
#endif
`;
const FRAG_EMISSIVE = /* glsl */`
#include <emissivemap_fragment>
#ifdef USE_POWERGLOW
  totalEmissiveRadiance *= uPowerOn;
#endif
`;
const FRAG_AO = /* glsl */`
#include <aomap_fragment>
#ifdef USE_BOUNCE
  reflectedLight.indirectDiffuse += diffuseColor.rgb * vBounce * uPowerOn * vec3(1.0, 0.86, 0.66) * 0.9;
#endif
`;

/**
 * @param {{quality?:string}} [opts]
 */
export function createMaterials({ quality = 'auto' } = {}) {
  const uniforms = {
    uWind: { value: new THREE.Vector4(0, 0, 0, 0) },
    uWet: { value: 0 },
    uPowerOn: { value: 1 },
    uFlash: { value: 0 },
    uTime: { value: 0 },
  };
  /** @type {Map<string, THREE.Material>} */
  const cache = new Map();

  function onBeforeCompile(shader) {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <beginnormal_vertex>', VERT_NORMAL)
      .replace('#include <begin_vertex>', VERT_BEGIN)
      .replace('#include <project_vertex>', VERT_PROJECT)
      .replace('#include <worldpos_vertex>', VERT_WORLDPOS);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <roughnessmap_fragment>', FRAG_ROUGH)
      .replace('#include <emissivemap_fragment>', FRAG_EMISSIVE)
      .replace('#include <aomap_fragment>', FRAG_AO);
  }
  const cacheKey = () => CACHE_KEY;

  /** Patch any MeshStandard/Physical material with the shared injection and feature defines. */
  function patch(mat, { flex = false, wet = false, bounce = false, glow = false } = {}) {
    mat.defines = mat.defines || {};
    if (flex) mat.defines.USE_FLEX = '';
    if (wet) mat.defines.USE_WET = '';
    if (bounce) mat.defines.USE_BOUNCE = '';
    if (glow) mat.defines.USE_POWERGLOW = '';
    mat.onBeforeCompile = onBeforeCompile;
    mat.customProgramCacheKey = cacheKey;
    mat.userData.fls = { flex, wet, bounce, glow };
    return mat;
  }

  const std = (props, flags = {}) => patch(new THREE.MeshStandardMaterial(props), flags);
  const T = (n) => tex.get(n);
  const NS = (s) => new THREE.Vector2(s, s);

  /** Material definitions (lazy). Names are referenced by the builders. */
  const DEFS = {
    // ---- the house shell ----
    stucco: () => std({ map: T('stucco'), normalMap: T('stucco:normal'), normalScale: NS(0.6), roughness: 0.92, vertexColors: true, color: 0xffffff }, { wet: true }),
    block: () => std({ map: T('block'), normalMap: T('block:normal'), normalScale: NS(0.7), roughnessMap: T('block:rough'), roughness: 1, vertexColors: true }, { bounce: true }),
    drywall: () => std({ map: T('drywall'), normalMap: T('drywall:normal'), normalScale: NS(0.35), roughness: 0.86, vertexColors: true }, { bounce: true }),
    paint: () => std({ map: T('grime'), roughness: 0.5, vertexColors: true }, { bounce: true, wet: true }),
    tile: () => std({ map: T('porcelain'), normalMap: T('porcelain:normal'), normalScale: NS(0.5), roughnessMap: T('porcelain:rough'), roughness: 1, vertexColors: true }, { bounce: true }),
    carpet: () => std({ map: T('carpet'), roughness: 0.97, vertexColors: true }, { bounce: true }),
    garageFloor: () => std({ map: T('garageFloor'), roughness: 0.6, vertexColors: true }, { bounce: true, wet: true }),
    bathTile: () => std({ map: T('bathTile'), normalMap: T('bathTile:normal'), normalScale: NS(0.4), roughnessMap: T('bathTile:rough'), roughness: 1, vertexColors: true }, { bounce: true }),
    waterline: () => std({ map: T('waterline'), roughnessMap: T('waterline:rough'), roughness: 1, vertexColors: true }),
    // ---- exterior ----
    concrete: () => std({ map: T('concrete'), normalMap: T('concrete:normal'), normalScale: NS(0.4), roughness: 0.88, vertexColors: true }, { wet: true }),
    pavers: () => std({ map: T('pavers'), normalMap: T('pavers:normal'), normalScale: NS(0.6), roughnessMap: T('pavers:rough'), roughness: 1, vertexColors: true }, { wet: true, bounce: true }),
    shingle: () => std({ map: T('shingle'), normalMap: T('shingle:normal'), normalScale: NS(0.7), roughness: 0.96, vertexColors: true }, { wet: true }),
    shingleBrown: () => std({ map: T('shingleBrown'), normalMap: T('shingleBrown:normal'), normalScale: NS(0.7), roughness: 0.96, vertexColors: true }, { wet: true }),
    felt: () => std({ map: T('felt'), roughness: 0.9 }, { wet: true }),
    soffit: () => std({ map: T('soffit'), normalMap: T('soffit:normal'), normalScale: NS(0.5), roughness: 0.55, vertexColors: true }, { wet: true }),
    asphalt: () => std({ map: T('asphalt'), roughness: 0.92, vertexColors: true }, { wet: true }),
    turf: () => std({ map: T('turf'), roughness: 0.9, vertexColors: true }, { wet: true }),
    mulch: () => std({ map: T('mulch'), roughness: 0.95, vertexColors: true }, { wet: true }),
    dirt: () => std({ map: T('dirt'), roughness: 0.95, vertexColors: true }, { wet: true }),
    // ---- props ----
    wood: () => std({ map: T('wood'), normalMap: T('wood:normal'), normalScale: NS(0.35), roughness: 0.55, vertexColors: true }),
    granite: () => std({ map: T('granite'), roughness: 0.28, vertexColors: true }),
    fabric: () => std({ map: T('fabric'), normalMap: T('fabric:normal'), normalScale: NS(0.3), roughness: 0.96, vertexColors: true }),
    matte: () => std({ map: T('grime'), roughness: 0.65, vertexColors: true }),
    matteWet: () => std({ map: T('grime'), roughness: 0.65, vertexColors: true }, { wet: true }),
    gloss: () => std({ roughness: 0.28, metalness: 0.05, vertexColors: true }),
    glossWet: () => std({ roughness: 0.28, metalness: 0.05, vertexColors: true }, { wet: true }),
    metal: () => std({ map: T('brushed'), roughnessMap: T('brushed:rough'), roughness: 1, metalness: 0.92, vertexColors: true }),
    alu: () => std({ roughness: 0.42, metalness: 0.65, vertexColors: true }, { wet: true }),
    chrome: () => std({ roughness: 0.15, metalness: 1.0, vertexColors: true }),
    rubber: () => std({ roughness: 0.95, metalness: 0, vertexColors: true }),
    shutterAl: () => std({ map: T('panelAtlas'), normalMap: T('panelAtlas:normal'), normalScale: NS(0.8), roughness: 0.48, metalness: 0.55 }, { wet: true }),
    corrugated: () => std({ map: T('corrugated'), normalMap: T('corrugated:normal'), normalScale: NS(0.8), roughness: 0.5, metalness: 0.55, vertexColors: true }, { wet: true }),
    garageDoor: () => std({ map: T('garageDoor'), normalMap: T('garageDoor:normal'), normalScale: NS(0.6), roughness: 0.55, metalness: 0.1 }, { wet: true }),
    // ---- foliage (alphaTest, two-sided, wind flex) ----
    screen: () => std({ map: T('screen'), alphaTest: 0.3, transparent: false, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.2, color: 0xffffff, depthWrite: true }, { flex: true, wet: true }),
    frondSabal: () => std({ map: T('frondSabal'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }, { flex: true, wet: true }),
    frondQueen: () => std({ map: T('frondQueen'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }, { flex: true, wet: true }),
    frondFoxtail: () => std({ map: T('frondFoxtail'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }, { flex: true, wet: true }),
    frondRoyal: () => std({ map: T('frondRoyal'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }, { flex: true, wet: true }),
    leafOak: () => std({ map: T('leafOak'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }, { flex: true, wet: true }),
    leafHedge: () => std({ map: T('leafHedge'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 }, { flex: true, wet: true }),
    leafFicus: () => std({ map: T('leafFicus'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 }, { flex: true, wet: true }),
    barkSabal: () => std({ map: T('barkSabal'), roughness: 0.95, vertexColors: true }, { wet: true }),
    barkRing: () => std({ map: T('barkRing'), roughness: 0.85, vertexColors: true }, { wet: true }),
    barkOak: () => std({ map: T('barkOak'), roughness: 0.95, vertexColors: true }, { wet: true }),
    cloth: () => std({ roughness: 0.9, side: THREE.DoubleSide, vertexColors: true }, { flex: true, wet: true }),
    flag: () => std({ map: T('flag'), roughness: 0.9, side: THREE.DoubleSide }, { flex: true, wet: true }),
    // ---- glass / water / glow ----
    glass: () => { const m = new THREE.MeshPhysicalMaterial({ color: 0xbfc9c4, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, ior: 1.5, specularIntensity: 1, envMapIntensity: 1, side: THREE.DoubleSide, depthWrite: false }); m.userData.fls = {}; return m; },
    glassObscure: () => { const m = new THREE.MeshPhysicalMaterial({ color: 0xdde6e2, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.6, ior: 1.5, side: THREE.DoubleSide, depthWrite: false }); m.userData.fls = {}; return m; },
    water: () => { const m = new THREE.MeshStandardMaterial({ color: 0x3a5a4a, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false }); m.userData.fls = {}; return m; },
    poolWater: () => { const m = new THREE.MeshStandardMaterial({ color: 0x2a8fbf, roughness: 0.06, metalness: 0.05, transparent: true, opacity: 0.72, depthWrite: false }); m.userData.fls = {}; return m; },
    glow: () => std({ color: 0xfff4e0, emissive: 0xffd9a8, emissiveIntensity: 2.2, roughness: 0.6, vertexColors: false }, { glow: true }),
    glowCool: () => std({ color: 0xf2f6ff, emissive: 0xdfe8ff, emissiveIntensity: 2.4, roughness: 0.6 }, { glow: true }),
    ledBlue: () => std({ color: 0x224488, emissive: 0x3a7bff, emissiveIntensity: 1.5, roughness: 0.5 }, { glow: true }),
    candleGlow: () => std({ color: 0xffe0b0, emissive: 0xffa64d, emissiveIntensity: 1.6, roughness: 0.7 }),
    // ---- labels ----
    notepad: () => std({ map: T('notepad'), roughness: 0.9 }),
    waterCase: () => std({ map: T('waterCase'), roughness: 0.4 }),
    chart: () => std({ map: T('chart'), roughness: 0.9 }),
    letter: () => std({ map: T('letter'), roughness: 0.9 }),
    boxLabel: () => std({ map: T('boxLabel'), roughness: 0.9 }),
    canLabel: () => std({ map: T('canLabel'), roughness: 0.5 }),
    poolToy: () => std({ map: T('poolToy'), roughness: 0.4 }),
    houseNumber: () => std({ map: T('houseNumber'), roughness: 0.5 }),
    stopSign: () => std({ map: T('stopSign'), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4 }, { wet: true }),
    hoaSign: () => std({ map: T('hoaSign'), roughness: 0.6 }, { wet: true }),
    truckDecal: () => std({ map: T('truckDecal'), roughness: 0.5 }),
    screenOff: () => { const m = new THREE.MeshBasicMaterial({ map: T('screenOff'), toneMapped: false }); m.userData.fls = {}; return m; },
  };

  function get(name) {
    let m = cache.get(name);
    if (!m) {
      const def = DEFS[name];
      if (!def) throw new Error(`materials: unknown material '${name}'`);
      m = def(); m.name = name; cache.set(name, m);
    }
    return m;
  }
  /** A named variant of a base material (shares maps and the program): e.g. per-neighbour stucco colours. */
  function variant(base, id, overrides = {}) {
    const key = `${base}#${id}`;
    let m = cache.get(key);
    if (!m) {
      const b = get(base);
      m = b.clone();
      m.defines = { ...(b.defines || {}) };
      m.onBeforeCompile = onBeforeCompile; m.customProgramCacheKey = cacheKey;
      m.userData.fls = { ...(b.userData.fls || {}) };
      Object.assign(m, overrides);
      m.name = key; cache.set(key, m);
    }
    return m;
  }
  /** A fresh screen material for a device canvas (devices draw into `canvas`; the texture is theirs to flag). */
  function screenMaterial(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    m.userData.fls = {};
    return { material: m, texture: t };
  }

  return {
    uniforms, get, variant, patch, screenMaterial, all: cache,
    names: () => Object.keys(DEFS),
    info: () => ({ materials: cache.size }),
    dispose: () => { for (const m of cache.values()) m.dispose(); cache.clear(); },
  };
}
