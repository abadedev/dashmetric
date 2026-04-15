import * as XLSX from 'xlsx';
import { getInfraDb } from '@/lib/db/infra';
import { serviceListings } from '@/lib/db/infra-schema';
import type { NewServiceListing } from '@/lib/db/infra-schema';
import { ensureServiceListingsTable } from '@/lib/listagem-servicos/service-listings-schema';

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

export function extrairData(valor: string): string | null {
  if (!valor || !valor.trim()) return null;

  const v = valor.trim();

  // Caso 1: objeto Date serializado pelo xlsx como ISO ou timestamp
  // Ex: "2026-03-20T00:00:00.000Z" ou "2026-03-20"
  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Caso 2: string com hora e hífen "HH:MM - DD/MM/YYYY"
  let datePart = v;
  if (datePart.includes(' - ')) {
    datePart = datePart.split(' - ')[1]?.trim() ?? '';
  }

  // Caso 3: string com hora sem hífen "HH:MM DD/MM/YYYY"
  const semHifen = datePart.match(/^\d{1,2}:\d{2}\s+(\d{1,2}\/\d{1,2}\/\d{4})$/);
  if (semHifen) {
    datePart = semHifen[1]!;
  }

  // Caso 4: data BR simples "DD/MM/YYYY"
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
  if (s === 'em monitoramento') return 'em_andamento';
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
  if (t.includes('extensao') || t.includes('extensao')) return 'Extensão de rede necessária';
  return 'Sinal fora dos padrões';
}

function normalizarCidade(raw: string): string {
  return (raw ?? '').replace(/^\([A-Z]\)\s+/, '').trim();
}

function getCellStr(row: unknown[], idx: number): string {
  return String(row[idx] ?? '').trim();
}

function extrairDataColA(row: unknown[], idx: number): string | null {
  const val = row[idx];

  if (val === null || val === undefined || val === '') return null;

  // Se já é um objeto Date (xlsx parseou automaticamente)
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Se é número (Excel serial date)
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  // Se é string, usar extrairData que trata todos os formatos de texto
  if (typeof val === 'string') {
    return extrairData(val);
  }

  return null;
}

function getCellHyperlink(ws: XLSX.WorkSheet, rowIdx: number, colIdx: number): string | null {
  const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
  const cell = ws[cellAddress];
  if (!cell) return null;
  return cell.l?.Target ?? null;
}

export async function importarListaServicos(buffer: Buffer, workspaceId: string): Promise<ResumoListaServicos> {
  await ensureServiceListingsTable();

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const infraDb = getInfraDb();

  let totalLidas = 0;
  let totalInseridas = 0;
  let totalInvalidas = 0;
  let totalAbas = 0;
  const erros: string[] = [];

  // Identify the most recent sheet date to avoid importing duplicate pending records.
  // Only the latest sheet contains the current state of all pending items; older sheets
  // only contribute resolved records (which never appear again after being resolved).
  const validSheets = workbook.SheetNames
    .filter((name) => name !== 'PacPon' && parseSheetDate(name) !== null)
    .map((name) => ({ name, date: parseSheetDate(name)! }))
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

  if (validSheets.length === 0) {
    return { totalLidas, totalInseridas, totalInvalidas, totalAbas, erros };
  }

  const existentes = await infraDb
    .select({
      networkBox: serviceListings.networkBox,
      cityArea: serviceListings.cityArea,
      referenceDate: serviceListings.referenceDate,
    })
    .from(serviceListings);

  const chaveExistentes = new Set(
    existentes
      .filter(r => r.networkBox && r.cityArea && r.referenceDate)
      .map(r => `${r.networkBox}|${r.cityArea}|${r.referenceDate}`)
  );

  const latestSheetDate = validSheets[0]?.date ?? null;

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'PacPon') continue;

    const refDate = parseSheetDate(sheetName);
    if (!refDate) continue;

    const isLatestSheet = refDate === latestSheetDate;

    totalAbas++;

    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
      blankrows: true,
    });

    const batch: NewServiceListing[] = [];

    // skip row 0 (header), start from row 1
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      totalLidas++;

      const col5 = getCellStr(row, 5);
      const col6 = getCellStr(row, 6);
      const col7 = getCellStr(row, 7);
      const locationUrl = getCellHyperlink(ws, i, 4);

      if (!col5 && !col6 && !col7) {
        totalInvalidas++;
        continue;
      }

      const statusMapeado = mapStatus(getCellStr(row, 8));

      // Abas antigas: importar apenas resolvidos — pendentes já estão copiados na aba mais recente.
      if (!isLatestSheet && statusMapeado !== 'resolvido') {
        totalInvalidas++;
        continue;
      }

      const rawColA = getCellStr(row, 0);
      const dataColA = extrairDataColA(row, 0);

      // log nas primeiras 5 linhas de cada aba para diagnóstico
      if (i <= 5) {
        console.log(`[lista-servicos] aba=${sheetName} linha=${i} colA="${rawColA}" parsed="${dataColA}"`);
      }

      const referenceDate = dataColA ?? refDate;

      const chave = `${col5}|${normalizarCidade(getCellStr(row, 3))}|${referenceDate}`;

      if (chaveExistentes.has(chave)) {
        totalInvalidas++;
        continue;
      }

      chaveExistentes.add(chave);

      batch.push({
        referenceDate: referenceDate,
        priority: getCellStr(row, 1) || null,
        technology: getCellStr(row, 2) || null,
        cityArea: normalizarCidade(getCellStr(row, 3)) || null,
        address: getCellStr(row, 4) || null,
        locationUrl: locationUrl ?? null,
        networkBox: col5 || null,
        problem: col6 || null,
        tipoOcorrencia: inferirTipoOcorrencia(col6),
        observacaoInfra: col7 || null,
        status: statusMapeado,
        resolutionDate: extrairData(getCellStr(row, 9)),
        solution: getCellStr(row, 10) || null,
        technician: getCellStr(row, 11) || null,
      });

      if (batch.length === 100) {
        try {
          await infraDb.insert(serviceListings).values(batch);
          totalInseridas += batch.length;
        } catch (err) {
          erros.push(
            `Aba ${sheetName}: erro ao inserir lote — ${err instanceof Error ? err.message : String(err)}`
          );
        }
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      try {
        await infraDb.insert(serviceListings).values(batch);
        totalInseridas += batch.length;
      } catch (err) {
        erros.push(
          `Aba ${sheetName}: erro ao inserir lote final — ${err instanceof Error ? err.message : String(err)}`
        );
      }
      batch.length = 0;
    }
  }

  return { totalLidas, totalInseridas, totalInvalidas, totalAbas, erros };
}
