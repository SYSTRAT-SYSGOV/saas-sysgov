# Tasks

## 1. Banco de Dados e Models

- [x] 1.1 Criar migration para as tabelas `cemetery_succession_processes`, `cemetery_succession_heirs` e `cemetery_operators` com isolamento multi-tenant (`tenant_id`, chaves estrangeiras e índices compostos) e executar migration no Docker MySQL
- [x] 1.2 Implementar model `ProcessoSucessao` com trait `TenantAware`, casts e relacionamentos com `Concessao`, `HerdeiroSucessao` e `Concessionario`
- [x] 1.3 Implementar model `HerdeiroSucessao` com trait `TenantAware` e relacionamento com `ProcessoSucessao`
- [x] 1.4 Implementar model `OperadorCemiterio` com trait `TenantAware`, scopes por tipo (`coveiro`/`pedreiro`) e métodos utilitários de conferência de alvará

## 2. Regras de Negócio e Backend APIs

- [x] 2.1 Implementar `SucessaoService` com métodos para abertura de processo, adição de herdeiros e deferimento transacional com emissão de número de termo, alteração do titular da concessão e destravamento preventivo
- [x] 2.2 Criar `ProcessoSucessaoController` com endpoints REST (`index`, `store`, `show`, `adicionarHerdeiro`, `deferir`, `termoPdf`) e auditoria via `AuditLogger`
- [x] 2.3 Criar `OperadorCemiterioController` com endpoints para listagem, cadastro, atualização de alvará e consulta de histórico consolidado de sepultamentos e obras
- [x] 2.4 Registrar rotas dos novos controllers em `Modules/Cemiterios/routes/api.php` protegidas por permissões RBAC

## 3. Frontend (web-client) e Design System

- [x] 3.1 Atualizar cliente de API em `apps/web-client/src/modules/cemiterios/api.ts` com interfaces TypeScript e funções de chamada para Sucessão e Operadores
- [x] 3.2 Implementar componente de tela `SucessaoView.tsx` com listagem de concessões pendentes de inventário/sucessão, filtros por necrópole e modal de abertura/deferimento de processo
- [x] 3.3 Implementar componente de tela `OperadoresView.tsx` com cards/tabela de coveiros e pedreiros, badges de alvará vencido/válido e Drawer lateral com histórico de atividades
- [x] 3.4 Conectar as novas abas contextuais ("Sucessão" e "Operadores") no componente principal de navegação do módulo de cemitérios
- [x] 3.5 Garantir uso exclusivo dos componentes `@sysgov/ui` e exibição de dados técnicos e documentos em `JetBrains Mono` (`font-mono tabular-nums`)

## 4. Testes e Validação Integrada

- [ ] 4.1 Escrever testes unitários e de integração no backend (`SucessaoTest.php` e `OperadoresTest.php`) cobrindo deferimento e isolamento multi-tenant
- [ ] 4.2 Escrever testes no frontend para as novas telas (`SucessaoView.test.tsx` e `OperadoresView.test.tsx`)
- [ ] 4.3 Executar bateria de testes com `npm test` e `php artisan test` garantindo 100% de aprovação
