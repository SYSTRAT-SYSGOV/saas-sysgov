## ADDED Requirements

### Requirement: Telas administrativas nunca exibem dados fictícios
<!-- id: AdminUI.noMockData -->
<!-- entities: AuditLog, SaasInvoice -->
<!-- enforced: AdminAuditLogs, AdminFinancialBilling, AdminDashboardOverview -->

As telas do web-admin SHALL exibir apenas dados vindos da API. Resposta vazia SHALL resultar em estado vazio e falha em estado de erro com nova tentativa; nenhuma tela SHALL substituir dados reais ausentes por dados de exemplo.

#### Scenario: auditoria sem registros
- **WHEN** a API de auditoria responde com lista vazia
- **THEN** a tela mostra o estado vazio e nenhum log fictício

#### Scenario: falha ao carregar faturas
- **WHEN** a chamada de faturas falha
- **THEN** a tela mostra a mensagem de erro com a ação de tentar novamente e nenhuma fatura fictícia

### Requirement: Baixa de fatura é confirmada pelo servidor
<!-- id: SaasBillingController.markAsPaid -->
<!-- entities: SaasInvoice, AuditLog -->
<!-- enforced: AdminFinancialBilling.handleMarkAsPaid -->

O web-admin SHALL alterar uma fatura para paga somente depois da resposta de sucesso do servidor; em falha, SHALL exibir o erro e manter o estado anterior.

#### Scenario: baixa com sucesso
- **WHEN** `PATCH /api/admin/saas-billing/invoices/{invoice}/pay` responde HTTP 200
- **THEN** a linha passa para "Pago" com a data de pagamento

#### Scenario: baixa com falha
- **WHEN** a chamada de baixa falha
- **THEN** a fatura permanece com o status anterior e o erro é exibido

### Requirement: Dashboard administrativo usa dados reais agregados
<!-- id: AdminDashboardController.index -->
<!-- entities: Tenant, User, SaasInvoice, AuditLog -->
<!-- enforced: AdminDashboardController.index() -->

`GET /api/admin/dashboard` SHALL retornar indicadores de tenants, usuários e MRR, séries mensais de receita paga e de crescimento e a atividade recente da auditoria. A tela SHALL omitir variações percentuais sem mês anterior de comparação.

#### Scenario: indicadores reais
- **WHEN** existem tenants, usuários e faturas pagas
- **THEN** a resposta traz os totais, o MRR e as séries por mês calculados do banco

#### Scenario: sem histórico
- **WHEN** não há faturas pagas no período
- **THEN** a série de receita vem vazia e a tela mostra o estado vazio explicativo

### Requirement: Saúde da plataforma na tela de integrações
<!-- id: MonitoringController.index -->
<!-- entities: OutboxEvent -->
<!-- enforced: AdminApiIntegrations -->

A tela de integrações SHALL exibir a saúde da plataforma a partir de `GET /api/admin/monitoring` (banco, filas, outbox, jobs com falha e faturas vencidas) e SHALL NOT exibir conectores ou testes de latência simulados.

#### Scenario: exibir saúde
- **WHEN** a API de monitoramento responde com sucesso
- **THEN** a tela mostra os contadores e o horário de geração

### Requirement: Troca de senha e sessões do administrador são reais
<!-- id: AdminProfileController.password -->
<!-- entities: User, AuditLog -->
<!-- enforced: AdminProfileController.updatePassword() -->

`POST /api/admin/me/password` SHALL exigir a senha atual e a política de senha vigente, ser limitado por `throttle:auth-sensivel`, revogar os demais tokens do usuário e auditar `admin.password_changed`. `GET /api/admin/me/sessions` e `DELETE /api/admin/me/sessions/{id}` SHALL operar apenas sobre os tokens do próprio usuário.

#### Scenario: senha atual incorreta
- **WHEN** a senha atual informada não confere
- **THEN** responde HTTP 422 e a senha não é alterada

#### Scenario: troca com sucesso
- **WHEN** a senha atual e a nova senha válida são enviadas
- **THEN** a senha é alterada, os demais tokens são revogados e a ação é auditada

#### Scenario: sessão de outro usuário
- **WHEN** o usuário tenta encerrar o token de outro usuário
- **THEN** responde HTTP 404 e o token permanece válido
