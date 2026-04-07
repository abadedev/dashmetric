# Dashmetric

**Dashmetric** é uma plataforma de inteligência operacional construída para centralizar dados, automatizar fluxos, padronizar importações e transformar informações dispersas em uma base estruturada, consultável e pronta para consumo por dashboards, APIs, automações e agentes de IA.

Mais do que um painel visual, o Dashmetric funciona como uma **camada operacional inteligente**, conectando entrada de dados, processamento, regras de negócio, visualização analítica e integração com sistemas externos.

---

## Visão Geral

Em muitas operações, os dados existem, mas estão espalhados em planilhas, exports manuais, sistemas desconectados e processos que não escalam.

Isso gera problemas como:

- retrabalho operacional
- baixa confiabilidade na leitura dos dados
- dependência de consolidação manual
- dificuldade de rastrear indicadores
- ausência de padronização entre times e processos
- pouca capacidade de integração com automações e IA

O Dashmetric foi desenvolvido para resolver esse cenário.

A plataforma recebe arquivos operacionais, identifica o tipo de importação, processa regras específicas de cada domínio, persiste tudo de forma estruturada por workspace e disponibiliza esses dados para leitura via interface, módulos internos, APIs e fluxos automatizados.

---

## O que o sistema entrega

O Dashmetric foi projetado para ser uma **plataforma operacional modular**, com foco em:

- consolidação de dados
- inteligência operacional
- padronização de importação
- leitura executiva e tática
- integração com automações
- consumo por agentes de IA
- escalabilidade por workspace

---

## Principais capacidades da plataforma

### 1. Dashboard operacional
Painéis com visão consolidada dos indicadores principais da operação, permitindo leitura rápida e tomada de decisão com base em dados estruturados.

Exemplos de leitura:
- volume operacional
- rankings
- performance por técnico ou atendente
- métricas de SLA
- distribuição por categoria
- comparativos por período
- indicadores de suporte, qualidade, vendas e cancelamentos

---

### 2. Módulo de importação inteligente
O sistema possui um fluxo de importação para arquivos `CSV` e `XLSX`, com suporte a perfis específicos de planilha.

A importação foi desenhada para:

- receber o arquivo
- identificar o perfil do layout
- aplicar parsing e transformação
- normalizar os campos
- classificar o tipo de dado
- persistir os registros no domínio correto
- disponibilizar os dados para dashboard, API e consumo interno

Isso reduz fortemente a dependência de tratamento manual e cria uma base consistente para análise.

---

### 3. Arquitetura modular
O projeto foi estruturado de forma modular, permitindo que cada workspace habilite apenas os módulos que fazem sentido para sua operação.

Exemplos de módulos suportados:
- dashboard
- importação de dados
- atendimentos
- instalações
- SLA
- suporte por telefone
- qualidade
- vendas
- cancelamentos
- ranking operacional
- módulos administrativos
- integrações externas

Essa arquitetura facilita manutenção, expansão do produto e controle de acesso por contexto.

---

### 4. Multi-workspace
A plataforma trabalha com isolamento lógico por workspace, permitindo separar:

- dados
- módulos
- permissões
- configurações
- contexto operacional

Isso torna o sistema apto para operar múltiplos ambientes sem misturar informações e sem depender de estruturas frágeis no runtime.

---

### 5. API interna e API externa
O Dashmetric foi construído não apenas como interface, mas também como **plataforma de dados e serviços**.

#### API interna
Responsável por abastecer a própria aplicação com rotas padronizadas para:
- dashboards
- resumos executivos
- rankings
- consultas operacionais
- leitura detalhada de módulos
- regras administrativas

#### API externa
A plataforma também expõe endpoints protegidos por token para integração com:
- N8N
- agentes de IA
- workflows automatizados
- aplicações terceiras
- consultas externas seguras

Esse modelo transforma o Dashmetric em uma **fonte operacional confiável para consumo programático**.

---

### 6. Integração com IA
Um dos diferenciais do projeto é a preparação da base para uso por agentes inteligentes.

A plataforma pode servir como backend operacional para agentes que respondem perguntas como:
- resumo da operação
- ranking do período
- volume de atendimentos
- indicadores de SLA
- métricas de suporte por telefone
- vendas, cancelamentos e qualidade

Ao invés de a IA responder com dados inventados, ela consulta a API do Dashmetric e trabalha sobre dados reais e estruturados.

Isso permite:
- respostas mais confiáveis
- automação de consultas
- experiência conversacional sobre dados reais
- uso com modelos externos via N8N/OpenRouter/etc.

---

### 7. Integração com N8N e automações
O sistema também foi pensado para operar junto com fluxos automatizados.

Com a API externa, é possível usar o Dashmetric em cenários como:
- agentes conversacionais
- automação de consultas
- alertas operacionais
- sumarização periódica
- fluxos de análise
- integrações entre dados operacionais e ferramentas externas

Na prática, o Dashmetric deixa de ser apenas uma interface web e passa a ser parte de um ecossistema de automação.

---

## Stack principal

O projeto foi desenvolvido com tecnologias modernas e orientadas a escalabilidade:

- **Next.js**
- **React**
- **TypeScript**
- **Drizzle ORM**
- **PostgreSQL**
- **N8N** para automações e orquestração
- **Integração com IA** via API e fluxos externos

---

## Arquitetura conceitual

A lógica da plataforma segue, em alto nível, este fluxo:

```text
Entrada de arquivo / dado
        ↓
Identificação do perfil de importação
        ↓
Parsing e normalização
        ↓
Aplicação das regras de negócio
        ↓
Persistência estruturada por workspace
        ↓
Consumo por dashboard, módulos, API e IA
