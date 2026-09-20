# Spec: procurement

> Auto-extracted by spec-miner. Last mined: 2026-09-19.
> Source: apps/api/Modules/Procurement (Services/{ProcurementFlowService,MarketResearchService,BiddingRoomService,ContractExecutionService,LegalDeadlinesService,AuditHMACService,PncpIntegrationService}, Http/Controllers/{LicitacaoController,LicitacaoLifecycleController,LicitacaoArtefatosController,LicitacaoPrecosController,LicitacaoLancesController,LicitacaoContratosController}, Models/{Licitacao,LicitacaoArtefato,LicitacaoPreco,LicitacaoParticipante,LicitacaoLance,LicitacaoContrato,LicitacaoAditivo,LicitacaoPagamento,LicitacaoMedicao,LicitacaoParecer}, Policies/{LicitacaoPolicy,ProcurementArtefatoPolicy}, Routes/api.php, Config/config.php, Database/Migrations, Tests/Feature)
> Last verified: 2026-09-19 (commit 2bd3aae)

Escopo: ciclo completo de contratação pública sob a Lei 14.133/2021 — fase interna
(DFD → ETP → pesquisa de mercado → TR → parecer jurídico), publicação do edital com prazo
legal mínimo, sala de disputa eletrônica com anti-spam e empate ficto ME/EPP, adjudicação e
homologação com segregação de funções, e execução contratual (aditivos, medições,
pagamentos). Cobre ainda a integração assíncrona com o PNCP via Outbox, auditoria HMAC
encadeada e isolamento multi-tenant.

---

### Requirement: Abertura de processo licitatório nasce em rascunho e escopada à unidade permitida
<!-- id: LicitacaoController.store -->
<!-- entities: Licitacao, OrgUnit, OrgUnitUser, User -->
<!-- triggers: Publicação do edital exige fase interna integralmente concluída -->
<!-- enforced: LicitacaoController.store() -->

A criação de licitação SHALL exigir `numero`, `modalidade` dentro da lista canônica
(`pregao_eletronico`, `concorrencia`, `concurso`, `leilao`, `dialogo_competitivo`,
`dispensa_eletronica`, `inexigibilidade`) e `objeto` com no mínimo 10 caracteres. O `status`
inicial SHALL ser sempre `rascunho` e o `created_by` SHALL ser o usuário autenticado — nenhum
dos dois é aceito do cliente. Quando `org_unit_id` é informado, ele SHALL ser validado contra
`ModuleAccessService.allowedOrgUnitIds()` do usuário no módulo `procurement`; quando omitido,
a unidade é inferida do vínculo `OrgUnitUser` do usuário no tenant.

#### Scenario: criação válida
<!-- test: ProcurementBusinessRulesTest.test_rn_002_sequential_artifacts_validation() -->
- **WHEN** `store()` recebe número, modalidade e objeto válidos
- **THEN** persiste `Licitacao` com `status = rascunho`, audita `licitacao.created` via HMAC encadeado, publica `ProcurementCreated` no Outbox e responde HTTP 201

#### Scenario: unidade organizacional fora do escopo do usuário
- **WHEN** `org_unit_id` informado não está em `allowedOrgUnitIds()` do usuário
- **THEN** responde HTTP 403 "Unidade organizacional não permitida." e nada é persistido

#### Scenario: modalidade fora da lista canônica
- **WHEN** `modalidade` não pertence ao enum aceito
- **THEN** a validação falha com HTTP 422

#### Scenario: objeto com menos de 10 caracteres
- **WHEN** `objeto` tem comprimento inferior a 10
- **THEN** a validação falha com HTTP 422

---

### Requirement: Alteração e exclusão do processo são restritas às fases pré-publicação
<!-- id: LicitacaoController.update -->
<!-- entities: Licitacao -->
<!-- depends_on: Abertura de processo licitatório nasce em rascunho e escopada à unidade permitida -->
<!-- enforced: LicitacaoController.update() -->

A edição do processo SHALL ser admitida apenas enquanto o `status` for `rascunho` ou
`em_fase_interna`; a exclusão SHALL ser admitida apenas em `rascunho`. A mesma regra está
espelhada em `LicitacaoPolicy.update()` e `LicitacaoPolicy.delete()`. Toda alteração e
exclusão grava estado anterior e posterior na auditoria.

#### Scenario: edição de processo publicado
- **WHEN** `update()` é chamado para licitação em status diferente de `rascunho`/`em_fase_interna`
- **THEN** responde HTTP 422 "Apenas licitações em rascunho ou fase interna podem ser alteradas." e nada é alterado

#### Scenario: exclusão fora do rascunho
- **WHEN** `destroy()` é chamado para licitação com `status !== 'rascunho'`
- **THEN** responde HTTP 422 "Apenas processos em rascunho podem ser excluídos."

#### Scenario: exclusão válida
- **WHEN** `destroy()` é chamado para licitação em `rascunho`
- **THEN** o registro é removido e `licitacao.deleted` é auditado com o estado anterior completo

---

### Requirement: RN-002 — Artefatos da fase interna obedecem encadeamento sequencial obrigatório
<!-- id: ProcurementFlowService.validateArtifactPrerequisites -->
<!-- entities: Licitacao, LicitacaoArtefato, LicitacaoPreco -->
<!-- triggers: RN-005 — Segregação de funções impede aprovação da própria peça -->
<!-- enforced: ProcurementFlowService.validateArtifactPrerequisites() -->

