import { normalizeHeader } from './src/lib/importacao/helpers';

const ALIASES_INVIABILIDADE = [
  'inviabilidade tecnica',
  'inviabilidade_tecnica',
  'inviabilidade técnica',
  'inviabilidade',
  'ict',
];

const keys = [ 'datapedido', 'instalador', 'login', 'cliente', 'inviabilidade_tecnica', 'instalacao_cancelada', 'cliente_foi_instalado' ];

console.log('Testando chaves:');
for (const k of keys) {
  const normK = normalizeHeader(k);
  const found = ALIASES_INVIABILIDADE.find(a => normalizeHeader(k) === normalizeHeader(a));
  console.log(`k: "${k}", normK: "${normK}", found: ${found}`);
}
