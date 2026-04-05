import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { atendimentos, cancellationRecords, qualityRecords, salesRecords } from '@/lib/db/schema';
import {
  getModuleFilterContract,
  type ModuleFilterResource,
} from './module-filters';

type OptionMap = Record<string, string[]>;

function normalizeOptions(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

async function getDistinctValues(table: any, column: any, workspaceId: string | null, limit = 100) {
  const whereClause = workspaceId
    ? and(eq(table.workspaceId, workspaceId), sql`${column} is not null and btrim(${column}) <> ''`)
    : sql`${column} is not null and btrim(${column}) <> ''`;

  const rows = await db
    .select({ value: column })
    .from(table)
    .where(whereClause)
    .groupBy(column)
    .limit(limit);

  return normalizeOptions(rows.map((row) => row.value));
}

async function getAttendanceOptions(workspaceId: string | null): Promise<OptionMap> {
  const [type, city, plan, bairro, source] = await Promise.all([
    getDistinctValues(atendimentos, atendimentos.tipo, workspaceId),
    getDistinctValues(atendimentos, atendimentos.cidade, workspaceId),
    getDistinctValues(atendimentos, atendimentos.plano, workspaceId),
    getDistinctValues(atendimentos, atendimentos.bairro, workspaceId),
    getDistinctValues(atendimentos, atendimentos.indicacao, workspaceId),
  ]);

  return { type, city, plan, bairro, source };
}

async function getQualityOptions(workspaceId: string | null): Promise<OptionMap> {
  const [type, city, plan] = await Promise.all([
    getDistinctValues(qualityRecords, qualityRecords.indicator, workspaceId),
    getDistinctValues(qualityRecords, qualityRecords.city, workspaceId),
    getDistinctValues(qualityRecords, qualityRecords.plan, workspaceId),
  ]);

  return { type, city, plan };
}

async function getSalesOptions(workspaceId: string | null): Promise<OptionMap> {
  const [type, city, plan, source] = await Promise.all([
    getDistinctValues(salesRecords, salesRecords.recordType, workspaceId),
    getDistinctValues(salesRecords, salesRecords.city, workspaceId),
    getDistinctValues(salesRecords, salesRecords.plan, workspaceId),
    getDistinctValues(salesRecords, salesRecords.source, workspaceId),
  ]);

  return { type, city, plan, source };
}

async function getCancellationOptions(workspaceId: string | null): Promise<OptionMap> {
  const [category, city, plan, source] = await Promise.all([
    getDistinctValues(cancellationRecords, cancellationRecords.reason, workspaceId),
    getDistinctValues(cancellationRecords, cancellationRecords.city, workspaceId),
    getDistinctValues(cancellationRecords, cancellationRecords.plan, workspaceId),
    getDistinctValues(cancellationRecords, cancellationRecords.source, workspaceId),
  ]);

  return { category, city, plan, source };
}

export async function getModuleFilterPayload(resource: ModuleFilterResource, workspaceId: string | null = null) {
  const contract = getModuleFilterContract(resource);

  const optionsByModule: Record<ModuleFilterResource, (id: string | null) => Promise<OptionMap>> = {
    attendances: getAttendanceOptions,
    quality: getQualityOptions,
    sales: getSalesOptions,
    cancellations: getCancellationOptions,
  };

  const options = await optionsByModule[resource](workspaceId);

  return {
    resource,
    contract,
    options,
  };
}
