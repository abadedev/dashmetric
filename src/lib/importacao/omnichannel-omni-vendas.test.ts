import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCsv } from './parse-csv';
import { detectarTipoPlanilha } from './detectar-tipo-planilha';
import {
  buildColIndex,
  isOmniVendasRow,
  validarHeadersOmnichannelVendas,
} from './importar-omnichannel-vendas';
import { extrairPeriodoDoNomeArquivo } from './omnichannel-periodo';

test('parseCsv preserva o header real do Omni Vendas em CSV latin1', () => {
  const csv = [
    'Agente;Conta;Serviço;Contato;Tempo em Fila;Tempo de Atendimento;Classificação',
    '"Davi";"Padrão";"Vendas";"Maria";"00:01:02";"00:03:04";"Suporte Técnico"',
  ].join('\n');

  const rows = parseCsv(Buffer.from(csv, 'latin1'));

  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]), [
    'agente',
    'conta',
    'servico',
    'contato',
    'tempo_em_fila',
    'tempo_de_atendimento',
    'classificacao',
  ]);
});

test('detectarTipoPlanilha reconhece Omni Vendas pelo layout real', () => {
  assert.equal(
    detectarTipoPlanilha(
      ['Agente', 'Conta', 'Serviço', 'Tempo em Fila', 'Tempo de Atendimento', 'Classificação'],
      'Atendimentos no Omini 01-03-2026 a 31-03-2026.csv'
    ),
    'omnichannel_omni_vendas'
  );
});

test('validator aceita headers reais do Omni Vendas', () => {
  const rows = [
    {
      agente: 'Davi Silva Guimaraes',
      conta: 'Padrão',
      servico: 'Vendas',
      tempo_em_fila: '00:09:46',
      tempo_de_atendimento: '01:19:20',
      classificacao: 'Suporte Técnico',
    },
  ];

  assert.doesNotThrow(() => validarHeadersOmnichannelVendas(rows));
});

test('isOmniVendasRow prioriza Serviço para identificar vendas', () => {
  const row = {
    agente: 'Davi Silva Guimaraes',
    servico: 'Vendas',
    tipo: 'Misto',
    classificacao: 'Suporte Técnico',
    tempo_em_fila: '00:09:46',
    tempo_de_atendimento: '01:19:20',
  };

  assert.equal(isOmniVendasRow(row, buildColIndex(row)), true);
});

test('extrairPeriodoDoNomeArquivo lê o período do arquivo Omni Vendas', () => {
  assert.deepEqual(
    extrairPeriodoDoNomeArquivo('Atendimentos no Omini 01-03-2026 a 31-03-2026.csv'),
    {
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      periodMonth: 3,
      periodYear: 2026,
    }
  );
});
