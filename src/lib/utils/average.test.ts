import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateValidAverage } from './average';

test('ignora zeros no calculo da media', () => {
  const result = calculateValidAverage([0.992, 1, 0.994, 1, 0]);

  assert.ok(Math.abs(result - 0.9965) < Number.EPSILON);
});

test('ignora valores null e undefined', () => {
  const result = calculateValidAverage([null, undefined, 0.98, 1]);

  assert.equal(result, 0.99);
});

test('ignora valores invalidos em lista mista', () => {
  const result = calculateValidAverage([0, -1, Number.NaN, null, 0.97, 0.99]);

  assert.equal(result, 0.98);
});

test('retorna zero para lista vazia', () => {
  const result = calculateValidAverage([]);

  assert.equal(result, 0);
});
