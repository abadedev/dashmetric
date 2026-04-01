import { z } from 'zod';
import Papa from 'papaparse';
import { db } from '@/lib/db';
import {
  serviceOrders,
  qualityRecords,
  supportRecords,
  technicians,
  importBatches,
  holidays,
} from '@/lib/db/schema';
import {
  isWithinSLA,
  SLA_TARGETS,
  ACTIVITY_TYPE_MAP,
} from './sla-engine';
import { eq } from 'drizzle-orm';
import { calculateSLA, normalizeHolidayKeys } from '@/lib/sla/calculate-sla';

// ========== SCHEMAS DE VALIDAÇÃO ==========

const serviceOrderRowSchema = z.object({
  os_number: z.string().optional(),
  tipo: z.string().min(1, 'Tipo obrigatório'),
  motivo: z.string().optional(),
  solucao: z.string().optional(),
  tecnico: z.string().min(1, 'Técnico obrigatório'),
  cliente: z.string().optional(),
  cidade: z.string().optional(),
  plano: z.string().optional(),
  data_abertura: z.string().min(1, 'Data abertura obrigatória'),
  hora_abertura: z.string().min(1, 'Hora abertura obrigatória'),
  data_finalizacao: z.string().optional(),
  hora_finalizacao: z.string().optional(),
});

const qualityRowSchema = z.object({
  os_number: z.string().optional(),
  indicador: z.string().min(1, 'Indicador obrigatório'),
  motivo: z.string().optional(),
  solucao: z.string().optional(),
  tecnico: z.string().optional(),
  cliente: z.string().optional(),
  cidade: z.string().optional(),
  plano: z.string().optional(),
  data_abertura: z.string().optional(),
  hora_abertura: z.string().optional(),
  data_finalizacao: z.string().optional(),
  hora_finalizacao: z.string().optional(),
  tempo: z.string().optional(),
});

const supportRowSchema = z.object({
  tecnico: z.string().min(1, 'Técnico obrigatório'),
  aberta_manut_ext: z.string().optional(),
  percentual: z.string().optional(),
  sem_manut: z.string().optional(),
  total: z.string().optional(),
  mes: z.string().optional(),
  ano: z.string().optional(),
});

// ========== NORMALIZAÇÃO DO FORMATO DO SISTEMA ==========
// Converte o CSV exportado diretamente do sistema (colunas: dataPedido, Instalador, etc.)
// para o formato interno esperado pelo serviceOrderRowSchema

function splitSystemDateTime(val: string): { date: string; time: string } {
  if (!val) return { date: '', time: '' };
  const idx = val.indexOf(' - ');
  if (idx === -1) return { date: val.trim(), time: '' };
  return { date: val.slice(0, idx).trim(), time: val.slice(idx + 3).trim() };
}

function isSystemFormatRow(row: Record<string, string>): boolean {
  return 'instalador' in row || 'datapedido' in row;
}

function normalizeSystemRow(row: Record<string, string>): Record<string, string> {
  const abertura = splitSystemDateTime(row.datapedido || '');
  const finalizacao = splitSystemDateTime(row.datafinalizacao || '');

  return {
    os_number: row['#'] || row.login || '',
    tipo: (row.tipo || '').trim(),
    tecnico: (row.instalador || '').trim(),
    cliente: (row.cliente || '').trim(),
    cidade: (row.cidade || '').trim(),
    plano: (row.plano || '').trim(),
    data_abertura: abertura.date,
    hora_abertura: abertura.time || (row.horainicio || '').trim(),
    data_finalizacao: finalizacao.date,
    hora_finalizacao: finalizacao.time || (row.horasaida || '').trim(),
    motivo: (row.referencia || '').trim(),
    solucao: (row.observacao || '').trim(),
  };
}

// ========== UTILITÁRIOS ==========

