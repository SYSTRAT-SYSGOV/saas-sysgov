# Avaliacao (i-Educar legado), Design Técnico

> Descreve o **COMO** o subsistema de avaliação legado é construído, com base no código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do domínio legado

| Entidade | Chave | Atributos observados | Fonte |
|----------|-------|----------------------|-------|
| Regra de avaliação | `id` | instituição, nome, fórmula de média, fórmula de recuperação, tipo de nota, tipo de progressão, tipo de presença, pontos, tipo de recuperação paralela, tabela de arredondamento, tabela conceitual, regra diferenciada, parecer descritivo, nota geral por etapa, média, média de recuperação, porcentagem de presença, reprovação automática, quantidade de dependências | 🟢 `app/Models/LegacyEvaluationRule.php:43-65` |
| Regra por série e ano | `serie_id` | regra de avaliação, regra de avaliação diferenciada, ano letivo | 🟢 `app/Models/LegacyEvaluationRuleGradeYear.php:10-24` |
| Nota por componente | `id` | nota do aluno, componente curricular, nota, nota arredondada, etapa, nota de recuperação, nota original, nota de recuperação específica | 🟢 `app/Models/LegacyDisciplineScore.php:12-24` |
| Nota geral | — | nota do aluno, nota, nota arredondada, etapa | 🟢 `app/Models/LegacyGeneralScore.php:11-18` |
| Nota de exame | `ref_cod_matricula` | matrícula, componente curricular, nota de exame | 🟢 `app/Models/LegacyScoreExam.php:11-20` |
| Média por componente | `nota_aluno_id` | componente curricular, média, média arredondada, etapa, situação, bloqueada | 🟢 `app/Models/LegacyDisciplineScoreAverage.php:12-19` |
| Nota do aluno | `matricula_id` | vínculo da matrícula, notas gerais, notas por disciplina, médias | 🟢 `app/Models/LegacyStudentScore.php:11-21` |
| Falta por aluno | — | matrícula, etapa, quantidade | 🟢 `ieducar/modules/Avaliacao/Model/FaltaAluno.php` |
| Falta por componente | — | componente curricular, etapa, quantidade | 🟢 `ieducar/modules/Avaliacao/Model/FaltaComponente.php` |
| Falta geral | — | matrícula, etapa, quantidade | 🟢 `ieducar/modules/Avaliacao/Model/FaltaGeral.php` |
| Parecer por aluno | — | matrícula, etapa, parecer | 🟢 `ieducar/modules/Avaliacao/Model/ParecerDescritivoAluno.php` |
| Parecer por componente | — | componente curricular, etapa, parecer | 🟢 `ieducar/modules/Avaliacao/Model/ParecerDescritivoComponente.php` |
| Tabela de arredondamento | — | vínculo da regra, valores | 🟢 `app/Models/LegacyRoundingTable.php` |
| Valor de arredondamento | — | nome, valor máximo, descrição | 🟢 `app/Models/LegacyValueRoundingTable.php` |
| Fórmula de média | — | expressão da fórmula | 🟢 `app/Models/LegacyAverageFormula.php` |
| Regra de recuperação | — | vínculo da regra, componente, tipo | 🟢 `app/Models/LegacyRemedialRule.php` |

### Eixos de granularidade do lançamento

O subsistema de lançamento resolve três eixos de granularidade, com uma entidade para cada combinação. 🟢 `ieducar/modules/Avaliacao/Model/`

| Eixo | Aluno | Componente | Geral |
|------|-------|------------|-------|
| Nota | `NotaAluno` | `NotaComponente` | `NotaGeral` |
| Falta | `FaltaAluno` | `FaltaComponente` | `FaltaGeral` |
| Parecer | `ParecerDescritivoAluno` | `ParecerDescritivoComponente` | `ParecerDescritivoGeral` |

### Domínio da recuperação paralela