A criação de cada artefato SHALL validar os pré-requisitos da etapa anterior: o ETP exige DFD
com `status = aprovado`; a pesquisa de mercado exige ETP existente; o TR exige no mínimo
`procurement.market_research.min_sources` (padrão 3) preços com `status = valida`; o parecer
exige TR aprovado. Os tipos aceitos são `dfd`, `etp`, `matriz_riscos`, `pesquisa_mercado`,
`tr` e `parecer`, e cada tipo é único por licitação (`updateOrCreate` por tenant + licitação +
tipo), sempre reabrindo o artefato em `rascunho`.

#### Scenario: ETP sem DFD aprovado
<!-- test: ProcurementBusinessRulesTest.test_rn_002_sequential_artifacts_validation() -->
- **WHEN** `validateArtifactPrerequisites()` recebe `etp` sem DFD aprovado na licitação
- **THEN** lança `DomainException` "RN-002: A elaboração do Estudo Técnico Preliminar (ETP) exige um Documento de Formalização de Demanda (DFD) previamente aprovado." e `LicitacaoArtefatosController.store()` responde HTTP 422

#### Scenario: TR sem mapa de preços consolidado
- **WHEN** a licitação tem menos de 3 preços com `status = valida` e o tipo alvo é `tr`
- **THEN** lança `DomainException` citando "Mapa de Preços consolidado com no mínimo 3 fontes válidas"

#### Scenario: parecer sem TR aprovado
- **WHEN** o tipo alvo é `parecer` e não existe TR com `status = aprovado`
- **THEN** lança `DomainException` "A emissão do Parecer Jurídico exige o Termo de Referência (TR) previamente aprovado."

#### Scenario: pesquisa de mercado sem ETP
- **WHEN** o tipo alvo é `pesquisa_mercado` e não existe nenhum ETP vinculado
- **THEN** lança `DomainException` "A pesquisa de mercado requer a existência de um ETP vinculado ao processo."

#### Scenario: regravação do mesmo tipo de artefato
- **WHEN** `store()` é chamado duas vezes para o mesmo (tenant, licitação, tipo)
- **THEN** o artefato existente é atualizado, retorna a `status = rascunho` e nenhuma duplicata é criada

---

### Requirement: RN-005 — Segregação de funções impede aprovação da própria peça
<!-- id: LicitacaoArtefatosController.aprovar -->
<!-- entities: LicitacaoArtefato, User, LicitacaoParecer -->
<!-- depends_on: RN-002 — Artefatos da fase interna obedecem encadeamento sequencial obrigatório -->
<!-- enforced: LicitacaoArtefatosController.aprovar() -->

O usuário que elaborou um artefato (`created_by`) SHALL ser impedido de aprová-lo. O bloqueio
é estrito e não admite exceção por papel ou permissão. A aprovação bem-sucedida grava
`status = aprovado`, `aprovado_por`, `aprovado_em` e limpa `justificativa_reprovacao`. A
reprovação SHALL exigir justificativa de no mínimo 5 caracteres.

#### Scenario: elaborador tenta aprovar o próprio artefato
- **WHEN** `aprovar()` é chamado com `artefato.created_by === user.id`
- **THEN** responde HTTP 403 com "RN-005 Segregação de Funções: O usuário elaborador da peça ... não pode aprová-la." e o status permanece inalterado

#### Scenario: aprovação por usuário distinto
- **WHEN** `aprovar()` é chamado por usuário diferente do elaborador
- **THEN** o artefato passa a `aprovado`, registra `aprovado_por`/`aprovado_em` e audita `artefato.{tipo}.approved`

#### Scenario: reprovação sem justificativa
- **WHEN** `reprovar()` é chamado sem `justificativa` ou com menos de 5 caracteres
- **THEN** a validação falha com HTTP 422

#### Scenario: parecerista tenta aprovar o próprio parecer
- **WHEN** `LicitacaoPolicy.approveOpinion()` é avaliada com `parecer.created_by === user.id` ou `parecer.parecerista_id === user.id`
- **THEN** a autorização é negada

#### Scenario: aprovação de artefato exige permissão e mesmo tenant
- **WHEN** `ProcurementArtefatoPolicy.approve()` é avaliada
- **THEN** exige, cumulativamente, elaborador distinto, `procurement.approve_artefatos` e `belongsToTenant(artefato.tenant_id)`

---

### Requirement: RN-004 — Pesquisa de mercado expurga outliers pela mediana e reajusta o valor estimado
<!-- id: MarketResearchService.recalculateMarketPrices -->
<!-- entities: LicitacaoPreco, Licitacao -->
<!-- enforced: MarketResearchService.recalculateMarketPrices() -->

O saneamento do mapa de preços SHALL usar a **mediana** das fontes como âncora estatística
(não a média), marcando como `outlier` toda fonte fora da faixa
`mediana × (1 ± outlier_threshold_percentage/100)` (padrão 25%), com `motivo_outlier`
registrando a discrepância percentual apurada. As estatísticas finais (média, mediana, mínimo,
máximo) SHALL ser calculadas apenas sobre as fontes válidas, e a média saneada SHALL
sobrescrever `licitacao.valor_estimado_cents`. O resultado é `is_valid` somente com pelo menos
`min_sources` (padrão 3) fontes válidas. O recálculo é disparado automaticamente a cada
inclusão ou exclusão de fonte e também na listagem.

#### Scenario: quatro fontes com uma discrepante
<!-- test: ProcurementBusinessRulesTest.test_rn_004_market_research_outlier_expurgation() -->
- **WHEN** existem fontes de 480000, 500000, 520000 e 1200000 centavos
- **THEN** exatamente 1 fonte é marcada `outlier` com "Discrepância estatística", restam 3 fontes válidas e `media_cents = 500000`

#### Scenario: nenhuma fonte cadastrada
- **WHEN** `recalculateMarketPrices()` roda sem nenhum `LicitacaoPreco`
- **THEN** retorna todas as estatísticas zeradas com `is_valid = false` e não altera o valor estimado

