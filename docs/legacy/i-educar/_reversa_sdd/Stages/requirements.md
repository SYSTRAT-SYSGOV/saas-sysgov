# Stages (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o módulo de estrutura acadêmica legado faz: níveis de ensino, cursos, séries, sequência de progressão e calendário de etapas, com rastreabilidade ao código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O módulo Stages do i-Educar organiza a estrutura acadêmica da rede municipal em quatro níveis hierárquicos: o **nível de ensino** (Educação Infantil, Ensino Fundamental, Ensino Médio, EJA), o **curso** (a oferta que agrega regime, calendário, carga horária e número de etapas), a **série** (a etapa concreta do curso, com carga horária, dias letivos e faixa etária) e a **sequência de séries** (a matriz que define para qual série o estudante avança). 🟢

A esse eixo conceitual se soma um quinto bloco, o **calendário de etapas**: o módulo define o tipo de etapa (bimestre, trimestre, semestre), as etapas do ano letivo de cada escola e as etapas próprias de cada turma. 🟢

Problema que resolve: dar à rede uma taxonomia única do percurso escolar, com a qual se define o que pode ser ofertado, quem pode matricular-se em cada etapa, em que idade, com qual carga horária, e para onde o estudante avança ao ser aprovado. 🟢

Observação estrutural: no legado, a mesma palavra "etapa" designa três coisas distintas — a série dentro do curso (`pmieducar.serie.etapa_curso`), a etapa de calendário letivo (`pmieducar.modulo` e suas instâncias) e a etapa oficial do Censo Escolar (`modules.etapas_educacenso`). 🟢

---

## Responsabilidades

- Registrar o nível de ensino, com nome, descrição, atividade e situation. 🟢 `app/Models/LegacyEducationLevel.php:8-19`
- Registrar o tipo de ensino, com nome e o indicizador de atividade complementar. 🟢 `app/Models/LegacyEducationType.php:11-22`
- Registrar o curso, com nome, sigla, descrição, nível, tipo, regime, número de etapas, carga horária, fração de hora para falta, modalidade e padrão de calendário. 🟢 `app/Models/LegacyCourse.php:54-70`
- Registrar a série, com nome, descrição, curso, ordem no curso, carga horária, intervalo, dias letivos, faixa etária, etapa do Censo Escolar e concluinte. 🟢 `app/Models/LegacyGrade.php:46-70`
- Vincular a regra de avaliação padrão e a diferenciada à série, por ano letivo. 🟢 `app/Models/LegacyGrade.php:88-122`
- Registrar a sequência de progressão entre séries, com origem e destino. 🟢 `app/Models/LegacyGradeSequence.php:14-30`
- Registrar o tipo de etapa de calendário, com nome, número de etapas, de meses e de semanas. 🟢 `app/Models/LegacyStageType.php:18-30`
- Registrar as etapas do ano letivo de cada escola, com sequencial, datas e dias letivos. 🟢 `app/Models/LegacyAcademicYearStage.php:19-29`
- Registrar as etapas próprias de cada turma, com as mesmas informações. 🟢 `app/Models/LegacySchoolClassStage.php:15-24`
- Manter o de/para entre o curso municipal e as etapas oficiais do Censo Escolar. 🟢 `app/Models/LegacyCourseEducacensoStage.php:11-23`
- Manter o catálogo de etapas oficiais do Censo Escolar. 🟢 `app/Models/LegacyEducacensoStages.php:9-24`
- Verificar a compatibilidade de idade do estudante com a faixa etária da série, com alerta ou bloqueio. 🟢 `ieducar/modules/Api/Views/SerieController.php:248-280`
- Copiar as etapas do ano letivo da escola para as turmas quando o curso deixa de seguir o calendário padrão. 🟢 `app/Services/SchoolClassStageService.php:84-121`
- Listar as séries da rede, por escola, por curso e por ano letivo, com filtro por alteração. 🟢 `ieducar/modules/Api/Views/SerieController.php:12-104`

---

## Regras de Negócio

