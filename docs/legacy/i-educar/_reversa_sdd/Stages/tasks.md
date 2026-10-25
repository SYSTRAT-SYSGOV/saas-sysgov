# Stages (i-Educar legado), Tarefas de Implementação

> Sequência de tarefas executáveis para reimplementar a unit de estrutura acadêmica a partir do legado, com rastreabilidade ao código original.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- [ ] Dependências da unit listadas em `design.md` estão disponíveis: instituição, escola, oferta de série e de curso, turma, ano letivo, componente curricular, regra de avaliação, etapas do Censo Escolar, disciplina e dispensa, e o diário de classe.
- [ ] Schema e migrations do banco compatíveis com as tabelas `educa_education_levels`, `educa_courses`, `educa_grades`, `educa_grade_sequences` e `educa_course_school_offers` descritas em `_reversa_sdd/Stages/legacy-mapping.md`, com `tenant_id` em todas as entidades.
- [ ] Taxonomia desambiguada no modelo novo, com o termo "etapa" reservado ao calendário letivo e a série escolar nomeada por outro termo.
- [ ] Catálogos de regime de ensino, de tipo de ensino, de modalidade de curso e de padrão de divisão do ano letivo carregados em tabelas de referência.
- [ ] Catálogo de etapas oficiais do Censo Escolar carregado, com o de/para por curso.
- [ ] Configuração da data base de matrícula por tenant, que é a data de corte da faixa etária.
- [ ] Contrato do pacote `@sysgov/sdk` definido para nível, curso, série, sequência e etapa.

---

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-01, Modelar o nível de ensino, com tenant, código canônico, nome, código do INEP, modalidade, descrição e ordem de exibição
  - Origem no legado: `app/Models/LegacyEducationLevel.php:8-19`
  - Critério de pronto: tabela `educa_education_levels` criada, com unicidade por tenant e por código, e teste de recusa de código duplicado
  - Confiança: 🟡

- [ ] T-02, Modelar o tipo de ensino, com nome e o indicizador de atividade complementar
  - Origem no legado: `app/Models/LegacyEducationType.php:11-22`
  - Critério de pronto: tabela `educa_teaching_types` criada, com o indicizador preservado
  - Confiança: 🟡

- [ ] T-03, Modelar o curso, com nível, regra de avaliação padrão, regime, código do INEP, carga horária mínima, dias letivos mínimos, total de etapas e padrão de divisão do ano letivo
  - Origem no legado: `app/Models/LegacyCourse.php:54-70`
  - Critério de pronto: tabela `educa_courses` criada, com o padrão de calendário gravado como booleano e a fração de hora para falta como decimal
  - Confiança: 🟡

- [ ] T-04, Modelar a série, com curso, regra de avaliação própria, ordem no curso, etapa do INEP, carga horária, dias letivos, idade mínima, ideal e máxima, e data de corte
  - Origem no legado: `app/Models/LegacyGrade.php:46-70`
  - Critério de pronto: tabela `educa_grades` criada, com unicidade por curso e por ordem, e teste de recusa de ordem duplicada
  - Confiança: 🟡

- [ ] T-05, Modelar a marcação de série concluinte, de ciclo de aprendizagem e de progressão continuada
  - Origem no legado: `app/Models/LegacyGrade.php:52`, com a continuação e o ciclo ausentes no legado
  - Critério de pronto: a série aceita os três sinalizadores, e a progressão continuada altera a resolução da série de destino
  - Confiança: 🟡

- [ ] T-06, Modelar a matriz de progressão entre séries, com tipo de transição, descrição, exigência de parecer e situação
  - Origem no legado: `app/Models/LegacyGradeSequence.php:14-30`, que tem apenas origem e destino
  - Critério de pronto: tabela `educa_grade_sequences` criada, com unicidade por origem, por destino e por tipo de transição
  - Confiança: 🟡

- [ ] T-07, Modelar o tipo de etapa de calendário, com nome, número de etapas, de meses e de semanas
  - Origem no legado: `app/Models/LegacyStageType.php:18-30`
  - Critério de pronto: tabela `educa_stage_types` criada, com unicidade por nome e por número de etapas
  - Confiança: 🟡

