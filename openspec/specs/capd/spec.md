# Spec: capd

> Auto-extracted by spec-miner. Last mined: 2026-09-19.
> Source: apps/api/Modules/Capd (Services/{PerguntaService,CicloService,CalculadoraNotaService,NotaCalculoService,TravaElectronicaService,HomologacaoLoteService,HierarquiaService,ConsolidacaoTrienalService,PmdService}, Models/{Avaliacao,CicloAvaliacao,Pergunta,DiarioBordo,ModeloFormulario}, Http/Controllers/{AvaliacaoController,PerguntaController,DiarioBordoController,ModeloFatorPesoController}, Policies/{AvaliacaoPolicy,DiarioBordoPolicy}, Database/Seeders/CapdPerguntasPadraoSeeder, Tests/), apps/web-client/src/modules/capd
> Last verified: 2026-09-19 (commit 2bd3aae)

## Purpose

SAPDS/CAPD — avaliação periódica de desempenho de servidores públicos em estágio probatório, por Escala Gráfica (Chiavenato, graus 1–5) combinada com Técnica do Incidente Crítico (Diário de Bordo digital). Cobre parametrização dinâmica de formulários e pesos, resolução hierárquica do avaliador, cadência anual de ciclos em triênio, consolidação NFC, homologação em lote imutável e isolamento multi-tenant.

---

## Requirements

### Requirement: Instrumento de avaliação usa exclusivamente Escala Gráfica de Chiavenato (graus 1 a 5)
<!-- id: Pergunta.TIPO_ESCALA_GRAFICA -->
<!-- entities: Pergunta, ModeloFormulario, EscalaGrafica -->
<!-- enforced: PerguntaService.validarSchemaPergunta() -->

O item avaliativo aferido quantitativamente SHALL ser do tipo `escala_grafica`, com exatamente
5 graus (1 a 5) de descrições sumárias e objetivas. Nenhum outro vocabulário metodológico
(âncoras comportamentais / BARS) é aceito ou modelado: não existe campo, tipo ou constante no
módulo que represente âncora comportamental. A conversão grau → nota SHALL ser
`Nf = (grau − 1) × 2,5`, produzindo escala 0–10, calculada com bcmath (nunca float).

#### Scenario: pergunta de escala gráfica com número de graus diferente de 5
<!-- test: CadastroPerguntasTest.test_validacao_de_schema_e_criacao_de_modelo_com_escala_grafica() -->
- **WHEN** `salvarPergunta()` recebe `tipo = escala_grafica` e `opcoes` com contagem ≠ 5
- **THEN** lança `DomainException` "A escala gráfica deve conter exatamente 5 graus (grau 1 a grau 5)" e o controller responde HTTP 422

#### Scenario: tipo de pergunta fora da lista canônica
- **WHEN** `salvarPergunta()` recebe `tipo` fora de `Pergunta::TIPOS_VALIDOS`
- **THEN** lança `DomainException` "Tipo de pergunta inválido" e nada é persistido

#### Scenario: grau informado fora da faixa 1–5
- **WHEN** `validarRespostas()` recebe valor `< 1` ou `> 5` para uma pergunta de escala gráfica
- **THEN** acumula erro "O grau atribuído deve estar entre 1 e 5" e lança `ValidationException`

#### Scenario: conversão do grau em nota
<!-- test: CalculadoraNotaTest -->
- **WHEN** um fator recebe grau 5
- **THEN** a nota do fator é `10.0000000000` (`(5 − 1) × 2,5`); grau 1 produz `0`, grau 3 produz `5`

---

### Requirement: Trava Antileniência exige Incidente Crítico registrado para graus extremos
<!-- id: CalculadoraNotaService.calcular -->
<!-- entities: Avaliacao, DiarioBordo, Evidencia, FatorAvaliacao, ModeloFatorPeso -->
<!-- triggers: Submissão da avaliação calcula e sela a NFD -->
<!-- enforced: CalculadoraNotaService.calcular() -->

A atribuição de grau extremo (1, 2 ou 5) a um fator qualitativo não automatizado SHALL exigir
ao menos 1 (um) Incidente Crítico registrado no Diário de Bordo do servidor, no mesmo ciclo,
vinculado ao mesmo fator, com evidência documental de `hash_sha256` não nulo. A validação é
bloqueante no backend; o gate visual do frontend é UX e não substitui o backend. Fatores com
`automatizado = true` (F1/F2, de ingestão automática) não acionam a trava.

#### Scenario: grau 1 sem incidente crítico no fator
<!-- test: TravaElectronicaTest.test_tc01_bloqueia_grau_1_sem_cit() -->
- **WHEN** `calcular()` processa grau 1 em fator não automatizado sem CIT com evidência no ciclo
- **THEN** `TravaElectronicaService.validar()` lança `TravaIncidenteCriticoException` e `AvaliacaoController.submeter()` responde HTTP 422 com `error = trava_cit` e o código do fator

#### Scenario: grau 2 sem incidente crítico
<!-- test: TravaElectronicaTest.test_tc01_bloqueia_grau_2_sem_cit() -->
- **WHEN** `calcular()` processa grau 2 em fator não automatizado sem CIT com evidência
- **THEN** lança `TravaIncidenteCriticoException` e a nota não é persistida

#### Scenario: grau 5 sem incidente crítico
<!-- test: TravaElectronicaTest.test_tc02_bloqueia_grau_5_sem_cit() -->
- **WHEN** `calcular()` processa grau 5 em fator não automatizado sem CIT com evidência
- **THEN** lança `TravaIncidenteCriticoException` e a submissão é rejeitada

#### Scenario: graus intermediários não acionam a trava
<!-- test: TravaElectronicaTest.test_tc04_graus_3_e_4_nao_acionam_trava() -->
- **WHEN** `calcular()` processa graus 3 ou 4
- **THEN** nenhuma consulta de trava é feita e o cálculo prossegue

#### Scenario: fator automatizado com grau extremo
<!-- test: TravaElectronicaTest.test_fatores_automatizados_ignoram_trava() -->
- **WHEN** o fator tem `automatizado = true` e recebe grau 1, 2 ou 5
- **THEN** a trava é ignorada e o cálculo prossegue

#### Scenario: grau 5 com incidente crítico válido
<!-- test: TravaElectronicaTest.test_grau_5_com_cit_valido_prossegue_sucesso() -->
- **WHEN** existe `DiarioBordo` do servidor, no ciclo, no fator, com ao menos uma `Evidencia` de `hash_sha256` não nulo
- **THEN** a trava passa e a NFD é calculada normalmente

---

### Requirement: Trava Antileniência também validada na camada de perguntas parametrizadas
<!-- id: PerguntaService.validarRespostas -->
<!-- entities: Pergunta, DiarioBordo, ModeloFormulario -->
<!-- enforced: PerguntaService.validarRespostas() -->

Ao validar respostas contra um modelo de formulário dinâmico, o sistema SHALL rejeitar grau 1,
2 ou 5 — ou qualquer pergunta marcada `exige_evidencia` — quando não houver registro no Diário
de Bordo do servidor no ciclo, com mensagem "Trava Antileniência".

#### Scenario: grau extremo sem registro no Diário de Bordo
<!-- test: CadastroPerguntasTest.test_trava_antileniencia_em_graus_extremos() -->
- **WHEN** `validarRespostas()` recebe grau 1, 2 ou 5 e não existe `DiarioBordo` para (servidor, ciclo)
- **THEN** lança `ValidationException` com a chave `respostas.{codigo}` citando "Trava Antileniência ... Incidente Crítico (CIT) registrado no Diário de Bordo digital"

#### Scenario: pergunta com exige_evidencia em grau não extremo
- **WHEN** a pergunta tem `exige_evidencia = true` e recebe grau 3 ou 4 sem CIT no ciclo
- **THEN** a mesma trava é aplicada e a validação falha

---

### Requirement: Registro de Incidente Crítico no Diário de Bordo com evidência hasheada
<!-- id: DiarioBordoController.store -->
<!-- entities: DiarioBordo, Evidencia, FatorAvaliacao, CicloAvaliacao -->
<!-- triggers: Trava Antileniência exige Incidente Crítico registrado para graus extremos -->
<!-- enforced: DiarioBordoController.store() -->

O registro de incidente crítico SHALL exigir ciclo, servidor, fator, tipo (`positivo` |
`negativo`), data de ocorrência não futura e descrição do fato com no mínimo 30 caracteres.
O anexo de evidência SHALL aceitar apenas PDF/PNG/JPG de até 10 MB e SHALL calcular e gravar
o `hash_sha256` do conteúdo, rejeitando re-upload de arquivo com hash idêntico no mesmo
incidente.

#### Scenario: incidente com descrição curta
- **WHEN** `store()` recebe `descricao_fato` com menos de 30 caracteres
- **THEN** a validação falha com HTTP 422 e nada é persistido

#### Scenario: data de ocorrência no futuro
- **WHEN** `store()` recebe `data_ocorrencia` posterior a hoje
- **THEN** a validação falha (`before_or_equal:today`)

#### Scenario: upload de evidência válida
- **WHEN** `uploadEvidencia()` recebe PDF/PNG/JPG ≤ 10 MB
- **THEN** grava a `Evidencia` com `hash_sha256` do conteúdo, registra auditoria `evidencia.uploaded` e responde HTTP 201

#### Scenario: re-upload do mesmo arquivo
- **WHEN** já existe `Evidencia` do mesmo incidente com o mesmo `hash_sha256`
- **THEN** responde HTTP 422 "Este arquivo já foi anexado a este incidente (hash idêntico)"

#### Scenario: avaliador tenta registrar CIT sobre si mesmo
- **WHEN** `DiarioBordoPolicy.create()` é avaliada com `user->id === servidorId`
- **THEN** a autorização é negada, inclusive para papéis privilegiados

---

### Requirement: Formulários e fatores são parametrizados dinamicamente por modelo
<!-- id: PerguntaService.salvarModelo -->
<!-- entities: ModeloFormulario, Pergunta, PlanoCarreira, ModeloFatorPeso -->
<!-- enforced: PerguntaService.salvarModelo() -->

Perguntas e grupos de fatores SHALL ser configuráveis em `capd_modelos_formulario` /
`capd_perguntas`, sem hard-code de itens no código de avaliação. Cada modelo é versionado por
`codigo`: salvar um novo modelo com código existente SHALL incrementar `versao`. O modelo
vigente é determinado por `vigencia_inicio <= hoje` e (`vigencia_fim` nula ou `>= hoje`), com
desempate por plano de carreira, cargo e maior versão. Toda mutação é auditada
(`modelo_formulario.salvo`, `pergunta.salva`, `pergunta.excluida`).

#### Scenario: novo modelo com código já existente
- **WHEN** `salvarModelo()` é chamado sem `id` e com `codigo` já usado no tenant
- **THEN** a nova linha recebe `versao = max(versao) + 1` do mesmo código no tenant

#### Scenario: resolução do modelo vigente
- **WHEN** `getModeloVigente()` é chamado na data corrente
- **THEN** retorna o modelo ativo dentro da vigência, ordenado por `plano_carreira_id` DESC, `cargo` DESC, `versao` DESC

#### Scenario: pergunta condicional cuja dependência não foi satisfeita
<!-- test: CadastroPerguntasTest.test_validacao_de_regras_condicionais_entre_perguntas() -->
- **WHEN** `regras_condicionais.depende_de` aponta para outra pergunta cuja resposta difere de `valor_esperado`
- **THEN** a pergunta é ignorada na validação, mesmo que marcada obrigatória

#### Scenario: pergunta obrigatória sem resposta
- **WHEN** `validarRespostas()` encontra pergunta `obrigatoria = true` com valor nulo ou vazio
- **THEN** acumula erro "é de preenchimento obrigatório" e lança `ValidationException`

---

### Requirement: Soma dos pesos dos fatores do modelo deve ser exatamente 100%
<!-- id: ModeloFatorPesoController.sincronizar -->
<!-- entities: ModeloFatorPeso, ModeloFormulario, FatorAvaliacao -->
<!-- enforced: ModeloFatorPesoController.sincronizar() -->

A sincronização atômica dos pesos de fatores de um modelo SHALL rejeitar conjuntos cuja soma
difira de 100% além da tolerância de 0,01 (RF-02). Cada peso individual é `numeric`, mínimo
0,01 e máximo 100. O motor de cálculo de Nota do Ciclo aplica a mesma validação antes de
qualquer aritmética.

#### Scenario: pesos somando valor diferente de 100
<!-- test: ModeloFatorPesoTest -->
- **WHEN** `sincronizar()` recebe fatores cuja soma de pesos difere de 100 em mais de 0,01
- **THEN** responde HTTP 422 com "RF-02: A soma dos pesos deve ser exatamente 100%. Soma atual: X%" e nenhum peso é gravado

#### Scenario: cálculo da nota do ciclo com pesos inválidos
- **WHEN** `NotaCalculoService.calcularNotaCiclo()` recebe coleção cuja soma de pesos ≠ 100 ± 0,01
- **THEN** lança `DomainException` antes de calcular qualquer parcela

#### Scenario: pontuação de fator fora da faixa 0–100
- **WHEN** `calcularNotaCiclo()` recebe `Pi < 0` ou `Pi > 100`
- **THEN** lança `DomainException` citando o código do fator

---

### Requirement: Seed padrão cria quatro grupos funcionais com formulários próprios
<!-- id: CapdPerguntasPadraoSeeder.seedTenant -->
<!-- entities: PlanoCarreira, ModeloFormulario, Pergunta, ModeloFatorPeso, FatorAvaliacao -->
<!-- enforced: CapdPerguntasPadraoSeeder.seedTenant() -->

O seed canônico SHALL criar, por tenant, quatro planos de carreira (`SEGURANCA`, `SAUDE`,
`MAGISTERIO`, `GERAL`) e quatro modelos de formulário correspondentes (`FORM_SEGURANCA_V1`,
`FORM_SAUDE_V1`, `FORM_MAGISTERIO_V1`, `FORM_GERAL_V1`), cada um com seus próprios grupos
(`assiduidade`, `disciplina`, `competencias`) somando 100% de peso e com perguntas de escala
gráfica específicas da carreira. Todas as perguntas usam a mesma escala padrão de 5 graus
(Insuficiente, Regular, Bom, Muito Bom, Excelente) e são `obrigatoria = true`. O seed é
idempotente (`updateOrCreate` por tenant + modelo + código) e roda com o `TenantContext`
temporariamente posicionado no tenant alvo, restaurando o contexto anterior ao final.