| Valor | Constante | Significado | Fonte |
|-------|-----------|-------------|-------|
| 0 | `PARALLEL_REMEDIAL_NONE` | Sem recuperação paralela | 🟢 `app/Models/LegacyEvaluationRule.php:31` |
| 1 | `PARALLEL_REMEDIAL_PER_STAGE` | Recuperação por etapa | 🟢 `LegacyEvaluationRule.php:33` |
| 2 | `PARALLEL_REMEDIAL_PER_SPECIFIC_STAGE` | Recuperação em etapa específica | 🟢 `LegacyEvaluationRule.php:35` |
| 1 | `PARALLEL_REMEDIAL_REPLACE_SCORE` | Substitui a nota | 🟢 `LegacyEvaluationRule.php:37` |
| 2 | `PARALLEL_REMEDIAL_AVERAGE_SCORE` | Média entre nota e recuperação | 🟢 `LegacyEvaluationRule.php:38` |
| 3 | `PARALLEL_REMEDIAL_SUM_SCORE` | Soma das notas | 🟢 `LegacyEvaluationRule.php:41` |

### Endpoints HTTP

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| POST | `/intranet/educar_avaliacao_nota_cad.php` | `matricula`, `componenteCurricular`, `etapa`, `nota`, `falta`, `parecer` | Redirect para o boletim | Processo 642, nível somente escola 🟢 `ieducar/modules/Avaliacao/Views/NotaController.php:11-12` |
| POST | `/intranet/educar_avaliacao_falta_cad.php` | `matricula`, `etapa`, `falta` | Redirect para o boletim | Processo 642, nível somente escola 🟢 `ieducar/modules/Avaliacao/Views/FaltaController.php:11-13` |
| POST | `/intranet/educar_avaliacao_parecer_cad.php` | `matricula`, `etapa`, `parecer` | Redirect para o boletim | 🟢 `ieducar/modules/Avaliacao/Views/ParecerController.php` |
| GET | `/module/Api/Diario*` | matrícula, componente, etapa | Diário de classe | API com 1.989 linhas 🟡 `ieducar/modules/Avaliacao/Views/DiarioApiController.php` |
| GET | `/module/Api/Promocao*` | matrícula | Resultado da promoção | API com 566 linhas 🟡 `ieducar/modules/Avaliacao/Views/PromocaoApiController.php` |
| GET | `/api/resource/evaluation-rules` | filtros | Coleção simples de regra | 🟢 `app/Http/Controllers/Api/Resource/EvaluationRule/ResourceEvaluationRuleController.php` |

