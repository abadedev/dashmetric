import { ExternalApiRequestError } from '@/lib/api/external-query';
import {
  getModuleRegistryEntry,
  MODULE_REGISTRY,
  type ModuleFilterDefinition,
  type ModuleFilterField,
} from '@/lib/modules/module-registry';

export const MODULE_FILTER_RESOURCE_MAP = {
  attendances: 'atendimentos',
  quality: 'qualidade',
  sales: 'vendas',
  cancellations: 'cancelamentos',
} as const;
/**
 * Naming adapter between English external/filter resources and legacy internal module slugs.
 * New technical contracts should prefer English names and map to legacy operational slugs here.
 */

export const MODULE_FILTER_RESOURCES = Object.keys(MODULE_FILTER_RESOURCE_MAP) as Array<keyof typeof MODULE_FILTER_RESOURCE_MAP>;

export type ModuleFilterResource = (typeof MODULE_FILTER_RESOURCES)[number];

export type ModuleFilterContract = {
  resource: ModuleFilterResource;
  title: string;
  description: string;
  internalEndpoint: string;
  externalEndpoint: string;
  fields: ModuleFilterField[];
};

function toModuleFilterContract(resource: ModuleFilterResource, filters: ModuleFilterDefinition): ModuleFilterContract {
  return {
    resource,
    title: filters.title,
    description: filters.description,
    internalEndpoint: `/api/module-filters/${resource}`,
    externalEndpoint: `/api/external/filter-options?resource=${resource}`,
    fields: filters.fields,
  };
}

export function getModuleFilterContract(resource: ModuleFilterResource) {
  const entry = getModuleRegistryEntry(MODULE_FILTER_RESOURCE_MAP[resource]);

  if (!entry.filters) {
    throw new ExternalApiRequestError(
      `O recurso "${resource}" nao possui contrato de filtros configurado.`,
      400,
      'missing_filter_contract'
    );
  }

  return toModuleFilterContract(resource, entry.filters);
}

export function parseModuleFilterResource(resource: string | null | undefined): ModuleFilterResource {
  const normalized = resource?.trim().toLowerCase();

  if (!normalized) {
    throw new ExternalApiRequestError(
      `O parametro "resource" e obrigatorio. Use um destes valores: ${MODULE_FILTER_RESOURCES.join(', ')}.`,
      400,
      'missing_resource'
    );
  }

  if (!MODULE_FILTER_RESOURCES.includes(normalized as ModuleFilterResource)) {
    throw new ExternalApiRequestError(
      `Resource invalido: "${resource}". Use um destes valores: ${MODULE_FILTER_RESOURCES.join(', ')}.`,
      400,
      'invalid_resource'
    );
  }

  return normalized as ModuleFilterResource;
}
