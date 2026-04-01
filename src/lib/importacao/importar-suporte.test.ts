import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTechName } from './helpers';
import { resolveSupportAttendantName } from './importar-suporte';

test('resolveSupportAttendantName: prioriza tecnico quando tecnico e atendente existem', () => {
  const result = resolveSupportAttendantName({
    tecnico: 'joao.silva',
    atendente: 'Maria Souza',
  });

  assert.equal(result, 'Joao Silva');
});

test('resolveSupportAttendantName: usa atendente como fallback', () => {
  const result = resolveSupportAttendantName({
    atendente: 'maria_souza',
  });

  assert.equal(result, 'Maria Souza');
});

test('normalizeTechName: unifica separadores comuns no mesmo nome canonico', () => {
  assert.equal(normalizeTechName('Ian.ferreira'), 'Ian Ferreira');
  assert.equal(normalizeTechName('ian_ferreira'), 'Ian Ferreira');
  assert.equal(normalizeTechName('IAN-FERREIRA'), 'Ian Ferreira');
});
