# Tasks

## 1. Confirmação com o cliente
- [ ] 1.1 Confirmar a lista dos 4 cards básicos (`design.md`, D1) e se a coluna `dashboard_hidden_cards` pode ser removida. *Implementado com a proposta atual (Unidades, Usuários, Perfis de acesso, Módulos ativos); falta a confirmação do cliente.*

## 2. Backend (`apps/api`)
- [x] 2.1 Criar o serviço dos 4 totais (Unidades, Usuários, Perfis de acesso, Módulos ativos), isolado por tenant, e apontar `GET /api/client/dashboard-summary` para ele.
- [x] 2.2 Remover `DashboardPreferencesController`, as rotas `dashboard-preferences`, o `DashboardSummaryService` antigo e `DashboardCardsPreferenciasTest`.
- [x] 2.3 Backup da tabela `users` e conferência de linhas com `dashboard_hidden_cards` preenchido (feito no deploy: backup `pre-deploy-home-enxuta-20261028-134252.sql.gz`; 1 de 7 linhas tinha a coluna preenchida (preferência de teste)). Migração `2026_10_29_100000_drop_dashboard_hidden_cards_from_users_table` (com `down` que recria a coluna) e remoção do cast em `User`: feitas.
- [x] 2.4 Testes: totais por tenant, isolamento entre tenants e que a rota não exige módulo contratado.

## 3. Frontend (`apps/web-client`)
- [x] 3.1 Cabeçalho da home com o logo do tenant e fallback para a inicial (também quando a imagem falha).
- [x] 3.2 Exibir os 4 cards básicos, cada um com cor própria; remover `GruposResumo`, `PreferenciasCardsHome`, `tonsCartao` e os testes deles.
- [x] 3.3 Remover de `ProfilePage` a seção "Cards da página inicial".
- [x] 3.4 Ocultar "Módulos disponíveis" fora do modo Personalizar.
- [x] 3.5 Favoritos em accordion acessível, aberto por padrão, com o estado recolhido salvo no navegador; regras de exibição sem favoritos.
- [x] 3.6 Testes: logo e fallback, 4 cards, módulos só em Personalizar, accordion (abrir/recolher/persistir/ausente).

## 4. Entrega
- [x] 4.1 Um único PR (#134), CI verde, mesclado com autorização.
- [x] 4.2 Deploy de `api` e `web` feito e migração verificada. *A conferência visual no navegador não foi feita.*
- [x] 4.3 Arquivar a mudança (`openspec archive`).