### Funções e classes

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `Avaliacao_Service_Boletim::getSituacaoAluno` | `()` | `int` | Situação apurada do estudante 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:829` |
| `Avaliacao_Service_Boletim::getSituacaoNotas` | `($calcularSituacaoAluno = false)` | `array` | Situação por componente 🟢 `Boletim.php:936` |
| `Avaliacao_Service_Boletim::getSituacaoFaltas` | `($ignorarSeriesCiclo = false)` | `array` | Situação por componente, com base nas faltas 🟢 `Boletim.php:1214` |
| `Avaliacao_Service_Boletim::getSituacaoNotaFalta` | `($flagSituacaoNota, $flagSituacaoFalta)` | `int` | Combinação das duas situações 🟢 `Boletim.php:625` |
| `Avaliacao_Service_Boletim::getMediaComponente` | `($id)` | `mixed` | Média do componente 🟢 `Boletim.php:110` |
| `Avaliacao_Service_Boletim::getNotaGeral` | `($etapa = 1)` | `mixed` | Nota geral da etapa 🟢 `Boletim.php:129` |
| `Avaliacao_Service_Boletim::getFalta` | `($etapa = 1, $id = null)` | `mixed` | Falta da etapa 🟢 `Boletim.php:149` |
| `Avaliacao_Service_Boletim::getParecerDescritivo` | `($etapa = 1, $id = null)` | `mixed` | Parecer da etapa 🟢 `Boletim.php:179` |
| `Avaliacao_Service_Boletim::arredondaNota` | `($nota)` | `mixed` | Arredondamento pela tabela 🟢 `Boletim.php:2272` |
| `Avaliacao_Service_Boletim::arredondaMedia` | `($media, $componenteId = null)` | `mixed` | Arredondamento da média 🟢 `Boletim.php:2335` |
| `Avaliacao_Service_Boletim::preverNotaRecuperacao` | `($id)` | `mixed` | Nota prevista na recuperação 🟢 `Boletim.php:2374` |
| `Avaliacao_Service_Boletim::promover` | `($novaSituacaoMatricula = null)` | `mixed` | Promoção do estudante 🟢 `Boletim.php:2715` |
| `Avaliacao_Service_Boletim::alterarSituacao` | `($novaSituacao, $matriculaId)` | `mixed` | Alteração da situação da matrícula 🟢 `Boletim.php:2904` |
| `Avaliacao_Service_Boletim::addNota` | `(NotaComponente)` | `void` | Lançamento de nota 🟢 `Boletim.php:1921` |
| `Avaliacao_Service_Boletim::addFalta` | `(FaltaAbstract)` | `void` | Lançamento de falta 🟢 `Boletim.php:1968` |
| `Avaliacao_Service_Boletim::addParecer` | `(ParecerDescritivoAbstract)` | `void` | Lançamento de parecer 🟢 `Boletim.php:2002` |
| `Avaliacao_Service_Boletim::save` | `()` | `void` | Persistência dos lançamentos 🟢 `Boletim.php:2581` |
| `Avaliacao_Service_Boletim::calculateStageScore` | `($stage, $score, $remedial)` | `float` | Recuperação paralela por etapa 🟢 `Boletim.php:3394-3417` |
| `Avaliacao_Service_Boletim::getEvaluationRule` | `()` | `LegacyEvaluationRule` | Regra em cache de cinco minutos 🟢 `Boletim.php:3377-3386` |
| `Avaliacao_Service_Boletim::allowsApproveWithDependence` | `($novaSituacao)` | `bool` | Avaliação da aprovação com dependência 🟢 `Boletim.php:3427-3468` |
| `Avaliacao_Service_Boletim::getCargaHoraria` | `($registration, $ignorarSeriesCiclo)` | `int` | Carga horária, com soma do ciclo 🟢 `Boletim.php:3471-3487` |
| `StageScoreCalculationService::calculateAverageBetweenScoreAndRemedial` | `($score, $remedial)` | `float` | Média entre nota e recuperação 🟢 `app/Services/StageScoreCalculationService.php:5-11` |
| `StageScoreCalculationService::calculateSumScore` | `($score, $remedial)` | `float` | Soma das notas 🟢 `StageScoreCalculationService.php:13-20` |
| `StageScoreCalculationService::calculateRemedial` | `($score, $remedial)` | `float` | Maior entre nota e recuperação 🟢 `StageScoreCalculationService.php:22-29` |
| `LegacyEvaluationRule::isAverageBetweenScoreAndRemedialCalculation` | `()` | `bool` | Regra de média entre nota e recuperação 🟢 `app/Models/LegacyEvaluationRule.php:99-103` |
| `LegacyEvaluationRule::isGeneralAbsence` | `()` | `bool` | Presença geral 🟢 `LegacyEvaluationRule.php:126-129` |
| `LegacyEvaluationRule::hasOpinion` | `()` | `bool` | Regra com parecer descritivo 🟢 `LegacyEvaluationRule.php:131-134` |
| `LegacyEvaluationRule::isGeneralScore` | `()` | `bool` | Nota geral por etapa 🟢 `LegacyEvaluationRule.php:136-139` |
| `LegacyDisciplineScore::score` | `($decimalPlaces, $isGeneralAbsence, $rounded)` | `string\|float\|null` | Nota formatada 🟢 `app/Models/LegacyDisciplineScore.php:26-36` |
| `LegacyDisciplineScore::recoveryScore` | `($decimalPlaces, $isGeneralAbsence)` | `?string` | Nota de recuperação 🟢 `LegacyDisciplineScore.php:43-52` |
| `LegacyDisciplineScoreAverage::average` | `($decimalPlaces)` | `string\|float\|null` | Média formatada 🟢 `app/Models/LegacyDisciplineScoreAverage.php:23-30` |

---

## Fluxo Principal

1. A secretaria abre a tela de lançamento de nota, que carrega o serviço de boletim e resolve a regra de avaliação da matrícula. 🟢 `ieducar/modules/Avaliacao/Views/NotaController.php:22-38`
2. A etapa é determinada pela quantidade de notas já lançadas do componente, quando não é informada. 🟢 `NotaController.php:51-61`
3. A lista de valores possíveis da nota é montada a partir da tabela de arredondamento da regra, conforme o tipo de nota. 🟢 `NotaController.php:82-95`
4. O campo de falta só é exibido quando a regra define presença por componente, e o de parecer só quando a regra define parecer por etapa e por componente. 🟢 `NotaController.php:96-102`
5. A nota é gravada, e a falta e o parecer são gravados junto quando a regra os habilita. 🟢 `NotaController.php:115-135`
6. O serviço persiste os lançamentos e recalcula as médias. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:2581-2670`
7. A apuração combina a situação por nota e a situação por falta, e produz a situação do estudante. 🟢 `Boletim.php:625` e `:829`
8. A promoção cria a matrícula do ano seguinte, com a série de destino apurada. 🟢 `Boletim.php:2715`

