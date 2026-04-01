import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeText,
  classifySupportRecord,
  buildSupportSummary,
  SUPPORT_CATEGORIES,
} from './classify-support';

// ── normalizeText ─────────────────────────────────────────────────────────────

test('normalizeText: remove acentos', () => {
  assert.equal(normalizeText('Lentidão'), 'lentidao');
});

test('normalizeText: trim e lowercase', () => {
  assert.equal(normalizeText('  SEM INTERNET  '), 'sem internet');
});

test('normalizeText: colapsa espaços múltiplos', () => {
  assert.equal(normalizeText('nao  navega'), 'nao navega');
});

test('normalizeText: vazio retorna vazio', () => {
  assert.equal(normalizeText(''), '');
});

// ── classifySupportRecord — casos dos testes solicitados ─────────────────────

test('cliente sem internet → Não Navega (ONU/IP travado)', () => {
  assert.equal(
    classifySupportRecord('cliente sem internet'),
    SUPPORT_CATEGORIES.NAO_NAVEGA_ONU
  );
});

test('los piscando → Não Conecta (LOS, PON...)', () => {
  assert.equal(
    classifySupportRecord('los piscando'),
    SUPPORT_CATEGORIES.NAO_CONECTA_ONU
  );
});

test('internet oscilando → Intermitência', () => {
  assert.equal(
    classifySupportRecord('internet oscilando'),
    SUPPORT_CATEGORIES.INTERMITENCIA
  );
});

test('internet lenta → Lentidão', () => {
  assert.equal(
    classifySupportRecord('internet lenta'),
    SUPPORT_CATEGORIES.LENTIDAO
  );
});

test('senha wifi → Wi-Fi', () => {
  assert.equal(
    classifySupportRecord('senha wifi'),
    SUPPORT_CATEGORIES.WIFI
  );
});

test('bloqueado por boleto → Bloqueio/Boleto', () => {
  assert.equal(
    classifySupportRecord('bloqueado por boleto'),
    SUPPORT_CATEGORIES.BLOQUEIO_BOLETO
  );
});

test('rompimento de link → Não Conecta (Rede - Link)', () => {
  assert.equal(
    classifySupportRecord('rompimento de link'),
    SUPPORT_CATEGORIES.NAO_CONECTA_LINK
  );
});

test('roteador nao conecta → Roteador Particular', () => {
  assert.equal(
    classifySupportRecord('roteador nao conecta'),
    SUPPORT_CATEGORIES.ROTEADOR
  );
});

test('vazio → Outros fallback', () => {
  assert.equal(
    classifySupportRecord(''),
    SUPPORT_CATEGORIES.OUTROS
  );
});

// ── classifySupportRecord — casos extras de cobertura ────────────────────────

test('PON apagado → Não Conecta (LOS, PON...)', () => {
  assert.equal(
    classifySupportRecord('PON apagado na ONU'),
    SUPPORT_CATEGORIES.NAO_CONECTA_ONU
  );
});

test('cliente sem acesso → Não Navega (ONU/IP travado)', () => {
  assert.equal(
    classifySupportRecord('cliente sem acesso à internet'),
    SUPPORT_CATEGORIES.NAO_NAVEGA_ONU
  );
});

test('wi-fi com hífen → Wi-Fi', () => {
  assert.equal(
    classifySupportRecord('problema no wi-fi'),
    SUPPORT_CATEGORIES.WIFI
  );
});

test('lentidão no link → Lentidão (Rede - Link)', () => {
  assert.equal(
    classifySupportRecord('lentidão no link da operadora'),
    SUPPORT_CATEGORIES.LENTIDAO_LINK
  );
});

test('onu travada → Não Navega (ONU/IP travado)', () => {
  assert.equal(
    classifySupportRecord('onu travada'),
    SUPPORT_CATEGORIES.NAO_NAVEGA_ONU
  );
});

test('resetar onu → Outros (ONU)', () => {
  assert.equal(
    classifySupportRecord('precisa resetar a onu'),
    SUPPORT_CATEGORIES.OUTROS_ONU
  );
});

test('dúvida sobre plano → Outros fallback', () => {
  assert.equal(
    classifySupportRecord('duvida sobre o plano contratado'),
    SUPPORT_CATEGORIES.OUTROS
  );
});

test('aparelho proprio nao conecta → Roteador Particular', () => {
  assert.equal(
    classifySupportRecord('aparelho proprio nao conecta'),
    SUPPORT_CATEGORIES.ROTEADOR
  );
});

// ── buildSupportSummary ───────────────────────────────────────────────────────

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

  assert.equal(result[0].tipo, SUPPORT_CATEGORIES.NAO_NAVEGA_ONU);
  assert.equal(result[0].quantidade, 2);
  assert.equal(result[0].percentual, 50.00);
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

test('buildSupportSummary: percentual soma ~100 com 1 registro', () => {
  const result = buildSupportSummary([{ problemaReclamado: 'los piscando' }]);
  assert.equal(result[0].percentual, 100.00);
});
