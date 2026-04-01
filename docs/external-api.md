# External API

API externa para integrações via n8n e agentes de IA.

## Autenticação

Configure no `.env`:

```env
EXTERNAL_API_TOKEN=troque-este-token-por-um-valor-forte
```

Envie o token em todas as chamadas:

```http
Authorization: Bearer SEU_TOKEN
```

## Resposta padrão

```json
{
  "success": true,
  "data": {},
  "meta": {
    "generatedAt": "2026-04-01T12:00:00.000Z",
    "source": "database",
    "handler": "summary"
  },
  "filters": {
    "startDate": "2026-03-01T00:00:00.000Z",
    "endDate": "2026-03-31T23:59:59.999Z",
    "groupBy": "day",
    "limit": 50,
    "page": 1
  },
  "error": null
}
```

## Endpoints

### `GET /api/external/summary`

Retorna visão consolidada de instalações, atendimentos, suporte, vendas, cancelamentos, qualidade e SLA.

### `GET /api/external/installations`

Filtros suportados:
- `startDate`
- `endDate`
- `period`
- `technicianId`
- `status`
- `groupBy`
- `limit`
- `page`

### `GET /api/external/attendances`

Filtros suportados:
- `startDate`
- `endDate`
- `period`
- `technicianId`
- `type`
- `status`
- `city`
- `search`
- `groupBy`
- `limit`
- `page`

### `GET /api/external/ranking`

Filtros suportados:
- `startDate`
- `endDate`
- `period`
- `city`
- `limit`

### `GET /api/external/phone-support`

Filtros suportados:
- `startDate`
- `endDate`
- `period`
- `limit`

### `GET /api/external/sla`

Filtros suportados:
- `startDate`
- `endDate`
- `period`
- `technicianId`
- `type`
- `status`

### `GET /api/external/query`

Endpoint flexível. Exige o parâmetro `resource`.

Valores aceitos:
- `summary`
- `installations`
- `attendances`
- `ranking`
- `phone-support`
- `sla`

## Filtros de período

Além de `startDate` e `endDate`, a API aceita:
- `period=7d`
- `period=30d`
- `period=90d`
- `period=current_month`
- `period=previous_month`

## Exemplos

```bash
curl -H "Authorization: Bearer MEU_TOKEN" "http://localhost:3000/api/external/summary?startDate=2026-03-01&endDate=2026-03-31"
```

```bash
curl -H "Authorization: Bearer MEU_TOKEN" "http://localhost:3000/api/external/ranking?startDate=2026-03-01&endDate=2026-03-31&limit=20"
```

```bash
curl -H "Authorization: Bearer MEU_TOKEN" "http://localhost:3000/api/external/phone-support?period=30d"
```

```bash
curl -H "Authorization: Bearer MEU_TOKEN" "http://localhost:3000/api/external/query?resource=attendances&startDate=2026-03-01&endDate=2026-03-31&groupBy=week"
```

## Uso no n8n

No node HTTP Request:
- Method: `GET`
- Authentication: `None`
- Header:
  - `Authorization: Bearer SEU_TOKEN`
- Response format: `JSON`

