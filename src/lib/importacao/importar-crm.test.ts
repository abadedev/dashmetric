import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCsv } from './parse-csv';
import { detectarTipoPlanilha } from './detectar-tipo-planilha';
import { mapCrmRow, normalizeStatus } from './importar-crm';

test('detectarTipoPlanilha reconhece crm antes de vendas', () => {
  assert.equal(
    detectarTipoPlanilha(['Status', 'Vendedor', 'Motivo de Perda', 'Nome', 'Valor']),
    'crm'
  );
});

test('parseCsv preserva os headers do crm', () => {
  const csv = [
    'Nome,Cidade,Status,Vendedor,Valor,Motivo de Perda,Data',
    'Maria,Teixeira,Lead,Ana,150,Sem retorno,02/04/2026',
  ].join('\n');

  const rows = parseCsv(csv);
  assert.deepEqual(Object.keys(rows[0]), [
    'nome',
    'cidade',
    'status',
    'vendedor',
    'valor',
    'motivo_de_perda',
    'data',
  ]);
});

test('normalizeStatus normaliza os status principais do crm', () => {
  assert.equal(normalizeStatus('Ganho'), 'fechado');
  assert.equal(normalizeStatus('Negociação'), 'negociado');
  assert.equal(normalizeStatus('Follow Up'), 'negociado');
  assert.equal(normalizeStatus('Perdido'), null);
});

test('mapCrmRow monta um sales_record compatível com csvCategory crm', () => {
  const mapped = mapCrmRow(
    {
      nome: '  Maria da Silva  ',
      cidade: '  Teixeira de Freitas  ',
      status: 'Negociação',
      vendedor: 'Carlos',
      valor: 'Plano 500 Mega',
      motivo_de_perda: 'Sem retorno',
      data: '02/04/2026',
    },
    '11111111-1111-1111-1111-111111111111'
  );

  assert.ok(mapped);
  assert.equal(mapped?.workspaceId, '11111111-1111-1111-1111-111111111111');
  assert.equal(mapped?.recordType, 'negociado');
  assert.equal(mapped?.originSector, 'vendas');
  assert.equal(mapped?.csvCategory, 'crm');
  assert.equal(mapped?.clientName, 'Maria da Silva');
  assert.equal(mapped?.city, 'Teixeira de Freitas');
  assert.equal(mapped?.source, 'Carlos');
  assert.equal(mapped?.plan, 'Plano 500 Mega');
  assert.equal(mapped?.observation, 'Sem retorno');
  assert.equal(mapped?.installedAt, null);
  assert.equal(mapped?.periodMonth, 4);
  assert.equal(mapped?.periodYear, 2026);
});

test('mapCrmRow ignora status que nao entram no funil', () => {
  const mapped = mapCrmRow({
    nome: 'João',
    cidade: 'Teixeira',
    status: 'Perdido',
    vendedor: 'Carlos',
    valor: 'Plano 300 Mega',
    motivo_de_perda: 'Preço',
    data: '02/04/2026',
  });

  assert.equal(mapped, null);
});
