import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSLA,
  normalizeHolidayKeys,
} from './calculate-sla';

function localDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0
): Date {
  return new Date(year, month - 1, day, hours, minutes, seconds, 0);
}

test('calcula SLA corrido e útil entre sexta e sábado', () => {
  const result = calculateSLA(
    localDate(2026, 4, 3, 17, 0, 0),
    localDate(2026, 4, 4, 9, 0, 0)
  );

  assert.equal(result.slaCorridoSegundos, 16 * 3600);
  assert.equal(result.slaUtilSegundos, 2 * 3600);
});

test('calcula SLA útil atravessando sábado, domingo e segunda', () => {
  const result = calculateSLA(
    localDate(2026, 4, 4, 11, 0, 0),
    localDate(2026, 4, 6, 9, 0, 0)
  );

  assert.equal(result.slaCorridoSegundos, 46 * 3600);
  assert.equal(result.slaUtilSegundos, 2 * 3600);
});

test('recorta corretamente atendimento iniciado antes do expediente e encerrado depois', () => {
  const result = calculateSLA(
    localDate(2026, 4, 6, 7, 0, 0),
    localDate(2026, 4, 6, 19, 30, 0)
  );

  assert.equal(result.slaCorridoSegundos, 12 * 3600 + 30 * 60);
  assert.equal(result.slaUtilSegundos, 10 * 3600);
});

test('não contabiliza domingo e retoma na segunda', () => {
  const result = calculateSLA(
    localDate(2026, 4, 5, 10, 0, 0),
    localDate(2026, 4, 6, 9, 30, 0)
  );

  assert.equal(result.slaUtilSegundos, 90 * 60);
});

test('considera somente o trecho útil no mesmo dia', () => {
  const result = calculateSLA(
    localDate(2026, 4, 7, 9, 15, 0),
    localDate(2026, 4, 7, 10, 45, 0)
  );

  assert.equal(result.slaCorridoSegundos, 90 * 60);
  assert.equal(result.slaUtilSegundos, 90 * 60);
});

test('respeita feriado informado', () => {
  const feriados = normalizeHolidayKeys([localDate(2026, 4, 21)]);
  const result = calculateSLA(
    localDate(2026, 4, 20, 17, 0, 0),
    localDate(2026, 4, 22, 9, 0, 0),
    { holidayKeys: feriados }
  );

  assert.equal(result.slaCorridoSegundos, 40 * 3600);
  assert.equal(result.slaUtilSegundos, 2 * 3600);
});

test('retorna zero para intervalo inválido', () => {
  const result = calculateSLA(
    localDate(2026, 4, 7, 10, 0, 0),
    localDate(2026, 4, 7, 9, 0, 0)
  );

  assert.deepEqual(result, {
    slaCorridoSegundos: 0,
    slaUtilSegundos: 0,
  });
});