- [ ] T-08, Modelar as etapas do ano letivo da escola, com sequencial, datas e dias letivos
  - Origem no legado: `app/Models/LegacyAcademicYearStage.php:19-29`
  - Critério de pronto: tabela `educa_academic_year_stages` criada, com unicidade por escola, por ano e por sequencial
  - Confiança: 🟡

- [ ] T-09, Modelar as etapas próprias da turma, com sequencial, datas e dias letivos
  - Origem no legado: `app/Models/LegacySchoolClassStage.php:15-24`
  - Critério de pronto: tabela `educa_school_class_stages` criada, com unicidade por turma e por sequencial
  - Confiança: 🟡

- [ ] T-10, Modelar o de/para entre o curso municipal e as etapas oficiais do Censo Escolar
  - Origem no legado: `app/Models/LegacyCourseEducacensoStage.php:11-21` e `app/Models/LegacyEducacensoStages.php:9-18`
  - Critério de pronto: tabelas `educa_inep_stages` e `educa_course_inep_stages` criadas, com o de/para lido como lista de identificadores por curso
  - Confiança: 🟢

- [ ] T-11, Modelar a dispensa de disciplina vinculada a uma etapa do calendário
  - Origem no legado: `app/Models/LegacyExemptionStage.php:10-20`
  - Critério de pronto: a dispensa aceita a referência de etapa, com o vínculo preservado
  - Confiança: 🟡

- [ ] T-12, Implementar a validação da carga horária e dos dias letivos do curso contra o mínimo da LDB
  - Origem no legado: ausência de validação no legado, evidenciada por `app/Models/LegacyCourse.php:54-70`
  - Critério de pronto: o curso anual com menos de 200 dias letivos ou menos de 800 horas é recusado, com a mensagem da norma
  - Confiança: 🟡

- [ ] T-13, Implementar a verificação de faixa etária da série, com a data base de matrícula da instituição como data de corte
  - Origem no legado: `ieducar/intranet/include/pmieducar/clsPmieducarSerie.inc.php`
  - Critério de pronto: a idade é calculada em anos completos contra a data de corte, e a instituição sem data base libera a verificação
  - Confiança: 🟢

- [ ] T-14, Implementar a severidade da violação de faixa etária, com alerta e bloqueio independentes
  - Origem no legado: `ieducar/modules/Api/Views/SerieController.php:248-280`
  - Critério de pronto: a violação com apenas alerta devolve a mensagem sem bloqueio, e com bloqueio devolve o indicador de bloqueio
  - Confiança: 🟢

- [ ] T-15, Implementar a resolução da série de destino do estudante promovido, com a matriz de progressão e o recuo por ordem
  - Origem no legado: `app/Models/LegacyGradeSequence.php:27-30` e `app/Models/LegacyGrade.php:51`
  - Critério de pronto: a promoção resolve a série pela matriz e, na ausência de regra, pela ordem seguinte do curso, e o estudante retido permanece na série
  - Confiança: 🟡

- [ ] T-16, Implementar a gravação das etapas da turma, com remoção da sequência anterior e recriação a partir de 1
  - Origem no legado: `app/Services/SchoolClassStageService.php:11-26`
  - Critério de pronto: a gravação é transacionada, a sequência recomeça em 1 e a falha intermediária não deixa a turma sem calendário
  - Confiança: 🟡

- [ ] T-17, Implementar a validação da gravação das etapas contra a existência de notas e faltas na etapa
  - Origem no legado: `app/Services/SchoolClassStageService.php:28-42`
  - Critério de pronto: a gravação é recusada quando há nota ou falta lançada na etapa, com a lista das etapas problemáticas
  - Confiança: 🟢

- [ ] T-18, Implementar a cópia das etapas do ano letivo da escola para as turmas, quando o curso deixa o calendário padrão
  - Origem no legado: `app/Services/SchoolClassStageService.php:84-121`
  - Critério de pronto: a mudança apaga as etapas das turmas do curso e insere as da escola em bloco, dentro de transação
  - Confiança: 🟢