#### Scenario: seed executado para um tenant
<!-- test: CadastroPerguntasTest.test_seed_padrao_gera_quatro_grupos_funcionais_e_resolve_modelo_dinamico() -->
- **WHEN** `seedTenant()` é executado
- **THEN** existem os 4 planos de carreira, os 4 modelos ativos e suas perguntas (7 para Segurança, 8 para o Quadro Geral), além dos `ModeloFatorPeso` derivados dos fatores do tenant

#### Scenario: seed executado duas vezes
- **WHEN** `seedTenant()` roda novamente no mesmo tenant
- **THEN** nenhum registro é duplicado — perguntas são atualizadas pela chave (tenant, modelo, código)

#### Scenario: seed via endpoint administrativo
<!-- test: CadastroPerguntasTest.test_endpoint_seed_padrao_gera_modelo_e_perguntas() -->
- **WHEN** `PerguntaController.seedPadrao()` é chamado com contexto de tenant
- **THEN** o seed roda apenas para esse tenant e responde com a mensagem de sucesso

#### Scenario: fator marcado como redistribuível no seed
- **WHEN** o fator de código `F8` é semeado como `ModeloFatorPeso`
- **THEN** recebe `redistribuivel = true`, habilitando a redistribuição para servidores sem atendimento ao público

---

### Requirement: Grupo funcional e modelo são resolvidos automaticamente para o servidor
<!-- id: PerguntaService.identificarGrupoFuncional -->
<!-- entities: Servidor, PlanoCarreira, ModeloFormulario, OrgUnit -->
<!-- triggers: Submissão da avaliação calcula e sela a NFD -->
<!-- enforced: PerguntaService.identificarGrupoFuncional() -->

O grupo funcional SHALL ser determinado primeiro pelo código do plano de carreira do servidor
e, na sua ausência, por correspondência textual (cargo efetivo, órgão de lotação, lotação
física, nome e código da unidade organizacional). A ordem de precedência textual é Segurança →
Saúde → Magistério, com fallback para `geral`. `resolverModeloParaServidor()` SHALL usar o
código de modelo do grupo, depois o plano de carreira do servidor e, por último, o modelo
vigente genérico.

#### Scenario: servidor com plano de carreira SEGURANCA
- **WHEN** `identificarGrupoFuncional()` recebe servidor cujo `planoCarreira->codigo` é `SEGURANCA`
- **THEN** retorna a chave `seguranca` e `codigo_modelo = FORM_SEGURANCA_V1`, sem consultar cargo ou lotação

#### Scenario: servidor sem plano de carreira, cargo de professor
- **WHEN** o cargo/lotação casam com o padrão de magistério (professor, pedagogo, SMED, escola, CMEI...)
- **THEN** retorna a chave `magisterio` e `FORM_MAGISTERIO_V1`

#### Scenario: cargo administrativo sem correspondência
- **WHEN** nenhum padrão de segurança, saúde ou magistério casa
- **THEN** retorna a chave `geral` e `FORM_GERAL_V1`

#### Scenario: servidor sem modelo vigente configurado
- **WHEN** `AvaliacaoController.submeter()` não consegue resolver modelo para o servidor
- **THEN** responde HTTP 422 com `error = modelo_nao_encontrado`

---

### Requirement: Criação de avaliação exige ciclo em período avaliativo e avaliador resolvido pela hierarquia
<!-- id: AvaliacaoController.store -->
<!-- entities: Avaliacao, CicloAvaliacao, Servidor, PendenciaHierarquia, Impedimento -->
<!-- enforced: AvaliacaoController.store() -->

A abertura de avaliação SHALL exigir ciclo em status `aberto` ou `em_avaliacao` (promovendo
`aberto` → `em_avaliacao`), servidor cadastrado no módulo e avaliador resolvido por
`HierarquiaService.resolverAvaliador()`, que sobe a árvore organizacional a partir da unidade
vigente na data, pulando responsáveis impedidos e recorrendo ao nível topo. Quando a resolução
fica pendente, SHALL ser aberta `PendenciaHierarquia` para o DRH.

#### Scenario: ciclo fora do período avaliativo
<!-- test: AvaliadorCriaAvaliacaoTest -->
- **WHEN** `store()` recebe ciclo em status diferente de `aberto` / `em_avaliacao`
- **THEN** aborta com HTTP 422 "O ciclo não está em período de avaliação."

#### Scenario: servidor sem cadastro no módulo
- **WHEN** não existe `Servidor` para o `servidor_id` informado
- **THEN** aborta com HTTP 422 "Servidor não possui cadastro no módulo CAPD."

#### Scenario: avaliação integral já existente no ciclo
- **WHEN** já existe avaliação `integral` não homologada para (tenant, ciclo, servidor)
- **THEN** retorna a avaliação existente com HTTP 200, sem criar duplicata

#### Scenario: avaliação já homologada no ciclo
- **WHEN** a avaliação existente está homologada
- **THEN** aborta com HTTP 422 "Avaliação já homologada para este servidor neste ciclo."

#### Scenario: superior impedido por parentesco
<!-- test: ImpedimentoBloqueiaSubidaTest -->
- **WHEN** o responsável da unidade tem `Impedimento` registrado com o servidor alvo (ou é o próprio servidor)
- **THEN** `resolverAvaliador()` ignora esse candidato e continua subindo a árvore

#### Scenario: árvore esgotada sem nível topo configurado
<!-- test: PendenciaSemSuperiorTest -->
- **WHEN** nenhum responsável elegível é encontrado e não há nível marcado `is_topo`
- **THEN** cria `PendenciaHierarquia` do tipo `sem_superior`, publica `CapdPendenciaHierarquiaCriada` no Outbox e retorna resolução pendente

#### Scenario: transferência de unidade no meio do ciclo
<!-- test: SplitTransferenciaTest -->
- **WHEN** o servidor mudou de unidade durante o ciclo
- **THEN** `dividirPorTransferencia()` cria avaliações parciais por período e uma consolidada, retornada com HTTP 201

---

### Requirement: Submissão da avaliação calcula e sela a NFD
<!-- id: AvaliacaoController.submeter -->
<!-- entities: Avaliacao, ModeloFormulario, ModeloFatorPeso, DiarioBordo -->
<!-- depends_on: Criação de avaliação exige ciclo em período avaliativo e avaliador resolvido pela hierarquia -->
<!-- triggers: Ciência do servidor avaliado é registrada uma única vez -->
<!-- enforced: AvaliacaoController.submeter() -->

Na submissão, o sistema SHALL ingerir automaticamente os graus dos fatores F1 e F2
(assiduidade/disciplina) marcando-os `automatizado`, resolver o modelo vigente do servidor,
obter os pesos efetivos (com redistribuição do fator H quando o servidor não atende público),
aplicar as travas e persistir `nota_final`, `elegivel_progressao` (NFD ≥ 7,00),
`modelo_formulario_id` e `data_conclusao`. Rascunhos salvos via `update()` não aplicam travas.

#### Scenario: submissão válida
<!-- test: SubmeterAvaliacaoTest.test_submeter_avaliacao_calcula_nota_e_conclui_com_sucesso() -->
- **WHEN** todas as respostas passam nas travas e o modelo tem pesos configurados
- **THEN** grava `nota_final` com 2 casas decimais, `data_conclusao = now()`, audita `avaliacao.submetida` e retorna avaliação, resultado e `f1_f2`

#### Scenario: modelo sem pesos de fatores
- **WHEN** `fatoresComPesosEfetivos()` retorna coleção vazia
- **THEN** responde HTTP 422 com `error = modelo_sem_pesos`

#### Scenario: nenhuma resposta casa com os fatores do modelo
- **WHEN** a soma dos pesos dos fatores respondidos é zero
- **THEN** lança `DomainException` "nenhuma resposta corresponde aos fatores configurados" e responde HTTP 422

#### Scenario: pesos alterados pela Comissão
<!-- test: SubmeterAvaliacaoTest.test_pesos_sincronizados_pela_comissao_afetam_a_nota_real() -->
- **WHEN** a Comissão sincroniza novos pesos antes da submissão
- **THEN** a NFD calculada reflete os novos pesos

#### Scenario: re-submissão de avaliação homologada
- **WHEN** `submeter()` é chamado para avaliação com `homologada = true`
- **THEN** aborta com HTTP 422 "Avaliação já homologada não pode ser re-submetida."

---

### Requirement: Ciência do servidor avaliado é registrada uma única vez
<!-- id: AvaliacaoController.registrarCiencia -->
<!-- entities: Avaliacao -->
<!-- enforced: AvaliacaoController.registrarCiencia() -->

Somente o próprio servidor avaliado SHALL registrar ciência, e apenas após a submissão da
avaliação. O registro grava data/hora, IP e tipo (`concordancia` ou `discordancia_recurso`) e
SHALL ser irrepetível.

#### Scenario: terceiro tenta registrar ciência
- **WHEN** o usuário autenticado difere de `avaliacao.servidor_id`
- **THEN** aborta com HTTP 403 "Somente o servidor avaliado pode registrar a ciência."

#### Scenario: ciência antes da submissão
- **WHEN** `data_conclusao` é nula
- **THEN** aborta com HTTP 422 "A avaliação ainda não foi submetida pelo avaliador."

#### Scenario: ciência já registrada
- **WHEN** `ciencia_servidor_em` já está preenchido
- **THEN** aborta com HTTP 422 informando data e hora do registro anterior

---

### Requirement: Cadência anual abre automaticamente o ciclo N+1 do triênio
<!-- id: CicloService.encerrarCiclo -->
<!-- entities: CicloAvaliacao, Avaliacao, Recurso -->
<!-- triggers: Consolidação da NFC trienal determina elegibilidade à progressão -->
<!-- enforced: CicloService.encerrarCiclo() -->

O encerramento de ciclo SHALL ser bloqueado enquanto houver avaliações sem `data_conclusao` ou
recursos em `interposto` / `em_instrucao` / `pautado`. Encerrado com `cadencia_automatica`
ativa (ou com `abrirProximo`), o sistema SHALL abrir o ciclo seguinte deslocando todas as datas
em exatamente 1 ano (interstício mínimo de 12 meses) e incrementando `etapa_cadencia` até o
teto 3, materializando o triênio de três avaliações anuais.

#### Scenario: encerramento com avaliações pendentes
<!-- test: CicloDozeMesesCadenciaTest.test_bloqueio_de_homologacao_com_avaliacoes_ou_recursos_pendentes() -->
- **WHEN** `encerrarCiclo()` roda com avaliação sem `data_conclusao`
- **THEN** lança `DomainException` "Não é possível encerrar ciclo com avaliações pendentes de conclusão."

#### Scenario: encerramento com recursos pendentes
- **WHEN** existe recurso em `interposto`, `em_instrucao` ou `pautado`
- **THEN** lança `DomainException` "Não é possível encerrar ciclo com recursos pendentes de julgamento."

#### Scenario: roll-over automático N → N+1
<!-- test: CicloDozeMesesCadenciaTest.test_cadencia_anual_automatica_e_trienio() -->
- **WHEN** um ciclo de 2026 com `etapa_cadencia = 1` e `cadencia_automatica = true` é encerrado
- **THEN** é criado o ciclo 2027 com `etapa_cadencia = 2`, `data_inicio` exatamente 12 meses depois e status `aberto`

#### Scenario: teto do triênio
- **WHEN** um ciclo com `etapa_cadencia = 3` é encerrado com cadência automática
- **THEN** o próximo ciclo permanece em `etapa_cadencia = 3` (`min(3, etapa + 1)`)

#### Scenario: regressão de status de ciclo homologado
- **WHEN** `atualizarCiclo()` tenta mover um ciclo `homologado` para status anterior a `homologado`/`encerrado`
- **THEN** lança `DomainException` "Ciclo homologado não pode retornar para status anterior."

---

### Requirement: Elegibilidade do servidor ao ciclo é validada contra bloqueios legais
<!-- id: CicloService.validarElegibilidadeServidor -->
<!-- entities: Servidor, CicloAvaliacao, ServidorAfastamento, Avaliacao, DiarioBordo -->
<!-- enforced: CicloService.validarElegibilidadeServidor() -->

A validação SHALL retornar `elegivel`, `bloqueios` e `avisos`, aplicando as regras do ciclo
(`getRegras()`): exclusão de estagiários, exclusão de comissionados puros, PAD em curso,
afastamentos somando mais que `limite_dias_afastamento` (padrão 180), faltas injustificadas
acima de `limite_faltas_injustificadas` (padrão 5) e unicidade de avaliação não parcial por
ciclo. O interstício abaixo de `intersticio_meses` (padrão 12) entra como aviso, não bloqueio.

#### Scenario: servidor estagiário
<!-- test: CicloDozeMesesCadenciaTest.test_validacao_de_elegibilidade_faltas_afastamentos_e_estagiarios() -->
- **WHEN** o regime jurídico ou cargo indica estágio e `excluir_estagiarios` está ativo
- **THEN** `elegivel = false` com bloqueio "Estagiários não são submetidos à Avaliação Periódica de Desempenho."

#### Scenario: faltas injustificadas acima do limite
- **WHEN** o servidor acumula 8 faltas injustificadas (metadata ou CIT negativos) e o limite é 5
- **THEN** `elegivel = false` com bloqueio citando o total e o limite

#### Scenario: afastamento superior a 180 dias
- **WHEN** afastamentos com `suspende_avaliacao = true` no ciclo somam mais de 180 dias
- **THEN** `elegivel = false` com bloqueio de postergação para o próximo ciclo anual

#### Scenario: interstício inferior a 12 meses
- **WHEN** a última avaliação homologada ocorreu há menos de `intersticio_meses` do início do ciclo
- **THEN** o resultado inclui um aviso, sem bloquear a elegibilidade

#### Scenario: afastamento longo durante o ciclo
<!-- test: SuspensaoLicencaLongaTest -->
- **WHEN** `HierarquiaService.resolverSubstituicao()` detecta afastamento superior a 180 dias
- **THEN** as avaliações não homologadas do ciclo em avaliação passam a `status_avaliacao = suspensa_licenca` e `CapdAvaliacaoSuspensaLicenca` é publicado no Outbox

---

### Requirement: Homologação em lote sela o ciclo e integra via Outbox
<!-- id: HomologacaoLoteService.homologarCiclo -->
<!-- entities: CicloAvaliacao, Avaliacao, Recurso -->
<!-- depends_on: Submissão da avaliação calcula e sela a NFD -->
<!-- enforced: HomologacaoLoteService.homologarCiclo() -->

A homologação SHALL ser bloqueada enquanto houver recursos em julgamento ou avaliações sem
`data_conclusao`. Autorizada, ela roda em transação, marca todas as avaliações concluídas do
ciclo como `homologada` com data e usuário, muda o ciclo para `homologado`, publica
`capd.ciclo_homologado` no Outbox (nunca chamada externa síncrona) e registra auditoria.
Somente membros ativos da Comissão ou portadores de `capd.avaliacoes.homologar` podem executar.