---

## Fluxos Alternativos

- **Nota em valor conceitual:** a lista de valores é montada pelo valor máximo e pela descrição da tabela, e não pelo nome. 🟢 `NotaController.php:85-92`
- **Regra de presença geral:** o campo de falta por componente não é exibido, e a falta é apurada de forma geral. 🟢 `app/Models/LegacyEvaluationRule.php:126-129`
- **Regra sem parecer descritivo:** o campo de parecer não é exibido, e o parecer não é gravado. 🟢 `NotaController.php:126-135`
- **Recuperação em etapa específica:** a nota original é preservada e a recuperação paralela não é aplicada. 🟢 `Boletim.php:3402-3404`
- **Nota de exame final:** a etapa `Rc` é devolvida como exame e não sofre recuperação. 🟢 `Boletim.php:3396-3398` e `NotaController.php:76`
- **Recuperação por soma:** o resultado é a soma das notas quando há recuperação, e o dobro da nota quando não há. 🟢 `StageScoreCalculationService.php:13-20`
- **Regime cíclico:** a carga horária apurada é a soma das cargas horárias de todas as matrículas do ciclo. 🟢 `Boletim.php:3471-3487`
- **Aprovação com dependência recusada:** a série é concluinte com reprovação institucional, o estudante já tem dependência, a nova situação não é reprovado, a regra não admite dependência, ou as reprovações excedem o limite. 🟢 `Boletim.php:3433-3468`
- **Exclusão de lançamento com histórico:** a exclusão é recusada quando há lançamentos em etapas anteriores. 🟢 `Boletim.php:3171` e `:3285`
- **Falha na gravação do lançamento:** a tela exibe a mensagem de erro de preenchimento e a gravação é revertida. 🟢 `NotaController.php:136-142`
- **Regra em cache:** a regra de avaliação é reutilizada por cinco minutos, o que mantém a apuração estável frente a edições concorrentes. 🟢 `Boletim.php:3381-3385`

---

## Dependências