export function normalizeTechName(name: string): string {
  return name
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function parseDateTime(dateStr: string, timeStr: string): Date {
  // Suporta DD/MM/YYYY e DD/MM/YY
  const [day, month, year] = dateStr.split('/').map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(fullYear, month - 1, day, hours || 0, minutes || 0);
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function getHolidayDates(): Promise<Date[]> {
  const rows = await db.select().from(holidays);
  return rows.map((h) => new Date(h.date));
}

// nameToLogin: mapa de nome normalizado → login code (ex: "Mateus Figueira" → "0541147")
async function resolveTechnicians(
  rows: Record<string, string>[],
  nameToLogin?: Map<string, string>
): Promise<Map<string, number>> {
  const names = new Set<string>();
  rows.forEach((r) => {
    const name = r.tecnico || r.technician;
    if (name) names.add(normalizeTechName(name));
  });

  const cache = new Map<string, number>();
  for (const name of names) {
    const existing = await db.query.technicians.findFirst({
      where: (t, { or, eq }) =>
        or(eq(t.name, name), eq(t.login, name)),
    });

    if (existing) {
      // Atualiza o login se ainda não estiver preenchido
      const loginCode = nameToLogin?.get(name) || null;
      if (!existing.login && loginCode) {
        await db
          .update(technicians)
          .set({ login: loginCode, updatedAt: new Date() })
          .where(eq(technicians.id, existing.id));
      }
      cache.set(name, existing.id);
    } else {
      const loginCode = nameToLogin?.get(name) || null;
      const [created] = await db
        .insert(technicians)
        .values({ name, login: loginCode })
        .returning();
      cache.set(name, created.id);
    }
  }
  return cache;
}

// ========== PROCESSAMENTO PRINCIPAL ==========

export async function processImportBatch(
  csvText: string,
  importType: string,
  filename: string
) {
  const [batch] = await db
    .insert(importBatches)
    .values({ filename, status: 'processing' })
    .returning();

  try {
    // Detecção primária de delimitador: planilhas BR usam ';' em 99% das vezes
    const delimiter = csvText.substring(0, 500).includes(';') ? ';' : ',';

    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: 'greedy', // ignora linhas em branco mesmo com delimitadores vazios
      delimiter,
      transformHeader: normalizeHeader,
    });

    const rows = parsed.data;
    const errors: Array<{ row: number; error: string }> = [];

    if (importType === 'atendimentos') {
      await processServiceOrders(rows, batch.id, errors);
    } else if (importType === 'qualidade') {
      await processQualityRecords(rows, batch.id, errors);
    } else if (importType === 'suporte') {
      await processSupportRecords(rows, errors);
    }

    await db
      .update(importBatches)
      .set({
        totalRows: rows.length,
        importedRows: rows.length - errors.length,
        errors: errors.length,
        errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
        status: 'completed',
      })
      .where(eq(importBatches.id, batch.id));

    return {
      success: true,
      batchId: batch.id,
      total: rows.length,
      imported: rows.length - errors.length,
      errors: errors.length,
      errorSample: errors.slice(0, 10),
    };
  } catch (err) {
    await db
      .update(importBatches)
      .set({ status: 'failed', errorDetails: String(err) })
      .where(eq(importBatches.id, batch.id));
    throw err;
  }
}

async function processServiceOrders(
  rows: Record<string, string>[],
  batchId: number,
  errors: Array<{ row: number; error: string }>
) {
  const useSystemFormat = rows.length > 0 && isSystemFormatRow(rows[0]);

  // Normaliza TODAS as linhas antes de resolver técnicos,
  // caso contrário resolveTechnicians busca 'tecnico' mas o CSV tem 'instalador'
  const normalizedRows = useSystemFormat ? rows.map(normalizeSystemRow) : rows;

  // Monta mapa nome → login para gravar o código do técnico na tabela technicians
  const nameToLogin = new Map<string, string>();
  if (useSystemFormat) {
    rows.forEach((r) => {
      const login = (r.login || '').trim();
      const name = normalizeTechName((r.instalador || '').trim());
      if (login && name) nameToLogin.set(name, login);
    });
  }

  const techCache = await resolveTechnicians(normalizedRows, nameToLogin);
  const holidayDates = await getHolidayDates();
  const holidayKeys = normalizeHolidayKeys(holidayDates);
  const validRecords = [];

  for (let i = 0; i < normalizedRows.length; i++) {
    try {
      const row = normalizedRows[i];
      const validated = serviceOrderRowSchema.parse(row);
      const activityType = ACTIVITY_TYPE_MAP[validated.tipo];

      if (!activityType) {
        errors.push({ row: i + 2, error: `Tipo desconhecido: ${validated.tipo}` });
        continue;
      }

      const openedAt = parseDateTime(validated.data_abertura, validated.hora_abertura);
      const closedAt =
        validated.data_finalizacao
          ? parseDateTime(validated.data_finalizacao, validated.hora_finalizacao || '00:00')
          : null;

      const slaTargetHours = SLA_TARGETS[activityType] ?? null;
      let slaCorridoSeconds: number | null = null;
      let slaUtilSeconds: number | null = null;
      let withinSlaCorrido: boolean | null = null;
      let withinSlaUtil: boolean | null = null;

      if (closedAt) {
        const calculado = calculateSLA(openedAt, closedAt, { holidayKeys });
        slaCorridoSeconds = calculado.slaCorridoSegundos;
        slaUtilSeconds = calculado.slaUtilSegundos;
        withinSlaCorrido = isWithinSLA(slaCorridoSeconds, slaTargetHours);
        withinSlaUtil = isWithinSLA(slaUtilSeconds, slaTargetHours);
      }

      validRecords.push({
        osNumber: validated.os_number || null,
        activityType: activityType as any,
        reason: validated.motivo || null,
        solution: validated.solucao || null,
        technicianId:
          techCache.get(normalizeTechName(validated.tecnico)) || null,
        clientName: validated.cliente || null,
        city: validated.cidade || null,
        plan: validated.plano || null,
        openedAt,
        closedAt,
        slaTargetHours,
        slaCorridoSeconds,
        slaUtilSeconds,
        withinSlaCorrido,
        withinSlaUtil,
        importBatchId: batchId,
        periodMonth: openedAt.getMonth() + 1,
        periodYear: openedAt.getFullYear(),
      });
    } catch (err: any) {
      errors.push({
        row: i + 2,
        error:
          err instanceof z.ZodError
            ? err.issues.map((e: any) => e.message).join(', ')
            : String(err),
      });
    }
  }

  const CHUNK_SIZE = 500;
  for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
    await db.insert(serviceOrders).values(validRecords.slice(i, i + CHUNK_SIZE));
  }
}

