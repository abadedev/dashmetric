import { sql } from 'drizzle-orm';
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

async function getDistinctValues(table: any, column: any, limit = 100) {
  const rows = await db
    .select({ value: column })
    .from(table)
    .where(sql`${column} is not null and btrim(${column}) <> ''`)
    .groupBy(column)
    .limit(limit);

  return normalizeOptions(rows.map((row) => row.value));
}

async function getAttendanceOptions(): Promise<OptionMap> {
  const [type, city, plan, bairro, source] = await Promise.all([
    getDistinctValues(atendimentos, atendimentos.tipo),
    getDistinctValues(atendimentos, atendimentos.cidade),
    getDistinctValues(atendimentos, atendimentos.plano),
    getDistinctValues(atendimentos, atendimentos.bairro),
    getDistinctValues(atendimentos, atendimentos.indicacao),
  ]);

  return { type, city, plan, bairro, source };
}

async function getQualityOptions(): Promise<OptionMap> {
  const [type, city, plan] = await Promise.all([
    getDistinctValues(qualityRecords, qualityRecords.indicator),
    getDistinctValues(qualityRecords, qualityRecords.city),
    getDistinctValues(qualityRecords, qualityRecords.plan),
  ]);

  return { type, city, plan };
}

async function getSalesOptions(): Promise<OptionMap> {
  const [type, city, plan, source] = await Promise.all([
    getDistinctValues(salesRecords, salesRecords.recordType),
    getDistinctValues(salesRecords, salesRecords.city),
    getDistinctValues(salesRecords, salesRecords.plan),
    getDistinctValues(salesRecords, salesRecords.source),
  ]);

  return { type, city, plan, source };
}

async function getCancellationOptions(): Promise<OptionMap> {
  const [category, city, plan, source] = await Promise.all([
    getDistinctValues(cancellationRecords, cancellationRecords.reason),
    getDistinctValues(cancellationRecords, cancellationRecords.city),
    getDistinctValues(cancellationRecords, cancellationRecords.plan),
    getDistinctValues(cancellationRecords, cancellationRecords.source),
  ]);

  return { category, city, plan, source };
}

export async function getModuleFilterPayload(resource: ModuleFilterResource) {
  const contract = getModuleFilterContract(resource);

  const optionsByModule: Record<ModuleFilterResource, () => Promise<OptionMap>> = {
    attendances: getAttendanceOptions,
    quality: getQualityOptions,
    sales: getSalesOptions,
    cancellations: getCancellationOptions,
  };

  const options = await optionsByModule[resource]();

  return {
    resource,
    contract,
    options,
  };
}
