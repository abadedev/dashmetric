# Naming Conventions

## Goal

Conter o debito de naming sem rename destrutivo em massa.

Este documento define o padrao oficial para:

- codigo novo
- refatoracoes incrementais
- camadas de adaptacao sobre contratos legados

## Regra principal

Use ingles como padrao para nomes tecnicos novos.

Exemplos:

- arquivos: `workspace-authorization.ts`
- funcoes: `buildAuthorizationContext`
- services: `permission-service.ts`
- tipos: `AuthorizationContext`
- constantes: `MODULE_FILTER_RESOURCE_MAP`

## Quando portugues pode aparecer

Termos operacionais ja consolidados podem permanecer quando forem contrato legado ou dominio ja em producao, por exemplo:

- slugs de modulo como `atendimentos` e `qualidade`
- tabelas legadas como `atendimentos`
- colunas importadas diretamente de fontes operacionais

Nesses casos:

1. nao use o naming legado como referencia para novos componentes tecnicos
2. prefira adaptadores ou aliases em ingles na borda do sistema
3. documente no codigo que se trata de contrato legado

## Padrao oficial por categoria

### Files

- use `kebab-case`
- prefira ingles para arquivos novos
- evite misturar ingles e portugues no mesmo nivel

Exemplos:

- `authorization.ts`
- `permission-service.ts`
- `module-filter-aliases.ts`

### Functions and variables

- use `camelCase`
- prefira nomes tecnicos em ingles
- nomes devem refletir intencao, nao historico

Exemplos:

- `requireWorkspacePermission`
- `getEffectivePermissions`
- `workspaceRole`

### Types, interfaces and React components

- use `PascalCase`
- prefira ingles para estruturas tecnicas

Exemplos:

- `AuthorizationContext`
- `ModuleFilterContract`
- `UsersManager`

### Database

- novos nomes de tabela e coluna devem usar ingles consistente
- manter `snake_case`
- evitar criar novas tabelas em portugues

Exemplos novos:

- `workspace_members`
- `access_groups`
- `user_permissions`

## Legado

Estruturas legadas com naming inconsistente devem receber marcacao explicita no codigo:

- `LEGACY`
- `@deprecated`
- comentario curto dizendo para nao usar como referencia

Isso serve para:

- rotas antigas
- tabelas antigas
- aliases de compatibilidade
- nomes operacionais herdados

## Adaptation over rename

Quando um contrato legado precisa continuar existindo, prefira:

- aliases
- maps de traducao
- wrappers
- contratos internos normalizados

Exemplo:

- recurso externo `attendances`
- slug interno legado `atendimentos`
- map centralizado entre os dois nomes

## Proibicoes para codigo novo

- nao criar nomes tecnicos novos em portugues se o contexto tecnico equivalente estiver em ingles
- nao misturar ingles e portugues aleatoriamente no mesmo modulo
- nao usar estruturas legadas como modelo para novos nomes
- nao renomear tabelas de producao sem necessidade critica

## Practical rule for this repository

Se houver duvida:

1. mantenha o contrato legado funcionando
2. crie uma camada de adaptacao
3. padronize o nome novo em ingles
4. marque o legado como legado
