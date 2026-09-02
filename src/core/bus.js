/**
 * core/bus.js — the event bus (ARCHITECTURE §4 "Bus semantics").
 * Owner: E1 core.
 * emit() queues; flush() delivers in order to every listener; flushSim() delivers only to sim-side listeners
 * (storm, utilities, house, hood, alerts, clock, devices, core) and leaves the event queued for the
 * next flush(), where the remaining listeners get it. Events emitted during a flush are queued for the next flush.
 */
import { SIM_SIDE_MODULES } from './events.js';

export function createBus(clockRef = null) {
  const listeners = new Map();   // name → [{fn, sim, module}]
  const anyListeners = [];       // {fn, sim}
  let queue = [];                // [{evt, simDone}]
  let flushing = false;
  let clock = clockRef;
  const log = [];
  let keepLog = false;
  let seq = 0;

  function stamp(evt) {
    evt.simTime = clock ? clock.simTime : 0;
    evt.realTime = clock ? clock.realTime : 0;
    evt.seq = seq++;
    return evt;
  }

  function deliver(entry, simOnly) {
    const evt = entry.evt;
    const list = listeners.get(evt.name);
    const wantSim = simOnly === true;
    const sets = [list || [], anyListeners];
    for (const set of sets) {
      for (let i = 0; i < set.length; i++) {
        const l = set[i];
        if (simOnly === true && !l.sim) continue;
        if (simOnly === false && (l.sim && entry.simDone)) continue; // sim listeners already had it via flushSim
        try { l.fn(evt); }
        catch (err) { console.error(`[bus] listener for ${evt.name} threw`, err); }
      }
    }
    if (wantSim) entry.simDone = true;
  }

  const bus = {
    /** Attach the clock (for time stamps). */
    setClock(c) { clock = c; },
    setLogging(on) { keepLog = on; },
    log,
    /**
     * @param {string} name
     * @param {(evt:any)=>void} fn
     * @param {{sim?:boolean, module?:string}} [opts] sim listeners receive events during flushSim(); module name implies sim-side.
     */
    on(name, fn, opts = {}) {
      const sim = opts.sim ?? (opts.module ? SIM_SIDE_MODULES.includes(opts.module) : false);
      const l = { fn, sim, module: opts.module || null };
      if (name === '*') anyListeners.push(l);
      else {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(l);
      }
      return () => bus.off(name, fn);
    },
    once(name, fn, opts = {}) {
      const off = bus.on(name, (e) => { off(); fn(e); }, opts);
      return off;
    },
    off(name, fn) {
      const set = name === '*' ? anyListeners : listeners.get(name);
      if (!set) return;
      const i = set.findIndex(l => l.fn === fn);
      if (i >= 0) set.splice(i, 1);
    },
    /** Queue an event. Payload fields are merged into the event object. */
    emit(name, payload = {}) {
      const evt = stamp({ name, ...payload });
      queue.push({ evt, simDone: false });
      if (keepLog) log.push(evt);
      return evt;
    },
    /** Deliver everything queued, in order, to all listeners (sim listeners skip events they already saw). */
    flush() {
      if (flushing) return 0;
      flushing = true;
      const batch = queue; queue = [];
      for (const entry of batch) deliver(entry, false);
      flushing = false;
      return batch.length;
    },
    /** Deliver queued events to sim-side listeners only; keep them queued for the next flush(). */
    flushSim() {
      if (flushing) return 0;
      flushing = true;
      let n = 0;
      for (const entry of queue) if (!entry.simDone) { deliver(entry, true); n++; }
      flushing = false;
      return n;
    },
    /** Events currently queued (read-only view). */
    pending() { return queue.map(q => q.evt); },
    clear() { queue = []; },
    listenerCount(name) { return (listeners.get(name) || []).length + anyListeners.length; },
  };
  return bus;
}
