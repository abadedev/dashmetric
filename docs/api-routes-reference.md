# API Routes Reference

Mapa consolidado das rotas do projeto, com finalidade, autenticação e filtros suportados.

## Convenções

- Autenticação interna:
  - `requireAuth`: usuário autenticado
  - `requireAdmin`: usuário administrador
- Autenticação externa:
  - header `Authorization: Bearer TOKEN`
  - token fixo via `EXTERNAL_API_TOKEN`
- Datas internas:
  - em geral usam `from` e `to`
- Datas da API externa:
  - usam `startDate` e `endDate`
  - também aceitam `period`

---

## Rotas Externas

### `GET /api/external/summary`

- Auth: token fixo Bearer
- O que faz: retorna visão consolidada de instalações, atendimentos, suporte por telefone, vendas, cancelamentos, qualidade e SLA
- Filtros:
  - `startDate`
  - `endDate`
  - `period`

### `GET /api/external/installations`

- Auth: token fixo Bearer
- O que faz: consulta instalações por período, agrupamento, técnico e status
- Filtros:
  - `startDate`
  - `endDate`
  - `period`
  - `technicianId`
  - `status`
  - `groupBy`
  - `limit`
  - `page`

### `GET /api/external/attendances`

- Auth: token fixo Bearer
- O que faz: consulta atendimentos operacionais com totais, agrupamentos, tipos, técnicos e lista paginada
- Filtros:
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

- Auth: token fixo Bearer
- O que faz: retorna ranking de técnicos e atendentes
- Filtros:
  - `startDate`
  - `endDate`
  - `period`
  - `city`
  - `limit`

### `GET /api/external/phone-support`

- Auth: token fixo Bearer
- O que faz: retorna totais de suporte por telefone, por atendente e por categoria
- Filtros:
  - `startDate`
  - `endDate`
  - `period`
  - `limit`

### `GET /api/external/sla`

- Auth: token fixo Bearer
- O que faz: expõe indicadores de SLA corrido e útil por tipo de atividade
- Filtros:
  - `startDate`
  - `endDate`
  - `period`
  - `technicianId`
  - `type`
  - `status`

### `GET /api/external/query`

- Auth: token fixo Bearer
- O que faz: endpoint flexível para o agente consultar um recurso específico usando o mesmo contrato
- Filtros:
  - `resource`
  - todos os filtros compatíveis com o recurso escolhido
- Valores aceitos em `resource`:
  - `summary`
  - `installations`
  - `attendances`
  - `ranking`
  - `phone-support`
  - `sla`

---

## Analytics Internas

### `GET /api/dashboard`

- Auth: usuário autenticado
- O que faz: resumo geral interno do dashboard com total de atendimentos, SLA geral e indicadores de qualidade
- Filtros:
  - `from`
  - `to`

### `GET /api/ranking`

- Auth: usuário autenticado
- O que faz: ranking de técnicos com agregações por tipo de atividade e SLA útil
- Filtros:
  - `from`
  - `to`
  - `city`

### `GET /api/service-orders`

- Auth: usuário autenticado
- O que faz: lista detalhada de atendimentos/OS com paginação
- Filtros:
  - `page`
  - `pageSize`
  - `from`
  - `to`
  - `type`
  - `technicianId`
  - `city`
  - `slaStatus`
  - `search`

### `GET /api/sla-summary`

- Auth: usuário autenticado
- O que faz: resumo de SLA por período e tipo de atividade
- Filtros:
  - `from`
  - `to`

### `GET /api/quality-records`

- Auth: usuário autenticado
- O que faz: lista de registros de qualidade com limite fixo
- Filtros:
  - `from`
  - `to`
  - `indicator`

### `GET /api/support-records`

- Auth: usuário autenticado
- O que faz: resumo classificado do suporte por telefone
- Filtros:
  - `from`
  - `to`

### `GET /api/sales`

- Auth: usuário autenticado
- O que faz: visão de vendas/funil comercial
- Filtros:
  - `from`
  - `to`

### `GET /api/cancellations`

- Auth: usuário autenticado
- O que faz: visão de cancelamentos de retenção
- Filtros:
  - `from`
  - `to`

### `GET /api/infrastructure`

- Auth: usuário autenticado
- O que faz: lista registros do módulo de infraestrutura
- Filtros:
  - `from`
  - `to`

### `GET /api/technicians`

- Auth: usuário autenticado
- O que faz: lista técnicos cadastrados
- Filtros:
  - nenhum

---

## Importação

### `POST /api/importar`

- Auth: usuário autenticado
- O que faz: fluxo unificado de importação de arquivos
- Tipos suportados:
  - `atendimentos`
  - `qualidade`
  - `suporte`
  - `vendas`
  - `cancelamentos`
  - `infraestrutura`
- Body esperado:
  - `file` em `form-data`
  - `tipoPlanilha` opcional
  - `reimportarQualidade=true` opcional
- Filtros:
  - não usa query params

### `POST /api/import`

- Auth: usuário autenticado
- O que faz: endpoint legado para importação de atendimentos; redireciona para o fluxo unificado
- Body esperado:
  - `file` em `form-data`