#### Scenario: todas as fontes classificadas como outlier
- **WHEN** o expurgo marcaria 100% das fontes como outlier
- **THEN** o conjunto original é usado como fallback para as estatísticas finais

#### Scenario: fonte reclassificada após nova cotação
- **WHEN** uma fonte antes marcada `outlier` volta a cair dentro da faixa após novas inclusões
- **THEN** ela retorna a `status = valida` e `motivo_outlier` é zerado

#### Scenario: tipo de fonte fora do enum
- **WHEN** `LicitacaoPrecosController.store()` recebe `tipo_fonte` fora de `banco_precos`, `pncp`, `contratacao_similar`, `cotacao`
- **THEN** a validação falha com HTTP 422

---

### Requirement: Publicação do edital exige fase interna integralmente concluída
<!-- id: ProcurementFlowService.validateCanPublish -->
<!-- entities: Licitacao, LicitacaoArtefato, LicitacaoPreco, LicitacaoParecer -->
<!-- depends_on: RN-002 — Artefatos da fase interna obedecem encadeamento sequencial obrigatório -->
<!-- triggers: Sala de lances só abre para processos publicados -->
<!-- enforced: ProcurementFlowService.validateCanPublish() -->

A publicação SHALL ser bloqueada enquanto não houver, cumulativamente: DFD, ETP e TR com
`status = aprovado`; no mínimo 3 fontes de preço com `status = valida`; parecer jurídico com
`tipo = juridico`, `status = aprovado` e `conclusao` em (`favoravel`, `com_ressalvas`) —
exigência do Art. 53 da Lei 14.133/2021; e `data_abertura` preenchida. Publicado o edital, o
status passa a `publicada` e a sincronização com o PNCP SHALL ser enfileirada via Outbox,
nunca por chamada HTTP síncrona.

#### Scenario: artefato obrigatório não aprovado
- **WHEN** `validateCanPublish()` encontra DFD, ETP ou TR sem aprovação
- **THEN** lança `DomainException` "não pode ser publicado sem a aprovação formal do artefato: {TIPO}" e o controller responde HTTP 422

#### Scenario: menos de 3 fontes de preço válidas
- **WHEN** a licitação tem menos de 3 preços com `status = valida`
- **THEN** lança `DomainException` "exige no mínimo 3 fontes de preços válidas para publicação do edital"

#### Scenario: parecer jurídico desfavorável ou ausente
- **WHEN** não existe parecer jurídico aprovado com conclusão `favoravel` ou `com_ressalvas`
- **THEN** lança `DomainException` citando o Art. 53 da Lei 14.133/2021

#### Scenario: data de abertura não definida
- **WHEN** `data_abertura` está vazia
- **THEN** lança `DomainException` "deve possuir data e horário de abertura definidos para publicação"

#### Scenario: publicação bem-sucedida
- **WHEN** todos os pré-requisitos são satisfeitos
- **THEN** o status vira `publicada`, `PncpNoticePublished` é publicado em `outbox_events` e `licitacao.published` é auditado

---

### Requirement: RN-017 — Prazo mínimo legal de abertura é calculado em dias úteis por modalidade e critério
<!-- id: LegalDeadlinesService.calculateMinimumOpeningDate -->
<!-- entities: Licitacao -->
<!-- enforced: LegalDeadlinesService.calculateMinimumOpeningDate() -->

A data mínima de abertura SHALL ser apurada em **dias úteis** (sábados e domingos
desconsiderados) a partir da data de publicação, conforme o Art. 55 da Lei 14.133/2021:
pregão eletrônico 8 dias (menor preço / maior desconto) ou 10 dias (demais critérios);
concorrência 10 (menor preço / maior desconto), 35 (melhor técnica / técnica e preço) ou 15;
leilão 15; diálogo competitivo 25; concurso 35; dispensa eletrônica 3; e 8 dias como padrão
para modalidade não mapeada. O horário de abertura resultante é fixado em 09:00.

#### Scenario: pregão eletrônico por menor preço
- **WHEN** `calculateMinimumOpeningDate()` recebe modalidade `pregao_eletronico` e critério `menor_preco`
- **THEN** retorna `dias_uteis_obrigatorios = 8` e a data calculada pulando finais de semana, às 09:00, com `fundamento_legal = 'Art. 55 da Lei nº 14.133/2021'`

#### Scenario: concorrência por técnica e preço
- **WHEN** modalidade é `concorrencia` e critério é `tecnica_e_preco`
- **THEN** retorna `dias_uteis_obrigatorios = 35`

#### Scenario: consulta do processo
- **WHEN** `LicitacaoController.show()` é chamado
- **THEN** a resposta inclui o bloco `deadlines` calculado para a licitação

---

### Requirement: Sala de lances só abre para processos publicados
<!-- id: LicitacaoLifecycleController.iniciarDisputa -->
<!-- entities: Licitacao -->
<!-- depends_on: Publicação do edital exige fase interna integralmente concluída -->
<!-- triggers: RN-013 — Lance é decrescente, credenciado e sujeito a intervalo anti-spam -->
<!-- enforced: LicitacaoLifecycleController.iniciarDisputa() -->

A abertura da sessão de disputa SHALL ser permitida apenas para processos em `publicada` ou já
`em_disputa`, promovendo o status para `em_disputa` e auditando `licitacao.bidding_started`.

#### Scenario: disputa a partir de rascunho ou fase interna
- **WHEN** `iniciarDisputa()` é chamado para status fora de `publicada`/`em_disputa`
- **THEN** responde HTTP 422 "Apenas processos publicados podem entrar em disputa."

#### Scenario: abertura válida
- **WHEN** o processo está `publicada`
- **THEN** o status passa a `em_disputa` e a auditoria registra o estado anterior e posterior

