# Design

## Situação atual
- `DashboardModule` mostra o cabeçalho de boas-vindas, os cards de resumo (um por módulo acessível, agrupados e recolhíveis), os Favoritos, os "Módulos disponíveis" e um cartão de dicas.
- Os cards vêm de `GET /api/client/dashboard-summary` (`DashboardSummaryService`), com a escolha do usuário em `users.dashboard_hidden_cards`, editada em Meu Perfil.
- O logo do tenant já existe em `settings.customLogoUrl` (upload em `TenantSettingsController::uploadLogo`) e é exibido no menu lateral.

## Decisões

### D1. Os 4 cards básicos (a confirmar com o cliente)
O pedido diz "4 cards básicos padrões do sistema" sem nomear quais. A proposta são quatro indicadores que **existem em qualquer tenant, independente dos módulos contratados**:

| Card | O que conta |
| --- | --- |
| Unidades | unidades organizacionais ativas que o usuário enxerga (mesma regra do card atual) |
| Usuários | usuários ativos do tenant |
| Perfis de acesso | perfis (roles) do tenant |
| Módulos ativos | módulos contratados e ligados no tenant (sem os de base) |

*Alternativa*: usar totais de negócio (Pessoas, Atas…). Descartada porque só existem se o tenant contratou o módulo, e o pedido é "padrão do sistema".
**Questão em aberto**: confirmar a lista com o cliente antes de implementar; trocar um card só muda a tabela acima e o serviço.

### D2. Cores
Cada um dos 4 cards mantém uma cor própria (azul, verde, âmbar, violeta), pedido anterior do cliente que continua válido. O `KpiCard` de `@sysgov/ui` já aceita a cor da barra e do valor; o mapa de tons de 18 cores (`tonsCartao`) deixa de ser necessário e é removido, ficando só as 4 classes usadas.

### D3. Sem "dropdown" nos cards e sem preferência por usuário
O recolher/abrir passa a existir **somente nos Favoritos**. Como os cards são fixos, não há o que o usuário escolher: remover a seção de Meu Perfil, as rotas de preferência e a coluna `dashboard_hidden_cards` (migração que a elimina). *Alternativa*: manter a coluna "para o futuro" — descartada, é dado morto.

### D4. Logo do tenant
O cabeçalho da home mostra `settings.customLogoUrl` (já entregue pelo contexto do tenant) à esquerda do "Olá, Nome". Sem logo, mostra a inicial do nome do órgão num quadrado, como o avatar atual. Imagem quebrada (erro de carregamento) cai no mesmo fallback.

### D5. Módulos disponíveis só em "Personalizar"
A seção "Módulos disponíveis" (e o botão de favoritar de cada módulo) só é renderizada com o modo Personalizar ligado; fora dele a home não lista módulos, e o acesso a eles continua pelo menu lateral. O botão "Personalizar"/"Concluir edição" já existe e é mantido.

### D6. Favoritos em accordion
Os Favoritos ficam num accordion acessível (botão com `aria-expanded`/`aria-controls`), **aberto por padrão**; o estado recolhido fica salvo no navegador. Sem favoritos e fora do modo Personalizar, o accordion não aparece; no modo Personalizar aparece com a dica "Marque módulos como favoritos". Favoritos e ordem continuam em `localStorage` (`sysgov:welcome:favorites` e `sysgov:welcome:custom_order`), sem migração.

### D7. Endpoint dos 4 totais
Um único `GET /api/client/dashboard-summary` devolve os 4 totais, sem Gate de módulo (são indicadores de base do tenant), isolado por tenant. O serviço atual, com 18 definições e Gate por módulo, é removido.

## Riscos
- Remover a coluna é irreversível sem backup: gerar o backup da tabela `users` antes da migração em produção.
- Os PRs #130–#132 já estão em produção; a volta deve sair num único PR para não deixar a home em estado intermediário.
