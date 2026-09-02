/**
 * main.js — bootstrap (ARCHITECTURE §12.2–12.3): URL parameters → state → modules → loop; window.__sim for the harness.
 * Owner: E1 core. Modules are discovered from ./<name>/index.js so a missing module simply does not run.
 */
import * as THREE from 'three';
import { createState, DAY_START_0 } from './core/state.js';
import { createBus } from './core/bus.js';
import { createRng } from './core/rng.js';
import { createClock, formatClock } from './core/clock.js';
import { createSleep } from './core/sleep.js';
import { createInput } from './core/input.js';
import { runFrame, advanceTo, advanceUntil, advanceSim } from './core/loop.js';
import { stateHash } from './core/hash.js';
import { createDebug } from './core/debug.js';
import { createCoreApi } from './core/api.js';
import { viewFor, OWNERSHIP } from './core/guard.js';
import { detectQuality } from './core/quality.js';
import { EV } from './core/events.js';
import { PRESETS, resolvePreset, scenarioStart } from './scenario/presets.js';
import { ROOM_IDS, STORM_NAMES } from './core/ids.js';

const MODULE_LOADERS = import.meta.glob('./*/index.js');
const INIT_ORDER = ['world', 'storm', 'utilities', 'house', 'hood', 'alerts', 'objects', 'player', 'life', 'details', 'scenario', 'devices', 'render', 'audio', 'ui'];

function parseParams() {
  const q = new URLSearchParams(location.search);
  const num = (k, d) => (q.has(k) && q.get(k) !== '' && !Number.isNaN(Number(q.get(k)))) ? Number(q.get(k)) : d;
  const bool = (k, d = false) => q.has(k) ? !['0', 'false', 'no'].includes(q.get(k)) : d;
  return {
    seed: num('seed', 7) >>> 0, preset: q.get('preset') || 'leah-ref', name: q.get('name') || 'Leah',
    offset: num('offset', undefined), vt: num('vt', undefined), hour: num('hour', undefined),
    t: num('t', undefined), sim: num('sim', undefined), pos: q.get('pos') || null, yaw: num('yaw', undefined), pitch: num('pitch', undefined),
    speed: num('speed', undefined), quality: q.get('quality') || 'auto', headless: bool('headless'), script: q.get('script') || null,
    stub: bool('stub'), pet: q.get('pet') || undefined, braced: q.has('braced') ? bool('braced') : undefined,
    service: q.get('service') || undefined, photosens: bool('photosens'), debug: bool('debug'), pacing: q.get('pacing') || undefined,
    start: bool('start') || bool('headless') || q.has('t') || q.has('sim'), noaudio: bool('noaudio'), strict: bool('strict'),
    impact: q.has('impact') ? bool('impact') : undefined, canal: q.has('canal') ? bool('canal') : undefined,
  };
}

const boot = { el: null, bar: null, msg: null };
function bootMsg(text, frac) {
  if (!boot.el) { boot.el = document.getElementById('boot'); boot.bar = document.getElementById('bootbar'); boot.msg = document.getElementById('bootmsg'); }
  if (boot.msg) boot.msg.textContent = text;
  if (boot.bar && frac != null) boot.bar.style.width = `${Math.round(frac * 100)}%`;
}

async function loadModules() {
  const mods = {};
  const entries = Object.entries(MODULE_LOADERS);
  let i = 0;
  for (const [path, loader] of entries) {
    const name = path.split('/')[1];
    if (name === 'core' || name === 'scenario' && false) continue;
    bootMsg(`Loading ${name}…`, 0.05 + 0.25 * (i++ / Math.max(1, entries.length)));
    try { mods[name] = await loader(); }
    catch (err) { console.error(`[main] module ${name} failed to load`, err); mods[name] = null; }
  }
  return mods;
}