---

### Requirement: RN-013 — Lance é decrescente, credenciado e sujeito a intervalo anti-spam
<!-- id: BiddingRoomService.placeBid -->
<!-- entities: Licitacao, LicitacaoParticipante, LicitacaoLance -->
<!-- depends_on: Sala de lances só abre para processos publicados -->
<!-- triggers: Ranking ao vivo apura líder e empate ficto ME/EPP -->
<!-- enforced: BiddingRoomService.placeBid() -->

O registro de lance SHALL validar, em ordem: sala aberta (`em_disputa` ou `publicada`);
participante pertencente ao processo; participante em `credenciado`, `classificado` ou
`habilitado`; ausência de lock anti-spam (chave de cache por tenant + processo + participante,
TTL `procurement.bidding_anti_spam_seconds`, padrão 3 s); e valor estritamente inferior ao
menor lance registrado. Sem lances anteriores, o valor SHALL não superar o valor estimado do
processo. O lance persistido recebe `ordem` sequencial, `lancado_em` e `ip_address`, e o lock
anti-spam é renovado imediatamente após a gravação.

#### Scenario: dois lances sucessivos do mesmo participante
<!-- test: ProcurementBusinessRulesTest.test_rn_013_bidding_anti_spam_rejection() -->
- **WHEN** o mesmo participante envia um segundo lance dentro da janela anti-spam
- **THEN** lança `DomainException` "RN-013 Anti-Spam: Aguarde 3 segundos entre envios sucessivos de lances." e o controller responde HTTP 422

#### Scenario: sala fechada
- **WHEN** a licitação não está em `em_disputa` nem `publicada`
- **THEN** lança `DomainException` "A sala de lances não está aberta para disputa neste processo."

#### Scenario: participante de outro processo
- **WHEN** `participante.licitacao_id` difere da licitação informada
- **THEN** lança `DomainException` "O participante informado não pertence a este processo licitatório."

#### Scenario: participante não credenciado
- **WHEN** o status do participante está fora de `credenciado`/`classificado`/`habilitado`
- **THEN** lança `DomainException` "O participante não está habilitado para ofertar lances."

#### Scenario: lance igual ou superior ao melhor lance
- **WHEN** o valor ofertado é maior ou igual ao menor `valor_cents` já registrado no processo
- **THEN** lança `DomainException` "O lance ofertado deve ser estritamente inferior ao menor lance registrado atualmente."

#### Scenario: primeiro lance acima do valor estimado
- **WHEN** não há lances e o valor ofertado excede `licitacao.valor_estimado_cents` (> 0)
- **THEN** lança `DomainException` "O lance inicial não pode ser superior ao valor estimado do processo licitatório."

---

### Requirement: Ranking ao vivo apura líder e empate ficto ME/EPP
<!-- id: BiddingRoomService.getLiveRanking -->
<!-- entities: LicitacaoLance, LicitacaoParticipante, Licitacao -->
<!-- depends_on: RN-013 — Lance é decrescente, credenciado e sujeito a intervalo anti-spam -->
<!-- enforced: BiddingRoomService.getLiveRanking() -->

O ranking SHALL considerar apenas o melhor lance de cada participante, ordenado
crescentemente por valor. Quando o primeiro colocado **não** for ME/EPP, o sistema SHALL
identificar como elegíveis ao empate ficto (LC 123/2006 e Lei 14.133/2021) os participantes
ME/EPP cujo melhor lance esteja dentro de 5% do líder em `pregao_eletronico` ou 10% nas demais
modalidades.

#### Scenario: líder não-ME/EPP com ME/EPP na faixa de 5%
- **WHEN** a modalidade é `pregao_eletronico`, o líder não é ME/EPP e existe ME/EPP com lance ≤ líder × 1,05
- **THEN** `empate_ficto_me_epp.has_tie = true` e o fornecedor consta em `eligible_suppliers`

#### Scenario: líder já é ME/EPP
- **WHEN** o primeiro colocado tem `porte_me_epp = true`
- **THEN** nenhum empate ficto é apurado e `has_tie = false`

#### Scenario: modalidade diferente de pregão
- **WHEN** a modalidade não é `pregao_eletronico`
- **THEN** a margem aplicada é de 10% sobre o lance do líder

---

### Requirement: Credenciamento de participante registra fornecedor e porte
<!-- id: LicitacaoLancesController.credenciarParticipante -->
<!-- entities: LicitacaoParticipante, Licitacao -->
<!-- triggers: RN-013 — Lance é decrescente, credenciado e sujeito a intervalo anti-spam -->
<!-- enforced: LicitacaoLancesController.credenciarParticipante() -->

O credenciamento SHALL exigir `razao_social` e `cnpj` de exatamente 14 dígitos, registrar o
`porte_me_epp` (padrão `false`) e criar o participante em `status = credenciado`, herdando o
`tenant_id` da licitação e auditando `participante.credenciado`.

#### Scenario: CNPJ com tamanho inválido
- **WHEN** `cnpj` não tem exatamente 14 caracteres
- **THEN** a validação falha com HTTP 422

#### Scenario: credenciamento válido
- **WHEN** razão social e CNPJ válidos são informados
- **THEN** o participante é criado em `credenciado` e a resposta é HTTP 201

---

### Requirement: Adjudicação registra vencedor e valor final no processo
<!-- id: LicitacaoLifecycleController.adjudicar -->
<!-- entities: Licitacao, LicitacaoParticipante -->
<!-- depends_on: Ranking ao vivo apura líder e empate ficto ME/EPP -->
<!-- triggers: RN-005 — Homologação é privativa de autoridade distinta do criador do processo -->
<!-- enforced: LicitacaoLifecycleController.adjudicar() -->

