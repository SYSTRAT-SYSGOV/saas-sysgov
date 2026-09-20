# Spec: licita

> Auto-extracted by spec-miner. Last mined: 2026-09-19.
> Source: apps/api/Modules/Licita (Services/{ProcessoService,DfdService,EtpService,MapaRiscoService,PesquisaPrecoService,TrService,AprovacaoFinalService,CampoConfiguracaoService,LegalDocumentoService,LegislacaoContextoService,ComprasGovPrecoService,SaneamentoEstatisticoService,PesquisaPrecoIaService,DfdIaService}, Models/{Processo,Dfd,Etp,MapaRisco,PesquisaPreco,Tr,AprovacaoFinal,CampoConfiguracao,LegalDocumento,*Versao}, Enums/*, Http/Controllers/*, Policies/*, Providers/LicitaServiceProvider, Routes/api.php, Support/{HtmlSanitizer,ClassificacaoRisco,TextoParaHtml}, Database/Migrations, Tests/)
> Last verified: 2026-09-19 (commit 2bd3aae)

Escopo: instrução processual de contratações públicas sob a Lei 14.133/2021 — abertura e
numeração do processo administrativo, DFD com fluxo formal de aprovação e segregação de funções,
encadeamento dos artefatos de planejamento (ETP, Mapa de Riscos, Pesquisa de Preços, Termo de
Referência), aprovação final em lote pelo Ordenador de Despesas, parametrização de campos extras
por órgão, biblioteca de legislação global/local, apoio de IA fundamentado na legislação
cadastrada e coleta de preços reais no Compras.gov.br com saneamento estatístico. Todo o módulo é
isolado por tenant e versionado/auditado a cada mutação.

---

### Requirement: Número e ano do processo são gerados no servidor, sequenciais por tenant e ano
<!-- id: ProcessoService.criar -->
<!-- entities: Processo -->
<!-- triggers: Ciclo de vida do processo transita apenas entre quatro fases -->
<!-- enforced: ProcessoService.criar() -->

A abertura de processo SHALL aceitar do cliente apenas o `objeto` preliminar (`nullable`, máx.
500 caracteres). O `ano` SHALL ser sempre o ano corrente do servidor e o `numero` SHALL ser o
próximo sequencial daquele ano, com 3 dígitos preenchidos à esquerda ("001", "002", ...),
calculado sobre `Processo::withTrashed()` para não reaproveitar número de processo excluído
logicamente. O processo nasce em `fase_atual = dfd` e `status_geral = em_andamento`. Sem
`TenantContext` resolvido, a criação SHALL falhar com `DomainException` "RN-001: tenant não
identificado".

#### Scenario: criação sequencial no mesmo ano
<!-- test: ProcessoNumeracaoTest.test_numero_e_sequencial_e_ano_e_o_corrente() -->
- **WHEN** `criar()` é chamado duas vezes no mesmo tenant e ano
- **THEN** os processos recebem `numero` "001" e "002" e `ano` igual ao ano corrente

#### Scenario: numeração independente entre tenants
<!-- test: ProcessoNumeracaoTest.test_numeracao_e_isolada_por_tenant() -->
- **WHEN** dois tenants distintos criam o primeiro processo do mesmo ano
- **THEN** ambos recebem `numero` "001", sem colisão (unicidade composta `tenant_id, numero, ano`)

#### Scenario: corrida entre duas criações simultâneas
- **WHEN** o INSERT falha com `QueryException` contendo "Duplicate entry"
- **THEN** o número é recalculado e a criação é retentada até 3 vezes antes de propagar a exceção

#### Scenario: criação sem contexto de tenant
<!-- test: TenantIsolationTest.test_cannot_create_processo_without_tenant_context() -->
- **WHEN** não há tenant resolvido
- **THEN** a operação é abortada e nenhum processo é persistido

---

### Requirement: Ciclo de vida do processo transita apenas entre quatro fases
<!-- id: ProcessoService.avancarFase -->
<!-- entities: Processo, FaseLicita -->
<!-- depends_on: Número e ano do processo são gerados no servidor, sequenciais por tenant e ano -->
<!-- enforced: ProcessoService.avancarFase() -->

Apesar de `FaseLicita` conter também identificadores de tipo de documento (`etp`, `mapa_riscos`,
`pesquisa_precos`, `tr`, `edital`, usados por campos configuráveis, PDF e filtros), o
`Processo.fase_atual` SHALL transitar somente entre `dfd → em_elaboracao → aprovacao_ordenador →
concluido`. `avancarFase()` não valida a máquina de estados — cada artefato decide quando empurrar
o processo — e SHALL auditar `processo.fase_avancada` e publicar `licita.ProcessoFaseAvancada` no
Outbox a cada transição.

#### Scenario: aprovação do DFD
<!-- test: DfdWorkflowTest.test_fluxo_completo_de_aprovacao_avanca_processo_para_em_elaboracao() -->
- **WHEN** o DFD é aprovado
- **THEN** o processo passa a `em_elaboracao` e o `objeto` do processo é sobrescrito pelo objeto do DFD

#### Scenario: solicitação de aprovação final
<!-- test: AprovacaoFinalWorkflowTest.test_solicitar_avanca_fase_e_cria_aprovacao_pendente() -->
- **WHEN** a aprovação final é solicitada
- **THEN** o processo passa a `aprovacao_ordenador`

#### Scenario: aprovação final concedida
<!-- test: AprovacaoFinalWorkflowTest.test_aprovar_trava_os_quatro_artefatos_de_uma_vez_e_conclui_o_processo() -->
- **WHEN** o Ordenador aprova o pacote
- **THEN** o processo passa a `concluido`

#### Scenario: aprovação final rejeitada
<!-- test: AprovacaoFinalWorkflowTest.test_rejeitar_devolve_para_em_elaboracao_sem_travar_documentos() -->
- **WHEN** o Ordenador rejeita o pacote
- **THEN** o processo retorna a `em_elaboracao`

---

### Requirement: DFD é único por processo e nasce como rascunho do elaborador
<!-- id: DfdService.criar -->
<!-- entities: Dfd, Processo, DfdVersao, CampoConfiguracao -->
<!-- triggers: Máquina de estados do DFD é estritamente sequencial -->
<!-- enforced: DfdService.criar() -->

Cada processo SHALL ter no máximo um DFD. A criação SHALL exigir tenant resolvido, validar os
`campos_extras` contra a configuração ativa do tenant para o tipo `dfd`, validar os
`campos_extras` de cada item contra a configuração do seu próprio tipo (`dfd_item_material` ou
`dfd_item_servico`), sanitizar os campos de HTML rico e persistir com `status = rascunho` e
`elaborado_por` igual ao usuário autenticado. A operação roda em transação e SHALL gravar a
versão 1 (`acao = criado`), auditar `dfd.criado` e publicar `licita.DfdCriado` no Outbox.

#### Scenario: segundo DFD no mesmo processo
- **WHEN** `criar()` é chamado para processo que já possui DFD
- **THEN** lança `DomainException` "Este processo já possui um DFD" e o controller responde HTTP 422

#### Scenario: campos extras de item validados pelo tipo do item
<!-- test: DfdWorkflowTest.test_campos_extras_de_item_sao_validados_contra_configuracao_do_proprio_tipo() -->
- **WHEN** um item de tipo `material` omite campo obrigatório configurado em `dfd_item_material`
- **THEN** é lançada `ValidationException` no formato `errors: {campos_extras.<key>: [...]}` e nada é persistido

#### Scenario: itens de material e serviço
<!-- test: DfdWorkflowTest.test_itens_de_material_e_servico_sao_persistidos_no_dfd() -->
- **WHEN** o payload traz itens com `tipo` em `material|servico`, `codigo`, `descricao`, `unidade_medida`, `quantidade >= 0.01` e `valor_unitario >= 0`
- **THEN** os itens são persistidos na coluna JSON `itens` do DFD

---

### Requirement: Máquina de estados do DFD é estritamente sequencial
<!-- id: StatusDfd.podeTransicionarPara -->
<!-- entities: Dfd, StatusDfd, DfdVersao -->
<!-- depends_on: DFD é único por processo e nasce como rascunho do elaborador -->
<!-- triggers: Aprovação do DFD libera a fase de elaboração dos demais artefatos -->
<!-- enforced: StatusDfd.podeTransicionarPara() -->

As transições permitidas SHALL ser exatamente: `rascunho → em_revisao`, `em_revisao → aprovado`,
`em_revisao → rejeitado` e `rejeitado → rascunho` (reabertura). `aprovado` é terminal. Qualquer
outra transição SHALL lançar `DomainException` "Transição inválida de X para Y" (HTTP 422). A
edição de conteúdo (`DfdService.atualizar()`) SHALL ser permitida apenas em `rascunho`,
`em_revisao` ou `rejeitado`.

#### Scenario: aprovar DFD ainda em rascunho
<!-- test: DfdWorkflowTest.test_nao_permite_aprovar_dfd_ainda_em_rascunho() -->
- **WHEN** `aprovar()` é chamado com o DFD em `rascunho`
- **THEN** a transição é recusada e o status permanece `rascunho`

#### Scenario: reabertura só de rejeitado
<!-- test: DfdWorkflowTest.test_reabrir_so_permitido_quando_status_e_rejeitado() -->
- **WHEN** `reabrir()` é chamado com o DFD em status diferente de `rejeitado`
- **THEN** a transição é recusada

#### Scenario: ciclo rejeitar → reabrir → reenviar → aprovar
<!-- test: DfdWorkflowTest.test_dfd_rejeitado_pode_ser_reaberto_editado_e_reenviado_ate_aprovar() -->
- **WHEN** um DFD rejeitado é reaberto, editado e reenviado para revisão
- **THEN** o fluxo é aceito e pode terminar em `aprovado`

#### Scenario: edição de DFD aprovado
<!-- test: DfdWorkflowTest.test_dfd_aprovado_e_imutavel() -->
- **WHEN** `atualizar()` é chamado com o DFD em `aprovado`
- **THEN** lança `DomainException` "DFD aprovado é imutável" e nenhum campo é alterado

---

### Requirement: Segregação de funções impede que o elaborador decida sobre o próprio DFD
<!-- id: DfdService.validarSegregacaoFuncoes -->
<!-- entities: Dfd, User -->
<!-- enforced: DfdService.validarSegregacaoFuncoes() -->

RN-005: quando `dfd.elaborado_por` for igual ao id do usuário que executa a ação, aprovar,
rejeitar ou alterar a equipe de planejamento SHALL ser bloqueado com `DomainException`
"RN-005: o elaborador do DFD não pode ... (segregação de funções)". A checagem é feita no
service, após a Policy, e vale inclusive para quem possui a permissão `licita.aprovar`.

#### Scenario: elaborador tenta aprovar o próprio DFD
<!-- test: DfdWorkflowTest.test_elaborador_nao_pode_aprovar_o_proprio_dfd() -->
- **WHEN** o usuário com `licita.aprovar` é o mesmo que consta em `elaborado_por`
- **THEN** a aprovação é recusada com HTTP 422 e o DFD permanece em `em_revisao`

#### Scenario: elaborador tenta rejeitar o próprio DFD
- **WHEN** `rejeitar()` é chamado pelo elaborador
- **THEN** a mesma `DomainException` de segregação é lançada

---

### Requirement: Equipe de planejamento do DFD exige no mínimo duas pessoas identificadas
<!-- id: DfdController.validatedData -->
<!-- entities: Dfd -->
<!-- enforced: DfdController.validatedData() -->

Em observância ao art. 7º da Lei 14.133/2021, `equipe_planejamento` SHALL ser um array com no
mínimo 2 entradas, cada uma com `nome` (máx. 255), `cargo` (máx. 255) e `matricula` (máx. 50)
obrigatórios. No `update` os campos obrigatórios usam `sometimes|required`: podem estar ausentes
do payload, mas não podem vir presentes e vazios. `justificativa` aceita até 8000 caracteres (é
HTML rico do TinyMCE) e `objeto` até 500.

#### Scenario: equipe com apenas uma pessoa
<!-- test: DfdEquipePlanejamentoTest.test_recusa_criar_dfd_com_apenas_uma_pessoa_na_equipe() -->
- **WHEN** `store()` recebe `equipe_planejamento` com 1 entrada
- **THEN** a validação falha com HTTP 422 e nenhum DFD é criado

#### Scenario: equipe com duas pessoas
<!-- test: DfdEquipePlanejamentoTest.test_permite_criar_dfd_com_duas_pessoas_na_equipe() -->
- **WHEN** `store()` recebe 2 entradas completas
- **THEN** o DFD é criado com HTTP 201

#### Scenario: campo obrigatório presente e vazio no update
- **WHEN** `update()` recebe `objeto` ou `justificativa` como string vazia
- **THEN** a validação falha (`sometimes|required`), sem apagar o valor já gravado

---

### Requirement: Aprovador pode corrigir a equipe de planejamento apenas durante a revisão
<!-- id: DfdService.alterarEquipePlanejamento -->
<!-- entities: Dfd, DfdVersao -->
<!-- enforced: DfdService.alterarEquipePlanejamento() -->

A alteração isolada de `equipe_planejamento` SHALL exigir o DFD em `em_revisao`, SHALL exigir a
permissão de aprovar (`DfdPolicy.alterarEquipe()` delega a `aprovar()`, não a `update()`), SHALL
respeitar a segregação de funções e SHALL alterar somente esse campo. Havendo diferença, gera
versão `equipe_alterada_pelo_aprovador`, auditoria `dfd.equipe_alterada_pelo_aprovador` e evento
`licita.DfdEquipePlanejamentoAlterada` no Outbox.

#### Scenario: aprovador altera a equipe do DFD em revisão
<!-- test: DfdWorkflowTest.test_aprovador_pode_alterar_equipe_de_planejamento_do_dfd_em_revisao() -->
- **WHEN** o aprovador envia nova `equipe_planejamento` com pelo menos 2 integrantes
- **THEN** o campo é atualizado, uma nova versão é registrada e nenhum outro campo muda

#### Scenario: elaborador tenta usar a via do aprovador
<!-- test: DfdWorkflowTest.test_elaborador_nao_pode_alterar_equipe_de_planejamento_via_metodo_do_aprovador() -->
- **WHEN** um usuário com apenas `licita.update` chama a rota `PUT /dfds/{id}/equipe-planejamento`
- **THEN** a autorização é negada pela Policy

#### Scenario: DFD fora da revisão
<!-- test: DfdWorkflowTest.test_nao_permite_alterar_equipe_de_planejamento_fora_da_revisao() -->
- **WHEN** o DFD está em `rascunho`, `rejeitado` ou `aprovado`
- **THEN** lança `DomainException` "A equipe de planejamento só pode ser alterada pelo aprovador enquanto o DFD está em revisão."

---

### Requirement: Aprovação do DFD libera a fase de elaboração dos demais artefatos
<!-- id: DfdService.aprovar -->
<!-- entities: Dfd, Processo, DfdVersao -->
<!-- depends_on: Máquina de estados do DFD é estritamente sequencial -->
<!-- triggers: Cada artefato de planejamento exige o artefato anterior cadastrado e é único por processo -->
<!-- enforced: DfdService.aprovar() -->

A aprovação SHALL gravar `status = aprovado`, `aprovado_por` e `aprovado_em`, registrar versão
`aprovado` (com o `parecer` opcional, máx. 1000 caracteres), auditar `dfd.aprovado`, publicar
`licita.DfdAprovado` no Outbox e avançar o processo para `em_elaboracao` propagando o `objeto`
do DFD. A partir daí, ETP, Mapa de Riscos, Pesquisa de Preços e TR SHALL ser editáveis livremente
e em qualquer ordem, sem gate de aprovação individual entre eles. A rejeição SHALL exigir
`motivo` (obrigatório, máx. 1000) e publicar `licita.DfdRejeitado`.

#### Scenario: aprovação bem-sucedida
<!-- test: DfdWorkflowTest.test_fluxo_completo_de_aprovacao_avanca_processo_para_em_elaboracao() -->
- **WHEN** um usuário distinto do elaborador, com `licita.aprovar`, aprova o DFD em revisão
- **THEN** o DFD fica `aprovado` e o processo avança para `em_elaboracao`

#### Scenario: rejeição sem motivo
- **WHEN** `rejeitar()` é chamado sem `motivo`
- **THEN** a validação do controller falha com HTTP 422

---

### Requirement: Cada artefato de planejamento exige o artefato anterior cadastrado e é único por processo
<!-- id: EtpService.criar -->
<!-- entities: Etp, MapaRisco, PesquisaPreco, Tr, Processo -->
<!-- depends_on: Aprovação do DFD libera a fase de elaboração dos demais artefatos -->
<!-- enforced: EtpService.criar() -->

RN-002: o encadeamento de pré-requisitos SHALL ser DFD → ETP → Mapa de Riscos → Pesquisa de
Preços → TR, verificando apenas a **existência** do artefato anterior, nunca sua aprovação. Cada
artefato SHALL ser único por processo (`DomainException` "Este processo já possui ..." na segunda
tentativa) e nasce com `status = rascunho` e `elaborado_por` preenchido. Todos exigem tenant
resolvido (`RN-001`) e validam `campos_extras` contra a configuração ativa do tenant para o
respectivo tipo de documento.

#### Scenario: ETP sem DFD
<!-- test: EtpWorkflowTest.test_nao_permite_criar_etp_sem_dfd() -->
- **WHEN** `EtpService.criar()` roda num processo sem DFD
- **THEN** lança `DomainException` "Cadastre o DFD deste processo antes de iniciar o ETP."

#### Scenario: ETP com DFD ainda não aprovado
<!-- test: EtpWorkflowTest.test_criar_etp_nao_exige_dfd_aprovado_apenas_que_exista() -->
- **WHEN** existe DFD em `rascunho`
- **THEN** o ETP é criado normalmente

#### Scenario: Mapa de Riscos sem ETP
<!-- test: MapaRiscoWorkflowTest.test_nao_permite_criar_mapa_de_riscos_sem_etp() -->
- **WHEN** `MapaRiscoService.criar()` roda num processo sem ETP
- **THEN** lança `DomainException` "Cadastre o ETP deste processo antes de iniciar o Mapa de Riscos."

#### Scenario: Pesquisa de Preços sem Mapa de Riscos
<!-- test: PesquisaPrecoWorkflowTest.test_nao_permite_criar_pesquisa_de_precos_sem_mapa_de_riscos() -->
- **WHEN** `PesquisaPrecoService.criar()` roda num processo sem Mapa de Riscos
- **THEN** lança `DomainException` "Cadastre o Mapa de Riscos deste processo antes de iniciar a Pesquisa de Preços."

#### Scenario: TR sem Pesquisa de Preços
<!-- test: TrWorkflowTest.test_nao_permite_criar_tr_sem_pesquisa_de_precos() -->
- **WHEN** `TrService.criar()` roda num processo sem Pesquisa de Preços
- **THEN** lança `DomainException` "Cadastre a Pesquisa de Preços deste processo antes de iniciar o Termo de Referência."

#### Scenario: segundo artefato do mesmo tipo
<!-- test: EtpWorkflowTest.test_nao_permite_criar_segundo_etp_no_mesmo_processo() -->
- **WHEN** já existe ETP / Mapa de Riscos / Pesquisa de Preços / TR no processo
- **THEN** a segunda criação é recusada com HTTP 422

---

### Requirement: Equipe de planejamento e itens são herdados por cópia, não por referência
<!-- id: PesquisaPrecoService.criar -->
<!-- entities: Etp, MapaRisco, PesquisaPreco, Tr, Dfd -->
<!-- depends_on: Cada artefato de planejamento exige o artefato anterior cadastrado e é único por processo -->
<!-- enforced: PesquisaPrecoService.criar() -->

Quando `equipe_planejamento` não vier no payload (ou vier nula), o artefato SHALL nascer com uma
**cópia** da equipe do artefato imediatamente anterior (ETP←DFD, Mapa←ETP, Pesquisa←Mapa,
TR←Pesquisa), gravada em coluna própria e editável dali em diante sem afetar a origem. A Pesquisa
de Preços SHALL ainda copiar os itens do DFD preservando apenas `codigo`, `descricao`,
`unidade_medida`, `quantidade` e `tipo`, começando com `cotacoes` vazias — o `valor_unitario` do
DFD é estimativa de planejamento e não é herdado, pois é a Pesquisa de Preços que apura o valor
de referência.

#### Scenario: ETP nasce com a equipe do DFD
<!-- test: EtpWorkflowTest.test_etp_nasce_com_a_equipe_copiada_do_dfd() -->
- **WHEN** o ETP é criado sem `equipe_planejamento`
- **THEN** recebe a mesma equipe gravada no DFD do processo

#### Scenario: edição independente da origem
<!-- test: EtpWorkflowTest.test_equipe_do_etp_pode_ser_editada_independente_do_dfd() -->
- **WHEN** a equipe do ETP é alterada
- **THEN** a equipe do DFD permanece inalterada

#### Scenario: itens copiados do DFD para a Pesquisa de Preços
<!-- test: PesquisaPrecoWorkflowTest.test_pesquisa_de_precos_nasce_com_itens_copiados_do_dfd() -->
- **WHEN** a Pesquisa de Preços é criada sem `itens`
- **THEN** os itens do DFD são copiados sem `valor_unitario` e com `cotacoes: []`

---

### Requirement: Pesquisa de Preços exige no mínimo três cotações válidas por item
<!-- id: PesquisaPrecoService.validarCompletude -->
<!-- entities: PesquisaPreco, Processo -->
<!-- triggers: Solicitação da aprovação final exige o pacote completo de artefatos -->
<!-- enforced: PesquisaPrecoService.validarCompletude() -->

RN-006 (IN SEGES/ME nº 65/2021, art. 5º-6º): antes da solicitação de aprovação final, cada item
da Pesquisa de Preços SHALL ter pelo menos 3 cotações com `valor_unitario > 0`. A pesquisa SHALL
ter ao menos um item. A validação é chamada exclusivamente por `AprovacaoFinalService.solicitar()`
— não existe mais "enviar para revisão" individual da Pesquisa de Preços. O `metodo_referencia`
SHALL ser um valor de `MetodoReferenciaPreco` (`media`, `mediana`, `menor_valor`,
`media_saneada`), com `justificativa_metodo` opcional (máx. 2000 caracteres).

#### Scenario: item com menos de três cotações válidas
<!-- test: PesquisaPrecoWorkflowTest.test_validar_completude_bloqueia_sem_minimo_de_cotacoes_por_item() -->
- **WHEN** um item tem 2 cotações válidas
- **THEN** lança `DomainException` "RN-006: o item \"...\" da Pesquisa de Preços precisa de no mínimo 3 cotações válidas antes de solicitar a aprovação final."

#### Scenario: cotação com valor zerado não conta
- **WHEN** um item tem 3 cotações, uma delas com `valor_unitario = 0`
- **THEN** apenas 2 são consideradas válidas e a validação falha

#### Scenario: pesquisa sem itens
- **WHEN** `itens` está vazio
- **THEN** lança `DomainException` "A Pesquisa de Preços precisa de ao menos um item com cotações antes de solicitar a aprovação final."

#### Scenario: mínimo atendido
<!-- test: PesquisaPrecoWorkflowTest.test_validar_completude_passa_com_minimo_de_cotacoes_por_item() -->
- **WHEN** todos os itens têm 3 ou mais cotações com valor positivo
- **THEN** a validação passa sem exceção

---

### Requirement: Solicitação da aprovação final exige o pacote completo de artefatos
<!-- id: AprovacaoFinalService.solicitar -->
<!-- entities: AprovacaoFinal, Processo, Etp, MapaRisco, PesquisaPreco, Tr -->
<!-- depends_on: Pesquisa de Preços exige no mínimo três cotações válidas por item -->
<!-- triggers: Aprovação final sela os quatro artefatos em lote e conclui o processo -->
<!-- enforced: AprovacaoFinalService.solicitar() -->

A solicitação SHALL exigir ETP, Mapa de Riscos, Pesquisa de Preços e TR cadastrados no processo e
SHALL executar a validação de completude da Pesquisa de Preços (RN-006) antes de qualquer
escrita. Autorizada por `ProcessoPolicy.solicitarAprovacaoFinal()` (mesma permissão de editar o
processo), ela roda em transação, grava/atualiza a `AprovacaoFinal` do processo com `status =
pendente`, `solicitado_por` e `solicitado_em`, limpando decisão anterior (`aprovado_por`,
`aprovado_em`, `parecer`, `motivo_rejeicao`), avança o processo para `aprovacao_ordenador`,
audita `aprovacao_final.solicitada` e publica `licita.AprovacaoFinalSolicitada` no Outbox.

#### Scenario: artefato faltando
<!-- test: AprovacaoFinalWorkflowTest.test_nao_permite_solicitar_sem_os_tres_artefatos() -->
- **WHEN** falta qualquer um entre ETP, Mapa de Riscos, Pesquisa de Preços e TR
- **THEN** lança `DomainException` listando os artefatos exigidos e responde HTTP 422

#### Scenario: pesquisa de preços incompleta
<!-- test: AprovacaoFinalWorkflowTest.test_nao_permite_solicitar_com_pesquisa_de_precos_incompleta() -->
- **WHEN** algum item tem menos de 3 cotações válidas
- **THEN** a solicitação é recusada e nenhuma `AprovacaoFinal` é criada

#### Scenario: nova solicitação após rejeição
<!-- test: AprovacaoFinalWorkflowTest.test_permite_resubmeter_apos_rejeicao() -->
- **WHEN** a aprovação anterior está `rejeitada` e o pacote é corrigido
- **THEN** o registro é reaproveitado (`updateOrCreate` por `processo_id`) e volta a `pendente`

---

### Requirement: Aprovação final sela os quatro artefatos em lote e conclui o processo
<!-- id: AprovacaoFinalService.aprovar -->
<!-- entities: AprovacaoFinal, Etp, MapaRisco, PesquisaPreco, Tr, Processo -->
<!-- depends_on: Solicitação da aprovação final exige o pacote completo de artefatos -->
<!-- enforced: AprovacaoFinalService.aprovar() -->

A aprovação SHALL exigir `AprovacaoFinal` existente em `pendente` e SHALL aplicar a RN-005: quem
consta em `solicitado_por` não pode aprovar nem rejeitar. Autorizada por
`ProcessoPolicy.aprovarFinal()` (permissão própria `licita.aprovar_final`, distinta de
`licita.aprovar` usada pelo DFD), roda em uma única transação que SHALL, para ETP, Mapa de Riscos,
Pesquisa de Preços e TR: gravar `status = aprovado`, `aprovado_por` e `aprovado_em` com o mesmo
timestamp, criar nova versão `acao = aprovado`, auditar (`etp.aprovado`, `mapa_riscos.aprovado`,
`pesquisa_precos.aprovado`, `tr.aprovado`) e publicar o evento correspondente no Outbox. Ao final,
marca a aprovação como `aprovada` e avança o processo para `concluido`. Esta é a única aprovação
formal do fluxo pós-DFD — os artefatos individuais não têm aprovação própria (`StatusEtp`,
`StatusMapaRisco`, `StatusPesquisaPreco` e `StatusTr` têm apenas `rascunho` e `aprovado`).

#### Scenario: ordenador aprova a própria solicitação
<!-- test: AprovacaoFinalWorkflowTest.test_ordenador_nao_pode_aprovar_a_propria_solicitacao() -->
- **WHEN** `solicitado_por` é igual ao id do ordenador
- **THEN** lança `DomainException` "RN-005: quem solicitou a aprovação final não pode aprová-la (segregação de funções)."

#### Scenario: aprovação em lote
<!-- test: AprovacaoFinalWorkflowTest.test_aprovar_trava_os_quatro_artefatos_de_uma_vez_e_conclui_o_processo() -->
- **WHEN** um ordenador distinto do solicitante aprova
- **THEN** os quatro artefatos ficam `aprovado` com o mesmo `aprovado_em` e o processo fica `concluido`

#### Scenario: não há aprovação pendente
- **WHEN** o processo não tem `AprovacaoFinal` ou ela não está `pendente`
- **THEN** lança `DomainException` "Não há aprovação final pendente para este processo."

---

### Requirement: Rejeição da aprovação final devolve o processo à elaboração sem travar documentos
<!-- id: AprovacaoFinalService.rejeitar -->
<!-- entities: AprovacaoFinal, Processo -->
<!-- enforced: AprovacaoFinalService.rejeitar() -->

A rejeição SHALL exigir `motivo` (obrigatório, máx. 1000 caracteres), aprovação em `pendente` e a
mesma segregação de funções da aprovação. Ela grava `status = rejeitada`, `aprovado_por`,
`aprovado_em` e `motivo_rejeicao`, devolve o processo a `em_elaboracao`, audita
`aprovacao_final.rejeitada` e publica `licita.AprovacaoFinalRejeitada`. Nenhum artefato é marcado
como aprovado — todos permanecem editáveis.

#### Scenario: rejeição mantém documentos editáveis
<!-- test: AprovacaoFinalWorkflowTest.test_rejeitar_devolve_para_em_elaboracao_sem_travar_documentos() -->
- **WHEN** o ordenador rejeita o pacote com motivo
- **THEN** o processo volta a `em_elaboracao` e ETP/Mapa/Pesquisa/TR continuam em `rascunho`

#### Scenario: rejeição sem motivo
- **WHEN** a requisição não informa `motivo`
- **THEN** a validação do controller falha com HTTP 422

---

### Requirement: Campos extras de cada tipo de documento são parametrizados por tenant
<!-- id: CampoConfiguracaoService.salvar -->
<!-- entities: CampoConfiguracao, Dfd, Etp, MapaRisco, PesquisaPreco, Tr -->
<!-- enforced: CampoConfiguracaoService.salvar() -->

Cada tenant SHALL ter no máximo uma configuração ativa por tipo de documento (unicidade
`tenant_id, tipo_documento`), refletindo exigências locais além da Lei 14.133/2021. Os tipos
aceitos SHALL ser os valores de `FaseLicita` mais `dfd_item_material` e `dfd_item_servico`. Cada
campo exige `key` única e não vazia, `label` não vazio e `tipo` em `texto`, `texto_longo`,
`numero`, `data`, `booleano`, `selecao`; `obrigatorio` e `ordem` são obrigatórios na requisição.
Gerenciar a configuração exige a permissão `licita.campos.manage`; apenas visualizá-la exige
`licita.view`. Salvar SHALL auditar `campo_configuracao.salvo`.

#### Scenario: chave de campo duplicada
- **WHEN** `salvar()` recebe dois campos com a mesma `key`
- **THEN** lança `DomainException` "Chave de campo duplicada: {key}." e responde HTTP 422

#### Scenario: tipo de documento inválido
- **WHEN** a rota recebe `tipoDocumento` fora da lista aceita
- **THEN** responde HTTP 422 "Tipo de documento inválido." antes de tocar no banco

#### Scenario: campo obrigatório não preenchido no artefato
- **WHEN** `validarRespostas()` encontra campo `obrigatorio = true` com valor nulo ou string vazia
- **THEN** lança `ValidationException` no formato `errors: {"campos_extras.{key}": ["O campo \"{label}\" é obrigatório."]}`

#### Scenario: tenant sem configuração cadastrada
- **WHEN** não existe configuração ativa para o tipo
- **THEN** `validarRespostas()` retorna sem erro e `show()` responde com `campos: []`

---

### Requirement: Nível e classificação de risco são sempre calculados, nunca persistidos
<!-- id: ClassificacaoRisco.classificacao -->
<!-- entities: MapaRisco, ClassificacaoRisco -->
<!-- enforced: ClassificacaoRisco.classificacao() -->

Cada risco SHALL informar `descricao`, `fase` (`planejamento`, `selecao_fornecedor`,
`gestao_contratual`), `alocacao` (`contratante`, `contratada`, `compartilhado`) e
`probabilidade`/`impacto` inteiros entre 1 e 5; o Mapa de Riscos SHALL ter ao menos 1 risco. O
nível SHALL ser `probabilidade × impacto` e a classificação derivada das faixas da matriz 5x5:
`<= 4` aceitável, `5..14` moderado, `>= 15` intolerável. Nível e classificação NÃO são colunas —
são sempre recalculados a partir dos valores editados (espelhados no front em
`classificacaoRisco.ts`).

#### Scenario: faixas da matriz de referência
<!-- test: MapaRiscoWorkflowTest.test_classificacao_de_risco_segue_a_matriz_de_referencia() -->
- **WHEN** `classificacao(probabilidade, impacto)` é chamada
- **THEN** nível 4 retorna `aceitavel`, nível 14 retorna `moderado` e nível 15 retorna `intoleravel`

#### Scenario: probabilidade ou impacto fora da faixa
- **WHEN** o payload traz `probabilidade` ou `impacto` fora de 1..5
- **THEN** a validação do controller falha com HTTP 422 (`between:1,5`)

#### Scenario: matriz de riscos vazia
- **WHEN** `riscos` é um array vazio
- **THEN** a validação falha (`min:1`)

---

### Requirement: Amostra de cotações é saneada por Coeficiente de Variação
<!-- id: SaneamentoEstatisticoService.sanear -->
<!-- entities: PesquisaPreco -->
<!-- triggers: Sugestão de cotações parte de preços reais do Compras.gov.br -->
<!-- enforced: SaneamentoEstatisticoService.sanear() -->

O saneamento SHALL descartar valores não positivos e então remover iterativamente o valor mais
distante da mediana enquanto o CV% da amostra estiver acima de 25% (metodologia referenciada em
acórdãos do TCU), NUNCA reduzindo a amostra a 3 valores ou menos — o mínimo da RN-006 prevalece
sobre o limiar de dispersão. O retorno SHALL conter `valores_saneados`, `outliers_removidos`,
`media`, `mediana`, `desvio_padrao` (amostral, divisor `n − 1`) e `cv_percentual`.

#### Scenario: amostra homogênea
<!-- test: SaneamentoEstatisticoServiceTest.test_amostra_homogenea_nao_remove_nenhum_valor() -->
- **WHEN** o CV% já está abaixo de 25%
- **THEN** nenhum valor é removido e `outliers_removidos` fica vazio

#### Scenario: outlier evidente
<!-- test: SaneamentoEstatisticoServiceTest.test_remove_outlier_claro_ate_cv_ficar_abaixo_do_limiar() -->
- **WHEN** a amostra contém um valor muito distante da mediana
- **THEN** ele é removido e o CV% final fica abaixo de 25%

#### Scenario: amostra no piso do mínimo
<!-- test: SaneamentoEstatisticoServiceTest.test_nao_remove_abaixo_do_minimo_de_valores_restantes() -->
- **WHEN** restam exatamente 3 valores e o CV% ainda está acima de 25%
- **THEN** a amostra é devolvida intacta

#### Scenario: amostra vazia
<!-- test: SaneamentoEstatisticoServiceTest.test_amostra_vazia_nao_gera_erro() -->
- **WHEN** a lista de valores é vazia
- **THEN** média, mediana, desvio padrão e CV% retornam `0.0` sem erro

---

### Requirement: Sugestão de cotações parte de preços reais do Compras.gov.br
<!-- id: PesquisaPrecoIaService.sugerirCotacoes -->
<!-- entities: PesquisaPreco, ComprasGovPrecoService -->
<!-- depends_on: Amostra de cotações é saneada por Coeficiente de Variação -->
<!-- enforced: PesquisaPrecoIaService.sugerirCotacoes() -->

Para cada item com `tipo` em `material|servico` e `codigo` não vazio, o serviço SHALL consultar o
módulo público de Pesquisa de Preço do Compras.gov.br (materiais via
`1_consultarMaterial?tipo=codigoItemCatalogo&codigo=...`, serviços via
`3_consultarServico?codigoItemCatalogo=...`), sanear os valores retornados, priorizar recência e
diversidade de fornecedor e sugerir no máximo 8 cotações por item, acompanhadas de estatísticas
(`total_encontrado`, `cv_percentual_final`, `outliers_removidos`). A consulta externa SHALL ser
tolerante a falha: erro HTTP, exceção de rede, código vazio ou tipo inválido retornam lista vazia
e o resultado é cacheado por 12 horas por `tipo`+`codigo` (cache deliberadamente compartilhado
entre tenants, por se tratar de dado público). A justificativa do método SHALL ser escrita por IA
e, em caso de `AiException`, SHALL cair para um texto de template determinístico — a
indisponibilidade do provedor de IA não pode derrubar a coleta de preços reais. Sugestões nunca
são persistidas automaticamente: o usuário precisa salvar a Pesquisa de Preços.

#### Scenario: cotações reais e estatísticas
<!-- test: PesquisaPrecoIaTest.test_sugere_cotacoes_reais_e_estatisticas_a_partir_do_compras_gov() -->
- **WHEN** o Compras.gov.br retorna registros com `precoUnitario` positivo
- **THEN** o resultado traz `cotacoes_sugeridas` com fonte, fornecedor, valor, data e referência, mais as estatísticas do saneamento

#### Scenario: item sem resultado
<!-- test: PesquisaPrecoIaTest.test_item_sem_resultado_no_compras_gov_e_ignorado_sem_quebrar() -->
- **WHEN** a consulta não retorna nada para o código do item
- **THEN** o item é omitido do resultado sem erro

#### Scenario: provedor de IA indisponível
<!-- test: PesquisaPrecoIaTest.test_falha_da_ia_nao_derruba_a_sugestao_de_cotacoes_reais() -->
- **WHEN** `NanoGptClient.chatCompletion()` lança `AiException`
- **THEN** as cotações são devolvidas normalmente com `justificativa_metodo_sugerida` gerada por template citando a IN SEGES/ME nº 65/2021

#### Scenario: erro HTTP ou de rede na API pública
<!-- test: ComprasGovPrecoServiceTest.test_resposta_de_erro_http_retorna_lista_vazia() -->
- **WHEN** a API pública responde com erro ou a conexão falha
- **THEN** `buscarPrecos()` registra `Log::warning` e retorna lista vazia, sem propagar exceção

#### Scenario: processo sem Pesquisa de Preços
- **WHEN** a rota de sugestão é chamada num processo sem Pesquisa de Preços
- **THEN** responde HTTP 422 "Cadastre a Pesquisa de Preços deste processo antes de buscar cotações."

---

### Requirement: Sugestões de texto por IA são fundamentadas na legislação cadastrada
<!-- id: LegislacaoContextoService.buscarRelevante -->
<!-- entities: LegalDocumento, Dfd, MapaRisco -->
<!-- enforced: LegislacaoContextoService.buscarRelevante() -->

Toda sugestão de texto do módulo SHALL selecionar, entre os `LegalDocumento` ativos visíveis ao
tenant (globais + próprios), no máximo 5 documentos relevantes por sobreposição de palavras
(mínimo 4 caracteres) contra título, ementa e tags, descartando os de pontuação zero. Sem
palavras-chave úteis ou sem nenhum documento com pontuação, SHALL cair para os 5 mais recentes —
nunca deixa a IA sem base legal. A resposta de justificativa SHALL ser convertida em HTML por
`TextoParaHtml` (um `<p>` por parágrafo, com escape de caracteres HTML) e a lista de documentos
usados é devolvida em `legislacao_utilizada`. As rotas de IA exigem as mesmas permissões do fluxo
que apoiam (`licita.create`/`licita.update` para o DFD; `licita.view` para o texto genérico). Ao
contrário da Pesquisa de Preços, uma `AiException` nas sugestões de texto SHALL ser propagada ao
controller e devolvida como HTTP 422.

#### Scenario: legislação relevante entra no contexto
<!-- test: DfdIaTest.test_sugestao_de_justificativa_inclui_a_legislacao_relevante_cadastrada_como_contexto() -->
- **WHEN** existem documentos legais cadastrados que batem com o objeto informado
- **THEN** o prompt inclui trechos desses documentos e `legislacao_utilizada` lista id, tipo, número e título

#### Scenario: nenhum documento cadastrado
<!-- test: DfdIaTest.test_sem_documentos_legais_cadastrados_ainda_assim_gera_a_sugestao() -->
- **WHEN** o acervo está vazio
- **THEN** a sugestão ainda é gerada, sem contexto legal

#### Scenario: texto já escrito
<!-- test: DfdIaTest.test_com_texto_atual_pede_para_melhorar_em_vez_de_reescrever_do_zero() -->
- **WHEN** `texto_atual` vem preenchido
- **THEN** o prompt pede para melhorar/aprofundar o texto existente em vez de escrever do zero

#### Scenario: falha do provedor de IA
<!-- test: DfdIaTest.test_erro_do_provedor_de_ia_propaga_a_excecao_para_o_controller_tratar() -->
- **WHEN** o provedor lança `AiException`
- **THEN** a exceção sobe até o controller, que responde HTTP 422 com a mensagem do erro

#### Scenario: resposta de itens envolta em markdown
<!-- test: DfdIaTest.test_sugestao_de_itens_processa_resposta_envolta_em_markdown() -->
- **WHEN** o modelo devolve o JSON dentro de uma cerca de markdown
- **THEN** os itens são extraídos e normalizados; se nenhum item válido restar, lança `AiException`

---

### Requirement: Biblioteca de legislação separa documentos globais da SYSTRAT dos do órgão
<!-- id: LegalDocumentoService.criar -->
<!-- entities: LegalDocumento -->
<!-- enforced: LegalDocumentoService.criar() -->

Um `LegalDocumento` com `tenant_id = null` é GLOBAL (mantido pela SYSTRAT, visível a todos os
tenants); com `tenant_id` preenchido é local do órgão. Criar documento global SHALL exigir
`is_platform_admin` (`DomainException` caso contrário); editar ou excluir um global SHALL exigir
`is_platform_admin`, enquanto o local exige `licita.legislacao.manage` **e** correspondência de
`tenant_id` com o `TenantContext`. O `texto_completo` SHALL ser sanitizado antes de persistir e o
`tipo` SHALL ser `lei`, `decreto`, `instrucao_normativa`, `jurisprudencia` ou `outro`. A listagem
retorna apenas `ativo = true`, com os globais primeiro. Criação, atualização e exclusão são
auditadas (`legal_documento.criado|atualizado|excluido`); a criação publica
`licita.LegalDocumentoCriado` no Outbox.

#### Scenario: usuário do órgão tenta criar documento global
- **WHEN** um usuário sem `is_platform_admin` envia `global = true`
- **THEN** lança `DomainException` "Apenas administradores da plataforma podem cadastrar documentos legais globais." e responde HTTP 422

#### Scenario: usuário do órgão tenta editar documento global
- **WHEN** `LegalDocumentoPolicy.update()` avalia documento com `tenant_id = null` e usuário sem `is_platform_admin`
- **THEN** a autorização é negada, mesmo com `licita.legislacao.manage`

#### Scenario: visibilidade combinada
- **WHEN** um usuário autenticado lista a legislação
- **THEN** vê os documentos globais e os do próprio tenant, e nenhum documento de outro tenant

---

### Invariant: Todo modelo de negócio do Licita é isolado por tenant
<!-- entities: Processo, Dfd, Etp, MapaRisco, PesquisaPreco, Tr, AprovacaoFinal, CampoConfiguracao -->
<!-- enforced: App\Models\Concerns\TenantAware -->
<!-- verified_by: TenantIsolationTest.test_processos_are_strictly_isolated_between_tenants() -->

Todas as tabelas de negócio (`licita_processos`, `licita_dfds`, `licita_etps`,
`licita_mapas_riscos`, `licita_pesquisas_precos`, `licita_trs`, `licita_aprovacoes_finais`,
`licita_campo_configuracoes`) SHALL ter `tenant_id` com FK para `tenants` e índices compostos
iniciados por tenant, e os modelos correspondentes SHALL usar o trait `TenantAware` (global scope
em leitura + preenchimento automático na criação). O `tenant_id` é resolvido server-side pelo
`TenantContext` (middleware `tenant`/`ResolveTenant`) e nunca aceito do cliente. Criar registro
sem contexto de tenant SHALL falhar com `LogicException`. Única exceção documentada:
`LegalDocumento` não usa `TenantAware` porque `tenant_id = null` representa documento global —
o escopo é implementado manualmente no `booted()` como "globais + do tenant atual".

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: A numeração de processo é única dentro do tenant e do ano
<!-- entities: Processo -->
<!-- enforced: create_licita_processos_table -->
<!-- verified_by: ProcessoNumeracaoTest.test_numeracao_e_isolada_por_tenant() -->

A constraint `unique(tenant_id, numero, ano)` SHALL garantir que dois processos do mesmo tenant
jamais compartilhem número no mesmo ano, e que tenants diferentes possam usar a mesma numeração
sem colisão. A constraint é a autoridade final — o cálculo do próximo número no serviço é apenas
otimista e retenta em caso de duplicidade.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda autorização é server-side e escopada ao objeto
<!-- entities: Processo, Dfd, Etp, MapaRisco, PesquisaPreco, Tr, CampoConfiguracao, LegalDocumento -->
<!-- enforced: LicitaServiceProvider.boot() -->

Todas as rotas do módulo passam por `auth:sanctum`, `tenant`, `bindings` e
`module-access:licita`, e toda ação de controller SHALL chamar `authorize()` contra a Policy
registrada em `LicitaServiceProvider.boot()`. As Policies não verificam apenas a permissão: em
toda operação sobre instância SHALL comparar `$model->tenant_id` com
`app(TenantContext::class)->id()`, prevenindo Broken Object Level Authorization mesmo que o id
venha de outro tenant. `is_platform_admin` é o único bypass de permissão — nunca de tenant, salvo
para documentos legais globais. As permissões usadas são `licita.view`, `licita.create`,
`licita.update`, `licita.aprovar`, `licita.aprovar_final`, `licita.legislacao.manage` e
`licita.campos.manage`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Documento aprovado é imutável
<!-- entities: Dfd, Etp, MapaRisco, PesquisaPreco, Tr -->
<!-- enforced: DfdService.atualizar() -->
<!-- verified_by: AprovacaoFinalWorkflowTest.test_etp_fica_imutavel_depois_da_aprovacao_final() -->

Nenhum artefato em `status = aprovado` SHALL aceitar alteração de conteúdo: `atualizar()` de DFD,
ETP, Mapa de Riscos, Pesquisa de Preços e TR lança `DomainException` antes de qualquer escrita, e
o controller responde HTTP 422. No DFD a trava é reforçada pela máquina de estados
(`StatusDfd::Aprovado` não transiciona para nada); nos demais, `aprovado` só é atingido pela
`AprovacaoFinalService` e é terminal.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda mutação de artefato gera uma versão append-only
<!-- entities: DfdVersao, EtpVersao, MapaRiscoVersao, PesquisaPrecoVersao, TrVersao -->
<!-- enforced: DfdService.registrarVersao() -->
<!-- verified_by: DfdWorkflowTest.test_versionamento_incrementa_a_cada_transicao() -->

Criação, revisão com diferença efetiva, mudança de status e aprovação SHALL gravar uma linha na
tabela de versões do artefato com `versao = max(versao) + 1`, `acao`, `campos_alterados` (o diff
`{de, para}` restrito à lista `CAMPOS_DIFF` do serviço), snapshot completo em `dados`, `user_id` e
`created_at`. A unicidade `(documento_id, versao)` impede buracos ou sobrescrita e as tabelas de
versão não têm `updated_at` — a trilha é somente-adição. Revisão sem diferença efetiva não gera
versão, auditoria nem evento.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda mutação do Licita é auditada
<!-- entities: Processo, Dfd, Etp, MapaRisco, PesquisaPreco, Tr, AprovacaoFinal, CampoConfiguracao, LegalDocumento -->
<!-- enforced: App\Support\AuditLogger.record() -->

Criação, revisão, transição de status, aprovação, rejeição e exclusão SHALL gravar registro em
`audit_logs` com módulo `licita`, ação nomeada (`processo.criado`, `processo.fase_avancada`,
`dfd.criado|revisado|reaberto|enviado_revisao|aprovado|rejeitado|equipe_alterada_pelo_aprovador`,
`etp.criado|revisado|aprovado`, `mapa_riscos.*`, `pesquisa_precos.*`, `tr.*`,
`aprovacao_final.solicitada|aprovada|rejeitada`, `campo_configuracao.salvo`,
`legal_documento.criado|atualizado|excluido`), recurso identificado, estado anterior/posterior,
usuário, IP e timestamp.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Eventos de domínio do Licita saem por Outbox, nunca por chamada síncrona
<!-- entities: Processo, Dfd, Etp, MapaRisco, PesquisaPreco, Tr, AprovacaoFinal, LegalDocumento -->
<!-- enforced: App\Support\OutboxPublisher.publish() -->

Nenhum controller ou serviço de escrita do Licita SHALL notificar sistemas externos de forma
síncrona. Todo efeito externo de mutação é publicado em `outbox_events` dentro da mesma transação
da escrita — `licita.ProcessoCriado`, `licita.ProcessoFaseAvancada`, `licita.DfdCriado|Revisado|
Reaberto|EnviadoRevisao|Aprovado|Rejeitado|EquipePlanejamentoAlterada`, `licita.EtpCriado|Revisado|
Aprovado`, `licita.MapaRiscoCriado|Revisado|Aprovado`, `licita.PesquisaPrecoCriado|Revisado|
Aprovado`, `licita.TrCriado|Revisado|Aprovado`, `licita.AprovacaoFinalSolicitada|Aprovada|
Rejeitada`, `licita.LegalDocumentoCriado`. As consultas externas somente-leitura de apoio
(Compras.gov.br, provedor de IA) são a exceção deliberada: não alteram estado de negócio, são
tolerantes a falha e nunca ocorrem dentro de uma transação de escrita.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Todo HTML de usuário é sanitizado por allowlist antes de persistir
<!-- entities: Dfd, Etp, MapaRisco, Tr, LegalDocumento, CampoConfiguracao -->
<!-- enforced: HtmlSanitizer.sanitize() -->

Todo campo alimentado pelo editor de texto rico — `Dfd.justificativa`, `Etp.conteudo`, os campos
`causa`, `dano`, `acao_preventiva` e `acao_contingencia` de cada risco, as nove seções de texto do
TR, `LegalDocumento.texto_completo` e todo `campos_extras` cuja configuração declara
`tipo = texto_longo` (inclusive nos itens do DFD) — SHALL passar por `HtmlSanitizer` antes de ser
gravado. A allowlist permite apenas tags de formatação básica, listas, títulos, tabelas, `code`,
`pre`, `span` e `a` (com `href` restrito a `http://`, `https://`, `/`, `#` ou `mailto:`); tags
fora da lista têm a marcação removida preservando o texto, e nós que não são texto/CDATA são
descartados. A sanitização no frontend (dompurify) é defesa em profundidade, não substituta.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

<!-- uncertainty: O módulo NÃO usa App\Support\Money. Valores monetários (Dfd.itens[].valor_unitario, PesquisaPreco.itens[].cotacoes[].valor_unitario) são persistidos em colunas JSON, validados como `numeric` e manipulados como float em PHP (ComprasGovPrecoService casta `(float) $registro['precoUnitario']`; PesquisaPrecoService.validarCompletude compara `(float) $c['valor_unitario'] > 0`; SaneamentoEstatisticoService faz toda a aritmética de média/mediana/desvio em float). Isso contraria a invariante do repositório "valores monetários sempre em centavos inteiros, nunca float". Não foi possível determinar pelo código se é dívida técnica consciente ou drift — não há comentário justificando. Flagado, não corrigido. -->
<!-- uncertainty: Não há integração com PNCP, Siconfi ou TCE neste módulo — a única menção a PNCP é um comentário em ComprasGovPrecoService explicando por que a consulta usa o Compras.gov.br em vez de varrer o PNCP. A chamada externa real (Http::get para dadosabertos.compras.gov.br) é síncrona, a partir de PesquisaPrecoIaService, acionada por PesquisaPrecoIaController — fora do padrão Outbox. É consulta somente-leitura, cacheada e com falha silenciosa, mas ainda é uma chamada externa originada de um fluxo de request. Mesma observação para NanoGptClient nos serviços de IA. -->
<!-- uncertainty: As permissões licita.view, licita.create e licita.update são exigidas pelas Policies e pelo menu, mas NÃO estão declaradas no bloco "permissions" de Modules/Licita/module.json (que só declara licita.aprovar, licita.aprovar_final, licita.legislacao.manage e licita.campos.manage). Não foi possível confirmar no código se elas são registradas em outro ponto (seeder global, Admin) ou se é uma omissão. -->
<!-- uncertainty: As tabelas de versão (licita_dfd_versoes, licita_etp_versoes, licita_mapa_risco_versoes, licita_pesquisa_preco_versoes, licita_tr_versoes) não têm coluna tenant_id e os models correspondentes não usam TenantAware — o isolamento é indireto, pela FK com cascade para o documento pai (que é TenantAware). Não há teste de isolamento cobrindo acesso direto a uma versão por id. -->
<!-- uncertainty: TenantIsolationTest cobre apenas Processo. Dfd, Etp, MapaRisco, PesquisaPreco, Tr, AprovacaoFinal e CampoConfiguracao usam TenantAware mas não têm teste de isolamento tenant A vs tenant B próprio. -->
<!-- uncertainty: FaseLicita declara 9 casos, mas o comentário do próprio enum afirma que Processo.fase_atual só transita entre 4 deles (dfd, em_elaboracao, aprovacao_ordenador, concluido). Não há validação em código impedindo ProcessoService.avancarFase() de gravar etp/mapa_riscos/pesquisa_precos/tr/edital em fase_atual, nem a rota de filtro do index restringe os valores aceitos. -->
<!-- deferred: Services/{MapaRiscoIaService,LicitaTextoIaService}.php, Http/Controllers/{MapaRiscoIaController,LicitaIaController,EtpController,TrController}.php (detalhes de prompt e normalização), Support/TextoParaHtml.php, Database/Migrations/2026_09_16_100100_normaliza_fases_e_status_pos_dfd.php, apps/web-client/src/modules/licita/* (toda a camada de UI do módulo não foi minerada) -->
