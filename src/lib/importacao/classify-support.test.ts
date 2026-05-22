import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeText,
  classifySupportRecord,
  buildSupportSummary,
  SUPPORT_CATEGORIES,
} from './classify-support';

test('normalizeText: remove acentos', () => {
  assert.equal(normalizeText('Lentidão'), 'lentidao');
});

test('normalizeText: trim e lowercase', () => {
  assert.equal(normalizeText('  SEM INTERNET  '), 'sem internet');
});

test('normalizeText: colapsa espacos multiplos', () => {
  assert.equal(normalizeText('nao  navega'), 'nao navega');
});

test('normalizeText: vazio retorna vazio', () => {
  assert.equal(normalizeText(''), '');
});

test('cliente sem internet => Não Navega Geral', () => {
  assert.equal(classifySupportRecord('cliente sem internet'), SUPPORT_CATEGORIES.NAO_NAVEGA_GERAL);
});

test('los piscando => Não Conecta LOS/PON', () => {
  assert.equal(classifySupportRecord('los piscando'), SUPPORT_CATEGORIES.NAO_CONECTA_LOS_PON);
});

test('internet oscilando => Intermitência', () => {
  assert.equal(classifySupportRecord('internet oscilando'), SUPPORT_CATEGORIES.INTERMITENCIA);
});

test('internet lenta => Lentidão', () => {
  assert.equal(classifySupportRecord('internet lenta'), SUPPORT_CATEGORIES.LENTIDAO);
});

test('senha wifi => Wi-Fi senha', () => {
  assert.equal(classifySupportRecord('senha wifi'), SUPPORT_CATEGORIES.WIFI_SENHA);
});

test('bloqueado por boleto => Boleto / Financeiro', () => {
  assert.equal(classifySupportRecord('bloqueado por boleto'), SUPPORT_CATEGORIES.BOLETO_FINANCEIRO);
});

test('rompimento de link => Não Conecta (Rede - Link)', () => {
  assert.equal(classifySupportRecord('rompimento de link'), SUPPORT_CATEGORIES.NAO_CONECTA_LINK);
});

test('roteador nao conecta => Roteador Particular', () => {
  assert.equal(classifySupportRecord('roteador nao conecta'), SUPPORT_CATEGORIES.ROTEADOR);
});

test('vazio => Outros', () => {
  assert.equal(classifySupportRecord(''), SUPPORT_CATEGORIES.OUTROS);
});

test('nao navega no link => Não Navega (Rede - Link)', () => {
  assert.equal(classifySupportRecord('cliente nao navega no link'), SUPPORT_CATEGORIES.NAO_NAVEGA_LINK);
});

test('lentidao no link => Lentidão (Rede - Link)', () => {
  assert.equal(classifySupportRecord('lentidão no link da operadora'), SUPPORT_CATEGORIES.LENTIDAO_LINK);
});

test('sem sinal na fibra => Não Conecta sem sinal', () => {
  assert.equal(classifySupportRecord('cliente sem sinal na fibra'), SUPPORT_CATEGORIES.NAO_CONECTA_SEM_SINAL);
});

test('reset na onu => Não Navega ONU travada', () => {
  assert.equal(classifySupportRecord('precisa resetar a onu'), SUPPORT_CATEGORIES.NAO_NAVEGA_ONU_TRAVADA);
});

test('duvida comercial => Outros', () => {
  assert.equal(classifySupportRecord('duvida sobre o plano contratado'), SUPPORT_CATEGORIES.OUTROS);
});

test('conectado sem internet => Não Navega IP', () => {
  assert.equal(
    classifySupportRecord('cliente conectado sem internet'),
    SUPPORT_CATEGORIES.NAO_NAVEGA_IP
  );
});

test('pon apagado => Não Conecta LOS/PON', () => {
  assert.equal(
    classifySupportRecord('pon apagado e luz vermelha'),
    SUPPORT_CATEGORIES.NAO_CONECTA_LOS_PON
  );
});

test('internet devagar na operadora => Lentidão (Rede - Link)', () => {
  assert.equal(
    classifySupportRecord('internet devagar na operadora'),
    SUPPORT_CATEGORIES.LENTIDAO_LINK
  );
});