export async function createApp(params) {
  const options = {};
  if (params.offset != null) options.trackOffsetKm = params.offset;
  if (params.vt != null) options.forwardSpeedKmh = params.vt;
  if (params.hour != null) options.landfallHour = params.hour;
  if (params.pet) options.pet = params.pet;
  if (params.braced != null) options.bracedGarageKitInstalled = params.braced;
  if (params.service) options.service = params.service;
  if (params.pacing) options.pacing = params.pacing;
  if (params.impact != null) options.impactWindows = params.impact;
  if (params.canal != null) options.canalFront = params.canal;

  const quality = detectQuality({ headless: params.headless, requested: params.quality });
  const state = createState({
    stormName: STORM_NAMES.includes(params.name) ? params.name : 'Leah', presetId: PRESETS[params.preset] ? params.preset : 'leah-ref', seed: params.seed,
    quality: quality.tier, headless: params.headless, options, debug: params.debug, stub: params.stub,
  });
  const bus = createBus(state.clock);
  const rng = createRng(state.meta.seed);
  const canvas = document.getElementById('gl');
  const ctx = {
    state, bus, rng, modules: {}, canvas, headless: params.headless, quality, params, errors: [], hashLog: [],
    hashEverySimS: params.headless ? 60 : 0, hashOnFrame: params.debug, debugTiming: params.debug || params.headless, strict: params.strict,
    three: { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 900), renderer: null, canvas },
    audio: null, world: null, objects: null, input: null, noRender: false, noAudio: params.noaudio || params.headless, photosens: params.photosens,
    THREE,
  };
  ctx.three.camera.position.set(12, 1.65, 8.8);
  ctx.three.camera.rotation.order = 'YXZ';
  ctx.clock = createClock(ctx);
  ctx.sleep = createSleep(ctx);
  ctx.input = createInput();
  ctx.core = createCoreApi(ctx);
  ctx.debug = createDebug(ctx);
  bus.setLogging(params.headless || params.debug);
  if (params.headless || params.debug) bus.on('*', () => { if (ctx.hashEverySimS > 0) ctx.hashLog.push([state.clock.simTime, stateHash(state)]); }, { sim: true });

  // scenario anchoring
  const preset = resolvePreset(state.meta.presetId, state.meta.options);
  const start = scenarioStart(preset, state.meta.options, DAY_START_0);
  ctx.preset = preset; ctx.start = start;
  ctx.clock.api.setStart({ T0: start.T0, startSim: start.startSim });

  return ctx;
}

/** Build a per-module ctx: guarded state view in debug, shared everything else. */
function moduleCtx(ctx, name) {
  const owned = OWNERSHIP[name] || [];
  const m = Object.create(ctx);
  m.moduleName = name;
  m.state = ctx.state.meta.debug ? viewFor(ctx.state, owned, name) : ctx.state;
  m.rawState = ctx.state;
  return m;
}

export async function initModules(ctx, mods) {
  ctx.modules = mods;
  ctx.moduleCtx = {};
  let i = 0;
  for (const name of INIT_ORDER) {
    const m = mods[name];
    bootMsg(`Building ${name}…`, 0.3 + 0.6 * (i++ / INIT_ORDER.length));
    if (!m) continue;
    const mctx = moduleCtx(ctx, name);
    ctx.moduleCtx[name] = mctx;
    try {
      if (name === 'world') {
        const built = await m.build(mctx);
        ctx.world = built.registry; ctx.worldRoot = built.root; ctx.worldModule = m;
        ctx.three.scene.add(built.root);
      } else if (typeof m.init === 'function') {
        await m.init(mctx);
      }
      if (name === 'objects' && m.api) ctx.objects = m.api;
    } catch (err) {
      console.error(`[main] ${name}.init failed`, err);
      ctx.errors.push({ module: name, fn: 'init', err });
      if (ctx.strict) throw err;
    }
    await new Promise(r => setTimeout(r, 0));
  }
}

function setPlayerFromParams(ctx, p) {
  const { state } = ctx;
  const player = ctx.modules.player?.api;
  let pos = null, room = null;
  if (p.pos) {
    if (/^-?[\d.]+,-?[\d.]+,-?[\d.]+$/.test(p.pos)) pos = p.pos.split(',').map(Number);
    else if (ROOM_IDS.includes(p.pos) || ctx.world?.rooms?.[p.pos]) room = p.pos;
    else pos = ROOM_POS[p.pos] || null;
  }
  const yaw = p.yaw ?? state.player.yaw, pitch = p.pitch ?? state.player.pitch;
  if (player?.teleport) { if (room) player.teleport(room); else if (pos) player.teleport(pos); player.setPose?.(state.player.pos, yaw, pitch); }
  else {
    if (room) { const c = ctx.world?.roomCentre?.(room) || ROOM_POS[room]; if (c) state.player.pos = [c[0], 1.65, c[2]]; state.player.room = room; state.player.outdoors = ['outside', 'lanai', 'cage'].includes(room) ? room !== 'lanai' : false; }
    else if (pos) state.player.pos = pos;
    state.player.yaw = yaw; state.player.pitch = pitch;
  }
  syncCamera(ctx);
}
/** Fallback room centres (eye height) when the world module is absent. */
const ROOM_POS = {
  nook: [2.9, 1.65, 1.8], kitchen: [2.9, 1.65, 5.0], great: [2.9, 1.65, 9.0], laundry: [6.55, 1.65, 1.6], pantry: [6.55, 1.65, 4.8], garage: [10.6, 1.65, 3.4],
  dining: [8.0, 1.65, 8.3], foyer: [12.1, 1.65, 8.4], frontHall: [9.7, 1.65, 10.65], bedHall: [7.1, 1.65, 13.2], hallBath: [9.0, 1.65, 12.5], linen: [9.0, 1.65, 14.5],
  masterBath: [2.0, 1.65, 13.7], masterCloset: [5.2, 1.65, 13.2], masterBR: [2.5, 1.65, 17.4], ahuCloset: [5.7, 1.65, 18.0], den: [8.4, 1.65, 18.0],
  bed2: [12.1, 1.65, 13.2], bed3: [12.1, 1.65, 17.4], lanai: [-1.5, 1.65, 12.0], cage: [-6.0, 1.65, 12.0], outside: [18.0, 1.65, 8.5],
  driveway: [18.5, 1.65, 3.5], street: [26.75, 1.65, 8.0], frontYard: [18.0, 1.65, 12.0], backYard: [-12.0, 1.65, 12.0], 'front door': [15.0, 1.65, 8.4],
};

