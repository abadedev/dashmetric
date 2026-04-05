import test from 'node:test';
import assert from 'node:assert/strict';

import type { SalesRecord } from '@/lib/db/schema';
import { buildSalesOverview } from './sales-service';

function makeRow(overrides: Partial<SalesRecord>): SalesRecord {
  return {
    id: 1,
    recordType: 'negociado',
    originSector: 'vendas',
    csvCategory: 'padrao',
    clientName: 'Cliente Exemplo',
    city: 'Manaus',
    source: null,
    indication: null,
    plan: null,
    observation: null,
    requestedAt: new Date('2026-02-10T00:00:00.000Z'),
    installedAt: null,
    periodMonth: 2,
    periodYear: 2026,
    createdAt: new Date('2026-02-10T00:00:00.000Z'),
    workspaceId: null,
    ...overrides,
  };
}

test('buildSalesOverview separa fechado padrao, fora do horario e pedido cancelado', () => {
  const rows: SalesRecord[] = [
    makeRow({ id: 1, recordType: 'negociado', clientName: 'Ana' }),
    makeRow({ id: 2, recordType: 'fechado', clientName: 'Ana' }),
    makeRow({ id: 3, recordType: 'fechado', clientName: 'Bruno', csvCategory: 'fora_horario' }),
    makeRow({ id: 4, recordType: 'pedido_cancelado', clientName: 'Carlos' }),
    makeRow({ id: 5, recordType: 'lead_marketing', clientName: 'Dora', source: 'marketing_digital' }),
  ];

  const result = buildSalesOverview(rows);

  assert.equal(result.totals.negotiatedClients, 1);
  assert.equal(result.totals.closedClients, 1);
  assert.equal(result.totals.outsideBusinessHoursClosedClients, 1);
  assert.equal(result.totals.cancelledOrders, 1);
  assert.equal(result.totals.marketingLeads, 1);
  assert.equal(result.totals.conversionRate, 1);

  assert.ok(result.byType.some((item) => item.type === 'Negociados' && item.total === 1));
  assert.ok(result.byType.some((item) => item.type === 'Fechados' && item.total === 1));
  assert.ok(result.byType.some((item) => item.type === 'Fechados Fora do Horario' && item.total === 1));
  assert.ok(result.byType.some((item) => item.type === 'Pedidos Cancelados' && item.total === 1));
});

test('buildSalesOverview ignora pedido cancelado no funil de conversao padrao', () => {
  const rows: SalesRecord[] = [
    makeRow({ id: 1, recordType: 'negociado', clientName: 'Ana' }),
    makeRow({ id: 2, recordType: 'pedido_cancelado', clientName: 'Ana' }),
  ];

  const result = buildSalesOverview(rows);

  assert.equal(result.totals.negotiatedClients, 1);
  assert.equal(result.totals.closedClients, 0);
  assert.equal(result.totals.cancelledOrders, 1);
  assert.equal(result.totals.conversionRate, 0);
});
