# DashMetric

Plataforma de inteligência operacional desenvolvida para a DSTech Telecom. Centraliza dados operacionais, automatiza o processamento de importações, aplica regras de negócio e disponibiliza os dados para dashboards, APIs e agentes de IA.

---

## O que é

O DashMetric nasceu de uma necessidade real: os dados da operação existiam, mas estavam espalhados em planilhas de Excel, exports manuais e sistemas sem integração. A consolidação era feita na mão, era lenta e imprecisa.

A plataforma resolve isso recebendo arquivos operacionais, identificando o tipo de cada um automaticamente, processando regras específicas de cada domínio (SLA, qualidade, suporte, vendas, cancelamentos), persistindo tudo de forma estruturada e expondo esses dados para leitura via interface, API interna, API externa e agente de IA.

---

## Módulos

| Módulo | Descrição |
|---|---|
| Dashboard Executivo | KPIs consolidados: volume, SLA (24h corridas), qualidade e top 5 técnicos |
| Atendimentos | Listagem paginada de OS com filtros por tipo, SLA, técnico, cidade e data |
| Ranking Técnicos | Desempenho por técnico com % de SLA, volume por tipo e comparativo entre períodos |
| Qualidade & Reclamações | Indicadores IQIv, IQRv, ICT, RST com entrada manual e importação via planilha |
| Suporte Técnico | Classificação automática de atendimentos por telefone em 12 categorias padronizadas |
| Vendas | Funil comercial: negociados, fechados, instalados, cancelados e leads de marketing |
| Cancelamentos | Indicadores de cancelamento por cidade, motivo e período |
| **Listagem de Serviços** | **Sistema completo de gestão de chamados de infraestrutura de rede** |
| Resumo SLA | Evolução mensal do SLA por tipo de atividade com gráficos comparativos |
| Análise Comparativa | Comparação entre dois períodos (A vs B) com delta em KPIs, qualidade e breakdown |
| Importar Dados | Upload de CSV/XLSX com detecção automática de tipo e feedback de erros por linha |
| Painel ADM | Gestão de módulos, usuários, grupos, permissões e perfis de importação |

---

## Listagem de Serviços — Módulo de Infraestrutura

Este é o módulo mais utilizado no dia a dia da operação e o que mais evoluiu em funcionalidade. Substituiu completamente uma planilha de controle manual que o coordenador de infraestrutura usava para gerenciar os chamados da rede.

### O que faz

Toda demanda de infraestrutura da rede DSTech — reportada por técnicos externos ou monitoradores de rede — é registrada na Listagem de Serviços. O coordenador de infraestrutura usa o sistema para visualizar, priorizar, direcionar técnicos e acompanhar a resolução de cada chamado em tempo real.

### Funcionalidades

**Listagem com abas Pendentes / Resolvidos**
- Visualização separada com contador em tempo real em cada aba
- Ordenação clicável por prioridade, data, cidade, rede/caixa, status e tempo em aberto
- Busca livre por endereço ou CA (caixa de atendimento)
- Exportação da listagem para CSV

**Filtros avançados**
- Por tipo de ocorrência, status, técnico, cidade, OC aberta e período
- Limpeza de filtros com um clique
- Paginação com até 100 registros por página

**Registro de chamados**
- Formulário completo de criação diretamente na interface
- Campos: data, prioridade, cidade/área, endereço, link de localização, rede/caixa (CA), tipo de ocorrência, descrição do problema, observações, solicitante
- **Detecção automática de duplicidade**: ao criar um chamado, o sistema verifica se já existe uma OS pendente para a mesma CA e cidade — evita duplicações acidentais
- Tecnologia configurável por chamado

**21 tipos de ocorrência catalogados**
CA com Abelhas/Marimbondos, CA com formigas, Extensão de rede necessária, CA com tampa solta, CA danificada, CA dependurada, CA sem plotagem, Sinal fora dos padrões, CA sem sinal, Splitter 1x16 (futuras instalações), Splitter 1x16 (todas portas ocupadas), Splitter 1x16 (cliente aguardando), Faltando acoplador, Retorno fora dos padrões, Sinais invertidos, Drop rompido, Troca de poste, Cabo cortado, Clientes desconectados, Porta do splitter com defeito, Drop baixo.

**Gestão de status**
- Status: Pendente, Técnico Direcionado, Em Andamento, Resolvido (e outros configuráveis)
- Atualização inline direto na linha sem sair da tela
- Registro automático de `resolvedAt` ao marcar como resolvido
- Rastreamento de quem criou o chamado (`createdBy`)

**Direcionamento de técnico**
- Campo de técnico responsável atribuído por chamado
- Lista de técnicos configurável pelo admin no Painel ADM

**Geolocalização**
- Campo de URL de localização por chamado
- Link direto para o ponto no mapa a partir da listagem

