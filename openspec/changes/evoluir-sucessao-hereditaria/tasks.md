# Tasks

## 1. Backend — Módulo Cemiterio (Migrations e Models)

- [x] 1.1 Criar migration `create_sucessoes_table` com campos: `tenant_id`, `concession_id`, `park_id`, `plot_id`, `via` (enum), `estado` (enum), `requerente_id`, `titular_falecido_id`, `data_falecimento`, `processo_referencia`, `parecer`, `lock_version`, timestamps, SoftDeletes
- [x] 1.2 Criar migration `create_sucessao_herdeiros_table` com campos: `tenant_id`, `sucessao_id`, `nome`, `parentesco` (enum), `documento`, `ordem`, `direito_representacao` (bool), `titular_indicado` (bool), `herdeiro_representado_id` (FK nullable), timestamps
- [x] 1.3 Criar migration `create_sucessao_documentos_table` com campos: `tenant_id`, `sucessao_id`, `tipo` (enum), `arquivo` (path), `hash` (SHA-256), timestamps
- [x] 1.4 Criar migration `create_sucessao_historico_table` (append-only) com campos: `tenant_id`, `sucessao_id`, `de_estado`, `para_estado`, `motivo` (JSON), `usuario_id`, timestamps
- [x] 1.5 Alterar tabela `sucessoes` existente para adicionar colunas novas (via, estado, lock_version) e FK para `concession_id`, `park_id`, `plot_id`
- [x] 1.6 Criar enums PHP: `ViaSucessao`, `EstadoSucessao`, `TipoDocumentoSucessao`, `Parentesco` com backing enums
- [x] 1.7 Criar Models `Sucessao`, `SucessaoHerdeiro`, `SucessaoDocumento`, `SucessaoHistorico` com trait `TenantAware`, `SoftDeletes`, relacionamentos (`belongsToConcession`, `belongsToPark`, `belongsToPlot`, `hasManyHerdeiros`, etc.)
- [x] 1.8 Executar `php artisan migrate` e verificar migrations verdes com `php artisan test --filter=Cemiterio`

## 2. Backend — Serviços e Regras de Negócio

- [x] 2.1 Criar `SucessaoStateMachine` service com mapa de transições válidas e método `canTransition(from, to)` e `transition(sucessao, para, motivo, lock_version)` com validação de concorrência
- [x] 2.2 Criar `CadeiaSucessoriaService` com método `validarOrdemPrioridade(herdeiros, configTenant)` e `calcularOrdem(herdeiros, ordemPrioridade)`
- [x] 2.3 Criar `SucessaoService` com métodos `abrirProcesso(data)`, `atualizarDados(data)`, `concluir(sucessao)` (vínculo com concessão), `indeferir(motivo)`, `arquivar()` e transição interna de estados
- [x] 2.4 Criar `DocumentoSucessaoService` com upload (`upload()` calculando hash SHA-256), download (signed URL com expiração), verificação de integridade (`verificarHash()`) e purge LGPD
- [x] 2.5 Criar `SucessaoConfigService` carregando config tenant com defaults: `ordem_prioridade`, `prazo_regularizacao_dias`, `documentos_por_via`, `direito_representacao_habilitado`, `base_legal`, `retencao_dias`
- [x] 2.6 Criar `SucessaoPolicy` com métodos `view`, `manage`, `transition`, `delete`, `viewDocument`, `downloadDocument` (verificando tenant_id e permissões)
- [x] 2.7 Criar Form Requests: `AbrirSucessaoRequest`, `AtualizarSucessaoRequest`, `TransicaoSucessaoRequest`, `HerdeirosSucessaoRequest`, `DocumentoSucessaoRequest` com validações específicas por via

## 3. Backend — Controllers, Events e Jobs

