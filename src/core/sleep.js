/**
 * core/sleep.js — sleep, wait and skip (DESIGN §2.5; ARCHITECTURE §4 "During sleep").
 * Owner: E1 core. The interrupt list is WAKE_EVENTS; the loop calls bus.flushSim() after every sub-step
 * while sleeping so an interrupting event ends the sleep at that exact sub-step.
 */
import { EV, WAKE_EVENTS, isWakeEvent } from './events.js';

const SLEEP_CAP_S = 8 * 3600;
const NEVER_SKIP_PAST = new Set(['eyewall', 'eye', 'backEyewall']);

export function createSleep(ctx) {
  const { state, bus } = ctx;
  const c = state.clock;
  let interrupted = null; // {reason, eventName}

  for (const name of Object.keys(WAKE_EVENTS)) {
    bus.on(name, (e) => {
      if (!c.sleeping) return;
      if (!isWakeEvent(e)) return;
      interrupted = { reason: 'event', eventName: name, evt: e };
    }, { module: 'clock' });
  }

  function predictions() {
    const storm = ctx.modules?.storm;
    try { return storm?.api?.predict ? storm.api.predict() : []; } catch (err) { console.warn('[sleep] predict failed', err); return []; }
  }

  const sleep = {
    /** @param {{simTime?:number, eventId?:string, reason?:string, hours?:number}} target */
    sleepUntil(target = {}) {
      if (c.sleeping) return false;
      let until = target.simTime ?? null;
      if (target.eventId) {
        const p = predictions().find(x => x.id === target.eventId);
        if (p) until = p.simTime;
      }
      if (target.hours != null) until = c.simTime + target.hours * 3600;
      if (until == null) until = c.simTime + SLEEP_CAP_S;
      until = Math.min(until, c.simTime + SLEEP_CAP_S);
      if (until <= c.simTime + 1) return false;
      c.sleeping = true; c.sleepUntilSim = until; c.sleepTarget = target.eventId || target.reason || 'time';
      state.player.sleeping = target.reason !== 'skip' && target.reason !== 'wait';
      interrupted = null;
      bus.emit(EV.CLOCK_SLEEP_START, { untilSim: until, target: c.sleepTarget });
      return true;
    },
    /** Skip to the next predicted state change; never past an eyewall or the eye (lands 10 sim-min before). */
    skipToNext() {
      const preds = predictions().filter(p => p.simTime > c.simTime + 60).sort((a, b) => a.simTime - b.simTime);
      if (!preds.length) return null;
      let next = preds[0];
      let until = next.simTime;
      if (NEVER_SKIP_PAST.has(next.id)) until = next.simTime - 600;
      if (until <= c.simTime + 30) return null;
      sleep.sleepUntil({ simTime: until, reason: 'skip', eventId: undefined });
      c.sleepTarget = next.id;
      return next;
    },
    /** Called by the loop after each sub-step while sleeping: has anything ended the sleep? */
    check() {
      if (!c.sleeping) return false;
      if (interrupted) { sleep.wake('event', interrupted.eventName); return true; }
      if (c.simTime >= c.sleepUntilSim - 1e-6) { sleep.wake('time', null); return true; }
      return false;
    },
    wake(reason, eventName = null) {
      if (!c.sleeping) return;
      c.sleeping = false; state.player.sleeping = false;
      const target = c.sleepTarget; c.sleepTarget = null;
      interrupted = null;
      bus.emit(EV.CLOCK_SLEEP_END, { reason, eventName, target });
    },
    predictions,
  };
  ctx.sleep = sleep;
  return sleep;
}
