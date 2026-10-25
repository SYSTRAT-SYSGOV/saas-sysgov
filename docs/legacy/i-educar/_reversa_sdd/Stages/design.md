# Stages (i-Educar legado), Design Técnico

> Descreve o **COMO** o módulo de estrutura acadêmica legado é construído, com base no código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do domínio legado

| Entidade | Chave | Atributos observados | Fonte |
|----------|-------|----------------------|-------|
| Nível de ensino | `cod_nivel_ensino` | nome, descrição, ativo, instituição, autor de cadastro, data de exclusão | `app/Models/LegacyEducationLevel.php:8-19` |
| Tipo de ensino | `cod_tipo_ensino` | nome, indicizador de atividade complementar, ativo | `app/Models/LegacyEducationType.php:11-22` |
| Curso | `cod_curso` | nome, sigla, descrição, nível, tipo, regime, número de etapas, carga horária, fração de hora para falta, modalidade, padrão de calendário, multisseriado, instituição, ativo | `app/Models/LegacyCourse.php:54-70` |
| Série | `cod_serie` | nome, descrição, curso, ordem no curso, concluinte, carga horária, intervalo, idade inicial, idade final, idade ideal, dias letivos, alerta de faixa etária, bloqueio de faixa etária, exigir INEP, importar série de pré-matrícula, etapa do Censo Escolar, regra de avaliação, regra de avaliação diferenciada, observação de histórico, ativo | `app/Models/LegacyGrade.php:46-70` |
| Regra de avaliação da série por ano | série, regra, ano | regra padrão, regra diferenciada, ano letivo | `app/Models/LegacyGrade.php:88-122` e `modules.regra_avaliacao_serie_ano` |
| Sequência de séries | série de origem, série de destino | ativo, autor de cadastro, data de exclusão | `app/Models/LegacyGradeSequence.php:14-30` |
| Tipo de etapa | `cod_modulo` | nome, número de etapas, de meses e de semanas, descrição, instituição, ativo | `app/Models/LegacyStageType.php:18-30` |
| Etapa do ano letivo | escola, ano, módulo | sequencial, data de início, data de fim, dias letivos | `app/Models/LegacyAcademicYearStage.php:19-29` |
| Etapa da turma | `ref_cod_turma` | módulo, sequencial, data de início, data de fim, dias letivos | `app/Models/LegacySchoolClassStage.php:15-24` |
| Etapa oficial do Censo Escolar | `id` | nome | `app/Models/LegacyEducacensoStages.php:9-18` |
| De/para de etapa do Censo Escolar | curso, etapa | vínculo | `app/Models/LegacyCourseEducacensoStage.php:11-21` |
| Dispensa por etapa | `ref_cod_dispensa` | etapa, disciplina | `app/Models/LegacyExemptionStage.php:10-20` |

### Domínio de regime e padrão de calendário

| Valor | Significado | Fonte |
|-------|-------------|-------|
| `padrao_ano_escolar` verdadeiro | O curso segue o calendário padrão do ano letivo da escola | 🟢 `app/Models/LegacyCourse.php:110-115` |
| `padrao_ano_escolar` falso | O curso tem calendário próprio, por turma | 🟢 `app/Models/LegacyCourse.php:110-115` |
| `hora_falta` | Fração de hora que compõe uma falta | 🟢 `LegacyCourse.php:117-122` |
| `qtd_etapas` | Número de etapas que compõem o curso | 🟢 `LegacyCourse.php:83-89` |
| `multi_seriado` | Indica curso ofertado em série multisseriada | 🟢 `LegacyCourse.php:69` |

