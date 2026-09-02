import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hash01, poissonFromU, normalFromU } from '../../src/core/rng.js';

test('streams are deterministic per seed and name', () => {
  const a = createRng(7).fork('storm'), b = createRng(7).fork('storm'), c = createRng(8).fork('storm'), d = createRng(7).fork('turb');
  const va = [a.nextFloat(), a.nextFloat()], vb = [b.nextFloat(), b.nextFloat()];
  assert.deepEqual(va, vb);
  assert.notEqual(va[0], c.nextFloat());
  assert.notEqual(va[0], d.nextFloat());
});
test('hash01 is stateless and uniform-ish', () => {
  assert.equal(hash01(7, 'impact', 'roof', 3), hash01(7, 'impact', 'roof', 3));
  let sum = 0; const n = 5000;
  for (let i = 0; i < n; i++) sum += hash01(7, 'k', i);
  assert.ok(Math.abs(sum / n - 0.5) < 0.02);
});
test('poisson and normal helpers', () => {
  assert.equal(poissonFromU(0, 0.9), 0);
  let s = 0; for (let i = 0; i < 2000; i++) s += poissonFromU(3, hash01(1, 'p', i));
  assert.ok(Math.abs(s / 2000 - 3) < 0.15);
  assert.ok(Math.abs(normalFromU(0.5)) < 1e-6);
  assert.ok(Math.abs(normalFromU(0.975) - 1.96) < 0.01);
});