**Upload de imagens via Cloudinary**
- Foto do problema e/ou da resolução vinculada ao chamado
- Visualização diretamente na interface
- Armazenamento no Cloudinary com URL persistida no banco

**Compartilhamento via Bitrix24**
- Popover de compartilhamento integrado diretamente na linha do chamado
- Envia dados do chamado para canais do Bitrix24 via webhook
- Permite comunicar ocorrências para o time sem sair do sistema

**Ações rápidas por registro**
Cada linha tem ações acessíveis por ícone: visualizar detalhes, finalizar/resolver, compartilhar no Bitrix24, editar e remover.

**Controle de permissões por nível**
- `user` — pode criar e visualizar
- `editor` — pode criar, editar e compartilhar
- `admin` — acesso total incluindo remoção

**Opções configuráveis pelo admin**
No Painel ADM, o administrador pode configurar sem tocar no código:
- Áreas/Cidades disponíveis
- Tipos de Ocorrência
- Solicitantes
- Técnicos
- Níveis de Prioridade

**Banco de dados dedicado**
O módulo usa o banco secundário no **SquareCloud (PostgreSQL)** com conexão via SSL, isolado do banco principal NeonDB, garantindo performance e segurança para as operações de tempo real.

| Antes | Depois |
|---|---|
| Planilha compartilhada no Excel | Sistema web acessível por qualquer membro do time |
| Sem filtros ou busca rápida | Filtros por ocorrência, técnico, cidade, status e período |
| Sem separação de pendentes/resolvidos | Abas separadas com contador em tempo real |
| Sem detecção de duplicidade | Alerta automático ao tentar criar chamado duplicado para a mesma CA |
| Comunicação manual por WhatsApp | Compartilhamento direto no Bitrix24 pelo sistema |
| Sem evidências fotográficas | Upload de imagens vinculadas ao chamado via Cloudinary |
| Sem histórico de resolução estruturado | Data, notas e técnico de resolução registrados automaticamente |
---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Frontend | React 19, Tailwind CSS, shadcn/ui, Recharts |
| Estado e cache | React Query (TanStack Query) |
| ORM | Drizzle ORM |
| Banco principal | NeonDB (PostgreSQL serverless) |
| Banco secundário | SquareCloud (PostgreSQL + Redis) — Listagem de Serviços |
| Autenticação | Better Auth |
| Deploy | Vercel |
| Imagens | Cloudinary |
| Automações | N8N (self-hosted no SquareCloud) |
| Agente de IA | Dashiel — powered by Gemini 2.5 Flash via N8N, com cache Redis (30s TTL) |
| Integração | Bitrix24 (compartilhamento de chamados de infraestrutura) |

---

## Fluxo de importação

```
Arquivo CSV ou XLSX enviado via upload
        ↓
Detecção do tipo de arquivo e encoding
        ↓
Parse e normalização de headers
        ↓
Detecção automática do perfil de planilha
        ↓
Roteamento para o importador correto
        ↓
Validação, transformação e cálculo de SLA
        ↓
Deduplicação e persistência no banco
        ↓
Dados disponíveis em dashboards, APIs e Dashiel
```

### Tipos de planilha suportados

- `atendimentos` — OS do ERP interno (instalações, reparos, mudanças, etc.)
- `qualidade` — indicadores IQIv, IQRv, ICT, RST
- `suporte` — atendimentos de suporte por telefone (Matrix Go)
- `vendas` — contratações, instalações e cancelamentos de pedidos (Destec)
- `cancelamentos` — cancelamentos de clientes
- `infraestrutura` — registros de infraestrutura de rede

A detecção de tipo é automática por análise de headers. Cada importador tem tratamento específico para variações de encoding, acentuação e formatos de data.

---

## Cálculo de SLA

O sistema calcula dois tipos de SLA para cada OS finalizada:

- **SLA Corrido** — tempo real da abertura ao fechamento, sem desconto de horário comercial. Esta é a métrica principal.
- **SLA Útil** — tempo dentro do expediente (Seg–Sex 08h–18h). Exibido como dado informativo.

A meta padrão é **24 horas corridas** para todos os tipos de atividade.

O cumprimento do SLA é determinado exclusivamente pelo SLA corrido.

---

## API

### API interna

Protegida por sessão autenticada. Alimenta todos os módulos da interface.

Principais endpoints:

| Rota | Descrição |
|---|---|
| `GET /api/dashboard` | KPIs consolidados do período |
| `GET /api/ranking` | Ranking de técnicos com agregações por tipo |
| `GET /api/service-orders` | Listagem paginada de OS com filtros |
| `GET /api/sla-summary` | Resumo de SLA por período e tipo de atividade |
| `GET /api/quality-records` | Registros de qualidade |
| `GET /api/support-records` | Resumo de suporte por telefone |
| `GET /api/sales` | Dados do funil de vendas |
| `GET /api/cancellations` | Indicadores de cancelamentos |
| `GET /api/infrastructure` | Registros do módulo de infraestrutura |
| `GET /api/listagem-servicos` | Chamados de infraestrutura com filtros, paginação e contadores |
| `POST /api/listagem-servicos` | Criação de novo chamado com detecção de duplicidade |
| `PATCH /api/listagem-servicos/[id]` | Atualização de chamado (status, técnico, resolução, etc.) |
| `DELETE /api/listagem-servicos/[id]` | Remoção de chamado (somente admin) |
| `POST /api/importar` | Importação unificada de arquivos |