#### Scenario: recursos pendentes de julgamento
<!-- test: CicloDozeMesesCadenciaTest.test_bloqueio_de_homologacao_com_avaliacoes_ou_recursos_pendentes() -->
- **WHEN** existe recurso em `interposto`, `em_instrucao` ou `pautado` no ciclo
- **THEN** lança `DomainException` informando a quantidade de recursos pendentes e nada é homologado

#### Scenario: avaliações não concluídas
- **WHEN** existe avaliação do ciclo com `data_conclusao` nula
- **THEN** lança `DomainException` informando a quantidade pendente

#### Scenario: homologação bem-sucedida
<!-- test: OutboxWebhookHomologacaoTest -->
- **THEN** retorna `total_homologadas`, `total_elegiveis` e `outbox_event_id`, e um evento `capd.ciclo_homologado` fica pendente no Outbox do tenant

---

### Requirement: Consolidação da NFC trienal determina elegibilidade à progressão
<!-- id: CicloService.consolidarNfcTrienal -->
<!-- entities: Servidor, CicloAvaliacao, Avaliacao, ConsolidacaoTrienal, PlanoMelhoria -->
<!-- enforced: CicloService.consolidarNfcTrienal() -->

A NFC SHALL ser a média aritmética das notas de ciclo do triênio (`(Nc1 + Nc2 + Nc3) / 3`),
com 2 casas decimais, apurada sobre os ciclos cujo ano base é `ano_competencia − (etapa − 1)`
até `+2`, no mesmo tenant. As notas de ciclo (Nc) SHALL ser obtidas convertendo
`Avaliacao.nota_final` (NFD, escala 0,00–10,00) para a escala 0–100 (`Nc = nota_final × 10`,
calculado com bcmath) — a mesma conversão já usada por `ConsolidacaoController.nfc()` — nunca
alterando a escala nativa de `CalculadoraNotaService`. A elegibilidade compara a NFC à
`nota_corte_nfc` do ciclo (padrão `70,00`, parametrizável pela Comissão, escala 0–100) e o
conceito sai das faixas configuráveis (Excelente/Bom/Regular/Insuficiente), também na escala
0–100. O resultado é publicado assincronamente como `capd.nfc.consolidada` via Outbox e auditado.

#### Scenario: servidor sem avaliações concluídas no triênio
- **WHEN** nenhum dos ciclos do triênio tem avaliação com `nota_final`
- **THEN** lança `DomainException` "não possui avaliações concluídas nos ciclos do triênio"

#### Scenario: NFC abaixo da nota de corte
<!-- test: ConsolidacaoNfcTest.test_calcula_nfc_dos_servidores_do_ciclo() -->
- **WHEN** a NFC apurada é inferior à `nota_corte_nfc` do ciclo
- **THEN** `elegivel = false`, o conceito é derivado das faixas e o evento Outbox carrega `elegivel: false`

#### Scenario: PDI/PMD pendente no ciclo de verificação
<!-- test: ConsolidacaoNfcTest.test_pdi_pendente_no_ciclo_de_verificacao_bloqueia_elegibilidade_mesmo_com_nfc_alta() -->
- **WHEN** o servidor possui `PlanoMelhoria` em aberto/em andamento/concluído sem verificação no ciclo
- **THEN** a elegibilidade é bloqueada mesmo com NFC acima do corte

#### Scenario: servidores inaptos geram plano de melhoria
<!-- test: ConsolidacaoNfcTest.test_processamento_da_consolidacao_cria_pmds_para_inaptos() -->
- **WHEN** o processamento da consolidação encontra servidores inaptos
- **THEN** `PmdService.criarParaServidor()` abre um `PlanoMelhoria` com status `aberto`, cancelando planos anteriores ainda ativos

#### Scenario: empate no ranking de progressão
<!-- test: ConsolidacaoNfcTest.test_ranking_de_progressao_com_criterios_de_desempate() -->
- **WHEN** dois candidatos têm a mesma NFC
- **THEN** o desempate aplica, em ordem: maior NFC, maior tempo de serviço (`data_admissao` mais antiga) e maior idade (`data_nascimento` mais antiga)

#### Scenario: reprocessamento da consolidação
<!-- test: ConsolidacaoNfcTest.test_reprocessar_consolidacao_cria_nova_versao_e_historico_lista_ambas() -->
- **WHEN** `ConsolidacaoTrienalService.persistir()` roda de novo para o mesmo (servidor, triênio)
- **THEN** cria um novo registro com `versao = max(versao) + 1`, preservando o snapshot anterior

#### Scenario: NFC apurada a partir de notas de ciclo NFD convertidas corretamente
- **WHEN** os três ciclos do triênio têm `nota_final` concluído em 7,00, 7,50 e 8,00 (NFD, escala
  0–10) e o ciclo final usa o corte padrão de 70,00
- **THEN** cada nota de ciclo é convertida para 70,00 / 75,00 / 80,00, a NFC apurada é 75,00, o
  servidor é considerado `elegivel = true`, e o conceito é determinado pelas faixas configuráveis
  na escala 0–100

### Requirement: Fator de atendimento ao público é redistribuído para cargos sem atendimento
<!-- id: ModeloFormulario.fatoresComPesosEfetivos -->
<!-- entities: ModeloFatorPeso, ModeloFormulario, Servidor -->
<!-- enforced: ModeloFormulario.fatoresComPesosEfetivos() -->

Quando o servidor tem `atende_publico = false`, os fatores marcados `redistribuivel` (fator H)
SHALL ser removidos do cálculo e seu peso redistribuído proporcionalmente ao peso relativo dos
demais fatores. A redistribuição ocorre apenas em memória: os pesos configurados em
`ModeloFatorPeso` permanecem inalterados.

#### Scenario: servidor sem atendimento ao público
- **WHEN** `fatoresComPesosEfetivos(false)` é chamado num modelo com fator redistribuível
- **THEN** o fator redistribuível é excluído e cada fator restante recebe `peso + (peso / somaRestantes) × pesoRedistribuido`

#### Scenario: modelo sem fator redistribuível
- **WHEN** nenhum fator do modelo está marcado `redistribuivel`
- **THEN** a coleção original de pesos é retornada sem alteração

---

### Requirement: Gestão e Parametrização Completa da Escala Gráfica no Portal da CAD
<!-- id: Capd.EscalaGrafica.GestaoCompleta -->
<!-- entities: EscalaGrafica, EscalaNivel, ModeloFormulario -->
<!-- enforced: EscalaGraficaPanel, EscalaGraficaController -->

O painel de Escalas Gráficas da CAD SHALL fornecer ciclo de vida administrativo completo das escalas associadas a modelos de formulário, permitindo listagem, criação, edição (`PUT`), ativação e exclusão segura (`DELETE`) com validação de integridade contínua de 0 a 100 pontos e suporte a 3 até 5 graus de desempenho segundo a Metodologia Chiavenato. Todo diálogo destrutivo ou confirmatório SHALL utilizar exclusivamente componentes de `@sysgov/ui` (`Modal`), sendo proibido o uso de `window.confirm` ou `alert`.

#### Scenario: Criação de escala com 3 a 5 níveis e validação de continuidade
- **WHEN** o membro da CAD preenche o formulário de escala com 3 a 5 graus, com o primeiro grau iniciando em 0.0, o último grau finalizando em 100.0 e intervalos contíguos sem sobreposições ou buracos
- **THEN** a escala é cadastrada com sucesso via API, os níveis são persistidos e a nova escala torna-se a vigente do modelo, desativando eventuais escalas anteriores

#### Scenario: Bloqueio de escala com faixas inconsistentes ou fora da amplitude 0 a 100
- **WHEN** o usuário tenta submeter uma escala onde o primeiro nível não inicia em 0.0, o último não termina em 100.0, ou há lacuna ou sobreposição numérica entre níveis consecutivos
- **THEN** o sistema bloqueia o salvamento e apresenta mensagem de erro orientativa detalhando o intervalo inconsistente

#### Scenario: Edição de escala gráfica existente
- **WHEN** o gestor aciona a ação de editar em uma escala gráfica cadastrada e ajusta seus rótulos conceituais, descrição comportamental ou limites de pontos
- **THEN** a requisição `PUT` é enviada com os dados atualizados e o painel reflete imediatamente os novos valores

#### Scenario: Exclusão segura de escala inativa via modal institucional
- **WHEN** o gestor seleciona a exclusão de uma escala não ativa
- **THEN** é aberto um `Modal` institucional com aviso de impacto, exigindo confirmação explícita antes de disparar a exclusão (`DELETE`)

#### Scenario: Aplicação de templates pré-configurados de Chiavenato
- **WHEN** o gestor aciona o botão de preset (5 Graus Padrão, 4 Graus ou 3 Graus)
- **THEN** o formulário de graus é automaticamente preenchido com a distribuição equilibrada de pontos (0 a 100) e rótulos conceituais canônicos da metodologia

---

### Requirement: Régua Gráfica Contínua e Simulador Interativo com Trava Antileniência
<!-- id: Capd.EscalaGrafica.ReguaSimulador -->
<!-- entities: EscalaGrafica, EscalaNivel, DiarioBordo -->
<!-- enforced: EscalaGraficaPanel -->

A aba de Escalas Gráficas SHALL exibir visualização gráfica de régua contínua (0 a 100 pontos) com graduação cromática semântica canônica do `@sysgov/ui` / `graduTone.ts` e disponibilizar um Simulador Interativo de Enquadramento. O simulador SHALL permitir testar qualquer pontuação ou nota convertida, exibindo em tempo real o grau correspondente, o rótulo conceitual, a descrição comportamental e o aviso preventivo da Trava Antileniência quando a nota recair em graus extremos (Grau 1, 2 ou 5).

#### Scenario: Simulação de pontuação em grau intermediário
- **WHEN** o usuário desloca o controle do simulador para uma nota ou pontuação pertencente a graus intermediários (Grau 3 ou Grau 4)
- **THEN** o simulador destaca a respectiva faixa na régua contínua, exibe o rótulo ("Bom" ou "Muito Bom") e indica conformidade avaliativa sem necessidade de CIT prévio

#### Scenario: Simulação de pontuação em grau extremo acionando alerta de Trava Antileniência
- **WHEN** o usuário simula uma pontuação que enquadre no Grau 1 (Insuficiente), Grau 2 (Regular) ou Grau 5 (Excelente)
- **THEN** o simulador exibe alerta visual informativo destacando que a nota acionará a Trava Antileniência regimental (Art. 24 da Lei nº 1.704/2006), exigindo lançamento tempestivo de Incidente Crítico fundamentado no Diário de Bordo

### Requirement: Apresentação Dedicada e Redesign da Régua Contínua de Escala Gráfica no Portal da CAD
<!-- id: Capd.EscalaGrafica.RedesignRegua -->
<!-- entities: EscalaGrafica, EscalaNivel -->
<!-- enforced: PortalCadView, EscalaGraficaPanel -->

A aba de Escalas Gráficas no Portal da CAD SHALL possuir apresentação visual dedicada sem duplicação de cards de KPIs, suprimindo os cards gerais do órgão no nível do portal. A régua contínua de desempenho SHALL exibir uma trilha gráfica com proporções semânticas sem sobreposição de textos internos, contendo marcas numéricas de corte legíveis e cursor/marcador dinâmico refletindo em tempo real o ponto simulado.

#### Scenario: Supressão de cards globais redundantes na aba de Escalas Gráficas
- **WHEN** o usuário seleciona a aba "Escalas Gráficas (Chiavenato)" no Portal da CAD
- **THEN** o container pai (`PortalCadView`) não renderiza os cards de governança geral (recursos, sessões, portarias, ciclos), deixando visíveis unicamente os StatCards específicos da parametrização de escalas

#### Scenario: Renderização limpa e não sobreposta da régua contínua
- **WHEN** uma escala gráfica com quaisquer amplitudes de faixas (mesmo desiguais ou estreitas) é renderizada na tela
- **THEN** a trilha da régua gráfica contínua exibe os blocos coloridos com divisores e marcas de corte sem quebra de layout ou colisão de texto interno, e os cartões de detalhamento de graus são dispostos em grade balanceada com alturas equalizadas

---

### Requirement: Gestão e Indicadores Exclusivos na Aba de Pesos dos Fatores do Portal da CAD
<!-- id: Capd.PesosFatores.GestaoKpiExclusiva -->
<!-- entities: ModeloFatorPeso, ModeloFormulario -->
<!-- enforced: PortalCadView, FatoresPesosPanel -->

A aba de Pesos dos Fatores no Portal da CAD SHALL gerenciar seus próprios indicadores estatísticos de parametrização ponderada (Soma Total dos Pesos, Total de Fatores Ativos, Situação do Fator H Redistribuível e Média Ponderada por Fator) e SHALL suprimir a exibição dos cards gerais de governança institucional no nível do portal para eliminar poluição visual e duplicidade de informações.

#### Scenario: Visualização da aba de pesos sem cards de outras áreas
- **WHEN** o usuário seleciona a aba "Pesos dos Fatores (100%)" no Portal da CAD
- **THEN** o sistema oculta os cards gerais de governança (Recursos, Sessões, Portarias e Ciclo Vigente) e exibe os cards exclusivos de parametrização de pesos da aba

#### Scenario: Atualização em tempo real dos indicadores de conformidade
- **WHEN** o usuário altera o peso de um fator na interface
- **THEN** o card de Soma Total atualiza instantaneamente a soma calculada, sinalizando conformidade com badge de sucesso quando atingir exatamente 100,00% ou aviso de divergência caso contrário

---

### Requirement: Visualização Gráfica Empilhada da Distribuição de Pesos (0% a 100%)
<!-- id: Capd.PesosFatores.VisualizacaoDistribuicao -->
<!-- entities: ModeloFatorPeso, ModeloFormulario -->
<!-- enforced: FatoresPesosPanel -->

A aba de Pesos dos Fatores SHALL exibir uma barra visual contínua empilhada de 0% a 100% (Visual Stacked Distribution Bar) refletindo a proporção de peso atribuída a cada fator de avaliação ativo no modelo de formulário selecionado, utilizando dados numéricos formatados em `font-mono tabular-nums`.

#### Scenario: Renderização gráfica da partição dos 100%
- **WHEN** um modelo de formulário com fatores cadastrados é carregado
- **THEN** a barra empilhada exibe segmentos proporcionais a cada fator com suas respectivas siglas, nomes e percentuais, garantindo distinção visual clara entre eles

---

