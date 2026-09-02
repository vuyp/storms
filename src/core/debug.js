/** core/debug.js — per-frame sampling into state.debug (F3 overlay reads it). Owner: E1 core. */
import { stateHash } from './hash.js';
export function createDebug(ctx) {
  const { state } = ctx;
  let acc = 0;
  return {
    sample(dtReal) {
      acc += dtReal;
      if (acc < 0.5) return;
      acc = 0;
      const r = ctx.modules.render?.api?.stats?.();
      if (r) { state.debug.drawCalls = r.calls; state.debug.triangles = r.triangles; state.debug.programs = r.programs; state.debug.textureBytes = r.textureBytes; state.debug.lights = r.lights; }
      if (ctx.hashOnFrame) state.debug.hash = stateHash(state);
    },
  };
}