- [ ] T-19, Implementar a resolução do calendário da turma, conforme o padrão do curso
  - Origem no legado: `app/Models/LegacySchoolClass.php:391-399` e `app/Services/SchoolClass/SchoolClassService.php:89-99`
  - Critério de pronto: a turma de curso padrão devolve as etapas do ano letivo da escola, e a de curso próprio devolve as suas
  - Confiança: 🟢

- [ ] T-20, Implementar a listagem de séries, por escola, por curso e por ano letivo, com filtro por alteração
  - Origem no legado: `ieducar/modules/Api/Views/SerieController.php:12-104`
  - Critério de pronto: a listagem devolve a data mais recente entre a série e a oferta, e o filtro incremental funciona
  - Confiança: 🟢

- [ ] T-21, Implementar a parametrização da listagem de séries, sem interpolação de valores da requisição
  - Origem no legado: `ieducar/modules/Api/Views/SerieController.php:62` e `:66` e `:70` e `:74`
  - Critério de pronto: a escola, o curso, o ano e a atividade são vinculados como parâmetros, com teste de injeção
  - Confiança: 🟡

- [ ] T-22, Implementar a listagem de séries sem componentes curriculares vinculados
  - Origem no legado: `ieducar/modules/Api/Views/SerieController.php:106-134`
  - Critério de pronto: a listagem exclui as séries com componente de ano escolar, com teste para a série com e a sem componente
  - Confiança: 🟢

- [ ] T-23, Implementar a listagem de séries agrupadas por curso, com filtro de atividade e de instituição
  - Origem no legado: `ieducar/modules/Api/Views/SerieController.php:229-246`
  - Critério de pronto: o agrupamento respeita a atividade e a instituição do tenant, ao contrário do legado
  - Confiança: 🟡

- [ ] T-24, Implementar a exposição da etapa oficial do Censo Escolar de uma série
  - Origem no legado: `ieducar/modules/Api/Views/SerieController.php:224-227`
  - Critério de pronto: a etapa é devolvida com o nome descritivo do catálogo
  - Confiança: 🟢

- [ ] T-25, Implementar a listagem de sequências de progressão, por série e por curso, de origem e de destino
  - Origem no legado: `app/Models/Builders/LegacyGradeSequenceBuilder.php:7-37`
  - Critério de pronto: os quatro filtros funcionam, com teste para cada um
  - Confiança: 🟢

- [ ] T-26, Implementar a gravação do ato de autorização do conselho na oferta de curso da escola
  - Origem no legado: ausência do ato no legado, evidenciada por `app/Models/LegacySchoolCourse.php:16-28`
  - Critério de pronto: a oferta aceita número e data do ato, e a listagem os devolve
  - Confiança: 🟡

- [ ] T-27, Implementar o disparo da promoção com registro de falha, em vez do silenciamento da exceção
  - Origem no legado: `app/Services/PromotionService.php:47-50`
  - Critério de pronto: a falha da promoção é registrada e devolvida ao operador, com o identificador da matrícula
  - Confiança: 🟡

- [ ] T-28, Implementar a API do módulo, com as rotas de nível, curso, série, sequência, etapa e faixa etária
  - Origem no legado: `ieducar/modules/Api/Views/SerieController.php:282-301` e `CursoController.php:239-255`
  - Critério de pronto: contrato OpenAPI gerado, com paginação e filtro por tenant em todas as listagens
  - Confiança: 🟡

- [ ] T-29, Implementar a autorização de leitura das listas de curso e de série
  - Origem no legado: `app/Http/Controllers/Api/CourseController.php:20-24` e `GradeController.php:20-24`
  - Critério de pronto: a listagem exige o processo correspondente e a devolução é restrita ao tenant, com teste de negação
  - Confiança: 🟡

- [ ] T-30, Implementar o contrato TypeScript da unit no pacote `@sysgov/sdk`
  - Origem no legado: `app/Models/LegacyCourse.php:46-52` e `app/Models/LegacyGrade.php:38-44`
  - Critério de pronto: tipos `EducationLevel`, `Course`, `Grade`, `GradeSequence`, `StageType` e `AcademicYearStage` publicados e consumidos por um cliente de teste
  - Confiança: 🟡

