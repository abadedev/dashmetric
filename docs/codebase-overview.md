# Codebase Overview

Este arquivo documenta a estrutura principal do projeto `dstech-noc` para servir como contexto técnico completo em prompts para IA, onboarding e referência rápida.

## Resumo

- Nome: `dstech-noc`
- Stack principal: `Next.js 16`, `React 19`, `TypeScript`, `Drizzle ORM`, `PostgreSQL`, `Better Auth`, `React Query`, `Tailwind CSS`, `shadcn/base-ui`
- Objetivo do sistema:
  - importar arquivos operacionais (`atendimentos`, `qualidade`, `suporte`)

## Estrutura Raiz

```text
dstech-noc/
├─ docs/
├─ drizzle/
├─ public/
├─ scripts/
├─ src/
├─ .env
├─ components.json
├─ drizzle.config.ts
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
├─ README.md
└─ tsconfig.json
```

## Scripts do Projeto

Definidos em [package.json](d:/Relatoria.SLA/dstech-noc/package.json):

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test:sla`
- `npm run test:classify`
- `npm run seed`
- `npm run fix:technicians`

## Diretórios Principais

### `src/app`

Contém o App Router do Next.js:

- páginas públicas/autenticação
- páginas autenticadas do dashboard
- rotas de API
- layout global

### `src/components`

Contém a UI reutilizável e componentes de domínio:

- layout
- dashboard
- atendimentos
- qualidade
- ranking
- suporte
- upload
- componentes `ui`

### `src/lib`

Contém a lógica de negócio e infraestrutura:

- autenticação
- banco de dados
- importação
- SLA
- serviços
- utilitários
- validações

### `drizzle`

Migrações SQL e snapshots do schema.

### `scripts`

Scripts auxiliares e correções pontuais de dados.

## Rotas de Página

### Públicas / Auth

- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/page.tsx)
- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(auth)/auth/page.tsx)

### Área autenticada

Layout:

- [layout.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/layout.tsx)

Páginas:

- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/dashboard/page.tsx)
- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/atendimentos/page.tsx)
- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/qualidade/page.tsx)
- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/ranking/page.tsx)
- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/resumo-sla/page.tsx)
- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/suporte/page.tsx)
- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/upload/page.tsx)
- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/admin/page.tsx)

## Rotas de API

### Importação

- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/importar/atendimentos/route.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/import/route.ts)

Responsabilidades:

- receber arquivo via `FormData`
- detectar tipo do arquivo
- parsear CSV/XLSX
- detectar tipo de planilha
- roteamento para o importador correto

### Dados analíticos

- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/dashboard/route.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/service-orders/route.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/quality-records/route.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/ranking/route.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/sla-summary/route.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/support-records/route.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/technicians/route.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/admin/diag-import/route.ts)

### Autenticação

- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/auth/[...all]/route.ts)

## Layout e Navegação

Arquivos principais:

- [layout.tsx](d:/Relatoria.SLA/dstech-noc/src/app/layout.tsx)
- [globals.css](d:/Relatoria.SLA/dstech-noc/src/app/globals.css)
- [providers.tsx](d:/Relatoria.SLA/dstech-noc/src/components/providers.tsx)
- [sidebar.tsx](d:/Relatoria.SLA/dstech-noc/src/components/layout/sidebar.tsx)
- [header.tsx](d:/Relatoria.SLA/dstech-noc/src/components/layout/header.tsx)
- [page-layout.tsx](d:/Relatoria.SLA/dstech-noc/src/components/layout/page-layout.tsx)

Responsabilidades:

- shell principal do sistema
- sessão/autenticação no header
- navegação lateral
- filtros globais por período

## Autenticação

Arquivos principais:

- [auth.ts](d:/Relatoria.SLA/dstech-noc/src/lib/auth.ts)
- [auth-client.ts](d:/Relatoria.SLA/dstech-noc/src/lib/auth-client.ts)
- [require-auth.ts](d:/Relatoria.SLA/dstech-noc/src/lib/require-auth.ts)
- [middleware.ts](d:/Relatoria.SLA/dstech-noc/src/middleware.ts)
- [login-form.tsx](d:/Relatoria.SLA/dstech-noc/src/components/login-form.tsx)

Características:

- usa `better-auth`
- sessão disponível no frontend para exibir nome, foto e role
- rotas protegidas via `requireAuth`
- controle de acesso para área admin

## Banco de Dados

Arquivos principais:

- [index.ts](d:/Relatoria.SLA/dstech-noc/src/lib/db/index.ts)
- [schema.ts](d:/Relatoria.SLA/dstech-noc/src/lib/db/schema.ts)
- [seed.ts](d:/Relatoria.SLA/dstech-noc/src/lib/db/seed.ts)
- [drizzle.config.ts](d:/Relatoria.SLA/dstech-noc/drizzle.config.ts)

### Tabelas principais do domínio

Autenticação:

- `user`
- `session`
- `account`
- `verification`

Operação:

- `technicians`
- `service_orders`
- `quality_records`
- `support_records`
- `support_call_categories`
- `holidays`
- `sla_targets`

Importação nova:

- `lotes_importacao`
- `importacoes_brutas`
- `atendimentos`

### Enums relevantes

- `roleEnum`
- `activityTypeEnum`
- `qualityIndicatorEnum`
- `importStatusEnum`

## Fluxo de Importação

### Arquivos centrais

- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/importar/atendimentos/route.ts)
- [detect-file-type.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/detect-file-type.ts)
- [detectar-tipo-planilha.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/detectar-tipo-planilha.ts)
- [parse-csv.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/parse-csv.ts)
- [parse-xlsx.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/parse-xlsx.ts)

### Importadores

- [importar-atendimentos.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/importar-atendimentos.ts)
- [importar-qualidade.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/importar-qualidade.ts)
- [importar-suporte.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/importar-suporte.ts)

### Helpers e utilitários

- [normalizar-linha.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/normalizar-linha.ts)
- [mapear-atendimento.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/mapear-atendimento.ts)
- [helpers.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/helpers.ts)
- [deduplicar-importacao.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/deduplicar-importacao.ts)
- [calcular-sla.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/calcular-sla.ts)
- [calcular-sla-bi.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/calcular-sla-bi.ts)

### Fluxo resumido

1. usuário envia arquivo na tela de upload
2. API recebe o arquivo
3. sistema detecta extensão e conteúdo
4. parser converte para linhas normalizadas
5. tipo da planilha é inferido ou informado manualmente
6. rota delega para o importador correto
7. dados são validados, tratados e persistidos
8. páginas do dashboard consomem as APIs derivadas desse banco

## Upload

Arquivo principal:

- [csv-dropzone.tsx](d:/Relatoria.SLA/dstech-noc/src/components/upload/csv-dropzone.tsx)

Responsabilidades:

- upload de CSV/XLSX
- seleção do tipo de planilha
- opção de reimportação segura para qualidade
- integração com a API de importação

## SLA

Arquivos principais:

- [calculate-sla.ts](d:/Relatoria.SLA/dstech-noc/src/lib/sla/calculate-sla.ts)
- [calculate-sla.cases.ts](d:/Relatoria.SLA/dstech-noc/src/lib/sla/calculate-sla.cases.ts)
- [calculate-sla.test.ts](d:/Relatoria.SLA/dstech-noc/src/lib/sla/calculate-sla.test.ts)
- [sla-engine.ts](d:/Relatoria.SLA/dstech-noc/src/lib/services/sla-engine.ts)
- [average.ts](d:/Relatoria.SLA/dstech-noc/src/lib/utils/average.ts)
- [average.test.ts](d:/Relatoria.SLA/dstech-noc/src/lib/utils/average.test.ts)

Responsabilidades:

- cálculo de SLA corrido
- cálculo de SLA útil
- médias reutilizáveis
- proteção contra divisão por zero
- exclusão de valores inválidos quando aplicável

## Módulo de Qualidade

Páginas e componentes:

- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/qualidade/page.tsx)
- [indicator-cards.tsx](d:/Relatoria.SLA/dstech-noc/src/components/qualidade/indicator-cards.tsx)
- [indicator-trend.tsx](d:/Relatoria.SLA/dstech-noc/src/components/qualidade/indicator-trend.tsx)
- [quality-table.tsx](d:/Relatoria.SLA/dstech-noc/src/components/qualidade/quality-table.tsx)

Backend/importação:

- [importar-qualidade.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/importar-qualidade.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/quality-records/route.ts)

## Módulo de Suporte

Páginas e componentes:

- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/suporte/page.tsx)
- [support-table.tsx](d:/Relatoria.SLA/dstech-noc/src/components/suporte/support-table.tsx)
- [support-chart.tsx](d:/Relatoria.SLA/dstech-noc/src/components/suporte/support-chart.tsx)

Backend/importação:

- [importar-suporte.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/importar-suporte.ts)
- [classify-support.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/classify-support.ts)
- [classify-support.test.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/classify-support.test.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/support-records/route.ts)

Função do módulo:

- importar CSV de suporte por telefone
- classificar por `ProblemaReclamado`
- consolidar resumo por categoria
- exibir tabela consolidada por tipo

## Módulo de Atendimentos

Páginas e componentes:

- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/atendimentos/page.tsx)
- [columns.tsx](d:/Relatoria.SLA/dstech-noc/src/components/atendimentos/columns.tsx)
- [filters.tsx](d:/Relatoria.SLA/dstech-noc/src/components/atendimentos/filters.tsx)
- [os-detail-sheet.tsx](d:/Relatoria.SLA/dstech-noc/src/components/atendimentos/os-detail-sheet.tsx)

Backend:

- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/service-orders/route.ts)
- [importar-atendimentos.ts](d:/Relatoria.SLA/dstech-noc/src/lib/importacao/importar-atendimentos.ts)

## Módulo de Ranking

Páginas e componentes:

- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/ranking/page.tsx)
- [ranking-table.tsx](d:/Relatoria.SLA/dstech-noc/src/components/ranking/ranking-table.tsx)
- [top5-cards.tsx](d:/Relatoria.SLA/dstech-noc/src/components/ranking/top5-cards.tsx)
- [tech-detail-dialog.tsx](d:/Relatoria.SLA/dstech-noc/src/components/ranking/tech-detail-dialog.tsx)

Serviços:

- [ranking-service.ts](d:/Relatoria.SLA/dstech-noc/src/lib/services/ranking-service.ts)
- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/ranking/route.ts)

## Dashboard

Página:

- [page.tsx](d:/Relatoria.SLA/dstech-noc/src/app/(dashboard)/dashboard/page.tsx)

Componentes:

- [kpi-cards.tsx](d:/Relatoria.SLA/dstech-noc/src/components/dashboard/kpi-cards.tsx)
- [quality-summary.tsx](d:/Relatoria.SLA/dstech-noc/src/components/dashboard/quality-summary.tsx)
- [sla-by-type-table.tsx](d:/Relatoria.SLA/dstech-noc/src/components/dashboard/sla-by-type-table.tsx)
- [top5-ranking.tsx](d:/Relatoria.SLA/dstech-noc/src/components/dashboard/top5-ranking.tsx)
- [volume-pie-chart.tsx](d:/Relatoria.SLA/dstech-noc/src/components/dashboard/volume-pie-chart.tsx)

API:

- [route.ts](d:/Relatoria.SLA/dstech-noc/src/app/api/dashboard/route.ts)

## UI Base

Componentes reutilizáveis em `src/components/ui`:

- `badge`
- `breadcrumb`
- `button`
- `calendar`
- `card`
- `date-range-picker`
- `dialog`
- `dropdown-menu`
- `field`
- `global-date-filter`
- `input`
- `label`
- `popover`
- `progress`
- `select`
- `separator`
- `sheet`
- `skeleton`
- `table`
- `tabs`

## Serviços

Arquivos principais:

- [import-service.ts](d:/Relatoria.SLA/dstech-noc/src/lib/services/import-service.ts)
- [ranking-service.ts](d:/Relatoria.SLA/dstech-noc/src/lib/services/ranking-service.ts)
- [sla-engine.ts](d:/Relatoria.SLA/dstech-noc/src/lib/services/sla-engine.ts)

## Utilitários e Validação

Utilitários:

- [utils.ts](d:/Relatoria.SLA/dstech-noc/src/lib/utils.ts)
- [format.ts](d:/Relatoria.SLA/dstech-noc/src/lib/utils/format.ts)
- [average.ts](d:/Relatoria.SLA/dstech-noc/src/lib/utils/average.ts)

Validação:

- [import-atendimento.schema.ts](d:/Relatoria.SLA/dstech-noc/src/lib/validators/import-atendimento.schema.ts)

## Arquivos Públicos

- [logo.png](d:/Relatoria.SLA/dstech-noc/public/logo.png)

## Migrações

Arquivos:

- [0000_majestic_sinister_six.sql](d:/Relatoria.SLA/dstech-noc/drizzle/migrations/0000_majestic_sinister_six.sql)
- [0001_remove_atend_hash_unique.sql](d:/Relatoria.SLA/dstech-noc/drizzle/migrations/0001_remove_atend_hash_unique.sql)
- [0002_perpetual_wildside.sql](d:/Relatoria.SLA/dstech-noc/drizzle/migrations/0002_perpetual_wildside.sql)

Meta:

- [0000_snapshot.json](d:/Relatoria.SLA/dstech-noc/drizzle/migrations/meta/0000_snapshot.json)
- [0002_snapshot.json](d:/Relatoria.SLA/dstech-noc/drizzle/migrations/meta/0002_snapshot.json)
- [_journal.json](d:/Relatoria.SLA/dstech-noc/drizzle/migrations/meta/_journal.json)

## Scripts Auxiliares

- [fix-atendimento-externo.ts](d:/Relatoria.SLA/dstech-noc/scripts/fix-atendimento-externo.ts)
- [fix-technician-links.ts](d:/Relatoria.SLA/dstech-noc/scripts/fix-technician-links.ts)
- [fix-tipos.ts](d:/Relatoria.SLA/dstech-noc/scripts/fix-tipos.ts)
- [test-parser.ts](d:/Relatoria.SLA/dstech-noc/scripts/test-parser.ts)

## Observações Importantes Para Prompts de IA

Quando pedir ajuda para outra IA sobre este projeto, vale informar estas regras:

- não criar fluxo paralelo fora da arquitetura atual
- reutilizar `src/lib/importacao/*` sempre que o assunto for importação
- respeitar o App Router do Next.js
- manter Drizzle + PostgreSQL
- não duplicar regra de negócio em frontend e backend sem necessidade
- preferir integrar mudanças nas APIs e componentes já existentes
- considerar que parte do sistema usa filtros por período (`from` e `to`)
- considerar que o sistema tem autenticação e áreas protegidas

## Prompt Base Sugerido

```md
Estou trabalhando em um projeto Next.js com App Router, TypeScript, Drizzle ORM e PostgreSQL.

Quero ajuda para alterar esse sistema sem quebrar a arquitetura atual.

Leia este contexto do codebase e proponha mudanças integradas, sem criar fluxo paralelo e sem duplicar lógica.

Contexto:
- autenticação com Better Auth
- banco com Drizzle/PostgreSQL
- importação centralizada em `src/lib/importacao`
- APIs em `src/app/api`
- dashboard autenticado em `src/app/(dashboard)`
- componentes reutilizáveis em `src/components`

Quero que você:
1. identifique os arquivos corretos para alterar
2. descreva o fluxo atual dos dados
3. proponha a implementação respeitando a estrutura existente
4. aponte riscos de regressão
5. sugira testes quando fizer sentido
```
