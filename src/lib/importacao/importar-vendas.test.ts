import test from 'node:test';
import assert from 'node:assert/strict';

import { detectSalesFileProfile } from './importar-vendas';
import { detectarTipoPlanilha } from './detectar-tipo-planilha';

test('detectSalesFileProfile detecta contratacoes', () => {
  assert.equal(
    detectSalesFileProfile(['Cliente', 'Cidade', 'Indicacao']),
    'contratacoes'
  );
});

test('detectSalesFileProfile detecta contratacoes fora do horario pelo nome do arquivo', () => {
  assert.equal(
    detectSalesFileProfile(
      ['Cliente', 'Cidade', 'Indicacao', 'Unnamed: 3'],
      'Contratações presencial ou fora de horário comercial Fevereiro 2026.csv'
    ),
    'contratacoes_fora_horario'
  );
});

test('detectSalesFileProfile detecta cancelamentos antes da instalacao', () => {
  assert.equal(
    detectSalesFileProfile(['dataPedido', 'Cidade', 'Indicacao', 'Observacao', 'Plano']),
    'cancelamentos'
  );
});

test('detectSalesFileProfile detecta instalacoes', () => {
  assert.equal(
    detectSalesFileProfile(['dataPedido', 'dataInstalacao', 'Cidade', 'Indicacao', 'Plano']),
    'instalacoes'
  );
});

test('detectarTipoPlanilha reconhece vendas sem roubar atendimentos', () => {
  assert.equal(
    detectarTipoPlanilha(['Cliente', 'Cidade', 'Indicacao']),
    'vendas'
  );

  assert.equal(
    detectarTipoPlanilha(['Tipo', 'Instalador', 'dataPedido', 'Cidade', 'Indicacao']),
    'atendimentos'
  );
});

test('detectSalesFileProfile aceita variacoes de cabecalho de contratacoes', () => {
  assert.equal(
    detectSalesFileProfile(['Nome', 'Cidade', 'Origem']),
    'contratacoes'
  );
});

test('detectarTipoPlanilha reconhece cancelamentos por cabecalho dedicado', () => {
  assert.equal(
    detectarTipoPlanilha(['Cliente', 'Cidade', 'Motivo Cancelamento', 'Data Cancelamento']),
    'cancelamentos'
  );
});

test('detectarTipoPlanilha reconhece infraestrutura por cabecalho estrutural', () => {
  assert.equal(
    detectarTipoPlanilha(['Titulo', 'Categoria', 'Cidade', 'Referencia']),
    'infraestrutura'
  );
});
