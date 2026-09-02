import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBus } from '../../src/core/bus.js';

test('bus delivers in order, only at flush, sim listeners first via flushSim', () => {
  const clock = { simTime: 100, realTime: 1 };
  const bus = createBus(clock);
  const got = [];
  bus.on('a', () => got.push('a-render'), { module: 'render' });
  bus.on('a', () => got.push('a-house'), { module: 'house' });
  bus.on('b', () => got.push('b'));
  bus.emit('a'); bus.emit('b');
  assert.deepEqual(got, []);
  bus.flushSim();
  assert.deepEqual(got, ['a-house']);
  bus.flush();
  assert.deepEqual(got, ['a-house', 'a-render', 'b']);
});

test('events emitted during a flush are delivered on the next flush', () => {
  const bus = createBus({ simTime: 0, realTime: 0 });
  const got = [];
  bus.on('x', () => { got.push('x'); bus.emit('y'); });
  bus.on('y', () => got.push('y'));
  bus.emit('x'); bus.flush();
  assert.deepEqual(got, ['x']);
  bus.flush();
  assert.deepEqual(got, ['x', 'y']);
});
