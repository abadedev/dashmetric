# Dashmetric — External API

API externa do Dashmetric para integração com N8N, OpenRouter e agentes de IA.

---

## Autenticação

Todas as rotas exigem Bearer Token no header `Authorization`.

```
Authorization: Bearer <EXTERNAL_API_TOKEN>
```

A variável `EXTERNAL_API_TOKEN` é configurada no `.env` do servidor.

**Erros de autenticação:**

| Status | Código | Descrição |
|--------|--------|-----------|
| 401 | `invalid_authorization_header` | Header ausente ou formato incorreto |
| 401 | `invalid_token` | Token inválido |
| 503 | `external_api_token_not_configured` | Token não configurado no servidor |

---

## Formato padrão de resposta

Todas as rotas retornam o mesmo envelope:

```json
{
  "success": true,
  "data": { },
  "meta": {
    "generatedAt": "2026-04-02T14:00:00.000Z",
    "source": "database",
    "handler": "attendances"
  },
  "filters": {
    "startDate": "2026-03-01T00:00:00.000Z",
    "endDate": "2026-03-31T23:59:59.999Z",
    "period": "current_month",
    "groupBy": "day",
    "limit": 50,
    "page": 1
  },
  "error": null
}
```

**Em caso de erro:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "invalid_query_params",
    "message": "Invalid startDate value."
  }
}
```

---

## Filtros comuns

Todos os endpoints aceitam os filtros abaixo via query string.

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `startDate` | `YYYY-MM-DD` ou ISO | — | Data de início |
| `endDate` | `YYYY-MM-DD` ou ISO | — | Data de fim |
| `period` | string | — | Atalho de período (ver abaixo) |
| `groupBy` | `day` \| `week` \| `month` | `day` | Agrupamento temporal |
| `limit` | 1–200 | `50` | Itens por página |
| `page` | ≥1 | `1` | Página atual |
| `city` | string | — | Filtrar por cidade (exato) |
| `search` | string | — | Busca por nome do cliente ou OS |
| `type` | string | — | Tipo/indicador (varia por endpoint) |
| `category` | string | — | Categoria ou motivo (varia por endpoint) |
| `technicianId` | número inteiro | — | Filtrar por ID do técnico |
| `status` | `open` \| `closed` \| `ok` \| `nok` \| `all` | — | Status (open/closed = finalização; ok/nok = SLA) |

**Períodos disponíveis (`period`):**

| Valor | Intervalo |
|-------|-----------|
| `7d` | Últimos 7 dias |
| `30d` | Últimos 30 dias |
| `90d` | Últimos 90 dias |
| `current_month` | Mês atual (1º dia até hoje) |
| `previous_month` | Mês anterior completo |

> Se `startDate`/`endDate` e `period` forem informados juntos, `startDate`/`endDate` têm prioridade.

---

## Endpoints

### GET /api/external/summary

Resumo geral consolidado com dados de todos os módulos.

**Filtros:** `startDate`, `endDate`, `period`

**`data`:**
```json
{
  "totals": {
    "installations": 430,
    "attendances": 1250,
    "phoneSupports": 320,
    "cancellations": 45,
    "negotiatedClients": 180,
    "closedClients": 140,
    "outsideBusinessHoursClosedClients": 12,
    "installedOrders": 98,
    "cancelledOrders": 7,
    "qualityRecords": 55
  },
  "sales": {
    "negotiatedClients": 180,
    "closedClients": 140,
    "conversionRate": 0.7778
  },
  "cancellations": {
    "cancelledClients": 45,
    "cities": 8
  },
  "sla": {
    "total": 1250,
    "concluded": 1100,
    "withinSlaCorrido": 980,
    "withinSlaUtil": 1020,
    "outsideSlaUtil": 80,
    "avgSlaCorridoPercent": 0.8909,
    "avgSlaUtilPercent": 0.9273
  }
}
```

---

### GET /api/external/attendances

Atendimentos (ordens de serviço) com SLA, agrupamento temporal e paginação.

**Filtros:** `startDate`, `endDate`, `period`, `type`, `technicianId`, `city`, `search`, `status`, `groupBy`, `limit`, `page`

**`type`** — tipo de atividade exato: `Instalação (Nova)`, `Instalação (Reativação)`, `Reparo`, `Mudança de Endereço`, etc.

**`status`:** `open` = em aberto · `closed` = finalizado · `ok` = dentro do SLA · `nok` = fora do SLA

**`data`:**
```json
{
  "totals": {
    "total": 1250,
    "open": 150,
    "closed": 1100,
    "withinSlaUtil": 1020,
    "outsideSlaUtil": 80
  },
  "grouped": [
    { "bucket": "2026-03-01", "total": 42 }
  ],
  "byType": [
    { "type": "Reparo", "total": 620 }
  ],
  "byTechnician": [
    { "technicianId": 12, "technicianName": "João Silva", "total": 95 }
  ],
  "items": [
    {
      "id": 1,
      "osNumber": "OS-00123",
      "activityType": "Reparo",
      "clientName": "Maria Santos",
      "city": "São Paulo",
      "plan": "Fibra 300MB",
      "openedAt": "2026-03-15T08:00:00.000Z",
      "closedAt": "2026-03-15T10:30:00.000Z",
      "technicianId": 12,
      "technicianName": "João Silva",
      "withinSlaUtil": true,
      "slaUtilSeconds": 9000,
      "periodMonth": 3,
      "periodYear": 2026
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "returned": 50,
    "total": 1250
  }
}
```

---

### GET /api/external/installations

Somente instalações (nova + reativação). Estrutura idêntica a `attendances`.

**Filtros:** `startDate`, `endDate`, `period`, `technicianId`, `city`, `status`, `groupBy`, `limit`, `page`

**`data`:**
```json
{
  "totals": {
    "total": 430,
    "open": 30,
    "closed": 400,
    "newInstallations": 310,
    "reactivations": 120
  },
  "grouped": [ { "bucket": "2026-03-01", "total": 14 } ],
  "byTechnician": [ { "technicianId": 12, "technicianName": "João Silva", "total": 38 } ],
  "items": [ { "...": "mesma estrutura de attendances" } ],
  "pagination": { "page": 1, "limit": 50, "returned": 50, "total": 430 }
}
```

---

### GET /api/external/sla

Análise de SLA por tipo de atividade (corrido e útil).

**Filtros:** `startDate`, `endDate`, `period`, `type`, `technicianId`, `city`, `status`

**`data`:**
```json
{
  "totals": {
    "total": 1250,
    "concluded": 1100,
    "withinSlaCorrido": 980,
    "withinSlaUtil": 1020,
    "outsideSlaUtil": 80,
    "avgSlaCorridoPercent": 0.8909,
    "avgSlaUtilPercent": 0.9273
  },
  "byType": [
    {
      "activityType": "Reparo",
      "slaTargetHours": 8,
      "total": 620,
      "concluded": 560,
      "withinSlaCorrido": 490,
      "withinSlaUtil": 520,
      "outsideSlaUtil": 40,
      "avgCorridoSeconds": 22400,
      "avgUtilSeconds": 18600,
      "slaCorridoPercent": 0.875,
      "slaUtilPercent": 0.9286
    }
  ]
}
```

---

### GET /api/external/ranking

Ranking de técnicos por volume de OS/SLA e ranking de atendentes de suporte.

**Filtros:** `startDate`, `endDate`, `period`, `limit`

**`data`:**
```json
{
  "technicians": [
    {
      "position": 1,
      "technicianId": 12,
      "technicianName": "João Silva",
      "totalOS": 95,
      "concluded": 90,
      "withinSlaUtil": 84,
      "avgSlaUtilFormatted": "04:32:10",
      "slaUtilPercent": 93
    }
  ],
  "attendants": [
    {
      "position": 1,
      "attendantName": "Ana Costa",
      "totalSupports": 210,
      "totalWithoutManut": 180,
      "totalOpenedManutExt": 30
    }
  ]
}
```

---

### GET /api/external/phone-support

Atendimentos de suporte por telefone: por atendente e por categoria de chamada.

**Filtros:** `startDate`, `endDate`, `period`, `limit`

> O filtro de período para suporte é baseado em `periodMonth`/`periodYear`, não em timestamp.

**`data`:**
```json
{
  "totals": {
    "totalSupports": 320,
    "totalOpenedManutExt": 45,
    "totalWithoutManut": 275,
    "attendants": 8,
    "categories": 12
  },
  "byAttendant": [
    {
      "attendantName": "Ana Costa",
      "total": 210,
      "openedManutExt": 30,
      "withoutManut": 180,
      "sharePercent": 65.63
    }
  ],
  "byCategory": [
    { "category": "Queda de sinal", "total": 85, "sharePercent": 26.56 }
  ],
  "records": [
    {
      "attendantName": "Ana Costa",
      "openedManutExt": 30,
      "percentage": 14.29,
      "withoutManut": 180,
      "total": 210,
      "periodMonth": 3,
      "periodYear": 2026
    }
  ]
}
```

---

### GET /api/external/sales

Visão de vendas: negociados, fechados, instalados, cancelados, leads de marketing.

**Filtros:** `startDate`, `endDate`, `period`, `type`, `city`, `search`, `limit`, `page`

**`type`:** `negociado` · `fechado` · `lead_marketing` · `pedido_instalado` · `pedido_cancelado`

**`data`:**
```json
{
  "totals": {
    "negotiatedClients": 180,
    "closedClients": 140,
    "outsideBusinessHoursClosedClients": 12,
    "marketingLeads": 35,
    "installedOrders": 98,
    "cancelledOrders": 7,
    "conversionRate": 0.7778
  },
  "byType": [
    { "type": "Negociados", "total": 180 },
    { "type": "Fechados", "total": 140 }
  ],
  "byCity": [
    { "city": "São Paulo", "total": 62 }
  ],
  "bySource": [
    { "source": "indicacao", "total": 75 }
  ],
  "items": [
    {
      "id": 1,
      "recordType": "negociado",
      "clientName": "Carlos Oliveira",
      "city": "São Paulo",
      "plan": "Fibra 500MB",
      "source": "indicacao",
      "indication": "João Cliente",
      "requestedAt": "2026-03-10T09:00:00.000Z",
      "installedAt": null,
      "periodMonth": 3,
      "periodYear": 2026
    }
  ],
  "pagination": { "page": 1, "limit": 50, "returned": 50, "total": 180 }
}
```

---

### GET /api/external/cancellations

Cancelamentos por motivo e cidade.

**Filtros:** `startDate`, `endDate`, `period`, `city`, `category`, `search`, `limit`, `page`

**`category`** — filtra pelo campo `reason` exato, ex: `Inadimplência`.

**`data`:**
```json
{
  "totals": {
    "cancelledClients": 45,
    "cities": 8,
    "reasons": 6
  },
  "byReason": [
    { "reason": "Inadimplência", "total": 18 },
    { "reason": "Mudança de endereço", "total": 12 }
  ],
  "byCity": [
    { "city": "São Paulo", "total": 20 }
  ],
  "items": [
    {
      "id": 1,
      "clientName": "Pedro Lima",
      "city": "São Paulo",
      "reason": "Inadimplência",
      "source": "retencao",
      "plan": "Fibra 100MB",
      "observation": null,
      "cancelledAt": "2026-03-05T00:00:00.000Z",
      "periodMonth": 3,
      "periodYear": 2026
    }
  ],
  "pagination": { "page": 1, "limit": 50, "returned": 45, "total": 45 }
}
```

---

### GET /api/external/quality

Registros de qualidade por indicador, técnico e cidade.

**Filtros:** `startDate`, `endDate`, `period`, `type`, `city`, `technicianId`, `search`, `limit`, `page`

**`type`** — indicador: `IQIv` · `IQRv` · `RTV` · `RST` · `ICT` · `Retorno`

**`data`:**
```json
{
  "totals": {
    "total": 55,
    "indicators": 6
  },
  "byIndicator": [
    { "indicator": "IQIv", "total": 18, "avgDurationSeconds": 14400 },
    { "indicator": "RTV",  "total": 12, "avgDurationSeconds": 7200 }
  ],
  "byCity": [
    { "city": "São Paulo", "total": 22 }
  ],
  "byTechnician": [
    { "technicianName": "João Silva", "total": 8 }
  ],
  "items": [
    {
      "id": 1,
      "osNumber": "OS-00456",
      "indicator": "IQIv",
      "reason": "Sinal fraco",
      "technicianName": "João Silva",
      "clientName": "Maria Santos",
      "city": "São Paulo",
      "plan": "Fibra 300MB",
      "openedAt": "2026-03-08T07:00:00.000Z",
      "closedAt": "2026-03-08T11:00:00.000Z",
      "durationSeconds": 14400,
      "periodMonth": 3,
      "periodYear": 2026
    }
  ],
  "pagination": { "page": 1, "limit": 50, "returned": 50, "total": 55 }
}
```

---

### GET /api/external/query

Endpoint unificado. Seleciona o módulo via `resource`.

**Parâmetro obrigatório:** `resource`

| `resource` | Equivalente |
|------------|-------------|
| `summary` | `/external/summary` |
| `attendances` | `/external/attendances` |
| `installations` | `/external/installations` |
| `sla` | `/external/sla` |
| `ranking` | `/external/ranking` |
| `phone-support` | `/external/phone-support` |
| `sales` | `/external/sales` |
| `cancellations` | `/external/cancellations` |
| `quality` | `/external/quality` |

**Exemplo:**
```
GET /api/external/query?resource=sales&period=current_month
```

---

## Exemplos de uso no N8N

### Configuração do nó HTTP Request

```
Method:      GET
URL:         https://seu-dominio.com/api/external/ENDPOINT
Headers:
  Authorization: Bearer {{ $env.DASHMETRIC_API_TOKEN }}
```

### Exemplos práticos

```
# Resumo do mês atual
GET /api/external/summary?period=current_month

# Atendimentos dos últimos 30 dias, página 2
GET /api/external/attendances?period=30d&limit=100&page=2

# Reparos fora do SLA de um técnico específico
GET /api/external/attendances?technicianId=12&type=Reparo&status=nok&period=current_month

# SLA por tipo, mês anterior
GET /api/external/sla?period=previous_month

# Vendas de março/2026
GET /api/external/sales?startDate=2026-03-01&endDate=2026-03-31

# Cancelamentos por motivo específico
GET /api/external/cancellations?category=Inadimplência&period=current_month

# Qualidade — apenas IQIv
GET /api/external/quality?type=IQIv&period=current_month

# Ranking top 20 do mês
GET /api/external/ranking?period=current_month&limit=20

# Query unificada via N8N (1 nó serve todos os módulos)
GET /api/external/query?resource=sla&period=previous_month
```

---

## Lógica de paginação no N8N

Para percorrer todas as páginas:

1. Primeira requisição com `page=1`
2. Verifique `data.pagination.returned < data.pagination.limit` → última página
3. Ou calcule: `Math.ceil(data.pagination.total / data.pagination.limit)` → total de páginas
4. Incremente `page` até concluir

**`pagination.total`** disponível em: `attendances`, `installations`, `sales`, `cancellations`, `quality`

---

## Códigos de erro

| Status | Código | Descrição |
|--------|--------|-----------|
| 400 | `invalid_query_params` | Parâmetro inválido |
| 401 | `invalid_token` | Bearer token incorreto |
| 401 | `invalid_authorization_header` | Header `Authorization` ausente ou malformado |
| 500 | `internal_server_error` | Erro interno no servidor |
| 503 | `external_api_token_not_configured` | `EXTERNAL_API_TOKEN` não definido no `.env` |
