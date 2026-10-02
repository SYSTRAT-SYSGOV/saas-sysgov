# Tasks

## 1. Infraestrutura do Módulo

- [ ] 1.1 Executar `php artisan make:module Requerimentos` para gerar o scaffold base do módulo Laravel e verificar que a estrutura de diretórios foi criada corretamente.
- [ ] 1.2 Criar migrations para as tabelas do módulo: `requerimentos_tipos_instrumento`, `requerimentos_proposicoes`, `requerimentos_autores`, `requerimentos_anexos`, `requerimentos_vinculacoes`, `requerimentos_tramitacoes_poderes`, `requerimentos_respostas`, `requerimentos_contadores`, `requerimentos_notificacoes` e verificar a criação das tabelas no banco de dados.
- [ ] 1.3 Criar models Eloquent com trait `TenantAware` para todas as entidades de negócio e verificar que o escopo `tenant_id` é aplicado automaticamente.
- [ ] 1.4 Criar seeders para tipos de instrumento padrão (requerimento, indicação, projeto de lei, projeto de resolução, projeto de decreto legislativo, moção, ofício) e verificar a inserção no banco.
- [ ] 1.5 Configurar o `ModuleServiceProvider` com bindings de interfaces, listeners de eventos e agendamentos (scheduler) e verificar que o provider é registrado corretamente.

## 2. Cadastro Tipificado de Proposições

- [ ] 2.1 Implementar o `ProposicaoService::criarProposicao()` com validação de tipo de instrumento, campos obrigatórios por tipo, geração de numeração sequencial atômica e persistência com `DB::transaction()` e verificar via teste unitário a criação de cada tipo de instrumento.
- [ ] 2.2 Implementar o endpoint `POST /api/requerimentos/proposicoes` no `ProposicaoController` com validação via FormRequest e verificar via teste de feature as respostas HTTP adequadas (201, 422, 403).
- [ ] 2.3 Implementar vinculação a proposição ou processo anterior no `ProposicaoService::vincular()` e verificar a persistência da referência e a integridade referencial.
- [ ] 2.4 Implementar upload e vinculação de anexos via `AnexoService` com validação de tipos MIME e tamanho máximo e verificar o armazenamento e recuperação dos arquivos.

## 3. Tramitação entre Poderes

- [ ] 3.1 Implementar o `TramitacaoPoderesService::encaminhar()` com validação de origem/destino, atribuição de responsável, cálculo de data limite de resposta e notificação ao destinatário e verificar o fluxo completo via teste de feature.
- [ ] 3.2 Implementar o `TramitacaoPoderesService::registrarRecebimento()` com registro de data/hora e notificação ao Poder de origem e verificar a transição de status.
- [ ] 3.3 Implementar o endpoint `POST /api/requerimentos/tramitacoes-poderes` e `PATCH /api/requerimentos/tramitacoes-poderes/{id}/recebimento` e verificar as respostas HTTP.
- [ ] 3.4 Implementar o `VerificarPrazosJob` (scheduler diário) para alertas de proximidade (5 dias) e vencimento de prazo e verificar a atualização de status e envio de notificações.
- [ ] 3.5 Implementar `TramitacaoPoderesPolicy` com regras de segregação por Poder e verificar que usuários de um Poder não podem tramitar proposições do outro Poder.

## 4. Tramitação Interna (Workflow)

- [ ] 4.1 Implementar `WorkflowInterface` e `WorkflowAdapter` para consumir o módulo de Workflow e verificar a comunicação entre os módulos via teste de integração.
- [ ] 4.2 Implementar `TramitacaoInternaService::configurarWorkflow()` para associar um workflow a um tipo de instrumento e verificar a persistência da configuração.
- [ ] 4.3 Implementar listener `AvancarEtapaWorkflow` que reage a eventos de conclusão de etapa do Workflow e avança a proposição automaticamente e verificar a transição de etapas via teste de feature.
- [ ] 4.4 Implementar endpoint `GET /api/requerimentos/proposicoes/{id}/tramitacao-interna` para consulta do histórico de etapas internas e verificar o retorno dos dados.

## 5. Resposta e Manifestação Formal

- [ ] 5.1 Implementar `RespostaService::elaborarResposta()` com suporte a rascunho, conteúdo formatado e anexos e verificar a persistência nos estados 'rascunho' e 'enviado'.
- [ ] 5.2 Implementar `RespostaService::enviarResposta()` com transição de status, atualização da tramitação e notificação ao Poder de origem e verificar a impossibilidade de editar resposta já enviada.
- [ ] 5.3 Implementar endpoints `POST /api/requerimentos/respostas` e `PATCH /api/requerimentos/respostas/{id}/enviar` e verificar as respostas HTTP adequadas.

## 6. Notificações e Alertas

- [ ] 6.1 Criar Events: `ProposicaoCriada`, `ProposicaoStatusChanged`, `TramitacaoEncaminhada`, `TramitacaoRespondida`, `PrazoProximo`, `PrazoVencido` e verificar que são disparados nos momentos corretos.
- [ ] 6.2 Criar Listeners correspondentes que disparam `EnviarNotificacaoJob` e verificar o despacho dos Jobs para a fila Redis.
- [ ] 6.3 Implementar `EnviarNotificacaoJob` com suporte a canais (e-mail, portal) e preferências do usuário e verificar o envio via logs.
- [ ] 6.4 Implementar `PreferenciaNotificacaoService` para consulta e atualização de preferências de canal por usuário e verificar o respeito às preferências no envio.

## 7. Painel de Acompanhamento Público

