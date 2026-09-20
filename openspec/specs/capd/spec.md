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
até `+2`, no mesmo tenant. A elegibilidade compara a NFC à `nota_corte_nfc` do ciclo (padrão
`70.00`, parametrizável pela Comissão) e o conceito sai das faixas configuráveis
(Excelente/Bom/Regular/Insuficiente). O resultado é publicado assincronamente como
`capd.nfc.consolidada` via Outbox e auditado.

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

---

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
