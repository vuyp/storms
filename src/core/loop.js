/**
 * core/loop.js — the frame (ARCHITECTURE §4): update order, the sub-stepped sim block, flush points.
 * Owner: E1 core.
 *
 *  1 input.poll  2 clock.update  3–6 storm/utilities/house/hood .step(h) per 5-s sub-step (+ flushSim while sleeping/headless)
 *  then storm.updateRealtime(dtReal)  7 alerts.update  8 bus.flush  9 life  10 player+interact  11 objects
 *  12 tasks/details/scenario  13 devices  14 bus.flush  15 render  16 audio  17 ui  18 debug/hash
 */
import { stateHash } from './hash.js';
import { findNonFinite } from './state.js';

const SIM_ORDER = ['storm', 'utilities', 'house', 'hood'];

function timed(ctx, name, fn) {
  if (!ctx.debugTiming) { fn(); return; }
  const t0 = performance.now();
  fn();
  const ms = performance.now() - t0;
  const f = ctx.state.debug.frameMs;
  f[name] = (f[name] || 0) * 0.9 + ms * 0.1;
}

function callSafe(ctx, modName, fnName, ...args) {
  const m = ctx.modules[modName];
  if (!m || typeof m[fnName] !== 'function') return;
  try { m[fnName](...args); }
  catch (err) {
    ctx.errors.push({ module: modName, fn: fnName, err, simTime: ctx.state.clock.simTime });
    if (ctx.errors.length < 20 || ctx.errors.length % 100 === 0) console.error(`[loop] ${modName}.${fnName} threw`, err);
    if (ctx.strict) throw err;
  }
}

/**
 * Advance the sim block by `simSeconds` in fixed sub-steps. Returns the seconds actually advanced
 * (less than requested if a sleep interrupt fired).
 */
export function advanceSim(ctx, simSeconds, { flushEach = false } = {}) {
  const { state, bus, clock } = ctx;
  const h = clock.api.SUB_STEP;
  ctx.simAccum = (ctx.simAccum || 0) + simSeconds;
  let advanced = 0;
  let steps = 0;
  const flushEvery = flushEach || state.clock.sleeping || ctx.headlessAdvance;
  while (ctx.simAccum >= h - 1e-9 && steps < clock.api.MAX_SUBSTEPS_PER_FRAME) {
    ctx.simAccum -= h;
    clock.api.tick(h);
    for (const name of SIM_ORDER) callSafe(ctx, name, 'step', h);
    advanced += h; steps++;
    if (flushEvery) {
      bus.flushSim();
      if (state.clock.sleeping && ctx.sleep.check()) { ctx.simAccum = 0; break; }
    }
    if (ctx.hashEverySimS > 0) {
      ctx.hashAccum = (ctx.hashAccum || 0) + h;
      if (ctx.hashAccum >= ctx.hashEverySimS) { ctx.hashAccum = 0; ctx.hashLog.push([state.clock.simTime, stateHash(state)]); }
    }
  }
  ctx.subStepsThisFrame = steps;
  return advanced;
}

/** One full frame. */
export function runFrame(ctx, dtReal) {
  const { state, bus, clock } = ctx;
  dtReal = Math.min(Math.max(dtReal, 0), 0.1);
  ctx.frameCount = (ctx.frameCount || 0) + 1;
  const sleeping = () => state.clock.sleeping;

  timed(ctx, 'input', () => ctx.input?.poll?.(dtReal));
  const dtSim = clock.update(dtReal);
  timed(ctx, 'sim', () => {
    advanceSim(ctx, dtSim);
    callSafe(ctx, 'storm', 'updateRealtime', dtReal);
  });
  timed(ctx, 'alerts', () => callSafe(ctx, 'alerts', 'update', dtSim, dtReal));
  bus.flush();
  if (!sleeping()) {
    timed(ctx, 'life', () => callSafe(ctx, 'life', 'update', dtSim, dtReal));
    timed(ctx, 'player', () => { callSafe(ctx, 'player', 'update', dtReal, dtSim); callSafe(ctx, 'interact', 'update', dtReal); });
  }
  timed(ctx, 'objects', () => callSafe(ctx, 'objects', 'update', dtSim, dtReal));
  timed(ctx, 'scenario', () => { callSafe(ctx, 'tasks', 'update', dtSim); callSafe(ctx, 'details', 'update', dtSim); callSafe(ctx, 'scenario', 'update', dtSim); });
  timed(ctx, 'devices', () => callSafe(ctx, 'devices', 'update', dtSim, dtReal));
  bus.flush();
  const renderOk = !sleeping() && !ctx.noRender && state.clock.speed <= 300;
  if (renderOk) timed(ctx, 'render', () => callSafe(ctx, 'render', 'update', dtReal));
  if (!sleeping() && !ctx.noAudio) timed(ctx, 'audio', () => callSafe(ctx, 'audio', 'update', dtReal));
  timed(ctx, 'ui', () => callSafe(ctx, 'ui', 'update', dtReal));
  if (ctx.debugTiming && (ctx.frameCount % 60 === 0)) {
    state.debug.nanPaths = findNonFinite(state);
    if (state.debug.nanPaths.length) console.warn('[loop] non-finite state at', state.debug.nanPaths.slice(0, 5));
  }
  if (ctx.hashOnFrame && ctx.frameCount % 60 === 0) state.debug.hash = stateHash(state);
  // sleep: wake handling when the loop is not in advanceSim (e.g. render suspended, dt clamped)
  if (sleeping() && ctx.sleep.check()) { /* woke on time */ }
}

