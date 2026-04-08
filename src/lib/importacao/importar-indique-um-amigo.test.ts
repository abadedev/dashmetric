import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCsv } from './parse-csv';
import { detectarTipoPlanilha } from './detectar-tipo-planilha';
import { validarHeadersIndiqueUmAmigo } from './importar-indique-um-amigo';

test('detectarTipoPlanilha reconhece indique um amigo', () => {
  assert.equal(
    detectarTipoPlanilha(['Cadastro', 'Indicante', 'Indicado', 'Contratado', 'Tel Indicado', 'Cidade', 'Status']),
    'indique_um_amigo'
  );
});

test('parseCsv preserva os headers do indique um amigo', () => {
  const csv = [
    'Cadastro,Indicante,Indicado,Contratado,Tel Indicado,Cidade,Status',
    '29/03/26 - 20:31,Yuri,Isaac,,(33) 98827-4347,Teixeira,Pendente',
  ].join('\n');

  const rows = parseCsv(csv);
  assert.deepEqual(Object.keys(rows[0]), [
    'cadastro',
    'indicante',
    'indicado',
    'contratado',
    'tel_indicado',
    'cidade',
    'status',
  ]);
});

test('validator aceita o layout do indique um amigo', () => {
  const rows = [
    {
      cadastro: '29/03/26 - 20:31',
      indicante: 'Yuri',
      indicado: 'Isaac',
      contratado: '',
      tel_indicado: '(33) 98827-4347',
      cidade: 'Teixeira',
      status: 'Pendente',
    },
  ];

  assert.doesNotThrow(() => validarHeadersIndiqueUmAmigo(rows));
});
