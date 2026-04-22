import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTechName } from './helpers';
import { resolveSupportAttendantName, resolveSupportPeriod } from './importar-suporte';

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

test('resolveSupportPeriod: usa dataFechamento para definir a data do registro', () => {
  const result = resolveSupportPeriod(
    {
      dataAbertura: '31/03/26 - 23:55',
      dataFechamento: '01/04/26 - 00:10',
    },
    3,
    2026
  );

  assert.equal(result.month, 4);
  assert.equal(result.year, 2026);
  assert.equal(result.closedAt?.getDate(), 1);
  assert.equal(result.closedAt?.getMonth(), 3);
});

test('resolveSupportPeriod: usa colunas camelCase de hora quando a data vem separada', () => {
  const result = resolveSupportPeriod(
    {
      dataFechamento: '15/04/26',
      horaSaida: '13:45',
    },
    4,
    2026
  );

  assert.equal(result.closedAt?.getHours(), 13);
  assert.equal(result.closedAt?.getMinutes(), 45);
  assert.equal(result.month, 4);
  assert.equal(result.year, 2026);
});
