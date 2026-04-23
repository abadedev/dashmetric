import { db } from '@/lib/db';
import { dropdownOptions } from '@/lib/db/schema';

const INITIAL_OPTIONS = [
  // Cidades
  { category: 'cities', value: 'Teixeira de Freitas', label: 'Teixeira de Freitas' },
  { category: 'cities', value: 'Alcobaça', label: 'Alcobaça' },
  { category: 'cities', value: 'Caravelas', label: 'Caravelas' },
  { category: 'cities', value: 'Mucuri', label: 'Mucuri' },
  { category: 'cities', value: 'Nova Viçosa', label: 'Nova Viçosa' },
  { category: 'cities', value: 'Medeiros Neto', label: 'Medeiros Neto' },
  { category: 'cities', value: 'Itamaraju', label: 'Itamaraju' },
  { category: 'cities', value: 'Posto da Mata', label: 'Posto da Mata' },
  // Tipos de ocorrência
  { category: 'occurrence_types', value: 'CA com formigas', label: 'CA com formigas' },
  { category: 'occurrence_types', value: 'Extensão de rede necessária', label: 'Extensão de rede necessária' },
  { category: 'occurrence_types', value: 'CA com tampa solta', label: 'CA com tampa solta' },
  { category: 'occurrence_types', value: 'CA danificada', label: 'CA danificada' },
  { category: 'occurrence_types', value: 'CA dependurada', label: 'CA dependurada' },
  { category: 'occurrence_types', value: 'CA sem plotagem', label: 'CA sem plotagem' },
  { category: 'occurrence_types', value: 'Sinal fora dos padrões', label: 'Sinal fora dos padrões' },
  { category: 'occurrence_types', value: 'CA sem sinal', label: 'CA sem sinal' },
  { category: 'occurrence_types', value: 'Splitter 1×16 (futuras instalações)', label: 'Splitter 1×16 (futuras instalações)' },
  { category: 'occurrence_types', value: 'Splitter 1×16 (todas portas ocupadas)', label: 'Splitter 1×16 (todas portas ocupadas)' },
  { category: 'occurrence_types', value: 'Splitter 1×16 (cliente aguardando)', label: 'Splitter 1×16 (cliente aguardando)' },
  { category: 'occurrence_types', value: 'Faltando acoplador', label: 'Faltando acoplador' },
  { category: 'occurrence_types', value: 'Retorno fora dos padrões', label: 'Retorno fora dos padrões' },
  { category: 'occurrence_types', value: 'Caixa sem identificação', label: 'Caixa sem identificação' },
  { category: 'occurrence_types', value: 'Passagem de cabo necessária', label: 'Passagem de cabo necessária' },
  // Prioridade
  { category: 'priorities', value: '—', label: '—' },
  { category: 'priorities', value: 'Baixa', label: 'Baixa' },
  { category: 'priorities', value: 'Média', label: 'Média' },
  { category: 'priorities', value: 'Alta', label: 'Alta' },
  { category: 'priorities', value: 'Crítica', label: 'Crítica' },
];

export async function seedDropdownOptions() {
  for (const opt of INITIAL_OPTIONS) {
    await db
      .insert(dropdownOptions)
      .values({ ...opt, sortOrder: 0 })
      .onConflictDoNothing();
  }
  console.log('Dropdown options seeded.');
}