- [x] 3.1 Criar `SucessaoController` com ações: `index()` (listagem paginada com filtros), `show()` (detalhe completo), `store()` (abrir processo), `update()` (dados cadastrais)
- [x] 3.2 Criar `SucessaoTransicaoController` com ação `store(TransicaoRequest)` validando transição via `SucessaoStateMachine`
- [x] 3.3 Criar `SucessaoHerdeiroController` com ações `store()` (upsert herdeiros) e `destroy()` (soft delete)
- [x] 3.4 Criar `SucessaoDocumentoController` com ações `store()` (upload multipart) e `download()` (signed URL)
- [x] 3.5 Criar `SucessaoHistoricoController` com ação `index()` (histórico append-only)
- [x] 3.6 Criar `SucessaoDashboardController` com ações `pendentes()` e `regularizacao()`
- [x] 3.7 Registrar routes em `Modules/Cemiterio/Http/routes/api.php` com middleware `auth:sanctum`, `tenant.resolve`, `can:cemiterios.sucessao.*`
- [x] 3.8 Criar Events: `SucessaoTransicionada`, `SucessaoConcluida`, `PrazoRegularizacaoProximo`, `PrazoRegularizacaoVencido` com publicação via `OutboxPublisher`
- [x] 3.9 Criar Jobs: `NotificarPrazoRegularizacaoJob`, `ProcessarSucessaoConcluidaJob`, `VerificarIntegridadeDocumentosJob` na fila `sucessao`
- [x] 3.10 Registrar Scheduler: `Schedule::command('sucessao:verificar-prazos')->dailyAt('08:00')`

## 4. Backend — Configuração Tenant e Seed

- [x] 4.1 Adicionar config padrão `sucessao` em `Modules/Cemiterio/Config/sucessao.php` com `ordem_prioridade`, `prazo_regularizacao_dias`, `documentos_por_via`, `direito_representacao_habilitado`, `base_legal`, `retencao_dias`, `notificacao_antecedencia_dias`
- [x] 4.2 Criar seeder `SucessaoConfigSeeder` para popular `sucessao_config` default nos tenants existentes
- [x] 4.3 Criar seeder de testes: 3 sucessões por via, herdeiros com diferentes parentescos, documentos, histórico de transições
- [x] 4.4 Criar command `php artisan cemiterio:migrate-sucessao-legacy` para migração de dados legados (idempotente) com `down()`

## 5. Frontend — SDK TypeScript

- [ ] 5.1 Adicionar tipos em `packages/sdk/src/cemiterios/sucessao.ts`: enums (`ViaSucessao`, `EstadoSucessao`, `TipoDocumentoSucessao`, `Parentesco`), interfaces (`Sucessao`, `SucessaoHerdeiro`, `SucessaoDocumento`, `SucessaoHistorico`, `TransicaoRequest`, `HerdeirosRequest`, `SucessaoDTO`)
- [ ] 5.2 Adicionar SDK client methods: `sucessaoAPI.list()`, `sucessaoAPI.show()`, `sucessaoAPI.create()`, `sucessaoAPI.update()`, `sucessaoAPI.transition()`, `sucessaoAPI.addHerdeiros()`, `sucessaoAPI.uploadDocument()`, `sucessaoAPI.getHistorico()`, `sucessaoAPI.pendentes()`, `sucessaoAPI.regularizacao()`
- [ ] 5.3 Rodar `npm run build` em `packages/sdk` e `tsc --noEmit` limpo

## 6. Frontend — SucessaoView.tsx e Componentes

- [x] 6.1 Atualizar `SucessaoView.tsx`: header com KPI cards (`KpiCard` @sysgov/ui), tabs/stepper por fase do processo, lazy loading já existente
- [x] 6.2 Criar componente `SucessaoWizard.tsx` (wizard por via com `Stepper` @sysgov/ui): step 1 seleção via, step 2 dados requerente/concessão/titular falecido, step 3 confirmação
- [x] 6.3 Criar componente `SucessaoList.tsx` (`DataTable` @sysgov/ui) com filtros (estado, via, parque, concessionária, data falecimento), ações por linha (ver, transicionar, herdeiros, documentos)
- [x] 6.4 Criar componente `SucessaoDetail.tsx` (modal `size="2xl"` @sysgov/ui `Modal`) com sub-abas: Dados, Herdeiros, Documentos, Histórico, Ações
- [x] 6.5 Criar componente `HerdeirosTable.tsx` (`DataTable` inline + modal adição) com validação de ordem/prioridade (via `CadeiaSucessoriaService` logic no frontend), indicador `titular_indicado` único, direito de representação
- [x] 6.6 Criar componente `DocumentosList.tsx` com ícones por tipo, botão upload (`FileUpload` @sysgov/ui), preview PDF, download (signed URL), exibição de hash
- [x] 6.7 Criar componente `HistoricoTimeline.tsx` (`Timeline` @sysgov/ui) com transições cronológicas, pareceres, uploads
- [x] 6.8 Criar componente `SucessaoActions.tsx` com botões de transição habilitados/desabilitados por estado atual + RBAC
- [x] 6.9 Criar componentes `DashboardPendentes.tsx` e `DashboardRegularizacao.tsx` com contagens por estado e lista de processos
- [x] 6.10 Criar hooks `useSucessao`, `useSucessaoTransicoes`, `useSucessaoHerdeiros`, `useSucessaoDocumentos` e atualizar `CemiteriosContext` com `sucessaoState`