A adjudicação SHALL exigir `vencedor_id` existente em `licitacao_participantes` e
`valor_final_cents` inteiro positivo, mover o status para `adjudicada` e gravar em
`metadata.adjudicacao` o vencedor, o valor final, o usuário adjudicante e o carimbo temporal
ISO-8601.

#### Scenario: adjudicação válida
- **WHEN** `adjudicar()` recebe vencedor existente e valor final ≥ 1
- **THEN** o status passa a `adjudicada`, `metadata.adjudicacao` é preenchido e `licitacao.adjudicated` é auditado

#### Scenario: vencedor inexistente
- **WHEN** `vencedor_id` não existe na tabela de participantes
- **THEN** a validação falha com HTTP 422

---

### Requirement: RN-005 — Homologação é privativa de autoridade distinta do criador do processo
<!-- id: LicitacaoLifecycleController.homologar -->
<!-- entities: Licitacao, User -->
<!-- depends_on: Adjudicação registra vencedor e valor final no processo -->
<!-- enforced: LicitacaoLifecycleController.homologar() -->

Quem criou o processo (`created_by`) SHALL ser impedido de homologá-lo. Homologado, o status
passa a `homologada`, a auditoria registra a autoridade homologadora e o evento
`ProcurementHomologated` SHALL ser publicado no Outbox, encerrando a fase externa.
`LicitacaoPolicy.homologate()` acrescenta a exigência de status em `adjudicada`,
`em_julgamento` ou `em_habilitacao`.

#### Scenario: criador tenta homologar
- **WHEN** `homologar()` é chamado com `licitacao.created_by === user.id`
- **THEN** responde HTTP 403 com "RN-005 Segregação de Funções: O usuário responsável pela criação/elaboração do processo não possui permissão para homologá-lo." e o status permanece inalterado

#### Scenario: homologação por autoridade distinta
- **WHEN** `homologar()` é chamado por usuário diferente do criador
- **THEN** o status passa a `homologada`, `licitacao.homologated` é auditado e `ProcurementHomologated` fica pendente em `outbox_events`

#### Scenario: homologação de processo ainda não adjudicado
- **WHEN** `LicitacaoPolicy.homologate()` é avaliada para status fora de `adjudicada`/`em_julgamento`/`em_habilitacao`
- **THEN** a autorização é negada

---

### Requirement: Encerramento anormal do processo exige tipificação e justificativa
<!-- id: LicitacaoLifecycleController.cancelar -->
<!-- entities: Licitacao -->
<!-- enforced: LicitacaoLifecycleController.cancelar() -->

A anulação, revogação ou declaração de deserto/fracassado SHALL exigir `tipo` em (`anulada`,
`revogada`, `deserta`, `fracassada`) e `justificativa` com no mínimo 10 caracteres. O status
recebe o próprio tipo, e `metadata.cancelamento` grava tipo, justificativa, usuário e carimbo
temporal. A ação auditada é nomeada dinamicamente (`licitacao.anulada`, `licitacao.revogada`, ...).

#### Scenario: cancelamento sem justificativa suficiente
- **WHEN** `justificativa` tem menos de 10 caracteres
- **THEN** a validação falha com HTTP 422 e o processo permanece no status anterior

#### Scenario: tipo de encerramento fora do enum
- **WHEN** `tipo` não pertence à lista aceita
- **THEN** a validação falha com HTTP 422

#### Scenario: revogação válida
- **WHEN** `tipo = revogada` com justificativa válida
- **THEN** o status vira `revogada`, `metadata.cancelamento` é gravado e `licitacao.revogada` é auditado

---

### Requirement: Contrato administrativo nasce vigente e é sincronizado com o PNCP
<!-- id: LicitacaoContratosController.store -->
<!-- entities: LicitacaoContrato, Licitacao -->
<!-- triggers: RN-009 — Aditivos de acréscimo respeitam limite legal cumulativo -->
<!-- enforced: LicitacaoContratosController.store() -->

O cadastro de contrato SHALL exigir `numero`, `objeto` com no mínimo 10 caracteres,
`fornecedor_nome`, `fornecedor_cnpj` de exatamente 14 dígitos, `valor_inicial_cents` inteiro
positivo e vigência com `vigencia_fim` posterior a `vigencia_inicio`. O `valor_atualizado_cents`
SHALL ser inicializado igual ao valor inicial e o `status` SHALL ser `vigente`. O contrato
SHALL ser publicado assincronamente no PNCP via Outbox (`PncpContractPublished`).

#### Scenario: vigência final anterior ou igual à inicial
- **WHEN** `vigencia_fim` não é posterior a `vigencia_inicio`
- **THEN** a validação falha com HTTP 422

#### Scenario: cadastro válido
- **WHEN** todos os campos obrigatórios são válidos
- **THEN** o contrato é criado com `status = vigente` e `valor_atualizado_cents = valor_inicial_cents`, `PncpContractPublished` é enfileirado no Outbox e `contrato.created` é auditado

---

### Requirement: RN-009 — Aditivos de acréscimo respeitam limite legal cumulativo de 25% ou 50%
<!-- id: ContractExecutionService.createAddendum -->
<!-- entities: LicitacaoContrato, LicitacaoAditivo -->
<!-- depends_on: Contrato administrativo nasce vigente e é sincronizado com o PNCP -->
<!-- enforced: ContractExecutionService.createAddendum() -->