- [ ] T-31, Implementar a trilha de auditoria das alterações de curso, de série e de sequência
  - Origem no legado: ausência de auditoria no legado, evidenciada por `app/Models/LegacyGrade.php:46-70`
  - Critério de pronto: toda alteração gera registro de auditoria consultável por tenant e por entidade
  - Confiança: 🟡

---

## Tarefas de Teste

- [ ] TT-01, Teste do happy path do fluxo principal de estrutura acadêmica (ver `requirements.md`, Critérios de Aceitação)
- [ ] TT-02, Teste do caso de erro principal: matrícula bloqueada por faixa etária
- [ ] TT-03, Teste da verificação de faixa etária com instituição sem data base de matrícula
- [ ] TT-04, Teste da severidade da violação, com alerta e com bloqueio
- [ ] TT-05, Teste da unicidade do tipo de etapa, por nome e por número de etapas
- [ ] TT-06, Teste da gravação das etapas da turma, com remoção da sequência anterior e recriação
- [ ] TT-07, Teste da recusa da gravação de etapas com nota lançada
- [ ] TT-08, Teste da cópia de etapas da escola para as turmas, com a mudança de padrão do curso
- [ ] TT-09, Teste da resolução do calendário da turma, para curso padrão e para curso próprio
- [ ] TT-10, Teste da listagem de séries, com filtro por alteração e por ano letivo
- [ ] TT-11, Teste de injeção de SQL na listagem de séries
- [ ] TT-12, Teste da listagem de séries sem componentes vinculados
- [ ] TT-13, Teste do agrupamento de séries por curso, com a restrição de tenant
- [ ] TT-14, Teste da resolução da série de destino na promoção, com e sem regra de progressão
- [ ] TT-15, Teste da validação da carga horária e dos dias letivos contra o mínimo da LDB
- [ ] TT-16, Teste de isolamento por tenant em todas as listagens e vínculos
- [ ] TT-17, Teste de negação de autorização nas listagens de curso e de série
- [ ] TT-18, Teste de atomicidade da gravação das etapas da turma

---

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Migrar os níveis de ensino de `pmieducar.nivel_ensino` para `educa_education_levels`, com atribuição do código canônico
- [ ] TM-02, Migrar os tipos de ensino de `pmieducar.tipo_ensino` para `educa_teaching_types`
- [ ] TM-03, Migrar os cursos de `pmieducar.curso` para `educa_courses`, com o padrão de calendário, o número de etapas e a fração de hora para falta
- [ ] TM-04, Migrar as séries de `pmieducar.serie` para `educa_grades`, com a ordem no curso, a faixa etária e a etapa do Censo Escolar
- [ ] TM-05, Migrar as sequências de séries de `pmieducar.sequencia_serie` para `educa_grade_sequences`, com o tipo de transição regular como valor inicial
- [ ] TM-06, Migrar os tipos de etapa de `pmieducar.modulo` para `educa_stage_types`
- [ ] TM-07, Migrar as etapas do ano letivo de `pmieducar.ano_letivo_modulo` para `educa_academic_year_stages`
- [ ] TM-08, Migrar as etapas das turmas de `pmieducar.turma_modulo` para `educa_school_class_stages`
- [ ] TM-09, Migrar o de/para de `modules.etapas_curso_educacenso` para `educa_course_inep_stages`, e o catálogo de `modules.etapas_educacenso` para `educa_inep_stages`
- [ ] TM-10, Migrar as ofertas de `pmieducar.escola_curso` e `pmieducar.escola_serie` para `educa_course_school_offers` e a oferta de séries
- [ ] TM-11, Gerar o relatório de divergências da carga, com o total de registros marcados por tipo de inconsistência
- [ ] TM-12, Conferir a cadeia de progressão por curso, garantindo que toda série não concluinte tem destino e que nenhuma série é destino de duas origens

---