## 7. Frontend — RBAC e Rotas

- [x] 7.1 Atualizar `moduleRegistry.ts` em `apps/web-client/src/config/` adicionando permissões: `cemiterios.sucessao.view`, `cemiterios.sucessao.manage`, `cemiterios.sucessao.transition`
- [x] 7.2 Registrar rotas lazy-loaded para `SucessaoView` em `apps/web-client/src/modules/cemiterios/routes.ts` com `ModuleRouteGuard`
- [x] 7.3 Proteger ações de transição com `ModuleRouteGuard` + `can('cemiterios.sucessao.transition')`
- [x] 7.4 Criar badges de estado (`Badge` @sysgov/ui) para cada `EstadoSucessao`: cores semânticas (Solicitada=amber, Em_analise=blue, Aguardando_documentos=yellow, Validada=green, Sucedida=emerald, Indeferida=red, Arquivada=gray)

## 8. Testes — Backend

- [x] 8.1 Criar `SucessaoStateMachineTest` (Pest) com todos os cenários de transição válidos/inválidos, concorrência (`lock_version`)
- [x] 8.2 Criar `CadeiaSucessoriaServiceTest` com validação de ordem prioridade padrão vs config tenant, titular único, direito de representação
- [x] 8.3 Criar `SucessaoServiceTest` com abertura por via, conclusão (vínculo concessão), indeferimento, arquivamento
- [x] 8.4 Criar `DocumentoSucessaoServiceTest` com upload (hash), download (integridade), purge LGPD
- [x] 8.5 Criar `SucessaoPolicyTest` com cada método de permissão por role/tenant
- [x] 8.6 Criar `SucessaoControllerTest` com todos os endpoints (auth, validação, paginação, filtros)
- [x] 8.7 Criar `TenantIsolationTest` (gerado por `make:module`) para sucessões entre tenants
- [x] 8.8 Rodar `php artisan test --filter=Sucessao` e garantir 100% verde, PHPStan nível 6 sem erros

## 9. Testes — Frontend

- [x] 9.1 Criar `SucessaoView.test.tsx` (Vitest + React Testing Library): renderização, navegação tabs, estado inicial
- [x] 9.2 Criar `SucessaoWizard.test.tsx`: seleção de via, preenchimento, submissão, validação por via
- [x] 9.3 Criar `HerdeirosTable.test.tsx`: adição, validação ordem/prioridade, titular único, direito de representação
- [x] 9.4 Criar `DocumentosUpload.test.tsx`: upload, hash display, download, integridade
- [x] 9.5 Criar `HistoricoTimeline.test.tsx`: renderização eventos ordenados
- [x] 9.6 Rodar `npm test` no `apps/web-client` e garantir tsc --noEmit limpo

## 10. Integração e Deploy

- [ ] 10.1 Criar feature flag `cemiterio.sucessao_v2` no sistema de configurações (off por padrão)
- [ ] 10.2 Executar `php artisan migrate` em ambiente de staging
- [ ] 10.3 Executar `php artisan cemiterio:migrate-sucessao-legacy` para migrar dados antigos
- [ ] 10.4 Rodar `php artisan test --filter=Cemiterio` completo em staging
- [ ] 10.5 Build frontend: `npm run build` no `apps/web-client`
- [ ] 10.6 Deploy backend + frontend para staging
- [ ] 10.7 Ativar feature flag `cemiterio.sucessao_v2` para tenant(s) canary
- [ ] 10.8 Monitoramento: logs `audit_logs`, métricas de transições, erros 5xx, integridade documentos
- [ ] 10.9 Rollback plan: desativar flag + revert deploy + soft delete migrations (dados preservados)

## 11. Documentação

- [ ] 11.1 Atualizar README do módulo Cemiterio com nova documentação de sucessão hereditária
- [x] 11.2 Criar `docs/sucessao-hereditaria.md` com fluxo completo, diagrama de estados, endpoints API, exceções
- [x] 11.3 Documentar pergunta aberta: `[LEI/DECRETO MUNICIPAL DE SUCESSÃO DE JAZIGOS — CONFIRMAR]` para Araucária/PR