### Requirement: Utilitários de Auto-Balanceamento e Presets de Ponderação
<!-- id: Capd.PesosFatores.BalanceamentoPresets -->
<!-- entities: ModeloFatorPeso, ModeloFormulario -->
<!-- enforced: FatoresPesosPanel -->

O painel de Pesos dos Fatores SHALL disponibilizar ferramentas de produtividade para balanceamento rápido da soma dos pesos em exatamente 100,00%, incluindo botão de auto-balanceamento proporcional e presets de distribuição (Distribuição Equitativa e Foco em Competências Técnicas).

#### Scenario: Auto-balanceamento de pesos com ajuste fino
- **WHEN** o usuário aciona o botão de auto-balanceamento com fatores ativos cuja soma diverge de 100%
- **THEN** o sistema recalcula e ajusta os pesos proporcionalmente de modo que a soma total resulte exatamente em 100,00%, marcando o formulário como alterado para posterior persistência

### Requirement: Capd.PesosFatores.GestaoKpiExclusiva
A aba de Pesos dos Fatores no Portal da CAD SHALL gerenciar seus próprios indicadores estatísticos de parametrização ponderada (Soma Total dos Pesos, Total de Fatores Ativos, Situação do Fator H Redistribuível e Média Ponderada por Fator) e SHALL suprimir a exibição dos cards gerais de governança institucional no nível do portal para eliminar poluição visual e duplicidade de informações.

#### Scenario: Visualização da aba de pesos sem cards de outras áreas
- **WHEN** o usuário seleciona a aba "Pesos dos Fatores (100%)" no Portal da CAD
- **THEN** o sistema oculta os cards gerais de governança (Recursos, Sessões, Portarias e Ciclo Vigente) e exibe os cards exclusivos de parametrização de pesos da aba

#### Scenario: Atualização em tempo real dos indicadores de conformidade
- **WHEN** o usuário altera o peso de um fator na interface
- **THEN** o card de Soma Total atualiza instantaneamente a soma calculada, sinalizando conformidade com badge de sucesso quando atingir exatamente 100,00% ou aviso de divergência caso contrário

### Requirement: Capd.PesosFatores.VisualizacaoDistribuicao
A aba de Pesos dos Fatores SHALL exibir uma barra visual contínua empilhada de 0% a 100% (Visual Stacked Distribution Bar) refletindo a proporção de peso atribuída a cada fator de avaliação ativo no modelo de formulário selecionado, utilizando dados numéricos formatados em `font-mono tabular-nums`.

#### Scenario: Renderização gráfica da partição dos 100%
- **WHEN** um modelo de formulário com fatores cadastrados é carregado
- **THEN** a barra empilhada exibe segmentos proporcionais a cada fator com suas respectivas siglas, nomes e percentuais, garantindo distinção visual clara entre eles

---

### Requirement: Gestão e Indicadores Exclusivos na Aba de Consolidação NFC Trienal no Portal da CAD
<!-- id: Capd.ConsolidacaoNfc.GestaoKpiExclusiva -->
<!-- entities: ConsolidacaoTrienal, CicloAvaliacao -->
<!-- enforced: PortalCadView, ConsolidacaoPanel -->

A aba de Consolidação NFC Trienal & Ranking no Portal da CAD SHALL gerenciar seus próprios indicadores estatísticos especializados (Total de Servidores no Triênio, Servidores Aptos com Taxa de Sucesso, Inaptos Encaminhados ao PMD e Nota de Corte com Média Global) e SHALL suprimir a exibição dos cards gerais de governança do órgão no nível do portal para eliminar poluição visual e duplicidade de informações.

#### Scenario: Visualização da aba de consolidação sem cards gerais do órgão
- **WHEN** o usuário seleciona a aba "Consolidação NFC Trienal & Ranking" no Portal da CAD
- **THEN** o container pai (`PortalCadView`) omite os cards gerais de governança (Recursos, Sessões, Portarias e Ciclo Vigente), exibindo unicamente os StatCards dedicados da consolidação trienal

#### Scenario: Apresentação analítica de servidores aptos e inaptos
- **WHEN** os dados de consolidação de um ciclo trienal são carregados
- **THEN** os StatCards exibem o quantitativo de servidores aptos com sua respectiva taxa percentual (`font-mono tabular-nums`) e destacam os inaptos com aviso sobre o encaminhamento compulsório ao Plano de Melhoria de Desempenho (PMD)

---

### Requirement: Distribuição Visual dos Conceitos Avaliativos do Triênio
<!-- id: Capd.ConsolidacaoNfc.DistribuicaoConceitos -->
<!-- entities: ConsolidacaoTrienal -->
<!-- enforced: ConsolidacaoPanel -->

A aba de Consolidação NFC Trienal & Ranking SHALL exibir uma barra visual contínua empilhada de 0% a 100% (Concept Distribution Bar) demonstrando a proporção de servidores classificados em cada conceito regulamentar (Excelente, Bom, Regular e Insuficiente), acompanhada de badges semânticas do Design System SYSGOV.

#### Scenario: Distribuição visual dos conceitos avaliativos
- **WHEN** a consolidação trienal é exibida
- **THEN** a barra gráfica empilhada apresenta as fatias correspondentes a cada conceito com cores semânticas oficiais, indicando a quantidade e a porcentagem de servidores em cada faixa

---

### Requirement: Transparência Regimental dos Critérios Legais de Desempate
<!-- id: Capd.ConsolidacaoNfc.CriteriosDesempateLegal -->
<!-- entities: ConsolidacaoTrienal, RankingItem -->
<!-- enforced: ConsolidacaoPanel -->

O painel de Consolidação NFC Trienal & Ranking SHALL fornecer painel instrutivo e transparente sobre as regras legais de desempate aplicadas na ordenação do ranking de progressão funcional, conforme estipulado no Art. 39 da Lei nº 1.704/2006.

#### Scenario: Consulta às regras de desempate da progressão
- **WHEN** o gestor ou membro da CAD acessa a aba do Ranking de Progressão
- **THEN** o sistema exibe os 3 critérios de desempate regimentais em ordem estrita de precedência (1º Maior NFC, 2º Tempo de serviço público e 3º Idade mais avançada)

### Requirement: Capd.ConsolidacaoNfc.GestaoKpiExclusiva
A aba de Consolidação NFC Trienal & Ranking no Portal da CAD SHALL gerenciar seus próprios indicadores estatísticos especializados (Total de Servidores no Triênio, Servidores Aptos com Taxa de Sucesso, Inaptos Encaminhados ao PMD e Nota de Corte com Média Global) e SHALL suprimir a exibição dos cards gerais de governança do órgão no nível do portal para eliminar poluição visual e duplicidade de informações.

#### Scenario: Visualização da aba de consolidação sem cards gerais do órgão
- **WHEN** o usuário seleciona a aba "Consolidação NFC Trienal & Ranking" no Portal da CAD
- **THEN** o container pai (`PortalCadView`) omite os cards gerais de governança (Recursos, Sessões, Portarias e Ciclo Vigente), exibindo unicamente os StatCards dedicados da consolidação trienal

#### Scenario: Apresentação analítica de servidores aptos e inaptos
- **WHEN** os dados de consolidação de um ciclo trienal são carregados
- **THEN** os StatCards exibem o quantitativo de servidores aptos com sua respectiva taxa percentual (`font-mono tabular-nums`) e destacam os inaptos com aviso sobre o encaminhamento compulsório ao Plano de Melhoria de Desempenho (PMD)

### Requirement: Capd.ConsolidacaoNfc.DistribuicaoConceitos
A aba de Consolidação NFC Trienal & Ranking SHALL exibir uma barra visual contínua empilhada de 0% a 100% (Concept Distribution Bar) demonstrando a proporção de servidores classificados em cada conceito regulamentar (Excelente, Bom, Regular e Insuficiente), acompanhada de badges semânticas do Design System SYSGOV.

#### Scenario: Distribuição visual dos conceitos avaliativos
- **WHEN** a consolidação trienal é exibida
- **THEN** a barra gráfica empilhada apresenta as fatias correspondentes a cada conceito com cores semânticas oficiais, indicando a quantidade e a porcentagem de servidores em cada faixa

---

### Requirement: Gestão e Indicadores Exclusivos na Aba de Homologação Final no Portal da CAD
<!-- id: Capd.HomologacaoFinal.GestaoKpiExclusiva -->
<!-- entities: CicloAvaliacao -->
<!-- enforced: PortalCadView -->

A aba de Homologação Final no Portal da CAD SHALL gerenciar seus próprios indicadores estatísticos especializados (Situação Regimental do Ciclo, Conclusão de Avaliações pelas Chefias, Deliberação Total da Fila Recursal e Atas Seladas com SHA-256) e SHALL suprimir a exibição dos cards gerais de governança do órgão no nível do portal para eliminar poluição visual e duplicidade de informações.

#### Scenario: Visualização da aba de homologação sem cards gerais do órgão
- **WHEN** o usuário seleciona a aba "Homologação Final" no Portal da CAD
- **THEN** o container pai (`PortalCadView`) omite os cards gerais de governança (Recursos, Sessões, Portarias e Ciclo Vigente), exibindo unicamente os StatCards dedicados da homologação final

#### Scenario: Atualização dos indicadores ao alternar o ciclo
- **WHEN** o usuário seleciona um ciclo diferente no seletor de homologação
- **THEN** os StatCards atualizam instantaneamente a situação do ciclo, as avaliações concluídas, os recursos associados e as atas vinculadas

---

### Requirement: Painel Dinâmico de Portões de Validação Regimental
<!-- id: Capd.HomologacaoFinal.PortoesValidacao -->
<!-- entities: CicloAvaliacao, Recurso, Sessao -->
<!-- enforced: PortalCadView -->

A aba de Homologação Final SHALL exibir painel dinâmico de Portões de Validação Regimental (Audit Gates RN-C07 a RN-C09) inspecionando em tempo real: (1) Conclusão de 100% das avaliações, (2) Inexistência de recursos pendentes de julgamento, (3) Selamento de atas colegiadas com hash SHA-256 e (4) Regularidade do quórum de membros da CAD.

#### Scenario: Bloqueio da ação com portão pendente
- **WHEN** o ciclo selecionado possuir avaliações incompletas ou recursos pendentes de julgamento
- **THEN** o respectivo portão de validação exibe estado de bloqueio em cor semântica de alerta com o quantitativo pendente, e o botão de homologação permanece bloqueado

#### Scenario: Liberação da ação com conformidade integral
- **WHEN** todos os portões de validação estiverem 100% satisfeitos
- **THEN** os portões exibem indicadores verdes de conformidade e o botão de homologação final é habilitado

---

### Requirement: Despacho Outbox e Fé Pública da Homologação Definitiva
<!-- id: Capd.HomologacaoFinal.DespachoOutboxImutabilidade -->
<!-- entities: CicloAvaliacao -->
<!-- enforced: PortalCadView, HomologacaoLoteService -->

O painel de Homologação Final SHALL fornecer detalhamento sobre o despacho assíncrono do evento `capd.ciclo_homologado` via tabela `outbox_events` e sobre a imutabilidade definitiva das notas atribuídas, exigindo confirmação através de `Modal` institucional do `@sysgov/ui` sem o uso de `window.confirm` ou `alert`.

#### Scenario: Confirmação segura de homologação definitiva
- **WHEN** o usuário clica para homologar um ciclo apto
- **THEN** o sistema exibe `Modal` institucional com aviso de irretratabilidade jurídica das notas e, após confirmação, dispara a transação de homologação, registrando auditoria e publicando o evento no Outbox

### Requirement: Capd.HomologacaoFinal.GestaoKpiExclusiva
A aba de Homologação Final no Portal da CAD SHALL gerenciar seus próprios indicadores estatísticos especializados (Situação Regimental do Ciclo, Conclusão de Avaliações pelas Chefias, Deliberação Total da Fila Recursal e Atas Seladas com SHA-256) e SHALL suprimir a exibição dos cards gerais de governança do órgão no nível do portal para eliminar poluição visual e duplicidade de informações.

#### Scenario: Visualização da aba de homologação sem cards gerais do órgão
- **WHEN** o usuário seleciona a aba "Homologação Final" no Portal da CAD
- **THEN** o container pai (`PortalCadView`) omite os cards gerais de governança (Recursos, Sessões, Portarias e Ciclo Vigente), exibindo unicamente os StatCards dedicados da homologação final

#### Scenario: Atualização dos indicadores ao alternar o ciclo
- **WHEN** o usuário seleciona um ciclo diferente no seletor de homologação
- **THEN** os StatCards atualizam instantaneamente a situação do ciclo, as avaliações concluídas, os recursos associados e as atas vinculadas

### Requirement: Capd.HomologacaoFinal.PortoesValidacao
A aba de Homologação Final SHALL exibir painel dinâmico de Portões de Validação Regimental (Audit Gates RN-C07 a RN-C09) inspecionando em tempo real: (1) Conclusão de 100% das avaliações, (2) Inexistência de recursos pendentes de julgamento, (3) Selamento de atas colegiadas com hash SHA-256 e (4) Regularidade do quórum de membros da CAD.

#### Scenario: Bloqueio da ação com portão pendente
- **WHEN** o ciclo selecionado possuir avaliações incompletas ou recursos pendentes de julgamento
- **THEN** o respectivo portão de validação exibe estado de bloqueio em cor semântica de alerta com o quantitativo pendente, e o botão de homologação permanece bloqueado

#### Scenario: Liberação da ação com conformidade integral
- **WHEN** todos os portões de validação estiverem 100% satisfeitos
- **THEN** os portões exibem indicadores verdes de conformidade e o botão de homologação final é habilitado

### Requirement: Capd.HomologacaoFinal.DespachoOutboxImutabilidade
O painel de Homologação Final SHALL fornecer detalhamento sobre o despacho assíncrono do evento `capd.ciclo_homologado` via tabela `outbox_events` e sobre a imutabilidade definitiva das notas atribuídas, exigindo confirmação através de `Modal` institucional do `@sysgov/ui` sem o uso de `window.confirm` ou `alert`.

#### Scenario: Confirmação segura de homologação definitiva
- **WHEN** o usuário clica para homologar um ciclo apto
- **THEN** o sistema exibe `Modal` institucional com aviso de irretratabilidade jurídica das notas e, após confirmação, dispara a transação de homologação, registrando auditoria e publicando o evento no Outbox

---

### Requirement: Filtros Especializados de Acompanhamento do Estágio Probatório
A aba "Acompanhamento do Estágio Probatório" do Portal de RH SHALL disponibilizar uma barra e painel colapsável de filtros avançados estruturados, permitindo aos gestores segmentar simultaneamente os servidores em período probatório por fase avaliativa, órgão de lotação e situação cadastral.