async function processQualityRecords(
  rows: Record<string, string>[],
  batchId: number,
  errors: Array<{ row: number; error: string }>
) {
  const QUALITY_INDICATOR_MAP: Record<string, string> = {
    IQIv: 'IQIv',
    IQRv: 'IQRv',
    RTV: 'RTV',
    RST: 'RST',
    ICT: 'ICT',
    Retorno: 'Retorno',
  };

  const techCache = await resolveTechnicians(rows);
  const validRecords = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const validated = qualityRowSchema.parse(row);
      const indicator = QUALITY_INDICATOR_MAP[validated.indicador];
      if (!indicator) {
        errors.push({ row: i + 2, error: `Indicador desconhecido: ${validated.indicador}` });
        continue;
      }

      const openedAt =
        validated.data_abertura && validated.hora_abertura
          ? parseDateTime(validated.data_abertura, validated.hora_abertura)
          : null;
      const closedAt =
        validated.data_finalizacao
          ? parseDateTime(validated.data_finalizacao, validated.hora_finalizacao || '00:00')
          : null;

      const periodDate = openedAt || new Date();

      validRecords.push({
        osNumber: validated.os_number || null,
        indicator: indicator as any,
        reason: validated.motivo || null,
        solution: validated.solucao || null,
        technicianId: validated.tecnico
          ? techCache.get(normalizeTechName(validated.tecnico)) || null
          : null,
        clientName: validated.cliente || null,
        city: validated.cidade || null,
        plan: validated.plano || null,
        openedAt,
        closedAt,
        durationSeconds: validated.tempo ? parseInt(validated.tempo) * 60 : null,
        periodMonth: periodDate.getMonth() + 1,
        periodYear: periodDate.getFullYear(),
      });
    } catch (err: any) {
      errors.push({
        row: i + 2,
        error:
          err instanceof z.ZodError
            ? err.issues.map((e: any) => e.message).join(', ')
            : String(err),
      });
    }
  }

  const CHUNK_SIZE = 500;
  for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
    await db.insert(qualityRecords).values(validRecords.slice(i, i + CHUNK_SIZE));
  }
}

async function processSupportRecords(
  rows: Record<string, string>[],
  errors: Array<{ row: number; error: string }>
) {
  const validRecords = [];
  const now = new Date();

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const validated = supportRowSchema.parse(row);

      validRecords.push({
        attendantName: normalizeTechName(validated.tecnico),
        openedManutExt: parseInt(validated.aberta_manut_ext || '0') || 0,
        percentage: validated.percentual?.replace(',', '.') || null,
        withoutManut: parseInt(validated.sem_manut || '0') || 0,
        total: parseInt(validated.total || '0') || 0,
        periodMonth: parseInt(validated.mes || String(now.getMonth() + 1)),
        periodYear: parseInt(validated.ano || String(now.getFullYear())),
      });
    } catch (err: any) {
      errors.push({
        row: i + 2,
        error:
          err instanceof z.ZodError
            ? err.issues.map((e: any) => e.message).join(', ')
            : String(err),
      });
    }
  }

  if (validRecords.length > 0) {
    await db.insert(supportRecords).values(validRecords);
  }
}