O limite aplicável SHALL ser 50% quando o objeto do contrato contiver "obra", "reforma" ou
"engenharia" (comparação em minúsculas), e 25% nos demais casos (Art. 125 da Lei
14.133/2021). O percentual acumulado SHALL somar todos os aditivos de `tipo =
aditivo_acrescimo` do contrato ainda não `rejeitado`, mais o valor proposto, sobre o
`valor_inicial_cents`. Excedido o limite, o aditivo SHALL ser bloqueado e nada é persistido.
Aceito, o aditivo nasce em `minuta` com `percentual_aditivo` e `percentual_acumulado`
gravados, e o contrato tem `valor_atualizado_cents` (e, quando informada, `vigencia_fim`)
atualizados.

#### Scenario: acumulado ultrapassa o limite
<!-- test: ProcurementBusinessRulesTest.test_rn_009_contract_addendum_strict_limit() -->
- **WHEN** um contrato de serviços já tem 20% de acréscimo e recebe proposta de mais 10% (total 30% > 25%)
- **THEN** lança `DomainException` "RN-009: Limite legal de aditivos excedido!" citando percentual acumulado e limite, e o controller responde HTTP 422

#### Scenario: aditivo dentro do limite
<!-- test: ProcurementBusinessRulesTest.test_rn_009_contract_addendum_strict_limit() -->
- **WHEN** o primeiro aditivo de acréscimo representa 20% do valor inicial
- **THEN** o aditivo é criado com `percentual_aditivo = 20.0`, `status = minuta` e o contrato tem o valor atualizado acrescido

#### Scenario: contrato de obra ou reforma
- **WHEN** o `objeto` do contrato contém "obra", "reforma" ou "engenharia"
- **THEN** o limite cumulativo aplicado é de 50%

#### Scenario: contrato com valor inicial inválido
- **WHEN** `valor_inicial_cents <= 0`
- **THEN** lança `DomainException` "O contrato possui valor inicial inválido para cálculo de aditivos."

#### Scenario: aditivo de supressão, prazo ou apostilamento
- **WHEN** o `tipo` não é `aditivo_acrescimo`
- **THEN** o teto percentual não é aplicado e o aditivo não incrementa o acumulado de acréscimos

---

### Requirement: RN-008 — Pagamento não pode exceder 30 dias após o vencimento
<!-- id: ContractExecutionService.registerPayment -->
<!-- entities: LicitacaoContrato, LicitacaoPagamento -->
<!-- depends_on: Contrato administrativo nasce vigente e é sincronizado com o PNCP -->
<!-- enforced: ContractExecutionService.registerPayment() -->

Quando `data_pagamento` é informada, ela SHALL não ultrapassar `data_vencimento +
procurement.payment_max_days_after_due` (padrão 30 dias); excedido o prazo, o registro é
bloqueado com a indicação do atraso sujeito a juros e correção. O pagamento nasce em `pago`
quando há data de pagamento, e em `pendente` caso contrário.

#### Scenario: pagamento 40 dias após o vencimento
<!-- test: ProcurementBusinessRulesTest.test_rn_008_payment_due_date_limit() -->
- **WHEN** vencimento em 2026-05-01 e pagamento em 2026-06-10
- **THEN** lança `DomainException` "RN-008: A data de pagamento (2026-06-10) excede o limite legal de 30 dias" e `LicitacaoContratosController.storePagamento()` responde HTTP 422

#### Scenario: pagamento ainda não realizado
- **WHEN** `data_pagamento` é nula
- **THEN** o pagamento é criado com `status = pendente` sem qualquer verificação de prazo

#### Scenario: pagamento dentro do prazo
- **WHEN** a data de pagamento está dentro dos 30 dias após o vencimento
- **THEN** o pagamento é criado com `status = pago` e `pagamento.registered` é auditado

---

### Requirement: Medições contratuais entram em análise para ateste
<!-- id: LicitacaoContratosController.storeMedicao -->
<!-- entities: LicitacaoMedicao, LicitacaoContrato -->
<!-- depends_on: Contrato administrativo nasce vigente e é sincronizado com o PNCP -->
<!-- enforced: LicitacaoContratosController.storeMedicao() -->

O registro de medição SHALL exigir `numero`, `periodo` e `valor_cents` inteiro positivo, e
SHALL nascer sempre com `status = em_analise`, herdando o `tenant_id` do contrato — o ateste
não é automático no momento do registro.

#### Scenario: medição válida
- **WHEN** `storeMedicao()` recebe número, período e valor positivo
- **THEN** a medição é criada em `em_analise`, `medicao.created` é auditado e a resposta é HTTP 201

#### Scenario: valor de medição zerado ou negativo
- **WHEN** `valor_cents` é menor que 1
- **THEN** a validação falha com HTTP 422

---

### Requirement: Exportação estruturada para controle externo é integralmente auditada
<!-- id: LicitacaoController.export -->
<!-- entities: Licitacao, LicitacaoArtefato, LicitacaoPreco, LicitacaoParticipante, LicitacaoContrato, LicitacaoAditivo -->
<!-- enforced: LicitacaoController.export() -->

A exportação para TCE/TCU SHALL retornar o conjunto de licitações do tenant corrente com
artefatos, preços, participantes, contratos e aditivos, carimbado com `tenant_id`,
`exported_at` em ISO-8601 e `version`. A operação SHALL ser auditada como
`procurement.exported` com a contagem exportada.

#### Scenario: exportação executada
- **WHEN** `export()` é chamado com contexto de tenant
- **THEN** retorna o payload versionado com os dados do tenant e grava auditoria `procurement.exported` com `count`

---

### Invariant: Todo dado do Procurement é isolado por tenant
<!-- entities: Licitacao, LicitacaoArtefato, LicitacaoPreco, LicitacaoParticipante, LicitacaoLance, LicitacaoContrato, LicitacaoAditivo, LicitacaoMedicao, LicitacaoPagamento, LicitacaoParecer, LicitacaoDocumento, ProcurementArtefato, ContratoLicitacao, AditivoContratual, MedicaoContratual, PagamentoContratual -->
<!-- enforced: App\Models\Concerns\TenantAware -->
<!-- verified_by: TenantIsolationTest.test_licitacoes_are_strictly_isolated_between_tenants() -->