- O nome de exibição de série e de curso inclui a descrição entre parênteses, quando há descrição. 🟢 `app/Models/LegacyGrade.php:72-83` e `app/Models/LegacyCourse.php:92-105`
- O nome de exibição do tipo de etapa concatena o nome com o número de etapas, no formato `{nome} - {n} etapa(s)`. 🟢 `app/Models/LegacyStageType.php:40-46`
- A descrição do tipo de etapa converte as quebras de linha em quebra de linha em HTML. 🟢 `app/Models/LegacyStageType.php:57-63`
- O tipo de etapa é único por nome e por número de etapas, entre os tipos ativos. 🟢 `app/Models/LegacyStageType.php:48-59`
- O curso com calendário padrão usa as etapas do ano letivo da escola; o curso sem calendário padrão usa as etapas próprias de cada turma. 🟢 `app/Models/LegacySchoolClass.php:278-311` e `:391-399`
- A gravação das etapas de uma turma apaga as etapas anteriores e recria a sequência a partir de 1, com as datas convertidas para o formato do banco. 🟢 `app/Services/SchoolClassStageService.php:11-26` e `:44-64`
- A gravação das etapas de uma turma é validada contra a existência de notas e faltas na etapa, no diário local e no iDiário. 🟢 `app/Services/SchoolClassStageService.php:28-42`
- A mudança de um curso para o calendário não padrão apaga as etapas das turmas do curso e copia as etapas do ano letivo da escola. 🟢 `app/Services/SchoolClassStageService.php:84-121`
- A cópia das etapas do ano letivo da escola para as turmas é feita por inserção em bloco, sem passar pelo modelo. 🟢 `SchoolClassStageService.php:97-121`
- A faixa etária da série é verificada contra a data de corte da instituição, que é a data base de matrícula. 🟢 `ieducar/intranet/include/pmieducar/clsPmieducarSerie.inc.php`
- A verificação de faixa etária é liberada quando a instituição não tem data base de matrícula. 🟢 `clsPmieducarSerie.inc.php`
- A idade do estudante é calculada por diferença entre a data de nascimento e a data de corte, em anos completos. 🟢 `clsPmieducarSerie.inc.php`
- A verificação de faixa etária produz apenas alerta quando a série define alerta e não define bloqueio. 🟢 `ieducar/modules/Api/Views/SerieController.php:271-276`
- A verificação de faixa etária produz bloqueio quando a série define `bloquear_matricula_faixa_etaria`. 🟢 `SerieController.php:273`
- A mensagem de faixa etária é única e independe do caso, de alerta ou de bloqueio. 🟢 `SerieController.php:274`
- A listagem de séries exige o filtro de instituição e o curso ativo, e a oferta da série na escola deve estar ativa. 🟢 `SerieController.php:32-59`
- A listagem de séries interpola a escola, o curso, o ano e o indicador de atividade diretamente no SQL. 🟢 `SerieController.php:62` e `:66` e `:70` e `:74`
- A data de atualização da série é a mais recente entre a da série e a da sua oferta na escola. 🟢 `SerieController.php:38-44`
- A listagem de séries é filtrável por data de atualização, considerando a série e a oferta. 🟢 `SerieController.php:77-80`
- A listagem de séries sem componentes vinculados exclui as séries que já têm componente curricular de ano escolar. 🟢 `SerieController.php:106-134`
- A listagem agrupada de séries por curso não filtra por atividade e não restringe por instituição. 🟢 `SerieController.php:229-246`
- A etapa do Censo Escolar é lida diretamente da série, sem validação de pertencimento ao curso. 🟢 `SerieController.php:224-227`
- A regra de avaliação da série é vinculada por série e por ano letivo, e a regra diferenciada é uma segunda coluna do mesmo pivô. 🟢 `app/Models/LegacyGrade.php:88-122`
- A regra de avaliação aplicável à turma é a da série correta, e a regra diferenciada prevalece quando a escola a utiliza. 🟢 `app/Models/LegacySchoolClass.php:648-661`
- A sequência de séries é consultável por série de origem, de destino, por curso de origem e por curso de destino. 🟢 `app/Models/Builders/LegacyGradeSequenceBuilder.php:7-37`
- A criação de sequência de séries exige a permissão de processo 587 com nível de acesso 3. 🟢 `ieducar/intranet/educar_sequencia_serie_cad.php:50`
- A promoção de matrícula é disparada por um serviço que monta uma requisição sintética e chama a API de promoção legada, silenciando a exceção. 🟢 `app/Services/PromotionService.php:22-51`
- O de/para entre curso e etapa do Censo Escolar é lido como lista de identificadores de etapa por curso. 🟢 `app/Models/LegacyCourseEducacensoStage.php:18-21`
- O catálogo de etapas do Censo Escolar é consultado como mapa de identificador para nome. 🟢 `app/Models/LegacyEducacensoStages.php:15-18`
- A dispensa de disciplina é vinculada a uma etapa do calendário. 🟢 `app/Models/LegacyExemptionStage.php:10-20`
- Não existe, no legado, o conceito de ciclo de aprendizagem, de progressão continuada, nem de tipo de transição entre séries além do par origem e destino. 🔴
- Não existe, no legado, validação de que a carga horária e os dias letivos do curso respeitam o mínimo da LDB. 🔴
- Não existe, no legado, ato de autorização do conselho municipal, com número e data, vinculado à oferta do curso. 🔴
- Não existe, no legado, verificação de que a série de destino da sequência pertence a um curso compatível com a origem. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve registrar o nível de ensino, com nome, descrição e situação. | Must | Dado um nome de nível, quando for cadastrado, então o registro fica disponível para o vínculo com o curso. |
| RF-02 | O sistema deve registrar o tipo de ensino, com nome e o indicizador de atividade complementar. | Must | Dado um tipo de ensino, quando for cadastrado, então o indicizador de atividade complementar é preservado. |
| RF-03 | O sistema deve registrar o curso, com nome, sigla, descrição, nível, tipo, regime, número de etapas, carga horária, fração de hora para falta e modalidade. | Must | Dado um curso completo, quando for cadastrado, então todos os campos ficam gravados e são relidos. |
| RF-04 | O sistema deve registrar a série, com nome, descrição, curso, ordem no curso, carga horária, dias letivos e etapa do Censo Escolar. | Must | Dado uma série, quando for cadastrada, então o curso, a ordem e a etapa do Censo ficam vinculados. |
| RF-05 | O sistema deve marcar a série como concluinte do curso. | Must | Dado uma série concluinte, quando consultada, então o sinalizador é verdadeiro. |
| RF-06 | O sistema deve definir a faixa etária da série, com idade inicial, idade final e idade ideal. | Must | Dado uma faixa de 6 a 10 anos, quando a série for consultada, então os três valores são devolvidos. |
| RF-07 | O sistema deve verificar a idade do estudante contra a faixa etária da série, usando a data base de matrícula da instituição como data de corte. | Must | Dado um estudante de 5 anos e uma série de 6 a 10, quando a verificação for feita, então a faixa é violada. |
| RF-08 | O sistema deve liberar a verificação de faixa etária quando a instituição não tem data base de matrícula. | Must | Dado uma instituição sem data base, quando a verificação for feita, então o estudante é considerado dentro da faixa. |
| RF-09 | O sistema deve produzir apenas alerta de faixa etária quando a série define alerta e não define bloqueio. | Must | Dado uma série com alerta e sem bloqueio, quando a verificação falhar, então o resultado traz o aviso sem bloqueio. |
| RF-10 | O sistema deve bloquear a matrícula quando a série define o bloqueio de faixa etária. | Must | Dado uma série com bloqueio, quando a verificação falhar, então o resultado indica bloqueio com a mensagem da faixa etária. |
| RF-11 | O sistema deve vincular a regra de avaliação padrão e a diferenciada à série, por ano letivo. | Must | Dado uma série com regra padrão e diferenciada em um ano, quando consultada, então as duas regras são devolvidas. |
| RF-12 | O sistema deve resolver a regra de avaliação aplicável a uma turma, com a regra diferenciada quando a escola a utiliza. | Must | Dado uma escola com regra diferenciada e uma série que a possui, quando a regra for resolvida, então a diferenciada é devolvida. |
| RF-13 | O sistema deve registrar a sequência de progressão entre séries, com origem e destino. | Must | Dado um par de séries, quando a sequência for gravada, então o vínculo fica disponível para a consulta. |
| RF-14 | O sistema deve listar as sequências por série de origem, de destino e por curso. | Must | Dado uma sequência, quando filtrada pela série de origem, então ela é encontrada. |
| RF-15 | O sistema deve registrar o tipo de etapa de calendário, com nome, número de etapas, de meses e de semanas. | Must | Dado um tipo de etapa, quando for cadastrado, então o nome de exibição concatena o nome e o número de etapas. |
| RF-16 | O sistema deve garantir a unicidade do tipo de etapa por nome e número de etapas. | Must | Dado um tipo de etapa ativo com o mesmo nome e o mesmo número de etapas, quando outro for cadastrado, então a operação é recusada. |
| RF-17 | O sistema deve registrar as etapas do ano letivo de cada escola, com sequencial, datas e dias letivos. | Must | Dado um ano letivo, quando as etapas forem consultadas, então são devolvidas ordenadas por sequencial. |
| RF-18 | O sistema deve registrar as etapas próprias de cada turma, com sequencial, datas e dias letivos. | Must | Dado uma turma, quando as etapas forem gravadas, então a sequência é reconstruída a partir de 1. |
| RF-19 | O sistema deve apagar e recriar as etapas da turma a cada gravação. | Must | Dado uma turma com três etapas, quando forem gravadas duas, então a terceira deixa de existir. |
| RF-20 | O sistema deve validar a gravação das etapas da turma contra a existência de notas e faltas na etapa. | Must | Dado uma etapa com notas lançadas, quando as etapas forem regravadas, então a operação é recusada. |
| RF-21 | O sistema deve copiar as etapas do ano letivo da escola para as turmas quando o curso deixa de seguir o calendário padrão. | Must | Dado um curso que deixa de usar o calendário padrão, quando a mudança for aplicada, então as turmas do curso recebem as etapas da escola. |
| RF-22 | O sistema deve manter o de/para entre o curso municipal e as etapas oficiais do Censo Escolar. | Must | Dado um curso com três etapas mapeadas, quando o de/para for lido, então os três identificadores são devolvidos. |
| RF-23 | O sistema deve manter o catálogo de etapas oficiais do Censo Escolar, com nome descritivo. | Must | Dado o catálogo, quando for consultado, então o mapa de identificador para nome é devolvido. |
| RF-24 | O sistema deve listar as séries da rede, por escola, por curso e por ano letivo, com filtro por alteração. | Must | Dado uma série alterada depois da data informada, quando a listagem for feita, então a série é devolvida. |
| RF-25 | O sistema deve listar as séries que ainda não têm componente curricular vinculado. | Must | Dado um curso com duas séries, sendo uma com componentes, quando a listagem for feita, então apenas a série sem componentes é devolvida. |
| RF-26 | O sistema deve listar as séries agrupadas por curso, para a seleção em cascata. | Must | Dado dois cursos, quando a listagem for feita, então as séries são agrupadas sob o nome de cada curso. |
| RF-27 | O sistema deve expor a etapa do Censo Escolar de uma série. | Must | Dado uma série, quando a etapa for consultada, então o código da etapa é devolvido. |
| RF-28 | O sistema deve permitir a promoção do estudante ao ano seguinte, acionando a apuração da série de destino. | Must | Dado um estudante aprovado, quando a promoção for acionada, então a matrícula do ano seguinte é criada na série de destino. |
| RF-29 | O sistema deve manter a dispensa de disciplina vinculada a uma etapa do calendário. | Must | Dado uma dispensa com etapa, quando consultada, então a etapa é devolvida. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | A criação de sequência de séries exige a permissão de processo 587 com nível de acesso 3. | `ieducar/intranet/educar_sequencia_serie_cad.php:50` | 🟢 |
| Segurança | A API de recurso de curso e a de série dispensam a autorização na indexação. | `app/Http/Controllers/Api/CourseController.php:16-21` e `GradeController.php:16-21` | 🟢 |
| Integridade | A gravação das etapas da turma é validada contra notas e faltas, no diário local e no iDiário. | `app/Services/SchoolClassStageService.php:28-42` | 🟢 |
| Integridade | A mudança de calendário por curso é transacionada, com remoção e cópia. | `app/Services/SchoolClassStageService.php:85-91` | 🟢 |
| Integridade | A listagem de séries interpola a escola, o curso, o ano e a atividade no SQL, sem parametrização. | `ieducar/modules/Api/Views/SerieController.php:62` e `:66` e `:70` e `:74` | 🟢 |
| Performance | A listagem de séries usa consulta distinta, com a junção da oferta por escola. | `ieducar/modules/Api/Views/SerieController.php:32-59` | 🟢 |
| Performance | A listagem de séries sem componentes exclui as séries com componente por subconsulta `NOT IN`. | `SerieController.php:110-116` | 🟢 |
| Performance | A cópia de etapas por curso é feita por inserção em bloco, sem passar pelo modelo. | `app/Services/SchoolClassStageService.php:101-121` | 🟢 |
| Isolamento | O legado opera em base municipal única; a migração para o SYSGOV exige `tenant_id` em níveis, cursos, séries, sequências e etapas. | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_curso_table.php` | 🟡 |
| Compatibilidade | A fração de hora para falta é armazenada como decimal e lida como ponto flutuante. | `app/Models/LegacyCourse.php:117-122` | 🟢 |
| Compatibilidade | O padrão de calendário é armazenado como inteiro e lido como booleano. | `app/Models/LegacyCourse.php:72-74` | 🟢 |
| Observabilidade | A promoção disparada por serviço silencia a exceção da API legada, sem registro. | `app/Services/PromotionService.php:47-50` | 🟡 |
| Auditabilidade | A criação de sequência registra o autor do cadastro, mas o curso e a série não registram trilha de alteração de conteúdo. | `app/Models/LegacyGradeSequence.php:18` | 🔴 |

> Inferido a partir do código. Validar com equipe de operações.

---

## Critérios de Aceitação

```gherkin
Dado um estudante de 5 anos e uma série cuja faixa etária é de 6 a 10 anos
Quando a verificação de faixa etária for feita
Então a faixa é violada