### `GET /api/import`

- Auth: usuário autenticado
- O que faz: lista lotes de importação registrados
- Filtros:
  - nenhum

### `GET /api/admin/diag-import`

- Auth: admin
- O que faz: interface HTML de diagnóstico de importação
- Filtros:
  - nenhum

### `POST /api/admin/diag-import`

- Auth: admin
- O que faz: executa diagnóstico de planilha enviada
- Body esperado:
  - `file` em `form-data`

---

## Feriados

### `GET /api/holidays`

- Auth: usuário autenticado
- O que faz: lista todos os feriados cadastrados
- Filtros:
  - nenhum

### `POST /api/holidays`

- Auth: usuário autenticado
- O que faz: cria um ou vários feriados
- Body esperado:
  - `{ date, name }` ou array de objetos

### `DELETE /api/holidays`

- Auth: usuário autenticado
- O que faz: remove um feriado por data
- Filtros:
  - `date`

---

## Módulos E Perfis De Importação

### `GET /api/modules`

- Auth: admin
- O que faz: lista todos os módulos do sistema
- Filtros:
  - nenhum

### `POST /api/modules`

- Auth: admin
- O que faz: cria módulo novo
- Body esperado:
  - campos como `name`, `slug`, `description`, `icon`, `sortOrder`, `isActive`, `showInSidebar`, `allowImport`, `requiredRole`

### `PATCH /api/modules/[id]`

- Auth: admin
- O que faz: atualiza módulo existente
- Filtros:
  - `id` via rota

### `DELETE /api/modules/[id]`

- Auth: admin
- O que faz: remove módulo existente
- Filtros:
  - `id` via rota

### `GET /api/modules/sidebar`

- Auth: usuário autenticado
- O que faz: retorna módulos visíveis na sidebar conforme permissões do usuário
- Filtros:
  - nenhum

### `POST /api/module-import-profiles`

- Auth: admin
- O que faz: cria perfil de importação de módulo
- Body esperado:
  - `moduleId`
  - `profileKey`
  - `label`
  - `detectorType`
  - `parameters`
  - `isActive`

### `PATCH /api/module-import-profiles/[id]`

- Auth: admin
- O que faz: atualiza perfil de importação
- Filtros:
  - `id` via rota

### `DELETE /api/module-import-profiles/[id]`

- Auth: admin
- O que faz: remove perfil de importação
- Filtros:
  - `id` via rota

---

## Administração De Usuários, Grupos E Permissões

### `GET /api/admin/permissions`

- Auth: admin
- O que faz: lista todas as permissões do sistema, garantindo módulos padrão
- Filtros:
  - nenhum

### `GET /api/admin/users`

- Auth: admin
- O que faz: lista usuários administrativos
- Filtros:
  - nenhum

### `PATCH /api/admin/users/[id]`

- Auth: admin
- O que faz: atualiza usuário
- Filtros:
  - `id` via rota

### `GET /api/admin/users/[id]/groups`

- Auth: admin
- O que faz: lista grupos do usuário
- Filtros:
  - `id` via rota

### `POST /api/admin/users/[id]/groups`

- Auth: admin
- O que faz: associa grupo a usuário
- Filtros:
  - `id` via rota

### `DELETE /api/admin/users/[id]/groups`

- Auth: admin
- O que faz: remove grupo do usuário
- Filtros:
  - `id` via rota

### `GET /api/admin/users/[id]/permissions`

- Auth: admin
- O que faz: lista permissões diretas do usuário
- Filtros:
  - `id` via rota

### `POST /api/admin/users/[id]/permissions`

- Auth: admin
- O que faz: atualiza permissões diretas do usuário
- Filtros:
  - `id` via rota

### `GET /api/admin/groups`

- Auth: admin
- O que faz: lista grupos de acesso
- Filtros:
  - nenhum

### `POST /api/admin/groups`

- Auth: admin
- O que faz: cria grupo de acesso
- Filtros:
  - nenhum

### `PATCH /api/admin/groups/[id]`

- Auth: admin
- O que faz: atualiza grupo
- Filtros:
  - `id` via rota

### `DELETE /api/admin/groups/[id]`

- Auth: admin
- O que faz: remove grupo
- Filtros:
  - `id` via rota

### `POST /api/admin/groups/[id]/permissions`

- Auth: admin
- O que faz: define permissões de um grupo
- Filtros:
  - `id` via rota

---

## Auth

### `ALL /api/auth/[...all]`

- Auth: rota do Better Auth
- O que faz: login, sessão e operações do sistema de autenticação
- Filtros:
  - controlados pela biblioteca

---

## Observações Importantes

- A API externa foi desenhada para n8n/agente de IA e usa contrato padronizado:
  - `success`
  - `data`
  - `meta`
  - `filters`
  - `error`
- As rotas internas mantêm os contratos originais do sistema.
- Em geral:
  - `from` e `to` são usados nas APIs internas
  - `startDate` e `endDate` são usados na API externa
- Rankings e indicadores reutilizam as regras já existentes, evitando lógica paralela.