Os 16 models do módulo SHALL usar o trait `App\Models\Concerns\TenantAware`, que aplica o
global scope `tenant` em leitura e preenche `tenant_id` na criação. Toda tabela de negócio
possui `tenant_id` com FK para `tenants` e índices compostos iniciados por tenant
(`[tenant_id, created_at]`, `[tenant_id, status]`, `[tenant_id, modalidade]`,
`[tenant_id, licitacao_id, tipo]`). A unicidade do número do processo é
`unique(tenant_id, numero)` — dois tenants podem usar o mesmo número. O `tenant_id` é
resolvido server-side pelo `TenantContext` (middleware `tenant`/`ResolveTenant`) e nunca
aceito do cliente; criar registro sem contexto de tenant e sem `tenant_id` explícito lança
`LogicException`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Valores monetários trafegam exclusivamente em centavos inteiros
<!-- entities: Licitacao, LicitacaoPreco, LicitacaoLance, LicitacaoContrato, LicitacaoAditivo, LicitacaoPagamento, LicitacaoMedicao -->
<!-- enforced: Licitacao.casts -->
<!-- verified_by: ProcurementBusinessRulesTest.test_rn_004_market_research_outlier_expurgation() -->

Todo campo monetário SHALL terminar em `_cents`, ser declarado `unsignedBigInteger` na
migration, castado como `integer` no model e validado como `integer` nas Requests — nunca
`float`. Percentuais derivados (`percentual_aditivo`, `percentual_acumulado`) são `decimal(5,2)`
arredondados em 2 casas. A conversão para reais ocorre apenas na formatação de mensagens de
auditoria.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Integrações externas do Procurement são sempre assíncronas via Outbox
<!-- entities: Licitacao, LicitacaoContrato -->
<!-- enforced: PncpIntegrationService.publishProcurementNotice() -->

Nenhum controller ou service do módulo SHALL executar chamada HTTP síncrona a sistemas
externos. Toda comunicação com o PNCP e com consumidores externos é publicada em
`outbox_events` por `App\Support\OutboxPublisher` — `ProcurementCreated`,
`ProcurementHomologated`, `PncpNoticePublished` e `PncpContractPublished`. O
`PncpIntegrationService` não possui cliente HTTP, apenas monta o payload e delega ao Outbox.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda mutação do Procurement é auditada com HMAC encadeado (RN-020)
<!-- entities: AuditLog, Licitacao, LicitacaoArtefato, LicitacaoPreco, LicitacaoLance, LicitacaoContrato, LicitacaoAditivo, LicitacaoPagamento, LicitacaoMedicao, LicitacaoParticipante -->
<!-- enforced: AuditHMACService.record() -->
<!-- verified_by: ProcurementBusinessRulesTest.test_rn_020_audit_hmac_chain() -->

Toda criação, alteração, transição de status, exclusão e exportação SHALL gravar registro em
`audit_logs` com `tenant_id`, `user_id`, `module = procurement`, ação nomeada
(`licitacao.created`, `licitacao.published`, `licitacao.homologated`, `artefato.{tipo}.approved`,
`preco.added`, `lance.placed`, `aditivo.created`, `pagamento.registered`, ...), estados
`before`/`after`, IP, user agent e timestamp. Além disso, o bloco `after` SHALL conter
`_hmac_signature` (HMAC-SHA256 do payload assinado com `app.key`) e `_previous_hash`, formando
uma cadeia encadeada por tenant — a assinatura de um registro é obrigatoriamente o
`_previous_hash` do registro seguinte, tornando adulteração detectável por
`AuditHMACService.verifyChain()`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Nenhum usuário aprova, homologa ou atesta a própria peça (RN-005)
<!-- entities: Licitacao, LicitacaoArtefato, LicitacaoParecer, ProcurementArtefato, User -->
<!-- enforced: LicitacaoPolicy.approveArtifact() -->

A segregação de funções SHALL ser verificada server-side comparando o `id` do usuário
autenticado com `created_by` (artefatos e licitações) e com `parecerista_id` (pareceres). O
bloqueio é absoluto e precede qualquer verificação de permissão ou papel: nem administrador de
plataforma nem portador da permissão `procurement.approve_artefatos` aprova a própria peça. A
regra está implementada em quatro pontos independentes — `LicitacaoPolicy.approveArtifact()`,
`LicitacaoPolicy.approveOpinion()`, `LicitacaoPolicy.homologate()`,
`ProcurementArtefatoPolicy.approve()` — e replicada inline em
`LicitacaoArtefatosController.aprovar()` e `LicitacaoLifecycleController.homologar()`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: O acesso ao módulo e o escopo organizacional são resolvidos no servidor
<!-- entities: Licitacao, OrgUnit, User -->
<!-- enforced: Routes/api.php -->

Todas as rotas do módulo SHALL passar pela pilha `auth:sanctum` → `tenant` → `bindings` →
`module-access:procurement`, sob os prefixos `api/licitacoes` e `api/contratos-licitacao`. Além
do gate de módulo, as consultas de listagem e detalhe SHALL ser reduzidas às unidades
organizacionais permitidas ao usuário via `ModuleAccessService.scopeQuery()`, que devolve
`whereRaw('1 = 0')` quando o usuário não tem nenhuma unidade liberada. O `tenant_id` usado
nesse escopo vem de `TenantContext`, nunca do payload da requisição.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: A fase externa só é alcançável por avanço monotônico de status
<!-- entities: Licitacao -->
<!-- enforced: ProcurementFlowService.validateCanPublish() -->

