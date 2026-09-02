import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../../src/core/state.js';
import { createBus } from '../../src/core/bus.js';
import { createRng } from '../../src/core/rng.js';
import { createClock, formatClock, formatDate } from '../../src/core/clock.js';
import { createSleep } from '../../src/core/sleep.js';
import { runFrame, advanceSim, advanceTo, advanceUntil } from '../../src/core/loop.js';
import { stateHash } from '../../src/core/hash.js';
import { findNonFinite } from '../../src/core/state.js';

function makeCtx() {
  const state = createState({ seed: 7 });
  const bus = createBus(state.clock);
  const ctx = { state, bus, rng: createRng(7), modules: {}, errors: [], hashLog: [], hashEverySimS: 0, input: { poll() {}, endFrame() {} } };
  ctx.clock = createClock(ctx);
  ctx.sleep = createSleep(ctx);
  return ctx;
}

test('reference anchoring: start Wed 06:00 = T−32, T0 = Thu 14:00', () => {
  const ctx = makeCtx();
  assert.equal(ctx.state.clock.T0, 136800);
  assert.equal(ctx.state.clock.tRel, -32);
  assert.equal(formatClock(ctx.state.clock.simTime), 'Wed 06:00');
  assert.equal(formatClock(ctx.state.clock.T0), 'Thu 14:00');
  assert.equal(formatDate(ctx.state.clock.simTime), 'Wednesday, September 2');
  assert.equal(ctx.state.clock.dayIndex, -1);
});

test('sub-stepped sim block calls storm/utilities/house/hood in order with 5-s steps', () => {
  const ctx = makeCtx();
  const calls = [];
  for (const m of ['storm', 'utilities', 'house', 'hood']) ctx.modules[m] = { step: (h) => { calls.push([m, h]); } };
  advanceSim(ctx, 600);
  assert.equal(calls.length, 4 * 120);
  assert.deepEqual(calls.slice(0, 4).map(c => c[0]), ['storm', 'utilities', 'house', 'hood']);
  assert.ok(calls.every(c => c[1] === 5));
  assert.equal(ctx.state.clock.simTime, 136800 - 32 * 3600 + 600);
});

test('auto-pace tiers and the wind cap', () => {
  const ctx = makeCtx();
  const c = ctx.state.clock;
  runFrame(ctx, 1 / 60);
  assert.equal(c.tier, 'prep');
  assert.ok(Math.abs(c.speed - 60) < 1e-6);
  ctx.state.local.phase = 'ts'; ctx.state.local.u1m = 27;
  runFrame(ctx, 1 / 60); runFrame(ctx, 1 / 60);
  assert.equal(c.tier, 'ts');
  assert.ok(c.speed <= 10 + 1e-6, `wind cap: ${c.speed}`);
  ctx.state.local.u1m = 24; runFrame(ctx, 1 / 60);
  assert.ok(c.speed <= 10 + 1e-6, 'hysteresis keeps the cap until 23.4');
  ctx.state.local.u1m = 20; runFrame(ctx, 1 / 60);
  assert.ok(Math.abs(c.speed - 20) < 1e-6);
  ctx.state.player.holdingVerb = 'place'; runFrame(ctx, 1 / 60);
  assert.equal(c.tier, 'hold'); assert.ok(Math.abs(c.speed - 1) < 1e-6);
});

test('a moment drops to 1× for 20 real seconds then ramps back', () => {
  const ctx = makeCtx();
  runFrame(ctx, 1 / 60);
  ctx.bus.emit('power:lost', { cause: 'transformer' }); ctx.bus.flush();
  runFrame(ctx, 1 / 60);
  assert.equal(ctx.state.clock.tier, 'moment');
  assert.ok(Math.abs(ctx.state.clock.speed - 1) < 1e-6);
  for (let i = 0; i < 25 * 60; i++) runFrame(ctx, 1 / 60);
  assert.ok(ctx.state.clock.speed > 10);
});

test('sleep is interrupted at the emitting sub-step by a wake event', () => {
  const ctx = makeCtx();
  const c = ctx.state.clock;
  const t0 = c.simTime;
  ctx.modules.utilities = { step() { if (c.simTime >= t0 + 3600 && !this.fired) { this.fired = true; ctx.bus.emit('power:lost', { cause: 'feeder' }); } } };
  ctx.sleep.sleepUntil({ hours: 6, reason: 'sleep' });
  assert.equal(c.sleeping, true);
  let guard = 0;
  while (c.sleeping && guard++ < 100000) runFrame(ctx, 1 / 60);
  assert.equal(c.sleeping, false);
  assert.equal(c.simTime, t0 + 3600, 'woke exactly at the sub-step of power:lost');
});

test('sleep caps at 8 h and ends on time', () => {
  const ctx = makeCtx();
  const c = ctx.state.clock; const t0 = c.simTime;
  ctx.sleep.sleepUntil({ hours: 12 });
  let guard = 0; while (c.sleeping && guard++ < 100000) runFrame(ctx, 1 / 60);
  assert.equal(c.simTime, t0 + 8 * 3600);
});

test('advanceTo and advanceUntil are deterministic and hash-stable', () => {
  const mk = () => { const ctx = makeCtx(); let n = 0; ctx.modules.storm = { step(h) { ctx.state.local.u1m = 4 + (ctx.state.clock.tRel + 32) * 0.5; if (++n === 700) ctx.bus.emit('storm:bandEnter', { bandId: 'b1', kind: 'outer' }); } }; return ctx; };
  const a = mk(), b = mk();
  advanceTo(a, a.state.clock.T0 - 20 * 3600); advanceTo(b, b.state.clock.T0 - 20 * 3600);
  assert.equal(stateHash(a.state), stateHash(b.state));
  const c = mk();
  const e = advanceUntil(c, 'storm:bandEnter', 48 * 3600);
  assert.equal(e.name, 'storm:bandEnter');
  assert.equal(c.state.clock.simTime, c.state.clock.startSim + 700 * 5);
  assert.deepEqual(findNonFinite(c.state), []);
});