#### Scenario: Filtragem por Fase do Estágio Probatório
- **WHEN** o gestor seleciona a opção "2ª Fase (24 meses)" no seletor de fases
- **THEN** a tabela exibe exclusivamente os servidores classificados na 2ª fase do estágio probatório, atualizando imediatamente os contadores visíveis

#### Scenario: Filtragem combinada por Secretaria e Fase do Estágio
- **WHEN** o gestor seleciona uma secretaria específica e uma fase do estágio
- **THEN** a listagem exibe apenas servidores lotados na referida secretaria que estejam na fase selecionada

#### Scenario: Filtragem por Status da Avaliação Periódica no Ciclo
- **WHEN** o gestor seleciona a opção "Sem Avaliação no Ciclo Atual"
- **THEN** o sistema filtra os servidores em estágio que ainda não tiveram avaliação registrada pelas chefias no ciclo ativo, facilitando a cobrança preventiva pelo DRH

---

### Requirement: Layout Responsivo sem Barra de Rolagem na Tabela de Estágio
A tabela de Acompanhamento do Estágio Probatório SHALL estruturar suas colunas e larguras de modo a se ajustar perfeitamente ao container, eliminando a barra de rolagem lateral (scroll horizontal) em resoluções de desktop comuns (a partir de 1024px de largura).

#### Scenario: Renderização das colunas com ênfase probatória
- **WHEN** a tabela de estágio probatório é renderizada no desktop
- **THEN** exibe colunas agrupadas contendo Servidor Público, Cargo & Regime, Lotação Institucional, Fase do Estágio & Interstício, Chefia Imediata e Ações, ajustando-se à largura disponível sem overflow horizontal

#### Scenario: Tipografia técnica nos prazos e identificadores
- **WHEN** as informações de matrícula, CPF, fases e datas de término do estágio são exibidas
- **THEN** a renderização utiliza obrigatoriamente a fonte técnica `JetBrains Mono` (`font-mono tabular-nums`) do Design System SYSGOV

---

### Requirement: Painel de Indicadores Executivos do Estágio Probatório
A aba de Estágio Probatório SHALL exibir no topo um conjunto de cartões de indicadores executivos (KPIs) específicos da cadência trienal.

#### Scenario: Exibição da distribuição do efetivo em estágio
- **WHEN** a aba "Acompanhamento do Estágio Probatório" é acessada
- **THEN** o painel exibe cartões com o Total em Estágio Probatório, Servidores na 1ª Fase (12 meses), Servidores na 2ª Fase (24 meses), Servidores na 3ª Fase (36 meses / Estabilidade Iminente) e Taxa de Avaliação no Ciclo Vigente

#### Scenario: Cores semânticas dos cartões de KPI de estágio
- **WHEN** os KPIs são renderizados
- **THEN** utilizam as cores semânticas oficiais do Design System (Âmbar para fases iniciais, Esmeralda para fase conclusiva/aprovação e Primária para o total)

---

### Requirement: Pílulas de Acesso Rápido para Estágio Probatório (Quick Filters)
A interface de Estágio Probatório SHALL disponibilizar pílulas de navegação rápida com 1 clique para as fases probatórias e pendências de avaliação.

#### Scenario: Alternância rápida de fases probatórias
- **WHEN** o usuário clica na pílula "3ª Fase"
- **THEN** o filtro de fase é instantaneamente aplicado e a tabela exibe os servidores em vias de aquisição de estabilidade

---

### Requirement: Filtros Especializados e Busca na Classificação e Desempate Art. 39
A sub-aba "Classificação Oficial & Desempate Art. 39" do Portal de RH SHALL disponibilizar uma barra de busca rápida multifacetada e um painel colapsável de filtros avançados, permitindo aos gestores segmentar o ranking funcional por órgão de lotação, cargo efetivo, conceito avaliativo e elegibilidade à progressão.

#### Scenario: Filtragem por Secretaria e Departamento do organograma
- **WHEN** o gestor seleciona uma secretaria específica no painel de filtros
- **THEN** a tabela de classificação filtra instantaneamente apenas os servidores lotados na referida pasta e reajusta o seletor contextual de departamentos

#### Scenario: Filtragem por Elegibilidade à Progressão Funcional
- **WHEN** o gestor seleciona a opção "Elegíveis à Progressão (NFC >= 70)"
- **THEN** o sistema exibe exclusivamente os servidores aptos à evolução na carreira, ocultando os servidores encaminhados para PMD

#### Scenario: Filtragem exclusiva de Servidores com Empate de Notas
- **WHEN** o gestor seleciona a opção "Apenas Casos de Desempate (Art. 39)"
- **THEN** a listagem filtra exclusivamente os servidores que compartilham a mesma pontuação na NFC e cuja classificação final foi desempatada por tempo de serviço ou idade

---

### Requirement: Painel de Indicadores Executivos do Ranking de Progressão
A sub-aba de Classificação e Desempate SHALL exibir no topo um painel com cartões de indicadores executivos (KPIs) consolidados do ciclo de avaliação e progressão.

#### Scenario: Exibição de métricas gerais de ranqueamento e média NFC
- **WHEN** a aba de Classificação Oficial & Desempate Art. 39 é aberta
- **THEN** o painel exibe cartões com o Total de Ranqueados, Total e Percentual de Aptos à Progressão, Total de Casos em PMD, Média da NFC Geral e Quantidade de Empates Desempatados pelo Art. 39

#### Scenario: Alerta visual para servidores encaminhados ao PMD
- **WHEN** o índice ou contagem de servidores com NFC inferior a 70,00 pontos é exibido
- **THEN** utiliza a cor semântica de alerta/danger do Design System SYSGOV e destaca a necessidade de plano de melhoria

---

### Requirement: Tabela Fluida de Desempate sem Barra de Rolagem Horizontal
A tabela de Classificação Oficial & Desempate Art. 39 SHALL dimensionar suas colunas proporcionalmente sem travas rígidas de largura mínima, ajustando-se a 100% do container e eliminando a barra de rolagem horizontal em resoluções de desktop (>= 1024px).

#### Scenario: Ajuste responsivo de colunas no desktop
- **WHEN** a tabela de ranking e desempate é renderizada em desktop
- **THEN** apresenta as colunas Posição, Servidor Público, Lotação Institucional, 1º NFC, 2º Tempo de Serviço, 3º Idade Civil, Conceito e Status de Elegibilidade sem gerar scroll horizontal

#### Scenario: Tipografia técnica nos critérios legais do Art. 39
- **WHEN** os dados de posição, NFC, dias de serviço, idade e matrícula são renderizados
- **THEN** utiliza obrigatoriamente a fonte técnica `JetBrains Mono` (`font-mono tabular-nums`) do Design System SYSGOV

---

### Requirement: Pílulas de Acesso Rápido para Classificação Funcional
A interface de Classificação Oficial & Desempate Art. 39 SHALL fornecer pílulas de navegação rápida (*Quick Filters*) para filtragem ágil em 1 clique.

#### Scenario: Alternância rápida de faixas de conceito e empates
- **WHEN** o gestor clica na pílula "Empates Art. 39"
- **THEN** o filtro é aplicado imediatamente exibindo apenas os servidores cujas posições decorreram da aplicação dos critérios de desempate

---

### Requirement: Painel Executivo e Métricas da Cadeia de Hierarquia Avaliativa
O sistema SHALL exibir no topo da aba de Configuração de Hierarquia um painel executivo com 4 cartões de indicadores (KPIs) sintetizando a cobertura e a integridade da cadeia de comando avaliativa:
1. **Total de Níveis Parametrizados**: Contagem de escalões configurados no tenant (ex.: Nível 0 - Setor, Nível 1 - Departamento, Nível 2 - Secretaria, Nível 3 - Gabinete/Prefeitura).
2. **Nível Topo Homologado**: Indicação se o topo da pirâmide institucional está homologado com avaliador ou papel RBAC vinculado (ex.: Controladoria ou Prefeito).
3. **Regras de Substituição Ativas**: Distribuição e prevalência das regras de impedimento ("Superior Hierárquico" vs "Substituto Legal").
4. **Status de Integridade da Cadeia**: Indicador visual (conforme / alerta) que aponta se há lacunas na sequência de níveis ou ausência de nível topo.

#### Scenario: Visualização dos KPIs com hierarquia íntegra
- **WHEN** o gestor acessa a aba de Configuração de Hierarquia com níveis de 0 a 2 cadastrados e nível 2 definido como topo
- **THEN** o painel exibe "3 Níveis Ativos", "Nível Topo Configurado (Nível 2)", "Regras de Substituição: 100% Definidas" e status "Cadeia Homologada"

#### Scenario: Visualização de alerta quando inexiste nível topo
- **WHEN** a listagem de níveis não possui nenhum registro com flag `is_topo = true`
- **THEN** o cartão de integridade exibe advertência visual destacando a ausência do topo institucional e orientando a definição do nível máximo

---

### Requirement: Gestão de Níveis com DataTable e Diálogo Seguro de Exclusão
A listagem de níveis hierárquicos SHALL ser estruturada através de um `DataTable` com suporte a ordenação natural por nível numérico ascendente, busca rápida por texto, badges semânticos e diálogo de confirmação seguro:
1. Não SHALL ser utilizado diálogo nativo do navegador (`window.confirm` ou `alert`) para desativação ou remoção de níveis.
2. A confirmação de exclusão/desativação DEVE utilizar obrigatoriamente o componente `ConfirmDialog` com título, mensagem descritiva de impacto e botão destrutivo explícito.
3. A numeração de níveis e identificadores DEVE utilizar tipografia técnica JetBrains Mono (`font-mono tabular-nums`).

#### Scenario: Ordenação por nível e badges de status
- **WHEN** os níveis são carregados da API
- **THEN** são apresentados em ordem crescente de nível (Nível 0, 1, 2...), com badge dourado `Crown` no nível topo e badges semânticos para as regras de substituição

#### Scenario: Desativação de nível via ConfirmDialog
- **WHEN** o usuário clica no botão de desativar/excluir de um nível ativo
- **THEN** é aberto um `ConfirmDialog` modal informando as consequências na resolução avaliativa e exigindo confirmação explícita antes de chamar a API

---

### Requirement: Simulador Interativo de Resolução de Avaliador da Hierarquia
A aba SHALL disponibilizar uma ferramenta de simulação interativa ("Quem avalia quem?") permitindo ao gestor de RH validar na prática o algoritmo de subida hierárquica e substituição:
1. O simulador permite selecionar uma unidade ou cargo de referência.
2. Apresenta a cadeia resolvida passo a passo: Chefe Imediato (Nível 0) $\to$ Superior Imediato (Nível 1) $\to$ Topo do Órgão.
3. Oferece um seletor de cenário de "Afastamento/Impedimento da Chefia", demonstrando em tempo real se a avaliação sobe para o superior hierárquico ou é transferida ao substituto legal designado.

#### Scenario: Simulação em fluxo normal de chefia ativa
- **WHEN** o gestor seleciona um departamento e testa o fluxo padrão
- **THEN** o simulador exibe a linha do tempo com o chefe imediato como primeiro avaliador competente

#### Scenario: Simulação com chefia imediata afastada
- **WHEN** o gestor ativa o switch de "Chefe Imediato em Licença/Afastado"
- **THEN** o simulador aplica a regra cadastrada no nível (sobe para o Diretor/Secretário ou direciona para o Substituto Legal) e destaca a fundamentação regimental

---

### Requirement: Visualização Esquemática em Árvore e Fluxo da Pirâmide Avaliativa
O painel SHALL fornecer uma visualização gráfica ou esquemática em pirâmide/árvore conectada dos níveis hierárquicos da organização:
1. Apresenta os cartões dos níveis em sequência visual da base ao ápice.
2. Cada cartão exibe o nível, nome, cargo de referência e ícone correspondente.
3. Mostra as setas ou conexões de fluxo de subida regimental da avaliação.

#### Scenario: Alternância entre visualização em Tabela e em Árvore
- **WHEN** o usuário clica no seletor de modo de visualização ("Tabela" vs "Estrutura em Árvore")
- **THEN** a interface alterna fluidamente entre o grid detalhado do `DataTable` e os cartões conectados da pirâmide institucional

### Requirement: Painel de Indicadores Executivos e Impacto Financeiro da Folha
A sub-aba "Exportação Folha de Pagamento" do Portal de RH SHALL exibir no topo um painel executivo com cartões de indicadores (KPIs) orçamentários consolidados da evolução funcional decorrente da cadência avaliativa.

#### Scenario: Exibição do impacto mensal e anualizado com encargos
- **WHEN** a aba de Exportação Folha de Pagamento é acessada
- **THEN** o painel exibe cartões com o Total da Folha Mensal Base, Impacto Financeiro Mensal do Reajuste (+10%), Impacto Anual Projetado (considerando 13º salário e terço constitucional de férias) e Quantitativo de Servidores Homologados vs Retidos em PMD

#### Scenario: Tipografia técnica e representação monetária
- **WHEN** os valores salariais, percentuais de reajuste e impactos orçamentários são renderizados
- **THEN** utiliza obrigatoriamente a fonte técnica `JetBrains Mono` (`font-mono tabular-nums`) do Design System SYSGOV e cálculos baseados em centavos inteiros (`int $cents`)

---

### Requirement: Filtros Avançados e Busca Multifacetada de Folha de Pagamento
A sub-aba de Exportação Folha de Pagamento SHALL fornecer campo de busca rápida por texto e um painel colapsável de filtros avançados para segmentação orçamentária e cadastral.

#### Scenario: Filtragem por Secretaria e Departamento institucional
- **WHEN** o gestor seleciona uma secretaria específica nos filtros avançados
- **THEN** a tabela e o sumário financeiro filtram os dados apenas para a pasta selecionada e atualizam o seletor contextual de departamentos

#### Scenario: Filtragem por Situação de Concessão Funcional
- **WHEN** o gestor filtra por servidores com status "Apto ao Reajuste (+10%)"
- **THEN** a interface exibe apenas os servidores que atingiram a nota de corte (NFC >= 70,00 pts), omitindo servidores em PMD

#### Scenario: Filtragem por Faixa Salarial e Magnitude do Impacto
- **WHEN** o gestor define critérios de faixa de remuneração ou impacto financeiro
- **THEN** a listagem isola os servidores pertencentes aos intervalos monetários informados

---

### Requirement: Pílulas de Acesso Rápido para Gestão da Folha (Quick Filters)
A interface de folha de pagamento SHALL disponibilizar botões de filtro rápido (*Quick Filters*) para consultas imediatas em 1 clique.