O ciclo de vida do processo SHALL progredir `rascunho`/`em_fase_interna` → `publicada` →
`em_disputa` → `adjudicada` → `homologada`, com saída lateral para `anulada`, `revogada`,
`deserta` ou `fracassada`. Cada transição é guardada pelo status de origem exigido e nenhuma
rota permite retorno a `rascunho` após a publicação: a edição e a exclusão ficam bloqueadas
fora de `rascunho`/`em_fase_interna`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

<!-- uncertainty: LicitacaoPolicy é registrada em ProcurementServiceProvider.boot() via Gate::policy(), mas nenhum controller do módulo chama $this->authorize(), Gate::allows() ou can(). Os bloqueios de RN-005 e de status em vigor no runtime são as verificações inline dos controllers; a policy só produz efeito onde for invocada explicitamente (não há chamada no módulo). Não foi possível determinar pelo código se isso é drift ou se a policy existe para consumo futuro/externo. -->
<!-- uncertainty: O middleware EnsureMfaForManagers (RN-006, MFA obrigatório para Gestor/Autoridade Competente) existe em duas cópias (Http/Middleware e app/Http/Middleware) mas não é registrado em Routes/api.php, no ServiceProvider do módulo nem no kernel HTTP — logo, RN-006 não é aplicada em nenhuma rota. A própria implementação usa default `true` em `session()->get('mfa_verified', true)`, o que faria o gate passar por omissão mesmo se registrado. -->
<!-- uncertainty: Licitacao::$fillable não inclui 'ano', 'srp', 'exclusivo_me_epp', e nenhuma migration cria essas colunas em 'licitacoes'. Ainda assim LicitacaoController.store()/update() as validam e atribuem, os testes as passam em create() e LicitacaoController.index() filtra por where('ano', ...). A atribuição é silenciosamente descartada pelo mass assignment; o filtro por 'ano' tenderia a falhar em SQL. Mesma situação para 'homologado_por'/'homologado_em' gravados em LicitacaoLifecycleController.homologar() (a coluna existente é 'homologador_id'). Flagado, não corrigido. -->
<!-- uncertainty: Existem pares de models concorrentes para as mesmas entidades: LicitacaoContrato e ContratoLicitacao apontam ambos para a tabela 'contratos_licitacao'; LicitacaoAditivo/LicitacaoMedicao/LicitacaoPagamento apontam para tabelas renomeadas por database/migrations/2026_08_31_200000_align_procurement_schema_with_models.php, enquanto AditivoContratual/MedicaoContratual/PagamentoContratual ainda apontam para os nomes originais ('aditivos_contratuais', 'medicoes_contratuais', 'pagamentos_contratuais'), que deixam de existir após a renomeação. Os controllers usam a família Licitacao*; Licitacao::contratos() usa ContratoLicitacao. Não foi possível confirmar no código qual família é a canônica. -->
<!-- uncertainty: O módulo mantém um diretório app/ paralelo (app/Services/{ProcurementFlow,BiddingRoom,ContractExecution,MarketResearch,LegalDeadlines,AuditHMAC}.php, app/Http/Controllers/*, app/Policies/*, app/Traits/TenantAware.php) com classes de nomes antigos no mesmo namespace Modules\Procurement\*. Nenhuma delas é referenciada por Routes/api.php nem pelos controllers ativos. Não foi possível determinar pelo mapeamento PSR-4 se esse diretório chega a ser autoloadado. -->
<!-- uncertainty: Quatro services não são referenciados por nenhum controller, rota, provider ou teste: GestaoContratualService, ProcurementWorkflowService, MapaPrecosService e SalaLancesService (esta última é a única que dispara broadcast(new LanceRecebido(...)); BiddingRoomService, efetivamente usada pelo LicitacaoLancesController, não emite o evento). Jobs/SendToPncpJob é um stub vazio. -->
<!-- uncertainty: O módulo não usa App\Support\Money em nenhum ponto — a aritmética monetária é feita diretamente sobre inteiros de centavos nos services (MarketResearchService, ContractExecutionService, BiddingRoomService). O invariante de centavos inteiros é respeitado, mas não pelo helper canônico do projeto. -->
<!-- uncertainty: O anti-spam de lances usa Cache::has/put com chave por tenant+processo+participante. O comentário do código cita Redis, mas o store efetivo depende da configuração de cache do ambiente; em cache de array (testes) o lock é por processo. -->
<!-- uncertainty: module.json do Procurement não declara a chave "permissions" (presente no contrato de módulos descrito no CLAUDE.md), apenas "menu.permission": "procurement.view". A permissão 'procurement.approve_artefatos' é exigida por ProcurementArtefatoPolicy mas não é declarada no manifesto. -->
<!-- uncertainty: Tests/Unit/ProcurementBusinessRulesTest.php e Tests/Unit/TenantIsolationTest.php são stubs de scaffold (test_that_true_is_true) e não cobrem nada; a cobertura real está em Tests/Feature. Não há teste de isolamento de tenant para as demais 15 entidades do módulo — apenas para Licitacao. -->
<!-- deferred: Services/{GestaoContratualService,ProcurementWorkflowService,MapaPrecosService,SalaLancesService}.php, Jobs/SendToPncpJob.php, Events/LanceRecebido.php, Models/{LicitacaoDocumento,LicitacaoParecer,ProcurementArtefato,ContratoLicitacao,AditivoContratual,MedicaoContratual,PagamentoContratual}.php, app/** (diretório paralelo legado), Database/Migrations/{licitacao_participantes,licitacao_lances,licitacao_pareceres,contratos_licitacao}, frontend do módulo (nenhum diretório procurement encontrado em apps/web-client/src/modules) -->
