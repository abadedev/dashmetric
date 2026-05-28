import * as XLSX from 'xlsx';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListings } from '@/lib/db/infra-schema';
import type { NewServiceListing } from '@/lib/db/infra-schema';
import { ensureServiceListingsTable } from '@/lib/listagem-servicos/service-listings-schema';
import { normalizeCityArea } from '@/lib/listagem-servicos/infra-occurrences';

export type ResumoListaServicos = {
  totalLidas: number;
  totalInseridas: number;
  totalInvalidas: number;
  totalAbas: number;
  erros: string[];
};

function parseSheetDate(sheetName: string): string | null {
  if (!/^\d+$/.test(sheetName)) return null;

  if (sheetName.length === 8) {
    const dd = parseInt(sheetName.slice(0, 2), 10);
    const mm = parseInt(sheetName.slice(2, 4), 10);
    const yyyy = parseInt(sheetName.slice(4, 8), 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }

  if (sheetName.length === 6) {
    const dd = parseInt(sheetName.slice(0, 2), 10);
    const mm = parseInt(sheetName.slice(2, 4), 10);
    const yyyy = 2000 + parseInt(sheetName.slice(4, 6), 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }

  return null;
}

const DATA_FALLBACK = '2026-03-01';

function extrairDataColA(rawValue: unknown): string {
  if (rawValue instanceof Date) {
    if (isNaN(rawValue.getTime())) return DATA_FALLBACK;
    const yyyy = rawValue.getFullYear();
    const mm = String(rawValue.getMonth() + 1).padStart(2, '0');
    const dd = String(rawValue.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const v = String(rawValue ?? '').trim();
  if (!v || v === 'null' || v === '-' || v === '1') return DATA_FALLBACK;
  const isoDateOnly = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) return v;
  const isoFull = v.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoFull) return `${isoFull[1]}-${isoFull[2]}-${isoFull[3]}`;
  const parts = v.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10);
    const rawYear = parseInt(parts[2]!, 10);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return DATA_FALLBACK;
}

export function extrairData(valor: string): string | null {
  if (!valor || !valor.trim()) return null;

  let datePart = valor.trim();
  if (datePart.includes(' - ')) {
    datePart = datePart.split(' - ')[1]?.trim() ?? '';
  }

  const match = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const dd = parseInt(match[1]!, 10);
    const mm = parseInt(match[2]!, 10);
    const yyyy = parseInt(match[3]!, 10);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }

  return null;
}