/**
 * Deterministic headless advance to a target sim time: runs steps 2–8 and 11–13 with rendering off
 * (ARCHITECTURE §12.2). Scripts are applied by the caller via ctx.applyScriptUntil(simTime).
 */
export function advanceTo(ctx, targetSim, { realStepS = 1 / 60, maxChunkS = 600 } = {}) {
  const { state, bus, clock } = ctx;
  ctx.headlessAdvance = true;
  const savedNoRender = ctx.noRender; ctx.noRender = true;
  const savedNoAudio = ctx.noAudio; ctx.noAudio = true;
  let guard = 0;
  while (state.clock.simTime < targetSim - 1e-6 && guard++ < 1e7) {
    const remaining = targetSim - state.clock.simTime;
    const chunk = Math.min(maxChunkS, remaining);
    state.clock.dtReal = realStepS; state.clock.realTime += realStepS; state.clock.dtSim = chunk; state.clock.speed = chunk / realStepS;
    if (state.local.phase !== state.clock.phase) { const from = state.clock.phase; state.clock.phase = state.local.phase; state.clock.phaseSinceSim = state.clock.simTime; bus.emit('clock:phase', { from, to: state.clock.phase }); }
    ctx.applyScriptUntil?.(state.clock.simTime + chunk);
    advanceSim(ctx, chunk, { flushEach: true });
    callSafe(ctx, 'storm', 'updateRealtime', realStepS);
    callSafe(ctx, 'alerts', 'update', chunk, realStepS);
    bus.flush();
    callSafe(ctx, 'objects', 'update', chunk, realStepS);
    callSafe(ctx, 'tasks', 'update', chunk); callSafe(ctx, 'details', 'update', chunk); callSafe(ctx, 'scenario', 'update', chunk);
    callSafe(ctx, 'devices', 'update', chunk, realStepS);
    bus.flush();
    clock.api.updateDerived();
    if (ctx.stopAdvance) { ctx.stopAdvance = false; break; }
  }
  ctx.headlessAdvance = false; ctx.noRender = savedNoRender; ctx.noAudio = savedNoAudio;
  ctx.simAccum = 0;
  return state.clock.simTime;
}

/** Run until the bus emits `eventName` (payload predicate optional) or maxSimS elapses. */
export function advanceUntil(ctx, eventName, maxSimS = 48 * 3600, predicate = null) {
  const { state, bus } = ctx;
  let hit = null;
  const off = bus.on(eventName, (e) => { if (!predicate || predicate(e)) { hit = e; ctx.stopAdvance = true; } }, { sim: true });
  const target = state.clock.simTime + maxSimS;
  // advance in 5-s chunks so the stop lands on the emitting sub-step
  while (!hit && state.clock.simTime < target - 1e-6) {
    advanceTo(ctx, Math.min(target, state.clock.simTime + 300), { maxChunkS: 5 });
  }
  off();
  ctx.stopAdvance = false;
  if (!hit) throw new Error(`advanceUntil: ${eventName} did not fire within ${maxSimS} sim-s`);
  return hit;
}