test('operadora fora => Não Conecta (Rede - Link)', () => {
  assert.equal(
    classifySupportRecord('operadora fora e link indisponivel'),
    SUPPORT_CATEGORIES.NAO_CONECTA_LINK
  );
});

test('sem internet no link => Não Navega (Rede - Link)', () => {
  assert.equal(
    classifySupportRecord('cliente sem internet no link externo'),
    SUPPORT_CATEGORIES.NAO_NAVEGA_LINK
  );
});

test('cai toda hora => Intermitência', () => {
  assert.equal(
    classifySupportRecord('internet cai toda hora'),
    SUPPORT_CATEGORIES.INTERMITENCIA
  );
});

test('trocar senha do wifi => Wi-Fi senha', () => {
  assert.equal(
    classifySupportRecord('cliente quer trocar senha do wifi'),
    SUPPORT_CATEGORIES.WIFI_SENHA
  );
});

test('financeiro desbloqueio => Bloqueio/Suspensão', () => {
  assert.equal(
    classifySupportRecord('solicitacao de desbloqueio financeiro'),
    SUPPORT_CATEGORIES.BLOQUEIO_SUSPENSAO
  );
});

test('reconfigurar onu => Outros', () => {
  assert.equal(
    classifySupportRecord('necessario reconfigurar onu'),
    SUPPORT_CATEGORIES.OUTROS
  );
});

test('Suporte Técnico (puro) => Suporte Técnico', () => {
  assert.equal(classifySupportRecord('Suporte Técnico'), SUPPORT_CATEGORIES.SUPORTE_TECNICO);
});

test('Suporte Técnico / Não conecta / LOS piscando => Suporte Técnico', () => {
  assert.equal(
    classifySupportRecord('Suporte Técnico / Não conecta / LOS piscando'),
    SUPPORT_CATEGORIES.SUPORTE_TECNICO
  );
});

test('Suporte Técnico | Ação de melhoria => Suporte Técnico', () => {
  assert.equal(
    classifySupportRecord('Suporte Técnico | Ação de melhoria'),
    SUPPORT_CATEGORIES.SUPORTE_TECNICO
  );
});

test('Suporte (abreviado) => Suporte Técnico', () => {
  assert.equal(classifySupportRecord('Suporte'), SUPPORT_CATEGORIES.SUPORTE_TECNICO);
});

test('Financeiro (puro) => Financeiro', () => {
  assert.equal(classifySupportRecord('Financeiro'), SUPPORT_CATEGORIES.FINANCEIRO);
});

test('Financeiro / Boleto => Financeiro', () => {
  assert.equal(classifySupportRecord('Financeiro / Boleto'), SUPPORT_CATEGORIES.FINANCEIRO);
});

test('Comercial => Comercial', () => {
  assert.equal(classifySupportRecord('Comercial'), SUPPORT_CATEGORIES.COMERCIAL);
});

test('Boleto (prefixo) => Financeiro', () => {
  assert.equal(classifySupportRecord('Boleto'), SUPPORT_CATEGORIES.FINANCEIRO);
});

test('buildSupportSummary: lista vazia retorna vazio', () => {
  assert.deepEqual(buildSupportSummary([]), []);
});

test('buildSupportSummary: conta e calcula percentual corretamente', () => {
  const records = [
    { problemaReclamado: 'sem internet' },
    { problemaReclamado: 'sem internet' },
    { problemaReclamado: 'internet lenta' },
    { problemaReclamado: '' },
  ];
  const result = buildSupportSummary(records);

  assert.equal(result[0].tipo, SUPPORT_CATEGORIES.NAO_NAVEGA_GERAL);
  assert.equal(result[0].quantidade, 2);
  assert.equal(result[0].percentual, 50.0);
});

test('buildSupportSummary: ordenado do maior para o menor', () => {
  const records = [
    { problemaReclamado: 'internet lenta' },
    { problemaReclamado: 'sem internet' },
    { problemaReclamado: 'sem internet' },
    { problemaReclamado: 'sem internet' },
  ];
  const result = buildSupportSummary(records);

  assert.equal(result[0].quantidade, 3);
  assert.ok(result[0].quantidade >= result[1].quantidade);
});

test('buildSupportSummary: percentual 100 com 1 registro', () => {
  const result = buildSupportSummary([{ problemaReclamado: 'los piscando' }]);
  assert.equal(result[0].percentual, 100.0);
});