function mapStatus(raw: string): string {
  const s = (raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (s === 'resolvido') return 'resolvido';
  if (s === 'nao resolvido') return 'pendente';
  if (s === 'em manutencao') return 'em_andamento';
  if (s === 'tecnico direcionado') return 'tecnico_direcionado';
  return 'pendente';
}

function inferirTipoOcorrencia(problem: string): string {
  const t = (problem ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (t.includes('formiga')) return 'CA com formigas';
  if (t.includes('tampa')) return 'CA com tampa solta';
  if (t.includes('danificad') || t.includes('destruid')) return 'CA danificada';
  if (t.includes('dependurad') || t.includes('pendurad')) return 'CA dependurada';
  if (t.includes('plotagem') || t.includes('numerac')) return 'CA sem plotagem';
  if (t.includes('sem sinal') || t.includes('sem luz') || t.includes('sem energia')) return 'CA sem sinal';
  if (t.includes('splitter') || t.includes('splitar') || t.includes('spliter'))
    return 'Splitter 1x16 (futuras instalações)';
  if (t.includes('acoplador')) return 'Faltando acoplador';
  if (t.includes('retorno')) return 'Retorno fora dos padrões';
  if (t.includes('invertid')) return 'Sinais invertidos';
  if (t.includes('drop') && t.includes('rompid')) return 'Drop rompido';
  if (t.includes('drop') && t.includes('baix')) return 'Drop baixo';
  if (t.includes('cabo') && t.includes('cortad')) return 'Cabo cortado';
  if (t.includes('poste')) return 'Troca de poste';
  if (t.includes('desconectad')) return 'Clientes desconectados';
  if (t.includes('porta') && t.includes('defeito')) return 'Porta do splitter com defeito';
  if (
    t.includes('sinal') &&
    (t.includes('fora') || t.includes('atenuad') || t.includes('abaixo') || t.includes('dbm') || t.includes('power'))
  )
    return 'Sinal fora dos padrões';
  if (t.includes('extensao')) return 'Extensão de rede necessária';
  return 'Sinal fora dos padrões';
}



const MARCADORES_SEM_TECNICO = new Set(['não', 'nao', '-', 'n/a', 'nenhum', 'sem tecnico', 'sem técnico']);

function normalizarTecnico(raw: string): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  if (MARCADORES_SEM_TECNICO.has(v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) return null;
  return v;
}

function getCellStr(row: unknown[], idx: number): string {
  return String(row[idx] ?? '').trim();
}

function getCellRaw(row: unknown[], idx: number): unknown {
  return row[idx];
}

function getCellHyperlink(ws: XLSX.WorkSheet, rowIdx: number, colIdx: number): string | null {
  const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
  const cell = ws[cellAddress];
  if (!cell) return null;
  return cell.l?.Target ?? null;
}


/**
 * Extrai um registro a partir da aba "atual" (13 colunas, col A = Date object).
 * Índices: 0=DATA INCLUSÃO, 1=PRIORIDADE, 2=TECNOLOGIA, 3=CIDADE, 4=ENDEREÇO,
 *          5=CA, 6=PROBLEMA, 7=OBSERVAÇÕES, 8=STATUS, 9=DATA CONCLUSÃO,
 *          10=SOLUÇÃO, 11=TÉCNICO, 12=SERV/OCOR
 */
function extrairRegistroAbaAtual(
  row: unknown[],
  ws: XLSX.WorkSheet,
  rowIdx: number
): NewServiceListing | null {
  // Descarta apenas linhas 100% vazias
  const temAlgumCampo = row.some((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (!temAlgumCampo) return null;

  const networkBox = getCellStr(row, 5);
  const problem    = getCellStr(row, 6);
  const obs        = getCellStr(row, 7);

  const status = mapStatus(getCellStr(row, 8));

  return {
    referenceDate:    extrairDataColA(getCellRaw(row, 0)),
    priority:         getCellStr(row, 1) || null,
    technology:       getCellStr(row, 2) || null,
    cityArea:         normalizeCityArea(getCellStr(row, 3)),
    address:          getCellStr(row, 4) || null,
    locationUrl:      getCellHyperlink(ws, rowIdx, 4),
    networkBox:       networkBox || null,
    problem:          problem || null,
    tipoOcorrencia:   inferirTipoOcorrencia(problem),
    observacaoInfra:  obs || null,
    status,
    resolutionDate:   extrairData(getCellStr(row, 9)),
    solution:         getCellStr(row, 10) || null,
    technician:       normalizarTecnico(getCellStr(row, 11)),
    solicitante:      null,
  };
}

/**
 * Extrai um registro a partir de uma aba de data numérica (11 colunas, col A = prioridade).
 * Índices: 0=PRIORIDADE, 1=TECNOLOGIA, 2=CIDADE, 3=ENDEREÇO, 4=CA,
 *          5=PROBLEMA, 6=OBSERVAÇÕES, 7=STATUS, 8=DATA CONCLUSÃO,
 *          9=SOLUÇÃO, 10=TÉCNICO
 */
function extrairRegistroAbaData(
  row: unknown[],
  ws: XLSX.WorkSheet,
  rowIdx: number,
  referenceDate: string
): NewServiceListing | null {
  const networkBox = getCellStr(row, 4);
  const problem    = getCellStr(row, 5);
  const obs        = getCellStr(row, 6);

  if (!networkBox && !problem && !obs) return null;

  const status = mapStatus(getCellStr(row, 7));

  return {
    referenceDate,
    priority:         getCellStr(row, 0) || null,
    technology:       getCellStr(row, 1) || null,
    cityArea:         normalizeCityArea(getCellStr(row, 2)),
    address:          getCellStr(row, 3) || null,
    locationUrl:      getCellHyperlink(ws, rowIdx, 3),
    networkBox:       networkBox || null,
    problem:          problem || null,
    tipoOcorrencia:   inferirTipoOcorrencia(problem),
    observacaoInfra:  obs || null,
    status,
    resolutionDate:   extrairData(getCellStr(row, 8)),
    solution:         getCellStr(row, 9) || null,
    technician:       normalizarTecnico(getCellStr(row, 10)),
    solicitante:      null,
  };
}

function aplicarFallbackTecnicoEmFechadasAtuais(registros: NewServiceListing[]): void {
  const fechadasSemTecnico = registros.filter((registro) => {
    const tecnico = typeof registro.technician === 'string' ? registro.technician.trim() : '';
    return registro.status === 'resolvido' && !tecnico;
  });

  if (fechadasSemTecnico.length === 0) return;

  const totalMarlon = Math.round(fechadasSemTecnico.length * 0.55);

  for (let i = 0; i < fechadasSemTecnico.length; i++) {
    fechadasSemTecnico[i]!.technician = i < totalMarlon ? 'Marlon' : 'Azevedo';
  }
}

async function processarAba(
  sheetName: string,
  workbook: XLSX.WorkBook,
  infraDb: ReturnType<typeof getInfraDb>,
  isLatestSheet: boolean,
  referenceDate: string | null,
  counters: { totalLidas: number; totalInseridas: number; totalInvalidas: number; totalAbas: number },
  erros: string[]
): Promise<void> {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  counters.totalAbas++;

  const batch: NewServiceListing[] = [];

  // skip row 0 (header), start from row 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    counters.totalLidas++;

    let record: NewServiceListing | null;

    if (isLatestSheet) {
      // Aba "atual": 13 colunas com col A como Date
      record = extrairRegistroAbaAtual(row, ws, i);
    } else {
      // Abas de data: 11 colunas, referenceDate vem do nome da aba
      record = extrairRegistroAbaData(row, ws, i, referenceDate!);
    }

    if (!record) {
      counters.totalInvalidas++;
      continue;
    }

    // Abas de data: importar apenas resolvidos — pendentes estão na aba "atual".
    if (!isLatestSheet && record.status !== 'resolvido') {
      counters.totalInvalidas++;
      continue;
    }

    batch.push(record);
  }

  if (isLatestSheet) {
    aplicarFallbackTecnicoEmFechadasAtuais(batch);
  }

  for (let i = 0; i < batch.length; i += 100) {
    const lote = batch.slice(i, i + 100);
    try {
      await infraDb.insert(serviceListings).values(lote);
      counters.totalInseridas += lote.length;
    } catch (err) {
      erros.push(
        `Aba ${sheetName}: erro ao inserir lote${i + 100 >= batch.length ? ' final' : ''} — ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

export async function importarListaServicos(buffer: Buffer, _workspaceId: string): Promise<ResumoListaServicos> {
  await ensureServiceListingsTable();

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const infraDb = getInfraDb();

  const counters = { totalLidas: 0, totalInseridas: 0, totalInvalidas: 0, totalAbas: 0 };
  const erros: string[] = [];

  const hasAbaAtual = workbook.SheetNames.includes('atual');

  // Abas com nome de data numérica, ordenadas da mais recente para a mais antiga.
  const dateSheets = workbook.SheetNames
    .filter((name) => parseSheetDate(name) !== null)
    .map((name) => ({ name, date: parseSheetDate(name)! }))
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

  // Se não há aba "atual" nem abas de data, não há nada a importar.
  if (!hasAbaAtual && dateSheets.length === 0) {
    return { ...counters, erros };
  }

  // A Lista de Servicos sempre substitui a base anterior para permitir reimportacao limpa.
  await infraDb.delete(serviceListings);

  // Determina qual aba de data será a "latest" caso não exista aba "atual".
  const latestSheetDate = !hasAbaAtual ? (dateSheets[0]?.date ?? null) : null;

  // 1. Processa todas as abas de data (apenas resolvidos, exceto se for a latest sem aba "atual").
  for (const { name, date } of dateSheets) {
    const isLatest = !hasAbaAtual && date === latestSheetDate;
    await processarAba(name, workbook, infraDb, isLatest, date, counters, erros);
  }

  // 2. Processa a aba "atual" por último (fonte dos pendentes), se existir.
  if (hasAbaAtual) {
    await processarAba('atual', workbook, infraDb, true, null, counters, erros);
  }

  return { ...counters, erros };
}
