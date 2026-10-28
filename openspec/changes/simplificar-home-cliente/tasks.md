# Tasks

## 1. Confirmação com o cliente
- [ ] 1.1 Confirmar a lista dos 4 cards básicos (`design.md`, D1) e se a coluna `dashboard_hidden_cards` pode ser removida.

## 2. Backend (`apps/api`)
- [ ] 2.1 Criar o serviço dos 4 totais (Unidades, Usuários, Perfis de acesso, Módulos ativos), isolado por tenant, e apontar `GET /api/client/dashboard-summary` para ele.
- [ ] 2.2 Remover `DashboardPreferencesController`, as rotas `dashboard-preferences`, o `DashboardSummaryService` antigo e `DashboardCardsPreferenciasTest`.
- [ ] 2.3 Backup da tabela `users` e conferência de linhas com `dashboard_hidden_cards` preenchido; criar a migração que remove a coluna (com `down` que a recria) e o cast em `User`.
- [ ] 2.4 Testes: totais por tenant, isolamento entre tenants e que a rota não exige módulo contratado.

## 3. Frontend (`apps/web-client`)
- [ ] 3.1 Cabeçalho da home com o logo do tenant e fallback para a inicial (também quando a imagem falha).
- [ ] 3.2 Exibir os 4 cards básicos, cada um com cor própria; remover `GruposResumo`, `PreferenciasCardsHome`, `tonsCartao` e os testes deles.
- [ ] 3.3 Remover de `ProfilePage` a seção "Cards da página inicial".
- [ ] 3.4 Ocultar "Módulos disponíveis" fora do modo Personalizar.
- [ ] 3.5 Favoritos em accordion acessível, aberto por padrão, com o estado recolhido salvo no navegador; regras de exibição sem favoritos.
- [ ] 3.6 Testes: logo e fallback, 4 cards, módulos só em Personalizar, accordion (abrir/recolher/persistir/ausente).

## 4. Entrega
- [ ] 4.1 Um único PR (volta dos PRs #130–#132), CI verde, mesclar com autorização.
- [ ] 4.2 Deploy de `api` e `web` e verificação no navegador (logo, 4 cards, Personalizar, Favoritos).
- [ ] 4.3 Arquivar a mudança (`openspec archive`).