#### Scenario: Filtragem instantânea de servidores retidos em PMD
- **WHEN** o gestor clica na pílula "Retidos (PMD)"
- **THEN** a visualização é imediatamente restrita aos servidores cuja evolução salarial está sobrestada por nota insuficiente

---

### Requirement: Exportação Especializada para Múltiplos ERPs Municipais
O sistema SHALL disponibilizar opções de exportação parametrizadas para os principais sistemas integrados de gestão pública municipal (Betha Sistemas, IPM Atende.Net, Governa/CECAM e CSV Padrão Universal).

#### Scenario: Exportação para o conector Betha Sistemas
- **WHEN** o operador de RH seleciona o leiaute Betha Sistemas
- **THEN** o arquivo é gerado com delimitador ponto-e-vírgula, cabeçalhos padronizados do leiaute de importação de eventos e identificadores de rubrica salarial correspondentes

#### Scenario: Exportação para o conector IPM Atende.Net
- **WHEN** o operador seleciona o leiaute IPM Atende.Net
- **THEN** o arquivo é gerado com a formatação e campos compatíveis com a rotina de progressão por mérito da IPM

---

### Requirement: Grid Fluido de Folha de Pagamento sem Barra de Rolagem Lateral
A tabela de homologação financeira da folha de pagamento SHALL dimensionar suas colunas responsivamente sem travas fixas rígidas de largura mínima, ajustando-se a 100% do container e eliminando a barra de rolagem horizontal em resoluções de desktop (>= 1024px).

#### Scenario: Renderização fluida da tabela de impacto salarial
- **WHEN** a tabela de folha de pagamento é exibida em monitores desktop
- **THEN** apresenta todas as colunas essenciais (Servidor/Matrícula, Lotação, NFC, Salário Atual, Reajuste e Salário Projetado) com legibilidade completa e sem scroll horizontal lateral

### Requirement: Estrutura Organizacional Real na Aba de Distribuição
A aba "Distribuição por Pasta & Departamento" do Portal de RH e Secretaria Municipal de Gestão de
Pessoas SHALL exibir as secretarias e departamentos reais cadastrados no organograma do tenant
(módulo OrgChart), incluindo seus responsáveis reais, em vez de uma estrutura organizacional fixa
não vinculada ao tenant autenticado.

#### Scenario: Tenant com organograma próprio cadastrado
- **WHEN** o usuário abre a aba de Distribuição por Pasta & Departamento de um tenant com
  secretarias e departamentos cadastrados no OrgChart
- **THEN** a aba exibe exatamente as secretarias e departamentos daquele tenant, com o nome do
  responsável real de cada unidade, e não a estrutura de nenhum outro tenant

### Requirement: Indicadores Agregados Reais na Distribuição
Os indicadores agregados no topo da aba de Distribuição (total de secretarias, total de
departamentos, total de chefias nomeadas, total de servidores lotados e percentual de vínculos
institucionais) SHALL ser calculados a partir dos dados reais carregados pela aba, não a partir de
valores fixos.

#### Scenario: Contagens batem com os dados exibidos
- **WHEN** o usuário visualiza os indicadores agregados do topo da aba de Distribuição
- **THEN** o total de secretarias e departamentos exibido corresponde exatamente à quantidade de
  cards renderizados abaixo, e o total de servidores lotados corresponde à soma dos servidores
  listados em todos os departamentos

### Requirement: Classificação de Servidores por Unidade Organizacional
Cada servidor SHALL ser associado à sua unidade organizacional preferencialmente pelo vínculo
direto (`org_unit_id`); na ausência desse vínculo, o sistema SHALL usar correspondência textual
como alternativa. Um servidor que não corresponder a nenhuma unidade organizacional conhecida
SHALL ser exibido em uma categoria explícita de "não classificados", nunca descartado
silenciosamente.

#### Scenario: Servidor sem vínculo organizacional direto e sem correspondência textual
- **WHEN** um servidor não possui `org_unit_id` preenchido e seus dados textuais de lotação não
  correspondem a nenhuma unidade organizacional cadastrada
- **THEN** esse servidor aparece na categoria "não classificados" da aba de Distribuição, e é
  contabilizado no indicador agregado de servidores lotados

### Requirement: Filtros Avançados Multivariados no Quadro de Servidores
A aba "Quadro de Servidores" do Portal de RH e Gestão de Pessoas SHALL disponibilizar uma barra e painel de filtros avançados multivariados, permitindo aos gestores segmentar simultaneamente o conjunto de servidores públicos por múltiplos critérios administrativos.

#### Scenario: Filtragem simultânea por Secretaria e Condição Probatória
- **WHEN** o gestor seleciona a secretaria "Secretaria Municipal de Educação" no seletor de órgãos e a opção "Em Estágio Probatório" no seletor de condição funcional
- **THEN** a listagem de servidores exibe apenas os servidores pertencentes a essa secretaria que estão em estágio probatório, atualizando imediatamente o contador de registros visíveis

#### Scenario: Filtragem por Departamento contextual à Secretaria
- **WHEN** o gestor seleciona uma secretaria específica
- **THEN** o seletor de departamento passa a listar exclusivamente as unidades departamentais vinculadas à referida secretaria conforme a árvore organizacional real

#### Scenario: Busca textual combinada com filtros avançados
- **WHEN** o gestor digita um termo de busca (matrícula, nome, CPF ou cargo) mantendo filtros avançados selecionados
- **THEN** o sistema aplica a busca como critério aditivo (interseção lógica E), exibindo apenas servidores que atendem aos filtros selecionados e contenham o termo digitado

#### Scenario: Limpeza de todos os filtros ativos
- **WHEN** o gestor clica no botão "Limpar Filtros"
- **THEN** todos os seletores e o campo de busca são redefinidos para os valores padrão, e a listagem volta a exibir a totalidade dos servidores cadastrados

### Requirement: Layout Responsivo sem Barra de Rolagem Horizontal na Listagem
A tabela do Quadro de Servidores SHALL estruturar suas colunas e larguras de modo a se ajustar perfeitamente à largura disponível do container, sem produzir barra de rolagem lateral (scroll horizontal) em resoluções de tela desktop comuns (a partir de 1024px de largura).

#### Scenario: Renderização das colunas agrupadas em tela padrão
- **WHEN** a tabela do Quadro Geral de Servidores é renderizada em uma resolução desktop típica de trabalho
- **THEN** as colunas agrupam harmoniosamente dados cadastrais (Servidor com Matrícula e CPF), dados de lotação (Secretaria e Departamento unificados) e dados de vínculo (Estágio e Situação Funcional), mantendo a tabela integralmente visível sem overflow horizontal

#### Scenario: Preservação de dados técnicos e formatação mono
- **WHEN** os dados dos servidores são exibidos nas colunas agrupadas
- **THEN** matrículas, CPFs, códigos de unidade e datas continuam renderizados obrigatoriamente com a tipografia `JetBrains Mono` (`font-mono tabular-nums`) do Design System SYSGOV

### Requirement: Painel de Indicadores Executivos do Quadro de Servidores
A aba do Quadro de Servidores SHALL exibir no topo um painel executivo com cards de indicadores (KPIs) dinâmicos sintetizando a distribuição do efetivo municipal.

#### Scenario: Exibição dos indicadores panorâmicos de pessoal
- **WHEN** a aba "Quadro de Servidores" é acessada
- **THEN** o painel exibe cartões de KPI com o Total de Servidores, Servidores em Estágio Probatório (com percentual), Servidores Estáveis (com percentual), Total Alocado em Unidades Organizacionais e Servidores com Avaliação Registrada no Ciclo Ativo

#### Scenario: Formatação e cores semânticas dos cartões de KPI
- **WHEN** os KPIs são renderizados
- **THEN** os valores numéricos utilizam a fonte técnica `JetBrains Mono`, com cores semânticas padronizadas pelo Design System (Primária para Total, Âmbar para Estágio Probatório, Esmeralda para Estáveis e Ciano para Lotação Regular)

### Requirement: Pílulas de Acesso Rápido (Quick Filters)
A interface do Quadro de Servidores SHALL disponibilizar botões de filtro rápido em formato de pílulas (chips) para alternância imediata entre os segmentos de consulta mais frequentes.

#### Scenario: Seleção rápida de servidores em estágio probatório
- **WHEN** o usuário clica na pílula rápida "Estágio Probatório"
- **THEN** o filtro de condição funcional é automaticamente ajustado para "Em Estágio Probatório" e a tabela exibe instantaneamente apenas servidores nessa condição

#### Scenario: Seleção rápida de servidores sem lotação definida
- **WHEN** o usuário clica na pílula rápida "Sem Lotação"
- **THEN** a tabela filtra exclusivamente servidores que não possuem vínculo registrado no organograma institucional, facilitando a identificação de pendências de alocação pelo DRH

### Requirement: Classificação Organizacional Real no Quadro de Servidores
A aba "Quadro Geral de Servidores" SHALL exibir a secretaria e o departamento reais de cada
servidor, derivados do organograma cadastrado no OrgChart (mesma classificação por `org_unit_id`
com fallback textual já usada na aba de Distribuição por Pasta & Departamento), em vez de uma
heurística de texto genérica. Um servidor sem unidade organizacional correspondente SHALL ser
exibido como "Não Classificado", nunca com uma sigla inventada a partir do texto livre de lotação.

#### Scenario: Servidor vinculado a uma unidade real do organograma
- **WHEN** o usuário visualiza o Quadro Geral de Servidores de um tenant com organograma
  cadastrado
- **THEN** a coluna de secretaria/departamento de cada servidor corresponde exatamente à unidade
  organizacional real à qual ele está classificado, igual à aba de Distribuição

#### Scenario: Servidor sem correspondência no organograma
- **WHEN** um servidor não possui `org_unit_id` nem lotação textual reconhecível por nenhuma
  unidade cadastrada
- **THEN** a coluna de secretaria/departamento exibe "Não Classificado"

### Requirement: Painel de Detalhe do Servidor no Quadro Geral
Ao clicar numa linha do Quadro Geral de Servidores, o sistema SHALL abrir um painel de detalhe
exibindo os dados cadastrais básicos do servidor, o histórico de avaliações de todos os ciclos
avaliativos (não apenas o ciclo ativo), os quinquênios registrados e os afastamentos do servidor.

#### Scenario: Consulta de detalhe de um servidor com histórico
- **WHEN** o usuário clica na linha de um servidor que possui avaliações em mais de um ciclo
- **THEN** o painel de detalhe lista as avaliações de todos os ciclos em que o servidor foi
  avaliado, não somente a do ciclo selecionado na aba

### Requirement: Dashboard Analítico com Dados Reais do Tenant
A aba "Dashboard Analítico & BI" do Portal de RH e Secretaria Municipal de Gestão de Pessoas
SHALL derivar todos os seus gráficos (dispersão de notas, clusters por secretaria, média por
secretaria e proporção de conceitos) exclusivamente de dados reais do tenant autenticado
(avaliações, servidores e métricas do ciclo selecionado), sem valores estáticos fabricados. O
tempo de serviço exibido no gráfico de dispersão SHALL ser calculado a partir da data de admissão
real do servidor. Quando o ciclo selecionado não possuir avaliações concluídas, a aba SHALL exibir
um estado vazio explícito em vez de dados fictícios de exemplo.

#### Scenario: Ciclo com avaliações concluídas
- **WHEN** o usuário abre a aba Dashboard Analítico & BI com um ciclo que possui avaliações
  concluídas
- **THEN** os gráficos de dispersão, clusters, média por secretaria e proporção de conceitos
  refletem os valores reais de `nota_final`, `orgao_lotacao` e `data_admissao` dos servidores
  avaliados naquele ciclo e tenant

#### Scenario: Ciclo sem avaliações concluídas
- **WHEN** o usuário abre a aba Dashboard Analítico & BI com um ciclo que ainda não possui
  avaliações concluídas
- **THEN** a aba exibe um estado vazio explícito informando a ausência de dados, sem preencher os
  gráficos com valores de exemplo

### Requirement: Evolução de Desempenho Entre Ciclos
A aba Dashboard Analítico & BI SHALL exibir um gráfico de série histórica mostrando a média de
notas e a taxa de conclusão de avaliações por ciclo avaliativo do tenant, cobrindo todos os ciclos
já encerrados ou em andamento, não apenas o ciclo ativo selecionado.

#### Scenario: Tenant com múltiplos ciclos históricos
- **WHEN** o tenant possui dois ou mais ciclos avaliativos com avaliações concluídas
- **THEN** o gráfico de evolução exibe um ponto por ciclo, ordenado cronologicamente, com a média
  de notas e a taxa de conclusão daquele ciclo

### Requirement: Ranking de Secretarias por Desempenho
A aba Dashboard Analítico & BI SHALL exibir um ranking das secretarias municipais ordenado pela
média de notas de seus servidores no ciclo selecionado, destacando visualmente a secretaria com
melhor desempenho e a secretaria mais próxima do corte regimental de elegibilidade.

#### Scenario: Ranking com secretarias abaixo e acima do corte
- **WHEN** o ciclo selecionado possui secretarias com médias acima e abaixo do corte regimental
- **THEN** o ranking lista todas as secretarias em ordem decrescente de média, com indicação visual
  distinta para a secretaria de melhor desempenho e para a que está mais próxima do corte

### Requirement: Drill-Down por Departamento
Ao selecionar uma secretaria no Dashboard Analítico & BI, o sistema SHALL permitir o
detalhamento do desempenho por departamento/lotação física pertencente àquela secretaria, sem
navegação para fora da aba.

#### Scenario: Seleção de secretaria com múltiplos departamentos
- **WHEN** o usuário seleciona uma secretaria que possui mais de um departamento com servidores
  avaliados
- **THEN** o sistema exibe o detalhamento de desempenho por departamento daquela secretaria,
  calculado a partir das mesmas avaliações já carregadas

### Requirement: Destaque de Desempenho Individual (Top/Bottom)
A aba Dashboard Analítico & BI SHALL exibir os servidores com maior e menor nota final no ciclo
selecionado, com acesso direto ao espelho de avaliação de cada um.

#### Scenario: Consulta do destaque individual
- **WHEN** o usuário visualiza a seção de destaque de desempenho individual no ciclo selecionado
- **THEN** o sistema lista os servidores de maior e de menor nota final daquele ciclo, cada um com
  um atalho que abre o espelho de avaliação correspondente

### Requirement: Simulação de progressão converte NFD para a escala da NFC
<!-- id: AvaliacaoController.simularProgressao -->
<!-- entities: Servidor, Avaliacao, CicloAvaliacao -->
<!-- enforced: AvaliacaoController.simularProgressao() -->