- **Série (`pmieducar.serie`):** origem do vínculo com a regra de avaliação e da carga horária. 🟢 `app/Models/LegacyGrade.php:88-122`
- **Matrícula (`pmieducar.matricula`):** origem da situação, do ano e do estudante avaliado. 🟢 `app/Models/LegacyRegistration.php`
- **Componente curricular (`modules.componente_curricular`):** eixo de granularidade das notas, das faltas e dos pareceres. 🟢 `app/Models/LegacyDisciplineScore.php:29-32`
- **Turma (`pmieducar.turma`):** origem da etapa e do contexto de lançamento. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:58-86`
- **Módulo de arredondamento (`modules.tabela_arredondamento`):** origem do arredondamento de nota e de média. 🟢 `app/Models/LegacyEvaluationRule.php:77-89`
- **Módulo de fórmula (`modules.formula_media`):** origem da fórmula de média e de recuperação. 🟢 `LegacyEvaluationRule.php:162-175`
- **Regra de recuperação paralela (`modules.regra_recuperacao_paralela`):** origem do tipo e do modo de cálculo. 🟢 `LegacyEvaluationRule.php:70-73`
- **Escola (`pmieducar.escola`):** origem do sinalizador de regra diferenciada, que altera a regra aplicável. 🟢 `app/Models/LegacySchoolClass.php:656`
- **Instituição (`pmieducar.instituicao`):** origem da regra de reprovação em ano concluinte. 🟢 `Boletim.php:3434`
- **Diário de classe (`iDiarioService`):** origem da carga horária e dos dias letivos da etapa. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php`
- **Regime cíclico (`CyclicRegimeService`):** origem das matrículas do ciclo, para a apuração da carga horária. 🟢 `Boletim.php:3477-3485`
- **Sequência de séries (`pmieducar.sequencia_serie`):** origem da série de destino na promoção. 🟢 `app/Models/LegacyGradeSequence.php:27-30`

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Regra de avaliação normalizada por série e por ano letivo, com regra padrão e diferenciada | `app/Models/LegacyEvaluationRuleGradeYear.php:10-24` | 🟢 |
| Três eixos de granularidade de lançamento, com uma entidade por combinação | `ieducar/modules/Avaliacao/Model/` | 🟢 |
| Nota armazenada em três campos, preservando o valor original ao lado do arredondado | `app/Models/LegacyDisciplineScore.php:12-21` | 🟢 |
| Média calculada e persistida por etapa, com situação e trava de edição | `app/Models/LegacyDisciplineScoreAverage.php:12-19` | 🟢 |
| Recuperação paralela como trio de tipo e de modo de cálculo, avaliado por cadeia de condições | `app/Models/LegacyEvaluationRule.php:99-124` e `Boletim.php:3400-3416` | 🟢 |
| Recuperação paralela isolada em serviço próprio, sem acesso a banco | `app/Services/StageScoreCalculationService.php` | 🟢 |
| Nota de exame final identificada por etapa `Rc`, com regra de exclusão da recuperação | `ieducar/modules/Avaliacao/Service/Boletim.php:3396-3398` | 🟢 |
| Arredondamento por tabela de valores, e não por arredondamento numérico | `ieducar/modules/Avaliacao/Service/Boletim.php:2272` | 🟢 |
| Regra de avaliação lida de cache por cinco minutos | `Boletim.php:3381-3385` | 🟢 |
| Dependência de aprovação com dependência avaliada por contagem de disciplinas reprovadas | `Boletim.php:3455-3468` | 🟢 |
| Carga horária do regime cíclico apurada por soma das matrículas do ciclo | `Boletim.php:3471-3487` | 🟢 |
| Situação da matrícula alterada a partir da apuração, pelo serviço de boletim | `Boletim.php:2904` | 🟢 |
| Lançamento de nota, de falta e de parecer em uma única gravação, conforme a regra | `ieducar/modules/Avaliacao/Views/NotaController.php:115-135` | 🟢 |
| Exclusão de lançamento condicionada à verificação das etapas anteriores | `Boletim.php:3171` e `:3285` | 🟢 |
| Coexistência da camada legada procedural e da camada Eloquent para os mesmos dados | `_reversa_sdd/Avaliacao/legacy-mapping.md`, seção 2 | 🟢 |
| Fórmulas de média interpretadas em tempo de execução | `_reversa_sdd/Avaliacao/legacy-mapping.md`, seção 2 | 🟢 |

---

## Estado Interno

O subsistema é **com estado próprio**, com o estado de lançamento persistido em tabelas por eixo de granularidade, e o estado apurado em memória durante o ciclo de vida da requisição. 🟢

Campos de estado observados:

- `nota`, `nota_arredondada` e `nota_original` na nota por componente, que preservam o bruto e o arredondado. 🟢 `app/Models/LegacyDisciplineScore.php:16-19`
- `nota_recuperacao` e `nota_recuperacao_especifica`, que guardam a recuperação geral e a de etapa específica. 🟢 `LegacyDisciplineScore.php:20-21`
- `etapa` na nota, na falta e no parecer, que identifica o período de lançamento. 🟢 `LegacyDisciplineScore.php:18`
- `media` e `media_arredondada` na média por componente. 🟢 `app/Models/LegacyDisciplineScoreAverage.php:16-17`
- `situacao` na média por componente, que é o resultado apurado por disciplina. 🟢 `LegacyDisciplineScoreAverage.php:18`
- `bloqueada` na média por componente, que impede a edição da média. 🟢 `LegacyDisciplineScoreAverage.php:19`
- `tipo_nota`, `tipo_progressao` e `tipo_presenca` na regra, que definem o regime de apuração. 🟢 `app/Models/LegacyEvaluationRule.php:59-61`
- `media` e `media_recuperacao` na regra, que são as médias de aprovação e de recuperação. 🟢 `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php:151-169`
- `porcentagemPresenca` na regra, que é o mínimo de frequência. 🟢 `RegraAvaliacao.php:193-196`
- `qtdDisciplinasDependencia` na regra, que é o limite de dependências. 🟢 `RegraAvaliacao.php:183-186`
- `reprovarAutomaticamenteAposDependencias` na regra, que é a quantidade máxima de reprovação automática. 🟢 `RegraAvaliacao.php:121-135`
- `tipo_recuperacao_paralela` e `tipo_calculo_recuperacao_paralela` na regra. 🟢 `app/Models/LegacyEvaluationRule.php:64`
- `parecer_descritivo` e `nota_geral_por_etapa` na regra, que habilitam parecer e nota geral. 🟢 `LegacyEvaluationRule.php:131-139`
- `desconsiderarLancamentoFrequencia` na regra, que neutraliza a frequência na apuração. 🟢 `RegraAvaliacao.php:309-312`
- `qtdCasasDecimais` na regra, que define o arredondamento armazenado. 🟢 `RegraAvaliacao.php:244-248`
- `disciplinasAglutinadas` na regra, que agrupa componentes para a apuração. 🟢 `RegraAvaliacao.php:15-26`

