# Tasks

## 1. Decisões em aberto

- [x] 1.1 Decisões do negócio: Registros & Tabelas, configurações de segurança/notificações e PDF de fatura foram todos REMOVIDOS (confirmado pelo usuário)
- [x] 1.2 Colunas de `saas_contracts` validadas: `starts_at`, `ends_at` (obrigatórias) e `status`; não há data de cancelamento, então o mês de encerramento é aproximado por `ends_at` dos contratos não ativos

## 2. Backend - Dashboard e saúde

- [x] 2.1 Criar `AdminDashboardController` com `GET /api/admin/dashboard` (KPIs, `series.revenue`, `series.growth`, `recent_activity`)
- [x] 2.2 Reutilizar a regra de MRR de `Tenant::monthlyMrrCents` (sem duplicar a fórmula) e as séries por mês via consulta agregada
- [x] 2.3 Série de contratos novos/encerrados e retenção para a tela de Desempenho (endpoint próprio ou parte do dashboard)
- [x] 2.4 Policy/permissão `admin.dashboard.view` aplicada ao endpoint
- [x] 2.5 Testes: KPIs corretos, séries por mês, estado sem dados, permissão negada

## 3. Backend - Perfil, senha e sessões

- [x] 3.1 Criar `AdminProfileController`: `PUT /api/admin/me/profile`, `POST /api/admin/me/password`, `GET /api/admin/me/sessions`, `DELETE /api/admin/me/sessions/{id}`
- [x] 3.2 Troca de senha: exige `current_password`, política de senha vigente, `throttle:auth-sensivel`, revoga os demais tokens e audita `admin.password_changed`
- [x] 3.3 Sessões: apenas tokens do próprio usuário; `is_current`; 404 para token de outro usuário; não encerra a sessão atual
- [x] 3.4 Auditar `admin.profile_updated` e `admin.session_revoked`
- [x] 3.5 Testes: senha atual errada (422), senha fraca (422), sucesso revoga outros tokens, não revoga token alheio, atualizar nome

## 4. Backend - Auditoria

- [x] 4.1 `GET /api/admin/audit-logs` com filtros opcionais (`module`, `action`, `user_id`, `from`, `to`) e `per_page` (padrão 50, máximo 100)
- [x] 4.2 Testes de filtro e paginação

## 5. Frontend - Remover dados fictícios

- [x] 5.1 `AdminAuditLogs`: remover fallback para mock; estados vazio/erro/pronto; paginação do servidor e filtros
- [x] 5.2 `AdminFinancialBilling`: remover fallback para mock, baixa otimista, botão "Baixar PDF", plano e ticket médio fixos
- [x] 5.3 `AdminDashboardOverview`: consumir `GET /api/admin/dashboard`; refresh refaz a consulta; selo "Ao Vivo" somente com dados reais; variação percentual só quando houver mês anterior
- [x] 5.4 `AdminAnalyticsView`: série de contratos real; remover o gráfico de distribuição de tráfego
- [x] 5.5 `AdminApiIntegrations` → "Saúde & Integrações" com `GET /api/admin/monitoring`; remover conectores e ping simulado
- [x] 5.6 `AdminUserProfile`: ligar perfil, troca de senha e sessões aos novos endpoints; remover "departamento" e os valores fixos
- [x] 5.7 `AdminSettings`: remover abas de segurança e notificações; aviso de que a identidade visual vale só para este navegador
- [x] 5.8 `adminModuleRegistry.ts`: remover "Registros & Tabelas" (D9) e renomear o item de integrações; redirecionar a rota antiga
- [x] 5.9 Seguir o DESIGN_SYSTEM.md (componentes `@sysgov/ui`, tokens, responsividade, estados de tela)

## 6. Limpeza

- [x] 6.1 Mapear importações (ex.: análise de grafo) e confirmar o código órfão antes de apagar
- [x] 6.2 Apagados 58 arquivos órfãos (grafo de importação a partir do main.tsx; ~37 mil linhas), incluindo `adminMockData.ts`, `DashboardPage`, `SaaSAdminPanel`, `AdminUserManagement`, `MenuUsersAdminPage`, `AdminGenericDataTable` e os componentes fiscais exclusivos do DashboardPage
- [x] 6.3 Remover `universal-admin-session-token` de `modules/admin/api.ts` e `contexts/AuthContext.tsx`
- [x] 6.4 Teste/regra que impeça reintroduzir `adminMockData` em componentes de produção

## 7. Testes e validação

- [x] 7.1 Testes Vitest por tela: vazio, erro com "Tentar novamente", pronto; baixa de fatura só após 2xx; troca de senha chama a API
- [x] 7.2 Rodar `tsc --noEmit` e a suíte do painel; PHPUnit do módulo Admin e PHPStan
- [x] 7.3 Executar `openspec validate substituir-mockups-do-admin-por-dados-reais --strict`
- [ ] 7.4 Validar no ambiente: cada tela do menu com dados reais, troca de senha real (login com a nova senha), sessões encerradas