## Ordem Sugerida

1. T-01, T-02, T-03 e T-04 primeiro, porque definem a hierarquia acadêmica sobre a qual tudo o mais se apoia.
2. T-05, T-06 e T-11 em seguida, porque a progressão e a dispensa por etapa dependem da série.
3. T-07, T-08 e T-09 depois, porque o calendário de etapas é o segundo eixo do módulo.
4. T-10 logo após, porque o de/para com o Censo Escolar depende do curso e da série.
5. T-12, T-13 e T-14 em seguida, porque são as validações de cadastro e de matrícula.
6. T-15, T-16, T-17, T-18 e T-19 depois, porque são as operações de progressão e de calendário.
7. T-20, T-21, T-22, T-23, T-24 e T-25 por último entre as de domínio, porque expõem o que já está validado.
8. T-26, T-27, T-28, T-29, T-30 e T-31 em seguida, porque adicionam o ato de autorização, a observabilidade da promoção, o contrato, a autorização e a auditoria.
9. TM-01 a TM-12 somente depois de T-28 estar em ambiente de homologação, para que a carga possa ser conferida pela API nova.
10. Bloqueios: T-03 depende de T-01 e T-02; T-04 depende de T-03; T-06 depende de T-04; T-09 depende de T-07; T-10 depende de T-03 e T-04; T-11 depende de T-09; T-13 depende de T-04 e da unit Configuração; T-14 depende de T-13; T-15 depende de T-06; T-17 depende da unit Avaliacao; T-19 depende de T-08 e T-09; T-20 depende de T-04; T-22 depende da unit ComponenteCurricular; T-25 depende de T-06; T-26 depende de T-03; T-27 depende da unit Enrollments.

---

## Lacunas Pendentes (🔴)

- O termo "etapa" designa três conceitos distintos no legado: a série dentro do curso, a etapa de calendário letivo e a etapa oficial do Censo Escolar. Antes de migrar, é preciso fixar a taxonomia do modelo novo, porque o nome é usado em três contextos distintos.
- A listagem de séries interpola a escola, o curso, o ano e a atividade no SQL. É preciso verificar a confiabilidade dos valores presentes na carga histórica e definir a estratégia de parametrização.
- A API de recurso de curso e a de série dispensam a autorização na indexação. É preciso definir o nível de acesso exigido para a listagem da estrutura acadêmica da rede.
- A gravação das etapas da turma apaga as anteriores e reinsere sem atomicidade por etapa. É preciso definir o comportamento desejado em caso de falha intermediária.
- A promoção é disparada por uma requisição sintética contra a API legada, com a exceção silenciada. É preciso decidir se a promoção passa a ser um processo explícito, com registro de falha e reprocessamento.
- A sequência de séries é apenas um par origem e destino. É preciso definir o conjunto de tipos de transição, a exigência de parecer do conselho e a regra de progressão continuada, incluindo a permanência na série em caso de retenção.
- Não há validação da carga horária e dos dias letivos do curso contra o mínimo da LDB. É preciso decidir se a validação é impeditiva e qual é o regime aplicável aos cursos seriados, modulares e de EJA.
- A regra de avaliação está em duas fontes: a coluna da série e a tabela de ligação por ano letivo. É preciso definir a fonte de verdade e o processo de convergência.
- A faixa etária usa a data base de matrícula da instituição como data de corte, e não uma data própria da série. É preciso decidir se a série passa a ter data de corte própria, como prevê o modelo novo.
- O de/para entre curso e etapa do Censo Escolar é chaveado apenas por curso, sem vínculo por série. É preciso decidir se o vínculo por série e por etapa agregada passa a ser modelado.
- Não há ato de autorização do conselho municipal vinculado à oferta do curso, previsto no modelo novo. É preciso definir o número, a data e a obrigatoriedade do registro.
- A listagem de séries agrupadas por curso não filtra por atividade nem restringe por instituição no legado. É preciso definir o comportamento correto do modelo novo.
- Não há trilha de auditoria das alterações de curso, de série e de sequência. É preciso decidir o que é retido e por quanto tempo.