- [ ] 7.1 Implementar endpoint público `GET /api/publico/requerimentos` com paginação, filtros (tipo, autor, área temática, situação, período) e exclusão de proposições com `visibilidade_publica = false` e verificar o retorno correto dos dados.
- [ ] 7.2 Implementar endpoint público `GET /api/publico/requerimentos/{id}` com texto integral, histórico resumido e resposta formal (se existente) e verificar a supressão de dados pessoais.
- [ ] 7.3 Desenvolver a interface do painel público em `apps/web/src/modules/requerimentos` com componentes exclusivamente do `@sysgov/ui` e verificar a renderização correta.
- [ ] 7.4 Implementar máscara automática de dados pessoais (CPF, RG, endereço, telefone) na exibição pública via `DadoPessoalMasker` e verificar a ocultação no frontend.

## 8. Consulta e Acompanhamento pelo Autor

- [ ] 8.1 Implementar endpoint `GET /api/requerimentos/minhas-proposicoes` com dashboard de KPIs (total, em tramitação, respondidas, vencidas) e lista paginada e verificar o retorno correto dos dados agregados.
- [ ] 8.2 Implementar endpoint `GET /api/requerimentos/proposicoes/{id}/historico-completo` com todas as etapas de tramitação (interna e entre Poderes) e verificar o acesso restrito ao autor ou administrador.
- [ ] 8.3 Desenvolver a interface do autor em `apps/web-client/src/modules/requerimentos` com cards de KPI, lista de proposições com badges de status e tela de detalhamento com timeline de tramitação e verificar os componentes.
- [ ] 8.4 Implementar `ProposicaoPolicy::view()` para garantir que apenas autor, participantes da tramitação ou administradores visualizem proposições não públicas e verificar via teste.

## 9. Relatórios Gerenciais e Estatísticos

- [ ] 9.1 Implementar `RelatorioService::relatorioQuantitativo()` com queries agregadas por tipo, autor, período, área temática e situação e verificar a acurácia dos números.
- [ ] 9.2 Implementar `RelatorioService::indicadorTempoMedio()` com cálculo de média, mediana e desvio padrão do tempo de tramitação por tipo e verificar os valores calculados.
- [ ] 9.3 Implementar `RelatorioService::indicadorCumprimentoPrazos()` com percentuais de tramitações no prazo, em alerta e vencidas e verificar a segmentação por tipo.
- [ ] 9.4 Implementar endpoints `GET /api/requerimentos/relatorios/*` com cache Redis (TTL 1h) e exportação em PDF/Excel via Jobs para relatórios grandes e verificar o download dos arquivos.
- [ ] 9.5 Desenvolver a interface de relatórios em `apps/web-client/src/modules/requerimentos/relatorios` com filtros e gráficos e verificar a renderização.

## 10. Segregação de Acesso e Políticas

- [ ] 10.1 Implementar `ProposicaoPolicy` com métodos `viewAny`, `view`, `create`, `update`, `delete`, `encaminhar`, `responder` considerando Poder de origem e perfil do usuário e verificar cada regra via teste unitário.
- [ ] 10.2 Implementar `TramitacaoPoderesPolicy` com regras de segregação e verificar que usuários só veem tramitações de seu Poder.
- [ ] 10.3 Implementar middleware `VerificarPoderUsuario` que injeta o `poder_origem` no contexto da requisição e verificar a resolução correta a partir do tenant e perfil.

## 11. Trilha de Auditoria

- [ ] 11.1 Implementar `AuditLogger` no `ProposicaoService` para registrar eventos de criação, edição, tramitação, resposta e alteração de status e verificar a persistência em `audit_logs`.
- [ ] 11.2 Implementar endpoint `GET /api/requerimentos/proposicoes/{id}/auditoria` para consulta da trilha completa e verificar o acesso restrito a auditores e administradores.
- [ ] 11.3 Garantir que todos os registros de auditoria incluam `user_id`, `tenant_id`, `poder_origem`, `event`, `metadata` e `created_at` e verificar a presença de todos os campos.

## 12. Conformidade Legal e APIs de Integração

- [ ] 12.1 Implementar `POST /api/requerimentos/publicar-diario` como endpoint de integração com Diário Oficial Eletrônico e verificar a formatação dos dados e o registro de auditoria.
- [ ] 12.2 Implementar integração com o módulo de Assinatura Digital via interface `AssinaturaDigitalInterface` e verificar a chamada ao PSC para proposições e respostas que exigem assinatura.
- [ ] 12.3 Implementar criptografia AES-256 para campos de dados pessoais nas proposições e verificar que os dados são armazenados criptografados e descriptografados apenas para usuários autorizados.
- [ ] 12.4 Implementar `DadoPessoalMasker` para ocultação automática de CPF, RG, endereço e telefone no painel público e nas APIs públicas e verificar o mascaramento correto.
- [ ] 12.5 Documentar as APIs públicas no formato OpenAPI/Swagger e verificar a disponibilidade da documentação no endpoint `/api/docs`.

## 13. Testes e Qualidade

- [ ] 13.1 Garantir cobertura de testes unitários ≥ 80% para todos os Services do módulo e verificar via `php artisan test --coverage`.
- [ ] 13.2 Garantir cobertura de testes de feature para todos os endpoints da API e verificar cenários de sucesso e erro.
- [ ] 13.3 Executar `composer test` e `npm test` e verificar que todos os testes existentes continuam passando.
- [ ] 13.4 Verificar conformidade com `CODING_STANDARD.md` via PHPStan/Larastan nível 5 e verificar zero erros.