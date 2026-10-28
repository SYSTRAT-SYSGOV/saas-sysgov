# Proposal

## Why

A home do portal do cliente passou, nos PRs #130, #131 e #132, a mostrar um card de total para cada módulo que o usuário acessa (até 19 cards), agrupados por área em seções recolhíveis, com a escolha de quais ver em "Meu Perfil". A mudança **não foi aprovada** pelo cliente: a tela ficou carregada e o resumo depende de quais módulos cada prefeitura contratou, então duas prefeituras veem homes muito diferentes.

O que o cliente pede em troca:
- uma home enxuta, com **somente 4 cards básicos, padrões do sistema**, iguais para todos os tenants;
- o **logo do tenant** ao abrir a página;
- a lista de **módulos disponíveis escondida**, que só aparece quando o usuário clica em **Personalizar**;
- os **Favoritos** num accordion (o único lugar com recolher/abrir).

## What Changes

- **Remover** da home os cards por módulo e os grupos recolhíveis (Educação, Gestão e documentos, Compras e patrimônio, Fiscalização e território, Outros).
- **Remover** a seção "Cards da página inicial" de Meu Perfil, as rotas `GET/PUT /api/client/dashboard-preferences`, a coluna `users.dashboard_hidden_cards` e a rota `GET /api/client/dashboard-summary` na forma atual: com 4 cards fixos não há o que escolher.
- **Adicionar** 4 cards básicos fixos, que não dependem de módulo contratado (proposta em `design.md`, D1: Unidades, Usuários, Perfis de acesso e Módulos ativos).
- **Adicionar** o logo do tenant (`settings.customLogoUrl`) no topo da home, com a inicial do nome do órgão quando não houver logo.
- **Alterar** a seção "Módulos disponíveis": oculta por padrão e exibida só no modo Personalizar.
- **Alterar** os Favoritos: passam a ficar num accordion.

## Capabilities

### New Capabilities
- `client-home`: a página inicial do portal do cliente (cabeçalho com logo do tenant, 4 cards básicos, favoritos em accordion e personalização de atalhos).

### Modified Capabilities
- Nenhuma. A home ainda não tinha especificação; esta mudança passa a ser a fonte de verdade dela.

## Impact

- **Frontend (`apps/web-client`)**: `DashboardModule` simplificado; removidos `GruposResumo`, `PreferenciasCardsHome`, `tonsCartao` e os testes deles; `ProfilePage` perde uma seção; novo componente do cabeçalho com logo e do accordion de favoritos.
- **Backend (`apps/api`)**: remove `DashboardPreferencesController`, `DashboardSummaryService` (e seu teste) e as rotas acima; novo endpoint enxuto com os 4 totais; migração que remove `users.dashboard_hidden_cards`.
- **Dados em produção**: a coluna removida foi criada em 2026-10-28; antes de remover, conferir se algum usuário já a preencheu (tarefa 2.3).
- **Risco**: baixo; é uma volta para uma home mais simples. Os favoritos e a ordem personalizada já existentes (`localStorage`) são preservados.