A simulação de progressão de um servidor (`GET /servidores/{id}/simular-progressao`) SHALL
calcular a NFC projetada convertendo cada `Avaliacao.nota_final` (NFD, escala 0–10) das até 3
avaliações mais recentes para a escala 0–100 (mesma conversão de `ConsolidacaoController.nfc()`)
antes de calculá-la e compará-la ao corte de elegibilidade padrão, para que o resultado da
simulação seja consistente com o resultado da consolidação oficial.

#### Scenario: Servidor com notas NFD reais e elegíveis
- **WHEN** um servidor tem avaliações concluídas com `nota_final` 7,00 / 7,50 / 8,00 (NFD)
- **THEN** a NFC projetada retornada é 75,00 (não 7,50) e `elegivel_progressao = true`

### Requirement: Painel Executivo e Indicadores de Pendências de Hierarquia
O sistema SHALL exibir no topo do painel de Pendências de Hierarquia um conjunto de 4 cartões de indicadores (KPIs) sintetizando o estado de bloqueios e inconsistências avaliativas:
1. **Total de Pendências Abertas**: Quantidade de inconsistências pendentes de resolução manual, com destaque semântico em cor de alerta (âmbar) caso o valor seja superior a zero.
2. **Total de Pendências Resolvidas**: Quantidade acumulada de pendências já sanadas pelo DRH.
3. **Taxa de Saneamento**: Percentual de pendências resolvidas em relação ao total acumulado, formatado em `font-mono tabular-nums`.
4. **Distribuição por Tipo de Inconsistência**: Contagem segmentada entre "Sem Superior Resolvido", "Afastamento sem Substituto" e "Topo da Hierarquia sem Configuração".

#### Scenario: Visualização dos KPIs com pendências ativas
- **WHEN** o gestor de RH acessa a aba com 5 pendências em aberto e 15 já resolvidas
- **THEN** o painel exibe "5 Pendências Abertas" com borda de destaque em âmbar, "15 Resolvidas", taxa de saneamento de "75,0%" e a contagem por cada uma das categorias de bloqueio

#### Scenario: Visualização quando não há pendências abertas
- **WHEN** não existem pendências com status "aberta" no tenant
- **THEN** o cartão de pendências abertas exibe valor "0" com indicador positivo de integridade cadastral plena

### Requirement: Listagem Analítica com DataTable, Filtros Multifacetados e Busca
A visualização das pendências de hierarquia SHALL ser estruturada através do componente `DataTable` de `@sysgov/ui`, provendo busca textual, filtros avançados, ordenação e tipografia técnica:
1. **Busca Textual**: Campo de pesquisa rápida que filtra dinamicamente por nome completo do servidor, matrícula funcional ou texto descritivo do motivo/diagnóstico.
2. **Filtros Multifacetados**:
   - Filtro de Status: "Abertas", "Resolvidas" ou "Todas";
   - Filtro de Tipo de Pendência: "Todos", "Sem superior resolvido", "Afastamento sem substituto" e "Topo sem configuração";
   - Filtro por Ciclo Avaliativo.
3. **Colunas Estruturadas**:
   - Servidor (Nome em destaque e matrícula em `font-mono tabular-nums`);
   - Ciclo Avaliativo (Nome e ano de referência);
   - Categoria da Inconsistência (com badge semântico colorido e ícone alusivo);
   - Diagnóstico do Motor de Hierarquia (motivo detalhado com tooltip);
   - Status (`StatusChip` com variação warning para Aberta e success para Resolvida);
   - Resolução/Auditoria (identificação do avaliador designado e data/hora em `font-mono tabular-nums` quando resolvida);
   - Ações (botão "Resolver" para pendências abertas e "Ver Detalhes" para histórico).
4. **Controle de Paginação**: Suporte nativo a paginação com seleção de registros por página (`pageSizeSelector`).

#### Scenario: Filtragem por categoria de inconsistência
- **WHEN** o operador do RH seleciona o filtro "Afastamento sem substituto"
- **THEN** a tabela exibe exclusivamente os servidores cujo chefe imediato entrou em licença/férias e para os quais não foi cadastrado substituto legal no sistema

#### Scenario: Busca rápida por matrícula
- **WHEN** o usuário digita a matrícula "10234" no campo de busca
- **THEN** a listagem filtra instantaneamente o servidor correspondente, mantendo a paginação e os totais contextualizados

### Requirement: Modal de Resolução Assistido e Seguro com Seleção Qualificada
Ao acionar a resolução de uma pendência aberta, o sistema SHALL abrir um modal interativo que substitui a inserção cega de IDs por uma experiência assistida e segura:
1. **Ficha de Contexto do Servidor**: Exibe dados cadastrais do servidor avaliado (nome, matrícula, ciclo de avaliação) e o diagnóstico completo emitido pelo motor de hierarquia.
2. **Seleção Amigável do Avaliador Designado**:
   - Permite selecionar o avaliador por meio de seletor ou busca contextual (nome, cargo ou matrícula);
   - Impede submissão sem seleção explícita de um usuário válido.
3. **Alerta de Impacto**: Informa de maneira transparente que a confirmação redirecionará automaticamente as avaliações não-homologadas em aberto do servidor para o avaliador designado.
4. **Registro e Atualização Imediata**: Ao confirmar com sucesso, a pendência é marcada como resolvida, os dados de auditoria (`resolvido_por` e `resolvido_em`) são atualizados e a listagem reflete imediatamente o novo estado sem necessidade de recarregar a página inteira.

#### Scenario: Resolução assistida com sucesso
- **WHEN** o gestor do RH abre a resolução para o servidor "Carlos Silva", seleciona o Diretor de Divisão "Marcos Souza" como avaliador e clica em "Confirmar Designação"
- **THEN** o sistema envia a requisição para a API, fecha o modal, atualiza a pendência para "Resolvida", transfere a avaliação em andamento para Marcos Souza e exibe notificação de êxito

#### Scenario: Tentativa de resolução sem selecionar avaliador
- **WHEN** o operador abre o modal e tenta submeter sem selecionar um avaliador
- **THEN** o botão de confirmação permanece desabilitado ou validação visual orienta a seleção de um gestor válido

### Requirement: Exportação Tabular de Inconsistências para Saneamento Cadastral
O painel de pendências SHALL disponibilizar funcionalidade de exportação de dados para planilha CSV, permitindo que a equipe de Recursos Humanos audite as inconsistências estruturais e notifique os setores competentes:
1. A exportação contempla todos os registros filtrados na visão ativa ou a totalidade das pendências.
2. O arquivo gerado deve conter cabeçalhos em português (ex.: ID, Servidor, Matrícula, Ciclo, Tipo de Pendência, Diagnóstico, Status, Avaliador Designado, Data Resolução).
3. O conteúdo deve ser formatado com codificação UTF-8 com BOM (`\uFEFF`) para abertura direta e correta no Excel sem distorção de caracteres acentuados.

#### Scenario: Exportação do relatório de pendências
- **WHEN** o gestor clica no botão "Exportar CSV"
- **THEN** o navegador efetua o download imediato do arquivo `pendencias_hierarquia_capd_{data}.csv` com os dados sanitizados e prontos para conferência

### Requirement: Painel Executivo e Indicadores do Plano de Melhoria de Desempenho (PMD)
O sistema SHALL exibir no topo da aba de Acompanhamento de PMD um conjunto de 4 cartões de indicadores executivos (KPIs) sintetizando a situação dos servidores sob plano de recuperação funcional:
1. **Total de PMDs Ativos / Em Risco**: Contagem de servidores com planos em situação "Aberto" ou "Em Andamento", com destaque semântico em cor de alerta (âmbar) caso o valor seja maior que zero.
2. **Total de Planos Superados / Verificados**: Contagem acumulada de planos cuja reavaliação registrou evolução satisfatória do servidor.
3. **Taxa de Recuperação Funcional**: Percentual de servidores que comprovaram superação da nota de corte em relação ao total de planos concluídos/verificados, formatado em `font-mono tabular-nums`.
4. **Alertas de Prazos Críticos**: Contagem de planos com data limite expirada ou com vencimento nos próximos 30 dias, sinalizando a urgência de intervenção da chefia imediata ou da Comissão CAD.

#### Scenario: Visualização dos KPIs com planos ativos e vencidos
- **WHEN** o gestor de RH acessa a aba com 6 planos ativos, 2 planos com prazo expirado e 14 planos já verificados
- **THEN** o painel exibe "6 PMDs em Acompanhamento" com borda de destaque em âmbar, "14 Superados", taxa de recuperação calculada e alerta destacando "2 Planos Vencidos"

#### Scenario: Visualização quando inexistem servidores sob PMD
- **WHEN** não existem servidores com planos abertos no tenant
- **THEN** o cartão de PMDs ativos exibe valor "0" com indicador positivo de plena conformidade de notas do quadro funcional