### API externa

Protegida por token Bearer. Projetada para consumo por N8N, automações e agentes de IA.

```http
Authorization: Bearer SEU_TOKEN
```

Principais endpoints:

| Rota | Descrição |
|---|---|
| `GET /api/external/summary` | Visão consolidada de todos os módulos |
| `GET /api/external/attendances` | Atendimentos com filtros avançados |
| `GET /api/external/ranking` | Ranking de técnicos |
| `GET /api/external/sla` | Indicadores de SLA corrido e útil |
| `GET /api/external/phone-support` | Suporte por telefone por categoria |
| `GET /api/external/installations` | Instalações com filtros |
| `GET /api/external/query` | Endpoint flexível por recurso |

Filtros disponíveis: `startDate`, `endDate`, `period` (`7d`, `30d`, `90d`, `current_month`, `previous_month`), `technicianId`, `city`, `type`, `status`, `groupBy`, `limit`, `page`.

---

## Dashiel

Dashiel é o agente de IA integrado ao sistema. Funciona como uma interface conversacional sobre os dados operacionais reais.

- Powered by **Gemini 2.5 Flash** via N8N
- Consulta a API externa do DashMetric para responder com dados reais
- Cache Redis com TTL de 30 segundos para evitar requisições redundantes
- Acessível diretamente na interface do sistema

---

## Estrutura do projeto

```
src/
├── app/
│   ├── (auth)/                  — tela de login
│   ├── (dashboard)/             — módulos autenticados
│   │   ├── dashboard/
│   │   ├── atendimentos/
│   │   ├── ranking/
│   │   ├── qualidade/
│   │   ├── suporte/
│   │   ├── vendas/
│   │   ├── cancelamentos/
│   │   ├── infraestrutura/
│   │   ├── listagem-servicos/   — módulo principal de infraestrutura
│   │   ├── resumo-sla/
│   │   ├── upload/
│   │   └── admin/
│   └── api/                     — rotas internas e externas
├── components/
│   ├── listagem-servicos/       — tabela, formulários, dialogs, compartilhamento
│   └── ...                      — UI por domínio e componentes base
├── lib/
│   ├── db/                      — schema Drizzle, seed, conexão NeonDB
│   ├── db/infra-schema.ts       — schema da Listagem de Serviços (SquareCloud)
│   ├── listagem-servicos/       — tipos de ocorrência, validações, normalização
│   ├── importacao/              — parsers, importadores, cálculo de SLA
│   ├── services/                — lógica de negócio e analytics
│   └── utils/                   — utilitários gerais
drizzle/
└── migrations/                  — histórico de migrações SQL
```

---

## Scripts disponíveis

```bash
npm run dev             # servidor de desenvolvimento
npm run build           # build de produção
npm run start           # iniciar em produção
npm run test:sla        # testes de cálculo de SLA
npm run test:classify   # testes do classificador de suporte
npm run seed            # popular banco com dados iniciais
npm run fix:technicians # script de correção de vínculos de técnicos
```

---

## Variáveis de ambiente

```env
# Banco principal (NeonDB)
DATABASE_URL=

# Banco secundário (SquareCloud) — Listagem de Serviços
SQUARE_DB_HOST=
SQUARE_DB_PORT=
SQUARE_DB_NAME=
SQUARE_DB_USER=
SQUARE_DB_PASSWORD=
SQUARE_DB_SSL_CA=
SQUARE_DB_SSL_CERT=
SQUARE_DB_SSL_KEY=

# Redis (SquareCloud)
REDIS_URL=

# Autenticação (Better Auth)
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# API externa
EXTERNAL_API_TOKEN=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Bitrix24
BITRIX24_WEBHOOK_URL=
```

---

## Fontes de dados

| Sistema | Dados | Formato |
|---|---|---|
| ERP interno DSTech | Atendimentos (OS) | CSV exportado manualmente |
| Matrix Go | Suporte por telefone (omnichannel) | XLSX por grupo |
| Destec | Vendas e cancelamentos | XLSX com múltiplas abas |
| Entrada manual | Qualidade (IQIv, IQRv, ICT) | Formulário na interface ou XLSX |
| Interface direta | Chamados de infraestrutura | Formulário na Listagem de Serviços |

---

Desenvolvido por Rafael Abade — DSTech NOC, Teixeira de Freitas - BA.