Dado uma instituição sem data base de matrícula
Quando a verificação de faixa etária for feita
Então o estudante é considerado dentro da faixa etária

Dado uma série com alerta de faixa etária e sem bloqueio
Quando um estudante fora da faixa for verificado
Então o resultado traz o aviso sem bloquear a matrícula

Dado uma série com bloqueio de faixa etária
Quando um estudante fora da faixa for verificado
Então o resultado indica o bloqueio com a mensagem da faixa etária

Dado um tipo de etapa ativo com o mesmo nome e o mesmo número de etapas
Quando outro tipo de etapa com o mesmo par for cadastrado
Então a operação é recusada

Dado uma turma com três etapas de calendário
Quando duas etapas forem gravadas
Então a terceira deixa de existir e a sequência é reconstruída a partir de 1

Dado um curso que deixa de seguir o calendário padrão da rede
Quando a mudança for aplicada
Então as turmas do curso recebem as etapas do ano letivo da escola

Dado uma escola com regra de avaliação diferenciada utilizada
Quando a regra de avaliação de uma turma for resolvida
Então a regra diferenciada é devolvida em vez da padrão

Dado um curso municipal mapeado para três etapas do Censo Escolar
Quando o de/para for consultado
Então os três identificadores de etapa são devolvidos
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Cadastro de nível, tipo, curso e série | Must | Estrutura sobre a qual opera toda a rede |
| Faixa etária da série e sua verificação | Must | Regra de matrículas que protege a coherência idade e série |
| Vínculo da regra de avaliação por série e ano | Must | Determina o boletim e a progressão |
| Sequência de progressão entre séries | Must | Define o destino do estudante aprovado |
| Calendário de etapas, com tipo, ano letivo e turma | Must | Determina as etapas de avaliação e o Registro 20 |
| Cópia das etapas da escola para as turmas | Must | Necessária quando o curso usa calendário próprio |
| De/para entre curso e etapa do Censo Escolar | Must | Condiciona a exportação do Censo Escolar |
| Catálogo de etapas do Censo Escolar | Must | Referência para a exportação |
| Listagem de séries por escola, curso e ano | Must | Sincronização e seleção em formulários |
| Listagem de séries sem componentes vinculados | Must | Usada na carga de componentes |
| Exposição da etapa do Censo Escolar da série | Must | Usada na exportação e na validação |
| Promoção do estudante ao ano seguinte | Must | Fim do ano letivo |
| Ação de autorização do conselho na oferta do curso | Should | Ausente no legado e previsto no modelo novo |
| Ciclo de aprendizagem com progressão continuada | Should | Ausente no legado e previsto no modelo novo |
| Validação da carga horária e dos dias letivos contra a LDB | Should | Ausente no legado e previsto no modelo novo |
| Tipo de transição entre séries além do par origem e destino | Should | Ausente no legado e previsto no modelo novo |
| Trilha de auditoria das alterações de curso e série | Could | Ausente no legado |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `app/Models/LegacyCourse.php` | Entidade do curso, com nome, etapas, calendário e hora de falta | 🟢 |
| `app/Models/LegacyGrade.php` | Entidade da série, com faixa etária, regras de avaliação e oferta | 🟢 |
| `app/Models/LegacyEducationLevel.php` | Nível de ensino | 🟢 |
| `app/Models/LegacyEducationType.php` | Tipo de ensino | 🟢 |
| `app/Models/LegacyGradeSequence.php` | Sequência de progressão | 🟢 |
| `app/Models/LegacyStageType.php` | Tipo de etapa de calendário | 🟢 |
| `app/Models/LegacyAcademicYearStage.php` | Etapa do ano letivo da escola | 🟢 |
| `app/Models/LegacySchoolClassStage.php` | Etapa da turma | 🟢 |
| `app/Models/LegacyCourseEducacensoStage.php` | De/para entre curso e etapa do Censo Escolar | 🟢 |
| `app/Models/LegacyEducacensoStages.php` | Catálogo de etapas do Censo Escolar | 🟢 |
| `app/Models/LegacyExemptionStage.php` | Dispensa de disciplina por etapa | 🟢 |
| `app/Models/LegacyEvaluationRuleGradeYear.php` | Regra de avaliação da série por ano letivo | 🟢 |
| `app/Models/Builders/LegacyCourseBuilder.php` | Filtros de curso, por instituição, escola, ano e modalidade | 🟢 |
| `app/Models/Builders/LegacyGradeBuilder.php` | Filtros de série, por nome, escola e curso | 🟢 |
| `app/Models/Builders/LegacyGradeSequenceBuilder.php` | Filtros de sequência, por série e por curso | 🟢 |
| `app/Models/Builders/LegacySchoolClassStageBuilder.php` | Filtros de etapa de turma | 🟢 |
| `app/Models/Builders/LegacyAcademicYearStageBuilder.php` | Filtros de etapa do ano letivo | 🟢 |
| `app/Services/SchoolClassStageService.php` | Gravação, validação e cópia das etapas da turma | 🟢 |
| `app/Services/PromotionService.php` | Disparo da promoção por requisição sintética | 🟢 |
| `app/Services/SchoolGradeImportService.php` | Importação de séries e oferta | 🟡 |
| `app/Http/Controllers/Api/CourseController.php` | API de recurso de curso, com processo 566 | 🟢 |
| `app/Http/Controllers/Api/GradeController.php` | API de recurso de série, com processo 583 | 🟢 |
| `app/Http/Controllers/Api/Resource/Course/ResourceCourseController.php` | Recurso simples de curso | 🟢 |
| `app/Http/Controllers/Api/Resource/Grade/ResourceGradeController.php` | Recurso simples de série | 🟢 |
| `ieducar/modules/Api/Views/SerieController.php` | API de série, com faixa etária e listagens | 🟢 |
| `ieducar/modules/Api/Views/CursoController.php` | API de curso, com listagens e modalidade | 🟢 |
| `ieducar/modules/Api/Views/EscolaCursoController.php` | API de oferta de curso na escola | 🟡 |
| `ieducar/intranet/include/pmieducar/clsPmieducarSerie.inc.php` | Verificação de faixa etária com a data de corte | 🟢 |
| `ieducar/intranet/educar_curso_cad.php` | Tela de cadastro do curso | 🟡 |
| `ieducar/intranet/educar_serie_cad.php` | Tela de cadastro da série | 🟡 |
| `ieducar/intranet/educar_nivel_ensino_cad.php` | Tela de cadastro do nível de ensino | 🟡 |
| `ieducar/intranet/educar_sequencia_serie_cad.php` | Tela de cadastro da sequência de séries | 🟡 |
| `ieducar/intranet/educar_escola_serie_cad.php` | Tela de oferta de série na escola | 🟡 |
| `app/Models/LegacySchoolClass.php` | Resolução do calendário da turma conforme o curso | 🟢 |