### Requirement: Listagem Analítica do PMD com Identificação do Servidor e Gestão de Prazos
A tabela de acompanhamento de PMD SHALL ser estruturada através do componente `DataTable` de `@sysgov/ui`, provendo identificação clara dos servidores, progresso de ações pactuadas, alertas temporais e busca multifacetada:
1. **Identificação do Servidor**: Exibição em destaque do nome completo do servidor avaliado, com matrícula funcional e cargo em tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`).
2. **NFC Gatilho de Origem**: Exibição da nota consolidada que motivou a abertura do plano, com valor numérico em `font-mono tabular-nums` e cor de destaque.
3. **Acompanhamento de Ações Acordadas**: Exibição da quantidade e percentual de ações já cumpridas em relação ao total pactuado no plano.
4. **Alertas Semânticos de Prazos**:
   - Prazos expirados são identificados com badge vermelho ("Vencido");
   - Prazos com vencimento em até 30 dias são identificados com badge âmbar ("Vence em breve");
   - Prazos regulares são identificados com badge neutro/informativo.
5. **Filtros e Paginação**:
   - Busca textual por nome do servidor, matrícula, objetivos ou ciclo;
   - Filtro por status (Aberto, Em Andamento, Concluído, Verificado, Cancelado ou Todos);
   - Filtro por urgência de prazo (Todos, Vencidos, A Vencer em 30 dias, No Prazo);
   - Paginação configurável com seletor de registros por página (`pageSizeSelector`).

#### Scenario: Filtragem por planos com prazo vencido
- **WHEN** o gestor seleciona o filtro de urgência "Vencidos"
- **THEN** a tabela exibe exclusivamente os planos cuja data limite é anterior à data corrente e cujo status não seja "verificado" ou "cancelado"

#### Scenario: Busca textual por matrícula do servidor
- **WHEN** o usuário digita a matrícula funcional "10042" no campo de busca
- **THEN** a listagem filtra instantaneamente o plano correspondente ao referido servidor, exibindo seus objetivos e status atual

### Requirement: Modal de Verificação de Evolução com Comparativo e Análise de Superação
Ao acionar o registro de verificação de evolução de um PMD, o sistema SHALL abrir um modal assistido que apresenta comparativo analítico entre a nota anterior e a nova nota apurada:
1. **Painel Comparativo**: Exibe a NFC Gatilho de origem ao lado da Nova NFC informada pelo usuário.
2. **Cálculo Automático de Variação (Delta)**: O sistema calcula e exibe em tempo real a diferença de pontuação em `font-mono tabular-nums` com sinalização positiva ou negativa.
3. **Diagnóstico de Superação**: Informa claramente se a nova nota atinge o patamar mínimo regulamentar (≥ 70,00 pontos na escala 0–100 ou ≥ 7,0 na escala 0–10) para desobstrução da progressão funcional.
4. **Parecer Circunstanciado**: Campo estruturado para registro formal das justificativas, observações da chefia imediata e evidências de desenvolvimento.

#### Scenario: Registro de evolução com superação da nota de corte
- **WHEN** o gestor informa a nova nota "76,50" para um PMD cuja nota gatilho era "62,00"
- **THEN** o modal exibe indicador em verde "+14,50 pts", confirma o status "Apto à Superação (NFC ≥ 70,00)" e habilita a conclusão da verificação

#### Scenario: Registro de evolução sem atingimento da nota de corte
- **WHEN** o gestor informa a nova nota "66,00" para um PMD cuja nota gatilho era "60,00"
- **THEN** o modal exibe o delta "+6,00 pts", porém adverte que a pontuação permanece abaixo da nota de corte, orientando a continuidade das medidas de apoio funcional

### Requirement: Exportação de Relatório de PMD para Auditoria e Comissão CAD
O painel de acompanhamento de PMD SHALL disponibilizar ferramenta de exportação de dados em formato CSV, permitindo que a Comissão CAD e a gestão de pessoal auditem as intervenções realizadas:
1. A exportação contempla todos os registros filtrados na visão ativa.
2. O arquivo gerado deve conter cabeçalhos em português (ex.: ID, Servidor, Matrícula, Cargo, Ciclo de Origem, NFC Gatilho, Objetivos, Prazo, Status, Ações Concluídas, Nova NFC, Data Verificação).
3. O arquivo DEVE ser formatado com codificação UTF-8 com BOM (`\uFEFF`) para compatibilidade nativa com o Excel e suítes de escritório.

#### Scenario: Download da planilha de acompanhamento
- **WHEN** o gestor clica no botão "Exportar CSV"
- **THEN** o sistema realiza o download automático do arquivo `acompanhamento_pmd_capd_{data}.csv` com os dados sanitizados e prontos para conferência

### Requirement: Painel Executivo e Métricas de Integração RH
O sistema DEVE apresentar no topo da aba "Integrações RH & Embed" um painel executivo composto por cartões de métricas analíticas (`StatCard` do `@sysgov/ui`), consolidando a saúde das integrações com os sistemas legados de folha e portais embutidos.

#### Scenario: Visualização consolidada de indicadores de integração
- **WHEN** o gestor de RH acessa a sub-aba "Integrações RH & Embed" do Portal do RH
- **THEN** o sistema exibe os cartões com o total de conectores ativos por driver, o total acumulado de sincronizações, a taxa percentual de sucesso das operações e o número de tokens de embed ativos, formatando valores e percentuais em `JetBrains Mono`.

#### Scenario: Tratamento de ausência de conexões configuradas
- **WHEN** o município ainda não possui nenhum conector ERP cadastrado
- **THEN** o sistema exibe os contadores zerados de forma graciosa e um estado descritivo orientando a inclusão do primeiro conector.

---

### Requirement: Gestão e Configuração de Conectores ERP
O sistema DEVE permitir a listagem, criação, edição, teste de conectividade e rotação segura de chave de API para conectores de sistemas de RH e folha de pagamento municipais (Betha, IPM, Senior, TOTVS e REST Genérico).

#### Scenario: Listagem e status operacional dos conectores
- **WHEN** o usuário visualiza a seção de conectores cadastrados
- **THEN** o sistema lista cada conector com seu nome amigável, driver correspondente, URL base, status (Ativo/Inativo), contagem de registros processados e indicador de última sincronização.

#### Scenario: Cadastro de novo conector com validação
- **WHEN** o usuário aciona "Novo Conector" e submete os dados de configuração obrigatórios (nome, driver, URL base, periodicidade)
- **THEN** o conector é cadastrado com credenciais criptografadas e passa a figurar na listagem de integrações disponíveis.

#### Scenario: Rotação segura de API Key
- **WHEN** o usuário solicita a regeneração da chave de autenticação de um conector existente
- **THEN** o sistema exige confirmação explícita através de diálogo modal (`ConfirmDialog`), gera uma nova chave aleatória, invalida a anterior e exibe a nova credencial com opção de cópia imediata.

---

### Requirement: Trilha de Auditoria e Logs de Sincronização
O sistema DEVE registrar e exibir o histórico cronológico de execuções de sincronização (`RhSyncLog`), permitindo filtragem multicritério e inspeção detalhada do payload processado.

#### Scenario: Filtragem analítica do histórico de logs
- **WHEN** o gestor pesquisa logs de sincronização aplicando filtros por tipo de dado (servidores, frequência, afastamentos, homologação), direção (inbound/outbound) ou status de execução
- **THEN** o sistema filtra os registros na tabela analítica (`DataTable`), exibindo data/hora, quantidade de registros afetados em `JetBrains Mono` e o status da rotina.

#### Scenario: Inspeção do detalhe do log
- **WHEN** o gestor clica para inspecionar um log que resultou em falha ou inconsistência
- **THEN** o sistema abre um modal apresentando o traceback do erro, a mensagem retornada pelo conector e o payload recebido formatado.

---

### Requirement: Emissão, Gerenciamento e Simulação de Tokens de Embed
O sistema DEVE fornecer ferramenta visual para o DRH emitir tokens seguros de incorporação headless (`CapdEmbedController`), gerando snippets prontos para `<iframe>` e simulador sandbox para teste em tempo real.

#### Scenario: Geração de token de embed parametrizado
- **WHEN** o operador escolhe o módulo de incorporação (autoavaliação, diário de bordo, espelho avaliativo ou recurso), define o tempo de expiração (TTL em minutos) e solicita a emissão do token
- **THEN** o sistema gera o token criptográfico, monta a URL pública segura e gera o código HTML do `<iframe>` com atributos de sandbox recomendados.

#### Scenario: Cópia rápida do snippet de incorporação
- **WHEN** o operador clica no botão "Copiar Código HTML"
- **THEN** o código do snippet é transferido para a área de transferência do navegador e um alerta visual de sucesso é exibido.

#### Scenario: Pré-visualização e teste no simulador sandbox
- **WHEN** o operador alterna para a aba "Simulador Sandbox"
- **THEN** o sistema carrega a URL de embed em um container simulado, permitindo validar a responsividade e o comportamento da interface incorporada sem sair do Portal do RH.

### Requirement: Painel de Indicadores e KPIs de Controle Interno
O Portal de Auditoria e Controle Interno DEVE exibir, no topo da interface, uma esteira consolidada de indicadores de conformidade administrativa através de cartões analíticos (`StatCard` do `@sysgov/ui`), com métricas formatadas em `JetBrains Mono` (`font-mono tabular-nums`).

#### Scenario: Visualização do panorama geral de controle interno
- **WHEN** o auditor municipal ou analista de controle interno acessa o portal
- **THEN** o sistema exibe os cartões com o total de impedimentos ativos, registros gravados na trilha forense, total de avaliações em escrutínio amostral/notas extremas e índice de integridade das assinaturas criptográficas (100%).

---

### Requirement: Gestão e Homologação de Impedimentos e Conflitos de Interesse
O sistema DEVE permitir a fiscalização, declaração, homologação e eventual desativação fundamentada de impedimentos e suspeições por parentesco até o 3º grau (Art. 31 da Lei nº 1.704/2006).

#### Scenario: Listagem analítica de impedimentos cadastrados
- **WHEN** o auditor consulta a aba "Impedimentos & Parentesco"
- **THEN** o sistema exibe tabela analítica (`DataTable`) contendo o servidor avaliado, o substituto legal designado, o tipo de parentesco/impedimento, a data de lavratura e o status operacional.

#### Scenario: Homologação e desativação com justificativa do controle interno
- **WHEN** o auditor altera o status de um impedimento (ex: cessação do vínculo ou erro formal)
- **THEN** o sistema exige justificativa administrativa formal e registra o evento na trilha de auditoria imutável sem diálogos nativos do navegador.

---

### Requirement: Fila de Amostragem Regulatória e Trava Anti-Leniência
O sistema DEVE disponibilizar uma fila analítica de fiscalização para avaliações selecionadas por sorteio amostral (percentual mínimo de 10%) ou por enquadramento na trava anti-leniência (notas extremas de Grau 1 ou Grau 5 / pontuação < 4.00 ou >= 9.50).

#### Scenario: Inspeção de notas extremas contra o Diário de Bordo (CIT)
- **WHEN** o auditor inspeciona uma avaliação da fila de amostragem que recebeu nota extrema
- **THEN** o sistema apresenta a árvore de fatores avaliados e cruza com os incidentes críticos lançados previamente no Diário de Bordo daquele servidor, acusando se há fundamentação fática satisfatória.

#### Scenario: Emissão de parecer de auditoria
- **WHEN** o auditor conclui a análise de uma avaliação da amostra
- **THEN** o sistema permite registrar o parecer formal (Aprovado / Reavaliação Solicitada / Diligência Aberta), arquivando o despacho com assinatura eletrônica.

---

### Requirement: Trilha Forense Imutável e Verificador Criptográfico SHA-256
O sistema DEVE registrar de forma contínua todos os eventos críticos do ciclo de avaliação com carimbo UTC-3, IP do agente e assinatura em hash SHA-256, disponibilizando ferramenta visual de validação de autenticidade documental.

#### Scenario: Validação de hash criptográfico de documentos e atas
- **WHEN** o auditor submete um hash SHA-256 no campo de verificação de autenticidade
- **THEN** o sistema localiza a assinatura correspondente na base imutável, atesta a validade do registro e exibe o selo digital de conformidade com os metadados do evento.

#### Scenario: Exportação de dossiê de auditoria para Tribunais de Contas
- **WHEN** o auditor aciona a exportação da trilha forense
- **THEN** o sistema gera arquivo estruturado (CSV/JSON) com todas as evidências, assinaturas e carimbos de tempo para instrução perante órgãos de controle externo.

---

### Requirement: Trilha de Acessos a Dados Pessoais e Conformidade LGPD
O sistema DEVE monitorar e registrar as consultas aos prontuários e notas individuais dos servidores públicos, prevenindo vazamentos e garantindo a observância da Lei Geral de Proteção de Dados (LGPD).

#### Scenario: Consulta aos registros de visualização de notas
- **WHEN** o auditor acessa a aba "Conformidade LGPD & Acessos"
- **THEN** o sistema exibe o histórico de operadores que visualizaram notas, relatórios ou espelhos de servidores com data, horário e justificativa de acesso.

## Invariants

### Invariant: Avaliação homologada é imutável
<!-- entities: Avaliacao -->
<!-- enforced: Avaliacao.booted() -->
<!-- verified_by: EspelhoCompletoTest -->

Uma `Avaliacao` cujo valor original de `homologada` seja `true` SHALL rejeitar qualquer update,
lançando `DomainException` no hook `updating` do modelo (RN-C07). A transição
`false → true` dispara uma única vez o evento `AvaliacaoHomologada`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda tabela e modelo do CAPD é isolado por tenant
<!-- entities: Avaliacao, CicloAvaliacao, Pergunta, ModeloFormulario, ModeloFatorPeso, DiarioBordo, Evidencia, Servidor, ConsolidacaoTrienal, Quinquenio, PlanoMelhoria, Recurso, Comissao, Sessao, PendenciaHierarquia -->
<!-- enforced: App\Models\Concerns\TenantAware -->
<!-- verified_by: TenantIsolationTest.test_capd_entries_are_strictly_isolated_between_tenants() -->

Todo modelo de negócio do módulo SHALL usar o trait `TenantAware`, que aplica o global scope
`tenant` em leitura e preenche `tenant_id` na criação. O `tenant_id` é resolvido server-side
pelo `TenantContext` (middleware `ResolveTenant`) e nunca aceito do cliente. Dados do tenant A
jamais são visíveis ou mutáveis a partir do tenant B, e a criação de registro sem contexto de
tenant falha.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Notas e valores decimais nunca trafegam como float
<!-- entities: Avaliacao, CicloAvaliacao, ConsolidacaoTrienal -->
<!-- enforced: CalculadoraNotaService.calcular() -->
<!-- verified_by: NotaCalculoServiceTest -->

`nota_final`, `nota_corte_nfc`, `quinquenio_percentual` e a NFC SHALL ser castados como string
(DECIMAL) e toda a aritmética de notas SHALL usar bcmath com precisão interna 10, arredondando
para 2 casas apenas na saída — garantindo resultados idênticos entre servidores, ciclos e
planos para fins de auditabilidade.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Integrações externas do CAPD são sempre assíncronas via Outbox
<!-- entities: CicloAvaliacao, Avaliacao, ConsolidacaoTrienal, PendenciaHierarquia -->
<!-- enforced: HomologacaoLoteService.homologarCiclo() -->
<!-- verified_by: OutboxWebhookHomologacaoTest -->

Nenhum controller ou service do CAPD SHALL fazer chamada externa síncrona (RH/Folha/IPM). Todo
efeito externo é publicado em `outbox_events` — `capd.ciclo_homologado`, `capd.nfc.consolidada`,
`CapdAvaliacaoSuspensaLicenca`, `CapdPendenciaHierarquiaCriada`.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: Toda mutação do CAPD é auditada
<!-- entities: Avaliacao, CicloAvaliacao, ModeloFormulario, Pergunta, DiarioBordo, Evidencia, ConsolidacaoTrienal, PendenciaHierarquia -->
<!-- enforced: App\Support\AuditLogger.record() -->

Criação, alteração, submissão, homologação, consolidação e exclusão SHALL gravar registro em
`audit_logs` com módulo `capd`, ação nomeada (`ciclo.criado`, `avaliacao.submetida`,
`ciclo.homologado`, `pergunta.salva`, `evidencia.uploaded`, `nfc.consolidada`, ...), estado
anterior/posterior, usuário, IP e timestamp.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: O avaliador é sempre reconferido contra a hierarquia real
<!-- entities: Avaliacao, Servidor, Impedimento, NivelHierarquia -->
<!-- enforced: AvaliacaoPolicy.avaliar() -->
<!-- verified_by: AvaliacaoPolicyHierarquiaTest -->

A autorização para avaliar SHALL recalcular o superior imediato via
`HierarquiaService.resolverAvaliador()` no momento da ação, nunca confiando apenas no
`avaliador_id` gravado na avaliação, e SHALL negar quando a resolução estiver pendente ou a
avaliação já estiver homologada. Um servidor jamais é avaliador de si mesmo.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

### Invariant: A UI do CAPD usa apenas primitivas do design system compartilhado
<!-- entities: MatrizEscalaGrafica, AvaliacaoFormView, PortalServidorView, PortalAvaliadorView -->
<!-- enforced: apps/web-client/src/modules/capd -->

Os painéis e portais do CAPD SHALL compor exclusivamente primitivas de `@sysgov/ui`
(`Modal`, `Button`, `Badge`, `KpiCard`, `AlertCard`, `StatusChip`), sem `alert()` ou
`window.confirm()` nativos, e SHALL exibir dados numéricos/técnicos em `font-mono tabular-nums`.
A matriz de avaliação renderiza exatamente 5 colunas de grau, e o gate visual de justificativa
para graus 1, 2 e 5 (mínimo 50 caracteres, `AvaliacaoFormView.GRAUS_EXTREMOS`) é auxílio de UX —
a decisão vinculante continua no backend.

> Last verified: 2026-09-19 (commit 2bd3aae)

---

<!-- uncertainty: O CLAUDE.md do repositório descreve a Trava Antileniência como aplicável aos "Grade 1 e Grade 5". O código aplica a trava aos graus 1, 2 e 5 em três pontos independentes (CalculadoraNotaService.calcular(), PerguntaService.validarRespostas(), CicloAvaliacao.getRegras()['trava_graus_evidencia']) e os testes TravaElectronicaTest confirmam o bloqueio do grau 2. A spec segue o código. -->
<!-- uncertainty: Existem duas travas com critérios diferentes. TravaElectronicaService exige CIT vinculado ao MESMO fator e com Evidencia de hash_sha256 não nulo; PerguntaService.validarRespostas() exige apenas a existência de qualquer DiarioBordo para (servidor, ciclo), sem checar fator nem evidência. Não foi possível determinar pelo código se a divergência é intencional (camadas distintas) ou drift. -->
<!-- uncertainty: Existem dois motores de nota coexistindo — CalculadoraNotaService (fator/ModeloFatorPeso, usado por AvaliacaoController.submeter(), corte 7,00 em escala 0-10) e PerguntaService.calcularNota() (pergunta/grupo_key com pesos de grupo, mesmo corte 7,00), além de NotaCalculoService.calcularNotaCiclo() em escala 0-100 com corte NFC 70,00. Os cortes 7,00 e 70,00 convivem em escalas diferentes; não foi possível confirmar no código qual é o caminho canônico para o ciclo produtivo. -->
<!-- uncertainty: Avaliacao.servidor_id referencia users.id na maior parte do fluxo, mas CicloService.consolidarNfcTrienal() usa `$servidor->user_id ?? $servidor->id` e valida faltas com `$servidor->user_id ?? 0`. A chave efetiva não é uniforme entre os serviços. -->
<!-- deferred: Services/{RhIntegrationService,IngestaoAutomaticaService,PainelGerencialService,AuditoriaSamplagemService,SorteioRelatorService,HashAtaService,EmbedTokenService,QuinquenioService,AvaliacaoUsuarioService,NotificacaoService,ServidorService}.php, Http/Controllers/{RecursoController,SessaoController,DeliberacaoController,ComissaoController,ConsolidacaoController,DashboardController,PainelGerencialController,QuinquenioController,NivelHierarquiaController,PendenciaHierarquiaController,EscalaGraficaController,FatorController,AvaliacaoUsuarioController,Api/*}.php, Database/Seeders/CapdDadosDemonstracaoSeeder.php, apps/web-client/src/modules/capd/views/{PortalRhView,PortalCadView,PortalAuditoriaView}.tsx -->