### Endpoints HTTP

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/Serie?series` | `instituicao_id`, `escola_id[]`, `ano`, `curso_id[]`, `ativo`, `modified` | `{ "series": [...] }` | 🟢 `ieducar/modules/Api/Views/SerieController.php:12-104` |
| GET | `/module/Api/Serie?series-curso` | `curso_id` | `{ "series": [...] }` | 🟢 `SerieController.php:196-222` |
| GET | `/module/Api/Serie?series-escola` | `escola_id`, `ano` | Séries da escola | 🟢 `SerieController.php:136-195` |
| GET | `/module/Api/Serie?series-curso-sem-componentes` | `curso_id` | Séries sem componente vinculado | 🟢 `SerieController.php:106-134` |
| GET | `/module/Api/Serie?bloqueio-faixa-etaria` | `instituicao_id`, `serie_id`, `data_nascimento`, `ano` | `{ "bloqueado", "mensagem_bloqueio" }` | 🟢 `SerieController.php:248-280` |
| GET | `/module/Api/Serie?series-curso-grouped` | — | `{ "options": [...] }` agrupado por curso | 🟢 `SerieController.php:229-246` |
| GET | `/module/Api/Serie?etapa-educacenso` | `serie_id` | `{ "etapa_educacenso": 14 }` | 🟢 `SerieController.php:224-227` |
| GET | `/module/Api/Curso?cursos` | `instituicao_id`, filtros | Lista de cursos | 🟢 `ieducar/modules/Api/Views/CursoController.php:23-172` |
| GET | `/module/Api/Curso?cursos-da-escola` | `escola_id`, `ano` | Cursos ofertados pela escola | 🟢 `CursoController.php:207-224` |
| GET | `/module/Api/Curso?modalidade-curso` | `curso_id` | Modalidade do curso | 🟢 `CursoController.php:193-206` |
| GET | `/module/Api/Curso?dados-do-curso` | `curso_id` | Dados do curso | 🟢 `CursoController.php:225-238` |
| GET | `/api/courses` | filtros de paginação | Coleção paginada de cursos | Processo 566 🟢 `app/Http/Controllers/Api/CourseController.php:16-21` |
| GET | `/api/grades` | filtros de paginação | Coleção paginada de séries | Processo 583 🟢 `app/Http/Controllers/Api/GradeController.php:16-21` |
| GET | `/api/resource/courses` | filtros | Coleção simples de curso | 🟢 `app/Http/Controllers/Api/Resource/Course/ResourceCourseController.php` |
| GET | `/api/resource/grades` | filtros | Coleção simples de série | 🟢 `app/Http/Controllers/Api/Resource/Grade/ResourceGradeController.php` |

### Funções e classes

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `LegacyCourse::isStandardCalendar` | `()` | `bool` | Define de onde vem o calendário da turma 🟢 `app/Models/LegacyCourse.php:110-115` |
| `LegacyCourse::hourAbsence` | `()` | `float` | Fração de hora da falta 🟢 `LegacyCourse.php:117-122` |
| `LegacyCourse::steps` | `()` | `int` | Número de etapas do curso 🟢 `LegacyCourse.php:83-89` |
| `LegacyGrade::evaluationRules` | `()` | `BelongsToMany` | Regras por série e por ano letivo, com a diferenciada no pivô 🟢 `app/Models/LegacyGrade.php:88-95` |
| `LegacyGrade::evaluationRuleDifferentiated` | `()` | `BelongsToOne` | Regra diferenciada da série 🟢 `LegacyGrade.php:114-122` |
| `LegacyGrade::schools` | `()` | `BelongsToMany` | Escolas com a série habilitada 🟢 `LegacyGrade.php:142-145` |
| `LegacyStageType::alreadyExists` | `($name, $stagesNumber, $id = null)` | `bool` | Unicidade do tipo de etapa 🟢 `app/Models/LegacyStageType.php:48-59` |
| `SchoolClassStageService::store` | `(LegacySchoolClass, array, array, array, int)` | `void` | Apaga e recria as etapas da turma 🟢 `app/Services/SchoolClassStageService.php:11-26` |
| `SchoolClassStageService::validate` | `(LegacySchoolClass, array)` | `void` | Valida notas e faltas na etapa 🟢 `SchoolClassStageService.php:28-42` |
| `SchoolClassStageService::updateByCourse` | `(int $course, int $year, bool $isStandardCalendar)` | `void` | Copia as etapas da escola para as turmas 🟢 `SchoolClassStageService.php:84-91` |
| `SchoolClassService::getCalendars` | `(array $schoolClassId)` | `Collection` | Início e fim do calendário das turmas 🟢 `app/Services/SchoolClass/SchoolClassService.php:89-99` |
| `SerieController::getSeries` | `()` | `array` | Listagem de séries com filtro por alteração 🟢 `ieducar/modules/Api/Views/SerieController.php:12-104` |
| `SerieController::getBloqueioFaixaEtaria` | `()` | `array` | Verificação de faixa etária 🟢 `SerieController.php:253-280` |
| `SerieController::getSeriesSemComponentesVinculados` | `()` | `array` | Séries sem componente vinculado 🟢 `SerieController.php:106-134` |
| `SerieController::getSeriesCursoGrouped` | `()` | `array` | Séries agrupadas por curso 🟢 `SerieController.php:229-246` |
| `LegacyCourseEducacensoStage::getIdsByCourse` | `(int $course)` | `array` | Etapas do Censo Escolar mapeadas ao curso 🟢 `app/Models/LegacyCourseEducacensoStage.php:18-21` |
| `LegacyEducacensoStages::getDescriptiveValues` | `()` | `array` | Catálogo de etapas do Censo Escolar 🟢 `app/Models/LegacyEducacensoStages.php:15-18` |
| `PromotionService::fakeRequest` | `()` | `void` | Dispara a promoção por requisição sintética 🟢 `app/Services/PromotionService.php:22-51` |
| `clsPmieducarSerie::verificaPeriodoCorteEtarioDataNascimento` | `($dataNascimento, $ano)` | `bool` | Verificação de faixa etária com a data de corte 🟢 `ieducar/intranet/include/pmieducar/clsPmieducarSerie.inc.php` |
| `LegacyGradeBuilder::whereName` | `(string $name)` | `self` | Busca sem acento sobre o nome da série 🟢 `app/Models/Builders/LegacyGradeBuilder.php:14-17` |

---

## Fluxo Principal

1. A secretaria cadastra o nível de ensino, o tipo de ensino e o curso, definindo regime, número de etapas, carga horária e padrão de calendário. 🟢 `ieducar/intranet/educar_curso_cad.php`
2. As séries são cadastradas dentro do curso, com a ordem no curso, a carga horária, os dias letivos e a faixa etária. 🟢 `ieducar/intranet/educar_serie_cad.php`
3. A regra de avaliação é vinculada à série para cada ano letivo, com a regra padrão e a diferenciada. 🟢 `app/Models/LegacyGrade.php:88-122`
4. A sequência de progressão é cadastrada, ligando a série de origem à de destino. 🟢 `ieducar/intranet/educar_sequencia_serie_cad.php`
5. A escola habilita o curso e as séries, com as regras de lotação e de horário. 🟢 `app/Http/Controllers/SchoolClassController.php:108-114`
6. A turma é criada, consumindo a oferta, o turno, a série e o calendário. 🟢 `app/Http/Controllers/SchoolClassController.php:22-137`
7. Na matrícula, a faixa etária da série é verificada contra a data de corte da instituição. 🟢 `ieducar/modules/Api/Views/SerieController.php:253-280`
8. Na apuração final, a sequência de séries determina a série de destino do estudante promovido. 🟢 `app/Models/LegacyGradeSequence.php:27-30`

---

## Fluxos Alternativos

- **Série com descrição:** o nome de exibição concatena nome e descrição entre parênteses. 🟢 `app/Models/LegacyGrade.php:72-83`
- **Curso com calendário próprio:** a turma usa as etapas próprias, e não as do ano letivo da escola. 🟢 `app/Models/LegacySchoolClass.php:278-311`
- **Gravação das etapas da turma:** as etapas anteriores são apagadas e a sequência recomeça em 1. 🟢 `app/Services/SchoolClassStageService.php:16-20`
- **Etapa com notas lançadas:** a gravação é recusada pela validação de notas e faltas. 🟢 `SchoolClassStageService.php:29-41`
- **Curso que deixa o calendário padrão:** as etapas das turmas são apagadas e copiadas do ano letivo da escola. 🟢 `SchoolClassStageService.php:84-121`
- **Faixa etária violada sem bloqueio configurado:** o resultado traz a mensagem sem bloquear. 🟢 `ieducar/modules/Api/Views/SerieController.php:271-276`
- **Faixa etária violada com bloqueio configurado:** o resultado indica o bloqueio. 🟢 `SerieController.php:273`
- **Instituição sem data base de matrícula:** a verificação de faixa etária é liberada. 🟢 `ieducar/intranet/include/pmieducar/clsPmieducarSerie.inc.php`
- **Série sem componente vinculado:** a listagem de séries sem componentes a devolve. 🟢 `SerieController.php:110-116`
- **Série alterada na oferta e não na série:** a data de atualização devolvida é a mais recente das duas. 🟢 `SerieController.php:38-44`
- **Promoção com exceção na API legada:** a exceção é silenciada e a promoção não produz efeito observável. 🟢 `app/Services/PromotionService.php:47-50`
- **Tipo de etapa duplicado:** a unicidade por nome e número de etapas é verificada entre os tipos ativos. 🟢 `app/Models/LegacyStageType.php:48-59`

---

## Dependências

- **Instituição (`pmieducar.instituicao`):** fonte da data base de matrícula, que é a data de corte da faixa etária, e do vínculo de tenant do curso e do nível. 🟢 `ieducar/intranet/include/pmieducar/clsPmieducarSerie.inc.php` e `app/Models/LegacyCourse.php:127-131`
- **Escola (`pmieducar.escola`):** fonte do sinalizador de regra de avaliação diferenciada, que altera a regra aplicável à turma. 🟢 `app/Models/LegacySchoolClass.php:656`
- **Oferta de série na escola (`pmieducar.escola_serie`):** fonte da habilitação da série e dos anos letivos ofertados. 🟢 `ieducar/modules/Api/Views/SerieController.php:53`
- **Oferta de curso na escola (`pmieducar.escola_curso`):** fonte da habilitação do curso. 🟢 `app/Models/LegacyCourse.php:147-150`
- **Turma (`pmieducar.turma`):** destino das etapas próprias de calendário. 🟢 `app/Models/LegacySchoolClassStage.php:26-29`
- **Ano letivo da escola (`pmieducar.ano_letivo_modulo`):** fonte das etapas do calendário padrão. 🟢 `app/Models/LegacyAcademicYearStage.php:31-34`
- **Componente curricular de ano escolar (`modules.componente_curricular_ano_escolar`):** define quais séries já têm componente vinculado. 🟢 `ieducar/modules/Api/Views/SerieController.php:114-115`
- **Regra de avaliação (`modules.regra_avaliacao` e `modules.regra_avaliacao_serie_ano`):** origem da regra padrão e da diferenciada por série e ano. 🟢 `app/Models/LegacyGrade.php:88-122`
- **Etapas do Censo Escolar (`modules.etapas_educacenso` e `modules.etapas_curso_educacenso`):** de/para entre o curso municipal e as etapas oficiais. 🟢 `app/Models/LegacyCourseEducacensoStage.php:11-21`
- **Disciplina e dispensa (`pmieducar.dispensa_etapa`):** vínculo da dispensa com a etapa do calendário. 🟢 `app/Models/LegacyExemptionStage.php:10-20`
- **Diário de classe (`iDiarioService`):** valida a existência de notas e faltas por etapa. 🟢 `app/Services/SchoolClassStageService.php:29-41`
- **Censo Escolar (`src/Modules/Educacenso/`):** consome a etapa do Censo Escolar da série e a etapa agregada da turma. 🟢 `src/Modules/Educacenso/Data/Registro20.php:94`

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Hierarquia de quatro níveis, do nível de ensino à sequência de séries | `app/Models/LegacyEducationLevel.php`, `LegacyCourse.php`, `LegacyGrade.php` e `LegacyGradeSequence.php` | 🟢 |
| Calendário de etapas como segundo eixo, independente da hierarquia acadêmica | `app/Models/LegacyStageType.php` e `LegacyAcademicYearStage.php` e `LegacySchoolClassStage.php` | 🟢 |
| O calendário da turma resolvido dinamicamente conforme o padrão do curso | `app/Models/LegacySchoolClass.php:391-399` | 🟢 |
| Regra de avaliação normalizada por série e por ano letivo, em tabela de ligação | `app/Models/LegacyGrade.php:88-122` | 🟢 |
| Etapas gravadas com recreação completa, por apagar e reinserir | `app/Services/SchoolClassStageService.php:16-20` | 🟢 |
| Cópia de etapas por inserção em bloco, sem passar pelo modelo | `SchoolClassStageService.php:101-121` | 🟢 |
| Unicidade do tipo de etapa por nome e número de etapas | `app/Models/LegacyStageType.php:48-59` | 🟢 |
| Faixa etária verificada contra a data base de matrícula da instituição | `ieducar/intranet/include/pmieducar/clsPmieducarSerie.inc.php` | 🟢 |
| Bloqueio de faixa etária e alerta configurados de forma independente | `app/Models/LegacyGrade.php:63-64` e `SerieController.php:271-276` | 🟢 |
| Progressão modelada como par origem e destino, sem tipo de transição | `app/Models/LegacyGradeSequence.php:14-30` | 🟢 |
| Promoção disparada por requisição sintética contra a API legada | `app/Services/PromotionService.php:22-51` | 🟢 |
| Séries ofertadas pela escola como vínculo, e não como atributo da série | `app/Models/LegacyGrade.php:142-145` | 🟢 |
| Nome de exibição composto por nome e descrição, com o nome em maiúsculas na API | `app/Models/LegacyGrade.php:72-83` e `SerieController.php:86-89` | 🟢 |

---

## Estado Interno

O módulo é **com estado próprio**, sustentado pelas colunas de status e de vigência de cada entidade da hierarquia. 🟢

Campos de estado observados:

- `ativo` em nível, tipo, curso, série, sequência e tipo de etapa, que controla a existência lógica. 🟢 `app/Models/LegacyEducationLevel.php:18` e `app/Models/LegacyCourse.php:66` e `app/Models/LegacyGrade.php:56`
- `padrao_ano_escolar` no curso, que decide a origem do calendário da turma. 🟢 `app/Models/LegacyCourse.php:68`
- `etapa_curso` na série, que é a ordem da série dentro do curso. 🟢 `app/Models/LegacyGrade.php:51`
- `concluinte` na série, que marca a etapa final do curso. 🟢 `app/Models/LegacyGrade.php:52`
- `idade_inicial`, `idade_final` e `idade_ideal` na série, que delimitam a faixa etária. 🟢 `app/Models/LegacyGrade.php:57-58` e `:65`
- `alerta_faixa_etaria` e `bloquear_matricula_faixa_etaria` na série, que controlam a severidade da violação. 🟢 `app/Models/LegacyGrade.php:63-64`
- `exigir_inep` na série, que exige o código INEP do aluno na matrícula. 🟢 `app/Models/LegacyGrade.php:66`
- `importar_serie_pre_matricula` na série, que habilita a importação de pré-matrícula. 🟢 `app/Models/LegacyGrade.php:67`
- `etapa_educacenso` na série, que é o código oficial da etapa no INEP. 🟢 `app/Models/LegacyGrade.php:69`
- `anos_letivos` na oferta de série e de curso, que delimita a vigência da oferta. 🟢 `app/Models/LegacySchoolGrade.php:21` e `app/Models/LegacySchoolCourse.php:26`
- `sequencial` na etapa do ano letivo e na etapa da turma, que ordena o calendário. 🟢 `app/Models/LegacyAcademicYearStage.php:21` e `LegacySchoolClassStage.php:17`
- `data_inicio` e `data_fim` na etapa, que delimitam o período letivo da etapa. 🟢 `LegacyAcademicYearStage.php:22-23`
- `dias_letivos` na etapa, que quantifica os dias letivos. 🟢 `LegacyAcademicYearStage.php:24`
- `hora_falta` no curso, que define a fração de hora que compõe uma falta. 🟢 `app/Models/LegacyCourse.php:65`
- `multi_seriado` no curso, que indica oferta em série multisseriada. 🟢 `LegacyCourse.php:69`

Não há, no legado, ciclo de aprendizagem, tipo de transição entre séries, ato de autorização do conselho, nem trilha de auditoria de conteúdo. 🔴

---

## Observabilidade

- A verificação de faixa etária devolve um par com o indicador de bloqueio e a mensagem, em que a mensagem é a mesma para o alerta e para o bloqueio. 🟢 `ieducar/modules/Api/Views/SerieController.php:269-278`
- A listagem de séries devolve o nome em maiúsculas, com a descrição entre parênteses quando houver. 🟢 `SerieController.php:86-89`
- A listagem de séries devolve a data de exclusão nula para a série ativa. 🟢 `SerieController.php:46-51`
- O tipo de etapa apresenta o nome com o número de etapas no rótulo. 🟢 `app/Models/LegacyStageType.php:40-46`
- A promoção disparada por serviço silencia a exceção legada, sem mensagem ao operador. 🟢 `app/Services/PromotionService.php:47-50`
- A gravação de etapas da turma devolve a mensagem de erro de validação pela camada de controladora. 🟢 `app/Http/Controllers/SchoolClassController.php:127-130`
- Não há log estruturado, métrica ou rastreamento distribuído no módulo. 🔴

---

## Riscos e Lacunas

- 🔴 A listagem de séries interpola a escola, o curso, o ano e o indicizador de atividade diretamente no SQL, sem parametrização, e todos vêm da requisição. 🟢 `ieducar/modules/Api/Views/SerieController.php:62` e `:66` e `:70` e `:74`
- 🔴 A API de recurso de curso e a de série dispensam a autorização na indexação, expondo a listagem completa da estrutura acadêmica da rede. 🟢 `app/Http/Controllers/Api/CourseController.php:20-24` e `GradeController.php:20-24`
- 🔴 A listagem agrupada de séries por curso não filtra por atividade nem restringe por instituição, expondo séries inativas de todas as redes. 🟢 `SerieController.php:229-246`
- 🔴 A gravação das etapas da turma apaga as etapas anteriores antes da inserção das novas, e a operação não é atômica por etapa, o que pode deixar a turma sem calendário em caso de falha intermediária. 🟢 `app/Services/SchoolClassStageService.php:16-26`
- 🔴 A promoção é disparada por uma requisição sintética que monta a chamada legada e silencia a exceção, o que torna a falha de promoção invisível. 🟢 `app/Services/PromotionService.php:22-51`
- 🔴 A sequência de séries é apenas um par origem e destino, sem tipo de transição, sem exigência de parecer e sem verificação de compatibilidade de curso, o que não permite modelar progressão continuada nem aceleração.
- 🔴 Não há validação da carga horária e dos dias letivos do curso contra o mínimo da LDB, o que permite cadastro de curso com carga insuficiente.
- 🟡 O termo "etapa" designa três conceitos distintos no legado, o que é uma fonte recorrente de ambiguidade e precisa ser desambiguado no modelo novo.
- 🟡 A regra de avaliação é normalizada por série e ano letivo, mas a coluna da regra padrão permanece na série, o que cria duas fontes de verdade.
- 🟡 A faixa etária usa a data base de matrícula da instituição como data de corte, e não uma data própria da série, o que impede regras etárias diferenciadas por série.
- 🟡 O de/para entre curso e etapa do Censo Escolar é chaveado apenas por curso, sem vínculo por série, o que não expressa o vínculo por etapa agregada.
- 🟡 A listagem de séries sem componentes usa `NOT IN` sobre a subconsulta de componentes de ano escolar, o que degrada com o volume de componentes.
