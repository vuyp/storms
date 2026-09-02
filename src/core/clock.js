/**
 * core/clock.js — the two clocks, tiers, caps, moments, phase mirror, day arithmetic (DESIGN §2, ARCHITECTURE §4 step 2).
 * Owner: E1 core. Writes state.clock only.
 */
import { EV, MOMENT_EVENTS, SOFT_MOMENT_EVENTS } from './events.js';
import { DAY } from './state.js';

const SPEED_LOCKS = [1, 3, 12, 60, 300];
const MAX_SUBSTEPS_PER_FRAME = 200;
const SUB_STEP = 5;
const SLEEP_SPEED = 3600;

export const DAY_NAMES = ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday'];
const SHORT = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
const MONTH_DAY = 2; // Sep 2 = epoch day

/** "Thu 12:42" */
export function formatClock(simTime, withSeconds = false) {
  const d = Math.floor(simTime / DAY);
  const secs = ((simTime % DAY) + DAY) % DAY;
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60);
  const hm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `${SHORT[Math.max(0, Math.min(SHORT.length - 1, d))]} ${hm}${withSeconds ? ':' + String(s).padStart(2, '0') : ''}`;
}
/** "12:42 PM" */
export function format12h(simTime) {
  const secs = ((simTime % DAY) + DAY) % DAY;
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
/** "Wednesday, September 2" */
export function formatDate(simTime) {
  const d = Math.floor(simTime / DAY);
  return `${DAY_NAMES[Math.max(0, Math.min(DAY_NAMES.length - 1, d))]}, September ${MONTH_DAY + d}`;
}
export function dayStart(state, n) { return state.clock.dayStart0 + n * DAY; }
export function tRelOf(state, simTime) { return (simTime - state.clock.T0) / 3600; }
export function simOfTRel(state, tRel) { return state.clock.T0 + tRel * 3600; }

/**
 * @param {object} ctx { state, bus }
 */
export function createClock(ctx) {
  const { state, bus } = ctx;
  const c = state.clock;
  let firstEarPop = true;
  let capWind = false;       // hysteretic wind-cap latch
  let bandLatch = false;     // hysteretic in-band latch
  let momentRampStartReal = 0;
  let momentBaseSpeed = 1;
  let wakeRequest = null;    // set by sleep.js when an interrupt fires

  function baseAutoSpeed() {
    const L = state.local, P = c.phase;
    if (L.bandRain >= 1) bandLatch = true; else if (L.bandRain < 0.9) bandLatch = false;
    switch (P) {
      case 'prep': return 60;
      case 'bands': return bandLatch ? 15 : 30;
      case 'ts': return 20;
      case 'hurricane': case 'hurricaneBack': return 10;
      case 'eyewallFront': case 'eyewallBack': return 6;
      case 'eye': return (L.eyeFactor >= 0.5 && L.eyeFactor < 0.8) ? 6 : 4;
      case 'subsiding': return 30;
      case 'aftermath': return c.isNight ? 120 : 60;
      default: return 30;
    }
  }

  function tierFor(speed, autoSpeed) {
    const P = c.phase;
    if (c.momentSlowUntilReal > c.realTime) return 'moment';
    if (state.player.holdingVerb) return 'hold';
    if (state.player.phoneUp) return 'device';
    if (state.player.carrying) return 'carry';
    switch (P) {
      case 'prep': return 'prep';
      case 'bands': return bandLatch ? 'band' : 'gap';
      case 'ts': return 'ts';
      case 'hurricane': case 'hurricaneBack': return 'hurricane';
      case 'eyewallFront': case 'eyewallBack': return 'eyewall';
      case 'eye': return 'eye';
      case 'subsiding': return 'subsiding';
      case 'aftermath': return c.isNight ? 'aftermathNight' : 'aftermathDay';
      default: return 'prep';
    }
  }

  function computeSpeed() {
    const L = state.local, pl = state.player;
    const auto = baseAutoSpeed();
    let speed = c.requestedSpeed != null && !c.autoPace ? c.requestedSpeed : auto;
    if (c.requestedSpeed != null && c.autoPace) speed = Math.min(speed, c.requestedSpeed);
    // wind cap (hysteretic 10 %)
    if (L.u1m >= 26) capWind = true; else if (L.u1m < 23.4) capWind = false;
    if (capWind) speed = Math.min(speed, 10);
    // scenic cap
    const npcActive = state.life?.neighbours && Object.values(state.life.neighbours).some(n => n.visible && n.where === 'talking');
    if (pl.outdoors && c.phase === 'prep' && (L.sun.elDeg < 8 || npcActive || state.life?.wildlife?.flockActive)) speed = Math.min(speed, 10);
    // carry / device / hold / moments
    if (pl.carrying) speed = Math.min(speed, 5);
    if (pl.phoneUp || pl.deviceFocus) speed = Math.min(speed, 3);
    if (pl.holdingVerb) speed = 1;
    if (c.softMomentUntilReal > c.realTime) speed = Math.min(speed, 3);
    if (c.momentSlowUntilReal > c.realTime) speed = 1;
    else if (momentRampStartReal > 0) {
      const t = (c.realTime - momentRampStartReal) / 10;
      if (t >= 1) momentRampStartReal = 0; else speed = 1 + (speed - 1) * t;
    }
    if (c.paused) speed = 0;
    return speed;
  }

  function updateDerived() {
    c.tRel = (c.simTime - c.T0) / 3600;
    c.dayIndex = Math.floor((c.simTime - c.dayStart0) / DAY);
    c.hour = (((c.simTime % DAY) + DAY) % DAY) / 3600;
    c.isNight = state.local.sun.elDeg < -6;
  }

  const api = {
    requestSpeed(n) {
      if (n == null) { c.requestedSpeed = null; c.autoPace = true; return; }
      c.requestedSpeed = SPEED_LOCKS.reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a, SPEED_LOCKS[0]);
      c.autoPace = false;
    },
    setSpeed(n) { c.requestedSpeed = n; c.autoPace = false; },
    stepSpeed(dir) {
      const cur = c.requestedSpeed ?? c.speed;
      let i = SPEED_LOCKS.findIndex(s => s >= cur - 1e-6); if (i < 0) i = SPEED_LOCKS.length - 1;
      i = Math.max(0, Math.min(SPEED_LOCKS.length - 1, i + dir));
      api.requestSpeed(SPEED_LOCKS[i]);
    },
    toggleAutoPace() { c.autoPace = !c.autoPace; if (c.autoPace) c.requestedSpeed = null; else if (c.requestedSpeed == null) c.requestedSpeed = Math.max(1, Math.round(c.speed)); return c.autoPace; },
    startMoment(id, realSeconds = 20) {
      if (c.sleeping) return;
      c.momentSlowUntilReal = Math.max(c.momentSlowUntilReal, c.realTime + realSeconds);
      c.momentId = id;
      momentBaseSpeed = c.speed;
      bus.emit(EV.CLOCK_MOMENT, { id, untilReal: c.momentSlowUntilReal });
    },
    startSoftMoment(id, realSeconds = 60) { if (!c.sleeping) c.softMomentUntilReal = Math.max(c.softMomentUntilReal, c.realTime + realSeconds); },
    pause(b) { c.paused = !!b; },
    /** Sleep/skip target: {simTime} or {eventId} resolved through storm.api.predict(). */
    sleepUntil(target) { return ctx.sleep.sleepUntil(target); },
    skipToNext() { return ctx.sleep.skipToNext(); },
    wake(reason, eventName = null) { ctx.sleep.wake(reason, eventName); },
    /** Re-anchor T0 / start (setup and presets). */
    setStart({ T0, startSim }) {
      if (T0 != null) c.T0 = T0;
      if (startSim != null) { c.startSim = startSim; c.simTime = startSim; c.phaseSinceSim = startSim; }
      c.dayStart0 = Math.floor(c.T0 / DAY) * DAY;
      updateDerived();
    },
    /** Advance sim time by one sub-step (called by the loop only). */
    tick(h) { c.simTime += h; updateDerived(); },
    updateDerived,
    formatClock: (t = c.simTime) => formatClock(t), format12h: (t = c.simTime) => format12h(t), formatDate: (t = c.simTime) => formatDate(t),
    dayStart: (n) => dayStart(state, n),
    isMoment: () => c.momentSlowUntilReal > c.realTime,
    SUB_STEP, MAX_SUBSTEPS_PER_FRAME, SLEEP_SPEED,
  };

  // moments from the bus
  for (const [name, rule] of Object.entries(MOMENT_EVENTS)) {
    bus.on(name, (e) => {
      if (rule === 'first') { if (!firstEarPop) return; firstEarPop = false; }
      else if (typeof rule === 'function' && !rule(e, state)) return;
      api.startMoment(name);
    }, { module: 'clock' });
  }
  for (const [name, rule] of Object.entries(SOFT_MOMENT_EVENTS)) {
    bus.on(name, (e) => { if (rule(e, state)) api.startSoftMoment(name); }, { module: 'clock' });
  }
  bus.on(EV.STORM_PHASE_CHANGED, () => { /* mirrored one frame later in update() */ }, { module: 'clock' });

  /**
   * Step 2 of the frame: choose the tier and speed, compute dtSim (clamped to the sub-step budget).
   * @param {number} dtReal seconds (already clamped ≤ 0.1)
   */
  function update(dtReal) {
    c.dtReal = dtReal;
    c.realTime += dtReal;
    c.frame++;
    // phase mirror (hysteretic one frame later)
    if (state.local.phase !== c.phase) {
      const from = c.phase; c.phase = state.local.phase; c.phaseSinceSim = c.simTime;
      bus.emit(EV.CLOCK_PHASE, { from, to: c.phase });
    }
    if (c.momentSlowUntilReal > 0 && c.momentSlowUntilReal <= c.realTime && momentRampStartReal === 0 && c.momentId) {
      momentRampStartReal = c.realTime; c.momentId = null; c.momentSlowUntilReal = 0;
    }
    let speed;
    if (c.sleeping) speed = c.paused ? 0 : SLEEP_SPEED;
    else speed = computeSpeed();
    const maxDt = MAX_SUBSTEPS_PER_FRAME * SUB_STEP;
    c.dtSim = Math.min(speed * dtReal, maxDt);
    if (c.sleeping) c.dtSim = Math.min(c.dtSim, Math.max(0, c.sleepUntilSim - c.simTime));
    c.speed = dtReal > 0 ? c.dtSim / dtReal : speed;
    const tier = c.sleeping ? c.tier : tierFor(speed, 0);
    if (tier !== c.tier) { const from = c.tier; c.tier = tier; bus.emit(EV.CLOCK_TIER, { from, to: tier, speed: c.speed }); }
    updateDerived();
    return c.dtSim;
  }

  updateDerived();
  return { update, api, state: c };
}
