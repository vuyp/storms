/** core/api.js — journal, endRun, snapshot/restore (ARCHITECTURE §6.1). Owner: E1 core. */
import { EV } from './events.js';
import { snapshot as snap, restore as rest } from './save.js';
export function createCoreApi(ctx) {
  const { state, bus } = ctx;
  return {
    /** @param {string} text @param {'event'|'player'|'alert'|'detail'} kind */
    journal(text, kind = 'event') {
      const line = { simTime: state.clock.simTime, text, kind };
      state.log.push(line);
      if (state.log.length > 2000) state.log.splice(0, state.log.length - 2000);
      return line;
    },
    endRun(reason, card = {}) {
      if (ctx.ended) return; ctx.ended = true;
      bus.emit(EV.GAME_END, { reason, card });
    },
    snapshot: () => snap(state, ctx.rng),
    restore: (json) => { rest(state, json, ctx.rng); ctx.clock.api.updateDerived(); },
  };
}
