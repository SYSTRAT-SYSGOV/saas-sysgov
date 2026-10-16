# Proposal

## Why

O levantamento do web-admin (`apps/web`) mostrou que várias telas do menu exibem **dados fictícios** como se fossem reais, e que algumas ações **fingem que funcionaram**. Isso induz o operador ao erro e, em duas telas, tem impacto de segurança e de auditoria:

- **Visão Geral & KPIs**, **Desempenho & Métricas**, **Registros & Tabelas**, **APIs & Integrações**, **Meu Perfil & Segurança** e as abas de segurança/notificações de **Configurações** usam dados do arquivo `services/adminMockData.ts` ou arrays fixos no componente (ex.: "MRR R$ 148.950", "3.420 usuários", sessões "Windows 11 / iPhone", latência gerada por `Math.random()`).
- **Logs & Auditoria** e **Faturamento & Invoices** chamam a API, mas **caem em dados fictícios** quando a resposta vem vazia ou falha. Em auditoria, o operador pode estar lendo logs que nunca existiram.
- **Meu Perfil**: "Trocar senha" exibe "Senha alterada" sem chamar API alguma; "Salvar perfil" idem; "Encerrar sessão" só remove um item da lista local.
- **Faturamento**: "marcar como pago" altera a tela mesmo quando a API falha ("fallback otimista"); "Baixar PDF" só mostra um aviso.
- Há código morto relevante (`DashboardPage`, `SaaSAdminPanel` com 3.280 linhas, `AdminUserManagement`, `MenuUsersAdminPage`) e resíduos de modo demonstração (`universal-admin-session-token`).

## What Changes

- Remover **todo fallback para dado fictício** em Auditoria e Faturamento: lista vazia mostra estado vazio; falha mostra erro com "Tentar novamente". "Marcar como pago" só altera a tela após confirmação do servidor.
- **Visão Geral**: passa a usar dados reais por meio de um novo `GET /api/admin/dashboard` (KPIs de tenants/usuários/MRR, séries mensais de receita paga e de crescimento, atividade recente a partir da auditoria). O selo "Ao Vivo" só permanece se os dados forem de fato consultados na hora.
- **Desempenho & Métricas**: gráficos de contratos novos/encerrados e retenção calculados dos contratos SaaS reais; o gráfico de "distribuição de tráfego" (sem fonte de dados) é removido.
- **APIs & Integrações** → painel de **saúde da plataforma** com `GET /api/admin/monitoring` (banco, filas, outbox, jobs com falha, faturas vencidas). A lista de conectores e o "ping" simulado são removidos.
- **Meu Perfil & Segurança**: endpoints reais para atualizar o nome, **trocar a senha** (exige a senha atual, revoga as demais sessões) e **listar/encerrar sessões** (tokens Sanctum). Campo "departamento" (sem coluna) é removido.
- **Configurações**: mantém a identidade visual (hoje só no `localStorage`) com aviso claro de que vale apenas para este navegador; as abas de **segurança** e **notificações**, sem efeito, são removidas.
- **Registros & Tabelas**: tela sem equivalente no sistema; **removida do menu** (decisão em aberto no design).
- **Faturamento**: remove o botão "Baixar PDF" enquanto não houver geração real; remove plano e ticket médio fixos.
- **Limpeza**: apagar `adminMockData.ts`, o código morto e o token de demonstração; mapear e remover componentes órfãos.

## Capabilities

### New Capabilities
- (Nenhuma)

### Modified Capabilities
- `admin`: novos requisitos — telas administrativas nunca exibem dados fictícios; dashboard administrativo com dados reais; saúde da plataforma; perfil, senha e sessões do administrador; baixa de fatura confirmada pelo servidor.

## Impact

- Backend (`apps/api`): `Modules/Admin` — novo `AdminDashboardController` (`GET /api/admin/dashboard`), novo `AdminProfileController` (`PUT /api/admin/me/profile`, `POST /api/admin/me/password`, `GET /api/admin/me/sessions`, `DELETE /api/admin/me/sessions/{id}`), filtros/ordenação em `GET /api/admin/audit-logs`; testes de feature.
- Frontend (`apps/web`): `AdminDashboardOverview`, `AdminAnalyticsView`, `AdminApiIntegrations`, `AdminUserProfile`, `AdminSettings`, `AdminAuditLogs`, `AdminFinancialBilling`, `adminModuleRegistry.ts` (remover Registros), `modules/admin/api.ts`, `contexts/AuthContext.tsx`; exclusão de arquivos mortos.
- Banco de dados: nenhuma migration obrigatória (usa `saas_invoices`, `saas_contracts`, `tenants`, `users`, `audit_logs`, `personal_access_tokens`).
- Segurança: troca de senha passa a ser real (exige senha atual, `throttle:auth-sensivel`, auditoria `admin.password_changed`); logs de auditoria deixam de ser contaminados por dados fictícios.
- Documentação: `docs/` do admin, se existir; atualizar o spec `admin`.
