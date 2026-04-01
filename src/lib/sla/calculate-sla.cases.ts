import * as assert from 'node:assert/strict';

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

const cases = [
  {
    name: 'sexta 17:00 ate sabado 09:00',
    run: () => {
      const result = calculateSLA(
        localDate(2026, 4, 3, 17, 0, 0),
        localDate(2026, 4, 4, 9, 0, 0)
      );
      assert.equal(result.slaCorridoSegundos, 16 * 3600);
      assert.equal(result.slaUtilSegundos, 2 * 3600);
    },
  },
  {
    name: 'sabado 11:00 ate segunda 09:00',
    run: () => {
      const result = calculateSLA(
        localDate(2026, 4, 4, 11, 0, 0),
        localDate(2026, 4, 6, 9, 0, 0)
      );
      assert.equal(result.slaCorridoSegundos, 46 * 3600);
      assert.equal(result.slaUtilSegundos, 2 * 3600);
    },
  },
  {
    name: 'segunda 07:00 ate segunda 19:30',
    run: () => {
      const result = calculateSLA(
        localDate(2026, 4, 6, 7, 0, 0),
        localDate(2026, 4, 6, 19, 30, 0)
      );
      assert.equal(result.slaCorridoSegundos, 12 * 3600 + 30 * 60);
      assert.equal(result.slaUtilSegundos, 10 * 3600);
    },
  },
  {
    name: 'domingo 10:00 ate segunda 09:30',
    run: () => {
      const result = calculateSLA(
        localDate(2026, 4, 5, 10, 0, 0),
        localDate(2026, 4, 6, 9, 30, 0)
      );
      assert.equal(result.slaUtilSegundos, 90 * 60);
    },
  },
  {
    name: 'mesmo dia dentro do expediente',
    run: () => {
      const result = calculateSLA(
        localDate(2026, 4, 7, 9, 15, 0),
        localDate(2026, 4, 7, 10, 45, 0)
      );
      assert.equal(result.slaCorridoSegundos, 90 * 60);
      assert.equal(result.slaUtilSegundos, 90 * 60);
    },
  },
  {
    name: 'feriado nao contabiliza na janela util',
    run: () => {
      const feriados = normalizeHolidayKeys([localDate(2026, 4, 21)]);
      const result = calculateSLA(
        localDate(2026, 4, 20, 17, 0, 0),
        localDate(2026, 4, 22, 9, 0, 0),
        { holidayKeys: feriados }
      );
      assert.equal(result.slaCorridoSegundos, 40 * 3600);
      assert.equal(result.slaUtilSegundos, 2 * 3600);
    },
  },
  {
    name: 'intervalo invalido retorna zero',
    run: () => {
      const result = calculateSLA(
        localDate(2026, 4, 7, 10, 0, 0),
        localDate(2026, 4, 7, 9, 0, 0)
      );
      assert.deepEqual(result, {
        slaCorridoSegundos: 0,
        slaUtilSegundos: 0,
      });
    },
  },
];

let failed = false;

for (const testCase of cases) {
  try {
    testCase.run();
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${testCase.name}`);
    console.error(error);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`OK ${cases.length} cenarios validados`);
}