function syncCamera(ctx) {
  const { state } = ctx;
  const cam = ctx.three.camera;
  const r = ctx.modules.render?.api;
  if (r?.setCamera) { r.setCamera(state.player.pos, state.player.yaw, state.player.pitch); return; }
  cam.position.set(state.player.pos[0], state.player.pos[1], state.player.pos[2]);
  const yaw = THREE.MathUtils.degToRad(state.player.yaw), pitch = THREE.MathUtils.degToRad(state.player.pitch);
  // yaw is the compass heading the player looks toward: 0 = north (−Z), 90 = east (+X)
  cam.rotation.set(pitch, -yaw + Math.PI, 0, 'YXZ');
}

function buildSimApi(ctx, params) {
  const { state, bus } = ctx;
  let scripts = null;
  const loadScripts = async () => { if (!scripts) { try { scripts = (await import('../scripts/scenarios.json')).default?.scripts || {}; } catch (_) { scripts = {}; } } return scripts; };
  const applyStep = (step) => {
    const objs = ctx.modules.objects?.api;
    if (step.use && objs?.use) objs.use(step.use[0], step.use[1]);
    else if (step.place && objs?.place) objs.place(step.place[0], step.place[1]);
    else if (step.setPlayer) setPlayerFromParams(ctx, { pos: step.setPlayer.room || (step.setPlayer.pos ? step.setPlayer.pos.join(',') : null), yaw: step.setPlayer.yaw, pitch: step.setPlayer.pitch });
    else if (step.api) { const [mod, fn, ...args] = step.api; ctx.modules[mod]?.api?.[fn]?.(...args); }
    else if (step.setter) { const [mod, path, ...args] = step.setter; const fn = path.split('.').reduce((o, k) => o?.[k], ctx.modules[mod]?.api); fn?.(...args); }
  };
  const runScript = (stepsIn) => {
    const steps = stepsIn.map(s => ({ ...s, atSim: s.atSim ?? (s.atTRel != null ? state.clock.T0 + s.atTRel * 3600 : state.clock.simTime) })).sort((a, b) => a.atSim - b.atSim);
    const now = state.clock.simTime;
    const due = steps.filter(s => s.atSim <= now); const later = steps.filter(s => s.atSim > now);
    for (const s of due) applyStep(s);
    if (later.length) {
      ctx.pendingScript = later;
      ctx.applyScriptUntil = (simTime) => { while (ctx.pendingScript?.length && ctx.pendingScript[0].atSim <= simTime) applyStep(ctx.pendingScript.shift()); };
    }
  };
  const api = {
    ready: null,
    state,
    ctx,
    advance(simSeconds, realStepS = 1 / 60) { return advanceTo(ctx, state.clock.simTime + simSeconds, { realStepS }); },
    advanceTo(target) { const sim = typeof target === 'object' ? target.sim : state.clock.T0 + target * 3600; ctx.applyScriptUntil?.(sim); return advanceTo(ctx, sim); },
    advanceUntil(eventName, maxSimS = 48 * 3600, predicate = null) { return advanceUntil(ctx, eventName, maxSimS, predicate); },
    setCamera(pos, yawDeg, pitchDeg) { state.player.pos = [...pos]; state.player.yaw = yawDeg; state.player.pitch = pitchDeg; syncCamera(ctx); },
    setPlayer(p) { setPlayerFromParams(ctx, { pos: p.room || (p.pos ? p.pos.join(',') : null), yaw: p.yaw, pitch: p.pitch }); if (p.crouch != null) state.player.crouching = !!p.crouch; },
    async run(scriptIdOrSteps) { const steps = Array.isArray(scriptIdOrSteps) ? scriptIdOrSteps : (await loadScripts())[scriptIdOrSteps]; if (!steps) throw new Error(`no script ${scriptIdOrSteps}`); runScript(steps); },
    render() { ctx.noRender = false; runFrame(ctx, 1 / 60); ctx.input.endFrame(); },
    frames(n = 1) { for (let i = 0; i < n; i++) api.render(); },
    snapshot() { return ctx.core.snapshot(); },
    stats() { const r = ctx.modules.render?.api?.stats?.() || {}; const a = ctx.modules.audio?.api?.introspect?.() || {}; return { ...r, jsMs: { ...state.debug.frameMs }, audio: a, errors: ctx.errors.length }; },
    hash() { return stateHash(state); },
    hashLog() { return ctx.hashLog; },
    events() { return bus.log; },
    errors() { return ctx.errors.map(e => ({ module: e.module, fn: e.fn, message: String(e.err && e.err.message || e.err), stack: e.err?.stack, simTime: e.simTime })); },
    quality(tier) { ctx.modules.render?.api?.setQuality?.(tier); },
    bus, modules: ctx.modules, formatClock: (t) => formatClock(t ?? state.clock.simTime),
    async screenshotReady() { const r = ctx.modules.render?.api; if (r?.screenshotReady) await r.screenshotReady(); else api.frames(2); },
  };
  return api;
}