Não há, no legado, trilha de lançamento, justificativa de lançamento, nem registro de quem apurou. 🔴

---

## Observabilidade

- A apuração expõe a situação por componente, a situação geral e a indicação de componente avaliável no contexto. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:1472` e `:1541` e `:829`
- A tela de lançamento exibe a média prevista na recuperação, o valor original e o valor de recuperação. 🟢 `app/Models/LegacyDisciplineScore.php:38-52`
- O lançamento de parecer é limitado a quarenta caracteres e dez linhas, com o limite exposto na própria tela. 🟢 `ieducar/modules/Avaliacao/Views/NotaController.php:99`
- A falha de gravação do lançamento produz a mensagem `Erro no preenchimento do formulário.` para o usuário. 🟢 `NotaController.php:139`
- A promoção disparada por serviço silencia a exceção da API legada, sem mensagem ao operador. 🟢 `app/Services/PromotionService.php:47-50`
- Não há log estruturado, métrica, rastreamento distribuído nem auditoria de lançamento. 🔴

---

## Riscos e Lacunas

- 🔴 O serviço de boletim é uma classe de 3.541 linhas que concentra acesso a banco, cache, regras de regime, montagem de arrays de exibição e escrita de estado, o que a torna praticamente intestável de forma unitária. 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php`
- 🔴 As fórmulas de média e de recuperação são interpretadas em tempo de execução, o que combina risco de desempenho e risco de execução de código arbitrário. 🟢 `_reversa_sdd/Avaliacao/legacy-mapping.md`, seção 2
- 🔴 Não existe trilha de auditoria dos lançamentos: a alteração de nota sobrescreve a anterior, sem valor anterior, sem autor e sem justificativa. 🟢 `Boletim.php:1830-1935`
- 🔴 Coexistem a camada legada procedural e a camada Eloquent sobre as mesmas tabelas, o que gera consultas divergentes e risco de leitura inconsistente entre o lançamento e o relatório.
- 🔴 A promoção é disparada por uma requisição sintética contra a API legada, com a exceção silenciada, o que torna a falha de promoção invisível e não recuperável. 🟢 `app/Services/PromotionService.php:22-51`
- 🔴 O arredondamento depende de tabela de valores configurável, e não de regra numérica, o que torna o resultado dependente de dado de cadastro e não de regra de código.
- 🟡 A regra de avaliação é lida de cache por cinco minutos, o que faz a apuração divergir da regra efetivamente salva durante esse intervalo.
- 🟡 A lista de valores da nota é montada com a descrição da tabela de arredondamento, o que acopla a interface ao texto de cadastro.
- 🟡 O motor de apuração depende do estado de sessão e de requisição, o que impede reprocessar um boletim histórico sem simular a requisição original.
- 🟡 A carga horária do regime cíclico é apurada por soma sobre as matrículas do ciclo, o que torna a apuração proporcional ao tamanho do ciclo.
- 🟡 A verificação de lançamentos em etapas anteriores percorre as etapas uma a uma, o que custa O(etapas) em cada exclusão.
- 🟡 Não há justificativa obrigatória para o lançamento de parecer, e o parecer é limitado a quarenta caracteres na tela, o que é mais restritivo que a prática pedagógica.