async function main() {
  const params = parseParams();
  bootMsg('Loading modules…', 0.02);
  const mods = await loadModules();
  const ctx = await createApp(params);
  if (params.headless) { ctx.input.enabled = false; }
  else ctx.input.attach(window);
  const sim = buildSimApi(ctx, params);
  window.__sim = sim;
  let resolveReady; sim.ready = new Promise(r => { resolveReady = r; });

  // setup screen (interactive) or immediate start
  let setupChoice = null;
  if (!params.start && mods.ui?.api?.setup) {
    bootMsg('', 1); document.getElementById('boot')?.classList.add('done');
    try { setupChoice = await mods.ui.api.setup(ctx, { presets: PRESETS, names: STORM_NAMES, defaults: ctx.state.meta }); } catch (err) { console.error('[main] setup failed', err); }
    if (setupChoice) {
      Object.assign(ctx.state.meta.options, setupChoice.options || {});
      if (setupChoice.stormName) { ctx.state.meta.stormName = setupChoice.stormName; }
      if (setupChoice.presetId) ctx.state.meta.presetId = setupChoice.presetId;
      if (setupChoice.seed != null) { ctx.state.meta.seed = setupChoice.seed >>> 0; ctx.rng = createRng(ctx.state.meta.seed); }
      if (setupChoice.quality) ctx.state.meta.quality = setupChoice.quality;
      ctx.preset = resolvePreset(ctx.state.meta.presetId, ctx.state.meta.options);
      ctx.start = scenarioStart(ctx.preset, ctx.state.meta.options, DAY_START_0);
      ctx.clock.api.setStart({ T0: ctx.start.T0, startSim: ctx.start.startSim });
    }
    document.getElementById('boot')?.classList.remove('done');
  }
  bootMsg('Building the house…', 0.3);
  await initModules(ctx, mods);
  try { mods.storm?.api?.setScenario?.(ctx.preset, ctx.state.meta.options, ctx.state.meta.seed); } catch (err) { console.error('[main] setScenario failed', err); ctx.errors.push({ module: 'storm', fn: 'setScenario', err }); }
  ctx.bus.flush();

  // headless / parameterised start
  if (params.script) { try { await sim.run(params.script); } catch (err) { console.warn('[main] script', err); } }
  if (params.t != null || params.sim != null) {
    bootMsg('Advancing the storm…', 0.92);
    const target = params.sim != null ? params.sim : ctx.state.clock.T0 + params.t * 3600;
    ctx.applyScriptUntil?.(target);
    advanceTo(ctx, target);
  }
  setPlayerFromParams(ctx, params);
  if (params.speed != null) { if (params.speed === 0) ctx.clock.api.pause(true); else ctx.clock.api.requestSpeed(params.speed); }
  bootMsg('Compiling…', 0.96);
  await sim.screenshotReady();
  bootMsg('', 1);
  document.getElementById('boot')?.classList.add('done');
  ctx.bus.emit(EV.DEBUG_SCREENSHOT_READY, {}); ctx.bus.flush();

  // the frame loop
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    if (!params.headless || !ctx.state.clock.paused) {
      try { runFrame(ctx, dt); } catch (err) { console.error('[main] frame threw', err); ctx.errors.push({ module: 'loop', fn: 'frame', err }); }
      ctx.debug.sample(dt);
    }
    ctx.input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  resolveReady();
}

main().catch(err => { console.error('[main] fatal', err); bootMsg(`Failed: ${err.message}`); });
